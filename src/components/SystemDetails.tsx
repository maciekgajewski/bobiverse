import type { DistanceUnit, StellarSystem } from "../domain/types";
import { formatDistance } from "../domain/units";

export function SystemDetails({
  system,
  unit,
}: {
  system: StellarSystem | null;
  unit: DistanceUnit;
}) {
  if (!system)
    return (
      <section className="details empty-details" aria-live="polite">
        <p>Select a stellar system to inspect its catalogue facts.</p>
      </section>
    );
  const identifiers = system.components
    .map((component) =>
      [
        component.gj && `GJ ${component.gj}`,
        component.hip_id && `HIP ${component.hip_id}`,
      ]
        .filter(Boolean)
        .join(" · "),
    )
    .filter(Boolean);
  return (
    <section
      className="details"
      aria-live="polite"
      aria-labelledby="details-heading"
    >
      <p className="eyebrow">Selected system</p>
      <h2 id="details-heading">{system.name}</h2>
      <p className="aliases">{system.alternates.join(" · ")}</p>
      <dl>
        <div>
          <dt>Distance from Sol</dt>
          <dd>{formatDistance(system.distance_from_sol_pc, unit)}</dd>
        </div>
        <div>
          <dt>Components</dt>
          <dd>{system.components.length || "—"}</dd>
        </div>
        <div>
          <dt>Galactic coordinates</dt>
          <dd>
            {system.position_pc.xg.toFixed(3)},{" "}
            {system.position_pc.yg.toFixed(3)},{" "}
            {system.position_pc.zg.toFixed(3)} pc
          </dd>
        </div>
      </dl>
      {identifiers.length > 0 && (
        <p className="component-list">
          <span>Catalogue IDs</span>
          {identifiers.join("; ")}
        </p>
      )}
      <p className="provenance">
        {system.provenance.catalogue}
        {system.provenance.release ? ` · ${system.provenance.release}` : ""}
      </p>
    </section>
  );
}
