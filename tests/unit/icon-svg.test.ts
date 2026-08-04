import { describe, expect, it } from "vitest";
import { iconSvgViolation } from "../../src/narrative/icon-svg";

const svg = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="black">${content}</svg>`;

describe("icon SVG safety policy", () => {
  it("accepts the production monochrome-mask vocabulary", () => {
    expect(iconSvgViolation(svg('<path d="M1 1h4"/>'))).toBeNull();
    expect(
      iconSvgViolation(
        "<svg viewBox='0 0 48 48' FILL='none' STROKE='BLACK'><circle cx='24' cy='24' r='10'/></svg>",
      ),
    ).toBeNull();
  });

  it.each([
    ["CSS paint", svg("<style>path { fill: red; }</style><path d='M1 1h4'/>")],
    [
      "CSS external URL",
      svg(
        "<style>path { fill: url(https://example.invalid/icon); }</style><path d='M1 1h4'/>",
      ),
    ],
    [
      "single-quoted colour",
      "<svg viewBox='0 0 48 48' fill='red'><path d='M1 1h4'/></svg>",
    ],
    [
      "case-varied colour",
      "<svg viewBox='0 0 48 48' FILL=\"RED\"><path d='M1 1h4'/></svg>",
    ],
    ["external reference", svg("<use HREF='https://example.invalid/icon'/>")],
  ])("rejects %s", (_label, source) => {
    expect(iconSvgViolation(source)).not.toBeNull();
  });
});
