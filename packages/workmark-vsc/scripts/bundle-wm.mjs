// Bake a self-contained @ldlework/workmark into the extension under dist/wm/.
//
// The extension spawns this baked CLI (`node dist/wm/.../cli.js`) with cwd set
// to the user's workspace, so the dashboard works with nothing installed in the
// target project. We let `npm` resolve workmark's production dependency closure
// (jiti, zod, mcp-sdk, …) automatically — no hand-maintained dep list to rot.

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, cpSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const extDir = process.cwd(); // packages/workmark-vsc
const workmarkDir = join(extDir, "..", "workmark");
const outDir = join(extDir, "dist", "wm");

if (!existsSync(join(workmarkDir, "dist", "cli.js"))) {
  throw new Error("workmark is not built — run `pnpm --filter @ldlework/workmark build` first");
}

// Run npm through a shell — on Windows it's npm.cmd, which Node >=22 refuses to
// spawn without a shell. Paths are quoted (temp dirs are space-free, but be safe).
const staging = mkdtempSync(join(tmpdir(), "wm-bundle-"));
try {
  // 1. Pack the local workmark build into a tarball.
  const packed = execSync(`npm pack --silent --pack-destination "${staging}"`, {
    cwd: workmarkDir,
    encoding: "utf-8",
  }).trim().split(/\r?\n/).pop();
  const tarball = join(staging, packed);

  // 2. Install it (prod deps only) into an empty dir → flat, real node_modules.
  writeFileSync(join(staging, "package.json"), JSON.stringify({ name: "wm-bundle", private: true }));
  execSync(`npm install --omit=dev --no-audit --no-fund --silent "${tarball}"`, {
    cwd: staging,
    stdio: "inherit",
  });

  // 3. Drop the resolved tree into dist/wm/.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  cpSync(join(staging, "node_modules"), join(outDir, "node_modules"), { recursive: true });
  console.log("baked workmark ->", join(outDir, "node_modules", "@ldlework", "workmark"));
} finally {
  rmSync(staging, { recursive: true, force: true });
}
