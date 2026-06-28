import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { JitiOptions } from "jiti";

// Resolve sibling modules from this file's own location and extension, so the
// aliases work whether we're running from src/ (.ts) or a shipped/baked dist/
// (.js) — no dependency on src/ being present alongside the compiled output.
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = extname(fileURLToPath(import.meta.url));
const lib = (name: string) => join(HERE, `${name}${EXT}`);

/**
 * Build jiti options that let wm.ts / command files import from
 * `@ldlework/workmark/*` and from workmark's own dependencies (zod, etc.)
 * regardless of how the package is installed, linked, or baked into a host.
 */
export function jitiOptions(opts?: Partial<JitiOptions>): JitiOptions {
  return {
    interopDefault: true,
    moduleCache: false,
    alias: {
      "@ldlework/workmark/types": lib("types"),
      "@ldlework/workmark/helpers": lib("helpers"),
      "@ldlework/workmark/define": lib("define"),
      "@ldlework/workmark/workspace": lib("workspace"),
      "@ldlework/workmark/project": lib("project"),
      "@ldlework/workmark": lib("load"),
    },
    nativeModules: ["zod", "@modelcontextprotocol/sdk"],
    ...opts,
  };
}
