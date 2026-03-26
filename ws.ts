import { defineProject } from "@ldlework/workmark/define";

export default [
  defineProject({
    name: "workmark",
    dir: "packages/workmark",
    tags: ["core"],
  }),
  defineProject({
    name: "workmark-vsc",
    dir: "packages/workmark-vsc",
    tags: ["extension"],
  }),
];
