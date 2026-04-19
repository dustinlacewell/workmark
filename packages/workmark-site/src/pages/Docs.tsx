import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { Code as Highlighted } from "../components/Code";
import type { Lang } from "../lib/highlight";

const SECTIONS = [
  { id: "model", label: "Mental model" },
  { id: "quick-start", label: "Quick start" },
  { id: "projects", label: "Projects" },
  { id: "traits", label: "Traits" },
  { id: "commands", label: "Commands" },
  { id: "handlers", label: "Handlers" },
  { id: "running", label: "Running" },
  { id: "reference", label: "Reference" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function Docs() {
  const [active, setActive] = useState<SectionId>("model");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as SectionId);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 flex gap-10">
        <Sidebar active={active} />
        <main className="flex-1 min-w-0">
          <Model />
          <QuickStart />
          <Projects />
          <Traits />
          <Commands />
          <Handlers />
          <Running />
          <Reference />
        </main>
      </div>
    </div>
  );
}

function Sidebar({ active }: { active: SectionId }) {
  return (
    <aside className="hidden lg:block w-48 shrink-0">
      <nav className="sticky top-20 space-y-0.5">
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-40 mb-3 px-2">
          Docs
        </p>
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className={[
              "block px-2 py-1 text-sm rounded transition-colors",
              active === id
                ? "text-accent-deep dark:text-accent bg-accent-deep/8 dark:bg-accent/8"
                : "opacity-60 hover:opacity-100",
            ].join(" ")}
          >
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: SectionId;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="pt-12 pb-4 border-b border-paper-line dark:border-ink-line last:border-0"
    >
      {eyebrow && (
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-deep dark:text-accent mb-2">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-semibold tracking-tight mb-6">{title}</h2>
      <div className="space-y-5 text-sm leading-relaxed opacity-90">{children}</div>
    </section>
  );
}

function Code({ children, label, lang = "typescript" }: { children: string; label?: string; lang?: Lang }) {
  return <Highlighted code={children} label={label} lang={lang} />;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="opacity-80 leading-relaxed">{children}</p>;
}

function C({ children }: { children: string }) {
  return (
    <code className="font-mono text-xs bg-paper-soft dark:bg-ink-soft px-1.5 py-0.5 rounded border border-paper-line dark:border-ink-line">
      {children}
    </code>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold tracking-tight pt-4 pb-1">{children}</h3>;
}

// ---- Sections ----

function Model() {
  return (
    <Section id="model" eyebrow="Start here" title="The mental model">
      <P>Workmark has four things:</P>
      <ul className="list-none space-y-2">
        <li><strong className="text-accent-deep dark:text-accent">Project</strong> — a named directory (<C>wm.ts</C>) with typed metadata.</li>
        <li><strong className="text-accent-deep dark:text-accent">Trait</strong> — a named zod schema describing a slice of metadata.</li>
        <li><strong className="text-accent-deep dark:text-accent">Command</strong> — a TypeScript file declaring args and a handler.</li>
        <li><strong className="text-accent-deep dark:text-accent">Handler</strong> — a function that gets typed args + a context and returns a result.</li>
      </ul>
      <P>
        Commands declare which traits they need. Projects declare which traits they have.
        The framework matches them, generates CLI args / VS Code forms / MCP tool schemas,
        and hands your handler fully-typed data. That's the whole idea.
      </P>
    </Section>
  );
}

function QuickStart() {
  return (
    <Section id="quick-start" title="Quick start">
      <P>Install:</P>
      <Code label="terminal" lang="bash">{`pnpm add -D @ldlework/workmark`}</Code>
      <P>Write a command:</P>
      <Code label=".wm/commands/build.ts">{`/** Build the project */
import { cmd } from "@ldlework/workmark/define";

export default cmd({
  handler: (_, { sh }) => sh("cargo build"),
});`}</Code>
      <P>Run it:</P>
      <Code label="terminal" lang="bash">{`wm build`}</Code>
      <P>
        That's the simplest case. Projects and traits earn their keep when you have
        multiple packages or shared config — see below.
      </P>
    </Section>
  );
}

function Projects() {
  return (
    <Section id="projects" title="Projects">
      <P>
        A <C>wm.ts</C> file anywhere in the workspace declares a project.
        The framework discovers them recursively from the root.
      </P>
      <Code label="packages/api/wm.ts">{`import { defineProject } from "@ldlework/workmark/define";

export default defineProject({
  name: "api",
  tags: ["backend"],
  has: { buildable: true, docker: { composeFile: "docker-compose.yml", service: "api" } },
});`}</Code>
      <P>
        <C>has</C> is where a project fulfills traits. <C>tags</C> are free-form labels
        for human-readable grouping — they don't show up in commands. Use <C>tags</C> for
        "this is a backend service" documentation; use <C>has</C> for "this project supports
        the build trait."
      </P>
      <P>
        The root can also have a <C>wm.ts</C> that exports <em>multiple</em> projects as an
        array — useful when each package lives in a flat layout:
      </P>
      <Code label="wm.ts">{`export default [
  defineProject({ name: "api",  dir: "packages/api",  has: { buildable: true } }),
  defineProject({ name: "web",  dir: "packages/web",  has: { buildable: true } }),
];`}</Code>
    </Section>
  );
}

function Traits() {
  return (
    <Section id="traits" title="Traits">
      <P>
        A trait is a named zod schema. Put it in <C>.wm/traits/</C>; the filename doesn't
        matter — the <C>name</C> field is the identity.
      </P>
      <Code label=".wm/traits/buildable.ts">{`import { z } from "zod";
import { defineTrait } from "@ldlework/workmark/define";

/** Projects with a build step. */
export const buildable = defineTrait({
  name: "buildable",
  schema: z.object({
    command: z.string().default("pnpm build"),
    timeout: z.number().default(180_000),
  }),
});`}</Code>
      <P>
        When a project writes <C>has: {"{ buildable: { command: \"cargo build\" } }"}</C>,
        the framework parses that against the schema at load time and stores the typed result.
        <C>has: {"{ buildable: true }"}</C> is sugar for "use the defaults."
      </P>
      <P>
        Traits come in two flavors:
      </P>
      <ul className="list-disc list-inside space-y-1 opacity-80 ml-2">
        <li>
          <strong>Data traits</strong> — the schema has fields the handler will read
          (like <C>buildable.command</C>, <C>docker.composeFile</C>).
        </li>
        <li>
          <strong>Marker traits</strong> — the schema is empty or all-defaults. Used as a
          filter: "projects that have the <C>publishable</C> trait."
        </li>
      </ul>
    </Section>
  );
}

function Commands() {
  return (
    <Section id="commands" title="Commands">
      <P>
        A command lives in <C>.wm/commands/</C>. Subdirectories become colon-joined:{" "}
        <C>commands/docker/up.ts</C> → <C>docker:up</C>.
      </P>
      <Code label=".wm/commands/build.ts">{`import { cmd } from "@ldlework/workmark/define";
import { buildable } from "../traits/buildable.js";

/** Build one or more packages. */
export default cmd({
  needs: [buildable],
  handler: (_, { traits, sh }) => sh(traits.buildable.command),
});`}</Code>
      <P>
        <C>needs</C> lists required traits. The framework:
      </P>
      <ul className="list-disc list-inside space-y-1 opacity-80 ml-2">
        <li>Filters to projects that fulfill all needed traits.</li>
        <li>Exposes a <C>project</C> arg as an enum of their names (CLI / form / MCP).</li>
        <li>Resolves the selection and hands the handler <C>ctx.project</C> + <C>ctx.traits.*</C>, fully typed.</li>
      </ul>

      <H3>Select modes</H3>
      <P>How many projects a command runs against:</P>
      <Code>{`select: "one"          // exactly one project
select: "one-or-many"  // 1+ projects; handler runs per (default with needs)
select: "all"          // all eligible; no user choice
for: "ghost"           // bound to a specific project; no project arg exposed`}</Code>

      <H3>Args and flags</H3>
      <P>
        Both are <C>Record&lt;string, z.ZodType&gt;</C>. <C>args</C> entries are positional
        (in declaration order); <C>flags</C> are named <C>--foo</C>. Descriptions come from
        zod's <C>.describe()</C>.
      </P>
      <Code label="with args and flags">{`export default cmd({
  needs: [docker],
  args: {
    service: z.string().optional().describe("Service to restart"),
  },
  flags: {
    force: z.boolean().default(false),
  },
  handler: ({ service, force }, { traits, sh }) =>
    sh(\`docker compose -f \${traits.docker.composeFile} restart \${service ?? ""}\${force ? " --force" : ""}\`),
});`}</Code>

      <H3>Aggregating across projects</H3>
      <P>
        With <C>select: "all"</C> (or <C>"one-or-many"</C>) you can aggregate results:
      </P>
      <Code>{`export default cmd({
  needs: [buildable],
  select: "all",
  run: {
    reduce: (results) => {
      const failed = results.filter(r => !r.ok);
      return failed.length === 0
        ? ok(\`\${results.length} built\`)
        : fail(\`\${failed.length} failed\`);
    },
  },
  handler: (_, { traits, sh }) => sh(traits.buildable.command),
});`}</Code>
    </Section>
  );
}

function Handlers() {
  return (
    <Section id="handlers" title="Handlers">
      <P>
        A handler takes <C>(args, ctx)</C> and returns a <C>CallToolResult</C>.
      </P>
      <P>
        <C>args</C> is your declared args + flags, fully typed from the zod schemas.
        <C>ctx</C> is workmark-provided — it's where <C>project</C>, <C>traits</C>,
        and helpers live.
      </P>
      <Code>{`ctx.project     // the resolved Project (when needs is set)
ctx.traits      // { [traitName]: typed data } (when needs is set)
ctx.workspace   // the full Workspace
ctx.sh(cmd)     // shell exec in the resolved cwd; returns CallToolResult
ctx.sh([a, b])  // sequence: fail-fast, concatenate output
ctx.exec(cmd, { cwd, timeout, env })  // explicit options
ctx.ok(data)    // wrap data as a success result
ctx.fail(err)   // wrap as an error result
ctx.invoke(name, args)  // call another command`}</Code>

      <H3>Working directory</H3>
      <P>
        <C>ctx.sh</C> resolves cwd automatically:
      </P>
      <ul className="list-disc list-inside space-y-1 opacity-80 ml-2">
        <li>With <C>needs</C> → each iteration's <C>project.dir</C>.</li>
        <li>Without <C>needs</C> → the workspace root.</li>
        <li>Override per-command via <C>cwd: "project" | "workspace" | (ctx) =&gt; absolutePath</C>.</li>
      </ul>

      <H3>Composition</H3>
      <P>
        Handlers can invoke other commands by name. The framework detects cycles and returns
        a clean error.
      </P>
      <Code>{`handler: async (_, { invoke, fail }) => {
  const check = await invoke("check", {});
  if (check.isError) return fail("check failed — aborting");
  return invoke("build", { project: ["api", "web"] });
}`}</Code>
    </Section>
  );
}

function Running() {
  return (
    <Section id="running" title="Running">
      <H3>CLI</H3>
      <Code label="terminal" lang="bash">{`wm --help                         # list all commands
wm build --help                   # per-command help
wm build api                      # one project
wm build api web                  # two projects
wm docker:up api --service=db     # nested group, with a flag`}</Code>

      <H3>VS Code dashboard</H3>
      <P>
        Install the{" "}
        <a
          href="https://marketplace.visualstudio.com/items?itemName=ldlework.workmark-vsc"
          target="_blank"
          rel="noreferrer"
          className="text-accent-deep dark:text-accent underline underline-offset-2"
        >
          workmark-vsc
        </a>{" "}
        extension. The Workspace panel shows every command with an auto-generated form:
        enums become dropdowns, booleans become checkboxes, required fields are enforced,
        and the command runs in the integrated terminal.
      </P>

      <H3>MCP</H3>
      <P>
        Workmark ships a built-in{" "}
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noreferrer"
          className="text-accent-deep dark:text-accent underline underline-offset-2"
        >
          MCP
        </a>{" "}
        server. Every command is an MCP tool; input schemas are JSON Schema derived from your
        zod declarations. Point your client at the binary:
      </P>
      <Code label=".mcp.json" lang="jsonc">{`{
  "mcpServers": {
    "workspace": {
      "command": "node",
      "args": ["./node_modules/@ldlework/workmark/dist/index.js"]
    }
  }
}`}</Code>
      <P>
        AI assistants see your commands with the same validated inputs you see. No separate
        server to run.
      </P>
    </Section>
  );
}

function Reference() {
  return (
    <Section id="reference" title="Reference">
      <H3>Imports</H3>
      <Code>{`import {
  cmd,              // declare a command
  defineProject,    // declare a project
  defineTrait,      // declare a trait
  projectsOf,       // enum of projects fulfilling a trait (for use in args/flags)
  traitField,       // per-project-data enums (.forProject / .fromArg)
  fromWorkspace,    // custom workspace-aware schema
  fromArgs,         // custom invocation-time schema
} from "@ldlework/workmark/define";

import { ok, fail, exec, execAsync } from "@ldlework/workmark/helpers";
import type { Trait } from "@ldlework/workmark/types";`}</Code>

      <H3>Project structure</H3>
      <Code>{`your-workspace/
├── .wm/
│   ├── traits/
│   │   └── buildable.ts       # trait definitions
│   └── commands/
│       ├── build.ts           # wm build
│       └── docker/
│           ├── up.ts          # wm docker:up
│           └── down.ts        # wm docker:down
├── packages/
│   ├── api/
│   │   └── wm.ts              # project definition
│   └── web/
│       └── wm.ts
├── wm.ts                      # optional: root project(s)
└── package.json`}</Code>

      <H3>Command options</H3>
      <Code>{`cmd({
  needs?: Trait[],                            // required traits
  select?: "one" | "one-or-many" | "all",     // default: "one-or-many" when needs present
  for?: string,                               // bind to a specific project
  args?: Record<string, z.ZodType>,           // positional
  flags?: Record<string, z.ZodType>,          // named
  cwd?: "project" | "workspace" | ((ctx) => string),
  run?: {
    order?: "parallel" | "serial",
    concurrency?: number,
    stopOnFailure?: boolean,
    reduce?: (results) => CallToolResult,
  },
  meta?: { name?: string; label?: string; description?: string },
  handler: (args, ctx) => CallToolResult | Promise<CallToolResult>,
});`}</Code>
    </Section>
  );
}
