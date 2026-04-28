/**
 * src/lib/ai.ts
 * All AI calls now go through the Cloudflare Worker backend.
 * No Gemini API key needed on the frontend.
 *
 * Set VITE_WORKER_URL in your .env.local:
 *   VITE_WORKER_URL=https://taskflow-backend.<your-subdomain>.workers.dev
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';

if (!WORKER_URL) {
  console.warn('[ai.ts] VITE_WORKER_URL is not set. AI calls will fail.');
}

// ─── JSON SAFE-PARSE (unchanged from original) ────────────────────────────────

export function safeJsonParse(jsonStr: string) {
  const stripCodeFences = (input: string) => {
    let text = input.trim();
    if (text.startsWith('```json')) text = text.substring(7);
    else if (text.startsWith('```')) text = text.substring(3);
    if (text.endsWith('```')) text = text.substring(0, text.length - 3);
    return text.trim();
  };

  const extractBalancedJson = (input: string) => {
    const startCandidates = [input.indexOf('{'), input.indexOf('[')].filter(i => i >= 0);
    if (startCandidates.length === 0) return null;
    const start = Math.min(...startCandidates);
    const opening = input[start];
    const closing = opening === '{' ? '}' : ']';

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < input.length; i++) {
      const ch = input[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === opening) depth++;
      if (ch === closing) depth--;
      if (depth === 0) return input.slice(start, i + 1);
    }
    return input.slice(start);
  };

  let text = stripCodeFences(jsonStr);
  const extracted = extractBalancedJson(text);
  if (extracted) text = extracted;

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('JSON parse failed, attempting heuristic repair:', e);

    const lastBrace   = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');
    const lastValid   = Math.max(lastBrace, lastBracket);

    if (lastValid > -1) {
      const endings = ['', '}', ']', ']}', '}]', '}]}', ']}]', '"}', '"]}', '"}]'];
      for (const end of endings) {
        try { return JSON.parse(text.substring(0, lastValid + 1) + end); } catch {}
      }
    }

    try {
      const safeCut = text.substring(0, text.lastIndexOf(','));
      for (const end of ['}', ']', ']}', '}]']) {
        try { return JSON.parse(safeCut + end); } catch {}
      }
    } catch {}

    return { blocks: [], schema: [], error: true };
  }
}

// ─── DOCUMENT AI (streaming) ──────────────────────────────────────────────────
/**
 * Calls /api/ai/document on the Worker.
 * Returns an async generator that yields string tokens stripped of think blocks.
 *
 * Usage:
 *   for await (const token of streamDocumentAI({ message, blocks, history })) {
 *     // append token to UI
 *   }
 */
export async function* streamDocumentAI(params: {
  message?: string;
  blocks?: { id: string; type: string; text: string }[];
  history?: { role: 'user' | 'model'; text: string }[];
  action?: 'chat' | 'summarize';
}): AsyncGenerator<string> {
  const res = await fetch(`${WORKER_URL}/api/ai/document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`Document AI failed: ${res.status} ${t}`);
  }

  const reader = res.body.getReader();
  const dec    = new TextDecoder();
  let   buf    = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return;

      try {
        const parsed = JSON.parse(raw);
        const token  = parsed.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch {}
    }
  }
}

// ─── DOCUMENT AI (convenience: collect full streamed text) ────────────────────
/**
 * Collects the entire streamed response into a single string.
 * Drop-in replacement for the original askGemini() in document contexts.
 */
export async function askGemini(
  _systemInstruction: string,   // ignored — system is set server-side
  prompt: string,
  _includeSchema = false,       // ignored
  history: { role: 'user' | 'model'; text: string }[] = [],
  blocks: { id: string; type: string; text: string }[] = [],
  action: 'chat' | 'summarize' = 'chat',
): Promise<string> {
  let result = '';
  for await (const token of streamDocumentAI({ message: prompt, blocks, history, action })) {
    result += token;
  }
  return result;
}

// ─── DATABASE SCHEMA GENERATION (non-streaming) ───────────────────────────────
/**
 * Calls /api/ai/database on the Worker and returns the raw JSON string.
 * Drop-in replacement for the original askGeminiForDatabaseSchema().
 */
export async function askGeminiForDatabaseSchema(prompt: string): Promise<string> {
  const res = await fetch(`${WORKER_URL}/api/ai/database`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`Database AI failed: ${res.status} ${t}`);
  }

  const body = await res.json() as { ok: boolean; data: unknown; error?: string };
  if (!body.ok) throw new Error(body.error || 'Database AI returned error');

  // Return as JSON string so existing callers can pass it through safeJsonParse
  return JSON.stringify(body.data);
}
