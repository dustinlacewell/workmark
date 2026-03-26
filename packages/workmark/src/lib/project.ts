import { join } from "node:path";
import type { IProject, ProjectDef } from "./types.js";

export class Project implements IProject {
  readonly name: string;
  readonly dir: string;
  readonly tags: readonly string[];
  readonly capabilities: Readonly<Record<string, true | Record<string, unknown>>>;

  private readonly paths: Readonly<Record<string, string>>;

  constructor(def: ProjectDef, wsDir: string) {
    this.name = def.name;
    this.dir = def.dir ? join(wsDir, def.dir) : wsDir;
    this.tags = Object.freeze(def.tags ?? []);
    this.capabilities = Object.freeze(def.capabilities ?? {});
    this.paths = Object.freeze(def.paths ?? {});
  }

  has(capability: string): boolean {
    return capability in this.capabilities;
  }

  capability<T = true | Record<string, unknown>>(name: string): T {
    const cap = this.capabilities[name];
    if (cap === undefined) {
      throw new Error(`Project "${this.name}" does not have capability "${name}"`);
    }
    return cap as T;
  }

  path(name: string): string {
    const rel = this.paths[name];
    if (rel === undefined) {
      throw new Error(`Project "${this.name}" does not have path "${name}"`);
    }
    return join(this.dir, rel);
  }
}
