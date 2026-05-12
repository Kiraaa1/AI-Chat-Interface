import { useState } from 'react';
import type { ToolEvent } from '../types/chat';

const FRIENDLY: Record<string, { calling: string; done: string }> = {
  web_search: {
    calling: 'Searching the web…',
    done: 'Searched the web',
  },
  get_current_time: {
    calling: 'Checking the time…',
    done: 'Checked the time',
  },
};

function summarize(name: string, status: 'calling' | 'done' | 'error'): string {
  const f = FRIENDLY[name];
  if (f) return status === 'calling' ? f.calling : f.done;
  return status === 'calling' ? `Running ${name}…` : `Ran ${name}`;
}

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cyan-400/60 border-t-transparent"
      aria-hidden
    />
  );
}

interface Props {
  tool: ToolEvent;
}

export function ToolBadge({ tool }: Props) {
  const [open, setOpen] = useState(false);
  const calling = tool.status === 'calling';
  const errored = tool.status === 'error';

  const label = summarize(tool.name, errored ? 'error' : tool.status);

  return (
    <div className="my-1 animate-fade-in">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={calling}
        className={[
          'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition',
          calling
            ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
            : errored
              ? 'border-red-400/40 bg-red-400/10 text-red-200 hover:bg-red-400/20'
              : 'border-slate-600/60 bg-slate-800/60 text-slate-200 hover:bg-slate-700/60',
        ].join(' ')}
        aria-expanded={open}
      >
        {calling ? <Spinner /> : <span aria-hidden>{errored ? '⚠' : '✓'}</span>}
        <span className="font-medium">{label}</span>
        {!calling && (
          <span className="text-slate-400">
            {open ? '▾ hide' : '▸ details'}
          </span>
        )}
      </button>

      {open && !calling && (
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/60 text-xs">
          <div className="border-b border-slate-700/60 px-3 py-1.5 text-slate-400">
            <span className="font-mono text-slate-300">{tool.name}</span>
            {tool.args && Object.keys(tool.args).length > 0 && (
              <span className="ml-2 text-slate-500">
                ({JSON.stringify(tool.args)})
              </span>
            )}
          </div>
          <pre className="scrollbar-thin max-h-64 overflow-auto p-3 text-slate-200">
            {safeStringify(tool.result)}
          </pre>
        </div>
      )}
    </div>
  );
}

function safeStringify(v: unknown): string {
  if (v === undefined) return '';
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
