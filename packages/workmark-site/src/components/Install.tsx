import { Code } from "./Code";

export function Install() {
  return (
    <section className="px-6 py-20 border-t border-paper-line dark:border-ink-line">
      <div className="max-w-3xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-deep dark:text-accent mb-4 text-center">
          Get started
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          Three steps.
        </h2>

        <ol className="mt-12 space-y-8">
          <Step
            n={1}
            title="Install"
            code="pnpm add -D @ldlework/workmark"
            lang="bash"
          />
          <Step
            n={2}
            title="Write a command"
            file=".wm/commands/build.ts"
            code={`/** Build the project */
import { cmd } from "@ldlework/workmark/define";

export default cmd({
  handler: (_, { sh }) => sh("cargo build"),
});`}
          />
          <Step
            n={3}
            title="Run it"
            lang="bash"
            code={`wm build              # CLI
# or click it in the VS Code dashboard
# or let Claude call it as an MCP tool`}
          />
        </ol>

        <div className="mt-14 text-center">
          <a
            href="/docs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-accent-deep/40 dark:border-accent/40 text-accent-deep dark:text-accent hover:bg-accent-deep/5 dark:hover:bg-accent/5 transition-colors"
          >
            Read the docs →
          </a>
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  code,
  file,
  lang,
}: {
  n: number;
  title: string;
  code: string;
  file?: string;
  lang?: "typescript" | "bash";
}) {
  return (
    <li className="flex gap-5 items-start">
      <div className="shrink-0 w-9 h-9 rounded-full border border-accent-deep/40 dark:border-accent/40 text-accent-deep dark:text-accent flex items-center justify-center font-mono text-sm">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <div className="mt-2">
          <Code code={code} lang={lang ?? "typescript"} label={file} />
        </div>
      </div>
    </li>
  );
}
