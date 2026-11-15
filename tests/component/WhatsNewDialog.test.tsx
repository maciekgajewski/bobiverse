import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JEEVES_IMAGE_ALT } from "../../src/about-image";
import {
  WHATS_NEW_CAPTION_ENTITY_ID,
  WHATS_NEW_IMAGE_SRC,
  WhatsNewDialog,
} from "../../src/components/WhatsNewDialog";
import type { ReleaseNote } from "../../src/release-notes";

afterEach(cleanup);

/** Canvas size of an extended (VP8X) or lossless (VP8L) WebP file. */
function webpSize(asset: Buffer): { width: number; height: number } {
  const chunk = asset.subarray(12, 16).toString("latin1");
  if (chunk === "VP8X")
    return {
      width: asset.readUIntLE(24, 3) + 1,
      height: asset.readUIntLE(27, 3) + 1,
    };
  if (chunk === "VP8L") {
    const bits = asset.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  throw new Error(`Unexpected WebP chunk ${chunk}.`);
}

const NOTES: readonly ReleaseNote[] = [
  {
    version: "1.0.0",
    summary: "A fictional later release.",
    highlights: ["Fixture highlight one.", "Fixture highlight two."],
  },
  {
    version: "0.9.0",
    summary: "A fictional first release.",
    highlights: ["Fixture highlight three."],
  },
];

describe("WhatsNewDialog", () => {
  it("is a labelled modal dialog with Close focused on open", () => {
    render(<WhatsNewDialog onClose={vi.fn()} notes={NOTES} />);
    const dialog = screen.getByRole("dialog", { name: "What\u2019s new" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveClass("about-dialog", "whats-new-dialog");
    expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("lists every release, newest first, with its highlights", () => {
    render(<WhatsNewDialog onClose={vi.fn()} notes={NOTES} />);
    const dialog = screen.getByRole("dialog", { name: "What\u2019s new" });
    expect(
      within(dialog)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Version 1.0.0", "Version 0.9.0"]);
    const latest = within(dialog).getByRole("region", {
      name: "Version 1.0.0",
    });
    expect(within(latest).getAllByRole("listitem")).toHaveLength(2);
    expect(latest).toHaveTextContent("A fictional later release.");
  });

  it("shows the credited Jeeves picture with Jeeves as plain text by default", () => {
    render(<WhatsNewDialog onClose={vi.fn()} notes={NOTES} />);
    const dialog = screen.getByRole("dialog", { name: "What\u2019s new" });
    const image = within(dialog).getByRole("img", { name: JEEVES_IMAGE_ALT });
    expect(image).toHaveAttribute("src", WHATS_NEW_IMAGE_SRC);
    expect(image).toHaveAttribute("width", "150");
    expect(image).toHaveAttribute("height", "200");
    const caption = dialog.querySelector("figcaption")!;
    expect(caption.textContent).toMatch(/^Jeeves/);
    expect(
      within(caption).queryByRole("button", { name: "Jeeves" }),
    ).not.toBeInTheDocument();
    const links = within(caption).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://commons.wikimedia.org/wiki/File:John_Cleese_at_1989_Oscars.jpg",
      "https://commons.wikimedia.org/wiki/File:John_Cleese_(cropped).jpg",
    ]);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(WHATS_NEW_CAPTION_ENTITY_ID).toBe("technology:jeeves");
  });

  it("offers Jeeves's card only when the caller allows it", async () => {
    const user = userEvent.setup();
    const onOpenJeeves = vi.fn();
    render(
      <WhatsNewDialog
        onClose={vi.fn()}
        onOpenJeeves={onOpenJeeves}
        notes={NOTES}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Jeeves" }));
    expect(onOpenJeeves).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape, the X and the backdrop", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<WhatsNewDialog onClose={onClose} notes={NOTES} />);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(document.querySelector(".about-backdrop")!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("ships both Jeeves assets as small WebP files with credits", () => {
    const credits = readFileSync(resolve("public/assets/CREDITS.md"), "utf8");
    for (const [file, width, height] of [
      ["jeeves.webp", 150, 200],
      ["jeeves-head.webp", 66, 66],
    ] as const) {
      const path = resolve("public/assets", file);
      expect(existsSync(path)).toBe(true);
      const asset = readFileSync(path);
      expect(asset.subarray(0, 4).toString("latin1")).toBe("RIFF");
      expect(asset.subarray(8, 12).toString("latin1")).toBe("WEBP");
      expect(asset.byteLength).toBeLessThan(20_000);
      expect(webpSize(asset)).toEqual({ width, height });
      expect(credits).toContain(`## \`${file}\``);
    }
    expect(credits.replace(/\s+/g, " ")).toContain(
      JEEVES_IMAGE_ALT.split(";")[0],
    );
  });
});
