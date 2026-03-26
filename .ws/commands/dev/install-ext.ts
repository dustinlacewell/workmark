import { ok, fail, exec } from "@ldlework/workmark/helpers";
import { z } from "zod";
import type { StaticCommandDef } from "@ldlework/workmark/types";
import { join } from "node:path";

export default {
  name: "install-ext",
  label: "Install Extension",
  description: "Install the packaged .vsix extension into VS Code or Windsurf",
  args: {
    editor: z.enum(["windsurf", "code"]).default("windsurf"),
  },
  handler: async (args) => {
    const editor = (args.editor as string) ?? "windsurf";
    const vsix = join(process.cwd(), "packages", "workmark-vsc", "workmark-vsc-0.1.0.vsix");
    try {
      return ok(exec(`${editor} --install-extension ${vsix} --force`, { cwd: process.cwd() }));
    } catch (e) {
      return fail(e);
    }
  },
} satisfies StaticCommandDef;
