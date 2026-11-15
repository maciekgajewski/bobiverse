import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  emptyReaderProgress,
  forgetReaderProgress,
  persistReaderProgress,
} from "../../src/narrative/progress";
import {
  NEWEST_RELEASE_NOTES_VERSION,
  RELEASE_NOTES,
} from "../../src/release-notes";
import {
  compareReleaseVersions,
  markWhatsNewSeen,
  shouldAutoShowWhatsNew,
  WHATS_NEW_STORAGE_KEY,
} from "../../src/whats-new";
import { blockLocalStorage } from "../fixtures/blocked-storage";

const APP_STATE = "bobiverse.app-state.v2";

describe("What's new auto-show", () => {
  beforeEach(() => window.localStorage.clear());

  it("compares release versions numerically", () => {
    expect(compareReleaseVersions("0.9.0", "0.10.0")).toBe(-1);
    expect(compareReleaseVersions("1.0.0", "0.10.0")).toBe(1);
    expect(compareReleaseVersions("v0.9.0", "0.9.0")).toBe(0);
    expect(compareReleaseVersions("0.9.0-dev+abc1234", "0.9.0")).toBe(0);
    expect(compareReleaseVersions("garbage", "0.9.0")).toBe(-1);
  });

  it("does not show on a first visit and records the newest notes", () => {
    expect(shouldAutoShowWhatsNew(window.localStorage, "0.9.0")).toBe(false);
    expect(window.localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBe("0.9.0");
    // The same browser later stays quiet for this version.
    window.localStorage.setItem(APP_STATE, "{}");
    expect(shouldAutoShowWhatsNew(window.localStorage, "0.9.0")).toBe(false);
  });

  it("ignores other sites' keys when telling a first visit apart", () => {
    window.localStorage.setItem("other.app", "1");
    expect(shouldAutoShowWhatsNew(window.localStorage, "0.9.0")).toBe(false);
  });

  it("shows for a returning reader with no record or an older one", () => {
    window.localStorage.setItem(APP_STATE, "{}");
    expect(shouldAutoShowWhatsNew(window.localStorage, "0.9.0")).toBe(true);
    expect(window.localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBeNull();
    window.localStorage.setItem(WHATS_NEW_STORAGE_KEY, "0.8.2");
    expect(shouldAutoShowWhatsNew(window.localStorage, "0.9.0")).toBe(true);
  });

  it("does not show for the same or a newer recorded version", () => {
    window.localStorage.setItem(WHATS_NEW_STORAGE_KEY, "0.9.0");
    expect(shouldAutoShowWhatsNew(window.localStorage, "0.9.0")).toBe(false);
    window.localStorage.setItem(WHATS_NEW_STORAGE_KEY, "1.0.0");
    expect(shouldAutoShowWhatsNew(window.localStorage, "0.9.0")).toBe(false);
  });

  it("records the newest notes on close", () => {
    window.localStorage.setItem(WHATS_NEW_STORAGE_KEY, "0.8.0");
    markWhatsNewSeen(window.localStorage, "0.9.0");
    expect(window.localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBe("0.9.0");
  });

  it("never throws when storage is unavailable", () => {
    const broken = {
      get length(): number {
        throw new Error("denied");
      },
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    expect(shouldAutoShowWhatsNew(broken, "0.9.0")).toBe(false);
    expect(() => markWhatsNewSeen(broken, "0.9.0")).not.toThrow();
  });

  it("is cleared by Forget my progress", () => {
    window.localStorage.setItem(WHATS_NEW_STORAGE_KEY, "0.9.0");
    window.localStorage.setItem(APP_STATE, "{}");
    forgetReaderProgress();
    expect(window.localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(APP_STATE)).toBeNull();
  });
});

describe("release notes", () => {
  it("lists unique semver releases, newest first", () => {
    const versions = RELEASE_NOTES.map((note) => note.version);
    expect(versions.length).toBeGreaterThan(0);
    expect(new Set(versions).size).toBe(versions.length);
    for (const version of versions) expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    for (let index = 1; index < versions.length; index += 1)
      expect(
        compareReleaseVersions(versions[index - 1]!, versions[index]!),
      ).toBe(1);
    expect(NEWEST_RELEASE_NOTES_VERSION).toBe(versions[0]);
    for (const note of RELEASE_NOTES) {
      expect(note.summary.trim()).not.toBe("");
      expect(note.highlights.length).toBeGreaterThan(0);
    }
  });

  it("has notes for the first public release", () => {
    expect(RELEASE_NOTES.at(-1)!.version).toBe("0.9.0");
  });
});

describe("blocked localStorage", () => {
  let restore: (() => void) | null = null;
  beforeEach(() => {
    window.localStorage.clear();
    restore = blockLocalStorage();
  });
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it("really throws on reading window.localStorage", () => {
    expect(() => window.localStorage).toThrow();
  });

  it("never auto-shows and never throws on the read path", () => {
    expect(() => shouldAutoShowWhatsNew()).not.toThrow();
    expect(shouldAutoShowWhatsNew()).toBe(false);
  });

  it("closes without throwing on the write path", () => {
    expect(() => markWhatsNewSeen()).not.toThrow();
  });

  it("forgets and saves progress without throwing", () => {
    expect(forgetReaderProgress()).toEqual(emptyReaderProgress());
    expect(() =>
      persistReaderProgress({
        ...emptyReaderProgress(),
        furthestChapterRead: "1.1",
        viewChapter: "1.1",
      }),
    ).not.toThrow();
    expect(() => persistReaderProgress(emptyReaderProgress())).not.toThrow();
  });
});
