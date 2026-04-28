/**
 * src/lib/ai.ts
 * All AI calls go through the Cloudflare Worker backend.
 * Set VITE_WORKER_URL in .env.local:
 *   VITE_WORKER_URL=https://your-worker.workers.dev
 */

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined) || '';

if (!WORKER_URL) {
  console.warn('[ai.ts] VITE_WORKER_URL is not set. AI calls will fail.');
}

// ─── JSON SAFE-PARSE ──────────────────────────────────────────────────────────
// Strips markdown fences and attempts multiple recovery strategies.

export function safeJsonParse(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;

  let text = raw.trim();

  // Strip ```json ... ``` or ``` ... ``` fences
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```'))  text = text.slice(3);
  if (text.endsWith('```'))         text = text.slice(0, text.length - 3);
  text = text.trim();

  // 1. Direct parse
  try { return JSON.parse(text); } catch {}

  // 2. Find first { ... } JSON object
  const start = text.indexOf('{');
  if (start !== -1) {
    // Try from the first opening brace
    const slice = text.slice(start);
    try { return JSON.parse(slice); } catch {}

    // 3. Find matching closing brace
    const end = text.lastIndexOf('}');
    if (end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch {}
    }

    // 4. Truncation recovery — append common suffixes
    const suffixes = [']}', '}]}', '"}]}', '"]}', '}]}}', '"]}}'];
    for (const s of suffixes) {
      try { return JSON.parse(slice + s); } catch {}
    }

    // 5. Walk backwards to last valid record
    for (let i = text.length - 1; i > start; i--) {
      if (text[i] !== '}') continue;
      const candidates = [
        text.slice(start, i + 1) + ']}',
        text.slice(start, i + 1) + '\n  ]\n}',
      ];
      for (const c of candidates) {
        try { return JSON.parse(c); } catch {}
      }
    }
  }

  console.warn('[safeJsonParse] All recovery strategies failed. Length:', text.length);
  return null;
}

// ─── DOCUMENT AI — STREAMING ──────────────────────────────────────────────────
/**
 * Calls /api/ai/document on the Worker.
 * Yields string tokens stripped of <think> blocks (handled server-side).
 *
 * Usage:
 *   for await (const token of streamDocumentAI({ message, blocks, history })) {
 *     accumulated += token;
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
        if (token) yield token as string;
      } catch {}
    }
  }

  // Flush any remaining buffer
  if (buf.startsWith('data: ')) {
    const raw = buf.slice(6).trim();
    if (raw && raw !== '[DONE]') {
      try {
        const parsed = JSON.parse(raw);
        const token  = parsed.choices?.[0]?.delta?.content;
        if (token) yield token as string;
      } catch {}
    }
  }
}

// ─── DOCUMENT AI — COLLECT FULL TEXT (non-streaming wrapper) ─────────────────
/**
 * Collects the full streamed response into a single string.
 * Used where callers expect a Promise<string>.
 */
export async function askGemini(
  _systemInstruction: string,   // ignored — set server-side
  prompt: string,
  _includeSchema = false,
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

// ─── DATABASE SCHEMA GENERATION — NON-STREAMING ───────────────────────────────
/**
 * Calls /api/ai/database on the Worker.
 * Returns the AI's parsed JSON object as a string (pass through safeJsonParse).
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
  if (!body.ok) throw new Error(body.error || 'Database AI returned an error');

  // Return as JSON string so callers can pass it through safeJsonParse
  return JSON.stringify(body.data);
}
