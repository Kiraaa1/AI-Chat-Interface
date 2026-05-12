import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { StoredConversation } from '../types/chat';

interface Props {
  conversation: StoredConversation;
  active: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationItem({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(conversation.title);
  }, [conversation.title, editing]);

  function commitRename() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(conversation.id, trimmed);
    } else {
      setDraft(conversation.title);
    }
  }

  function handleInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
      setDraft(conversation.title);
    }
  }

  return (
    <div
      className={[
        'group relative flex items-center gap-1 rounded-lg px-2 py-1.5 transition',
        active
          ? 'bg-slate-700/60 text-slate-50'
          : 'text-slate-300 hover:bg-slate-800/70',
      ].join(' ')}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleInputKey}
          onBlur={commitRename}
          className="flex-1 rounded bg-slate-900/80 px-2 py-1 text-sm text-slate-100 ring-1 ring-slate-600 focus:outline-none focus:ring-cyan-400"
        />
      ) : (
        <button
          type="button"
          onClick={() => onSelect(conversation.id)}
          onDoubleClick={() => setEditing(true)}
          title={conversation.title}
          className="flex-1 truncate rounded px-1 py-0.5 text-left text-sm"
        >
          {conversation.title}
        </button>
      )}

      {!editing && !confirmingDelete && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <IconButton
            label="Rename"
            onClick={() => setEditing(true)}
            icon={
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 20h4l10-10-4-4L4 16v4z" />
                <path d="M14 6l4 4" />
              </svg>
            }
          />
          <IconButton
            label="Delete"
            onClick={() => setConfirmingDelete(true)}
            icon={
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            }
          />
        </div>
      )}

      {confirmingDelete && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onDelete(conversation.id);
              setConfirmingDelete(false);
            }}
            className="rounded bg-red-500/90 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-red-500"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="rounded bg-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

interface IconBtnProps {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

function IconButton({ label, onClick, icon }: IconBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
    >
      {icon}
    </button>
  );
}
