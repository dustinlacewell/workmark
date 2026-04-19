import type { Trait } from "./types.js";

/** Per-load trait registry. A fresh instance is created for each `loadWorkspace`
 * call so reloads don't trip duplicate-name checks against prior state. */
export class TraitRegistry {
  private readonly traits = new Map<string, Trait>();
  private readonly sources = new Map<string, string>();

  register(trait: Trait, sourceFile?: string): void {
    const existing = this.traits.get(trait.name);
    const prevSource = this.sources.get(trait.name);
    if (existing) {
      // Same source file re-executed (jiti moduleCache:false) is idempotent.
      // Different source files with the same name is an error.
      if (sourceFile && prevSource && sourceFile !== prevSource) {
        throw new Error(
          `Trait "${trait.name}" defined twice:\n  ${prevSource}\n  ${sourceFile}`,
        );
      }
      // Keep the first-registered trait object as canonical.
      return;
    }
    this.traits.set(trait.name, trait);
    if (sourceFile) this.sources.set(trait.name, sourceFile);
  }

  get(name: string): Trait | undefined {
    return this.traits.get(name);
  }

  require(name: string): Trait {
    const t = this.traits.get(name);
    if (!t) {
      const known = [...this.traits.keys()].join(", ") || "(none)";
      throw new Error(`Unknown trait "${name}". Known: ${known}`);
    }
    return t;
  }

  has(name: string): boolean {
    return this.traits.has(name);
  }

  all(): readonly Trait[] {
    return [...this.traits.values()];
  }
}

/** Ambient registry used by `defineTrait` at module-import time.
 *
 * Stored on `globalThis` so it survives the pnpm+jiti module-duplication problem:
 * the CLI's workmark module and the jiti-loaded trait file's workmark module are
 * distinct instances, but both see the same globalThis slot.
 *
 * The loader installs a fresh registry, imports trait files (which call
 * defineTrait → registerAmbient → reads this slot), then uninstalls. */
const GLOBAL_KEY = Symbol.for("workmark.ambientRegistry");
type GlobalSlot = { [K in typeof GLOBAL_KEY]?: TraitRegistry };

function slot(): GlobalSlot {
  return globalThis as unknown as GlobalSlot;
}

export function installRegistry(reg: TraitRegistry): void {
  slot()[GLOBAL_KEY] = reg;
}

export function uninstallRegistry(): void {
  delete slot()[GLOBAL_KEY];
}

export function registerAmbient(trait: Trait, sourceFile?: string): void {
  const reg = slot()[GLOBAL_KEY];
  if (!reg) {
    throw new Error(
      `defineTrait called outside of a workspace load. Traits must live in .wm/traits/*.ts files.`,
    );
  }
  reg.register(trait, sourceFile);
}
