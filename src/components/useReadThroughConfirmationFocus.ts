import { useEffect, useRef, type RefObject } from "react";

/**
 * Moves focus into an open confirmation and back to its Read through control
 * (the dock select or the top-bar chip) once it closes. Shared by the timeline
 * dock and the top-bar control.
 */
export function useReadThroughConfirmationFocus(
  active: boolean,
  pendingReadThrough: string | null,
  confirmButton: RefObject<HTMLButtonElement | null>,
  readThroughControl: RefObject<HTMLElement | null>,
): void {
  const confirmationWasOpen = useRef(false);
  useEffect(() => {
    if (!active) return;
    if (pendingReadThrough !== null) {
      confirmationWasOpen.current = true;
      confirmButton.current?.focus();
      return;
    }
    if (confirmationWasOpen.current) {
      confirmationWasOpen.current = false;
      readThroughControl.current?.focus();
    }
  }, [active, confirmButton, pendingReadThrough, readThroughControl]);
}
