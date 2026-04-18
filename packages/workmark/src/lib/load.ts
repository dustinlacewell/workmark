import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { createJiti } from "jiti";
import { z } from "zod";
import { execAsync } from "./helpers.js";
import type {
  CommandDef,
  IWorkspace,
  ResolvedCommand,
  SchemaFields,
  StaticCommandDef,
  ToolHandler,
} from "./types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { jitiOptions } from "./jiti-options.js";

// --- Metadata derivation -------------------------------------------------

/** Title-case a token: "docker" → "Docker", "new_post" → "New Post". */
function titleCase(s: string): string {
  return s
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Extract the last JSDoc block appearing before `export default` in a source file. */
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

function deriveMetadata(def: CommandDef, sourceFile: string): DerivedMeta {
  const filenameName = basename(sourceFile, extname(sourceFile));
  const name = def.name ?? filenameName;
  const label = def.label ?? titleCase(name);
  const description =
    def.description ?? extractLeadingJsDoc(readFileSync(sourceFile, "utf-8")) ?? "";
  return { name, label, description };
}

// --- Handler wrapping ----------------------------------------------------

function isCallToolResult(value: unknown): value is CallToolResult {
  return typeof value === "object" && value !== null && "content" in value;
}

/** Wrap a user handler so that a bare string return is executed as a shell
 * command in the workspace root. CallToolResult returns pass through. */
function wrapHandler(raw: ToolHandler, workspace: IWorkspace): (args: Record<string, unknown>) => Promise<CallToolResult> {
  return async (args) => {
    const result = await raw(args);
    if (typeof result === "string") {
      return execAsync(result, { cwd: workspace.root });
    }
    if (isCallToolResult(result)) return result;
    return { content: [{ type: "text", text: String(result) }] };
  };
}

// --- Schema merging ------------------------------------------------------

function fieldToJsonSchema(field: z.ZodType | Record<string, unknown>): Record<string, unknown> {
  if (field instanceof z.ZodType) {
    return z.toJSONSchema(field) as Record<string, unknown>;
  }
  return field;
}

/** A field is required unless it has a default or was wrapped with .optional(). */
function isRequired(field: z.ZodType | Record<string, unknown>, schema: Record<string, unknown>): boolean {
  if ("default" in schema) return false;
  if (field instanceof z.ZodType && field.safeParse(undefined).success) return false;
  return true;
}

function mergeSchemas(
  args?: SchemaFields,
  flags?: SchemaFields,
): { inputSchema: Record<string, unknown>; positional: string[] } {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  const positional: string[] = [];

  const collect = (source: SchemaFields | undefined, isPositional: boolean) => {
    if (!source) return;
    for (const [name, field] of Object.entries(source)) {
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

  return { inputSchema, positional };
}

// --- Resolution ----------------------------------------------------------

function isStatic(def: CommandDef): def is StaticCommandDef {
  return "handler" in def;
}

function resolve(def: CommandDef, workspace: IWorkspace, group: string, sourceFile: string): ResolvedCommand {
  const meta = deriveMetadata(def, sourceFile);
  const { args, flags, handler } = isStatic(def)
    ? { args: def.args, flags: def.flags, handler: def.handler }
    : def.factory(workspace);
  const { inputSchema, positional } = mergeSchemas(args, flags);

  return {
    name: meta.name,
    label: meta.label,
    group,
    description: meta.description,
    inputSchema,
    positional,
    handler: wrapHandler(handler, workspace),
    sourceFile,
  };
}

// --- Discovery -----------------------------------------------------------

async function importCommand(jiti: ReturnType<typeof createJiti>, filePath: string): Promise<CommandDef | undefined> {
  const mod = await jiti.import(filePath) as { default?: CommandDef };
  return mod.default;
}

function isCommandFile(name: string): boolean {
  return name.endsWith(".ts") && !name.endsWith(".d.ts");
}

export async function loadCommands(workspace: IWorkspace): Promise<ResolvedCommand[]> {
  const commandsDir = join(workspace.root, ".wm", "commands");
  if (!existsSync(commandsDir)) return [];

  const jiti = createJiti(commandsDir, jitiOptions());
  const commands: ResolvedCommand[] = [];

  for (const entry of readdirSync(commandsDir)) {
    const entryPath = join(commandsDir, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      const group = titleCase(entry);
      for (const file of readdirSync(entryPath)) {
        if (!isCommandFile(file)) continue;
        const filePath = join(entryPath, file);
        const def = await importCommand(jiti, filePath);
        if (def) commands.push(resolve(def, workspace, group, filePath));
      }
    } else if (isCommandFile(entry)) {
      const def = await importCommand(jiti, entryPath);
      if (def) commands.push(resolve(def, workspace, "", entryPath));
    }
  }

  return commands;
}
