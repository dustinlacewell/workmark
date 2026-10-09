import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** The text items of a result, joined by newlines. */
export function textOf(result: CallToolResult): string {
  return result.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");
}
