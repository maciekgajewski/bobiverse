// Compile-time feature flags for half-finished UI flows.
//
// A disabled flag hides the flow's entry point while its code, styles and
// tests stay in the tree, so turning the flag back on restores the flow.

/**
 * The guided stellar-system view ("Enter system", docs/design/guided-system-view.md).
 *
 * Off since 2026-11-14 at the Captain's request: the flow is not finished, so
 * its inspector button is hidden on every layout and `enterSystemMode` refuses
 * to start it. Set to `true` to bring it back.
 */
export const ENABLE_ENTER_SYSTEM = false as boolean;
