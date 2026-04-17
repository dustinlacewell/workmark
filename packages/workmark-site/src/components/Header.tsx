import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-paper/70 dark:bg-ink/70 border-b border-paper-line dark:border-ink-line">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <a href="/" className="font-mono text-sm font-semibold tracking-tight">
          <span className="text-accent-deep dark:text-accent">wm</span>
          <span className="opacity-60">·workmark</span>
        </a>
        <nav className="flex items-center gap-3 text-sm">
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
