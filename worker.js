/**
 * TaskFlow — Cloudflare Worker Backend (taskflow-worker.js)
 *
 * Routes:
 *   POST /api/ai/document     – Document AI assistant (streaming, think-block stripped)
 *   POST /api/ai/database     – Database schema generation (JSON, non-streaming)
 *   POST /api/firebase/pages  – Proxy Firestore pages (list / get)
 *   POST /api/firebase/write  – Proxy Firestore writes (create / update / delete)
 *   GET  /health              – Health check
 *
 * Secrets (add via `wrangler secret put`):
 *   K2_API_KEY             – MBZUAI K2-Think API key
 *   FIREBASE_PROJECT_ID    – e.g. gen-lang-client-0240001721
 *   FIREBASE_API_KEY       – Web API key for Firestore REST auth
 *   FIREBASE_DATABASE_ID   – e.g. ai-studio-05c871ae-cd99-4565-b716-7b5063384beb
 *
 * Deploy:
 *   wrangler deploy taskflow-worker.js --name taskflow-backend
 */

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const K2_MODEL   = 'MBZUAI-IFM/K2-Think-v2';
const K2_API_URL = 'https://api.k2think.ai/v1/chat/completions';

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const jsonResp = (d, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
const errResp = (m, s = 500) => jsonResp({ error: m }, s);
const corsOk  = ()            => new Response(null, { status: 204, headers: CORS_HEADERS });

// ─── THINK-BLOCK STRIPPER (identical logic to researchassistant.js) ───────────

function stripThinkBlocks(text) {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')   // complete think blocks
    .replace(/<think>[\s\S]*/g, '')              // incomplete / cut-off think block
    .replace(/^\s*(Certainly!|Sure!|Of course!|Great question!|Absolutely!)[^\n]*\n/i, '')
    .trim();
}

// ─── STREAMING RESPONSE (same pattern as researchassistant.js) ────────────────

function buildStreamResponse(k2Response) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc    = new TextEncoder();
  const dec    = new TextDecoder();

  (async () => {
    const reader     = k2Response.body.getReader();
    let   buf        = '';
    let   thinkBuf   = '';
    let   pastThink  = false;

    const flush = async (token) => {
      if (!token) return;
      const payload = JSON.stringify({ choices: [{ delta: { content: token } }] });
      await writer.write(enc.encode(`data: ${payload}\n\n`));
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;

          let parsed;
          try { parsed = JSON.parse(raw); } catch { continue; }

          const token = parsed.choices?.[0]?.delta?.content;
          if (!token) continue;

          if (pastThink) {
            await flush(token);
          } else {
            thinkBuf += token;
            // Prevent unbounded think buffer
            if (thinkBuf.length > 32000) thinkBuf = thinkBuf.slice(-1000);

            if (thinkBuf.includes('</think>')) {
              const parts = thinkBuf.split('</think>');
              const after = parts[parts.length - 1]
                .replace(/^\s*(Certainly!|Sure!|Of course!)[^\n]*\n?/i, '');
              pastThink = true;
              thinkBuf  = '';
              if (after) await flush(after);
            }
          }
        }
      }

      // Fallback: model didn't emit <think> at all — flush raw buffer
      if (!pastThink && thinkBuf.trim()) {
        const cleaned = stripThinkBlocks(thinkBuf);
        if (cleaned) await flush(cleaned);
      }

    } catch (err) {
      console.error('Stream processing error:', err);
      try { await writer.abort(err); } catch {}
      return;
    }

    try {
      await writer.write(enc.encode('data: [DONE]\n\n'));
      await writer.close();
    } catch {}
  })();

  return new Response(readable, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}

// ─── K2 CALLER (with 3-attempt retry) ────────────────────────────────────────

async function callK2(messages, env, stream = true) {
  let k2Res;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      k2Res = await fetch(K2_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.K2_API_KEY}`,
        },
        body: JSON.stringify({
          model:         K2_MODEL,
          messages,
          temperature:   0.75,
          top_p:         0.90,
          max_tokens:    8000,
          budget_tokens: 2500,
          stream,
        }),
      });

      if (k2Res.ok) break;
      const errText = await k2Res.text();
      console.error(`K2 attempt ${attempt + 1} failed: ${k2Res.status} ${errText}`);
      if (k2Res.status < 500 && k2Res.status !== 429) break;
      await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));

    } catch (e) {
      console.error(`K2 fetch error attempt ${attempt + 1}:`, e);
      await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
  return k2Res;
}

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const DOCUMENT_SYSTEM = `You are an expert writing assistant embedded in a Notion-like document editor called Stremini Planner.
The user may ask you to draft content, summarize, rewrite, extend, or restructure the document.

RESPONSE FORMAT: Return ONLY a single valid JSON object. No markdown fences. No prose. No explanation outside the JSON.

Schema:
{
  "action": "replace" | "append",
  "blocks": [
    { "id": "b1", "type": "h1"|"h2"|"p"|"todo"|"list"|"quote"|"code", "text": "..." }
  ]
}

Block type guide:
- h1  : Major section title (use sparingly, once per topic)
- h2  : Subsection heading
- p   : Regular paragraph — the main body text
- list: Bullet point (no leading dash in text)
- todo: Action item / checkbox (no leading bracket in text)
- quote: Pull quote or key insight
- code : Code snippet or technical content (monospace)

Rules:
- "replace" → return ALL blocks needed for the full document
- "append"  → return ONLY the new blocks to add at the end
- Always use VARIED block types — never return all-p or all-list
- IDs must be short unique strings: "b1", "b2", etc.
- Text must be clean — no leading symbols like "- ", "# ", "[] "
- NEVER include <think> blocks, markdown, or explanation outside the JSON object
- Start your output with { and end with }`;

const DATABASE_SYSTEM = `You are a database schema designer for a Notion-like workspace called Stremini Planner.
Your ENTIRE output must be a single raw JSON object. No markdown. No explanation. No preamble. No trailing text.

Required output structure:
{"title":"...","schema":[{"key":"...","name":"...","type":"...","options":[]}],"initialTasks":[{"title":"...","properties":{}}]}

Rules:
- Output MUST start with { and end with } — nothing before or after
- 5-7 schema columns using a rich mix of: text, select, status, date, number, checkbox
- Every select/status column MUST have an "options" array with 3-5 realistic values
- Generate exactly 12 realistic, diverse initialTasks with ALL schema keys populated
- Dates must be YYYY-MM-DD format within the next 45 days from today
- Titles must be specific and realistic (not generic like "Task 1")
- Do NOT use the example keys — invent appropriate keys for the topic
- NEVER output the schema template itself — output REAL populated data`;

// ─── DOCUMENT AI HANDLER (streaming) ─────────────────────────────────────────

async function handleDocumentAI(req, env) {
  const body = await req.json();
  const {
    message   = '',
    blocks    = [],
    history   = [],
    action    = 'chat',   // 'chat' | 'summarize'
  } = body;

  const msg = message.trim().slice(0, 4000);
  if (!msg && action !== 'summarize') return errResp('Empty message.', 400);

  // Build current document context
  const contentStr = Array.isArray(blocks) && blocks.length
    ? blocks.map(b => `[${b.type}] ${b.text}`).join('\n')
    : '(empty document)';

  const systemContent = `${DOCUMENT_SYSTEM}\n\nCurrent document state:\n${contentStr}`;

  const messages = [{ role: 'system', content: systemContent }];

  // Inject last 8 history turns — frontend sends { role, text }, not { role, content }
  const hist = Array.isArray(history) ? history.slice(-8) : [];
  for (const h of hist) {
    const content = h.content || h.text;   // accept both shapes
    if (h.role && content)
      messages.push({ role: h.role, content: String(content).slice(0, 2000) });
  }

  const userMsg = action === 'summarize'
    ? 'Summarize this document concisely. Return new blocks with action "append", starting with a "Summary" h2 heading.'
    : msg;

  messages.push({ role: 'user', content: userMsg });

  const k2Res = await callK2(messages, env, true);
  if (!k2Res || !k2Res.ok) {
    return errResp('AI service temporarily unavailable. Please try again.', 503);
  }

  return buildStreamResponse(k2Res);
}

// ─── DATABASE AI HANDLER ──────────────────────────────────────────────────────
// K2 is a thinking model — it wraps output in <think>...</think> before the JSON.
// Strategy: use NON-streaming so we get a single JSON response body — no SSE
// parsing needed. Extract content from choices[0].message.content, strip think
// blocks with regex, then pull out the JSON object.

async function handleDatabaseAI(req, env) {
  const body = await req.json();
  const { prompt = '' } = body;

  const msg = prompt.trim().slice(0, 2000);
  if (!msg) return errResp('Empty prompt.', 400);

  const messages = [
    { role: 'system', content: DATABASE_SYSTEM },
    {
      role: 'user',
      content: `Topic: "${msg}". Output the JSON object now.`,
    },
  ];

  // NON-streaming: avoids SSE accumulation bugs entirely.
  // K2 raw content was length 0 with stream=true because delta.content tokens
  // weren't being captured before think blocks were stripped.
  const k2Res = await callK2(messages, env, false);
  if (!k2Res || !k2Res.ok) {
    const errText = k2Res ? await k2Res.text().catch(() => '') : 'no response';
    console.error('K2 database call failed:', k2Res?.status, errText.slice(0, 300));
    return errResp('AI service temporarily unavailable. Please try again.', 503);
  }

  let responseJson;
  try {
    responseJson = await k2Res.json();
  } catch (e) {
    console.error('Failed to parse K2 response as JSON:', e);
    return errResp('AI returned unparseable response.', 500);
  }

  // Non-streaming response: content is in choices[0].message.content
  const full = responseJson?.choices?.[0]?.message?.content ?? '';

  console.log('K2 raw content length:', full.length, '| first 300:', full.slice(0, 300));

  // K2 non-streaming puts thinking prose directly in message.content with no
  // <think> tags, so stripThinkBlocks() is useless here. Instead, find the
  // real JSON by scanning for the first { that is immediately followed
  // (ignoring whitespace) by a '"' — i.e. a JSON object key, not prose.
  const jsonText = extractRealJsonObject(full);
  if (!jsonText) {
    console.error('No JSON object found. first 500:', full.slice(0, 500));
    console.error('last 300:', full.slice(-300));
    return errResp('AI returned invalid JSON. Please try a different prompt.', 500);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    // Try recovery on truncated JSON
    const recovered = recoverTruncatedJson(jsonText);
    if (recovered) {
      try {
        parsed = JSON.parse(recovered);
        console.warn('Recovered truncated JSON. Records:', parsed?.initialTasks?.length);
      } catch {
        console.error('Recovery failed. first 500:', jsonText.slice(0, 500));
        console.error('last 300:', jsonText.slice(-300));
        return errResp('AI returned invalid JSON. Please try a different prompt.', 500);
      }
    } else {
      console.error('JSON parse + recovery failed. first 500:', jsonText.slice(0, 500));
      return errResp('AI returned invalid JSON. Please try a different prompt.', 500);
    }
  }

  return jsonResp({ ok: true, data: parsed });
}

// Extract the JSON object from text that may have prose before/after it.
// Finds the FIRST { and then scans forward tracking depth to find its matching }.
function extractJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  // Didn't find matching close — return from start to end (truncated)
  return text.slice(start);
}

// Like extractJsonObject but skips { chars that are inside prose (thinking text).
// It only considers a { as the JSON start if the very next non-whitespace char
// is a '"' — meaning it opens a key-value object, not an English sentence.
function extractRealJsonObject(text) {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    // peek ahead past whitespace
    let j = i + 1;
    while (j < text.length && (text[j] === ' ' || text[j] === '\r' || text[j] === '\n' || text[j] === '\t')) j++;
    if (text[j] !== '"') continue; // not a JSON object key — skip
    // depth-track from here
    let depth = 0, inString = false, escape = false;
    for (let k = i; k < text.length; k++) {
      const ch = text[k];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) return text.slice(i, k + 1); }
    }
    // truncated — return from i to end
    return text.slice(i);
  }
  return null;
}

// Attempt to recover a truncated JSON object.
function recoverTruncatedJson(text) {
  // Try simple suffix appending first
  const suffixes = ['}', ']}', '}]}', '"}]}', '"]}', '}]}}'];
  for (const s of suffixes) {
    try { JSON.parse(text + s); return text + s; } catch {}
  }

  // Find last complete record: scan backwards for a } that closes a full object
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] !== '}') continue;
    const slice = text.slice(0, i + 1);
    const candidates = [slice + ']}', slice + '\n  ]\n}', slice + ']}  }'];
    for (const c of candidates) {
      try { JSON.parse(c); return c; } catch {}
    }
  }
  return null;
}


// ─── FIREBASE REST HELPERS ────────────────────────────────────────────────────
// We proxy Firestore REST so the frontend never holds Firebase secrets.
// The worker authenticates using the Firebase Web API Key (REST-only, no Admin SDK needed).
// For writes that require auth (Firestore rules use request.auth.uid), the frontend
// sends its Firebase ID token and we forward it.

function firestoreBaseUrl(env) {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/${env.FIREBASE_DATABASE_ID}/documents`;
}

// Convert a Firestore REST field value to a plain JS value
function fsValueToJS(val) {
  if (val === undefined || val === null) return null;
  if ('stringValue'    in val) return val.stringValue;
  if ('integerValue'   in val) return parseInt(val.integerValue, 10);
  if ('doubleValue'    in val) return val.doubleValue;
  if ('booleanValue'   in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue'      in val) return null;
  if ('arrayValue'     in val) return (val.arrayValue.values || []).map(fsValueToJS);
  if ('mapValue'       in val) return fsDocToObj({ fields: val.mapValue.fields || {} });
  return null;
}

// Convert a Firestore REST document to a plain JS object
function fsDocToObj(doc) {
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    obj[k] = fsValueToJS(v);
  }
  if (doc.name) {
    const parts = doc.name.split('/');
    obj.__id = parts[parts.length - 1];
  }
  return obj;
}

// Convert a plain JS value to a Firestore REST field value
function jsToFsValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(jsToFsValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = jsToFsValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert a plain JS object to Firestore REST fields
function objToFsFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    // Skip __id and server timestamps (handled separately)
    if (k === '__id' || k === 'createdAt' || k === 'updatedAt') continue;
    fields[k] = jsToFsValue(v);
  }
  return fields;
}

// ─── FIREBASE PAGES HANDLER ───────────────────────────────────────────────────

async function handleFirebasePages(req, env) {
  const body = await req.json();
  const { op, userId, pageId, idToken } = body;
  // op: 'list' | 'get'

  if (!userId) return errResp('userId required', 400);

  const baseUrl = firestoreBaseUrl(env);
  const authHeaders = idToken
    ? { Authorization: `Bearer ${idToken}` }
    : { 'x-goog-api-key': env.FIREBASE_API_KEY };

  if (op === 'list') {
    // Run a structured query to list pages owned by userId
    const queryUrl = `${baseUrl}:runQuery`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'pages' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'ownerId' },
            op: 'EQUAL',
            value: { stringValue: userId },
          },
        },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 200,
      },
    };

    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(queryBody),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error('Firestore list error:', t);
      return errResp('Firestore list failed: ' + res.status, res.status);
    }

    const rows = await res.json();
    const pages = rows
      .filter(r => r.document)
      .map(r => fsDocToObj(r.document));

    return jsonResp({ ok: true, pages });
  }

  if (op === 'get') {
    if (!pageId) return errResp('pageId required', 400);
    const res = await fetch(`${baseUrl}/pages/${pageId}`, {
      headers: authHeaders,
    });

    if (!res.ok) {
      return errResp('Page not found', res.status);
    }

    const doc = await res.json();
    return jsonResp({ ok: true, page: fsDocToObj(doc) });
  }

  return errResp('Unknown op', 400);
}

// ─── FIREBASE WRITE HANDLER ───────────────────────────────────────────────────

async function handleFirebaseWrite(req, env) {
  const body = await req.json();
  const {
    op,          // 'create_page' | 'update_page' | 'delete_page' |
                 // 'create_record' | 'update_record' | 'delete_record' |
                 // 'list_records'
    idToken,     // Firebase ID token from client (required for auth-gated writes)
    pageId,
    recordId,
    data,
    userId,
  } = body;

  if (!idToken) return errResp('idToken required for writes', 401);

  const baseUrl    = firestoreBaseUrl(env);
  const authHdr    = { Authorization: `Bearer ${idToken}` };
  const contentHdr = { 'Content-Type': 'application/json' };

  const now = new Date().toISOString();

  // ── LIST RECORDS ──
  if (op === 'list_records') {
    if (!pageId || !userId) return errResp('pageId and userId required', 400);

    const queryUrl  = `${baseUrl}:runQuery`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'records' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'databaseId' }, op: 'EQUAL', value: { stringValue: pageId } } },
              { fieldFilter: { field: { fieldPath: 'ownerId' },    op: 'EQUAL', value: { stringValue: userId } } },
            ],
          },
        },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 500,
      },
    };

    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { ...contentHdr, ...authHdr },
      body: JSON.stringify(queryBody),
    });

    if (!res.ok) {
      const t = await res.text();
      return errResp('Firestore records query failed: ' + t, res.status);
    }

    const rows    = await res.json();
    const records = rows.filter(r => r.document).map(r => fsDocToObj(r.document));
    return jsonResp({ ok: true, records });
  }

  // ── CREATE PAGE ──
  if (op === 'create_page') {
    if (!data) return errResp('data required', 400);
    const fields = objToFsFields({ ...data, createdAt: now, updatedAt: now });
    // Add server-managed timestamps as string values (REST API doesn't support serverTimestamp here)
    fields.createdAt = { timestampValue: now };
    fields.updatedAt = { timestampValue: now };

    const res = await fetch(`${baseUrl}/pages`, {
      method: 'POST',
      headers: { ...contentHdr, ...authHdr },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const t = await res.text();
      return errResp('Create page failed: ' + t, res.status);
    }

    const doc = await res.json();
    return jsonResp({ ok: true, page: fsDocToObj(doc) });
  }

  // ── UPDATE PAGE ──
  if (op === 'update_page') {
    if (!pageId || !data) return errResp('pageId and data required', 400);
    const fields = objToFsFields({ ...data, updatedAt: now });
    fields.updatedAt = { timestampValue: now };

    // Build updateMask from provided data keys
    const updateMaskFields = Object.keys(data)
      .filter(k => k !== '__id' && k !== 'createdAt')
      .concat(['updatedAt'])
      .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&');

    const res = await fetch(`${baseUrl}/pages/${pageId}?${updateMaskFields}`, {
      method: 'PATCH',
      headers: { ...contentHdr, ...authHdr },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const t = await res.text();
      return errResp('Update page failed: ' + t, res.status);
    }

    const doc = await res.json();
    return jsonResp({ ok: true, page: fsDocToObj(doc) });
  }

  // ── DELETE PAGE ──
  if (op === 'delete_page') {
    if (!pageId) return errResp('pageId required', 400);
    const res = await fetch(`${baseUrl}/pages/${pageId}`, {
      method: 'DELETE',
      headers: authHdr,
    });

    if (!res.ok && res.status !== 404) {
      const t = await res.text();
      return errResp('Delete page failed: ' + t, res.status);
    }

    return jsonResp({ ok: true });
  }

  // ── CREATE RECORD ──
  if (op === 'create_record') {
    if (!data) return errResp('data required', 400);
    const fields = objToFsFields({ ...data });
    fields.createdAt = { timestampValue: now };
    fields.updatedAt = { timestampValue: now };

    const res = await fetch(`${baseUrl}/records`, {
      method: 'POST',
      headers: { ...contentHdr, ...authHdr },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const t = await res.text();
      return errResp('Create record failed: ' + t, res.status);
    }

    const doc = await res.json();
    return jsonResp({ ok: true, record: fsDocToObj(doc) });
  }

  // ── UPDATE RECORD ──
  if (op === 'update_record') {
    if (!recordId || !data) return errResp('recordId and data required', 400);
    const fields = objToFsFields({ ...data });
    fields.updatedAt = { timestampValue: now };

    const updateMaskFields = Object.keys(data)
      .filter(k => k !== '__id' && k !== 'createdAt')
      .concat(['updatedAt'])
      .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&');

    const res = await fetch(`${baseUrl}/records/${recordId}?${updateMaskFields}`, {
      method: 'PATCH',
      headers: { ...contentHdr, ...authHdr },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const t = await res.text();
      return errResp('Update record failed: ' + t, res.status);
    }

    const doc = await res.json();
    return jsonResp({ ok: true, record: fsDocToObj(doc) });
  }

  // ── DELETE RECORD ──
  if (op === 'delete_record') {
    if (!recordId) return errResp('recordId required', 400);
    const res = await fetch(`${baseUrl}/records/${recordId}`, {
      method: 'DELETE',
      headers: authHdr,
    });

    if (!res.ok && res.status !== 404) {
      const t = await res.text();
      return errResp('Delete record failed: ' + t, res.status);
    }

    return jsonResp({ ok: true });
  }

  return errResp('Unknown op', 400);
}

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

function handleHealth(env) {
  return jsonResp({
    status:  'ok',
    service: 'taskflow-backend',
    model:   K2_MODEL,
    routes: [
      'POST /api/ai/document',
      'POST /api/ai/database',
      'POST /api/firebase/pages',
      'POST /api/firebase/write',
    ],
    firebaseProject: env?.FIREBASE_PROJECT_ID || '(not set)',
  });
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return corsOk();

    const { pathname } = new URL(request.url);

    // Health
    if (request.method === 'GET' && pathname === '/health') return handleHealth(env);

    if (request.method !== 'POST') return errResp('Method not allowed', 405);

    try {
      // AI routes
      if (pathname === '/api/ai/document')  return await handleDocumentAI(request, env);
      if (pathname === '/api/ai/database')  return await handleDatabaseAI(request, env);

      // Firebase proxy routes
      if (pathname === '/api/firebase/pages') return await handleFirebasePages(request, env);
      if (pathname === '/api/firebase/write') return await handleFirebaseWrite(request, env);

    } catch (err) {
      console.error('Handler error:', err);
      return errResp(err.message || 'Internal server error', 500);
    }

    return errResp('Not found', 404);
  },
};