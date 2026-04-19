import { cmd } from "@ldlework/workmark/define";
import { vscodeExtension } from "../../traits/vscodeExtension.js";

/** Package the VS Code extension into a .vsix file. */
export default cmd({
  needs: [vscodeExtension],
  select: "one",
  handler: (_, { sh }) => sh("npx @vscode/vsce package --no-dependencies"),
});
