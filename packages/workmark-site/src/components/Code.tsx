import { highlight, type Lang } from "../lib/highlight";

interface Props {
  code: string;
  lang?: Lang;
  label?: string;
}

export function Code({ code, lang = "typescript", label }: Props) {
  const html = highlight(code.trim(), lang);
  return (
    <div className="rounded-lg border border-paper-line dark:border-ink-line bg-paper-soft dark:bg-ink-soft overflow-hidden min-w-0">
      {label && (
        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider opacity-50 border-b border-paper-line dark:border-ink-line">
          {label}
        </div>
      )}
      <div
        className="wm-shiki text-xs leading-relaxed overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
