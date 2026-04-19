import { cmd } from "@ldlework/workmark/define";
import { typecheckable } from "../../traits/typecheckable.js";

/** Typecheck one, many, or all packages. */
export default cmd({
  needs: [typecheckable],
  handler: (_, { traits, sh }) => sh(traits.typecheckable.command, { timeout: traits.typecheckable.timeout }),
});
