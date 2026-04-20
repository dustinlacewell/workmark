---
name: bump
description: Bump both workmark and workmark-vsc package.json versions in lockstep, and create a version-only commit. Takes `major`, `minor`, or `patch` as argument.
---

# Version Bump

Policy: **`workmark` and `workmark-vsc` always share a version.** The VS Code extension is kept compatible with every change to workmark core — never allowed to drift. Whenever core changes, the extension is also updated (either a real code change that supports the new core behavior, or a no-op version bump to stay in lockstep).

This skill enforces that invariant on every bump.

## Usage

```
/bump major    # X.Y.Z → (X+1).0.0
/bump minor    # X.Y.Z → X.(Y+1).0
/bump patch    # X.Y.Z → X.Y.(Z+1)
```

If the user runs `/bump` with no argument, ask which of `major` / `minor` / `patch` they want — don't guess.

## Procedure

1. **Read the current version** from `packages/workmark/package.json`. This is the source of truth for "what's the current published version." `workmark-vsc/package.json` may have drifted — treat its value as stale input, not authoritative.

2. **Compute the next version** by semver from the core package's current version.

3. **Update these two files** with the `Edit` tool:
   - `packages/workmark/package.json` — `"version": "<CURRENT_CORE>"` → `"version": "<NEW>"`
   - `packages/workmark-vsc/package.json` — `"version": "<WHATEVER>"` → `"version": "<NEW>"` (forces the resync regardless of current drift)

4. **Verify**. `grep -n "<NEW>" packages/workmark/package.json packages/workmark-vsc/package.json` should find exactly two matches. Anything else signals an incomplete or over-eager edit.

5. **Commit** with the exact message `Bump to v<NEW>`. This must be a version-only commit — no unrelated changes staged.

6. **Report back**: old core version → new, how vsc was realigned (old vsc version → new, if they differed), and the commit sha.

## Non-goals

- No build, package, publish, or git tag. This is purely a version-string edit + commit.
- No release-notes generation.
- Follow up with `wm dev:publish <project> --otp=<otp>` to publish; see [release.md](./release.md) for the full workflow (vsce publish, GitHub release, etc.).

## Edge cases

- If the working tree is not clean (`git status --short` non-empty), stop and warn. The commit must be version-only.
- If the user passes something other than `major` / `minor` / `patch`, reject with a clear message.
- **Version drift is not an error.** If the three files disagree on the current version, that's the exact state this skill resolves — drive all three to `<NEW>` derived from the core package, and mention the realignment in the report.
