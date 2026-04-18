import { useState, useEffect, useRef } from "react";
import { Header } from "../components/Header";

const SECTIONS = [
  { id: "quick-start", label: "Quick Start" },
  { id: "commands", label: "Commands" },
  { id: "projects", label: "Projects" },
  { id: "dynamic-commands", label: "Dynamic Commands" },
  { id: "cli", label: "CLI" },
  { id: "vscode", label: "VS Code" },
  { id: "mcp", label: "MCP / AI Agents" },
  { id: "structure", label: "Project Structure" },
  { id: "api", label: "API Reference" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function Docs() {
  const [active, setActive] = useState<SectionId>("quick-start");

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
        <main className="flex-1 min-w-0 prose-docs">
          <QuickStart />
          <Commands />
          <Projects />
          <DynamicCommands />
          <CliSection />
          <VsCodeSection />
          <McpSection />
          <StructureSection />
          <ApiSection />
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

function Code({ children, label }: { children: string; label?: string }) {
  return (
    <div className="rounded-lg border border-paper-line dark:border-ink-line bg-paper-soft dark:bg-ink-soft overflow-hidden">
      {label && (
        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider opacity-50 border-b border-paper-line dark:border-ink-line">
          {label}
        </div>
      )}
      <pre className="p-4 text-xs leading-relaxed overflow-x-auto">{children}</pre>
    </div>
  );
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

function QuickStart() {
  return (
    <Section id="quick-start" eyebrow="Getting started" title="Quick Start">
      <P>Install workmark as a dev dependency in your workspace root:</P>
      <Code label="terminal">{`pnpm add -D @ldlework/workmark`}</Code>
      <P>
        Create a command file. Drop any <C>.ts</C> file inside <C>.wm/commands/</C> — the filename
        becomes the command name, a leading JSDoc comment becomes the description, and a string
        return runs as a shell command.
      </P>
      <Code label=".wm/commands/build.ts">{`/** Build the project */
import { cmd } from "@ldlework/workmark/define";
export default cmd({ handler: () => "cargo build" });`}</Code>
      <P>Run it:</P>
      <Code label="terminal">{`wm build`}</Code>
      <P>
        That's it. The same command is now available from the CLI, the{" "}
        <a
          href="#vscode"
          className="text-accent-deep dark:text-accent underline underline-offset-2"
        >
          VS Code dashboard
        </a>
        , and as an{" "}
        <a href="#mcp" className="text-accent-deep dark:text-accent underline underline-offset-2">
          MCP tool
        </a>{" "}
        for AI agents.
      </P>
    </Section>
  );
}

function Commands() {
  return (
    <Section id="commands" title="Commands">
      <P>
        Commands live in <C>.wm/commands/</C>. Subdirectories create groups — <C>art/sprites.ts</C>{" "}
        becomes the <C>art:sprites</C> command.
      </P>
      <P>
        Commands are defined with <C>cmd()</C> from <C>@ldlework/workmark/define</C>. Use{" "}
        <C>args</C> for positional arguments and <C>flags</C> for named boolean/value options.
      </P>
      <Code label=".wm/commands/sprites.ts">{`/** Pack sprite sheets from raw assets */
import { cmd } from "@ldlework/workmark/define";
import { z } from "zod";

export default cmd({
  args: {
    target: z.enum(["all", "characters", "terrain"]).default("all"),
  },
  flags: {
    watch: z.boolean().default(false),
  },
  handler: ({ target, watch }) =>
    \`./tools/pack.sh \${target}\${watch ? " --watch" : ""}\`,
});`}</Code>
      <P>
        Fields are defined with <a href="https://zod.dev" target="_blank" rel="noreferrer" className="text-accent-deep dark:text-accent underline underline-offset-2">zod</a> schemas.
        Workmark derives CLI parsing, VS Code form fields, and MCP tool schemas all from the same
        definition.
      </P>
      <H3>Handler return values</H3>
      <P>The handler can return:</P>
      <ul className="list-disc list-inside space-y-1 opacity-80 ml-2">
        <li>
          <C>string</C> — executed as a shell command in the workspace root
        </li>
        <li>
          <C>CallToolResult</C> — returned directly (for custom output or error handling)
        </li>
      </ul>
      <H3>Metadata</H3>
      <P>
        Command name and label are derived from the filename. Override them or add a description
        explicitly:
      </P>
      <Code>{`export default cmd({
  name: "my-cmd",
  label: "My Command",
  description: "Does the thing",
  handler: () => "echo hi",
});`}</Code>
      <P>
        Alternatively, a leading JSDoc comment before <C>export default</C> is used as the
        description automatically.
      </P>
    </Section>
  );
}

function Projects() {
  return (
    <Section id="projects" title="Projects">
      <P>
        For monorepos, drop a <C>wm.ts</C> in any package directory to register it as a project.
        Workmark recursively discovers all <C>wm.ts</C> files from the workspace root.
      </P>
      <Code label="packages/api/wm.ts">{`import { defineProject } from "@ldlework/workmark/define";

export default defineProject({
  name: "api",
  tags: ["backend"],
  capabilities: { deploy: true },
});`}</Code>
      <P>Commands access projects via the workspace object passed to dynamic commands:</P>
      <ul className="list-disc list-inside space-y-1 opacity-80 ml-2">
        <li>
          <C>workspace.get("api")</C> — by name
        </li>
        <li>
          <C>workspace.withTag("backend")</C> — by tag
        </li>
        <li>
          <C>workspace.withCapability("deploy")</C> — by capability
        </li>
      </ul>
      <H3>Capabilities</H3>
      <P>
        Capabilities are structured metadata that advertise what a project supports. Commands filter
        by capability so project-specific config stays out of command files.
      </P>
      <Code>{`export default defineProject({
  name: "api",
  capabilities: {
    deploy: true,
    build: { targets: ["esm", "cjs"] },
  },
});`}</Code>
      <P>
        Read structured capability data in a command with{" "}
        <C>{'project.capability<{ targets: string[] }>("build")'}</C>.
      </P>
    </Section>
  );
}

function DynamicCommands() {
  return (
    <Section id="dynamic-commands" title="Dynamic Commands">
      <P>
        A dynamic command receives the workspace at load time and builds its schema from what's
        present. This lets argument enums reflect exactly which projects exist — no impossible
        combinations, no extra validation.
      </P>
      <Code label=".wm/commands/deploy.ts">{`/** Deploy a project */
import { z } from "zod";
import type { DynamicCommandDef } from "@ldlework/workmark/types";

export default {
  factory: (workspace) => {
    const names = workspace
      .withCapability("deploy")
      .map((p) => p.name);

    return {
      args: {
        project: z.enum(names as [string, ...string[]]),
      },
      handler: ({ project }) => {
        const p = workspace.get(project as string);
        return \`./scripts/deploy.sh \${p.name}\`;
      },
    };
  },
} satisfies DynamicCommandDef;`}</Code>
      <P>
        The CLI help, VS Code dropdowns, and MCP tool schema all reflect the live set of project
        names. Add a new project, and <C>wm deploy</C> picks it up immediately — no code changes.
      </P>
    </Section>
  );
}

function CliSection() {
  return (
    <Section id="cli" title="CLI">
      <P>
        The <C>wm</C> binary is available after install. It auto-discovers commands from{" "}
        <C>.wm/commands/</C> and generates help, argument parsing, and type coercion.
      </P>
      <Code label="terminal">{`$ wm --help

Usage: wm <command> [args...]

Commands:
  build           Build the project
  sprites         Pack sprite sheets from raw assets
  deploy          Deploy a project

Run wm <command> --help for details.`}</Code>
      <H3>Argument forms</H3>
      <P>
        All <C>args</C> fields work as positional arguments. All fields (args and flags) also work
        as named flags:
      </P>
      <Code label="terminal">{`wm sprites                         # positional default
wm sprites characters              # positional arg
wm sprites characters --watch      # positional + flag
wm deploy api                      # dynamic command
wm deploy --project api            # same, named form
wm sprites --target terrain        # args work as flags too`}</Code>
      <H3>Array flags</H3>
      <P>
        Fields typed as <C>z.array(...)</C> accumulate repeated flags:
      </P>
      <Code label="terminal">{`wm tag --tags frontend --tags shared`}</Code>
    </Section>
  );
}

function VsCodeSection() {
  return (
    <Section id="vscode" eyebrow="Extension" title="VS Code Dashboard">
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
        extension to get a Workspace panel in the activity bar. It shows all commands grouped by
        directory with auto-generated forms.
      </P>
      <ul className="list-disc list-inside space-y-1 opacity-80 ml-2">
        <li>Enum fields → dropdowns with only valid choices</li>
        <li>Booleans → checkboxes</li>
        <li>Numbers → validated inputs with min/max</li>
        <li>Required fields enforced before execution</li>
        <li>Double-click any command to open its source file</li>
      </ul>
      <P>Commands run in the integrated terminal — full color output and interactivity.</P>
      <H3>Install</H3>
      <Code label="terminal">{`# Via VS Code Marketplace
code --install-extension ldlework.workmark-vsc

# Or search "workmark" in the Extensions panel`}</Code>
    </Section>
  );
}

function McpSection() {
  return (
    <Section id="mcp" eyebrow="AI integration" title="MCP / AI Agents">
      <P>
        Workmark includes a built-in{" "}
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noreferrer"
          className="text-accent-deep dark:text-accent underline underline-offset-2"
        >
          Model Context Protocol
        </a>{" "}
        server. Every command is automatically exposed as an MCP tool — AI assistants discover and
        invoke your workspace the same way you do.
      </P>
      <H3>Configure your MCP client</H3>
      <P>Add workmark to your MCP client config (Claude Desktop, Cursor, etc.):</P>
      <Code label=".mcp.json">{`{
  "mcpServers": {
    "workspace": {
      "command": "node",
      "args": ["./node_modules/@ldlework/workmark/dist/index.js"]
    }
  }
}`}</Code>
      <P>
        Once connected, the assistant sees all your commands as tools with typed schemas — including
        dynamic enums from project discovery. No separate server to maintain or deploy.
      </P>
      <H3>What AI agents can do</H3>
      <P>An agent connected to your workspace can:</P>
      <ul className="list-disc list-inside space-y-1 opacity-80 ml-2">
        <li>List all available commands and their descriptions</li>
        <li>Invoke commands with validated arguments</li>
        <li>
          Chain commands — build, then deploy, then notify — without leaving the conversation
        </li>
        <li>Use dynamic enums to pick from the actual set of projects in your repo</li>
      </ul>
    </Section>
  );
}

function StructureSection() {
  return (
    <Section id="structure" title="Project Structure">
      <Code>{`your-workspace/
├── .wm/
│   └── commands/
│       ├── build.ts          # wm build
│       ├── deploy.ts         # wm deploy (dynamic)
│       ├── art/
│       │   └── sprites.ts    # wm art:sprites
│       └── db/
│           └── migrate.ts    # wm db:migrate
├── packages/
│   ├── api/
│   │   └── wm.ts             # project definition
│   └── web/
│       └── wm.ts             # project definition
├── wm.ts                     # optional: root project definition
└── package.json`}</Code>
      <ul className="list-disc list-inside space-y-1 opacity-80 ml-2 mt-4">
        <li>
          <C>.wm/commands/</C> — command files, grouped by directory
        </li>
        <li>
          <C>wm.ts</C> (anywhere) — project definitions, discovered recursively
        </li>
        <li>
          Subdirectory names become group prefixes in CLI, dashboard, and MCP tool names
        </li>
      </ul>
    </Section>
  );
}

function ApiSection() {
  return (
    <Section id="api" title="API Reference">
      <H3>define</H3>
      <Code>{`import { cmd, defineCommand, defineProject, dynamicCmd } from "@ldlework/workmark/define";

cmd(def)           // Static command — shorthand, preferred
defineCommand(def) // Alias for cmd()
dynamicCmd(def)    // Dynamic command — satisfies + type inference helper
defineProject(def) // Project definition`}</Code>

      <H3>helpers</H3>
      <Code>{`import { ok, fail, exec, execAsync, execRaw, execAsyncRaw } from "@ldlework/workmark/helpers";

ok(data)                      // Wrap data in a success CallToolResult
fail(error)                   // Wrap error in an error CallToolResult
exec(cmd, { cwd })            // Sync shell exec → CallToolResult
execAsync(cmd, { cwd })       // Async shell exec → Promise<CallToolResult>
execRaw(cmd, { cwd })         // Sync shell exec → string (throws on error)
execAsyncRaw(cmd, { cwd })    // Async shell exec → Promise<string> (throws)`}</Code>

      <H3>types</H3>
      <Code>{`import type {
  StaticCommandDef,   // { args?, flags?, handler, name?, label?, description? }
  DynamicCommandDef,  // { factory: (workspace) => StaticCommandDef }
  CommandDef,         // StaticCommandDef | DynamicCommandDef
  HandlerReturn,      // string | CallToolResult
  ResolvedCommand,    // post-load, with resolved handler
} from "@ldlework/workmark/types";`}</Code>

      <H3>Loading (advanced)</H3>
      <Code>{`import { loadWorkspace } from "@ldlework/workmark/workspace";
import { loadCommands } from "@ldlework/workmark";

const workspace = await loadWorkspace();
const commands = await loadCommands(workspace);`}</Code>
    </Section>
  );
}
