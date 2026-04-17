import { dirname, join, relative } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createJiti } from "jiti";
import ignore, { type Ignore } from "ignore";
import { Project } from "./project.js";
import type { IProject, IWorkspace, ProjectDef } from "./types.js";
import { jitiOptions } from "./jiti-options.js";

export class Workspace implements IWorkspace {
  readonly root: string;
  readonly projects: readonly IProject[];

  private readonly byName: Map<string, IProject>;

  constructor(root: string, projects: IProject[]) {
    this.root = root;
    this.projects = Object.freeze(projects);
    this.byName = new Map(projects.map((p) => [p.name, p]));

    // Validate unique names
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

  withCapability(cap: string): IProject[] {
    return this.projects.filter((p) => p.has(cap));
  }

  withTag(tag: string): IProject[] {
    return this.projects.filter((p) => p.tags.includes(tag));
  }
}

/** Build an Ignore instance from .gitignore (if present) + hardcoded defaults. */
function loadIgnore(root: string): Ignore {
  const ig = ignore().add(["node_modules", "dist"]);
  const gitignorePath = join(root, ".gitignore");
  if (existsSync(gitignorePath)) {
    ig.add(readFileSync(gitignorePath, "utf-8"));
  }
  return ig;
}

/** Recursively find all wm.ts files, respecting .gitignore rules. */
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

/** Find the workspace root by walking up from cwd looking for .wm/. */
function findRoot(from: string): string {
  let dir = from;
  while (true) {
    if (existsSync(join(dir, ".wm"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Could not find workspace root (.wm/ directory)");
    dir = parent;
  }
}

export async function loadWorkspace(from?: string): Promise<Workspace> {
  const root = from ?? process.env.WORKSPACE_ROOT ?? findRoot(process.cwd());
  const jiti = createJiti(root, jitiOptions());

  // Recursively find all wm.ts files
  const wmFiles = findWmFiles(root);

  // Import each and build Project instances
  const projects: Project[] = [];

  for (const wmFile of wmFiles) {
    const dir = dirname(wmFile);
    let exported: unknown;
    try {
      exported = await jiti.import(wmFile);
    } catch (err) {
      // Log import failures — helps debug bad wm.ts files
      console.error(`[workspace] Skipping ${wmFile}: ${(err as Error).message}`);
      continue;
    }

    // jiti may return { default: ... } when interopDefault doesn't fully unwrap
    if (exported && typeof exported === "object" && "default" in (exported as Record<string, unknown>)) {
      exported = (exported as Record<string, unknown>).default;
    }

    const items: unknown[] = Array.isArray(exported) ? exported : [exported];

    for (const item of items) {
      if (item && typeof item === "object" && typeof (item as Record<string, unknown>).name === "string") {
        projects.push(new Project(item as ProjectDef, dir));
      }
    }
  }

  return new Workspace(root, projects);
}
