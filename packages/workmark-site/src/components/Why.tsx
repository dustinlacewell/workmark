export function Why() {
  return (
    <section className="px-6 py-20 border-t border-paper-line dark:border-ink-line">
      <div className="max-w-5xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-deep dark:text-accent mb-4 text-center">
          Why it works
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          Three things, for the price of one.
        </h2>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Pillar
            title="Typed, end-to-end"
            body="Declare args with zod. You get runtime validation, CLI help, VS Code form fields, and MCP tool schemas — automatic."
          />
          <Pillar
            title="AI-native"
            body="Every command is an MCP tool. AI assistants discover and invoke your workspace the same way you do — no separate server to maintain."
          />
          <Pillar
            title="Zero SaaS"
            body="It's files in your repo. No accounts, no dashboards-as-a-service, no login. Works offline, commits to git, ships with your code."
          />
        </div>
      </div>
    </section>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-5 rounded-lg border border-paper-line dark:border-ink-line bg-paper-soft dark:bg-ink-soft">
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm opacity-70 leading-relaxed">{body}</p>
    </div>
  );
}
