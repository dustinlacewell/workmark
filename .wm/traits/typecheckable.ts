import { z } from "zod";
import { defineTrait } from "@ldlework/workmark/define";

/** Projects with a typecheck step. */
export const typecheckable = defineTrait({
  name: "typecheckable",
  schema: z.object({
    command: z.string().default("pnpm typecheck"),
    timeout: z.number().default(120_000),
  }).default({}),
});
