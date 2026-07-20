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

export interface Component {
  id: string;
  cns5_id: number;
  gj: string | null;
  component: string | null;
  gaia_dr3_id: string | null;
  hip_id: number | null;
  g_magnitude: number | null;
  icrs: {
    ra_deg: number | null;
    dec_deg: number | null;
    epoch_year: number | null;
    parallax_mas: number | null;
    parallax_error_mas: number | null;
    position_bibcode: string | null;
    parallax_bibcode: string | null;
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

export interface NearbySystemsData {
  schema_version: "1.0.0";
  metadata: {
    generated_at: string;
    coordinate_frame: string;
    units: "pc";
    render_mapping: string;
    source: { catalogue: string; release: string; acknowledgement: string };
  };
  systems: StellarSystem[];
}
