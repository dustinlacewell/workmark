/** Serialized command metadata (no handler). Loaded from commands.json at build time. */
export interface CommandMeta {
  name: string;
  label: string;
  group: string;
  description: string;
  inputSchema: JsonSchema;
  positional: string[];
  sourceFile: string | null;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

export interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: (string | number | boolean)[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  [key: string]: unknown;
}

/** Messages from webview → extension host */
export type WebviewMessage =
  | { type: "run"; name: string; args: Record<string, unknown> }
  | { type: "refresh" }
  | { type: "openFile"; path: string };

/** Messages from extension host → webview */
export type ExtensionMessage =
  | { type: "commands"; commands: CommandMeta[] }
  | { type: "collapseAll" };
