import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { cmd } from "@ldlework/workmark/define";
import { execAsyncRaw } from "@ldlework/workmark/helpers";
import { vscodeExtension } from "../../traits/vscodeExtension.js";

/** Install the packaged .vsix extension into VS Code or Windsurf; packages it first if missing. */
export default cmd({
  needs: [vscodeExtension],
  select: "one",
  flags: {
    editor: z.enum(["code", "windsurf"]).default("code"),
  },
  handler: async ({ editor }, { project, sh }) => {
    const pkg = JSON.parse(readFileSync(join(project.dir, "package.json"), "utf-8")) as { version: string };
    const vsix = join(project.dir, `workmark-vsc-${pkg.version}.vsix`);

    if (!existsSync(vsix)) {
      await execAsyncRaw("npx @vscode/vsce package --no-dependencies", {
        cwd: project.dir,
        timeout: 180_000,
      });
    }
    // On Windows the VS Code CLI shim is `code.cmd`; using bare `code` may find
    // the Electron GUI binary first on PATH, which doesn't accept --install-extension.
    const bin = process.platform === "win32" ? `${editor}.cmd` : editor;
    return sh(`${bin} --install-extension ${vsix} --force`);
  },
});
