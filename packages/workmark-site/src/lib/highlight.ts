import { createHighlighter, type Highlighter } from "shiki";

/** Single shared Shiki highlighter. Initialized at module load (top-level await). */
const highlighter: Highlighter = await createHighlighter({
  themes: ["github-light", "github-dark"],
  langs: ["typescript", "tsx", "bash", "jsonc", "json"],
});

export type Lang = "typescript" | "tsx" | "bash" | "jsonc" | "json";

/** Highlight code to HTML with both light and dark themes (via CSS vars). */
export function highlight(code: string, lang: Lang = "typescript"): string {
  return highlighter.codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}
