import {
  inlineLinkDisplayTextResolver,
  type NarrativeWorld,
  type PreparedNarrativeCorpus,
} from "../../src/narrative/model";

// Pinned canonical-data tests compare what a reader sees, not the inline entity
// link markup (ADR-0029, BOB-20261115-4CNJ7E). Prose passes through
// inlineLinksToPlainText via inlineLinkDisplayTextResolver: a link shows its
// label, or the target's name as of the given chapter.

const proseFields = ["description", "state", "current_state"] as const;
const resolvers = new WeakMap<
  PreparedNarrativeCorpus,
  ReturnType<typeof inlineLinkDisplayTextResolver>
>();

/** Display text of one prose value as of `chapter` (null is the zero state). */
export function plainProse(
  corpus: PreparedNarrativeCorpus,
  chapter: string | null,
  text: string,
): string {
  let resolve = resolvers.get(corpus);
  if (!resolve) {
    resolve = inlineLinkDisplayTextResolver(corpus);
    resolvers.set(corpus, resolve);
  }
  return resolve(text, chapter);
}

/** A copy of `world` whose entity prose fields are display text. */
export function plainProseWorld(
  corpus: PreparedNarrativeCorpus,
  world: NarrativeWorld,
): NarrativeWorld {
  return {
    ...world,
    entities: world.entities.map((entity) => {
      const copy = { ...entity };
      for (const field of proseFields) {
        const value = copy[field];
        if (typeof value === "string")
          copy[field] = plainProse(corpus, world.view.chapter, value);
      }
      return copy;
    }),
  };
}
