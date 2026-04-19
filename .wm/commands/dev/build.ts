import { cmd } from "@ldlework/workmark/define";
import { buildable } from "../../traits/buildable.js";

/** Build one, many, or all packages. */
export default cmd({
  needs: [buildable],
  select: "one-or-many",
  handler: (_, { traits, sh }) => sh(traits.buildable.command, { timeout: traits.buildable.timeout }),
});
