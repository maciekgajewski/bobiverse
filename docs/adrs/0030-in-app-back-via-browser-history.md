# ADR-0030: in-app Back via browser history

Status: Accepted
Date: 2026-11-16

## Context

On a phone, the device Back gesture (Android Back, iOS swipe-back) left the
site instead of closing the open card or dialog. Maciej asked for Back to
work inside the app (15 Nov 2026). The technical design said browser session
history and URLs were unchanged, and the inspector already had its own
transient card stack (`InspectorHistory` in `App.tsx`) with soft Back and
Forward controls. A second, parallel stack would drift from it, and Back must
never become a way around the spoiler ceiling: reader progress is only
changed by the explicit Read through confirmation.

The design (back-nav revision 2) was approved by the Piotr Developer Manager
as matching Maciej's direction; task `BOB-20261116-ZBZF9F` implements it.

## Decision

- `InspectorHistory` stays the single source of truth. Browser history is a
  projection of it: a `base` entry (no card), one `card` entry per stack
  position up to the current index, and at most one `dialog` entry (About or
  What's new) on top. Every entry uses `history.pushState` / `replaceState`
  on the same URL: no hash, no deep links, and no reader progress in
  `history.state`.
- Soft Back and Forward only call `history.back()` / `history.forward()`.
  The `popstate` handler is the only writer for those gestures, so device
  Back equals soft Back. Back at index 0 closes the card.
- X, Escape and an empty map tap fully dismiss the card, walking the browser
  back with one `history.go(-(index + 1))`. A pending-walk guard makes the
  landing `popstate` finish only the browser side, so the app's own collapse
  never steps twice.
- Opening About or What's new (including the start-up auto-show) pushes one
  entry; Back closes it without touching the cards. The start-up auto-show
  pushes its entry on the first user activation, because browsers skip
  entries pushed before any interaction. What's new → About is a
  `replaceState`. Caption links dismiss the dialog and open a fresh card root.
- A confirmed read-through change and Forget progress are never backable.
  They close the card, clear the stack, bump a per-tab generation, walk back
  to the base entry and rewrite it. Entries from an older generation are
  stale: a `popstate` onto one is ignored and rewritten to the current UI, so
  leftover Forward entries cannot resurrect a cleared stack. A fresh external
  selection over an open card or dialog, and projection changes that drop
  entries, use the same generation-guarded rewrite.
- The chapter stepper, `selectTimelineChapter` over an open card, the menu,
  Search, the compact timeline, the chapter picker, the read-through
  confirmation and the astronomy notice create no entries. Back closes any of
  them that is open as a side effect.
- The generation is stored in `sessionStorage` (`bobiverse.history-gen`). On
  reload the stack is restored from `history.state` only when the generation
  matches and every selection is still eligible; About and What's new are not
  restored. Anything else is rewritten to a base entry. Restoring never
  raises or changes reader progress.

## Consequences

- Browser history now changes as cards and dialogs open and close. The
  disabled Enter system flow keeps its own entry and is skipped by the
  projection while it is active.
- X and Escape on the compact detail sheet now clear the selection instead of
  only hiding the sheet, and a confirmed read-through change closes the open
  card.
- `sessionStorage` holds one non-progress integer per tab. Without storage,
  every load starts a fresh generation and nothing is restored.
- Real Android Back and iOS swipe-back remain a manual acceptance check;
  automated tests drive the same `popstate` through Playwright's
  `goBack()` / `goForward()`.

## Alternatives considered

- **A parallel browser-history stack.** Rejected: two stacks drift, and the
  soft controls would no longer match device Back.
- **Hash or path deep links.** Rejected: they would expose selections in
  shareable URLs and need spoiler checks on entry; Maciej asked for no deep
  links.
- **Storing progress in `history.state`.** Rejected: Back must never change
  the spoiler ceiling.

## Follow-up

- Revisit if Enter system is re-enabled, so its entry joins the projection.
