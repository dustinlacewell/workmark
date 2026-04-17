import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail, execAsyncRaw } from "@ldlework/workmark/helpers";

type PackageMeta = { name: string; version: string };

function readPackage(dir: string): PackageMeta {
  const raw = readFileSync(join(dir, "package.json"), "utf-8");
  return JSON.parse(raw) as PackageMeta;
}

async function pollForVersion(name: string, version: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const got = (await execAsyncRaw(`npm view ${name} version`, { cwd: process.cwd(), timeout: 10_000 })).trim();
      if (got === version) return true;
    } catch {
      // version may not yet be indexed; keep polling
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

function buildPublishCmd(otp: string, dryRun: boolean): string {
  const flags = ["--access public", `--otp=${otp}`, dryRun ? "--dry-run" : ""];
  return `pnpm publish ${flags.filter(Boolean).join(" ")}`;
}

function npmLink(meta: PackageMeta): string {
  return `https://www.npmjs.com/package/${meta.name}/v/${meta.version}`;
}

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
          const meta = readPackage(pkg.dir);
          const publishOutput = await execAsyncRaw(buildPublishCmd(otp, !!dryRun), { cwd: pkg.dir, timeout: 120_000 });

          if (dryRun) {
            return ok(`${publishOutput}\n[dry-run] would publish ${meta.name}@${meta.version}`);
          }

          const live = await pollForVersion(meta.name, meta.version, 30_000);
          const status = live
            ? `live: ${meta.name}@${meta.version}`
            : `published but not yet visible (CDN lag); recheck ${npmLink(meta)} in a minute`;

          return ok(`${publishOutput}\n${status}\n${npmLink(meta)}`);
        } catch (e) {
          return fail(e);
        }
      },
    };
  },
} satisfies DynamicCommandDef;
