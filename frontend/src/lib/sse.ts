import type { ChatRequest, StreamEvent } from '../types/chat';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000';

/**
 * POST /chat and yield each parsed SSE payload.
 *
 * We use fetch + ReadableStream rather than the native EventSource because
 * EventSource is GET-only, and our request body carries the full message
 * history. This is the standard pattern for browser-side SSE-over-POST.
 */
export async function* streamChat(
  req: ChatRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(req),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `chat request failed: ${response.status} ${response.statusText}${
        text ? ` - ${text}` : ''
      }`,
    );
  }
  if (!response.body) {
    throw new Error('chat response had no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');

    let sepIdx: number;
    while ((sepIdx = buffer.indexOf('\n\n')) >= 0) {
      const rawEvent = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);

      const dataLines: string[] = [];
      for (const line of rawEvent.split('\n')) {
        if (line.startsWith(':')) continue;
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).replace(/^ /, ''));
        }
      }
      if (dataLines.length === 0) continue;

      const dataText = dataLines.join('\n');
      try {
        yield JSON.parse(dataText) as StreamEvent;
      } catch {
        // ignore malformed payloads
      }
    }
  }
}

export { API_BASE };

export async function generateTitle(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title ?? null;
  } catch {
    return null;
  }
}
