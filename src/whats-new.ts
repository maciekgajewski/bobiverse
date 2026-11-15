import { APP_STORAGE_PREFIX } from "./narrative/progress";
import { NEWEST_RELEASE_NOTES_VERSION } from "./release-notes";

/**
 * The newest release-notes version this browser has seen. It uses the app's
 * storage prefix, so About's "Forget my progress" clears it too.
 */
export const WHATS_NEW_STORAGE_KEY = `${APP_STORAGE_PREFIX}whats-new.last-seen`;

/** Compares "x.y.z" versions numerically; anything after the core is ignored. */
export function compareReleaseVersions(left: string, right: string): number {
  const parts = (version: string) =>
    (/^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim()) ?? [null, 0, 0, 0])
      .slice(1)
      .map(Number);
  const [a, b] = [parts(left), parts(right)];
  for (let index = 0; index < 3; index += 1) {
    if (a[index]! !== b[index]!) return a[index]! < b[index]! ? -1 : 1;
  }
  return 0;
}

function hasOtherAppState(storage: Storage): boolean {
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(APP_STORAGE_PREFIX) && key !== WHATS_NEW_STORAGE_KEY)
      return true;
  }
  return false;
}

/**
 * Whether What's new should open by itself at start-up. Call it before the
 * app writes any state of its own. Without usable storage it never shows.
 *
 * - First visit (no app-owned keys at all): do not show; record the newest
 *   version so this release's notes never pop up later.
 * - Returning reader without a record (app state from before What's new
 *   existed), or with an older one: show.
 * - Same or newer version recorded: do not show.
 */
export function shouldAutoShowWhatsNew(
  storage?: Storage,
  newest: string = NEWEST_RELEASE_NOTES_VERSION,
): boolean {
  // Reading window.localStorage itself can throw (Firefox with cookies
  // blocked, some WebViews), so it is resolved inside the try.
  try {
    storage ??= window.localStorage;
    const seen = storage.getItem(WHATS_NEW_STORAGE_KEY);
    if (seen === null) {
      if (hasOtherAppState(storage)) return true;
      storage.setItem(WHATS_NEW_STORAGE_KEY, newest);
      return false;
    }
    return compareReleaseVersions(seen, newest) < 0;
  } catch {
    return false;
  }
}

/** Records that the newest release notes were seen (on closing the dialog). */
export function markWhatsNewSeen(
  storage?: Storage,
  newest: string = NEWEST_RELEASE_NOTES_VERSION,
): void {
  try {
    (storage ?? window.localStorage).setItem(WHATS_NEW_STORAGE_KEY, newest);
  } catch {
    // Storage can be blocked or full; the dialog still closes.
  }
}
