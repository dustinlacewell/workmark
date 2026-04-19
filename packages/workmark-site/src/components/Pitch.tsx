export function Pitch() {
  return (
    <section className="px-6 py-20 border-t border-paper-line dark:border-ink-line">
      <div className="max-w-5xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-deep dark:text-accent mb-4 text-center">
          The idea
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          One file. Three surfaces.
        </h2>
        <p className="mt-4 text-lg opacity-70 leading-relaxed text-center max-w-2xl mx-auto">
          Write a command once in TypeScript. Workmark renders it as a CLI, a
          VS Code form, and an AI-invocable tool — from the same definition, fully typed.
        </p>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-8 items-start">
          <SourceFile />
          <Fanout />
          <div className="flex flex-col gap-4">
            <TerminalSurface />
            <FormSurface />
            <AgentSurface />
          </div>
        </div>
      </div>
    </section>
  );
}

function SourceFile() {
  return (
    <Panel label=".wm/commands/build.ts">
      <pre className="text-xs leading-relaxed">
        <Line><Kw>/**</Kw> <Str>Build one or more packages.</Str> <Kw>*/</Kw></Line>
        <Line><Kw>import</Kw> {"{ cmd }"} <Kw>from</Kw> <Str>"@ldlework/workmark/define"</Str>;</Line>
        <Line><Kw>import</Kw> {"{ buildable }"} <Kw>from</Kw> <Str>"../traits/buildable.js"</Str>;</Line>
        <Line />
        <Line><Kw>export default</Kw> <Fn>cmd</Fn>({"{"}</Line>
        <Line indent={2}>needs: [buildable],</Line>
        <Line indent={2}>handler: (_, {"{ traits, sh }"}) =&gt;</Line>
        <Line indent={4}><Fn>sh</Fn>(traits.buildable.command),</Line>
        <Line>{"}"});</Line>
      </pre>
    </Panel>
  );
}

function Fanout() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center gap-2 pt-6 opacity-40">
      <Arrow />
      <Arrow />
      <Arrow />
    </div>
  );
}

function Arrow() {
  return (
    <svg width="40" height="14" viewBox="0 0 40 14" fill="none" stroke="currentColor" strokeWidth="1.2">
      <line x1="0" y1="7" x2="34" y2="7" />
      <polyline points="30,2 36,7 30,12" fill="none" />
    </svg>
  );
}

function TerminalSurface() {
  return (
    <Panel label="terminal">
      <pre className="text-xs leading-relaxed">
        <Line><Dim>$</Dim> wm build api web</Line>
        <Line><Dim>--- api ---</Dim></Line>
        <Line><Dim>compiled in 1.2s</Dim></Line>
        <Line><Dim>--- web ---</Dim></Line>
        <Line><Dim>compiled in 0.9s</Dim></Line>
      </pre>
    </Panel>
  );
}

function FormSurface() {
  return (
    <Panel label="VS Code">
      <div className="text-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="opacity-60">project</span>
          <span className="flex-1 px-2 py-1 rounded border border-paper-line dark:border-ink-line bg-paper dark:bg-ink">
            api, web <span className="opacity-40 float-right">▾</span>
          </span>
        </div>
        <button className="w-full mt-1 px-3 py-1.5 rounded bg-accent-deep/80 dark:bg-accent/20 text-paper dark:text-accent border border-accent-deep dark:border-accent/50 text-left">
          <span className="opacity-80">▶</span>&nbsp; Run (wm build)
        </button>
      </div>
    </Panel>
  );
}

function AgentSurface() {
  return (
    <Panel label="AI agent">
      <pre className="text-xs leading-relaxed">
        <Line><Dim>&gt;</Dim> <Kw>use_tool</Kw>(<Str>"build"</Str>,</Line>
        <Line indent={4}>{"{"} project: [<Str>"api"</Str>] {"}"}</Line>
        <Line>)</Line>
        <Line><Dim>→ compiled in 1.2s</Dim></Line>
      </pre>
    </Panel>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-paper-line dark:border-ink-line bg-paper-soft dark:bg-ink-soft overflow-hidden">
      <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider opacity-50 border-b border-paper-line dark:border-ink-line">
        {label}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Line({ children = "", indent = 0 }: { children?: React.ReactNode; indent?: number }) {
  return (
    <div>
      {" ".repeat(indent)}
      {children}
    </div>
  );
}

function Kw({ children }: { children: React.ReactNode }) {
  return <span className="text-accent-deep dark:text-accent">{children}</span>;
}
function Str({ children }: { children: React.ReactNode }) {
  return <span className="text-amber-700 dark:text-amber-300">{children}</span>;
}
function Fn({ children }: { children: React.ReactNode }) {
  return <span className="text-sky-700 dark:text-sky-300">{children}</span>;
}
function Dim({ children }: { children: React.ReactNode }) {
  return <span className="opacity-50">{children}</span>;
}
