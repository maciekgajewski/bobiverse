import { describe, expect, it } from "vitest";
import {
  buildNarrativeBrowserGroups,
  narrativeItemBeforeExistence,
} from "../../src/narrative/browser";
import {
  chapterSoftCeiling,
  generateNarrativeWorld,
  narrativeActivityStoryDate,
  narrativeSoftCeilingLabel,
  type NarrativeWorld,
} from "../../src/narrative/model";
import { asOfCorpus, asOfIds } from "../fixtures/narrative-as-of";

// Cards "as of" the soft ceiling (design principles §2.5, rules (b), (c) and
// (g)) and chapter-view recency in story time (BOB-20261120-73F83F).

const { alex, bea, cy, kai, undated } = asOfIds;

function chapterView(chapter: string, readThrough = "1.4"): NarrativeWorld {
  return generateNarrativeWorld(asOfCorpus, {
    readThrough,
    softCeiling: chapterSoftCeiling(asOfCorpus, chapter),
    chapter,
  });
}

function characters(world: NarrativeWorld) {
  return buildNarrativeBrowserGroups(world, "chapter").find(
    ({ id }) => id === "characters",
  )!.items;
}

describe("soft-ceiling labels for cards", () => {
  it("names the selected chapter in chapter view and the date in date view", () => {
    expect(narrativeSoftCeilingLabel(chapterView("1.2"))).toBe("Chapter 1.2");
    expect(
      narrativeSoftCeilingLabel(
        generateNarrativeWorld(asOfCorpus, {
          readThrough: "1.4",
          softCeiling: "2165-03",
        }),
      ),
    ).toBe("March 2165");
    expect(
      narrativeSoftCeilingLabel(
        generateNarrativeWorld(asOfCorpus, {
          readThrough: "1.4",
          softCeiling: "2175",
        }),
      ),
    ).toBe("2175");
  });

  it("has no label for the zero state or a hand-built world", () => {
    expect(narrativeSoftCeilingLabel(generateNarrativeWorld(asOfCorpus))).toBe(
      null,
    );
    expect(
      narrativeSoftCeilingLabel({
        entities: [],
        activity: [],
        view: { chapter: "1.1", display_date: "2160-01" },
      }),
    ).toBe(null);
  });
});

describe("chapter-view recency in story time", () => {
  it("takes an entity's latest activity by story date, not reading order", () => {
    // At 1.2 (2170-06) with 1.3 (2165-03) read, Alex's latest is 1.2.
    const world = chapterView("1.2");
    expect(
      characters(world).find(({ entity }) => entity.id === alex)?.lastActivity
        ?.source_chapter,
    ).toBe("1.2");
  });

  it("orders inactive items by story date, then reading order", () => {
    // At 1.4 only Alex is active; Cy's 1.2 (2170-06) is later in story
    // time than Bea's 1.3 (2165-03), though read earlier.
    expect(
      characters(chapterView("1.4")).map(({ entity }) => entity.id),
    ).toEqual([alex, kai, cy, bea]);
  });

  it("dates undated activity by its revealing chapter (rule (c))", () => {
    const world = chapterView("1.3");
    const activity = world.activity.find(
      (candidate) => candidate.entity_id === undated,
    )!;
    expect(activity.effective_date).toBeNull();
    expect(narrativeActivityStoryDate(world, activity)).toBe("2165-03");
  });
});

describe("cards before existence (rule (g))", () => {
  it("resolves a read entity that does not exist yet, with no activity", () => {
    const world = chapterView("1.2");
    expect(world.entities.some(({ id }) => id === kai)).toBe(false);
    expect(narrativeItemBeforeExistence(world, kai)).toMatchObject({
      entity: { id: kai, name: "Fixture Kai" },
      name: "Fixture Kai",
      active: false,
      lastActivity: null,
    });
    expect(narrativeItemBeforeExistence(world, kai)?.entity).not.toHaveProperty(
      "current_state",
    );
    expect(narrativeItemBeforeExistence(world, alex)).toBeNull();
  });

  it("never resolves an entity past Read through", () => {
    expect(narrativeItemBeforeExistence(chapterView("1.2", "1.3"), kai)).toBe(
      null,
    );
  });
});
