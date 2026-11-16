import { describe, expect, it } from "vitest";
import {
  AppHistorySync,
  EMPTY_STACK,
  collapseDistance,
  isAppHistoryState,
  planHistorySync,
  projectAppHistory,
  stackFromState,
  type AppHistoryState,
  type HistoryLike,
  type InspectorStack,
  type PopOutcome,
} from "../../src/app-history";
import type { SelectionIdentity } from "../../src/domain/selection";

// In-app Back (BOB-20261116-ZBZF9F): the card stack is the truth and browser
// history is its projection.

const A: SelectionIdentity = { kind: "narrative", id: "character:bob" };
const B: SelectionIdentity = { kind: "narrative", id: "location:earth" };
const C: SelectionIdentity = { kind: "chapter", id: "1.2" };

const stack = (index: number, ...entries: SelectionIdentity[]) =>
  ({ entries, index }) satisfies InspectorStack;

/**
 * A synchronous stand-in for `window.history`. Traversals queue like the
 * real thing and `flush` delivers their popstate.
 */
class FakeHistory implements HistoryLike {
  entries: unknown[] = [null];
  position = 0;
  queued: number[] = [];
  calls: string[] = [];

  get state() {
    return this.entries[this.position];
  }
  get length() {
    return this.entries.length;
  }
  pushState(data: unknown) {
    this.calls.push("push");
    this.entries = this.entries.slice(0, this.position + 1);
    this.entries.push(structuredClone(data));
    this.position += 1;
  }
  replaceState(data: unknown) {
    this.calls.push("replace");
    this.entries[this.position] = structuredClone(data);
  }
  back() {
    this.calls.push("back");
    this.queued.push(-1);
  }
  forward() {
    this.calls.push("forward");
    this.queued.push(1);
  }
  go(delta: number) {
    this.calls.push(`go(${delta})`);
    this.queued.push(delta);
  }
  flush(onPop: (state: unknown) => void) {
    while (this.queued.length > 0) {
      const target = this.position + this.queued.shift()!;
      if (target < 0 || target >= this.entries.length) continue;
      this.position = target;
      onPop(this.state);
    }
  }
}

function setup(gen = 7) {
  const history = new FakeHistory();
  const sync = new AppHistorySync(history);
  sync.start([]);
  const outcomes: PopOutcome[] = [];
  let live = (state: AppHistoryState) => state.gen === gen;
  const flush = () =>
    history.flush((state) => outcomes.push(sync.handlePop(state, live)));
  return {
    history,
    sync,
    outcomes,
    flush,
    setLive(next: (state: AppHistoryState) => boolean) {
      live = next;
    },
    project: (value: InspectorStack, dialog: "about" | null = null, g = gen) =>
      projectAppHistory(value, dialog, g),
  };
}

const layers = (history: FakeHistory) =>
  history.entries.map((entry) => {
    const state = entry as AppHistoryState;
    return state.layer === "card"
      ? `card${state.index}`
      : state.layer === "dialog"
        ? `dialog:${state.dialog}`
        : "base";
  });

describe("app history projection", () => {
  it("projects a base entry, one entry per card up to the index, and a dialog", () => {
    const states = projectAppHistory(stack(1, A, B, C), "about", 3);
    expect(states.map((state) => [state.layer, state.depth])).toEqual([
      ["base", 0],
      ["card", 1],
      ["card", 2],
      ["dialog", 3],
    ]);
    expect(states.every((state) => isAppHistoryState(state))).toBe(true);
    expect(stackFromState(states[2]!)).toEqual(stack(1, A, B));
    expect(collapseDistance(stack(1, A, B, C), true)).toBe(3);
    expect(collapseDistance(EMPTY_STACK, false)).toBe(0);
  });

  it("rejects state that is not one of the app's entries", () => {
    expect(isAppHistoryState(null)).toBe(false);
    expect(isAppHistoryState({})).toBe(false);
    expect(
      isAppHistoryState({ bobiverse: 1, gen: 1, depth: 2, layer: "base" }),
    ).toBe(false);
    expect(
      isAppHistoryState({
        bobiverse: 1,
        gen: 1,
        depth: 1,
        layer: "card",
        index: 0,
        entries: [{ kind: "narrative" }],
      }),
    ).toBe(false);
  });

  it("plans a push, a walk back to the shared entry, and a rewrite", () => {
    const one = projectAppHistory(stack(0, A), null, 1);
    const two = projectAppHistory(stack(1, A, B), null, 1);
    expect(planHistorySync(one, two)).toMatchObject({
      back: 0,
      replace: null,
      push: [two[2]],
    });
    expect(planHistorySync(two, one)).toMatchObject({
      back: 1,
      replace: null,
      push: [],
    });
    const other = projectAppHistory(stack(0, C), null, 1);
    expect(planHistorySync(two, other)).toMatchObject({
      back: 1,
      replace: other[1],
      push: [],
    });
    const cleared = projectAppHistory(EMPTY_STACK, null, 2);
    expect(planHistorySync(two, cleared)).toMatchObject({
      back: 2,
      replace: cleared[0],
      push: [],
    });
  });
});

describe("AppHistorySync", () => {
  it("tags the first entry as the base and pushes one entry per card", () => {
    const { history, sync, project } = setup();
    sync.sync(project(EMPTY_STACK));
    expect(history.calls).toEqual(["replace"]);
    sync.sync(project(stack(0, A)));
    sync.sync(project(stack(1, A, B)));
    expect(history.calls).toEqual(["replace", "push", "push"]);
    expect(layers(history)).toEqual(["base", "card0", "card1"]);
  });

  it("walks Back and Forward through live entries and closes at index 0", () => {
    const { history, sync, outcomes, flush, project } = setup();
    sync.sync(project(stack(1, A, B)));
    history.back();
    flush();
    expect(outcomes.at(-1)).toMatchObject({
      kind: "navigate",
      state: { layer: "card", index: 0 },
    });
    // The app applies the step; the projection now matches the browser.
    sync.sync(project(stack(0, A, B)));
    expect(sync.canGoForward).toBe(true);
    history.forward();
    flush();
    expect(outcomes.at(-1)).toMatchObject({
      kind: "navigate",
      state: { layer: "card", index: 1 },
    });
    sync.sync(project(stack(1, A, B)));
    history.go(-2);
    flush();
    expect(outcomes.at(-1)).toMatchObject({
      kind: "navigate",
      state: { layer: "base" },
    });
    const writes = history.calls.filter(
      (call) => call === "push" || call === "replace",
    );
    expect(writes).toEqual(["replace", "push", "push"]);
  });

  it("drops the Forward list when a relationship is followed mid-stack", () => {
    const { history, sync, flush, project } = setup();
    sync.sync(project(stack(1, A, B)));
    history.back();
    flush();
    sync.sync(project(stack(0, A, B)));
    sync.sync(project(stack(1, A, C)));
    expect(layers(history)).toEqual(["base", "card0", "card1"]);
    expect(stackFromState(history.state as AppHistoryState)).toEqual(
      stack(1, A, C),
    );
    expect(sync.canGoForward).toBe(false);
  });

  it("dismisses a card with one go(-(index + 1)) and does not step twice", () => {
    const { history, sync, outcomes, flush, project } = setup();
    sync.sync(project(stack(2, A, B, C)));
    history.calls = [];
    sync.sync(project(EMPTY_STACK));
    expect(history.calls).toEqual(["go(-3)"]);
    expect(sync.pending).toBe(true);
    // A second request while the walk is pending is queued, not doubled.
    sync.sync(project(EMPTY_STACK));
    expect(history.calls).toEqual(["go(-3)"]);
    flush();
    expect(outcomes).toEqual([{ kind: "ignored" }]);
    expect(history.position).toBe(0);
    expect(sync.pending).toBe(false);
    expect(history.calls).toEqual(["go(-3)"]);
  });

  it("puts a dialog on top of the cards and closes it with one Back", () => {
    const { history, sync, outcomes, flush, project } = setup();
    sync.sync(project(stack(0, A)));
    sync.sync(project(stack(0, A), "about"));
    expect(layers(history)).toEqual(["base", "card0", "dialog:about"]);
    // Device Back closes the dialog; the card stays.
    history.back();
    flush();
    expect(outcomes.at(-1)).toMatchObject({
      kind: "navigate",
      state: { layer: "card", index: 0 },
    });
    sync.sync(project(stack(0, A)));
    // Forward reopens the live dialog entry.
    history.forward();
    flush();
    expect(outcomes.at(-1)).toMatchObject({
      kind: "navigate",
      state: { layer: "dialog", dialog: "about" },
    });
    sync.sync(project(stack(0, A), "about"));
    // Closing from the dialog's own X walks back once.
    history.calls = [];
    sync.sync(project(stack(0, A)));
    expect(history.calls).toEqual(["back"]);
    flush();
    expect(outcomes.at(-1)).toEqual({ kind: "ignored" });
  });

  it("collapses to a fresh base on a generation change and ignores stale Forward", () => {
    const { history, sync, outcomes, flush, project, setLive } = setup(7);
    sync.sync(project(stack(1, A, B)));
    history.calls = [];
    setLive((state) => state.gen === 8);
    sync.sync(project(EMPTY_STACK, null, 8));
    expect(history.calls).toEqual(["go(-2)"]);
    flush();
    expect(history.calls).toEqual(["go(-2)", "replace"]);
    expect(history.state).toMatchObject({ layer: "base", gen: 8 });
    // The old cards are still in the browser's Forward list, but stale.
    history.forward();
    flush();
    expect(outcomes.at(-1)).toEqual({ kind: "stale" });
    expect(history.state).toMatchObject({ layer: "base", gen: 8 });
  });

  it("rewrites a card in place without pushing (stepper, chapter links)", () => {
    const { history, sync, project } = setup();
    sync.sync(project(stack(0, C)));
    const length = history.length;
    history.calls = [];
    sync.sync(project(stack(0, { kind: "chapter", id: "1.1" })));
    expect(history.calls).toEqual(["replace"]);
    expect(history.length).toBe(length);
  });

  it("treats a known entry that is no longer live as stale", () => {
    const { history, sync, outcomes, flush, project, setLive } = setup();
    sync.sync(project(stack(1, A, B)));
    setLive(() => false);
    history.back();
    flush();
    expect(outcomes.at(-1)).toEqual({ kind: "stale" });
    expect(history.state).toMatchObject({ layer: "card", index: 1 });
  });

  it("applies the latest projection once a pending walk back lands", () => {
    const { history, sync, flush, project } = setup();
    sync.sync(project(stack(1, A, B)));
    sync.sync(project(EMPTY_STACK));
    sync.sync(project(stack(0, C)));
    flush();
    expect(layers(history).slice(0, history.position + 1)).toEqual([
      "base",
      "card0",
    ]);
    expect(stackFromState(history.state as AppHistoryState)).toEqual(
      stack(0, C),
    );
  });

  it("recovers when a walk back never lands", () => {
    const { history, sync, project } = setup();
    sync.sync(project(stack(0, A)));
    sync.sync(project(EMPTY_STACK));
    history.queued = [];
    sync.abandonPending();
    expect(sync.pending).toBe(false);
    expect(history.state).toMatchObject({ layer: "base" });
  });
});
