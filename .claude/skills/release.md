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

Run `/bump major|minor|patch` (see [bump.md](./bump.md)). The skill handles all three synced locations and commits the result as a version-only commit.

### 3. Build

```bash
pnpm build
```

Builds all three packages (core via `tsc`, extension via `esbuild` + `vite`, site via `vite-react-ssg`).

### 4. Package the extension

```bash
wm dev:package-ext workmark-vsc
```

Produces `packages/workmark-vsc/workmark-vsc-X.Y.Z.vsix`. Equivalent to running `npx @vscode/vsce package --no-dependencies` from the extension dir.

### 5. Smoke-test the extension

```bash
wm dev:install-ext workmark-vsc
```

Installs the just-packaged vsix into VS Code / Windsurf. Reload the editor window and exercise the dashboard before shipping — catches broken builds before they reach users.

### 6. Push and create GitHub release

```bash
git push origin main
gh release create vX.Y.Z packages/workmark-vsc/workmark-vsc-X.Y.Z.vsix \
  --title "vX.Y.Z" --notes "release notes here"
```

Attach the `.vsix` as a release asset so users can install manually. The marketing site deploys from `main` automatically via the `site.yml` workflow — nothing to do for it.

### 7. Publish to npm

```bash
wm dev:publish workmark --otp=CODE
```

- Requires `npm login` beforehand — a stale token manifests as a misleading `404` on publish, not `401`. If the publish 404s, run `npm whoami` to confirm auth.
- Account has 2FA enabled — provide the OTP via `--otp=CODE`. OTPs rotate every ~30s, so grab it fresh.
- The command polls npm afterwards until the version is visible and prints the npm link.

### 8. Publish to VS Code Marketplace

```bash
wm dev:publish workmark-vsc
```

- Requires a Personal Access Token from Azure DevOps with `Marketplace (Manage)` scope.
- Run `npx @vscode/vsce login ldlework` to authenticate if the token has expired (expect `TF400813` on auth failure).
- Publisher is `ldlework`.

## Gotchas

- `vsce publish` must run from the extension directory; `wm dev:publish workmark-vsc` handles the `cwd` correctly.
- `npm publish` needs both a logged-in session *and* the OTP — a missing session 404s rather than 401s.
- Marketplace PATs expire silently; rotate via `vsce login`.
- The site deploy happens on `git push origin main`; if the site changes need to be visible, push before publishing npm so everything goes live in the same window.
