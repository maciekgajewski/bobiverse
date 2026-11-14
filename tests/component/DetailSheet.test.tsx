import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DetailSheet } from "../../src/components/DetailSheet";
import { InspectorBreadcrumb } from "../../src/components/InspectorBreadcrumb";
import type { SheetSnap } from "../../src/domain/sheet-snap";

function Harness({ initial = "half" }: { initial?: SheetSnap }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [snap, setSnap] = useState<SheetSnap>(initial);
  return (
    <DetailSheet
      sheetRef={ref}
      label="Selected object"
      snap={snap}
      onSnapChange={setSnap}
      header={
        <button type="button" className="close-panel" aria-label="Close">
          x
        </button>
      }
    >
      <h2>Earth</h2>
    </DetailSheet>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const sheet = () => screen.getByRole("dialog", { name: "Selected object" });

describe("DetailSheet", () => {
  it("is a non-modal dialog that records its snap", () => {
    render(<Harness />);
    expect(sheet()).toHaveAttribute("aria-modal", "false");
    expect(sheet()).toHaveAttribute("data-snap", "half");
    expect(
      within(sheet()).getByRole("heading", { name: "Earth" }),
    ).toBeInTheDocument();
  });

  it("cycles peek, half and full from the grabber without dragging", async () => {
    const user = userEvent.setup();
    render(<Harness initial="peek" />);
    await user.click(screen.getByRole("button", { name: "Expand details" }));
    expect(sheet()).toHaveAttribute("data-snap", "half");
    await user.click(screen.getByRole("button", { name: "Expand details" }));
    expect(sheet()).toHaveAttribute("data-snap", "full");
    await user.click(screen.getByRole("button", { name: "Collapse details" }));
    expect(sheet()).toHaveAttribute("data-snap", "peek");
  });

  it("steps the snaps with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole("button", { name: "Expand details" }).focus();
    await user.keyboard("{ArrowUp}");
    expect(sheet()).toHaveAttribute("data-snap", "full");
    await user.keyboard("{ArrowUp}");
    expect(sheet()).toHaveAttribute("data-snap", "full");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(sheet()).toHaveAttribute("data-snap", "peek");
  });

  it("settles a drag on the handle at a snap and ignores the trailing click", () => {
    render(<Harness />);
    vi.spyOn(sheet(), "getBoundingClientRect").mockReturnValue({
      height: 384,
    } as DOMRect);
    const grabber = screen.getByRole("button", { name: "Expand details" });
    const zone = sheet().querySelector(".sheet-drag-zone")!;
    fireEvent.pointerDown(grabber, { pointerId: 1, clientY: 500 });
    fireEvent.pointerMove(zone, { pointerId: 1, clientY: 300 });
    expect(sheet()).toHaveAttribute("data-dragging", "true");
    fireEvent.pointerUp(zone, { pointerId: 1, clientY: 140 });
    fireEvent.click(grabber);
    expect(sheet()).toHaveAttribute("data-snap", "full");
    expect(sheet()).not.toHaveAttribute("data-dragging");
    expect(sheet().style.height).toBe("");

    fireEvent.pointerDown(grabber, { pointerId: 2, clientY: 100 });
    fireEvent.pointerMove(zone, { pointerId: 2, clientY: 400 });
    fireEvent.pointerUp(zone, { pointerId: 2, clientY: 700 });
    expect(sheet()).toHaveAttribute("data-snap", "peek");
  });

  it("does not start a drag from a header control", () => {
    render(<Harness />);
    const zone = sheet().querySelector(".sheet-drag-zone")!;
    const close = screen.getByRole("button", { name: "Close" });
    fireEvent.pointerDown(close, { pointerId: 1, clientY: 500 });
    fireEvent.pointerMove(zone, { pointerId: 1, clientY: 100 });
    fireEvent.pointerUp(zone, { pointerId: 1, clientY: 100 });
    expect(sheet()).not.toHaveAttribute("data-dragging");
    expect(sheet()).toHaveAttribute("data-snap", "half");
  });
});

describe("InspectorBreadcrumb", () => {
  it("links ancestors, marks the current object and collapses long trails", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <InspectorBreadcrumb
        trail={[
          { key: "a", label: "Galaxy", target: { kind: "narrative", id: "a" } },
          {
            key: "b",
            label: "Solar System",
            target: { kind: "narrative", id: "b" },
          },
          { key: "c", label: "Sol", target: { kind: "narrative", id: "c" } },
          { key: "d", label: "Earth", target: null },
        ]}
        onSelect={onSelect}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Object trail" });
    expect(
      within(nav).queryByRole("button", { name: "Galaxy" }),
    ).not.toBeInTheDocument();
    expect(nav).toHaveTextContent(/…/);
    expect(within(nav).getByText("Earth")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await user.click(within(nav).getByRole("button", { name: "Sol" }));
    expect(onSelect).toHaveBeenCalledWith({ kind: "narrative", id: "c" });
  });

  it("renders nothing for an empty trail", () => {
    const { container } = render(
      <InspectorBreadcrumb trail={[]} onSelect={() => undefined} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
