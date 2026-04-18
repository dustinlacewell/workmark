import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

/** An input schema: either a Zod schema (converted automatically) or raw JSON Schema. */
export type InputSchema = z.ZodType | Record<string, unknown>;

/** A record of named Zod schemas or raw JSON Schema property objects. */
export type SchemaFields = Record<string, z.ZodType | Record<string, unknown>>;

/**
 * A handler's return value. A string is executed as a shell command in the
 * workspace root; a CallToolResult is forwarded unchanged.
 */
export type HandlerReturn = string | CallToolResult;

// ---- Project definitions (used in wm.ts files) ----

export interface ProjectDef {
  /** Unique identifier. */
  name: string;
  /** Project directory relative to the wm.ts location. Defaults to ".". */
  dir?: string;
  /** Arbitrary string tags for grouping/filtering. */
  tags?: string[];
  /** Named directories, resolved relative to the project dir. */
  paths?: Record<string, string>;
  /** Capabilities this project supports. `true` = use convention, object = custom config. */
  capabilities?: Record<string, true | Record<string, unknown>>;
}

// ---- Runtime project/workspace interfaces ----

export interface IProject {
  readonly name: string;
  readonly dir: string;
  readonly tags: readonly string[];
  readonly capabilities: Readonly<Record<string, true | Record<string, unknown>>>;

  has(capability: string): boolean;
  capability<T = true | Record<string, unknown>>(name: string): T;
  path(name: string): string;
}

export interface IWorkspace {
  readonly root: string;
  readonly projects: readonly IProject[];

  get(name: string): IProject;
  withCapability(cap: string): IProject[];
  withTag(tag: string): IProject[];
}

// ---- Command definitions ----

export type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<CallToolResult> | CallToolResult | HandlerReturn | Promise<HandlerReturn>;

/** Metadata fields shared by static and dynamic commands. All optional — the
 * framework derives `name` from the filename, `label` from the name, and
 * `description` from the leading JSDoc comment when not provided. */
interface CommandMeta {
  name?: string;
  label?: string;
  description?: string;
}

export interface StaticCommandDef extends CommandMeta {
  /** Positional arguments (order = key order). */
  args?: SchemaFields;
  /** Named flags (--key value). */
  flags?: SchemaFields;
  handler: ToolHandler;
}

export interface DynamicCommandDef extends CommandMeta {
  factory: (workspace: IWorkspace) => {
    args?: SchemaFields;
    flags?: SchemaFields;
    handler: ToolHandler;
  };
}

export type CommandDef = StaticCommandDef | DynamicCommandDef;

/** After resolution the handler has been wrapped to always return a normalized
 * CallToolResult — string returns from user handlers are converted to shell
 * exec calls during wrapping. */
export type ResolvedHandler = (
  args: Record<string, unknown>,
) => Promise<CallToolResult>;

export interface ResolvedCommand {
  name: string;
  label: string;
  group: string;
  description: string;
  /** Merged JSON Schema from args + flags. */
  inputSchema: Record<string, unknown>;
  /** Positional arg names in order. */
  positional: string[];
  handler: ResolvedHandler;
  /** Absolute path to the command source file. */
  sourceFile?: string;
}
