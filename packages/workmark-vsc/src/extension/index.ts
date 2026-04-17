import * as vscode from "vscode";
import { SidebarProvider } from "./sidebar-provider";
import type { CommandMeta } from "../shared/types";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

/** Locate the workmark dist/lib directory from the workspace root. */
function resolveWorkmarkLib(wsRoot: string): string {
  // 1. Try Node module resolution (works when installed as a dependency)
  try {
    const wsRequire = createRequire(join(wsRoot, "package.json"));
    return dirname(wsRequire.resolve("@ldlework/workmark"));
  } catch {}

  // 2. Try common monorepo locations
  const candidates = [
    join(wsRoot, "packages", "workmark", "dist", "lib"),
    join(wsRoot, "node_modules", "@ldlework", "workmark", "dist", "lib"),
    join(wsRoot, "node_modules", "workmark", "dist", "lib"),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "workspace.js"))) return candidate;
  }

  throw new Error(
    "Could not find @ldlework/workmark. Install it as a dependency or ensure packages/workmark is built.",
  );
}

/** Dynamically import workmark from the workspace's node_modules. */
async function loadCommandMeta(wsRoot: string): Promise<CommandMeta[]> {
  const base = resolveWorkmarkLib(wsRoot);

  // Dynamic import with file:// URLs so esbuild doesn't try to bundle these
  const wsUrl = pathToFileURL(join(base, "workspace.js")).href;
  const loadUrl = pathToFileURL(join(base, "load.js")).href;

  const { loadWorkspace } = await import(wsUrl);
  const { loadCommands } = await import(loadUrl);

  const workspace = await loadWorkspace(wsRoot);
  const resolved = await loadCommands(workspace);

  // Strip handlers — webview only needs metadata
  return resolved.map(
    ({ name, label, group, description, inputSchema, positional, sourceFile }: Record<string, unknown>) => ({
      name,
      label,
      group,
      description,
      inputSchema,
      positional: positional ?? [],
      sourceFile: sourceFile ?? null,
    }),
  ) as CommandMeta[];
}

export function activate(context: vscode.ExtensionContext): void {
  const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!wsRoot) {
    vscode.window.showErrorMessage("Workspace Dashboard: no workspace folder open.");
    return;
  }

  const provider = new SidebarProvider(context.extensionUri);

  // Load commands and push to sidebar
  const refresh = async () => {
    try {
      const cmds = await loadCommandMeta(wsRoot);
      provider.updateCommands(cmds);
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to load commands: ${err}`);
    }
  };

  // Initial load
  refresh();

  // Watch wm.ts files — reload commands when project definitions change
  const watcher = vscode.workspace.createFileSystemWatcher("**/wm.ts");
  const onWmChange = () => refresh();
  watcher.onDidChange(onWmChange);
  watcher.onDidCreate(onWmChange);
  watcher.onDidDelete(onWmChange);
  context.subscriptions.push(watcher);

  // Also watch .wm/commands/ for command definition changes
  const cmdWatcher = vscode.workspace.createFileSystemWatcher("**/.wm/commands/**/*.ts");
  cmdWatcher.onDidChange(onWmChange);
  cmdWatcher.onDidCreate(onWmChange);
  cmdWatcher.onDidDelete(onWmChange);
  context.subscriptions.push(cmdWatcher);

  // Manual refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand("workspace-dashboard.refresh", async () => {
      await refresh();
      vscode.window.showInformationMessage(`Loaded ${provider.commandCount} commands.`);
    }),
  );

  // Collapse all command — forwarded to the webview
  context.subscriptions.push(
    vscode.commands.registerCommand("workspace-dashboard.collapseAll", () => {
      provider.postMessage({ type: "collapseAll" });
    }),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewId, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
}

export function deactivate(): void {}
