import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ObjectGroupIcon,
  ObjectItemBullet,
} from "../../src/components/ObjectBrowserIcons";
import { browserGroupDefinitions } from "../../src/narrative/browser";

describe("object browser icons", () => {
  it("renders one project-owned SVG icon for every browser group type", () => {
    expect(browserGroupDefinitions.at(-1)).toEqual({
      id: "vessels",
      label: "Vessels",
    });
    const { container } = render(
      <>
        {browserGroupDefinitions.map(({ id }) => (
          <ObjectGroupIcon key={id} type={id} />
        ))}
      </>,
    );
    expect(
      [...container.querySelectorAll("svg.group-type-icon")].map((icon) =>
        icon.getAttribute("data-icon-type"),
      ),
    ).toEqual(browserGroupDefinitions.map(({ id }) => id));
  });

  it("renders the shared per-item marker as SVG", () => {
    const { container } = render(<ObjectItemBullet active />);
    expect(
      container.querySelector("svg.object-item-bullet[data-item-bullet]"),
    ).toHaveClass("active");
  });
});
