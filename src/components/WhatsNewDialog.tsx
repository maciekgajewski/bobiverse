import { JEEVES_IMAGE_ALT, JEEVES_IMAGE_REFERENCES } from "../about-image";
import { RELEASE_NOTES, type ReleaseNote } from "../release-notes";
import { ExternalLink, InfoDialogFrame } from "./AboutDialog";

// What's new: the release notes from src/release-notes.ts in the About
// dialog's frame and layout, with the Jeeves illustration where About has
// Admiral Ackbar.
export const WHATS_NEW_TITLE = "What\u2019s new";
export const WHATS_NEW_IMAGE_SRC = "/assets/jeeves.webp";
export const WHATS_NEW_IMAGE_ALT = JEEVES_IMAGE_ALT;
// The narrative entity the caption's "Jeeves" opens when it is reader-known.
export const WHATS_NEW_CAPTION_ENTITY_ID = "technology:jeeves";
const WHATS_NEW_CAPTION_ENTITY_LABEL = "Jeeves";

export function WhatsNewDialog({
  onClose,
  onOpenJeeves = null,
  notes = RELEASE_NOTES,
}: {
  onClose: () => void;
  /**
   * Opens Jeeves's info card. The caller passes it only while Jeeves is known
   * at the reader's knowledge chapter; without it "Jeeves" is plain text, so
   * the caption never opens a card the reader has not reached.
   */
  onOpenJeeves?: (() => void) | null;
  notes?: readonly ReleaseNote[];
}) {
  return (
    <InfoDialogFrame
      titleId="whats-new-title"
      title={WHATS_NEW_TITLE}
      onClose={onClose}
      className="whats-new-dialog"
    >
      <div className="about-intro">
        <figure className="about-figure">
          <img
            src={WHATS_NEW_IMAGE_SRC}
            alt={WHATS_NEW_IMAGE_ALT}
            width={150}
            height={200}
            decoding="async"
          />
          <figcaption>
            {onOpenJeeves ? (
              <button
                type="button"
                className="link-button about-caption-entity"
                onClick={onOpenJeeves}
              >
                {WHATS_NEW_CAPTION_ENTITY_LABEL}
              </button>
            ) : (
              WHATS_NEW_CAPTION_ENTITY_LABEL
            )}
            <span className="whats-new-credit">
              Original painting; likeness references:{" "}
              {JEEVES_IMAGE_REFERENCES.map((reference, index) => (
                <span key={reference.href}>
                  {index > 0 && ", "}
                  <ExternalLink href={reference.href}>
                    {reference.label}
                  </ExternalLink>
                </span>
              ))}{" "}
              (CC BY 2.0)
            </span>
          </figcaption>
        </figure>
        <div className="about-copy whats-new-notes">
          {notes.map((note) => (
            <section
              key={note.version}
              className="whats-new-release"
              aria-labelledby={`whats-new-${note.version}`}
            >
              <h3 id={`whats-new-${note.version}`}>Version {note.version}</h3>
              <p>{note.summary}</p>
              <ul>
                {note.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </InfoDialogFrame>
  );
}
