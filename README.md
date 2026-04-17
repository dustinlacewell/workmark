# workmark

Define your workspace commands once in TypeScript. Run them from the terminal, a VS Code dashboard, or AI agents — all from the same source.

<div align="center">
<image src="screenshot.png" alt="Workmark VS Code extension screenshot" width="auto" />
</div>

## Packages

| Package | Description | Docs |
|---|---|---|
| [`@ldlework/workmark`](./packages/workmark) | Core framework — CLI, MCP server, project discovery | [README](./packages/workmark/README.md) |
| [`workmark-vsc`](./packages/workmark-vsc) | VS Code dashboard extension | [Marketplace](https://marketplace.visualstudio.com/items?itemName=ldlework.workmark-vsc) |
| [`@ldlework/workmark-site`](./packages/workmark-site) | Marketing site (internal) | — |

See [packages/workmark/README.md](./packages/workmark/README.md) for usage, APIs, and examples.

## Development

```bash
pnpm install
pnpm build            # build all packages
pnpm typecheck        # type-check all packages
```

This repo uses [workmark itself](./.wm/commands/dev/) for its dev commands:

```bash
wm build              # build everything
wm build workmark     # build a specific package
wm install-ext        # install the .vsix into VS Code / Windsurf
wm package-ext        # package the extension
```

## Release process

See [`.claude/skills/release.md`](./.claude/skills/release.md) for the full release workflow (npm + VS Code Marketplace + GitHub Release).

## License

MIT
