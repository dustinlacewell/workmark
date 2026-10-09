// --- Tail buffer ---------------------------------------------------------
//
// Keeps only the last `limit` characters of a stream of chunks, so a huge
// log does not sit in memory. Length is counted in UTF-16 code units.

export interface TailBuffer {
  push(chunk: string): void;
  text(): string;
}

export function tailBuffer(limit: number): TailBuffer {
  const chunks: string[] = [];
  let size = 0;
  return {
    push: (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      while (size > limit) {
        const excess = size - limit;
        if (chunks[0].length <= excess) {
          size -= chunks.shift()!.length;
        } else {
          chunks[0] = chunks[0].slice(excess);
          size -= excess;
        }
      }
    },
    text: () => chunks.join(""),
  };
}
