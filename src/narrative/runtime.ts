import assets from "../../data/narrative/assets.json";
import zeroState from "../../data/narrative/baseline/zero-state.json";
import books from "../../data/narrative/books.json";
import manifest from "../../generated/narrative/chapter-manifest.json";
import { nearbySystems } from "../domain/data";
import type { NarrativeCorpus, NarrativeRecord } from "./model";
import type { NarrativeChapterSummary } from "./progress";

const modules = import.meta.glob("../../data/narrative/chapters/*/*.json", {
  eager: true,
  import: "default",
});

function record(value: unknown, label: string): NarrativeRecord {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object.`);
  return value as NarrativeRecord;
}

function chapterNumber(chapter: string): [number, number] {
  const [book, number] = chapter.split(".").map(Number);
  return [book!, number!];
}

export const narrativeCorpus: NarrativeCorpus = (() => {
  const entries = record(manifest, "Generated chapter manifest").chapters;
  if (!Array.isArray(entries))
    throw new Error("Generated chapter manifest has no chapters.");
  const chapters = entries.map((entry) => {
    const manifestEntry = record(entry, "Generated chapter manifest entry");
    const chapter = manifestEntry.chapter;
    const sourcePath = manifestEntry.path;
    if (typeof chapter !== "string" || typeof sourcePath !== "string")
      throw new Error("Generated chapter manifest entry is invalid.");
    const source = modules[`../../data/narrative/${sourcePath}`];
    if (!source)
      throw new Error(
        `Generated chapter manifest references missing source: ${sourcePath}.`,
      );
    const result = record(source, `Chapter source ${sourcePath}`);
    if (result.chapter !== chapter)
      throw new Error(
        `Generated chapter manifest path disagrees with chapter ${chapter}.`,
      );
    return result;
  });
  return {
    assets: record(assets, "Asset registry"),
    zeroState: record(zeroState, "Zero state"),
    books: record(books, "Book catalogue"),
    chapters,
    knownAstronomyObjectIds:
      nearbySystems?.systems.map((system) => system.id) ?? [],
  };
})();

export const narrativeChapters: NarrativeChapterSummary[] =
  narrativeCorpus.chapters
    .map((chapter) => {
      const reference = String(chapter.chapter);
      const [book] = chapterNumber(reference);
      const catalogue = record(
        narrativeCorpus.books.books,
        "Book catalogue books",
      );
      const bookRecord = record(catalogue[String(book)], `Book ${book}`);
      return {
        chapter: reference,
        title: String(chapter.title),
        date: String(chapter.date),
        bookTitle: String(bookRecord.title),
      };
    })
    .sort((left, right) => {
      const [leftBook, leftChapter] = chapterNumber(left.chapter);
      const [rightBook, rightChapter] = chapterNumber(right.chapter);
      return leftBook - rightBook || leftChapter - rightChapter;
    });
