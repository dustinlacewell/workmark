import { ok, fail, exec } from "@ldlework/workmark/helpers";
import type { StaticCommandDef } from "@ldlework/workmark/types";
import { join } from "node:path";

export default {
  name: "package-ext",
  label: "Package Extension",
  description: "Package the VS Code extension into a .vsix file",
  handler: async () => {
    const cwd = join(process.cwd(), "packages", "workmark-vsc");
    try {
      return ok(exec("npx @vscode/vsce package --no-dependencies", { cwd }));
    } catch (e) {
      return fail(e);
    }
  },
} satisfies StaticCommandDef;
