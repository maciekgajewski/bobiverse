import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { linkifyCreditText } from "../../src/components/AboutDialog";

function renderCredits(text: string) {
  const { container } = render(<>{linkifyCreditText(text)}</>);
  return container;
}

describe("linkifyCreditText", () => {
  it("keeps a closing parenthesis and period after a DOI link", () => {
    const text =
      "This research has made use of the VizieR catalogue access tool, CDS, Strasbourg, France (DOI: 10.26093/cds/vizier).";
    const container = renderCredits(text);
    const link = container.querySelector("a");
    expect(link).toHaveAttribute("href", "https://doi.org/10.26093/cds/vizier");
    expect(link).toHaveTextContent("DOI: 10.26093/cds/vizier");
    expect(link?.textContent?.endsWith(")")).toBe(false);
    expect(container.textContent).toBe(text);
  });

  it("keeps a period after a URL as plain text", () => {
    const text = "See https://www.cosmos.esa.int/gaia.";
    const container = renderCredits(text);
    const link = container.querySelector("a");
    expect(link).toHaveAttribute("href", "https://www.cosmos.esa.int/gaia");
    expect(link).toHaveTextContent("https://www.cosmos.esa.int/gaia");
    expect(link?.textContent).not.toMatch(/\.$/);
    expect(container.textContent).toBe(text);
  });
});
