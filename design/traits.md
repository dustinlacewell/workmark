# Workmark: Traits, Handlers, and the Totalistic Design (v3)

*Iterated twice from six reviews (type-system, ergonomics, edge-cases, red-team, implementation feasibility, first-time-user simulation).*

> This is a **design spec**, not a tutorial. For hands-on introduction, see `packages/workmark/README.md`. Here we settle the invariants and the API shape.

**Elevator pitch**: workmark lets you declare your project's workspace operations once as typed TypeScript handlers, and run them from the `wm` CLI, a VS Code dashboard, or any MCP client (e.g. Claude). Projects can declare typed metadata (traits) that commands consume; the framework generates CLI args, VS Code forms, and MCP tool schemas from the same zod declarations.

---

## 1. Design principles

1. **One way to do each thing.** No ambiguity between primitives. Users know which tool to reach for.

2. **Types are honest end-to-end.** Handler args, context, traits, and project data are fully inferred — no casts, no `Record<string, unknown>` at the boundary.

3. **Framework absorbs repeated ceremony.** `Promise.allSettled`, cwd threading, aggregation, help-text scraping — if three commands share the shape, the framework owns it.

4. **Surfaces reflect the model.** CLI, VS Code, and MCP project the same primitives with the same semantics. Every field has the same meaning on every surface.

5. **No escape hatches that reintroduce primitives differently.** `fromWorkspace` is the only way to make schemas depend on workspace state.

6. **Files over config, with escape valves for packaging.** Discovery is filesystem-driven. Shared trait/command packages are a first-class concern.

7. **Framework injection lives in `ctx`, not `args`.** User-declared fields never collide with framework fields, now or ever.

8. **Load is atomic and transactional.** A load either fully succeeds or the prior valid state stays live. Registries are scoped to the load, not the process.

9. **Every shell invocation is explicit.** One helper, one rule. No implicit magic over `string` returns.

10. **Commands compose.** One command can invoke another; orchestration is a first-class concern.

---

## 2. The four primitives

| Primitive | Identity | Location |
|---|---|---|
| **Project** | `name` | `wm.ts` anywhere in the workspace |
| **Trait** | `name` (name-keyed, not object-identity) | `.wm/traits/**/*.ts` or npm packages |
| **Command** | resolved path | `.wm/commands/**/*.ts` or npm packages |
| **Handler** | — | inside a command; `(args, ctx) => CallToolResult` |

Subordinate concepts (not primitives, but first-class): `tags`, `has`, `needs`, `select`, `run`, `fromWorkspace`, `ctx.invoke`, `sh`, `exec`, `paths`.

---

## 3. Project

```ts
defineProject({
  name: string;
  dir?: string;                       // defaults to the wm.ts dir
  tags?: string[];                    // free-form labels; filter only, no injection
  paths?: Record<string, string>;     // per-project named directories
  has?: Record<string, unknown>;      // trait fulfillments; validated and parsed at load
  description?: string;
});
```

### `tags` — free-form labels, no schema

Filter only. `workspace.withTag(name)`. Never injected into handlers. Use when you want grouping without declaration.

### `paths` — per-project directory aliases

Not a trait (not a cross-project contract). Small per-project convenience. `project.path(name)` returns absolute path (`join(project.dir, relative)`). Used by commands that reference well-known directories.

### `has` — typed fulfillment

- Keys are trait names, values conform to the trait's zod schema.
- At load time, the framework **parses and stores the defaulted value**. `project.trait(t)` returns the typed, defaulted data.
- Unknown trait name → load error.
- Original user object is frozen; framework exposes parsed data through `project.trait(t)`, not through mutation.

---

## 4. Trait

```ts
defineTrait({
  name: string;
  schema: z.ZodTypeAny;
  description?: string;
});
```

### Name-keyed identity, per-load scope

Trait identity is `name`. The framework maintains a **per-load registry** (not process-global). Each `loadWorkspace()` invocation creates a fresh registry; trait imports register into it; duplicate names within one load throw with both source paths. Previous loads' registries are GC-able.

This design:
- Survives `loadWorkspace()` reloads (no "already registered" error on the second load).
- Survives VS Code extension in-process hosting two workspaces — each load has its own registry.
- Supports traits shipped in npm packages: consumers re-export or import from the package; the framework's name-keyed lookup doesn't care about object identity.
- Makes `needs: [docker]` (imported) and `needs: ["docker"]` (string) equivalent in validity; the former adds compile-time typing, the latter accepts `unknown`.

### `defineTrait` signature

```ts
function defineTrait<N extends string, S extends z.ZodTypeAny>(
  def: { name: N; schema: S; description?: string }
): Trait<N, z.output<S>>;

interface Trait<N extends string, T> {
  readonly name: N;
  readonly schema: z.ZodTypeAny;
  readonly description?: string;
  readonly __brand?: ["trait", N, T];
}
```

### Marker traits

Trait with no config data: `schema: z.object({}).default({})`. Projects fulfill with `has: { extension: {} }`.

### Versioning and schema evolution

- **Non-breaking change** (adding an optional field, changing default): safe. Existing projects re-parse on load.
- **Breaking change** (adding a required field, changing existing field type): migration requires touching every project's `has`. Framework surfaces zod errors for each project.
- **Rename for breaking changes**: introduce `dockerV2` as a separate trait; projects opt-in by migrating their `has.docker` to `has.dockerV2`. Commands follow.
- No built-in versioning DSL. Zod unions (`z.union([v1, v2])`) work if the trait owner wants inline versioning.

---

## 5. Command

```ts
cmd({
  needs?: readonly Trait[];
  select?: "one" | "one-or-many" | "many" | "all";
  run?: {
    order?: "parallel" | "serial";
    concurrency?: number;
    stopOnFailure?: boolean;
    reduce?: (results: ProjectResult[]) => HandlerReturn;
  };
  args?: Record<string, ZodField>;
  flags?: Record<string, ZodField>;
  cwd?: "project" | "workspace" | ((ctx) => string);
  meta?: CommandMeta;
  handler: (args, ctx) => HandlerReturn | Promise<HandlerReturn>;
});
```

### `cmd()` is the single entry

`defineCommand` is a re-export alias for discovery. `dynamicCmd`, `DynamicCommandDef`, `factory` — deleted.

### `needs`

Array of trait objects (imported) or trait names (strings). Eligible projects fulfill all listed traits. Framework auto-generates a `project` arg in the CLI / form / MCP tool schema, typed from `needs` and `select`.

### `select` — how many projects the user picks

- `"one"` (default when `needs` is non-empty) — single project name; handler runs once.
- `"one-or-many"` — user picks one or multiple; handler runs per selected project.
- `"many"` — user must pick ≥2; handler runs per.
- `"all"` — no user choice; handler runs on every eligible project.
- Omit `needs` AND omit `select` → handler runs once with no `ctx.project`.

For all multi-target shapes (`one-or-many`, `many`, `all`), handler is invoked once per selected project; `ctx.project` and `ctx.traits` are the *current* project's values.

### `run` — how the framework executes multi-target commands

- `order: "parallel"` (default) — concurrent with `concurrency` cap (default 4).
- `order: "serial"` — one at a time in eligible order (filesystem scan order, stable).
- `stopOnFailure: true` — on first failed project, cancel remaining; partial results reported.
- `reduce: (results) => HandlerReturn` — custom aggregation instead of the framework's default buffered-with-separators output.

`run` has no effect when `select` resolves to a single invocation.

### `args` vs `flags`

- `args`: positional-eligible, declaration order = positional slot.
- `flags`: named only.
- The auto-generated `project` arg is framework-managed, appearing as the first positional on CLI; it is not in `args`.

### Handler signature — fully typed

```ts
type Ctx<N extends readonly Trait<any, any>[], S extends SelectMode> =
  & (N extends readonly []
    ? { workspace: Workspace; exec: ExecFn; sh: ShFn; ok; fail; invoke: InvokeFn }
    : {
        project: Project;
        traits: { [K in N[number] as K['name']]: K extends Trait<any, infer T> ? T : never };
        workspace: Workspace; exec: ExecFn; sh: ShFn; ok; fail; invoke: InvokeFn;
      });
```

```ts
export function cmd<
  const N extends readonly Trait<any, any>[] = readonly [],
  A extends Record<string, z.ZodTypeAny> = {},
  F extends Record<string, z.ZodTypeAny> = {},
>(def: {
  needs?: N;
  select?: SelectMode;
  run?: RunOptions;
  args?: A;
  flags?: F;
  cwd?: CwdRule<N>;
  meta?: CommandMeta;
  handler: (args: InferFields<A & F>, ctx: Ctx<N, S>) => HandlerReturn | Promise<HandlerReturn>;
}): StaticCommand<N, A, F>;
```

- `const N` preserves literal trait names.
- `z.output` for field inference.
- `args` has **zero framework-injected keys**. No reserved-name collisions, now or ever.

### Return contract — one path, explicit

Handler returns `CallToolResult | Promise<CallToolResult>`. **No string-as-shell sugar.** To run shell:

- `ctx.sh(cmd)` — shell exec in the command's resolved cwd; returns `CallToolResult`.
- `ctx.exec(cmd, opts)` — shell exec with explicit options.

One-liner:
```ts
handler: (_, { traits: { buildable }, sh }) => sh(buildable.command);
```

### `cwd` rules — explicit, not derived

- `cwd: "project"` — each invocation runs in its project's `dir`. Default when `needs` is non-empty.
- `cwd: "workspace"` — runs in workspace root. Default when `needs` is empty.
- `cwd: (ctx) => absolutePath` — custom resolver, e.g. `(ctx) => ctx.project.path("assets")`.
- Applies to `ctx.sh(cmd)` only. `ctx.exec` always takes explicit `{cwd}`.

---

## 6. `fromWorkspace` — the unified workspace-aware schema primitive

```ts
function fromWorkspace(
  fn: (ws: Workspace, ctx: ResolverCtx) => z.ZodTypeAny,
): z.ZodTypeAny;

interface ResolverCtx {
  project?: Project;                 // present when command has `needs` and we're in per-invocation resolution
  args: Record<string, unknown>;    // prior args parsed so far (for two-phase resolution)
}
```

- Load-time resolution: `ctx.project` and `ctx.args` are absent; framework resolves the schema once.
- Invocation-time resolution: framework runs a two-phase parse — args are resolved in declaration order; each arg's schema can reference earlier args via `ctx.args.<name>`. Used when a schema depends on another user-supplied value.
- Chainable through standard zod wrappers: `.array()`, `.optional()`, `.default()`, `.describe()`, `.refine()`. Framework unwraps via zod 4's `.unwrap()` chain, resolves the marker, re-wraps. Custom zod extensions without `.unwrap()` stop the walk; document this.

### Helpers

```ts
function projectsOf(trait: Trait): z.ZodTypeAny;          // enum of project names fulfilling the trait
function traitField(trait: Trait, selector: (data) => z.ZodTypeAny): {
  forProject(name: string): z.ZodTypeAny;                 // bound to a specific project (load-time)
  fromArg(argName: string): z.ZodTypeAny;                 // bound to the value of another arg (invocation-time)
};
```

### Examples

```ts
// enum of project names with a trait
flags: { target: projectsOf(docker) }
```

```ts
// enum derived from a specific project's data (load-time)
flags: {
  services: traitField(docker, d => z.enum(d.buildable))
    .forProject("ghost").array().optional(),
}
```

```ts
// enum derived from a *user-supplied* project (invocation-time)
args: { target: projectsOf(docker) }
flags: {
  services: traitField(docker, d => z.enum(d.buildable))
    .fromArg("target").array().optional(),
}
```

```ts
// inline custom resolver
flags: { stage: fromWorkspace((ws) => z.enum(ws.withTag("stage").map(p => p.name))) }
```

---

## 7. Context (`ctx`)

```ts
interface BaseCtx {
  workspace: Workspace;
  sh: (cmd: string) => Promise<CallToolResult>;              // uses resolved cwd
  exec: (cmd: string, opts: ExecOptions) => Promise<CallToolResult>;  // explicit
  ok: typeof ok;
  fail: typeof fail;
  invoke: InvokeFn;                                          // see §11
}

interface NeedsCtx<N> extends BaseCtx {
  project: Project;
  traits: { [K in N[number] as K['name']]: z.output<K['schema']> };
}
```

Nothing else. Env is `process.env`. Logging is the return value. Cancellation is deferred until a cross-surface story exists (documented trade-off).

---

## 8. Discovery and load

### Discovery paths

- **Workspace root**: walk up from cwd until a directory contains `.wm/` or `wm.ts`.
- **Projects**: all `wm.ts` files (gitignore-respecting).
- **Traits**: `.wm/traits/**/*.ts` + any trait modules imported transitively from commands.
- **Commands**: `.wm/commands/**/*.ts` + any command modules re-exported from npm packages (see §13).

### Phases (atomic)

1. **Fresh candidate state.** Allocate a new trait registry + empty project/command lists.
2. **Import traits.** Glob `.wm/traits/**/*.ts`; each `defineTrait` registers to the candidate registry. Duplicate name → error with both paths.
3. **Import projects.** All `wm.ts`. Each `defineProject` registers.
4. **Validate and parse `has`.** For each `project.has[k]`: look up trait; parse value; store parsed result. Unknown trait → error with available names.
5. **Import commands.** Glob `.wm/commands/**/*.ts`. Each `cmd()` returns a command definition.
6. **Resolve commands.** Verify `needs` references (name-keyed lookup); resolve `fromWorkspace` markers in `args`/`flags`; auto-generate project arg from `needs` + `select`; resolve meta.
7. **Commit.** Atomically swap the candidate state into the live workspace reference. On any earlier failure, candidate is discarded and the previous live state stays.

### Recursive command discovery

- `commands/foo.ts` → `foo`
- `commands/group/bar.ts` → `group:bar`
- `commands/group/sub/baz.ts` → `group:sub:baz`
- `commands/group/index.ts` → `group`
- Colon-containing filenames rejected.
- Duplicate resolved names rejected.

### Import topology

- Traits may import traits.
- Commands may import traits and other commands (for shared helpers or `ctx.invoke` typing).
- Traits must not import commands (enforced: trait file importing from `.wm/commands/**` fails load).

---

## 9. Surfaces — full MCP story

### CLI

- `wm <command> [project…] [args…] [--flags]` — auto-generated project arg first (when `needs` non-empty), then user `args`.
- `wm --help`: commands grouped by directory; descriptions from `meta.description` or JSDoc of default export.
- `wm <command> --help`: args, flags, defaults, required/optional, enum values. When enums come from `fromWorkspace`, the resolved set is shown.

### VS Code dashboard

- One form per command. Fields rendered from resolved zod.
- Project enums (including `projectsOf`) become dropdowns, annotated with `project.description` where available.
- Workspace reload refreshes forms; unsaved inputs are discarded with a diagnostic.

### MCP

**Tool naming**: command `docker:up` → tool `docker_up` (colons replaced with underscores). Configurable via `meta.mcp.toolName`.

**Tool description**: `meta.description` (explicit) → JSDoc on default export (fallback) → empty.

**Input schema**: JSON Schema derived from resolved zod. Enum values (including workspace-derived) are present in the schema. `project.description` fields flow into enum `description` annotations, giving the model context on what each project is for.

**Tool annotations** (per MCP's `ToolAnnotations`):

```ts
meta?: {
  mcp?: {
    toolName?: string;                // override command name mapping
    exposed?: boolean;                // default true; false hides from MCP
    destructiveHint?: boolean;        // MCP `destructiveHint`
    readOnlyHint?: boolean;           // MCP `readOnlyHint`
    idempotentHint?: boolean;         // MCP `idempotentHint`
    openWorldHint?: boolean;          // MCP `openWorldHint`
  };
};
```

Commands opt out of MCP exposure with `meta.mcp.exposed: false`. Teams restrict the AI surface by flipping this on individual commands.

**Results**:
- Single-target command: `CallToolResult` returned directly.
- Multi-target command: framework aggregates. `content` is human-readable (same format as CLI buffered output); `structuredContent` carries `{ results: [{ project, ok, output, error? }] }` for model reasoning.

**Errors**: framework returns `{ content: [{ type: "text", text: <formatted error> }], isError: true }`. Handler throws or returns `fail(err)`; both land as `isError: true` results — never stack traces.

**Long-running commands**: currently, MCP `tools/call` is request/response; the call blocks until the framework resolves. For commands taking >30s, the assistant sees a single result at the end. `notifications/progress` support is future work; documented as a known limitation.

**Schema freshness**: on workspace reload, server emits `notifications/tools/list_changed`. Clients with stale caches refresh; clients without caching observe the new schema on next `tools/list`.

### Example MCP tool (what Claude sees)

```json
{
  "name": "docker_up",
  "description": "Start a Docker stack.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "project": {
        "type": "string",
        "enum": ["ghost", "openfront"],
        "description": "Project to target"
      },
      "service": {
        "type": "string",
        "description": "Service (default: all)"
      }
    },
    "required": ["project"]
  },
  "annotations": {
    "destructiveHint": false,
    "idempotentHint": true
  }
}
```

---

## 10. Multi-target semantics

When `select` is `"one-or-many"`, `"many"`, or `"all"`:

- **Selection**:
  - `"one-or-many"`: user may specify 1+ project names; CLI `wm cmd api web`, flag `--project`, or none (defaults to the eligible set).
  - `"many"`: user must specify ≥2; error with eligible list otherwise.
  - `"all"`: framework auto-selects all eligible projects; user cannot specify.
- **Concurrency**: semaphore sized to `run.concurrency` (default 4).
- **Order**: `run.order` — `"parallel"` (default) or `"serial"`.
- **Failure**: by default, `Promise.allSettled` — all projects run; failures are isolated. `run.stopOnFailure: true` cancels remaining on first failure.
- **Aggregation**:
  - If `run.reduce` is provided, framework calls it with `[{ project, ok, output, error? }]` and returns its `CallToolResult`.
  - Else: framework produces buffered output with `--- <project> ---` separators on CLI; MCP receives the structured form.

### `run.reduce` example

```ts
// typecheck: filter noise and surface only distinct TS errors across projects
cmd({
  needs: [buildable],
  select: "all",
  run: {
    reduce: (results) => {
      const errors = results.flatMap(r => extractTsErrors(r.output ?? ""));
      const unique = dedupe(errors);
      return unique.length === 0 ? ok("clean") : fail(unique.join("\n"));
    },
  },
  handler: (_, { traits: { buildable }, sh }) => sh(`tsc --noEmit ${buildable.extra ?? ""}`),
});
```

---

## 11. Command composition

Commands invoke other commands via `ctx.invoke`:

```ts
type InvokeFn = <C extends ResolvedCommand>(
  command: C,
  args: InferInvokeArgs<C>,
) => Promise<CallToolResult>;
```

- `command` is an imported command object or a name string.
- `args` is the same shape the command's CLI/MCP caller would supply (with `project` field when needed).
- Framework resolves the command against the loaded registry, parses args through its schema, runs its handler with its own `ctx`, returns the result.

### Example

```ts
// .wm/commands/release.ts
import build from "./build.js";
import push from "./deploy/push.js";

/** Build then push. */
export default cmd({
  needs: [buildable, docker],
  handler: async (_, { project, invoke, fail }) => {
    const built = await invoke(build, { project: project.name });
    if (built.isError) return fail(`build failed for ${project.name}`);
    return invoke(push, { project: project.name });
  },
});
```

### Composition rules

- Callee runs with its own `ctx` (workspace, helpers) but **its own project/traits resolved from the passed args** — the caller cannot force a mismatched `ctx.project`.
- Callee's `meta.mcp.exposed: false` commands are still invokable by `ctx.invoke` — MCP exposure is about external clients, not internal composition.
- Cyclic invocations detected at runtime (framework maintains an invocation stack; cycle → error).

---

## 12. Error messages as spec

Representative failures and exact shape:

```
Project "ghost" has.docker: composeFiles: expected array, got string
  at sites/ghost/wm.ts
  hint: composeFiles is z.array(z.string())

Project "ghost" declares has.unknownTrait, but no trait "unknownTrait" is defined
  at sites/ghost/wm.ts
  known traits: docker, buildable, browserExtension

Trait "docker" defined twice in this load:
  .wm/traits/docker.ts
  node_modules/@workmark/docker/traits/docker.ts

Command "deploy:ghost" traitField(docker).forProject("goast") — project "goast" does not exist
  at .wm/commands/deploy/ghost.ts
  available projects: ghost, api, web

Command "build" select "many" invoked with 1 project; requires ≥2
  selected: api
  eligible: api, web, worker

Command "docker:up" field "project" collides with framework-injected ctx.project
  at .wm/commands/docker/up.ts
  hint: rename the field; ctx.project is always present under needs

Load failed: workspace still on previous state (3 commands, 2 traits).
  see diagnostics for the specific failure.

Command "release" cyclic invocation: release → deploy → release
  at runtime
```

MCP surfaces errors via `{ isError: true, content: [...] }` — never stack traces.

---

## 13. Sharing and versioning

### Traits and commands in npm packages

- A package may export traits from its own `.wm/traits/*.ts` equivalent, OR as named exports from its entry (`export { docker } from "./traits/docker.js"`).
- A workspace imports them in its own `.wm/traits/index.ts` or directly from command files.
- Name-keyed registry allows two packages to declare traits with different names. Two packages declaring the same name is a load error (both paths reported).
- Commands ship the same way: package exports command objects; workspace re-exports from `.wm/commands/shared/up.ts` (etc.) or imports directly.
- Future: a `wm.config.ts` `plugins: string[]` pulls in packages by name automatically; until then, explicit re-export.

### Versioning schemas

- Non-breaking additions (optional field, default value): safe, no migration.
- Breaking changes: rename (`docker` → `dockerV2`), migrate projects incrementally, delete old trait once fully migrated.
- No built-in schema-version machinery. Zod unions suffice for inline v1/v2 compatibility when needed.

### Migration across the team

- Framework emits clear zod errors for every non-conforming `has`. Migration surface is mechanical.
- Trait rename is a single find-replace + `has.<old>` → `has.<new>` in every project.

---

## 14. Invariants

1. **Atomic load.** Full success or previous state stays live.
2. **Parsed `has`.** `project.has` values are always the zod-parsed, defaulted form after load.
3. **Name-keyed trait registry.** Duplicate names within one load fail.
4. **Per-load scope.** Registries are allocated fresh per load; no process-global state.
5. **`ctx` is the framework's injection surface.** `args` is strictly user-declared.
6. **Explicit cwd.** Cwd rules are documented and per-command; `ctx.sh` uses them, `ctx.exec` requires explicit opts.
7. **Transactional reload.** Watch mode and MCP reloads are atomic.
8. **MCP list_changed on swap.** Tool lists stay coherent with workspace state.
9. **Non-empty select.** `"many"` requires ≥2; `"one-or-many"` with 0 → error.
10. **No silent dynamism.** Load-time vs invocation-time `fromWorkspace` resolution is explicit per-field.
11. **One shell path.** `ctx.sh` or `ctx.exec`; no string-as-shell sugar.
12. **Composition via `ctx.invoke`.** One way, cycle-detected.

---

## 15. Migration from the current shape

| Current | New |
|---|---|
| `capabilities: { x: true }` | `tags: ["x"]` |
| `capabilities: { x: {...data} }` | `has: { x: {...data} }` + trait file |
| `workspace.withCapability("x")` | `workspace.withTrait(x)` or `withTag("x")` |
| `project.capability<T>("x")` | `ctx.traits.x` or `project.trait(x)` |
| `DynamicCommandDef` / `factory` | `needs` + `fromWorkspace` / `projectsOf` / `traitField` |
| `satisfies DynamicCommandDef` | just `export default cmd({...})` |
| `Array.isArray(args.x) ? ...` | `select: "one-or-many"` |
| Manual `Promise.allSettled` | `select` + `run` |
| Custom aggregation | `run.reduce` |
| `args.foo as string` | Typed via `cmd()` generics |
| Returning string from handler | `ctx.sh(cmd)` or `ctx.exec(cmd, opts)` |
| `paths` usage | unchanged |

---

## 16. Worked examples

### Ghost / Docker

```ts
// .wm/traits/docker.ts
/** Projects with a Docker Compose stack. */
export const docker = defineTrait({
  name: "docker",
  schema: z.object({
    composeFiles: z.array(z.string()),
    project: z.string(),
    buildable: z.array(z.string()).default([]),
    containers: z.array(z.string()).default([]),
  }),
});
```

```ts
// sites/ghost/wm.ts
export default defineProject({
  name: "ghost",
  paths: { theme: "data/ghost/themes/source" },
  has: {
    docker: {
      composeFiles: ["docker-compose.yml"],
      project: "ghost",
      buildable: ["download-guard", "discord-connect"],
    },
  },
});
```

```ts
// .wm/commands/docker/up.ts
/** Start a Docker stack. */
export default cmd({
  needs: [docker],
  flags: { service: z.string().optional() },
  handler: ({ service }, { traits: { docker }, sh }) =>
    sh(composeCmd(docker, service ? `up -d ${service}` : "up -d")),
});
```

### Typecheck — one, some, or all

```ts
// .wm/commands/typecheck.ts
/** Type-check projects. */
export default cmd({
  needs: [buildable],
  select: "one-or-many",
  run: {
    reduce: (results) => {
      const errs = results.filter(r => !r.ok);
      return errs.length === 0 ? ok("all clean") : fail(formatDiagnostics(errs));
    },
  },
  handler: (_, { traits: { buildable }, sh }) => sh(buildable.typecheckCommand),
});
```

### Deploy — compose build + push

```ts
// .wm/commands/deploy.ts
import build from "./build.js";
import push from "./docker/push.js";

/** Build and push. */
export default cmd({
  needs: [buildable, docker],
  handler: async (_, { project, invoke, fail }) => {
    const built = await invoke(build, { project: project.name });
    if (built.isError) return fail(`build failed for ${project.name}`);
    return invoke(push, { project: project.name });
  },
  meta: { mcp: { destructiveHint: true, idempotentHint: true } },
});
```

### Chrome debug — no needs, workspace-aware flag

```ts
// .wm/commands/chrome/debug.ts
/** Launch Chrome with built extensions. */
export default cmd({
  flags: {
    url: z.string().default("https://openfront.io"),
    extensions: projectsOf(browserExtension).array().optional(),
  },
  handler: async ({ url, extensions }, { workspace }) => {
    const names = extensions ?? workspace.withTrait(browserExtension).map(p => p.name);
    // spawn chrome with --load-extension
  },
  meta: { mcp: { exposed: false } },  // local-only; don't expose to AI
});
```

### Deploy with invocation-time trait-field

```ts
// .wm/commands/deploy/rebuild.ts
/** Rebuild specific services on any docker project. */
export default cmd({
  needs: [docker],
  select: "one",
  args: {
    // project arg is auto-generated from needs
  },
  flags: {
    services: traitField(docker, d => z.enum(d.buildable))
      .fromArg("project").array().optional(),
    noCache: z.boolean().default(false),
  },
  handler: async ({ services, noCache }, { project, traits: { docker }, sh }) => {
    const svcs = services ?? docker.buildable;
    // rebuild each, then up -d
  },
});
```

---

## 17. Remaining decisions

1. **`defineProject` opt-in generic for compile-time `has` typing.** Nice-to-have for power users; default stays light.
2. **`wm.config.ts` for plugins.** Not required for core; add when cross-workspace sharing becomes common.
3. **MCP `notifications/progress` for long-running commands.** Future; documented as a limitation.
4. **AbortSignal / cancellation.** Future; deferred until cross-surface story lands.
5. **Windows path quoting guidance.** Document in README, not design: use cwd + relative paths; don't interpolate absolute paths into shell strings.

---

## 18. What success looks like

- Every factory in openfront-workspace disappears.
- Every `capability()` call disappears.
- Every `Array.isArray` on args disappears.
- Every hand-rolled `Promise.allSettled` in a handler disappears (framework handles it via `select` + `run`).
- Every `args.foo as string` disappears.
- The handler's args, context, traits, and project are fully typed without casts, module augmentation, or codegen.
- CLI, VS Code, and MCP surfaces stay coherent through transactional reloads.
- Commands compose via `ctx.invoke`; orchestration is a named primitive.
- Commands opt out of AI exposure with one flag; teams control the MCP surface.
- The MCP schema a model sees matches the types the handler receives — trait data is present in enum hints, project descriptions flow through, error messages are structured.

Workmark becomes: **declare projects, declare traits, write typed handlers that run in three surfaces and compose with each other, without leaving strict typing or coherent semantics.**
