export type DistanceUnit = "ly" | "pc";

export interface GalacticPosition {
  xg: number;
  yg: number;
  zg: number;
}

export interface RenderPosition {
  x: number;
  y: number;
  z: number;
}

export type ColorFamily =
  "blue" | "blue-white" | "white" | "yellow" | "orange" | "red" | "neutral";

export interface Component {
  id: string;
  gaia_source_id: string | null;
  designation: string;
  icrs: {
    ra_deg: number | null;
    dec_deg: number | null;
    epoch_year: number | null;
    parallax_mas: number | null;
    parallax_error_mas: number | null;
  };
  astrometry_quality: {
    parallax_over_error: number | null;
    visibility_periods_used: number | null;
    ruwe: number | null;
  };
  photometry: {
    g_magnitude: number | null;
    bp_rp: number | null;
  };
  visual: {
    color_family: ColorFamily;
    marker_radius: number;
    derivation: string;
  };
}

export interface StellarSystem {
  id: string;
  name: string;
  alternates: string[];
  position_pc: GalacticPosition;
  render_position: RenderPosition;
  distance_from_sol_pc: number;
  distance_uncertainty_pc: number | null;
  components: Component[];
  provenance: {
    catalogue: string;
    release?: string;
    source_object_ids: string[];
    adopted_source_object_id?: string;
    transformation?: string;
    review_version?: string;
  };
}

export interface CoverageProof {
  anchor_id: string;
  anchor_position_pc: GalacticPosition;
  radius_ly: number;
  system_count: number;
  source_record_count: number;
}

export interface NearbySystemsData {
  schema_version: "2.0.0";
  metadata: {
    generated_at: string;
    coordinate_frame: string;
    units: "pc";
    render_mapping: string;
    source: {
      catalogue: string;
      release: string;
      archive_url: string;
      documentation_url: string;
      retrieved_at: string;
      acknowledgement: string;
      snapshot_sha256: string;
    };
    configuration: { context_radius_ly: number };
    coverage: CoverageProof[];
  };
  systems: StellarSystem[];
}
