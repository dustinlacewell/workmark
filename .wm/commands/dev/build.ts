import { execAsync } from "@ldlework/workmark/helpers";
import { z } from "zod";
import type { DynamicCommandDef } from "@ldlework/workmark/types";

export default {
  name: "build",
  label: "Build",
  description: "Build all packages or a specific package",
  factory: (workspace) => ({
    args: { package: z.enum(["all", "workmark", "workmark-vsc"]).default("all") },
    handler: (args) => {
      const pkg = (args.package as string) ?? "all";
      const cwd = pkg === "all" ? workspace.root : workspace.get(pkg).dir;
      return execAsync("pnpm build", { cwd });
    },
  }),
} satisfies DynamicCommandDef;
