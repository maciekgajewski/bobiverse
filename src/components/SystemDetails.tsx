import type { StellarSystem } from "../domain/types";
import {
  DISPLAY_DISTANCE_UNIT,
  convertParsecsToLightYears,
  formatDistance,
} from "../domain/units";

export function SystemDetails({
  system,
  storyKnown = false,
  embedded = false,
  headingId = "details-heading",
}: {
  system: StellarSystem | null;
  storyKnown?: boolean;
  embedded?: boolean;
  headingId?: string;
}) {
  if (!system)
    return (
      <section className="details empty-details" aria-live="polite">
        <p>Select a stellar system to inspect its catalogue facts.</p>
      </section>
    );
  const identifiers = system.components
    .map((component) =>
      component.gaia_source_id ? `Gaia DR3 ${component.gaia_source_id}` : null,
    )
    .filter(Boolean);
  return (
    <section
      className={`details ${embedded ? "embedded-details" : ""}`}
      aria-live="polite"
      aria-labelledby={embedded ? undefined : headingId}
    >
      <p className="eyebrow">
        {embedded ? "Catalogue facts" : "Astronomy catalogue record"}
      </p>
      {embedded ? (
        <h4>{system.name}</h4>
      ) : (
        <h2 id={headingId}>{system.name}</h2>
      )}
      {!embedded && (
        <p className="object-status">
          {storyKnown
            ? "Story-known at this view"
            : "Not story-known at this view"}
        </p>
      )}
      <p className="aliases">{system.alternates.join(" · ")}</p>
      <dl>
        <div>
          <dt>Distance from Sol</dt>
          <dd>{formatDistance(system.distance_from_sol_pc)}</dd>
        </div>
        <div>
          <dt>Components</dt>
          <dd>{system.components.length || "—"}</dd>
        </div>
        <div>
          <dt>Galactic coordinates</dt>
          <dd>
            {convertParsecsToLightYears(system.position_pc.xg).toFixed(3)},{" "}
            {convertParsecsToLightYears(system.position_pc.yg).toFixed(3)},{" "}
            {convertParsecsToLightYears(system.position_pc.zg).toFixed(3)}{" "}
            {DISPLAY_DISTANCE_UNIT}
          </dd>
        </div>
      </dl>
      {identifiers.length > 0 && (
        <p className="component-list">
          <span>Catalogue IDs</span>
          {identifiers.join("; ")}
        </p>
      )}
      <p className="provenance">{system.provenance.catalogues.join(" · ")}</p>
    </section>
  );
}
