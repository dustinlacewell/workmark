import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { fail, ok } from "./helpers.js";
import { textOf } from "./result-text.js";

// --- Command sequences ---------------------------------------------------

/** Run commands in order with `runOne`. Fails fast; concatenates outputs
 * the same way `shSeq` does. */
export async function runSequence(
  commands: readonly string[],
  runOne: (command: string) => Promise<CallToolResult>,
): Promise<CallToolResult> {
  const results: CallToolResult[] = [];
  for (const cmd of commands) {
    const res = await runOne(cmd);
    results.push(res);
    if (res.isError) break;
  }
  return combineSequence(results);
}

/** Fold step results into one result. */
export function combineSequence(results: readonly CallToolResult[]): CallToolResult {
  const texts = results.map(textOf);
  const failed = results.length > 0 && results[results.length - 1].isError === true;
  return failed ? failAfter(texts) : ok(texts.join("\n"));
}

function failAfter(texts: readonly string[]): CallToolResult {
  const prior = texts.slice(0, -1).join("\n");
  const errText = texts[texts.length - 1];
  return fail(prior ? `${prior}\n${errText}` : errText);
}
