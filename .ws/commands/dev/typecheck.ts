import { ok, fail, exec } from "@ldlework/workmark/helpers";
import type { StaticCommandDef } from "@ldlework/workmark/types";

export default {
  name: "typecheck",
  label: "Type Check",
  description: "Run TypeScript type checking across all packages",
  handler: async () => {
    try {
      return ok(exec("pnpm typecheck", { cwd: process.cwd() }));
    } catch (e) {
      return fail(e);
    }
  },
} satisfies StaticCommandDef;
