import { spawn } from "node:child_process";
import type { Readable } from "node:stream";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { fail, ok, type ExecOptions } from "./helpers.js";
import { killTree } from "./kill-tree.js";
import { flushPrefixed, prefixLines } from "./line-prefix.js";
import { tailBuffer, type TailBuffer } from "./tail-buffer.js";

// --- Teed execution (CLI surface) ----------------------------------------
//
// The child's output goes to the terminal as it arrives and is also captured,
// so the handler still gets the full text in a normal result.

/** Captured text per stream keeps only the last 10 MB (counted in UTF-16
 * code units), so a huge log does not sit in memory. Streaming to the sink
 * is not capped. */
const CAPTURE_LIMIT = 10 * 1024 * 1024;

/** Where streamed child output goes. */
export interface OutputSink {
  out(chunk: string): void;
  err(chunk: string): void;
  /** Called when a child's streams close; writes anything held back. */
  flush(): void;
}

export const processSink: OutputSink = {
  out: (chunk) => { process.stdout.write(chunk); },
  err: (chunk) => { process.stderr.write(chunk); },
  flush: () => {},
};

/** Wrap a sink so every line on each stream starts with `prefix`. */
export function prefixedSink(sink: OutputSink, prefix: string): OutputSink {
  const out = lineBuffer(prefix, (text) => sink.out(text));
  const err = lineBuffer(prefix, (text) => sink.err(text));
  return {
    out: out.write,
    err: err.write,
    flush: () => {
      out.flush();
      err.flush();
      sink.flush();
    },
  };
}

function lineBuffer(prefix: string, write: (text: string) => void) {
  let pending = "";
  return {
    write: (chunk: string) => {
      const step = prefixLines(prefix, pending, chunk);
      pending = step.pending;
      if (step.text) write(step.text);
    },
    flush: () => {
      const rest = flushPrefixed(prefix, pending);
      pending = "";
      if (rest) write(rest);
    },
  };
}

/** Run a command with its output teed to `sink` and captured. No timeout
 * unless `opts.timeout` is set. The result text matches `execAsync`. On
 * failure one summary line also goes to `sink.err`. */
export function execTee(
  command: string,
  opts: ExecOptions,
  sink: OutputSink,
): Promise<CallToolResult> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: opts.cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: opts.env ? { ...process.env, ...opts.env } : process.env,
    });
    const stdout = capture(child.stdout, (chunk) => sink.out(chunk));
    const stderr = capture(child.stderr, (chunk) => sink.err(chunk));
    let settled = false;
    const done = (result: CallToolResult, summary?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sink.flush();
      if (summary) sink.err(`${summary}\n`);
      resolve(result);
    };
    // A grandchild can keep the pipes open after the shell dies. Stop
    // reading and kill, so the call ends on time.
    let timedOut = false;
    const timer = opts.timeout === undefined ? undefined : setTimeout(async () => {
      timedOut = true;
      child.stdout.destroy();
      child.stderr.destroy();
      await killTree(child);
      done(teeResult(command, null, stdout.text(), stderr.text()), timeoutSummary(command, opts.timeout!));
    }, opts.timeout);
    child.on("close", (code, signal) => {
      if (timedOut) return; // the timer reports this call
      const result = teeResult(command, code, stdout.text(), stderr.text());
      done(result, result.isError ? failureSummary(command, code, signal) : undefined);
    });
    child.on("error", (e) => done(fail(e), `Command failed: ${e.message}`));
  });
}

/** Collect a stream's chunks while forwarding each one as it arrives. */
function capture(stream: Readable, forward: (chunk: string) => void): TailBuffer {
  const tail = tailBuffer(CAPTURE_LIMIT);
  stream.setEncoding("utf-8");
  stream.on("data", (chunk: string) => {
    tail.push(chunk);
    forward(chunk);
  });
  return tail;
}

/** Result for a finished child, byte-compatible with `execAsync`: stdout on
 * success; on error stderr, else stdout, else exec's own message. */
export function teeResult(
  command: string,
  code: number | null,
  stdout: string,
  stderr: string,
): CallToolResult {
  if (code === 0) return ok(stdout);
  return fail(stderr || stdout || `Command failed: ${command}\n`);
}

/** One terminal line saying how a child failed. */
export function failureSummary(
  command: string,
  code: number | null,
  signal: NodeJS.Signals | null,
): string {
  const why = signal ? `signal ${signal}` : `exit ${code}`;
  return `Command failed (${why}): ${command}`;
}

function timeoutSummary(command: string, ms: number): string {
  return `Command failed (timeout ${ms} ms): ${command}`;
}
