import type { NarrativeRecord } from "./model";

export type AssetRole =
  "illustration" | "body_surface" | "species_icon" | "system_marker_icon";

export function resolveAssetForRole(
  assetsSource: NarrativeRecord,
  assetId: string,
  expectedRole: AssetRole,
  consumer: string,
): NarrativeRecord {
  const assets = Array.isArray(assetsSource.assets) ? assetsSource.assets : [];
  const asset = assets.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as NarrativeRecord).id === assetId,
  ) as NarrativeRecord | undefined;
  if (!asset)
    throw new Error(`${consumer} references unavailable asset ${assetId}.`);
  if (asset.role !== expectedRole) {
    throw new Error(
      `${consumer} requires asset role ${expectedRole}, but ${assetId} has role ${String(asset.role)}.`,
    );
  }
  return asset;
}
