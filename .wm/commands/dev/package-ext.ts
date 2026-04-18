import { execAsync } from "@ldlework/workmark/helpers";
import type { DynamicCommandDef } from "@ldlework/workmark/types";

export default {
  name: "package-ext",
  label: "Package Extension",
  description: "Package the VS Code extension into a .vsix file",
  factory: (workspace) => {
    const vsc = workspace.get("workmark-vsc");
    return {
      handler: () => execAsync("npx @vscode/vsce package --no-dependencies", { cwd: vsc.dir }),
    };
  },
} satisfies DynamicCommandDef;
