import { describe, expect, it } from "vitest";
import {
  appVersionLabel,
  resolveAppVersion,
} from "../../src/version-resolution";

const SHA = "abc1234def5678901234567890abcdef12345678";

describe("app version resolution", () => {
  it("uses the release environment as is, without the tag's v", () => {
    expect(
      resolveAppVersion({
        envVersion: "0.9.0",
        envCommit: SHA,
        packageVersion: "0.9.0",
        describe: "v0.8.0-3-g1111111",
        headCommit: "2222222",
      }),
    ).toEqual({ version: "0.9.0", commit: SHA });
    expect(
      resolveAppVersion({ envVersion: "v1.2.3", packageVersion: "0.9.0" }),
    ).toEqual({ version: "1.2.3", commit: null });
  });

  it("takes the commit from git when the release environment has none", () => {
    expect(
      resolveAppVersion({
        envVersion: "0.9.0",
        packageVersion: "0.9.0",
        headCommit: SHA,
      }),
    ).toEqual({ version: "0.9.0", commit: SHA });
  });

  it("builds a dev version from the latest tag", () => {
    expect(
      resolveAppVersion({
        packageVersion: "0.9.0",
        describe: "v0.9.0-4-gabc1234",
        headCommit: SHA,
      }),
    ).toEqual({ version: "0.9.0-dev+abc1234", commit: SHA });
    expect(
      resolveAppVersion({
        packageVersion: "0.9.0",
        describe: "v0.9.1-rc.1-0-gabc1234-dirty",
        headCommit: null,
      }),
    ).toEqual({ version: "0.9.1-rc.1-dev+abc1234.dirty", commit: "abc1234" });
  });

  it("falls back to package.json before the first tag", () => {
    expect(
      resolveAppVersion({
        packageVersion: "0.9.0",
        describe: "abc1234",
        headCommit: SHA,
      }),
    ).toEqual({ version: "0.9.0-dev+abc1234", commit: SHA });
    expect(
      resolveAppVersion({ packageVersion: "0.9.0", describe: "abc1234-dirty" })
        .version,
    ).toBe("0.9.0-dev+abc1234.dirty");
  });

  it("works without git", () => {
    expect(
      resolveAppVersion({
        envVersion: "  ",
        envCommit: "not a sha",
        packageVersion: "0.9.0",
        describe: null,
        headCommit: null,
      }),
    ).toEqual({ version: "0.9.0-dev", commit: null });
  });

  it("labels the version with a short SHA unless it already has one", () => {
    expect(appVersionLabel({ version: "0.9.0", commit: SHA })).toBe(
      "Version 0.9.0 (abc1234)",
    );
    expect(appVersionLabel({ version: "0.9.0-dev+abc1234", commit: SHA })).toBe(
      "Version 0.9.0-dev+abc1234",
    );
    expect(appVersionLabel({ version: "0.9.0-dev", commit: null })).toBe(
      "Version 0.9.0-dev",
    );
  });
});
