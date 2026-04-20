import { defineProject } from "@ldlework/workmark/define";

export default [
  defineProject({
    name: "workmark",
    dir: "packages/workmark",
    tags: ["core"],
    description: "CLI + MCP server library",
    has: {
      buildable: { command: "pnpm build" },
      typecheckable: true,
      publishable: { kind: "npm", npmName: "@ldlework/workmark" },
    },
  }),
  defineProject({
    name: "workmark-vsc",
    dir: "packages/workmark-vsc",
    tags: ["extension"],
    description: "VS Code dashboard extension",
    has: {
      buildable: { command: "pnpm build" },
      typecheckable: true,
      vscodeExtension: { publisher: "ldlework" },
      publishable: { kind: "vsce", publisher: "ldlework" },
    },
  }),
  defineProject({
    name: "workmark-site",
    dir: "packages/workmark-site",
    tags: ["site"],
    description: "Marketing site at workmark.ldlework.com",
    has: {
      buildable: { command: "pnpm build" },
      typecheckable: true,
    },
  }),
];
