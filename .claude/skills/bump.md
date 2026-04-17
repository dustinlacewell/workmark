---
name: bump
description: Bump version numbers across the three synced locations (workmark package.json, workmark-vsc package.json, install-ext.ts vsix filename) and create a version-only commit. Takes `major`, `minor`, or `patch` as argument.
---

# Version Bump

Updates workmark's version in all three synced locations and creates a version-only commit. Part of the [release process](./release.md) — runs as step 2.

## Usage

```
/bump major    # 1.3.1 → 2.0.0
/bump minor    # 1.3.1 → 1.4.0
/bump patch    # 1.3.1 → 1.3.2
```

If the user runs `/bump` with no argument, ask which of `major` / `minor` / `patch` they want rather than guessing.

## Procedure

1. **Read the current version** from `packages/workmark/package.json`. This is the source of truth.

2. **Compute the next version** by semver:
   - `major`: `X.Y.Z` → `(X+1).0.0`
   - `minor`: `X.Y.Z` → `X.(Y+1).0`
   - `patch`: `X.Y.Z` → `X.Y.(Z+1)`

3. **Update these three files** with the `Edit` tool:
   - `packages/workmark/package.json` — `"version": "<OLD>"` → `"version": "<NEW>"`
   - `packages/workmark-vsc/package.json` — `"version": "<OLD>"` → `"version": "<NEW>"`
   - `.wm/commands/dev/install-ext.ts` — `workmark-vsc-<OLD>.vsix` → `workmark-vsc-<NEW>.vsix`

4. **Verify**. Grep for the old version string across the three files; if any stragglers remain, the bump is incomplete — fix before committing.

5. **Commit** with the exact message `Bump to v<NEW>`. This must be a version-only commit — no unrelated changes staged.

6. **Report back**: old → new, list of files modified, commit sha.

## Non-goals

- No build, package, publish, or git tag. This is purely a version-string edit + commit.
- No release-notes generation.
- Follow up with `wm release <otp>` to publish the core package; see [release.md](./release.md) for the full workflow (vsce publish, GitHub release, etc.).

## Edge cases

- If the working tree is not clean (`git status --short` non-empty), stop and warn. The commit must be version-only.
- If the three files disagree on the current version, that's a pre-existing bug — stop and report the mismatch rather than guessing which one is authoritative.
- If the user passes something other than `major` / `minor` / `patch`, reject with a clear message.
