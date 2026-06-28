import * as vscode from "vscode";
import { SidebarProvider } from "./sidebar-provider";
import { introspectCommands } from "./introspect";

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
      const cmds = await introspectCommands(wsRoot, context.extensionPath);
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
