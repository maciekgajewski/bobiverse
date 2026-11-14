import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  DRAG_START_PX,
  cycleSnap,
  isSideDrawer,
  settleSnap,
  snapHeights,
  stepSnap,
  type SheetSnap,
} from "../domain/sheet-snap";

const nextSnapLabel: Record<SheetSnap, string> = {
  peek: "Expand details",
  half: "Expand details",
  full: "Collapse details",
};

interface DragState {
  pointerId: number;
  startY: number;
  startHeight: number;
  active: boolean;
}

/**
 * The compact (phone) detail view: a non-animated, non-modal bottom sheet
 * over the live map with peek, half and full snaps, or a right-hand drawer
 * on landscape phones (CSS). The grabber cycles the snaps by tap, Enter or
 * Space, and the arrow keys step them, so dragging is never the only way to
 * resize it. A drag tracks the pointer and then jumps to the chosen snap.
 */
export function DetailSheet({
  sheetRef,
  label,
  snap,
  onSnapChange,
  onKeyDown,
  header,
  children,
}: {
  sheetRef: RefObject<HTMLDivElement | null>;
  label: string;
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  header: ReactNode;
  children: ReactNode;
}) {
  const drag = useRef<DragState | null>(null);
  const sheet = sheetRef;
  const suppressClick = useRef(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isSideDrawer() || !sheet.current) return;
    // Header controls (X, history, breadcrumb links) keep their own taps.
    const target = event.target as HTMLElement;
    if (target.closest("a, input, select, button:not(.sheet-grabber)")) return;
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: sheet.current.getBoundingClientRect().height,
      active: false,
    };
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const travel = event.clientY - current.startY;
    if (!current.active) {
      if (Math.abs(travel) < DRAG_START_PX) return;
      current.active = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    const heights = snapHeights();
    setDragHeight(
      Math.min(
        heights.full,
        Math.max(heights.peek * 0.75, current.startHeight - travel),
      ),
    );
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!current.active) return;
    suppressClick.current = true;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragHeight(null);
    if (cancelled) return;
    const travel = event.clientY - current.startY;
    onSnapChange(
      settleSnap(snap, current.startHeight - travel, travel, snapHeights()),
    );
  };
  const onGrabberKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const direction =
      event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    onSnapChange(stepSnap(snap, direction));
  };

  return (
    <div
      ref={sheetRef}
      className="mobile-panel inspector detail-sheet"
      data-snap={snap}
      data-dragging={dragHeight === null ? undefined : "true"}
      style={dragHeight === null ? undefined : { height: `${dragHeight}px` }}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      <div
        className="sheet-drag-zone"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={(event) => endDrag(event)}
        onPointerCancel={(event) => endDrag(event, true)}
      >
        <button
          type="button"
          className="sheet-grabber"
          aria-label={nextSnapLabel[snap]}
          title={`${nextSnapLabel[snap]} (drag, or use the arrow keys)`}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            onSnapChange(cycleSnap(snap));
          }}
          onKeyDown={onGrabberKeyDown}
        >
          <span className="sheet-grabber-bar" aria-hidden="true" />
        </button>
        <div className="compact-panel-header sheet-header">{header}</div>
      </div>
      <div className="sheet-body">{children}</div>
    </div>
  );
}
