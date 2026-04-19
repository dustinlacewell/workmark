import { dirname, join, relative } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createJiti } from "jiti";
import ignore, { type Ignore } from "ignore";
import { Project, validateHas } from "./project.js";
import type { IProject, IWorkspace, ProjectDef, Trait } from "./types.js";
import { TraitRegistry, installRegistry, uninstallRegistry } from "./registry.js";
import { jitiOptions } from "./jiti-options.js";

export class Workspace implements IWorkspace {
  readonly root: string;
  readonly projects: readonly IProject[];
  /** Trait registry populated during load. Exposed for command-load phase. */
  readonly traits: TraitRegistry;

  private readonly byName: Map<string, IProject>;

  constructor(root: string, projects: IProject[], traits: TraitRegistry) {
    this.root = root;
    this.projects = Object.freeze([...projects]);
    this.traits = traits;
    this.byName = new Map(projects.map((p) => [p.name, p]));

    if (this.byName.size !== projects.length) {
      const seen = new Set<string>();
      for (const p of projects) {
        if (seen.has(p.name)) throw new Error(`Duplicate project name: "${p.name}"`);
        seen.add(p.name);
      }
    }
  }

  get(name: string): IProject {
    const p = this.byName.get(name);
    if (!p) throw new Error(`Unknown project: "${name}"`);
    return p;
  }

  withTrait(trait: Trait | string): IProject[] {
    const name = typeof trait === "string" ? trait : trait.name;
    return this.projects.filter((p) => p.hasTrait(name));
  }

  withTag(tag: string): IProject[] {
    return this.projects.filter((p) => p.tags.includes(tag));
  }
}

// ---- Discovery ---------------------------------------------------------

function loadIgnore(root: string): Ignore {
  const ig = ignore().add(["node_modules", "dist"]);
  const gitignorePath = join(root, ".gitignore");
  if (existsSync(gitignorePath)) {
    ig.add(readFileSync(gitignorePath, "utf-8"));
  }
  return ig;
}

function findWmFiles(root: string): string[] {
  const ig = loadIgnore(root);
  const results: string[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = relative(root, join(dir, entry.name));
      if (entry.isDirectory()) {
        if (!ig.ignores(rel + "/")) walk(join(dir, entry.name));
      } else if (entry.name === "wm.ts") {
        results.push(join(dir, entry.name));
      }
    }
  }

  walk(root);
  return results;
}

function findTraitFiles(root: string): string[] {
  const traitsDir = join(root, ".wm", "traits");
  if (!existsSync(traitsDir)) return [];
  const out: string[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        out.push(full);
      }
    }
  }
  walk(traitsDir);
  return out;
}

function findRoot(from: string): string {
  let dir = from;
  while (true) {
    if (existsSync(join(dir, ".wm"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Could not find workspace root (.wm/ directory)");
    dir = parent;
  }
}

// ---- Load --------------------------------------------------------------

async function loadTraits(root: string, jiti: ReturnType<typeof createJiti>): Promise<TraitRegistry> {
  const registry = new TraitRegistry();
  installRegistry(registry);
  for (const file of findTraitFiles(root)) {
    try {
      await jiti.import(file);
    } catch (err) {
      uninstallRegistry();
      throw new Error(`Failed to import trait file ${file}: ${(err as Error).message}`);
    }
  }
  // Registry stays installed — command loading re-executes trait files
  // under jiti moduleCache:false, and those defineTrait calls need it.
  return registry;
}

async function loadProjects(
  root: string,
  jiti: ReturnType<typeof createJiti>,
  registry: TraitRegistry,
): Promise<Project[]> {
  const projects: Project[] = [];
  for (const wmFile of findWmFiles(root)) {
    const dir = dirname(wmFile);
    let exported: unknown;
    try {
      exported = await jiti.import(wmFile);
    } catch (err) {
      throw new Error(`Failed to import ${wmFile}: ${(err as Error).message}`);
    }
    if (exported && typeof exported === "object" && "default" in (exported as Record<string, unknown>)) {
      exported = (exported as Record<string, unknown>).default;
    }
    const items: unknown[] = Array.isArray(exported) ? exported : [exported];
    for (const item of items) {
      if (item && typeof item === "object" && typeof (item as Record<string, unknown>).name === "string") {
        const def = item as ProjectDef;
        const traitData = validateHas(def, registry, wmFile);
        projects.push(new Project(def, dir, traitData));
      }
    }
  }
  return projects;
}

export async function loadWorkspace(from?: string): Promise<Workspace> {
  const root = from ?? process.env.WORKSPACE_ROOT ?? findRoot(process.cwd());
  const jiti = createJiti(root, jitiOptions());

  const registry = await loadTraits(root, jiti);
  const projects = await loadProjects(root, jiti, registry);

  return new Workspace(root, projects, registry);
}
