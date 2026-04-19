import { cmd } from "@ldlework/workmark/define";
import { buildable } from "../../traits/buildable.js";

/** Clean dist/ and tsbuildinfo across all buildable packages. */
export default cmd({
  needs: [buildable],
  select: "all",
  handler: (_, { sh }) => sh("rm -rf dist .vite-react-ssg-temp tsconfig.tsbuildinfo"),
});
