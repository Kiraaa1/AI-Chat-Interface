interface HealthInfo {
  provider: string;
  model: string;
}

interface Props {
  health: HealthInfo | null;
  onClear: () => void;
  canClear: boolean;
}

export function Header({ health, onClear, canClear }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800/60 bg-slate-950/70 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-md">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none">
            <path
              d="M5 8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4l-4 4v-4a3 3 0 0 1-3-3z"
              fill="currentColor"
              opacity="0.9"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-slate-100">
            AI Chat
          </h1>
          <p className="text-xs text-slate-400">
            {health ? (
              <>
                <span className="capitalize">{health.provider}</span>
                <span className="text-slate-600"> · </span>
                <span className="font-mono">{health.model}</span>
              </>
            ) : (
              'Connecting…'
            )}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClear}
        disabled={!canClear}
        className="rounded-lg border border-slate-700/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        New chat
      </button>
    </header>
  );
}
