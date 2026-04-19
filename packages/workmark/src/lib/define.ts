import { z } from "zod";
import type {
  BaseCtx,
  FromWorkspaceResolver,
  HandlerReturn,
  IWorkspace,
  NeedsCtx,
  ProjectDef,
  ReduceFn,
  RunOptions,
  SchemaFields,
  SelectMode,
  Trait,
} from "./types.js";
import { FROM_WORKSPACE } from "./types.js";
import { registerAmbient } from "./registry.js";

// ---- defineTrait -------------------------------------------------------

/** Declare a trait: a named schema that projects fulfill and commands require. */
export function defineTrait<N extends string, S extends z.ZodType>(def: {
  name: N;
  schema: S;
  description?: string;
}): Trait<N, z.output<S>> {
  const trait = {
    name: def.name,
    schema: def.schema,
    description: def.description,
  } as Trait<N, z.output<S>>;
  // Register into ambient registry (installed by the loader during trait import).
  registerAmbient(trait);
  return trait;
}

// ---- defineProject -----------------------------------------------------

export function defineProject(def: ProjectDef): ProjectDef {
  return def;
}

// ---- Type inference machinery -----------------------------------------

type TraitsOf<N extends readonly Trait<string, unknown>[]> = {
  [K in N[number] as K["name"]]: K extends Trait<string, infer T> ? T : never;
};

type InferField<F> = F extends z.ZodType ? z.output<F> : unknown;

type InferFields<R extends SchemaFields | undefined> = R extends SchemaFields
  ? { [K in keyof R]: InferField<R[K]> }
  : Record<string, never>;

type CtxFor<N extends readonly Trait<string, unknown>[]> = N extends readonly []
  ? BaseCtx
  : NeedsCtx<TraitsOf<N>>;

// ---- cmd() -------------------------------------------------------------

export interface StaticCommandDef {
  needs?: readonly Trait[];
  select?: SelectMode;
  run?: RunOptions;
  args?: SchemaFields;
  flags?: SchemaFields;
  meta?: { name?: string; label?: string; description?: string };
  handler: (args: Record<string, unknown>, ctx: BaseCtx | NeedsCtx<Record<string, unknown>>) => HandlerReturn | Promise<HandlerReturn>;
}

/** Declare a command. `needs`, `args`, and `flags` are inferred for handler
 * typing; the framework manages the auto-generated `project` arg separately. */
export function cmd<
  const N extends readonly Trait<string, unknown>[] = readonly [],
  const A extends SchemaFields = Record<string, never>,
  const F extends SchemaFields = Record<string, never>,
>(def: {
  needs?: N;
  select?: SelectMode;
  run?: RunOptions;
  args?: A;
  flags?: F;
  meta?: { name?: string; label?: string; description?: string };
  handler: (
    args: InferFields<A> & InferFields<F>,
    ctx: CtxFor<N>,
  ) => HandlerReturn | Promise<HandlerReturn>;
}): StaticCommandDef {
  return def as unknown as StaticCommandDef;
}

export const defineCommand = cmd;

// ---- fromWorkspace ------------------------------------------------------

/** Declare a schema that depends on workspace state. The framework resolves
 * the marker during command load and substitutes the returned zod schema. */
export function fromWorkspace(resolver: FromWorkspaceResolver): z.ZodType {
  // We create a lazy zod so it participates in type chaining, but stamp it with
  // the FROM_WORKSPACE symbol so the loader can detect and replace it before
  // JSON Schema conversion.
  const marker = z.lazy(() => {
    throw new Error(
      "fromWorkspace marker used at runtime — the framework should have replaced it at load time",
    );
  }) as z.ZodType & { [FROM_WORKSPACE]?: FromWorkspaceResolver };
  marker[FROM_WORKSPACE] = resolver;
  return marker;
}

/** Shortcut: enum of project names fulfilling a trait. */
export function projectsOf(trait: Trait): z.ZodType {
  return fromWorkspace((ws) => {
    const names = ws.withTrait(trait).map((p) => p.name);
    if (names.length === 0) {
      throw new Error(`No projects fulfill trait "${trait.name}"`);
    }
    return z.enum(names as [string, ...string[]]);
  });
}

// ---- Re-export select and run option types -----------------------------

export type { SelectMode, RunOptions, ReduceFn };
