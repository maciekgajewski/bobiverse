import type {
  NarrativeEntity,
  NarrativeRecord,
  NarrativeWorld,
  PreparedNarrativeCorpus,
} from "./model";

export interface ResolvedSpeciesPresentation {
  styleId: string;
  iconPath: string;
  colour: string;
  displayName: string;
}

function records(value: unknown): NarrativeRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is NarrativeRecord =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];
}

export function resolveSpeciesPresentations(
  corpus: PreparedNarrativeCorpus,
  world: NarrativeWorld,
): ReadonlyMap<string, ResolvedSpeciesPresentation> {
  const assets = new Map(
    records(corpus.assets.assets).map((asset) => [String(asset.id), asset]),
  );
  const styles = new Map(
    records(corpus.speciesPresentation.styles).map((style) => [
      String(style.id),
      style,
    ]),
  );
  const assignments = new Map(
    records(corpus.speciesPresentation.assignments).map((assignment) => [
      String(assignment.species_id),
      String(assignment.style_id),
    ]),
  );
  const defaultStyleId = String(corpus.speciesPresentation.default_style_id);
  return new Map(
    world.entities
      .filter(
        (entity): entity is NarrativeEntity => entity.entity_type === "species",
      )
      .map((species) => {
        const styleId = assignments.get(species.id) ?? defaultStyleId;
        const style = styles.get(styleId)!;
        const asset = assets.get(String(style.icon_asset_id))!;
        return [
          species.id,
          {
            styleId,
            iconPath: `/${String(asset.path)}`,
            colour: String(style.colour),
            displayName: String(species.name),
          },
        ];
      }),
  );
}
