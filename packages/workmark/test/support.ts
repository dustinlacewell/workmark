import { fileURLToPath } from "node:url";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { OutputSink } from "../dist/lib/tee.js";

export const EMIT = fileURLToPath(new URL("./emit.mjs", import.meta.url));
export const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
export const cwd = fileURLToPath(new URL(".", import.meta.url));

/** Shell command that runs the emit.mjs test child with the given steps. */
export function emit(...steps: string[]): string {
  return `node "${EMIT}" ${steps.join(" ")}`;
}

export interface Chunk {
  stream: "out" | "err";
  text: string;
  at: number;
}

/** A sink that records every chunk with its arrival time. */
export interface Recorder extends OutputSink {
  chunks: Chunk[];
  text(stream: "out" | "err"): string;
}

export function recorder(): Recorder {
  const chunks: Chunk[] = [];
  const push = (stream: "out" | "err") => (text: string) => {
    chunks.push({ stream, text, at: Date.now() });
  };
  return {
    chunks,
    out: push("out"),
    err: push("err"),
    flush: () => {},
    text: (stream) => chunks.filter((c) => c.stream === stream).map((c) => c.text).join(""),
  };
}

export function textOf(result: CallToolResult): string {
  return result.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
}
