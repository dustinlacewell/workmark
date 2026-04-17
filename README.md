# workmark

Most workspaces accumulate a graveyard of shell scripts, Makefiles, npm scripts, and "just run this" tribal knowledge. Workmark lets you define these workspace operations in TypeScript and run them from:

- **CLI** — the `wm` command, with auto-generated help and argument parsing
- **VS Code** — a dashboard extension with auto-generated forms for every command/parameter
- **AI Agents** — a built-in MCP server so any MCP client can discover and run your commands

<div align="center">
<image src="screenshot.png" alt="Workmark VS Code extension screenshot" width="auto" />
</div>

## Quick start

### Install

```bash
pnpm add @ldlework/workmark
```

### Write a command

Create commands in `.wm/commands/`. Subdirectories become groups in the CLI, dashboard and MCP server.

```ts
// .wm/commands/art/sprites.ts
import { exec } from "@ldlework/workmark/helpers";
import { z } from "zod";
import type { CommandDef } from "@ldlework/workmark/types";

export default {
  name: "sprites",
  label: "Build Sprites",
  description: "Pack sprite sheets from raw assets",
  args: {
    target: z.enum(["all", "characters", "terrain", "ui"]).default("all"),
  },
  flags: {
    watch: z.boolean().default(false),
  },
  handler: async ({ target, watch }) => {
    const cmd = `./tools/pack-sprites.sh ${target}${watch ? " --watch" : ""}`;
    return exec(cmd, { cwd: process.cwd() });
  },
} satisfies CommandDef;
```

### Run it

```bash
wm sprites                      # pack all sprite sheets
wm sprites characters --watch   # pack characters, rebuild on change
wm --help                       # list all commands
wm sprites --help               # per-command help
```

## Projects

If your workspace contains multiple packages or services, you can define **projects** so that commands can discover and operate on them. Drop a `wm.ts` in any project directory:

```ts
// packages/api/wm.ts
import { defineProject } from "@ldlework/workmark/define";

export default defineProject({
  name: "api",
  tags: ["backend"],
});
```

```ts
// packages/web/wm.ts
import { defineProject } from "@ldlework/workmark/define";

export default defineProject({
  name: "web",
  tags: ["frontend"],
});
```

Workmark recursively discovers all `wm.ts` files from the workspace root (respecting `.gitignore`). Projects are available to commands via the workspace object — query them by name with `workspace.get("api")`, by tag with `workspace.withTag("backend")`, or by capability with `workspace.withCapability("deploy")`.

### Capabilities

Capabilities are structured metadata attached to projects. A project declares what it supports, and commands filter by it — this keeps project-specific config out of your command files. For example, marking a project with `deploy: true` advertises that it has the `scripts/deploy.sh` script that the `deploy` command expects.

```ts
// packages/api/wm.ts
export default defineProject({
  name: "api",
  tags: ["backend"],
  capabilities: { deploy: true },
});
```

```ts
// packages/web/wm.ts
export default defineProject({
  name: "web",
  tags: ["frontend"],
  capabilities: { deploy: true },
});
```

`workspace.withCapability("deploy")` returns both projects. Capabilities can also carry structured data:

```ts
export default defineProject({
  name: "api",
  capabilities: {
    deploy: true,
    build: { targets: ["esm", "cjs"] },
  },
});
```

Commands read this with `project.capability<{ targets: string[] }>("build")`. This pattern works for anything — build targets, test runners, linting rules.

### Dynamic commands

A **dynamic command** receives the workspace and builds its schema from project metadata. Here, the `deploy` command finds all projects with the `deploy` capability and populates its argument from their names:

```ts
// .wm/commands/deploy.ts
import { exec } from "@ldlework/workmark/helpers";
import { z } from "zod";
import type { DynamicCommandDef } from "@ldlework/workmark/types";

export default {
  name: "deploy",
  label: "Deploy",
  description: "Deploy a project",
  factory: (workspace) => {
    const projects = workspace.withCapability("deploy");
    const names = projects.map((p) => p.name);

    return {
      args: {
        project: z.enum(names as [string, ...string[]]),
      },
      handler: async ({ project }) => {
        const p = workspace.get(project as string);
        return exec(`./scripts/deploy.sh`, { cwd: p.dir });
      },
    };
  },
} satisfies DynamicCommandDef;
```

```bash
wm deploy api
wm deploy web
```

The CLI help, VS Code dropdowns, and MCP tool schema all show exactly the valid project names — no impossible combinations, no runtime validation needed.

## Features

### CLI

The `wm` binary auto-discovers your commands and generates help text, argument parsing, and type coercion.

```
$ wm --help

Usage: wm <command> [args...]

Commands:
  sprites         Pack sprite sheets from raw assets
  deploy          Deploy a project to an environment
  db:migrate      Run database migrations

Run wm <command> --help for details on a specific command.
```

Arguments support positional args and named flags:

```bash
wm sprites characters              # positional (from args)
wm sprites characters --watch      # positional + flag
wm deploy api                      # dynamic command with project arg
wm deploy --project api            # everything works as flags too
```

### VS Code dashboard

Install the extension from a [release](https://github.com/dustinlacewell/workmark/releases) `.vsix` file:

```bash
code --install-extension workmark-vsc-1.1.0.vsix
```

The `workmark-vsc` extension adds a **Workspace** panel to the activity bar. It showm all your commands grouped by category with auto-generated forms:

- Enum fields become dropdowns
- Booleans become checkboxes
- Numbers get validated inputs with min/max
- Required fields are enforced before execution
- Double-click any command to jump to its source file

Commands run in the integrated terminal, so you get full color output and interactivity.

### MCP server

Workmark includes a built-in [Model Context Protocol](https://modelcontextprotocol.io) server. Every command you define is automatically exposed as an MCP tool, which means AI assistants like Claude can discover and invoke your workspace commands.

```jsonc
// claude_desktop_config.json or .mcp.json
{
  "mcpServers": {
    "workspace": {
      "command": "node",
      "args": ["./node_modules/@ldlework/workmark/dist/index.js"]
    }
  }
}
```

Once connected, your assistant can run `wm deploy api` the same way you do — with full schema validation and typed responses.

## Project structure

```
your-workspace/
├── .wm/
│   └── commands/
│       ├── deploy.ts         # Root-level command
│       ├── art/
│       │   └── sprites.ts    # Grouped under "Art"
│       └── db/
│           └── migrate.ts    # Grouped under "Db"
├── packages/
│   ├── api/
│   │   └── wm.ts             # Project definition
│   └── web/
│       └── wm.ts
```

- **`wm.ts`** — project definitions, discovered recursively
- **`.wm/commands/**/*.ts`** — command files, grouped by directory name

## API reference

### Defining

```ts
import { defineProject } from "@ldlework/workmark/define";
```

### Helpers

```ts
import { ok, fail, exec, execAsync } from "@ldlework/workmark/helpers";

ok(data)                     // Wrap data in a success CallToolResult
fail(error)                  // Wrap error in an error CallToolResult
exec(cmd, { cwd })           // Synchronous shell exec, returns CallToolResult
execAsync(cmd, { cwd })      // Async shell exec, returns Promise<CallToolResult>
execRaw(cmd, { cwd })        // Synchronous shell exec, returns string (throwm on error)
execAsyncRaw(cmd, { cwd })   // Async shell exec, returns Promise<string> (throwm on error)
```

### Loading

```ts
import { loadWorkspace } from "@ldlework/workmark/workspace";
import { loadCommands } from "@ldlework/workmark";

const workspace = await loadWorkspace();
const commands = await loadCommands(workspace);
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

The monorepo contains two packages:

| Package | Description |
|---|---|
| `@ldlework/workmark` | Core framework, CLI, and MCP server |
| `@ldlework/workmark-vsc` | VS Code extension (Workspace Dashboard) |

## License

MIT
