import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { catalogueAcknowledgements } from "../domain/catalogue-acknowledgements";
import {
  GALACTIC_STARFIELD_SOURCE_URL,
  GALACTIC_STARFIELD_UI_CREDIT,
} from "../domain/galactic-starfield";

// The About ("What is this?") dialog. The body copy is Maciej's own text,
// kept verbatim in AboutCopy so it can be edited in one place.
export const ABOUT_TITLE = "What is this?";
export const ABOUT_IMAGE_SRC = "/assets/ackbar.webp";
// Full credit; also matches the credit block in public/assets/CREDITS.md.
export const ABOUT_IMAGE_ALT =
  "Admiral Ackbar illustration by Michael Sutfin, from The New Essential Guide to Characters. Star Wars © Lucasfilm Ltd. Used under fair use.";
export const ABOUT_IMAGE_SOURCE =
  "https://starwars.fandom.com/wiki/File:Ackbar-NEGTC.png";
export const ABOUT_IMAGE_CAPTION = "GUPPI, or Admiral Ackbar";
// The narrative entity the caption's "GUPPI" opens when it is reader-known.
export const ABOUT_CAPTION_ENTITY_ID = "technology:guppi-interface";

export const NOTO_SANS_OFL_URL = "https://openfontlicense.org";
export const NOTO_SANS_CREDIT =
  "The interface uses the Noto Sans typeface, copyright Google LLC and contributors, licensed under the SIL Open Font License, Version 1.1.";

const FOCUSABLE_DIALOG_ELEMENTS =
  'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])';

const LINK_TOKEN =
  /https?:\/\/[^\s)]+|DOI:\s*10\.\d{2,}\/\S+?(?=[,.;)]?(?:\s|$))/g;

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** Turn bare URLs and DOI: prefixes in catalogue text into user-initiated links. */
export function linkifyCreditText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(LINK_TOKEN.source, "g");
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const href = token.startsWith("DOI:")
      ? `https://doi.org/${token.replace(/^DOI:\s*/, "").replace(/[),.;]+$/, "")}`
      : token;
    const label = token.startsWith("DOI:")
      ? token.replace(/[),.;]+$/, "")
      : token;
    parts.push(
      <ExternalLink href={href} key={`${href}-${match.index}`}>
        {label}
      </ExternalLink>,
    );
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function AboutCopy() {
  return (
    <>
      <p>
        This is a Bobiverse star map and timeline visualiser. It is meant as an
        interactive, spoiler-free companion to the Bobiverse books by{" "}
        <ExternalLink href="http://dennisetaylor.org/status-of-things/">
          Dennis E. Taylor
        </ExternalLink>
        .
      </p>
      <p>How to use:</p>
      <ol>
        <li>
          Select a book chapter you have already read. This prevents the app
          from displaying any information that has not yet been mentioned in the
          books.
        </li>
        <li>
          Use the 3D map to get a feel for where the stars are in relation to
          each other in space.
        </li>
        <li>
          Use the search box and object browser to get detailed information
          about stars, planets, characters and events, all spoiler-free.
        </li>
        <li>
          The timeline mode displays events in chronological order. This helps
          untangle the non-linear parts of the narrative.
        </li>
      </ol>
      <p className="about-meta">
        Contact:{" "}
        <a href="mailto:maciek@bobiverse.space">maciek@bobiverse.space</a>
      </p>
      <p className="about-meta">
        Source:{" "}
        <ExternalLink href="https://github.com/maciekgajewski/bobiverse">
          github.com/maciekgajewski/bobiverse
        </ExternalLink>
      </p>
    </>
  );
}

export function AboutCredits() {
  const catalogues = catalogueAcknowledgements();
  return (
    <section
      className="about-section about-credits"
      aria-labelledby="about-credits-heading"
    >
      <h3 id="about-credits-heading">Credits</h3>
      <ul>
        <li>
          <ExternalLink href={GALACTIC_STARFIELD_SOURCE_URL}>
            {GALACTIC_STARFIELD_UI_CREDIT}
          </ExternalLink>
        </li>
        {catalogues.map((text) => (
          <li key={text}>{linkifyCreditText(text)}</li>
        ))}
        <li>
          {NOTO_SANS_CREDIT}{" "}
          <ExternalLink href={NOTO_SANS_OFL_URL}>
            openfontlicense.org
          </ExternalLink>
        </li>
        <li>
          {ABOUT_IMAGE_ALT} Used in this dialog and as GUPPI's inspector
          illustration. Source:{" "}
          <ExternalLink href={ABOUT_IMAGE_SOURCE}>
            starwars.fandom.com
          </ExternalLink>
          .
        </li>
      </ul>
    </section>
  );
}

export function AboutPrivacy({
  onForgetProgress,
}: {
  onForgetProgress?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <section
      className="about-section about-privacy"
      aria-labelledby="about-privacy-heading"
    >
      <h3 id="about-privacy-heading">Privacy</h3>
      <p>
        No cookies or tracking. Your reading progress and app preferences stay
        in this browser.
      </p>
      {onForgetProgress ? (
        confirming ? (
          <div className="about-forget-confirm">
            <p>
              Forget your reading progress and app preferences in this browser?
              This cannot be undone.
            </p>
            <div className="about-forget-actions">
              <button
                type="button"
                className="about-forget-confirm-button"
                onClick={() => {
                  onForgetProgress();
                  setConfirming(false);
                }}
              >
                Forget progress
              </button>
              <button
                type="button"
                className="about-forget-cancel"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="about-forget"
            onClick={() => setConfirming(true)}
          >
            Forget my progress
          </button>
        )
      ) : null}
    </section>
  );
}

export function AboutDialog({
  onClose,
  onOpenGuppi = null,
  onForgetProgress,
}: {
  onClose: () => void;
  /**
   * Opens GUPPI's info card. The caller passes it only while GUPPI is known
   * at the reader's knowledge chapter; without it "GUPPI" is plain text, so
   * the caption never leaks a spoiler or opens a hidden card.
   */
  onOpenGuppi?: (() => void) | null;
  /** Clears every app-owned localStorage key and resets in-memory reader state. */
  onForgetProgress?: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
  }, []);

  // Escape closes; Tab and Shift+Tab stay inside the dialog. The listener is
  // on the document so it also catches keys pressed while focus has fallen
  // outside the dialog (for example after a click on its plain text).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      // Filter in document order: some selector engines return a selector
      // list grouped by selector rather than in document order.
      const focusable = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>("*") ?? [],
      ).filter((element) => element.matches(FOCUSABLE_DIALOG_ELEMENTS));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      const inside = focusable.includes(active as HTMLElement);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <>
      <div className="about-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialog}
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        tabIndex={-1}
      >
        <header className="about-header">
          <h2 id="about-title">{ABOUT_TITLE}</h2>
          <button
            ref={closeButton}
            type="button"
            className="about-close"
            aria-label="Close"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
            </svg>
          </button>
        </header>
        <div className="about-body" tabIndex={-1}>
          <div className="about-intro">
            <figure className="about-figure">
              <img
                src={ABOUT_IMAGE_SRC}
                alt={ABOUT_IMAGE_ALT}
                width={150}
                height={200}
                decoding="async"
              />
              <figcaption>
                {onOpenGuppi ? (
                  <button
                    type="button"
                    className="link-button about-caption-entity"
                    onClick={onOpenGuppi}
                  >
                    GUPPI
                  </button>
                ) : (
                  "GUPPI"
                )}
                , or{" "}
                <ExternalLink href={ABOUT_IMAGE_SOURCE}>
                  Admiral Ackbar
                </ExternalLink>
              </figcaption>
            </figure>
            <div className="about-copy">
              <AboutCopy />
            </div>
          </div>
          <AboutCredits />
          <AboutPrivacy onForgetProgress={onForgetProgress} />
        </div>
      </div>
    </>,
    document.body,
  );
}
