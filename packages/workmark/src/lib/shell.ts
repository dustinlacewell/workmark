import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { execAsync, execInteractive, shSeq, shSeqInteractive } from "./helpers.js";
import { textOf } from "./result-text.js";
import { runSequence } from "./sequence.js";
import { execTee, prefixedSink, processSink, type OutputSink } from "./tee.js";
import { Transcript, cliTranscript } from "./transcript.js";
import type { Surface } from "./types.js";

// --- Host-aware shell for ctx.sh -----------------------------------------
//
// The host decides how `ctx.sh` runs a command:
//   cli                tee: stream live to the terminal and capture; no default timeout
//   cli + interactive  hand the terminal to the child; no capture
//   mcp                capture only; 120 s default timeout (a tool call must end)

export interface ShellOptions {
  cwd: string;
  timeout?: number;
  env?: Record<string, string>;
}

/** How `ctx.sh` runs commands on the current host. */
export interface Shell {
  /** Timeout applied when the handler passes none. Undefined: no limit. */
  readonly defaultTimeout: number | undefined;
  one(command: string, opts: ShellOptions): Promise<CallToolResult>;
  /** Run commands in order. Fails fast; output is concatenated. */
  seq(commands: readonly string[], opts: ShellOptions): Promise<CallToolResult>;
  /** The shell for one project of a multi-project run. Concurrent projects
   * get a `[name] ` line prefix; projects run in turn get a `--- name ---`
   * header before their first command. */
  forProject(name: string, concurrent: boolean): ProjectShell;
  /** Note that `text` was already shown in full, so the host need not print
   * a result equal to it. */
  markShown(text: string): void;
}

export interface ProjectShell {
  shell: Shell;
  /** The text this project's sh calls showed live; null when none ran. */
  shown(): readonly string[] | null;
}

export const MCP_DEFAULT_TIMEOUT = 120_000;

/** Pick the shell for a host. */
export function shellFor(surface: Surface, interactive: boolean): Shell {
  if (surface !== "cli") return captureShell(MCP_DEFAULT_TIMEOUT);
  return interactive ? interactiveShell : teeShell(() => processSink, { transcript: cliTranscript });
}

/** Buffer all output; return it when the child exits. */
export function captureShell(defaultTimeout: number): Shell {
  const shell: Shell = {
    defaultTimeout,
    one: (command, opts) => execAsync(command, withTimeout(opts, defaultTimeout)),
    seq: (commands, opts) => shSeq(commands, withTimeout(opts, defaultTimeout)),
    forProject: () => ({ shell, shown: () => null }),
    markShown: () => {},
  };
  return shell;
}

export interface TeeShellOptions {
  /** Timeout when the handler passes none. Omitted: no limit. */
  defaultTimeout?: number;
  /** Records the result text of each sh call, which is what was shown live. */
  transcript?: Transcript;
  /** Written to the sink before the first command. */
  header?: string;
}

/** Stream output to a sink while capturing it. `openSink` is called once
 * per execution, so each child gets its own line buffers. */
export function teeShell(openSink: () => OutputSink, options: TeeShellOptions = {}): Shell {
  const { defaultTimeout, transcript } = options;
  let header = options.header;
  const exec = (command: string, opts: ShellOptions) => {
    const sink = openSink();
    if (header) sink.out(header);
    header = undefined;
    return execTee(command, withTimeout(opts, defaultTimeout), sink);
  };
  const record = (result: CallToolResult) => {
    transcript?.record(textOf(result));
    return result;
  };
  return {
    defaultTimeout,
    one: async (command, opts) => record(await exec(command, opts)),
    seq: async (commands, opts) => record(await runSequence(commands, (command) => exec(command, opts))),
    forProject: (name, concurrent) => {
      const own = new Transcript();
      const shell = concurrent
        ? teeShell(() => prefixedSink(openSink(), `[${name}] `), { defaultTimeout, transcript: own })
        : teeShell(openSink, { defaultTimeout, transcript: own, header: `--- ${name} ---\n` });
      return { shell, shown: () => own.shown() };
    },
    markShown: (text) => transcript?.record(text),
  };
}

/** Inherited stdio, no timeout, no capture. */
export const interactiveShell: Shell = {
  defaultTimeout: undefined,
  one: (command, opts) => execInteractive(command, opts),
  seq: (commands, opts) => shSeqInteractive(commands, opts),
  forProject: () => ({ shell: interactiveShell, shown: () => null }),
  markShown: () => {},
};

function withTimeout(opts: ShellOptions, fallback: number | undefined): ShellOptions {
  return { ...opts, timeout: opts.timeout ?? fallback };
}
