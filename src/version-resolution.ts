// Resolves the app version shown in About. Pure, so vite.config.ts and the
// unit tests share it; vite.config.ts supplies the environment and git output.
//
// - A release build (`~grok-sysadmin/bin/bobiverse-release`) sets
//   VITE_APP_VERSION (the tag without its "v") and BOBIVERSE_COMMIT.
// - Otherwise (dev server, tests, the LAN deploy) the version comes from
//   `git describe --tags --long --dirty --always`, as `<tag>-dev+<sha>`, or
//   `<package.json version>-dev+<sha>` before the first tag.
// - Without git it is `<package.json version>-dev`; it never throws.

export interface AppVersionInputs {
  /** VITE_APP_VERSION from the environment, if set. */
  envVersion?: string | null;
  /** BOBIVERSE_COMMIT from the environment, if set. */
  envCommit?: string | null;
  /** The `version` field of package.json. */
  packageVersion: string;
  /** Output of `git describe --tags --long --dirty --always`, or null. */
  describe?: string | null;
  /** Output of `git rev-parse HEAD`, or null. */
  headCommit?: string | null;
}

export interface AppVersion {
  version: string;
  /** Full or abbreviated commit SHA, or null when unknown. */
  commit: string | null;
}

const DESCRIBE_WITH_TAG = /^v?(.+)-(\d+)-g([0-9a-f]{4,40})(-dirty)?$/;
const DESCRIBE_WITHOUT_TAG = /^([0-9a-f]{4,40})(-dirty)?$/;
const COMMIT = /^[0-9a-f]{4,40}$/;

function cleanCommit(value: string | null | undefined): string | null {
  const commit = value?.trim().toLowerCase();
  return commit && COMMIT.test(commit) ? commit : null;
}

export function resolveAppVersion(inputs: AppVersionInputs): AppVersion {
  const envVersion = inputs.envVersion?.trim().replace(/^v/, "");
  const commit =
    cleanCommit(inputs.envCommit) ?? cleanCommit(inputs.headCommit);
  if (envVersion) return { version: envVersion, commit };
  const describe = inputs.describe?.trim() ?? "";
  const tagged = DESCRIBE_WITH_TAG.exec(describe);
  const untagged = tagged ? null : DESCRIBE_WITHOUT_TAG.exec(describe);
  if (tagged || untagged) {
    const base = tagged ? tagged[1]! : inputs.packageVersion;
    const sha = tagged ? tagged[3]! : untagged![1]!;
    const dirty = tagged ? tagged[4] : untagged![2];
    return {
      version: `${base}-dev+${sha}${dirty ? ".dirty" : ""}`,
      commit: commit ?? sha,
    };
  }
  return { version: `${inputs.packageVersion}-dev`, commit };
}

/** "Version 0.9.0 (abc1234)"; the SHA is left out when the version has it. */
export function appVersionLabel({ version, commit }: AppVersion): string {
  const short = commit?.slice(0, 7);
  return short && !version.includes(short)
    ? `Version ${version} (${short})`
    : `Version ${version}`;
}
