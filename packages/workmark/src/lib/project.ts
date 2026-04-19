import { join } from "node:path";
import type { IProject, ProjectDef, Trait } from "./types.js";
import type { TraitRegistry } from "./registry.js";

export class Project implements IProject {
  readonly name: string;
  readonly dir: string;
  readonly tags: readonly string[];
  readonly description?: string;

  /** Parsed (defaulted) trait data, keyed by trait name. */
  private readonly traitData: Readonly<Record<string, unknown>>;
  private readonly paths: Readonly<Record<string, string>>;

  constructor(def: ProjectDef, wsDir: string, traitData: Record<string, unknown>) {
    this.name = def.name;
    this.dir = def.dir ? join(wsDir, def.dir) : wsDir;
    this.tags = Object.freeze([...(def.tags ?? [])]);
    this.description = def.description;
    this.traitData = Object.freeze(traitData);
    this.paths = Object.freeze({ ...(def.paths ?? {}) });
  }

  hasTrait(trait: Trait | string): boolean {
    const name = typeof trait === "string" ? trait : trait.name;
    return name in this.traitData;
  }

  trait<T>(trait: Trait<string, T>): T {
    const data = this.traitData[trait.name];
    if (data === undefined) {
      throw new Error(
        `Project "${this.name}" does not fulfill trait "${trait.name}"`,
      );
    }
    return data as T;
  }

  path(name: string): string {
    const rel = this.paths[name];
    if (rel === undefined) {
      throw new Error(`Project "${this.name}" does not have path "${name}"`);
    }
    return join(this.dir, rel);
  }
}

/** Validate a project's `has` against the registry, returning parsed data. */
export function validateHas(
  def: ProjectDef,
  registry: TraitRegistry,
  sourceFile: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const has = def.has ?? {};
  for (const [traitName, raw] of Object.entries(has)) {
    const trait = registry.get(traitName);
    if (!trait) {
      const known = registry.all().map((t) => t.name).join(", ") || "(none)";
      throw new Error(
        `Project "${def.name}" declares has.${traitName}, but no such trait is defined\n  at ${sourceFile}\n  known traits: ${known}`,
      );
    }
    const result = trait.schema.safeParse(raw);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n");
      throw new Error(
        `Project "${def.name}" has.${traitName} failed validation:\n${issues}\n  at ${sourceFile}`,
      );
    }
    out[traitName] = result.data;
  }
  return out;
}
