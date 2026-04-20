import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-paper/70 dark:bg-ink/70 border-b border-paper-line dark:border-ink-line">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
          <svg
            viewBox="0 0 48 32"
            width="32"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent-deep dark:text-accent"
            aria-hidden="true"
          >
            <polyline points="3,12 8,24 13,16 18,24 23,12" />
            <polyline points="28,18 33,24 44,6" />
          </svg>
          <span>workmark</span>
        </a>
        <nav className="flex items-center gap-3 text-sm">
          <a href="/docs" className="opacity-70 hover:opacity-100 transition-opacity">
            Docs
          </a>
          <a
            href="https://github.com/dustinlacewell/workmark"
            target="_blank"
            rel="noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/@ldlework/workmark"
            target="_blank"
            rel="noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            npm
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
