import type { SelectionIdentity } from "../domain/selection";
import { parseInlineLinks } from "../narrative/inline-links";
import type { NarrativeEntity } from "../narrative/model";

/**
 * Narrative prose with inline entity links (ADR-0029).
 *
 * Text renders as React text, so it stays escaped. A link whose target is in the
 * current projected world (`entities`, the same map relationship links use)
 * renders as an inline entity button that selects the target. A link whose target
 * the current view does not project renders its label as plain text, with no
 * hint that a link exists. `[[id]]` shows the target's current name when it is
 * visible, and otherwise the precomputed name as of the write's chapter from
 * `fallbackLabels`. If a hidden bare link has no fallback (text that did not
 * come from the prepared corpus), it shows the target's slug as words, never the
 * raw ID. Text that does not parse (the validator rejects it before it reaches
 * readers) is shown as written.
 */
/** `location:new-town` becomes `new town`: a last resort that hides the ID form. */
function slugWords(target: string): string {
  return target.slice(target.indexOf(":") + 1).replaceAll("-", " ");
}

export function NarrativeText({
  text,
  entities,
  onSelect,
  fallbackLabels,
}: {
  text: string;
  entities: ReadonlyMap<string, NarrativeEntity>;
  onSelect: (selection: SelectionIdentity) => void;
  fallbackLabels: ReadonlyMap<string, readonly string[]>;
}) {
  const parsed = parseInlineLinks(text);
  if (!parsed.ok) return <>{text}</>;
  return (
    <>
      {parsed.segments.map((segment, index) => {
        if (segment.kind === "text") return segment.text;
        const target = entities.get(segment.target);
        const label =
          segment.label ??
          (target
            ? String(target.name)
            : (fallbackLabels.get(text)?.[segment.index] ??
              slugWords(segment.target)));
        if (!target) return label;
        return (
          <button
            key={`link-${index}`}
            type="button"
            className="link-button inline-entity-link"
            data-entity-id={segment.target}
            onClick={() => onSelect({ kind: "narrative", id: segment.target })}
          >
            {label}
          </button>
        );
      })}
    </>
  );
}
