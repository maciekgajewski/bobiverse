import {
  ABOUT_IMAGE_ALT,
  EARTH_IMAGE_ALT,
  JEEVES_IMAGE_ALT,
  MOON_IMAGE_ALT,
} from "../about-image";
import {
  narrativeEntitiesBeforeExistence,
  type NarrativeRecord,
  type NarrativeWorld,
} from "./model";
import type { ResolvedSpeciesPresentation } from "./species-presentation";

/**
 * The illustration shown in an inspector header, beside the entity's name.
 *
 * - `picture`: the entity's own `picture_id`, an `illustration` asset from
 *   `data/narrative/assets.json` (characters, species and events may carry
 *   one; it is chapter-controlled narrative state).
 * - `presentation`: a Captain-approved decorative illustration registered in
 *   code below, for entities whose type has no `picture_id` (BOB-20261114-AYW3EN).
 * - `species-icon`: a species' accent-coloured icon from
 *   `data/presentation/species.json`.
 */
export type HeaderIllustration =
  | {
      kind: "image";
      origin: "picture" | "presentation";
      src: string;
      alt: string;
      width?: number;
      height?: number;
    }
  | { kind: "species-icon"; iconPath: string; colour: string; label: string };

export interface PresentationIllustration {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const GUPPI_ENTITY_ID = "technology:guppi-interface";
export const JEEVES_ENTITY_ID = "technology:jeeves";
export const EARTH_ENTITY_ID = "location:earth";
export const MOON_ENTITY_ID = "location:moon";

/**
 * Decorative entity illustrations that live outside the narrative data. Each
 * one is keyed by a stable narrative entity ID and is only ever joined after
 * reader-safe projection, so it appears only while that entity is visible.
 * Credits for each asset are in `public/assets/CREDITS.md`.
 */
export const PRESENTATION_ILLUSTRATIONS: ReadonlyMap<
  string,
  PresentationIllustration
> = new Map([
  [
    GUPPI_ENTITY_ID,
    {
      // The head of the About dialog's Admiral Ackbar picture; the same credit
      // is its alternative text.
      src: "/assets/guppi-ackbar-head.webp",
      alt: ABOUT_IMAGE_ALT,
      width: 66,
      height: 66,
    },
  ],
  [
    JEEVES_ENTITY_ID,
    {
      // The head of the What's new dialog's Jeeves picture; the same credit
      // is its alternative text.
      src: "/assets/jeeves-head.webp",
      alt: JEEVES_IMAGE_ALT,
      width: 66,
      height: 66,
    },
  ],
  [
    EARTH_ENTITY_ID,
    {
      // Apollo 17's Blue Marble; Earth is known from the zero state.
      src: "/assets/earth-head.webp",
      alt: EARTH_IMAGE_ALT,
      width: 66,
      height: 66,
    },
  ],
  [
    MOON_ENTITY_ID,
    {
      // LRO's nearside colour mosaic; the Moon is known from the zero state.
      src: "/assets/moon-head.webp",
      alt: MOON_IMAGE_ALT,
      width: 66,
      height: 66,
    },
  ],
]);

function illustrationAssetPath(
  assets: NarrativeRecord,
  pictureId: string,
): string | null {
  if (!Array.isArray(assets.assets)) return null;
  const asset = assets.assets.find(
    (candidate) =>
      Boolean(candidate) &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as NarrativeRecord).id === pictureId,
  ) as NarrativeRecord | undefined;
  return asset?.role === "illustration" &&
    typeof asset.path === "string" &&
    asset.path.length > 0
    ? `/${asset.path}`
    : null;
}

/**
 * Resolves the header illustration for one entity of the projected world.
 * An entity that is not reader-visible in `world` never gets one, whatever
 * is registered for it, so an illustration cannot reveal a hidden entity.
 */
export function resolveHeaderIllustration(
  entityId: string,
  world: NarrativeWorld,
  assets: NarrativeRecord,
  speciesPresentation?: ResolvedSpeciesPresentation,
): HeaderIllustration | null {
  // A card before existence (rule (g)) keeps its hard-ceiling picture.
  const entity = [
    ...world.entities,
    ...narrativeEntitiesBeforeExistence(world),
  ].find((candidate) => candidate.id === entityId);
  if (!entity) return null;
  const pictureId =
    typeof entity.picture_id === "string" && entity.picture_id.length > 0
      ? entity.picture_id
      : null;
  const picturePath = pictureId
    ? illustrationAssetPath(assets, pictureId)
    : null;
  if (picturePath)
    return {
      kind: "image",
      origin: "picture",
      src: picturePath,
      alt: String(entity.name),
    };
  const presentation = PRESENTATION_ILLUSTRATIONS.get(entity.id);
  if (presentation)
    return { kind: "image", origin: "presentation", ...presentation };
  if (entity.entity_type === "species" && speciesPresentation)
    return {
      kind: "species-icon",
      iconPath: speciesPresentation.iconPath,
      colour: speciesPresentation.colour,
      label: `${String(entity.name)} species icon`,
    };
  return null;
}
