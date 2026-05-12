import type { UiMessage } from '../types/chat';
import { Markdown } from './Markdown';
import { ToolBadge } from './ToolBadge';

interface Props {
  message: UiMessage;
}

export function Message({ message }: Props) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';

  return (
    <div
      className={[
        'flex w-full animate-fade-in',
        isUser ? 'justify-end' : 'justify-start',
      ].join(' ')}
    >
      <div
        className={[
          'max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm',
          isUser
            ? 'bg-indigo-500 text-white'
            : 'bg-slate-800/70 text-slate-100 ring-1 ring-slate-700/60',
        ].join(' ')}
      >
        {!isUser && message.tools.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {message.tools.map((t) => (
              <ToolBadge key={t.id} tool={t} />
            ))}
          </div>
        )}

        {isUser ? (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : message.content ? (
          <Markdown content={message.content} />
        ) : isStreaming ? (
          <TypingDots />
        ) : null}

        {!isUser && isStreaming && message.content && (
          <span
            className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-slate-300 align-baseline"
            aria-hidden
          />
        )}

        {message.status === 'error' && (
          <div className="mt-2 rounded-md bg-red-500/15 px-2 py-1 text-xs text-red-200">
            {message.errorText ?? 'Something went wrong.'}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div
      className="flex items-center gap-1 py-1 text-slate-400"
      aria-label="Assistant is thinking"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
    </div>
  );
}
