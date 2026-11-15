import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NarrativeText } from "../../src/components/NarrativeText";
import type { NarrativeEntity } from "../../src/narrative/model";

// Every text here is synthetic. No book text is read or written.

const town: NarrativeEntity = {
  id: "location:fixture-town",
  entity_type: "location",
  name: "Fixture Town",
};
const entities = new Map([[town.id, town]]);

afterEach(cleanup);

describe("NarrativeText", () => {
  it("renders a visible target as an inline entity button with its current name", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <p>
        <NarrativeText
          text="Works at [[location:fixture-town]] and [[location:fixture-town|there]]."
          entities={entities}
          onSelect={onSelect}
        />
      </p>,
    );
    expect(container.textContent).toBe("Works at Fixture Town and there.");
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Fixture Town",
      "there",
    ]);
    expect(buttons[0]).toHaveAttribute("type", "button");
    expect(buttons[0]).toHaveClass("link-button", "inline-entity-link");
    await user.click(buttons[1]!);
    expect(onSelect).toHaveBeenCalledWith({
      kind: "narrative",
      id: "location:fixture-town",
    });
  });

  it("renders a hidden target as plain text with no hint, using the fallback name", () => {
    const text =
      "Built before the [[event:fixture-war]] near [[vessel:fixture-ship|a ship]].";
    const { container } = render(
      <p>
        <NarrativeText
          text={text}
          entities={entities}
          onSelect={vi.fn()}
          fallbackLabels={new Map([[text, ["Fixture war", "a ship"]]])}
        />
      </p>,
    );
    expect(container.textContent).toBe(
      "Built before the Fixture war near a ship.",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector("[title], a")).toBeNull();
  });

  it("unescapes literals and keeps markup-like text as text", () => {
    const { container } = render(
      <p>
        <NarrativeText
          text={"Tagged \\[[draft\\]] in a \\\\ folder with <b>tags</b>."}
          entities={entities}
          onSelect={vi.fn()}
        />
      </p>,
    );
    expect(container.textContent).toBe(
      "Tagged [[draft]] in a \\ folder with <b>tags</b>.",
    );
    expect(container.querySelector("b")).toBeNull();
  });
});
