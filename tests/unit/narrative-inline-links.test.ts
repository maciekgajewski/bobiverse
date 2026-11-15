import { describe, expect, it } from "vitest";
import {
  inlineLinkDisplayTextResolver,
  preparedInlineLinkFallbackLabels,
  prepareNarrativeCorpus,
  validateNarrativeCorpus,
  type NarrativeCorpus,
  type NarrativeRecord,
} from "../../src/narrative/model";
import { createNarrativeFixtureCorpus } from "../fixtures/narrative";

// Every text here is synthetic. No book text is read or written.

type Chapter = NarrativeRecord & {
  introducing?: NarrativeRecord[];
  updates?: NarrativeRecord[];
};

/**
 * The shared fixture plus a technology introduced in 1.2, so links can target
 * an entity introduced after 1.1.
 */
function corpus(): NarrativeCorpus & { chapters: Chapter[] } {
  const fixture = createNarrativeFixtureCorpus() as NarrativeCorpus & {
    chapters: Chapter[];
  };
  fixture.chapters[1]!.introducing = [
    {
      id: "technology:fixture-drill",
      name: "Fixture drill",
      description: "A fictional drilling tool.",
    },
  ];
  return fixture;
}

function earth(fixture: NarrativeCorpus): NarrativeRecord {
  const zeroState = fixture.zeroState as {
    locations: { children: Array<{ children: NarrativeRecord[] }> };
  };
  return zeroState.locations.children[0]!.children.find(
    (location) => location.id === "location:earth",
  )!;
}

const alexUpdate = (fixture: { chapters: Chapter[] }, chapter: 1 | 2) =>
  fixture.chapters[chapter]!.updates![0]!;

describe("inline entity link validation (ADR-0029)", () => {
  it("accepts links to earlier, same-chapter and zero-state targets", () => {
    const fixture = corpus();
    fixture.chapters[0]!.summary =
      "A fictional [[character:fixture-alex|person]] is introduced on [[location:earth]].";
    fixture.chapters[0]!.introducing![1]!.current_state =
      "A [[species:fixture-human]] at rest.";
    alexUpdate(fixture, 1).current_state =
      "Uses the [[technology:fixture-drill|drill]]; lone [ ] | \\[[ and \\\\ stay text.";
    earth(fixture).description = "A planet orbiting [[location:sol]].";
    expect(() => validateNarrativeCorpus(fixture)).not.toThrow();
  });

  it("uses the write's chapter, not its effective date", () => {
    const fixture = corpus();
    fixture.chapters[1]!.updates = [
      {
        entity_id: "character:fixture-alex",
        effective_date: "2200.0",
        current_state: "Carries a [[technology:fixture-drill]].",
      },
    ];
    expect(() => validateNarrativeCorpus(fixture)).not.toThrow();
  });

  it("rejects a target introduced in a later chapter", () => {
    const fixture = corpus();
    fixture.chapters[0]!.summary =
      "A fictional person finds a [[technology:fixture-drill]].";
    expect(() => validateNarrativeCorpus(fixture)).toThrow(
      "Chapter 1.1 /summary: inline link at offset 27 targets technology:fixture-drill, which is introduced later in chapter 1.2.",
    );
  });

  it("rejects an unknown target", () => {
    const fixture = corpus();
    alexUpdate(fixture, 1).current_state = "At [[location:nowhere]].";
    expect(() => validateNarrativeCorpus(fixture)).toThrow(
      "Chapter 1.2 /updates/0/current_state: inline link at offset 3 targets an unknown entity: location:nowhere.",
    );
  });

  it("rejects a self-link", () => {
    const fixture = corpus();
    alexUpdate(fixture, 2).current_state = "Still [[character:fixture-alex]].";
    expect(() => validateNarrativeCorpus(fixture)).toThrow(
      "Chapter 1.3 /updates/0/current_state: inline link at offset 6 targets the record itself: character:fixture-alex.",
    );
  });

  it("rejects a self-link in an introduction", () => {
    const fixture = corpus();
    fixture.chapters[1]!.introducing![0]!.description =
      "A [[technology:fixture-drill|drill]].";
    expect(() => validateNarrativeCorpus(fixture)).toThrow(
      "Chapter 1.2 /introducing/0/description: inline link at offset 2 targets the record itself",
    );
  });

  it("reports malformed markup with its field and offset", () => {
    const fixture = corpus();
    alexUpdate(fixture, 1).current_state = "Near [[location:earth|]].";
    expect(() => validateNarrativeCorpus(fixture)).toThrow(
      "Chapter 1.2 /updates/0/current_state: malformed inline entity link at offset 22: link label is empty (ADR-0029).",
    );
    alexUpdate(fixture, 1).current_state = "Near [[asset:species-fixture]].";
    expect(() => validateNarrativeCorpus(fixture)).toThrow("cannot be linked");
  });

  it("limits zero-state prose to zero-state targets", () => {
    const fixture = corpus();
    earth(fixture).description = "Home of [[character:fixture-alex]].";
    expect(() => validateNarrativeCorpus(fixture)).toThrow(
      /^Zero state \/locations\/children\/0\/children\/\d+\/description: inline link at offset 8 targets character:fixture-alex, introduced in chapter 1\.1; zero-state prose may link only zero-state entities\.$/,
    );
  });

  it.each([
    [
      "an introduction name",
      (fixture: ReturnType<typeof corpus>) => {
        fixture.chapters[0]!.introducing![1]!.name = "Alex [[location:earth]]";
      },
      'Chapter 1.1 /introducing/1/name: this field does not allow inline entity links or link escapes (ADR-0029); found "[[" at offset 5.',
    ],
    [
      "a chapter title",
      (fixture: ReturnType<typeof corpus>) => {
        fixture.chapters[0]!.title = "Escaped \\\\ title";
      },
      'Chapter 1.1 /title: this field does not allow inline entity links or link escapes (ADR-0029); found "\\\\" at offset 8.',
    ],
    [
      "an alias",
      (fixture: ReturnType<typeof corpus>) => {
        fixture.chapters[0]!.introducing![1]!.aliases = ["Al ]]"];
      },
      "Chapter 1.1 /introducing/1/aliases/0: this field does not allow",
    ],
    [
      "a zero-state name",
      (fixture: ReturnType<typeof corpus>) => {
        earth(fixture).name = "Earth \\[[";
      },
      "/name: this field does not allow",
    ],
    [
      "a book title",
      (fixture: ReturnType<typeof corpus>) => {
        (fixture.books.books as Record<string, NarrativeRecord>)["1"]!.title =
          "Volume [[location:earth]]";
      },
      "Book catalogue /books/1/title: this field does not allow",
    ],
    [
      "an asset source",
      (fixture: ReturnType<typeof corpus>) => {
        (fixture.assets.assets as NarrativeRecord[])[0]!.source =
          "Drawn for [[location:earth]].";
      },
      "Asset registry /assets/0/source: this field does not allow",
    ],
  ])("rejects link markup in %s", (_label, mutate, message) => {
    const fixture = corpus();
    mutate(fixture);
    expect(() => validateNarrativeCorpus(fixture)).toThrow(message);
  });

  it("allows lone brackets and bars in fields without links", () => {
    const fixture = corpus();
    fixture.chapters[0]!.title = "A [draft] | title";
    expect(() => validateNarrativeCorpus(fixture)).not.toThrow();
  });
});

describe("inline link default labels", () => {
  function renamedCorpus() {
    const fixture = corpus();
    fixture.chapters[0]!.summary =
      "A fictional person is introduced with a [[species:fixture-human]] crew.";
    fixture.chapters[1]!.updates!.push({
      entity_id: "species:fixture-human",
      name: "Renamed human",
    });
    alexUpdate(fixture, 1).current_state =
      "Leads the [[species:fixture-human]] team near [[location:earth|home]].";
    return fixture;
  }

  it("precomputes each link's name as of the write's chapter", () => {
    const prepared = prepareNarrativeCorpus(renamedCorpus());
    const fallbacks = preparedInlineLinkFallbackLabels(prepared);
    expect(
      fallbacks.get(
        "A fictional person is introduced with a [[species:fixture-human]] crew.",
      ),
    ).toEqual(["Fixture human"]);
    expect(
      fallbacks.get(
        "Leads the [[species:fixture-human]] team near [[location:earth|home]].",
      ),
    ).toEqual(["Renamed human", "home"]);
    expect(fallbacks.has("initial state")).toBe(false);
  });

  it("resolves display text for offline tooling by chapter", () => {
    const display = inlineLinkDisplayTextResolver(renamedCorpus());
    expect(
      display("A [[species:fixture-human]] at [[location:earth]].", "1.1"),
    ).toBe("A Fixture human at Earth.");
    expect(display("A [[species:fixture-human]].", "1.3")).toBe(
      "A Renamed human.",
    );
  });
});
