import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatInput } from './components/ChatInput';
import { Header } from './components/Header';
import { Message } from './components/Message';
import { API_BASE, streamChat } from './lib/sse';
import type {
  ChatMessage as ApiMessage,
  ToolEvent,
  UiMessage,
} from './types/chat';

interface Health {
  provider: string;
  model: string;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const SUGGESTIONS = [
  'What time is it in Tokyo right now?',
  'Search the web for the latest news on AI regulation.',
  'Explain Server-Sent Events vs WebSockets in two sentences.',
];

export default function App() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/health`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setHealth({ provider: data.provider, model: data.model });
        setHealthError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setHealthError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const apiHistory = useMemo<ApiMessage[]>(
    () =>
      messages
        .filter((m) => m.status !== 'error')
        .map((m) => ({ role: m.role, content: m.content })),
    [messages],
  );

  const updateMessage = useCallback(
    (id: string, fn: (prev: UiMessage) => UiMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? fn(m) : m)),
      );
    },
    [],
  );

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;

    const userMsg: UiMessage = {
      id: newId(),
      role: 'user',
      content: text,
      tools: [],
      status: 'done',
    };
    const assistantId = newId();
    const assistantMsg: UiMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      tools: [],
      status: 'streaming',
    };

    const nextHistory: ApiMessage[] = [
      ...apiHistory,
      { role: 'user', content: text },
    ];

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setDraft('');
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const ev of streamChat(
        { messages: nextHistory },
        controller.signal,
      )) {
        switch (ev.type) {
          case 'token': {
            updateMessage(assistantId, (m) => ({
              ...m,
              content: m.content + ev.delta,
            }));
            break;
          }
          case 'tool_call': {
            const tool: ToolEvent = {
              id: ev.id,
              name: ev.name,
              args: ev.args,
              status: 'calling',
            };
            updateMessage(assistantId, (m) => ({
              ...m,
              tools: [...m.tools, tool],
            }));
            break;
          }
          case 'tool_result': {
            const isError =
              ev.result &&
              typeof ev.result === 'object' &&
              'error' in (ev.result as Record<string, unknown>);
            updateMessage(assistantId, (m) => ({
              ...m,
              tools: m.tools.map((t) =>
                t.id === ev.id
                  ? {
                      ...t,
                      result: ev.result,
                      status: isError ? 'error' : 'done',
                    }
                  : t,
              ),
            }));
            break;
          }
          case 'error': {
            updateMessage(assistantId, (m) => ({
              ...m,
              status: 'error',
              errorText: ev.message,
            }));
            break;
          }
          case 'done': {
            updateMessage(assistantId, (m) => ({
              ...m,
              status: m.status === 'error' ? 'error' : 'done',
            }));
            break;
          }
        }
      }

      updateMessage(assistantId, (m) =>
        m.status === 'streaming' ? { ...m, status: 'done' } : m,
      );
    } catch (err) {
      const aborted =
        err instanceof DOMException && err.name === 'AbortError';
      updateMessage(assistantId, (m) => ({
        ...m,
        status: aborted ? 'done' : 'error',
        errorText: aborted
          ? undefined
          : err instanceof Error
            ? err.message
            : String(err),
      }));
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }, [apiHistory, busy, draft, updateMessage]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <Header
        health={health}
        onClear={handleClear}
        canClear={messages.length > 0 && !busy}
      />

      {healthError && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          Couldn't reach the backend at <code>{API_BASE}</code> ({healthError}).
          Is it running?
        </div>
      )}

      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6"
      >
        {messages.length === 0 ? (
          <EmptyState onPick={(s) => setDraft(s)} />
        ) : (
          messages.map((m) => <Message key={m.id} message={m} />)
        )}
      </div>

      <div className="border-t border-slate-800/60 bg-slate-950/40 px-4 pb-5 pt-3 sm:px-6">
        <ChatInput
          value={draft}
          onChange={setDraft}
          onSubmit={handleSend}
          onStop={handleStop}
          busy={busy}
          disabled={!!healthError}
        />
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Streaming via SSE · Tools are dispatched server-side and folded back
          into the stream.
        </p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  onPick: (s: string) => void;
}

function EmptyState({ onPick }: EmptyStateProps) {
  return (
    <div className="mx-auto mt-12 flex max-w-md flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none">
          <path
            d="M5 8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4l-4 4v-4a3 3 0 0 1-3-3z"
            fill="currentColor"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-100">
        How can I help today?
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        I can search the web and check the time when I need to.
      </p>

      <div className="mt-6 flex w-full flex-col gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-left text-sm text-slate-300 transition hover:border-slate-500 hover:bg-slate-800/60"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
