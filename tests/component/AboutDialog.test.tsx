import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ABOUT_CAPTION_ENTITY_ID,
  ABOUT_IMAGE_ALT,
  ABOUT_IMAGE_CAPTION,
  ABOUT_IMAGE_SOURCE,
  ABOUT_IMAGE_SRC,
  AboutDialog,
} from "../../src/components/AboutDialog";

const CREDIT =
  "Admiral Ackbar illustration by Michael Sutfin, from The New Essential Guide to Characters. Star Wars © Lucasfilm Ltd. Used under fair use.";
const CAPTION = "GUPPI, or Admiral Ackbar";
const SOURCE = "https://starwars.fandom.com/wiki/File:Ackbar-NEGTC.png";

describe("AboutDialog", () => {
  afterEach(() => cleanup());

  it("is a labelled modal dialog with Close focused on open", () => {
    render(<AboutDialog onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog", { name: "What is this?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "about-title");
    expect(dialog).not.toHaveAttribute("aria-label");
    expect(
      within(dialog).getByRole("heading", { level: 2, name: "What is this?" }),
    ).toHaveAttribute("id", "about-title");
    expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();
    expect(dialog.querySelector(".about-body")).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("renders Maciej's text verbatim with a numbered list", () => {
    render(<AboutDialog onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog", { name: "What is this?" });
    const copy = dialog.querySelector(".about-copy")!;
    const paragraphs = [...copy.querySelectorAll("p")].map((p) =>
      p.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(paragraphs).toEqual([
      "This is a Bobiverse star map and timeline visualiser. It is meant as an interactive, spoiler-free companion to the Bobiverse books by Dennis E. Taylor.",
      "How to use:",
      "Contact: maciek@bobiverse.space",
      "Source: github.com/maciekgajewski/bobiverse",
    ]);
    const list = within(
      dialog.querySelector(".about-copy") as HTMLElement,
    ).getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual([
      "Select a book chapter you have already read. This prevents the app from displaying any information that has not yet been mentioned in the books.",
      "Use the 3D map to get a feel for where the stars are in relation to each other in space.",
      "Use the search box and object browser to get detailed information about stars, planets, characters and events, all spoiler-free.",
      "The timeline mode displays events in chronological order. This helps untangle the non-linear parts of the narrative.",
    ]);
    expect(dialog.textContent).not.toMatch(/placeholder/i);
  });

  it("links the author, contact address and source repository", () => {
    render(<AboutDialog onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog", { name: "What is this?" });
    const author = within(dialog).getByRole("link", {
      name: "Dennis E. Taylor",
    });
    expect(author).toHaveAttribute(
      "href",
      "http://dennisetaylor.org/status-of-things/",
    );
    const source = within(dialog).getByRole("link", {
      name: "github.com/maciekgajewski/bobiverse",
    });
    expect(source).toHaveAttribute(
      "href",
      "https://github.com/maciekgajewski/bobiverse",
    );
    for (const external of [author, source]) {
      expect(external).toHaveAttribute("target", "_blank");
      expect(external).toHaveAttribute("rel", "noopener noreferrer");
    }
    const contact = within(dialog).getByRole("link", {
      name: "maciek@bobiverse.space",
    });
    expect(contact).toHaveAttribute("href", "mailto:maciek@bobiverse.space");
    expect(contact).not.toHaveAttribute("target");
    const intro = dialog.querySelector(".about-intro")!;
    expect(within(intro as HTMLElement).getAllByRole("link")).toHaveLength(4);
  });

  it("shows the Ackbar image with the credit as alt text and a short caption link", () => {
    render(<AboutDialog onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog", { name: "What is this?" });
    const image = within(dialog).getByRole("img", { name: CREDIT });
    expect(image).toHaveAttribute("alt", CREDIT);
    expect(image).toHaveAttribute("src", "/assets/ackbar.webp");
    expect(image).toHaveAttribute("width", "150");
    expect(image).toHaveAttribute("height", "200");
    const caption = dialog.querySelector("figure figcaption");
    expect(caption).toHaveTextContent(CAPTION, { normalizeWhitespace: false });
    expect(caption?.textContent).toBe(CAPTION);
    const captionLink = within(dialog).getByRole("link", {
      name: "Admiral Ackbar",
    });
    expect(captionLink).toHaveAttribute("href", SOURCE);
    expect(captionLink).toHaveAttribute("target", "_blank");
    expect(captionLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(caption?.contains(captionLink)).toBe(true);
    expect(ABOUT_IMAGE_ALT).toBe(CREDIT);
    expect(ABOUT_IMAGE_CAPTION).toBe(CAPTION);
    expect(ABOUT_IMAGE_SOURCE).toBe(SOURCE);
  });

  it("renders GUPPI as plain text when no GUPPI card can be opened", () => {
    render(<AboutDialog onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog", { name: "What is this?" });
    const caption = dialog.querySelector("figure figcaption")!;
    expect(caption.textContent).toBe(CAPTION);
    expect(
      within(dialog).queryByRole("button", { name: "GUPPI" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("link", { name: "GUPPI" }),
    ).not.toBeInTheDocument();
    expect(caption.querySelector("button, a[href*='guppi' i]")).toBeNull();
    expect(within(caption as HTMLElement).getAllByRole("link")).toHaveLength(1);
  });

  it("makes GUPPI open its card when the caller allows it", async () => {
    const user = userEvent.setup();
    const onOpenGuppi = vi.fn();
    const onClose = vi.fn();
    render(<AboutDialog onClose={onClose} onOpenGuppi={onOpenGuppi} />);
    const dialog = screen.getByRole("dialog", { name: "What is this?" });
    const caption = dialog.querySelector("figure figcaption")!;
    expect(caption.textContent).toBe(CAPTION);
    const guppi = within(dialog).getByRole("button", { name: "GUPPI" });
    expect(caption.contains(guppi)).toBe(true);
    expect(guppi).toHaveAttribute("type", "button");
    // "Admiral Ackbar" keeps its source link.
    expect(
      within(dialog).getByRole("link", { name: "Admiral Ackbar" }),
    ).toHaveAttribute("href", SOURCE);
    expect(ABOUT_CAPTION_ENTITY_ID).toBe("technology:guppi-interface");
    await user.click(guppi);
    expect(onOpenGuppi).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("includes the GUPPI control in the focus trap when it is offered", async () => {
    const user = userEvent.setup();
    render(
      <AboutDialog onClose={() => undefined} onOpenGuppi={() => undefined} />,
    );
    const dialog = screen.getByRole("dialog", { name: "What is this?" });
    const close = within(dialog).getByRole("button", { name: "Close" });
    expect(close).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole("button", { name: "GUPPI" })).toHaveFocus();
    await user.tab();
    expect(
      within(dialog).getByRole("link", { name: "Admiral Ackbar" }),
    ).toHaveFocus();
    await user.tab({ shift: true });
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
  });

  it("ships the image asset and a matching credits file", () => {
    const asset = readFileSync(resolve("public", ABOUT_IMAGE_SRC.slice(1)));
    expect(asset.subarray(0, 4).toString("latin1")).toBe("RIFF");
    expect(asset.subarray(8, 12).toString("latin1")).toBe("WEBP");
    expect(asset.byteLength).toBeLessThan(20_000);
    const credits = readFileSync(resolve("public/assets/CREDITS.md"), "utf8");
    expect(credits.replace(/\s+/g, " ")).toContain(CREDIT);
    expect(credits).toContain(SOURCE);
    expect(credits).toMatch(/cropped/i);
    expect(credits).toMatch(/resized/i);
  });

  it("closes on the Close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AboutDialog onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AboutDialog onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a backdrop click but not on a click inside the dialog", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AboutDialog onClose={onClose} />);
    await user.click(screen.getByText("How to use:"));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(document.querySelector(".about-backdrop")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab and Shift+Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Outside</button>
        <AboutDialog onClose={() => undefined} />
      </>,
    );
    const dialog = screen.getByRole("dialog", { name: "What is this?" });
    const close = within(dialog).getByRole("button", { name: "Close" });
    const captionLink = within(dialog).getByRole("link", {
      name: "Admiral Ackbar",
    });
    const author = within(dialog).getByRole("link", {
      name: "Dennis E. Taylor",
    });
    const contact = within(dialog).getByRole("link", {
      name: "maciek@bobiverse.space",
    });
    const source = within(dialog).getByRole("link", {
      name: "github.com/maciekgajewski/bobiverse",
    });
    expect(close).toHaveFocus();
    await user.tab();
    expect(captionLink).toHaveFocus();
    await user.tab();
    expect(author).toHaveFocus();
    await user.tab();
    expect(contact).toHaveFocus();
    await user.tab();
    expect(source).toHaveFocus();
    await user.tab();
    expect(
      within(dialog).getByRole("link", {
        name: "Astronomy backdrop: NASA/Goddard Space Flight Center Scientific Visualization Studio, Deep Star Maps 2020; Gaia DR2: ESA/Gaia/DPAC.",
      }),
    ).toHaveFocus();
    // Credits and Privacy add more focusable links; wrap from the last one.
    const last = within(dialog).getByRole("link", {
      name: "starwars.fandom.com",
    });
    last.focus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    // Focus that lands on the dialog itself (a click on its text) re-enters
    // the cycle instead of escaping it.
    dialog.focus();
    await user.tab();
    expect(close).toHaveFocus();
    expect(screen.getByRole("button", { name: "Outside" })).not.toHaveFocus();
  });

  it("lists Credits for the starfield, every catalogue acknowledgement, the font and Ackbar", () => {
    render(<AboutDialog onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog", { name: "What is this?" });
    const credits = within(dialog).getByRole("heading", { name: "Credits" });
    expect(credits.tagName).toBe("H3");
    const section = credits.closest("section")!;
    expect(
      within(section).getByRole("link", {
        name: "Astronomy backdrop: NASA/Goddard Space Flight Center Scientific Visualization Studio, Deep Star Maps 2020; Gaia DR2: ESA/Gaia/DPAC.",
      }),
    ).toHaveAttribute("href", "https://svs.gsfc.nasa.gov/4851/");
    expect(section.textContent).toContain("ESA");
    expect(section.textContent).toContain("DPAC");
    expect(section.textContent).toContain("VizieR");
    expect(section.textContent).toContain("Golovin");
    expect(section.textContent).toContain("Washington Double Star");
    expect(section.textContent).toContain("Noto Sans");
    expect(section.textContent).toContain("SIL Open Font License");
    expect(
      within(section).getByRole("link", { name: "openfontlicense.org" }),
    ).toHaveAttribute("href", "https://openfontlicense.org");
    expect(section.textContent).toContain(CREDIT);
    expect(
      within(section).getByRole("link", { name: "starwars.fandom.com" }),
    ).toHaveAttribute("href", SOURCE);
  });

  it("states the verified privacy claims and forgets progress only after confirm", async () => {
    const user = userEvent.setup();
    const onForgetProgress = vi.fn();
    render(
      <AboutDialog
        onClose={() => undefined}
        onForgetProgress={onForgetProgress}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "What is this?" });
    const privacy = within(dialog)
      .getByRole("heading", { name: "Privacy" })
      .closest("section")!;
    expect(privacy.textContent).toMatch(/no cookies or tracking/i);
    expect(privacy.textContent).toMatch(
      /reading progress and app preferences stay in this browser/i,
    );
    expect(privacy.textContent).not.toMatch(/third-party network requests/i);
    expect(privacy.textContent).not.toMatch(/web-?server|IP address/i);
    const forget = within(privacy).getByRole("button", {
      name: "Forget my progress",
    });
    forget.focus();
    await user.tab();
    expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(forget).toHaveFocus();
    await user.click(forget);
    expect(onForgetProgress).not.toHaveBeenCalled();
    await user.click(within(privacy).getByRole("button", { name: "Cancel" }));
    expect(onForgetProgress).not.toHaveBeenCalled();
    expect(
      within(privacy).getByRole("button", { name: "Forget my progress" }),
    ).toBeInTheDocument();
    await user.click(
      within(privacy).getByRole("button", { name: "Forget my progress" }),
    );
    await user.click(
      within(privacy).getByRole("button", { name: "Forget progress" }),
    );
    expect(onForgetProgress).toHaveBeenCalledTimes(1);
  });
});
