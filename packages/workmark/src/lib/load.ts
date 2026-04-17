import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";
import { z } from "zod";
import type { CommandDef, IWorkspace, ResolvedCommand, SchemaFields, StaticCommandDef } from "./types.js";
import { jitiOptions } from "./jiti-options.js";

/** Title-case a folder name: "docker" → "Docker" */
function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isStatic(def: CommandDef): def is StaticCommandDef {
  return "handler" in def;
}

/** Convert a single field (Zod or raw JSON Schema property) to a JSON Schema property. */
function fieldToJsonSchema(field: z.ZodType | Record<string, unknown>): Record<string, unknown> {
  if (field instanceof z.ZodType) {
    return z.toJSONSchema(field) as Record<string, unknown>;
  }
  return field;
}

/** Merge args + flags into a single JSON Schema object and return positional names. */
function mergeSchemas(
  args?: SchemaFields,
  flags?: SchemaFields,
): { inputSchema: Record<string, unknown>; positional: string[] } {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  const positional: string[] = [];

  // Args are positional, in key order
  if (args) {
    for (const [name, field] of Object.entries(args)) {
      const schema = fieldToJsonSchema(field);
      properties[name] = schema;
      positional.push(name);
      // If no default and not explicitly optional, it's required
      if (!("default" in schema)) {
        required.push(name);
      }
    }
  }

  // Flags are named (--key value)
  if (flags) {
    for (const [name, field] of Object.entries(flags)) {
      const schema = fieldToJsonSchema(field);
      properties[name] = schema;
      if (!("default" in schema)) {
        required.push(name);
      }
    }
  }

  const inputSchema: Record<string, unknown> = {
    type: "object",
    properties,
  };
  if (required.length > 0) {
    inputSchema.required = required;
  }

  return { inputSchema, positional };
}

function resolve(def: CommandDef, workspace: IWorkspace, group: string, sourceFile: string): ResolvedCommand {
  let args: SchemaFields | undefined;
  let flags: SchemaFields | undefined;
  let handler;

  if (isStatic(def)) {
    args = def.args;
    flags = def.flags;
    handler = def.handler;
  } else {
    const result = def.factory(workspace);
    args = result.args;
    flags = result.flags;
    handler = result.handler;
  }

  const { inputSchema, positional } = mergeSchemas(args, flags);
  return { name: def.name, label: def.label, group, description: def.description, inputSchema, positional, handler, sourceFile };
}

export async function loadCommands(workspace: IWorkspace): Promise<ResolvedCommand[]> {
  const commandsDir = join(workspace.root, ".wm", "commands");
  if (!existsSync(commandsDir)) return [];

  const jiti = createJiti(commandsDir, jitiOptions());
  const commands: ResolvedCommand[] = [];

  // Ungrouped (root-level) commands first
  for (const entry of readdirSync(commandsDir)) {
    const entryPath = join(commandsDir, entry);
    const stat = statSync(entryPath);
    if (!stat.isDirectory() && entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      const mod = await jiti.import(entryPath) as { default: CommandDef };
      commands.push(resolve(mod.default, workspace, "", entryPath));
    }
  }

  // Grouped commands (subdirectories)
  for (const entry of readdirSync(commandsDir)) {
    const entryPath = join(commandsDir, entry);
    const stat = statSync(entryPath);
    if (stat.isDirectory()) {
      const group = titleCase(entry);
      for (const file of readdirSync(entryPath)) {
        if (!file.endsWith(".ts") || file.endsWith(".d.ts")) continue;
        const filePath = join(entryPath, file);
        const mod = await jiti.import(filePath) as { default: CommandDef };
        commands.push(resolve(mod.default, workspace, group, filePath));
      }
    }
  }

  return commands;
}
