import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ABOUT_IMAGE_ALT } from "../about-image";

// The About ("What is this?") dialog. The body copy is Maciej's own text,
// kept verbatim in AboutCopy so it can be edited in one place.
export const ABOUT_TITLE = "What is this?";
export const ABOUT_IMAGE_SRC = "/assets/ackbar.webp";
// Full credit, kept in a neutral module; re-exported for the dialog's users.
export { ABOUT_IMAGE_ALT };
export const ABOUT_IMAGE_SOURCE =
  "https://starwars.fandom.com/wiki/File:Ackbar-NEGTC.png";
// The caption is "<entity>, or <source>": the entity part opens GUPPI when it
// is reader-known and the source part links to ABOUT_IMAGE_SOURCE.
const ABOUT_CAPTION_ENTITY_LABEL = "GUPPI";
const ABOUT_CAPTION_SOURCE_LABEL = "Admiral Ackbar";
const ABOUT_CAPTION_JOIN = ", or ";
export const ABOUT_IMAGE_CAPTION = `${ABOUT_CAPTION_ENTITY_LABEL}${ABOUT_CAPTION_JOIN}${ABOUT_CAPTION_SOURCE_LABEL}`;
// The narrative entity the caption's "GUPPI" opens when it is reader-known.
export const ABOUT_CAPTION_ENTITY_ID = "technology:guppi-interface";

const FOCUSABLE_DIALOG_ELEMENTS =
  'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])';

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

export function AboutDialog({
  onClose,
  onOpenGuppi = null,
}: {
  onClose: () => void;
  /**
   * Opens GUPPI's info card. The caller passes it only while GUPPI is known
   * at the reader's knowledge chapter; without it "GUPPI" is plain text, so
   * the caption never leaks a spoiler or opens a hidden card.
   */
  onOpenGuppi?: (() => void) | null;
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
        <div className="about-body">
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
                  {ABOUT_CAPTION_ENTITY_LABEL}
                </button>
              ) : (
                ABOUT_CAPTION_ENTITY_LABEL
              )}
              {ABOUT_CAPTION_JOIN}
              <ExternalLink href={ABOUT_IMAGE_SOURCE}>
                {ABOUT_CAPTION_SOURCE_LABEL}
              </ExternalLink>
            </figcaption>
          </figure>
          <div className="about-copy">
            <AboutCopy />
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
