import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

/** An input schema: either a Zod schema (converted automatically) or raw JSON Schema. */
export type InputSchema = z.ZodType | Record<string, unknown>;

/** A record of named Zod schemas or raw JSON Schema property objects. */
export type SchemaFields = Record<string, z.ZodType | Record<string, unknown>>;

// ---- Project definitions (used in ws.ts files) ----

export interface ProjectDef {
  /** Unique identifier. */
  name: string;
  /** Project directory relative to the ws.ts location. Defaults to ".". */
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
) => Promise<CallToolResult>;

export interface StaticCommandDef {
  name: string;
  label: string;
  description: string;
  /** Positional arguments (order = key order). */
  args?: SchemaFields;
  /** Named flags (--key value). */
  flags?: SchemaFields;
  handler: ToolHandler;
}

export interface DynamicCommandDef {
  name: string;
  label: string;
  description: string;
  factory: (workspace: IWorkspace) => {
    args?: SchemaFields;
    flags?: SchemaFields;
    handler: ToolHandler;
  };
}

export type CommandDef = StaticCommandDef | DynamicCommandDef;

export interface ResolvedCommand {
  name: string;
  label: string;
  group: string;
  description: string;
  /** Merged JSON Schema from args + flags. */
  inputSchema: Record<string, unknown>;
  /** Positional arg names in order. */
  positional: string[];
  handler: ToolHandler;
  /** Absolute path to the command source file. */
  sourceFile?: string;
}
