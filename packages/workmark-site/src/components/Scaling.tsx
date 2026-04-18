export function Scaling() {
  return (
    <section className="px-6 py-20 border-t border-paper-line dark:border-ink-line">
      <div className="max-w-4xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-deep dark:text-accent mb-4">
          For monorepos
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
          One command, many projects.
        </h2>
        <p className="mt-4 text-lg opacity-70 leading-relaxed max-w-2xl">
          Declare projects with a <code className="font-mono text-sm">wm.ts</code> file.
          Commands can enumerate them and build arg choices from what's present.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <CodePanel label="packages/api/wm.ts">
{`import { defineProject } from "@ldlework/workmark/define";

export default defineProject({
  name: "api",
  tags: ["backend"],
  capabilities: { deploy: true },
});`}
          </CodePanel>
          <CodePanel label="packages/web/wm.ts">
{`import { defineProject } from "@ldlework/workmark/define";

export default defineProject({
  name: "web",
  tags: ["frontend"],
  capabilities: { deploy: true },
});`}
          </CodePanel>
        </div>

        <p className="mt-8 opacity-70">
          Now a single <code className="font-mono text-sm">deploy</code> command
          discovers both projects and turns their names into a typed enum — in
          the CLI, the form, and the AI tool schema.
        </p>

        <div className="mt-4">
          <CodePanel label="prompt">
{`wm deploy api
wm deploy web`}
          </CodePanel>
        </div>
      </div>
    </section>
  );
}

function CodePanel({ label, children }: { label: string; children: string }) {
  return (
    <div className="rounded-lg border border-paper-line dark:border-ink-line bg-paper-soft dark:bg-ink-soft overflow-hidden">
      <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider opacity-50 border-b border-paper-line dark:border-ink-line">
        {label}
      </div>
      <pre className="p-3 text-xs leading-relaxed overflow-x-auto">{children}</pre>
    </div>
  );
}
