import type { SelectionIdentity } from "./domain/selection";

/**
 * In-app Back (BOB-20261116-ZBZF9F, ADR-0030).
 *
 * The inspector card stack in `App.tsx` stays the single source of truth.
 * Browser session history is a projection of it: one `base` entry (no card),
 * one `card` entry per stack position up to the current index, and at most
 * one `dialog` entry (About or What's new) on top. Every entry uses the same
 * URL (no hash, no deep links) and carries no reader progress.
 *
 * `gen` is bumped whenever the stack is cleared or replaced rather than
 * stepped (read-through changes, Forget progress, a fresh external
 * selection). Entries from an older generation are stale: they are never
 * restored, so leftover Forward slots or a reload cannot resurrect a cleared
 * stack.
 */

export type AppDialog = "about" | "whats-new";

interface AppHistoryStateCommon {
  bobiverse: 1;
  gen: number;
  /** Position above the base entry: base 0, card i at i + 1, dialog on top. */
  depth: number;
}

export interface AppHistoryBaseState extends AppHistoryStateCommon {
  layer: "base";
}

export interface AppHistoryCardState extends AppHistoryStateCommon {
  layer: "card";
  index: number;
  /** The stack up to and including this card. */
  entries: SelectionIdentity[];
}

export interface AppHistoryDialogState extends AppHistoryStateCommon {
  layer: "dialog";
  dialog: AppDialog;
  /** The card stack under the dialog; index -1 when no card is open. */
  index: number;
  entries: SelectionIdentity[];
}

export type AppHistoryState =
  AppHistoryBaseState | AppHistoryCardState | AppHistoryDialogState;

export interface InspectorStack {
  entries: readonly SelectionIdentity[];
  index: number;
}

export const EMPTY_STACK: InspectorStack = { entries: [], index: -1 };

export function sameSelectionIdentity(
  left: SelectionIdentity,
  right: SelectionIdentity,
): boolean {
  return (
    left.kind === right.kind &&
    left.id === right.id &&
    (left.kind !== "component" ||
      right.kind !== "component" ||
      left.systemId === right.systemId)
  );
}

function sameEntries(
  left: readonly SelectionIdentity[],
  right: readonly SelectionIdentity[],
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => sameSelectionIdentity(entry, right[index]!))
  );
}

export function sameInspectorStack(
  left: InspectorStack,
  right: InspectorStack,
): boolean {
  return left.index === right.index && sameEntries(left.entries, right.entries);
}

function isSelectionIdentity(value: unknown): value is SelectionIdentity {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string") return false;
  switch (candidate.kind) {
    case "narrative":
    case "astronomy":
    case "chapter":
      return true;
    case "component":
      return typeof candidate.systemId === "string";
    default:
      return false;
  }
}

/** Whether a `history.state` value is one of this app's entries. */
export function isAppHistoryState(value: unknown): value is AppHistoryState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  if (
    state.bobiverse !== 1 ||
    typeof state.gen !== "number" ||
    !Number.isInteger(state.depth) ||
    (state.depth as number) < 0
  )
    return false;
  if (state.layer === "base") return state.depth === 0;
  if (state.layer !== "card" && state.layer !== "dialog") return false;
  if (
    !Array.isArray(state.entries) ||
    !state.entries.every(isSelectionIdentity) ||
    !Number.isInteger(state.index)
  )
    return false;
  const index = state.index as number;
  const count = state.entries.length;
  if (state.layer === "card")
    return count === index + 1 && state.depth === index + 1;
  return (
    (state.dialog === "about" || state.dialog === "whats-new") &&
    index >= -1 &&
    count === index + 1 &&
    state.depth === index + 2
  );
}

export function sameAppHistoryState(
  left: AppHistoryState,
  right: AppHistoryState,
): boolean {
  if (
    left.layer !== right.layer ||
    left.gen !== right.gen ||
    left.depth !== right.depth
  )
    return false;
  if (left.layer === "base" || right.layer === "base") return true;
  if (
    left.layer === "dialog" &&
    right.layer === "dialog" &&
    left.dialog !== right.dialog
  )
    return false;
  return left.index === right.index && sameEntries(left.entries, right.entries);
}

/** The card stack an entry stands for (empty for the base entry). */
export function stackFromState(state: AppHistoryState): InspectorStack {
  return state.layer === "base"
    ? EMPTY_STACK
    : { entries: state.entries, index: state.index };
}

/**
 * The browser entries for a card stack and an optional dialog, from the base
 * entry up to the current position. Forward entries of the stack are not
 * part of the projection; they live in the browser's Forward list.
 */
export function projectAppHistory(
  stack: InspectorStack,
  dialog: AppDialog | null,
  gen: number,
): AppHistoryState[] {
  const states: AppHistoryState[] = [
    { bobiverse: 1, gen, depth: 0, layer: "base" },
  ];
  const top = Math.min(stack.index, stack.entries.length - 1);
  for (let index = 0; index <= top; index += 1) {
    states.push({
      bobiverse: 1,
      gen,
      depth: index + 1,
      layer: "card",
      index,
      entries: stack.entries.slice(0, index + 1),
    });
  }
  if (dialog) {
    states.push({
      bobiverse: 1,
      gen,
      depth: top + 2,
      layer: "dialog",
      dialog,
      index: top,
      entries: stack.entries.slice(0, top + 1),
    });
  }
  return states;
}

/**
 * How many entries a full collapse to the base walks back: one per open card
 * up to the current index, plus one for an open dialog.
 */
export function collapseDistance(
  stack: InspectorStack,
  dialogOpen: boolean,
): number {
  return (stack.index >= 0 ? stack.index + 1 : 0) + (dialogOpen ? 1 : 0);
}

export interface HistorySyncPlan {
  /** Entries to walk back first (0 means none). */
  back: number;
  /** The entry to write over the landing position, if it differs. */
  replace: AppHistoryState | null;
  /** Entries to push after the landing position. */
  push: AppHistoryState[];
}

/**
 * Plans the smallest browser change that turns `model` (what the browser
 * holds from the base up to the current position) into `desired`. It walks
 * back to the last shared position, rewrites that entry if needed, and pushes
 * the rest. Walking back never goes below the base entry.
 */
export function planHistorySync(
  model: readonly AppHistoryState[],
  desired: readonly AppHistoryState[],
): HistorySyncPlan {
  if (model.length === 0 || desired.length === 0)
    return { back: 0, replace: desired[0] ?? null, push: desired.slice(1) };
  let shared = 0;
  while (
    shared < model.length &&
    shared < desired.length &&
    sameAppHistoryState(model[shared]!, desired[shared]!)
  )
    shared += 1;
  const landing = Math.min(shared, desired.length - 1, model.length - 1);
  return {
    back: model.length - 1 - landing,
    replace: sameAppHistoryState(model[landing]!, desired[landing]!)
      ? null
      : desired[landing]!,
    push: desired.slice(landing + 1),
  };
}

export interface HistoryLike {
  readonly state: unknown;
  readonly length: number;
  pushState(data: unknown, unused: string): void;
  replaceState(data: unknown, unused: string): void;
  back(): void;
  forward(): void;
  go(delta: number): void;
}

export type PopOutcome =
  /** Not our entry, our own walk-back landing, or the entry already shown. */
  | { kind: "ignored" }
  /** A stale or invalid entry; it was rewritten to the current UI. */
  | { kind: "stale" }
  /** A live entry the UI should now show. */
  | { kind: "navigate"; state: AppHistoryState };

/**
 * Keeps browser history in step with the desired projection. All of the
 * app's history writes go through here.
 *
 * A walk back (`back()` / `go(-n)`) is asynchronous. While one is pending,
 * new desired projections are queued and the landing `popstate` only
 * finishes the browser side; it never changes the UI, so the app's own
 * collapse cannot step the stack twice.
 */
export class AppHistorySync {
  private model: AppHistoryState[] = [];
  private forwardEntries: AppHistoryState[] = [];
  private desired: AppHistoryState[] | null = null;
  private landing: number | null = null;
  private started = false;

  constructor(private readonly history: HistoryLike) {}

  /** Whether a walk back is waiting for its `popstate`. */
  get pending(): boolean {
    return this.landing !== null;
  }

  /** The entry the browser is on, as far as the app knows. */
  get current(): AppHistoryState | undefined {
    return this.model.at(-1);
  }

  /** Whether a live Forward entry is known. */
  get canGoForward(): boolean {
    return this.forwardEntries.length > 0;
  }

  /** The number of entries below the current one, down to the base. */
  get depth(): number {
    return Math.max(0, this.model.length - 1);
  }

  /**
   * Adopts what the browser holds at start-up, from the base entry up to the
   * current one. An empty model means the current entry is not ours yet; the
   * first sync rewrites it into the base entry. Only the first call counts.
   */
  start(model: readonly AppHistoryState[]): void {
    if (this.started) return;
    this.started = true;
    this.model = [...model];
    this.forwardEntries = [];
  }

  sync(desired: readonly AppHistoryState[]): void {
    this.desired = [...desired];
    if (this.landing === null) this.apply();
  }

  /**
   * Gives up on a walk back whose `popstate` never came (for example when
   * the browser had fewer entries than expected). The current entry is
   * rewritten to the desired top so the UI and the entry agree again.
   */
  abandonPending(): void {
    if (this.landing === null) return;
    this.landing = null;
    const desired = this.desired ?? this.model;
    const top = desired.at(-1);
    if (top) this.history.replaceState(top, "");
    this.model = [...desired];
    this.forwardEntries = [];
  }

  /**
   * Classifies a `popstate`. `isLive` decides whether a known entry may still
   * be shown (current generation, every selection still eligible).
   */
  handlePop(
    state: unknown,
    isLive: (state: AppHistoryState) => boolean,
  ): PopOutcome {
    if (this.landing !== null) {
      const landing = this.landing;
      this.landing = null;
      const popped = this.model.slice(landing + 1);
      this.model = this.model.slice(0, landing + 1);
      this.forwardEntries = [...popped, ...this.forwardEntries];
      const expected = this.model[landing];
      if (
        !expected ||
        !isAppHistoryState(state) ||
        !sameAppHistoryState(state, expected)
      ) {
        // Landed somewhere unexpected: make sure the next plan rewrites it.
        this.model[landing] = isAppHistoryState(state)
          ? state
          : { bobiverse: 1, gen: Number.NaN, depth: 0, layer: "base" };
      }
      this.apply();
      return { kind: "ignored" };
    }
    if (!isAppHistoryState(state)) return { kind: "ignored" };

    for (let position = this.model.length - 2; position >= 0; position -= 1) {
      if (!sameAppHistoryState(this.model[position]!, state)) continue;
      if (!isLive(state)) break;
      this.forwardEntries = [
        ...this.model.slice(position + 1),
        ...this.forwardEntries,
      ];
      this.model = this.model.slice(0, position + 1);
      return { kind: "navigate", state };
    }
    const top = this.model.at(-1);
    if (top && sameAppHistoryState(top, state)) return { kind: "ignored" };
    const ahead = this.forwardEntries.findIndex((entry) =>
      sameAppHistoryState(entry, state),
    );
    if (ahead >= 0 && isLive(state)) {
      this.model = [...this.model, ...this.forwardEntries.slice(0, ahead + 1)];
      this.forwardEntries = this.forwardEntries.slice(ahead + 1);
      return { kind: "navigate", state };
    }
    // Stale: rewrite this entry to the current UI and keep showing it. The
    // entry's own depth says where the browser is, even when the pop is a
    // late landing of a walk back that was abandoned, so the model is
    // rebuilt from it rather than assumed to be one step further on.
    this.forwardEntries = [];
    this.reconcile(state.depth);
    return { kind: "stale" };
  }

  /**
   * Rebuilds the model for a browser that is `depth` entries above the base:
   * the desired projection up to that depth (padded with its top when the
   * browser is further on), with the current entry rewritten to match. Any
   * rest of the projection is then pushed, so the browser ends on the UI.
   */
  private reconcile(depth: number): void {
    const desired = this.desired ?? this.model;
    if (desired.length === 0) return;
    const top = desired.length - 1;
    this.model = Array.from(
      { length: depth + 1 },
      (_, position) => desired[Math.min(position, top)]!,
    );
    this.history.replaceState(this.model[depth], "");
    if (depth < top) this.apply();
  }

  private apply(): void {
    const desired = this.desired;
    if (!desired || desired.length === 0) return;
    if (this.model.length === 0) {
      this.history.replaceState(desired[0], "");
      this.model = [desired[0]!];
    }
    const plan = planHistorySync(this.model, desired);
    if (plan.back > 0) {
      this.landing = this.model.length - 1 - plan.back;
      if (plan.back === 1) this.history.back();
      else this.history.go(-plan.back);
      return;
    }
    if (plan.replace) {
      this.history.replaceState(plan.replace, "");
      this.model[this.model.length - 1] = plan.replace;
      this.forwardEntries = [];
    }
    for (const state of plan.push) {
      this.history.pushState(state, "");
      this.model.push(state);
    }
    if (plan.push.length > 0) this.forwardEntries = [];
  }
}

const GEN_STORAGE_KEY = "bobiverse.history-gen";

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * The tab's current history generation. It lives in `sessionStorage` so a
 * reload can tell live entries from stale ones; without storage every load
 * starts a fresh random generation and nothing is restored.
 */
export function loadHistoryGen(): number {
  const storage = sessionStore();
  try {
    const stored = Number(storage?.getItem(GEN_STORAGE_KEY));
    if (
      storage?.getItem(GEN_STORAGE_KEY) !== null &&
      Number.isSafeInteger(stored)
    )
      return stored;
  } catch {
    // Fall through to a fresh generation.
  }
  return storeHistoryGen(Math.floor(Math.random() * 1_000_000_000));
}

export function storeHistoryGen(gen: number): number {
  try {
    sessionStore()?.setItem(GEN_STORAGE_KEY, String(gen));
  } catch {
    // A generation that cannot be stored only means a reload restores nothing.
  }
  return gen;
}
