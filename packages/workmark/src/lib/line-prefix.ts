// --- Line prefixing (pure) -----------------------------------------------
//
// Concurrent multi-project runs interleave child output on one terminal.
// Each stream is line-buffered and every complete line gets a label, so a
// prefix always lands at a line start.

export interface PrefixStep {
  /** Prefixed complete lines, ready to write. */
  text: string;
  /** Trailing partial line, held until its newline (or the flush) arrives. */
  pending: string;
}

/** Feed one chunk into a line buffer. Emits only complete lines. */
export function prefixLines(prefix: string, pending: string, chunk: string): PrefixStep {
  const buf = pending + chunk;
  const lastNewline = buf.lastIndexOf("\n");
  if (lastNewline < 0) return { text: "", pending: buf };
  const lines = buf.slice(0, lastNewline).split("\n");
  return {
    text: lines.map((line) => `${prefix}${line}\n`).join(""),
    pending: buf.slice(lastNewline + 1),
  };
}

/** Emit a held partial line when its stream ends. */
export function flushPrefixed(prefix: string, pending: string): string {
  return pending ? `${prefix}${pending}\n` : "";
}
