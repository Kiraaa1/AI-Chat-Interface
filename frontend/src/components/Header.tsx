interface HealthInfo {
  provider: string;
  model: string;
}

interface Props {
  health: HealthInfo | null;
  title: string | null;
  onToggleSidebar: () => void;
}

export function Header({ health, title, onToggleSidebar }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800/60 bg-slate-950/70 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="-ml-1 rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-md">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none">
            <path
              d="M5 8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4l-4 4v-4a3 3 0 0 1-3-3z"
              fill="currentColor"
              opacity="0.9"
            />
          </svg>
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-100">
            {title ?? 'AI Chat'}
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
    </header>
  );
}
