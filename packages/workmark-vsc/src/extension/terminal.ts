import * as vscode from "vscode";
import type { CommandMeta } from "../shared/types";

let terminal: vscode.Terminal | undefined;

function getTerminal(): vscode.Terminal {
  if (terminal && !terminal.exitStatus) return terminal;
  terminal = vscode.window.createTerminal({ name: "Workspace" });
  return terminal;
}

function getRunner(): string[] {
  const configured = vscode.workspace.getConfiguration("workmark").get<string>("runner");
  if (configured) return configured.split(/\s+/);
  return ["ws"];
}

/** Build a `ws <command> <args>` string and send it to the integrated terminal. */
export function runInTerminal(cmd: CommandMeta, args: Record<string, unknown>): void {
  const parts: string[] = [...getRunner(), cmd.name];
  const positionalSet = new Set(cmd.positional);

  // Positional args first, in order
  for (const name of cmd.positional) {
    const val = args[name];
    if (val === undefined || val === "") continue;
    parts.push(shellEscape(String(val)));
  }

  // Named args (non-positional)
  for (const [key, val] of Object.entries(args)) {
    if (positionalSet.has(key)) continue;
    if (val === undefined || val === "" || val === false) continue;
    if (val === true) {
      parts.push(`--${key}`);
    } else {
      parts.push(`--${key}`, shellEscape(String(val)));
    }
  }

  const t = getTerminal();
  t.show(true);
  t.sendText(parts.join(" "));
}

function shellEscape(s: string): string {
  if (/^[a-zA-Z0-9._\-/:=]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}
