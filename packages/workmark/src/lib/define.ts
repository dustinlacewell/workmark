import type { CommandDef, ProjectDef, StaticCommandDef } from "./types.js";

/** Define a project. Identity function for type safety. */
export function defineProject(def: ProjectDef): ProjectDef {
  return def;
}

/**
 * Define a command. Identity function for type inference. Every metadata field
 * (`name`, `label`, `description`) is optional — the framework derives them from
 * the file's location and leading JSDoc when missing. Handlers may return either
 * a CallToolResult or a bare string (executed as a shell command).
 */
export function cmd(def: StaticCommandDef): StaticCommandDef {
  return def;
}

/** Alias of `cmd` for users who prefer the longer form. */
export const defineCommand = cmd;

/** Typed identity for dynamic commands (factory-based). */
export function dynamicCmd<T extends CommandDef>(def: T): T {
  return def;
}
