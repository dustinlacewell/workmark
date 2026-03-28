# Release Process

## Overview

Workmark has three release targets:
- **npm**: `@ldlework/workmark` (the core framework)
- **VS Code Marketplace**: `ldlework.workmark-vsc` (the dashboard extension)
- **GitHub Releases**: tag + `.vsix` asset for manual install

All three should be published together at the same version.

## Steps

### 1. Commit all pending changes

Stage and commit any outstanding work before bumping versions.

### 2. Bump versions

Update the version in **all** of these locations:
- `packages/workmark/package.json` — the npm package version
- `packages/workmark-vsc/package.json` — the extension version
- `.ws/commands/dev/install-ext.ts` — hardcoded `.vsix` filename reference
- `README.md` — the `code --install-extension workmark-vsc-X.Y.Z.vsix` example

Commit the version bump separately from feature work.

### 3. Build

```bash
pnpm build
```

This builds both packages (core via `tsc`, extension via `esbuild` + `vite`).

### 4. Package the extension

```bash
cd packages/workmark-vsc
npx @vscode/vsce package --no-dependencies
```

This produces `packages/workmark-vsc/workmark-vsc-X.Y.Z.vsix`.

The `--no-dependencies` flag is required because the extension bundles its dependencies via esbuild.

Warnings about missing `repository` field and `LICENSE` in the extension package are expected (the license lives at the repo root).

### 5. Push and create GitHub release

```bash
git push origin main
gh release create vX.Y.Z packages/workmark-vsc/workmark-vsc-X.Y.Z.vsix \
  --title "vX.Y.Z" --notes "release notes here"
```

Attach the `.vsix` file as a release asset so users can install manually.

### 6. Publish to npm

```bash
cd packages/workmark
pnpm publish --access public
```

- Requires `npm login` beforehand
- Account has 2FA enabled — will prompt for an OTP from authenticator
- Pass `--otp=CODE` to provide it non-interactively

### 7. Publish to VS Code Marketplace

```bash
cd packages/workmark-vsc
npx @vscode/vsce publish --no-dependencies
```

- Requires a Personal Access Token from Azure DevOps with `Marketplace (Manage)` scope
- Run `npx @vscode/vsce login ldlework` to authenticate if the token has expired
- **Must be run from `packages/workmark-vsc/`**, not the repo root (root `package.json` lacks `engines.vscode`)
- Publisher is `ldlework`

## Gotchas

- The `install-ext.ts` command has a hardcoded vsix filename — must be updated on every version bump
- `vsce publish` must run from the extension directory, not the repo root
- npm publish requires OTP (2FA is enabled on the account)
- The marketplace PAT can expire — if you get a `TF400813` auth error, re-authenticate with `vsce login`
