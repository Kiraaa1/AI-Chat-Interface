import { useEffect } from 'react';
import type { StoredConversation } from '../types/chat';
import { ConversationItem } from './ConversationItem';

interface Props {
  conversations: StoredConversation[];
  currentId: string | null;
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function Sidebar({
  conversations,
  currentId,
  open,
  onClose,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={[
          'fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800/60 bg-slate-950/95 backdrop-blur transition-transform',
          'lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-slate-800/60 px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Chats
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="px-3 py-2">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800/60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
          {conversations.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-500">
              No chats yet. Send a message to start.
            </p>
          ) : (
            conversations.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === currentId}
                onSelect={(id) => {
                  onSelect(id);
                  onClose();
                }}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))
          )}
        </div>

        <div className="border-t border-slate-800/60 px-4 py-3 text-[11px] text-slate-500">
          Stored locally in your browser.
        </div>
      </aside>
    </>
  );
}
