import { execSync, exec as cpExec } from "node:child_process";
import { promisify } from "node:util";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";


// --- Response helpers ---

export function ok(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function fail(error: unknown): CallToolResult {
  let msg: string;
  if (error instanceof Error) {
    const { stderr, stdout } = error as unknown as Record<string, unknown>;
    msg =
      (typeof stderr === "string" && stderr) ||
      (typeof stdout === "string" && stdout) ||
      error.message;
  } else {
    msg = String(error);
  }
  return { content: [{ type: "text", text: msg }], isError: true };
}

// --- Shell execution ---

export interface ExecOptions {
  cwd: string;
  timeout?: number; // ms, default 120_000
}

export function execRaw(command: string, opts: ExecOptions): string {
  const { cwd, timeout = 120_000 } = opts;
  return execSync(command, {
    cwd,
    timeout,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1024 * 1024 * 10,
  });
}

export function exec(command: string, opts: ExecOptions): CallToolResult {
  try {
    return ok(execRaw(command, opts));
  } catch (e) {
    return fail(e);
  }
}

const execPromise = promisify(cpExec);

export async function execAsyncRaw(
  command: string,
  opts: ExecOptions,
): Promise<string> {
  const { cwd, timeout = 120_000 } = opts;
  const { stdout } = await execPromise(command, {
    cwd,
    timeout,
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 10,
  });
  return stdout;
}

export async function execAsync(
  command: string,
  opts: ExecOptions,
): Promise<CallToolResult> {
  try {
    return ok(await execAsyncRaw(command, opts));
  } catch (e) {
    return fail(e);
  }
}
