import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  p: ({ node: _node, ...props }) => (
    <p
      className="my-2 first:mt-0 last:mb-0 leading-relaxed"
      {...props}
    />
  ),
  a: ({ node: _node, ...props }) => (
    <a
      className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  strong: ({ node: _node, ...props }) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  em: ({ node: _node, ...props }) => (
    <em className="italic" {...props} />
  ),
  ul: ({ node: _node, ...props }) => (
    <ul
      className="my-2 list-disc space-y-1 pl-5 marker:text-slate-500"
      {...props}
    />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol
      className="my-2 list-decimal space-y-1 pl-5 marker:text-slate-500"
      {...props}
    />
  ),
  li: ({ node: _node, ...props }) => <li className="leading-relaxed" {...props} />,
  h1: ({ node: _node, ...props }) => (
    <h1 className="my-3 text-lg font-semibold tracking-tight" {...props} />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2 className="my-3 text-base font-semibold tracking-tight" {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3 className="my-2 text-sm font-semibold tracking-tight" {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-slate-600 pl-3 italic text-slate-300"
      {...props}
    />
  ),
  hr: () => <hr className="my-3 border-slate-700/60" />,
  pre: ({ node: _node, ...props }) => (
    <pre
      className="scrollbar-thin my-2 overflow-x-auto rounded-lg bg-slate-950/80 p-3 text-[0.85em] font-mono leading-relaxed text-slate-100 ring-1 ring-slate-700/60"
      {...props}
    />
  ),
  code: ({ node: _node, className, children, ...props }) => {
    const isBlock = (className ?? '').startsWith('language-');
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-slate-950/70 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-200 ring-1 ring-slate-700/60"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ node: _node, ...props }) => (
    <div className="scrollbar-thin my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }) => (
    <thead className="bg-slate-900/60" {...props} />
  ),
  th: ({ node: _node, ...props }) => (
    <th
      className="border border-slate-700/60 px-2 py-1 text-left font-semibold"
      {...props}
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="border border-slate-700/60 px-2 py-1 align-top" {...props} />
  ),
};

interface Props {
  content: string;
}

function MarkdownInner({ content }: Props) {
  return (
    <div className="break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownInner);
