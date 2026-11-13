import { useEffect, useRef, type RefObject } from "react";

/**
 * Moves focus into an open confirmation and back to its Read through select
 * once it closes. Shared by the timeline dock and the top-bar control.
 */
export function useReadThroughConfirmationFocus(
  active: boolean,
  pendingReadThrough: string | null,
  confirmButton: RefObject<HTMLButtonElement | null>,
  readThroughSelect: RefObject<HTMLSelectElement | null>,
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
      readThroughSelect.current?.focus();
    }
  }, [active, confirmButton, pendingReadThrough, readThroughSelect]);
}
