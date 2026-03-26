import type { ProjectDef } from "./types.js";

/** Define a project. Identity function for type safety. */
export function defineProject(def: ProjectDef): ProjectDef {
  return def;
}
