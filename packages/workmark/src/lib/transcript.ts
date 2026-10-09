// --- Transcript (CLI surface) --------------------------------------------
//
// The text each streamed `ctx.sh` call showed live, in order. The CLI skips
// printing a final result that only repeats it.

export class Transcript {
  private parts: string[] = [];

  record(text: string): void {
    this.parts.push(text);
  }

  /** What a final result may repeat without being printed again: everything
   * recorded, concatenated, then each call's text alone. Null when nothing
   * was recorded. */
  shown(): readonly string[] | null {
    return this.parts.length > 0 ? [this.parts.join(""), ...this.parts] : null;
  }
}

/** The transcript for this process's terminal. The CLI shell records into
 * it; cli.ts reads it after the handler returns. */
export const cliTranscript = new Transcript();
