import * as vscode from "vscode";
import type { CommandMeta, WebviewMessage } from "../shared/types";
import { runInTerminal } from "./terminal";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "workspace-dashboard.sidebar";

  private view?: vscode.WebviewView;
  private commands: CommandMeta[] = [];

  constructor(private readonly extensionUri: vscode.Uri) {}

  get commandCount(): number {
    return this.commands.length;
  }

  /** Replace commands and push to webview if visible. */
  updateCommands(commands: CommandMeta[]): void {
    this.commands = commands;
    this.view?.webview.postMessage({ type: "commands", commands });
  }

  /** Send a message to the webview. */
  postMessage(message: Record<string, unknown>): void {
    this.view?.webview.postMessage(message);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist", "webview")],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((msg: WebviewMessage) => {
      if (msg.type === "run") {
        const cmd = this.commands.find((c) => c.name === msg.name);
        if (cmd) runInTerminal(cmd, msg.args);
      } else if (msg.type === "refresh") {
        vscode.commands.executeCommand("workspace-dashboard.refresh");
      } else if (msg.type === "openFile") {
        vscode.window.showTextDocument(vscode.Uri.file(msg.path));
      }
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "index.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "style.css"),
    );
    const nonce = getNonce();

    const commandsJson = JSON.stringify(this.commands);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri}">
  <title>Workspace Dashboard</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">window.__COMMANDS__ = ${commandsJson};</script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
