import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { JitiOptions } from "jiti";

// Resolve the workmark package root from this file's location (src/lib/ or dist/lib/)
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC_LIB = join(PKG_ROOT, "src", "lib");

/**
 * Build jiti options that let wm.ts / command files import from
 * `@ldlework/workmark/*` and from workmark's own dependencies (zod, etc.)
 * regardless of how the package is installed or linked.
 */
export function jitiOptions(opts?: Partial<JitiOptions>): JitiOptions {
  return {
    interopDefault: true,
    moduleCache: false,
    alias: {
      "@ldlework/workmark/types": join(SRC_LIB, "types.ts"),
      "@ldlework/workmark/helpers": join(SRC_LIB, "helpers.ts"),
      "@ldlework/workmark/define": join(SRC_LIB, "define.ts"),
      "@ldlework/workmark/workspace": join(SRC_LIB, "workspace.ts"),
      "@ldlework/workmark/project": join(SRC_LIB, "project.ts"),
      "@ldlework/workmark": join(SRC_LIB, "load.ts"),
    },
    nativeModules: ["zod", "@modelcontextprotocol/sdk"],
    ...opts,
  };
}
