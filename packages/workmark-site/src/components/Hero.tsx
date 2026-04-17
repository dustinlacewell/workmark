export function Hero() {
  return (
    <section className="px-6 pt-20 pb-16">
      <div className="max-w-3xl mx-auto text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-deep dark:text-accent mb-6">
          A workspace command framework
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Every workspace command.
          <br />
          <span className="opacity-60">One source of truth.</span>
        </h1>
        <p className="mt-6 text-lg opacity-70 max-w-xl mx-auto leading-relaxed">
          Define each operation once in TypeScript. Run it from the terminal, click it in a VS Code dashboard, or let an AI agent invoke it as a tool.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <InstallSnippet />
          <a
            href="https://github.com/dustinlacewell/workmark"
            target="_blank"
            rel="noreferrer"
            className="text-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            view on GitHub →
          </a>
        </div>
      </div>
    </section>
  );
}

function InstallSnippet() {
  return (
    <div className="group relative font-mono text-sm rounded-md border border-paper-line dark:border-ink-line bg-paper-soft dark:bg-ink-soft px-4 py-2 select-all">
      <span className="opacity-50">$</span>{" "}
      <span>pnpm add @ldlework/workmark</span>
    </div>
  );
}
