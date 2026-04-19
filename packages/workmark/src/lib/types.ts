import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

// ---- Traits ------------------------------------------------------------

/** A named, schema-backed contract that projects fulfill and commands require.
 *
 * Identity is `name`. Created via `defineTrait`; the returned object carries a
 * phantom type so `cmd({ needs: [docker] })` can infer trait-data types into
 * the handler's `ctx.traits`. */
export interface Trait<N extends string = string, T = unknown> {
  readonly name: N;
  readonly schema: z.ZodType;
  readonly description?: string;
  /** Phantom for inference. Never accessed at runtime. */
  readonly __brand?: readonly ["trait", N, T];
}

// ---- Schema fields ------------------------------------------------------

/** A field schema: a zod type or raw JSON Schema object. */
export type SchemaField = z.ZodType | Record<string, unknown>;

/** A record of named field schemas. */
export type SchemaFields = Record<string, SchemaField>;

// ---- Projects -----------------------------------------------------------

export interface ProjectDef {
  /** Unique identifier. */
  name: string;
  /** Project directory relative to the wm.ts location. Defaults to ".". */
  dir?: string;
  /** Free-form labels. Filter only — no handler injection. */
  tags?: string[];
  /** Named directories, resolved relative to the project dir. */
  paths?: Record<string, string>;
  /** Trait fulfillments. Keys are trait names; values are validated against
   * the trait schema at load time. */
  has?: Record<string, unknown>;
  /** Optional human-readable description. */
  description?: string;
}

export interface IProject {
  readonly name: string;
  readonly dir: string;
  readonly tags: readonly string[];
  readonly description?: string;

  /** Check whether this project fulfills a trait (by object or name). */
  hasTrait(trait: Trait | string): boolean;
  /** Get the parsed trait data. Throws if the project does not fulfill it. */
  trait<T>(trait: Trait<string, T>): T;
  /** Resolve a named path relative to this project's directory. */
  path(name: string): string;
}

export interface IWorkspace {
  readonly root: string;
  readonly projects: readonly IProject[];

  get(name: string): IProject;
  withTrait(trait: Trait | string): IProject[];
  withTag(tag: string): IProject[];
}

// ---- Commands -----------------------------------------------------------

/** How many projects a command runs against. */
export type SelectMode = "one" | "one-or-many" | "all";

/** Framework-standard context passed to every handler. */
export interface BaseCtx {
  workspace: IWorkspace;
  /** Run a shell command in the resolved cwd (project.dir when needs is set, else workspace.root). */
  sh: (cmd: string, opts?: { timeout?: number }) => Promise<CallToolResult>;
  /** Run a shell command with explicit options. */
  exec: (cmd: string, opts: { cwd: string; timeout?: number }) => Promise<CallToolResult>;
  ok: (data: unknown) => CallToolResult;
  fail: (error: unknown) => CallToolResult;
}

/** Context for commands with `needs`. Adds `project` and `traits`. */
export interface NeedsCtx<Traits extends Record<string, unknown>> extends BaseCtx {
  project: IProject;
  traits: Traits;
}

export type HandlerReturn = CallToolResult;

/** A resolved, runnable command — what the framework holds after load. */
export interface ResolvedCommand {
  name: string;
  label: string;
  group: string;
  description: string;
  inputSchema: Record<string, unknown>;
  positional: string[];
  handler: ResolvedHandler;
  sourceFile?: string;
  select: SelectMode;
  /** Names of traits this command requires. Empty array = no needs. */
  needs: string[];
}

export type ResolvedHandler = (
  args: Record<string, unknown>,
) => Promise<CallToolResult>;

// ---- Result aggregation -------------------------------------------------

/** Per-project result shape for multi-target commands. */
export interface ProjectResult {
  project: string;
  ok: boolean;
  output?: string;
  error?: string;
}

/** Optional reducer for custom multi-target aggregation. */
export type ReduceFn = (results: ProjectResult[]) => HandlerReturn | Promise<HandlerReturn>;

export interface RunOptions {
  order?: "parallel" | "serial";
  concurrency?: number;
  stopOnFailure?: boolean;
  reduce?: ReduceFn;
}

// ---- fromWorkspace marker ----------------------------------------------

/** Internal marker stamped on schemas produced by `fromWorkspace`. */
export const FROM_WORKSPACE = Symbol.for("workmark.fromWorkspace");

export interface FromWorkspaceResolver {
  (ws: IWorkspace): z.ZodType;
}
