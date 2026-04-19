import { cmd } from "@ldlework/workmark/define";
import { ok, fail } from "@ldlework/workmark/helpers";
import { typecheckable } from "../../traits/typecheckable.js";

/** Typecheck all projects; report a concise pass/fail summary. */
export default cmd({
  needs: [typecheckable],
  select: "all",
  run: {
    reduce: (results) => {
      const failed = results.filter((r) => !r.ok);
      const passed = results.filter((r) => r.ok);
      const header =
        failed.length === 0
          ? `PASS  ${passed.length} project(s)`
          : `FAIL  ${failed.length} project(s), PASS ${passed.length}`;
      const body = failed
        .map((r) => `  x ${r.project}\n${(r.error ?? "").split("\n").map((l) => "    " + l).join("\n")}`)
        .join("\n\n");
      const passList = passed.length ? `\nPassed: ${passed.map((r) => r.project).join(", ")}` : "";
      const text = [header, body, passList].filter(Boolean).join("\n");
      return failed.length === 0 ? ok(text) : fail(text);
    },
  },
  handler: (_, { traits, sh }) => sh(traits.typecheckable.command, { timeout: traits.typecheckable.timeout }),
});
