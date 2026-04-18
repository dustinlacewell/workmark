import { z } from "zod";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { join } from "node:path";

export default {
  name: "install-ext",
  label: "Install Extension",
  description: "Install the packaged .vsix extension into VS Code or Windsurf",
  factory: (workspace) => {
    const vsc = workspace.get("workmark-vsc");
    return {
      args: { editor: z.enum(["windsurf", "code"]).default("windsurf") },
      handler: (args) => {
        const editor = (args.editor as string) ?? "windsurf";
        const vsix = join(vsc.dir, "workmark-vsc-1.4.0.vsix");
        return `${editor} --install-extension ${vsix} --force`;
      },
    };
  },
} satisfies DynamicCommandDef;
