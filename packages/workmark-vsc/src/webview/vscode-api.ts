import type { WebviewMessage } from "../shared/types";

interface VsCodeApi {
  postMessage(msg: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

// @ts-expect-error — injected by VS Code webview runtime
const vscode: VsCodeApi = acquireVsCodeApi();

export default vscode;
