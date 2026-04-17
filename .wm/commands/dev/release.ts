import { z } from "zod";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail, execAsyncRaw } from "@ldlework/workmark/helpers";

export default {
  name: "release",
  label: "Release",
  description: "Publish @ldlework/workmark to npm. Requires a fresh 2FA OTP.",
  factory: (workspace) => {
    const pkg = workspace.get("workmark");
    return {
      args: { otp: z.string().describe("npm 2FA OTP code (6 digits)") },
      flags: {
        dryRun: z.boolean().optional().describe("Run pnpm publish --dry-run without pushing to the registry"),
      },
      handler: async (args) => {
        try {
          const { otp, dryRun } = args as { otp: string; dryRun?: boolean };
          const flags = [
            "--access public",
            `--otp=${otp}`,
            dryRun ? "--dry-run" : "",
          ].filter(Boolean).join(" ");
          const cmd = `pnpm publish ${flags}`;
          return ok(await execAsyncRaw(cmd, { cwd: pkg.dir, timeout: 120_000 }));
        } catch (e) {
          return fail(e);
        }
      },
    };
  },
} satisfies DynamicCommandDef;
