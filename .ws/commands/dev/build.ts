import { ok, fail, exec } from "@ldlework/workmark/helpers";
import { z } from "zod";
import type { StaticCommandDef } from "@ldlework/workmark/types";

export default {
  name: "build",
  label: "Build",
  description: "Build all packages or a specific package",
  args: {
    package: z.enum(["all", "workmark", "workmark-vsc"]).default("all"),
  },
  handler: async (args) => {
    const pkg = (args.package as string) ?? "all";
    const cwd = process.cwd();
    try {
      if (pkg === "all") {
        return ok(exec("pnpm build", { cwd }));
      }
      const dir = pkg === "workmark" ? "packages/workmark" : "packages/workmark-vsc";
      return ok(exec("pnpm build", { cwd: `${cwd}/${dir}` }));
    } catch (e) {
      return fail(e);
    }
  },
} satisfies StaticCommandDef;
