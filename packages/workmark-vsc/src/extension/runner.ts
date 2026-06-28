import * as vscode from "vscode";
import { join } from "node:path";

/** Absolute path to the workmark CLI baked into the extension (see scripts/bundle-wm.mjs). */
export function bakedCli(extDir: string): string {
  return join(extDir, "dist", "wm", "node_modules", "@ldlework", "workmark", "dist", "cli.js");
}

/** The explicit `workmark.runner` override, as a token list, or null if unset. */
export function configuredRunner(): string[] | null {
  const configured = vscode.workspace.getConfiguration("workmark").get<string>("runner");
  return configured && configured.trim() ? configured.trim().split(/\s+/) : null;
}

/**
 * Tokens to invoke `wm` for terminal execution: the explicit `workmark.runner`
 * setting if set, otherwise the baked-in CLI via `node` (works with nothing
 * installed in the workspace).
 */
export function resolveRunner(extDir: string): string[] {
  const configured = configuredRunner();
  if (configured) return configured;
  const cli = bakedCli(extDir);
  return ["node", /\s/.test(cli) ? `"${cli}"` : cli];
}
