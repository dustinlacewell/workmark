import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { createJiti } from "jiti";
import { z } from "zod";
import { execAsync, ok, fail, shSeq } from "./helpers.js";
import type {
  BaseCtx,
  HandlerReturn,
  IProject,
  IWorkspace,
  NeedsCtx,
  ProjectResult,
  ResolvedCommand,
  ResolvedHandler,
  RunOptions,
  SchemaFields,
  SelectMode,
  Trait,
} from "./types.js";
import { FROM_WORKSPACE } from "./types.js";
import type { StaticCommandDef } from "./define.js";
import type { Workspace } from "./workspace.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { jitiOptions } from "./jiti-options.js";

// --- Metadata derivation -------------------------------------------------

function titleCase(s: string): string {
  return s
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractLeadingJsDoc(source: string): string | undefined {
  const exportIdx = source.indexOf("export default");
  const before = exportIdx < 0 ? source : source.slice(0, exportIdx);
  const blocks = [...before.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
  if (blocks.length === 0) return undefined;
  const last = blocks[blocks.length - 1][1];
  return last
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trimEnd())
    .join(" ")
    .trim() || undefined;
}

interface DerivedMeta {
  name: string;
  label: string;
  description: string;
}

function deriveMetadata(def: StaticCommandDef, sourceFile: string): DerivedMeta {
  const filenameName = basename(sourceFile, extname(sourceFile));
  const meta = def.meta ?? {};
  const name = meta.name ?? filenameName;
  const label = meta.label ?? titleCase(name);
  const description =
    meta.description ?? extractLeadingJsDoc(readFileSync(sourceFile, "utf-8")) ?? "";
  return { name, label, description };
}

// --- fromWorkspace resolution --------------------------------------------

type FromWsMarker = { [FROM_WORKSPACE]?: (ws: IWorkspace) => z.ZodType };

function resolveFromWorkspace(field: z.ZodType | Record<string, unknown>, ws: IWorkspace): z.ZodType | Record<string, unknown> {
  if (!(field instanceof z.ZodType)) return field;
  return walk(field, ws);
}

function walk(node: z.ZodType, ws: IWorkspace): z.ZodType {
  const marked = (node as unknown as FromWsMarker)[FROM_WORKSPACE];
  if (marked) return marked(ws);

  // Walk into common wrappers, resolve inner, rewrap.
  if (node instanceof z.ZodOptional) return walk(node.unwrap() as unknown as z.ZodType, ws).optional();
  if (node instanceof z.ZodNullable) return walk(node.unwrap() as unknown as z.ZodType, ws).nullable();
  if (node instanceof z.ZodDefault) {
    const def = (node._def as { defaultValue: unknown }).defaultValue;
    return walk(node.unwrap() as unknown as z.ZodType, ws).default(def as never);
  }
  if (node instanceof z.ZodArray) {
    return z.array(walk(node.element as unknown as z.ZodType, ws));
  }
  return node;
}

function resolveFields(fields: SchemaFields | undefined, ws: IWorkspace): SchemaFields | undefined {
  if (!fields) return fields;
  const out: SchemaFields = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = resolveFromWorkspace(v, ws);
  }
  return out;
}

// --- Schema merging + project-arg synthesis ------------------------------

function fieldToJsonSchema(field: z.ZodType | Record<string, unknown>): Record<string, unknown> {
  if (field instanceof z.ZodType) {
    return z.toJSONSchema(field) as Record<string, unknown>;
  }
  return field;
}

function isRequired(field: z.ZodType | Record<string, unknown>, schema: Record<string, unknown>): boolean {
  if ("default" in schema) return false;
  if (field instanceof z.ZodType && field.safeParse(undefined).success) return false;
  return true;
}

interface BuiltSchema {
  inputSchema: Record<string, unknown>;
  positional: string[];
  projectArgName: string | null;
}

function projectArgFor(
  needs: readonly Trait[],
  select: SelectMode,
  workspace: IWorkspace,
): { schema: z.ZodType; required: boolean; eligible: string[] } | null {
  if (needs.length === 0) return null;
  if (select === "all") return null; // framework selects; no user input

  const eligible = workspace.projects
    .filter((p) => needs.every((t) => p.hasTrait(t)))
    .map((p) => p.name);
  if (eligible.length === 0) {
    const traits = needs.map((t) => t.name).join(", ");
    throw new Error(
      `Command requires needs [${traits}] but no projects fulfill all of them`,
    );
  }
  const enum_ = z.enum(eligible as [string, ...string[]]);
  if (select === "one-or-many") {
    // accept string or array; we'll coerce at parse time
    return { schema: z.union([enum_, z.array(enum_)]), required: false, eligible };
  }
  return { schema: enum_, required: true, eligible };
}

function buildSchema(
  args: SchemaFields | undefined,
  flags: SchemaFields | undefined,
  projectArg: { schema: z.ZodType; required: boolean } | null,
): BuiltSchema {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  const positional: string[] = [];
  let projectArgName: string | null = null;

  if (projectArg) {
    projectArgName = "project";
    properties.project = fieldToJsonSchema(projectArg.schema);
    positional.push("project");
    if (projectArg.required) required.push("project");
  }

  const collect = (src: SchemaFields | undefined, isPositional: boolean) => {
    if (!src) return;
    for (const [name, field] of Object.entries(src)) {
      if (name === "project" && projectArgName) {
        throw new Error(
          `Command declares arg/flag "project", but it is framework-reserved under needs`,
        );
      }
      const schema = fieldToJsonSchema(field);
      properties[name] = schema;
      if (isPositional) positional.push(name);
      if (isRequired(field, schema)) required.push(name);
    }
  };

  collect(args, true);
  collect(flags, false);

  const inputSchema: Record<string, unknown> = { type: "object", properties };
  if (required.length > 0) inputSchema.required = required;
  return { inputSchema, positional, projectArgName };
}

// --- Context construction ------------------------------------------------

/** Invocation host: looks up commands for ctx.invoke. Set during loadCommands. */
interface InvocationHost {
  invoke: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>;
}

function makeBaseCtx(
  ws: IWorkspace,
  cwdResolver: () => string,
  host: InvocationHost,
): BaseCtx {
  return {
    workspace: ws,
    ok,
    fail,
    sh: (cmd, opts) => {
      const options = { cwd: cwdResolver(), timeout: opts?.timeout, env: opts?.env };
      return Array.isArray(cmd)
        ? shSeq(cmd, options)
        : execAsync(cmd as string, options);
    },
    exec: (cmd, opts) => execAsync(cmd, opts),
    invoke: host.invoke,
  };
}

function makeNeedsCtx(
  ws: IWorkspace,
  project: IProject,
  needs: readonly Trait[],
  host: InvocationHost,
): NeedsCtx<Record<string, unknown>> {
  const traits: Record<string, unknown> = {};
  for (const t of needs) traits[t.name] = project.trait(t as Trait<string, unknown>);
  return {
    ...makeBaseCtx(ws, () => project.dir, host),
    project,
    traits,
  };
}

// --- Handler wrapping ----------------------------------------------------

function stripProjectArg(args: Record<string, unknown>): Record<string, unknown> {
  const { project: _drop, ...rest } = args;
  return rest;
}

function isCallToolResult(v: unknown): v is CallToolResult {
  return typeof v === "object" && v !== null && "content" in (v as object);
}

async function runHandler(
  raw: StaticCommandDef["handler"],
  args: Record<string, unknown>,
  ctx: BaseCtx | NeedsCtx<Record<string, unknown>>,
): Promise<CallToolResult> {
  try {
    const out = await raw(args, ctx);
    if (isCallToolResult(out)) return out;
    return { content: [{ type: "text", text: String(out) }] };
  } catch (e) {
    return fail(e);
  }
}

function resolveProjects(
  needs: readonly Trait[],
  select: SelectMode,
  workspace: IWorkspace,
  argsValue: unknown,
): IProject[] {
  const eligible = workspace.projects.filter((p) => needs.every((t) => p.hasTrait(t)));

  if (select === "all") return eligible;

  const names: string[] = Array.isArray(argsValue)
    ? (argsValue as string[])
    : typeof argsValue === "string"
      ? [argsValue]
      : [];

  if (names.length === 0) {
    if (select === "one") throw new Error(`Command requires a project name`);
    throw new Error(
      `Command requires at least one project. Eligible: ${eligible.map((p) => p.name).join(", ")}`,
    );
  }

  const resolved = names.map((n) => workspace.get(n));
  for (const p of resolved) {
    if (!needs.every((t) => p.hasTrait(t))) {
      throw new Error(`Project "${p.name}" does not fulfill all required traits`);
    }
  }
  return resolved;
}

async function runMultiple(
  raw: StaticCommandDef["handler"],
  args: Record<string, unknown>,
  projects: IProject[],
  needs: readonly Trait[],
  workspace: IWorkspace,
  run: RunOptions | undefined,
  host: InvocationHost,
): Promise<CallToolResult> {
  const callerArgs = stripProjectArg(args);

  const runOne = async (p: IProject): Promise<ProjectResult> => {
    const ctx = makeNeedsCtx(workspace, p, needs, host);
    const res = await runHandler(raw, callerArgs, ctx);
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
    return { project: p.name, ok: !res.isError, output: text, error: res.isError ? text : undefined };
  };

  // serial when requested; otherwise parallel with concurrency cap
  const serial = run?.order === "serial";
  const concurrency = serial ? 1 : (run?.concurrency ?? 4);
  const results: ProjectResult[] = new Array(projects.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, projects.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= projects.length) return;
      results[i] = await runOne(projects[i]);
      if (run?.stopOnFailure && !results[i].ok) {
        idx = projects.length;
        return;
      }
    }
  });
  await Promise.all(workers);

  const realResults = results.filter(Boolean);

  if (run?.reduce) {
    return run.reduce(realResults);
  }

  // default aggregation — if only one ran, return its output directly
  if (realResults.length === 1) {
    const r = realResults[0];
    return r.ok ? ok(r.output ?? "") : fail(r.error ?? r.output ?? "");
  }

  const parts: string[] = [];
  let anyError = false;
  for (const r of realResults) {
    parts.push(`--- ${r.project} ---\n${r.output ?? ""}`);
    if (!r.ok) anyError = true;
  }
  const text = parts.join("\n\n");
  return anyError ? fail(text) : ok(text);
}

// --- Main resolve --------------------------------------------------------

function resolve(
  def: StaticCommandDef,
  workspace: Workspace,
  group: string,
  sourceFile: string,
  host: InvocationHost,
): ResolvedCommand {
  const meta = deriveMetadata(def, sourceFile);
  const rawNeeds = def.needs ?? [];
  const needs: Trait[] = rawNeeds.map((t) =>
    typeof t === "string" ? workspace.traits.require(t) : t as Trait,
  );
  const select: SelectMode = def.select ?? (needs.length > 0 ? "one-or-many" : "one");

  if (needs.length === 0 && select !== "one") {
    throw new Error(`Command "${meta.name}": select requires needs (at ${sourceFile})`);
  }

  const resolvedArgs = resolveFields(def.args, workspace);
  const resolvedFlags = resolveFields(def.flags, workspace);

  const projectArg = projectArgFor(needs, select, workspace);
  const { inputSchema, positional } = buildSchema(resolvedArgs, resolvedFlags, projectArg);

  const handler: ResolvedHandler = async (args) => {
    if (needs.length === 0) {
      const ctx = makeBaseCtx(workspace, () => workspace.root, host);
      return runHandler(def.handler, args, ctx);
    }

    const projects = resolveProjects(needs, select, workspace, args.project);

    if (select === "one") {
      const ctx = makeNeedsCtx(workspace, projects[0], needs, host);
      return runHandler(def.handler, stripProjectArg(args), ctx);
    }

    return runMultiple(def.handler, args, projects, needs, workspace, def.run, host);
  };

  return {
    name: meta.name,
    label: meta.label,
    group,
    description: meta.description,
    inputSchema,
    positional,
    handler,
    sourceFile,
    select,
    needs: needs.map((t) => t.name),
  };
}

// --- Discovery -----------------------------------------------------------

async function importCommand(
  jiti: ReturnType<typeof createJiti>,
  filePath: string,
): Promise<StaticCommandDef | undefined> {
  const mod = (await jiti.import(filePath)) as { default?: StaticCommandDef };
  return mod.default;
}

function isCommandFile(name: string): boolean {
  return name.endsWith(".ts") && !name.endsWith(".d.ts");
}

interface Discovered {
  filePath: string;
  resolvedName: string;  // colon-joined path relative to commands root (minus extension)
  group: string;
}

/** Walk the commands dir recursively. Maps paths to colon-joined command names. */
function walkCommands(root: string): Discovered[] {
  const out: Discovered[] = [];
  function walk(dir: string, prefix: string[]): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, [...prefix, entry.name]);
      } else if (isCommandFile(entry.name)) {
        const base = entry.name.replace(/\.ts$/, "");
        if (base.includes(":")) {
          throw new Error(`Command filename contains ':' which is reserved: ${full}`);
        }
        const parts = base === "index" ? prefix : [...prefix, base];
        if (parts.length === 0) continue; // bare root index.ts not allowed
        const resolvedName = parts.join(":");
        const group = prefix.length > 0 ? titleCase(prefix[0]) : "";
        out.push({ filePath: full, resolvedName, group });
      }
    }
  }
  walk(root, []);
  return out;
}

export async function loadCommands(workspace: Workspace): Promise<ResolvedCommand[]> {
  const commandsDir = join(workspace.root, ".wm", "commands");
  if (!existsSync(commandsDir)) return [];

  const jiti = createJiti(commandsDir, jitiOptions());
  const commands: ResolvedCommand[] = [];
  const byName = new Map<string, ResolvedCommand>();

  // Invocation host: commands map is populated progressively; cycle-detected per-call.
  const activeStack = new Set<string>();
  const host: InvocationHost = {
    invoke: async (name, args) => {
      if (activeStack.has(name)) {
        const trace = [...activeStack, name].join(" → ");
        return fail(`Cyclic invocation: ${trace}`);
      }
      const target = byName.get(name);
      if (!target) return fail(`Unknown command: "${name}"`);
      activeStack.add(name);
      try {
        return await target.handler(args);
      } finally {
        activeStack.delete(name);
      }
    },
  };

  const discovered = walkCommands(commandsDir);
  for (const d of discovered) {
    const def = await importCommand(jiti, d.filePath);
    if (!def) continue;
    const cmd = resolve(def, workspace, d.group, d.filePath, host);
    // Override resolved name from path-derived name (filename was the fallback in meta).
    // Meta.name wins if explicitly set; otherwise use the discovered name.
    const userProvidedName = def.meta?.name;
    if (!userProvidedName) cmd.name = d.resolvedName;
    if (byName.has(cmd.name)) {
      throw new Error(`Duplicate command name "${cmd.name}": ${d.filePath} collides with ${byName.get(cmd.name)!.sourceFile}`);
    }
    byName.set(cmd.name, cmd);
    commands.push(cmd);
  }

  return commands;
}
