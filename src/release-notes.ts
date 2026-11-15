// What's new release notes, newest first. Maciej may edit this file directly:
// add a new entry at the top for each release (before tagging it), keep the
// text short and spoiler-free, and never mention a chapter's events.
// The newest entry's version decides when What's new opens by itself for
// returning readers (see src/whats-new.ts).

export interface ReleaseNote {
  /** Semver without the tag's "v", e.g. "0.9.0". */
  version: string;
  /** One friendly sentence shown under the version heading. */
  summary: string;
  /** Short bullet points. */
  highlights: readonly string[];
}

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: "0.9.0",
    summary:
      "The first public release of this spoiler-free companion to the Bobiverse books.",
    highlights: [
      "A true-scale 3D map of the stars near Sol, built from real astronomy catalogues.",
      "Set the chapter you have read up to, and everything follows it: nothing from later chapters is shown. Switch between chapter and date views to follow the story in reading order or in story time.",
      "Search for stars, planets, characters, vessels and events, and open an info card for each one.",
      "What is this? explains how to use the companion and credits the data and artwork behind it.",
    ],
  },
];

export const NEWEST_RELEASE_NOTES_VERSION = RELEASE_NOTES[0]!.version;
