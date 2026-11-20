import { useCallback, useLayoutEffect, useRef } from "react";

type FocusTarget = () => HTMLElement | null | undefined;

/**
 * Returns a function that asks for focus to move to a target once React has
 * committed the update that closes a modal layer, rather than on a timer.
 *
 * Closing About, What's new or the Read through picker removes `inert` from
 * the app shell, and an inert element cannot take focus. That commit is not
 * always synchronous with the click: anything that suspends outside a Suspense
 * boundary delays the commit. Before the scene assets (the starfield texture,
 * the label font) had their own boundaries inside `<Canvas>`
 * (BOB-20261120-Y9W13K), React Three Fiber rethrew their pending load to the
 * app root, so every update waited for the load (BOB-20261116-TB1C66). A
 * `setTimeout(…, 0)` focus then ran while the shell was still inert and was
 * lost. The request is kept until a commit in which
 * `blocked` (the layer is still open) is false, and runs in that commit's
 * layout phase, after the DOM has lost `inert` and before paint.
 */
export function useFocusAfterCommit(
  blocked: boolean,
): (target: FocusTarget) => void {
  const pending = useRef<FocusTarget | null>(null);
  useLayoutEffect(() => {
    const target = pending.current;
    if (blocked || !target) return;
    pending.current = null;
    target()?.focus();
  });
  return useCallback((target: FocusTarget) => {
    pending.current = target;
  }, []);
}
