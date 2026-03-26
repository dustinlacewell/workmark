import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import type { CommandMeta, ExtensionMessage } from "../shared/types";

declare global {
  interface Window {
    __COMMANDS__: CommandMeta[];
  }
}

const root = createRoot(document.getElementById("root")!);

let commands = window.__COMMANDS__ ?? [];
let collapseSignal = 0;

function render() {
  root.render(
    <StrictMode>
      <App commands={commands} collapseSignal={collapseSignal} />
    </StrictMode>,
  );
}

// Initial render with embedded commands
render();

// Listen for messages from the extension host
window.addEventListener("message", (e: MessageEvent<ExtensionMessage>) => {
  if (e.data.type === "commands") {
    commands = e.data.commands;
    render();
  } else if (e.data.type === "collapseAll") {
    collapseSignal++;
    render();
  }
});
