import { z } from "zod";
import type {
  BaseCtx,
  FromArgsResolver,
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
import { FROM_ARGS, FROM_WORKSPACE } from "./types.js";
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
  for?: string;
  run?: RunOptions;
  args?: SchemaFields;
  flags?: SchemaFields;
  meta?: { name?: string; label?: string; description?: string };
  handler: (args: Record<string, unknown>, ctx: BaseCtx | NeedsCtx<Record<string, unknown>>) => HandlerReturn | Promise<HandlerReturn>;
}

/** Declare a command. `needs`, `args`, and `flags` are inferred for handler
 * typing; the framework manages the auto-generated `project` arg separately.
 *
 * `for`: bind the command to a named project. No project arg is exposed on any
 * surface; `ctx.project` is the bound project. Validated at load.
 */
export function cmd<
  const N extends readonly Trait<string, unknown>[] = readonly [],
  const A extends SchemaFields = Record<string, never>,
  const F extends SchemaFields = Record<string, never>,
>(def: {
  needs?: N;
  select?: SelectMode;
  for?: string;
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
  const marker = z.lazy(() => {
    throw new Error(
      "fromWorkspace marker used at runtime — the framework should have replaced it at load time",
    );
  }) as z.ZodType & { [FROM_WORKSPACE]?: FromWorkspaceResolver };
  marker[FROM_WORKSPACE] = resolver;
  return marker;
}

/** Declare a schema whose shape depends on other args supplied at invocation.
 * The framework resolves this per-call, AFTER other args are parsed. The
 * field's load-time JSON Schema is permissive (type-agnostic) — validation
 * runs at invocation with the resolved schema. */
export function fromArgs(resolver: FromArgsResolver): z.ZodType {
  const marker = z.any() as z.ZodType & { [FROM_ARGS]?: FromArgsResolver };
  marker[FROM_ARGS] = resolver;
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

/** Build a schema whose shape depends on a specific project's trait data.
 *
 * Usage: `traitField(docker, d => z.enum(d.buildable)).forProject("ghost")`.
 */
export function traitField<T extends Trait<string, unknown>>(
  trait: T,
  selector: (data: unknown) => z.ZodType,
): TraitFieldBuilder {
  return {
    forProject(name: string): z.ZodType {
      return fromWorkspace((ws) => {
        const project = ws.get(name);
        if (!project.hasTrait(trait)) {
          throw new Error(
            `traitField(${trait.name}).forProject("${name}") — project does not fulfill trait "${trait.name}"`,
          );
        }
        const data = project.trait(trait as Trait<string, unknown>);
        return selector(data);
      });
    },
    fromArg(argName: string): z.ZodType {
      return fromArgs((ws, args) => {
        const target = args[argName];
        if (typeof target !== "string") {
          throw new Error(
            `traitField(${trait.name}).fromArg("${argName}") — expected arg "${argName}" to be a project name string, got ${typeof target}`,
          );
        }
        const project = ws.get(target);
        if (!project.hasTrait(trait)) {
          throw new Error(
            `traitField(${trait.name}).fromArg("${argName}") — project "${target}" does not fulfill trait "${trait.name}"`,
          );
        }
        const data = project.trait(trait as Trait<string, unknown>);
        return selector(data);
      });
    },
  };
}

export interface TraitFieldBuilder {
  forProject(name: string): z.ZodType;
  fromArg(argName: string): z.ZodType;
}

// ---- Re-export select and run option types -----------------------------

export type { SelectMode, RunOptions, ReduceFn };
