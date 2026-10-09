// --- Already-shown check (pure) ------------------------------------------

/** True when `resultText` only repeats what was shown live: it equals one of
 * the `shown` candidates (the whole live output, or the output of a single
 * streamed call, as when a handler runs `sh(a)` then returns `sh(b)`), after
 * normalizing CRLF to LF and trimming trailing whitespace. Never cuts text:
 * a partial match prints the result in full. Nothing shown (null) never
 * matches. */
export function alreadyShown(resultText: string, shown: readonly string[] | null): boolean {
  const text = normalize(resultText);
  return shown !== null && shown.some((s) => normalize(s) === text);
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").trimEnd();
}
