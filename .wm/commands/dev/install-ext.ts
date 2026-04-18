import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { execAsyncRaw } from "@ldlework/workmark/helpers";

export default {
  name: "install-ext",
  label: "Install Extension",
  description: "Install the packaged .vsix extension into VS Code or Windsurf; packages it first if missing.",
  factory: (workspace) => {
    const vsc = workspace.get("workmark-vsc");

    const currentVsix = () => {
      const pkg = JSON.parse(readFileSync(join(vsc.dir, "package.json"), "utf-8")) as { version: string };
      return join(vsc.dir, `workmark-vsc-${pkg.version}.vsix`);
    };

    const ensurePackaged = async (vsix: string) => {
      if (existsSync(vsix)) return;
      await execAsyncRaw("npx @vscode/vsce package --no-dependencies", { cwd: vsc.dir, timeout: 180_000 });
    };

    return {
      args: { editor: z.enum(["windsurf", "code"]).default("windsurf") },
      handler: async (args) => {
        const editor = (args.editor as string) ?? "windsurf";
        const vsix = currentVsix();
        await ensurePackaged(vsix);
        return `${editor} --install-extension ${vsix} --force`;
      },
    };
  },
} satisfies DynamicCommandDef;
