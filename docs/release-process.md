# Release process

Public releases of the Bobiverse companion are annotated semver tags on
`master`. The first public release is `v0.9.0`.

**The first tag waits for Maciej.** `v0.9.0` is created only after Maciej has
accepted the release visually on the LAN deploy (`bobiverse.local`) and given
his explicit go. Until then there is no tag and no Sysadmin build.

1. **Release notes first.** Add an entry for the new version at the top of
   `src/release-notes.ts` (newest first, short, friendly and spoiler-free), and
   set `version` in `package.json` to the same number. Land that through the
   normal change flow. The newest entry is what makes **What's new** open once
   for returning readers.
2. **Tag.** The developer creates an annotated tag on the landed `master`
   commit and pushes it: `git tag -a vX.Y.Z -m "Bobiverse vX.Y.Z"`, then
   `git push origin vX.Y.Z`. Tags are never moved or force-pushed.
3. **LAN deploy.** The tagged commit is deployed to the LAN site
   (`bobiverse.local`) for a final check. That build has no release environment,
   so About shows a `git describe` version such as `0.9.0-dev+abc1234`.
4. **Maciej's go.** Maciej checks the LAN deploy and gives an explicit go for
   that tag.
5. **Public release.** Only then does the Sysadmin run
   `~grok-sysadmin/bin/bobiverse-release --build-only vX.Y.Z`, check the build,
   and run `~grok-sysadmin/bin/bobiverse-release --activate vX.Y.Z`.

The release script requires an annotated tag and builds in a clean worktree:
`npm ci`, `npm run narrative:manifest`, `npx tsc -b && npm run narrative:validate`,
then `env VITE_APP_VERSION=X.Y.Z BOBIVERSE_COMMIT=<sha> npx vite build`.
`vite.config.ts` passes those two variables to the app (About shows
`Version X.Y.Z (<short sha>)`); without them it falls back to `git describe`, or
to the `package.json` version, and never fails without git
(`src/version-resolution.ts`).
