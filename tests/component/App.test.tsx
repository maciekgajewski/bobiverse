import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";

describe("atlas shell", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("keeps DOM-based selection available when WebGL is unavailable", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      screen.getByText(
        "Select a stellar system to inspect its catalogue facts.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Alpha Centauri" }));
    expect(
      screen.getByRole("heading", { name: "Alpha Centauri" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/WebGL unavailable/i)).toBeInTheDocument();
  });

  it("measures between two directory-selected systems and toggles presentation units", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Measure" }));
    await user.click(screen.getByRole("button", { name: "Sol" }));
    await user.click(screen.getByRole("button", { name: "Barnard's Star" }));
    expect(screen.getByLabelText("Measured separation")).toHaveTextContent(
      "ly straight-line separation",
    );
    await user.click(screen.getByRole("button", { name: "pc" }));
    expect(screen.getByLabelText("Measured separation")).toHaveTextContent(
      "pc straight-line separation",
    );
    expect(screen.getByRole("button", { name: "Clear endpoints" })).toHaveClass(
      "button",
    );
  });
});
