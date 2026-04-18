import { execAsync } from "@ldlework/workmark/helpers";
import type { DynamicCommandDef } from "@ldlework/workmark/types";

export default {
  name: "typecheck",
  label: "Type Check",
  description: "Run TypeScript type checking across all packages",
  factory: (workspace) => ({
    handler: () => execAsync("pnpm typecheck", { cwd: workspace.root }),
  }),
} satisfies DynamicCommandDef;
