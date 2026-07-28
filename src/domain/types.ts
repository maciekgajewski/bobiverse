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
  | "blue"
  | "blue-white"
  | "white"
  | "yellow"
  | "orange"
  | "red"
  | "neutral"
  | "infrared-cool"
  | "infrared-warm";

export type ObjectClass = "star" | "white_dwarf" | "brown_dwarf";

export interface TwentyParsecEnrichment {
  source_key: string;
  published_name: string | null;
  common_name: string | null;
  wise_id: string | null;
  twomass_id: string | null;
  hd_id: string | null;
  ross_id: string | null;
  wd_id: string | null;
  gaia_id: string | null;
  hip_id: string | null;
  gj_id: string | null;
  pmjid: string | null;
  multiple_designations: string | null;
  spectral_type: string | null;
  spectral_type_optical: string | null;
  spectral_type_near_infrared: string | null;
  effective_temperature_k: number | null;
  effective_temperature_error_k: number | null;
  object_class: ObjectClass | null;
  visual_family: "infrared-cool" | "infrared-warm" | null;
  system_hierarchy: string | null;
  system_code: number | null;
  reference_codes: string[];
}

export interface Component {
  id: string;
  gaia_source_id: string | null;
  cns5_id: string | null;
  source_identities: string[];
  gaia_enrichment: {
    phot_g_mean_mag: number | null;
    phot_bp_mean_mag: number | null;
    phot_rp_mean_mag: number | null;
    bp_rp: number | null;
    radial_velocity_km_s: number | null;
    radial_velocity_error_km_s: number | null;
    phot_variable_flag: string | null;
    non_single_star: string | null;
    effective_temperature_k: number | null;
    logg_gspphot: number | null;
    luminosity_solar: number | null;
    radius_solar: number | null;
    spectral_type: string | null;
    star_class_probability: number | null;
    variability_class: string | null;
    variability_class_score: number | null;
  } | null;
  c20pc_enrichment: TwentyParsecEnrichment | null;
  object_class: ObjectClass | null;
  designation: string;
  identifiers: {
    gaia_dr3_source_id: string | null;
    gcns_source_id: string | null;
    cns5_id: string | null;
    gj_id: string | null;
    hip_id: string | null;
    cns5_component_id: string | null;
    cns6_system_id: string | null;
    c20pc_source_key: string | null;
    wise_id: string | null;
    twomass_id: string | null;
    published_name: string | null;
  };
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
    intensity: number;
    pick_radius: number;
    derivation: string;
    source_facts: {
      effective_temperature_k: number | null;
      spectral_type: string | null;
      bp_rp: number | null;
      wds_spectral_type: string | null;
      c20pc_effective_temperature_k: number | null;
      c20pc_spectral_type: string | null;
      object_class: ObjectClass | null;
    };
  };
  provenance: {
    position: string | null;
    catalogues: string[];
    enrichment: string | null;
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
    catalogues: string[];
    source_object_ids: string[];
    adopted_component_id: string;
    review_version: string;
    wds_designations: {
      wds_coordinate: string;
      discoverer: string;
      components: string;
      component_ids: string[];
      membership_action: "confirm" | "replace";
      reason: string;
    }[];
  };
}

export interface CoverageProof {
  anchor_id: string;
  anchor_position_pc: GalacticPosition;
  radius_ly: number;
  system_count: number;
  source_record_count: number;
  gcns_boundary_pc: number;
}

export interface NearbySystemsData {
  schema_version: "4.0.0";
  metadata: {
    generated_at: string;
    coordinate_frame: string;
    units: "pc";
    render_mapping: string;
    sources: {
      gcns: {
        normalised_sha256: string;
        row_count: number;
        acknowledgement: string;
      };
      cns5: {
        normalised_sha256: string;
        row_count: number;
        acknowledgement: string;
      };
      gaia_dr3: {
        normalised_sha256: string;
        row_count: number;
        acknowledgement: string;
      };
      wds: {
        snapshot_sha256: string;
        candidate_sha256: string;
        row_count: number;
        candidate_row_count: number;
        acknowledgement: string;
      };
      c20pc: {
        table4_sha256: string;
        notes_sha256: string;
        references_sha256: string;
        table4_row_count: number;
        notes_row_count: number;
        reference_row_count: number;
        acknowledgement: string;
      };
    };
    configuration: { context_radius_ly: number };
    coverage: CoverageProof[];
  };
  systems: StellarSystem[];
}
