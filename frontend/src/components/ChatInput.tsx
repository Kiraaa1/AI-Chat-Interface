import { useEffect, useRef, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  disabled,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }, [value]);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!busy && value.trim()) onSubmit();
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-2 shadow-lg backdrop-blur">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder={
            disabled ? 'Backend unreachable…' : 'Ask anything. Shift+Enter for newline.'
          }
          disabled={disabled}
          className="scrollbar-thin max-h-56 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
        />

        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-red-500"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
