import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useFocusAfterCommit } from "../../src/components/useFocusAfterCommit";

// Stands in for React Three Fiber's <Canvas>, which rethrows a loading
// scene's promise to the app root (BOB-20261116-TB1C66).
const scene: { setBlock: (block: Promise<void> | false) => void } = {
  setBlock: () => {},
};
function Scene() {
  const [block, setBlock] = useState<Promise<void> | false>(false);
  useEffect(() => {
    scene.setBlock = setBlock;
  }, []);
  if (block) throw block;
  return null;
}

function Shell() {
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const focusAfterCommit = useFocusAfterCommit(open);
  return (
    <>
      <main inert={open}>
        <button ref={opener} type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        <Scene />
      </main>
      {open && (
        <div role="dialog" aria-label="Notes">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              focusAfterCommit(() => opener.current);
            }}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}

afterEach(cleanup);

describe("useFocusAfterCommit", () => {
  it("focuses the opener in the commit that closes the layer", () => {
    render(<Shell />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    screen.getByRole("button", { name: "Close" }).focus();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Open" }),
    );
  });

  it("waits for a close that commits late because the root suspended", async () => {
    render(<Shell />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const close = screen.getByRole("button", { name: "Close" });
    close.focus();
    act(() => scene.setBlock(new Promise<void>(() => {})));
    fireEvent.click(close);
    // A timer-based focus would run here, while the shell is still inert.
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.querySelector("main")!.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(close);

    await act(async () => scene.setBlock(false));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("main")!.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Open" }),
    );
  });
});
