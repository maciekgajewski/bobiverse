import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve("src/styles.css"), "utf8");

describe("shared visual-system styles", () => {
  it("defines decorative scrollbars globally", () => {
    expect(styles).toMatch(
      /@supports not selector\(::-webkit-scrollbar\)\s*{[^}]*:where\(\*:not\(select\):not\(option\):not\(optgroup\)\)\s*{[^}]*scrollbar-color:\s*var\(--line-accent\) transparent;[^}]*scrollbar-width:\s*thin;/s,
    );
    expect(styles).toMatch(
      /:where\(select, option, optgroup\)\s*{[^}]*scrollbar-color:\s*auto;[^}]*scrollbar-width:\s*auto;/s,
    );
    const applicationSurface =
      ":where(*:not(select):not(option):not(optgroup))";
    expect(styles).toContain(`${applicationSurface}::-webkit-scrollbar {`);
    expect(styles).toContain(
      `${applicationSurface}::-webkit-scrollbar-track {`,
    );
    expect(styles).toContain(
      `${applicationSurface}::-webkit-scrollbar-thumb {`,
    );
    expect(styles).toContain(
      `${applicationSurface}::-webkit-scrollbar-thumb:hover {`,
    );
    expect(styles).not.toMatch(/^select::-(?:webkit-)?scrollbar/m);
  });

  it("keeps the compact chapter timeline centered on its endpoint dots", () => {
    expect(styles).toMatch(
      /\.chapter-track::before\s*{[^}]*right:\s*2\.75rem;[^}]*left:\s*2\.75rem;/s,
    );
    expect(styles).toMatch(
      /\.chapter-track-entry,\s*\.chapter-track-zero\s*{[^}]*min-width:\s*5\.5rem;/s,
    );
  });
});
