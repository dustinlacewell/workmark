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
          Declare a <code className="font-mono text-sm">trait</code> once with
          a zod schema. Projects fulfill it with typed data. Commands ask for
          the trait and get per-project data, typed, in the handler.
        </p>

        <div className="mt-10">
          <CodePanel label=".wm/traits/docker.ts">
{`import { z } from "zod";
import { defineTrait } from "@ldlework/workmark/define";

export const docker = defineTrait({
  name: "docker",
  schema: z.object({
    composeFile: z.string(),
    service: z.string(),
  }),
});`}
          </CodePanel>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <CodePanel label="sites/api/wm.ts">
{`defineProject({
  name: "api",
  has: {
    docker: { composeFile: "docker-compose.yml", service: "api" },
  },
});`}
          </CodePanel>
          <CodePanel label="sites/web/wm.ts">
{`defineProject({
  name: "web",
  has: {
    docker: { composeFile: "docker-compose.yml", service: "web" },
  },
});`}
          </CodePanel>
        </div>

        <p className="mt-8 opacity-70">
          Now one command, and the project enum in CLI, VS Code, and the
          MCP tool schema is whichever projects fulfill <code className="font-mono text-sm">docker</code>.
        </p>

        <div className="mt-6">
          <CodePanel label=".wm/commands/up.ts">
{`export default cmd({
  needs: [docker],
  handler: (_, { traits, sh }) =>
    sh(\`docker compose -f \${traits.docker.composeFile} up -d \${traits.docker.service}\`),
});`}
          </CodePanel>
        </div>

        <div className="mt-6">
          <CodePanel label="terminal">
{`wm up api
wm up api web        # both in parallel
wm up --help         # project: [api, web]`}
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
