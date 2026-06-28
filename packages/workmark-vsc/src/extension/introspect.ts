import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommandMeta } from "../shared/types";
import { bakedCli } from "./runner";

const execFileAsync = promisify(execFile);

/**
 * Load command metadata for `wsRoot`.
 *
 * Always uses the workmark CLI baked into the extension, run via this process's
 * own Node runtime (`process.execPath` + ELECTRON_RUN_AS_NODE) — so the
 * dashboard works even when the target workspace has no workmark (and no `node`)
 * installed, and is never at the mercy of an older workspace CLI that predates
 * `--introspect`. The `workmark.runner` setting deliberately does NOT apply
 * here; it only affects how commands are *run* (see runner.ts).
 */
export async function introspectCommands(wsRoot: string, extDir: string): Promise<CommandMeta[]> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(process.execPath, [bakedCli(extDir), "--introspect"], {
      cwd: wsRoot,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    }));
  } catch (err) {
    throw new Error(`Could not introspect commands via the bundled workmark CLI.\n${err}`);
  }
  try {
    return JSON.parse(stdout) as CommandMeta[];
  } catch {
    throw new Error(`The bundled workmark CLI did not return valid JSON:\n${stdout.slice(0, 500)}`);
  }
}
