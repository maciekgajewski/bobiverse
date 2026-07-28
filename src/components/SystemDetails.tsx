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
  const identifiers = Array.from(
    new Set(
      system.components.flatMap((component) =>
        [
          component.identifiers.gaia_dr3_source_id
            ? `Gaia DR3 ${component.identifiers.gaia_dr3_source_id}`
            : null,
          component.identifiers.gj_id,
          component.identifiers.hip_id,
          component.identifiers.wise_id,
          component.identifiers.twomass_id,
          component.identifiers.published_name,
          component.c20pc_enrichment?.hd_id,
          component.c20pc_enrichment?.ross_id,
          component.c20pc_enrichment?.wd_id,
          component.c20pc_enrichment?.gaia_id,
          component.c20pc_enrichment?.hip_id,
          component.c20pc_enrichment?.pmjid,
          component.c20pc_enrichment?.multiple_designations,
        ].filter((value): value is string => Boolean(value)),
      ),
    ),
  );
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
      {system.components.some(
        (component) => component.c20pc_enrichment || component.object_class,
      ) && (
        <div className="component-list">
          <span>Component classification</span>
          {system.components.map((component) => {
            const census = component.c20pc_enrichment;
            const classification = component.object_class
              ? component.object_class.replaceAll("_", " ")
              : "unclassified";
            const spectralType =
              census?.spectral_type_near_infrared ??
              census?.spectral_type_optical ??
              census?.spectral_type;
            const temperature =
              census?.effective_temperature_k == null
                ? null
                : `${census.effective_temperature_k.toLocaleString()} K${
                    census.effective_temperature_error_k == null
                      ? ""
                      : ` ± ${census.effective_temperature_error_k.toLocaleString()} K`
                  }`;
            return (
              <div key={component.id}>
                {component.designation}: {classification}
                {spectralType ? ` · ${spectralType}` : ""}
                {temperature ? ` · ${temperature}` : ""}
                {census ? " · 20-pc census" : ""}
              </div>
            );
          })}
        </div>
      )}
      <p className="provenance">{system.provenance.catalogues.join(" · ")}</p>
    </section>
  );
}
