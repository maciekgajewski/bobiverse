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

  it("keeps unit controls and removes the measurement tool", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "pc" }));
    expect(screen.getByTestId("map-scale-label")).toHaveTextContent("pc");
    expect(
      screen.queryByRole("button", { name: "Measure" }),
    ).not.toBeInTheDocument();
  });

  it("always exposes the accessible text-only backdrop credit", () => {
    render(<App />);
    expect(
      screen.getByRole("link", {
        name: /Astronomy backdrop: NASA\/Goddard Space Flight Center/i,
      }),
    ).toHaveAttribute("href", "https://svs.gsfc.nasa.gov/4851/");
  });
});
