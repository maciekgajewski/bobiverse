from __future__ import annotations

import argparse
import math
from typing import Any

from astronomy_pipeline import (
    LY_PER_PC,
    accepted_candidates,
    distance,
    optional_float,
    wds_component_spectral_types,
)
from common import (
    CONFIG_PATH,
    GENERATED_PATH,
    mapped_anchor_names,
    read_json,
    resolve_anchor_bootstraps,
    sha256,
    write_json,
)

MARKER_RADIUS = 0.09
BROWN_DWARF_MARKER_RADIUS = 0.05
MINIMUM_PICK_RADIUS = 0.09


def colour_from_bp_rp(bp_rp: float | None) -> str:
    if bp_rp is None:
        return "neutral"
    for maximum, family in ((0, "blue"), (0.5, "blue-white"), (0.8, "white"), (1.2, "yellow"), (1.8, "orange")):
        if bp_rp < maximum:
            return family
    return "red"


def presentation(
    enrichment: dict[str, str] | None,
    bp_rp: float | None,
    wds_spectral_type: str | None = None,
    c20pc: dict[str, Any] | None = None,
) -> tuple[str, str]:
    if c20pc and c20pc.get("object_class") == "brown_dwarf":
        family = c20pc.get("visual_family")
        if family not in {"infrared-cool", "infrared-warm"}:
            raise ValueError(
                "Accepted 20-pc brown dwarf lacks a supported visual family"
            )
        return (
            family,
            "Kirkpatrick et al. 2024 brown-dwarf type/temperature; "
            "approximate false-infrared presentation",
        )
    if enrichment:
        temperature = optional_float(enrichment.get("teff_gspphot"))
        if temperature is not None:
            if temperature >= 10_000:
                family = "blue"
            elif temperature >= 7_500:
                family = "blue-white"
            elif temperature >= 6_000:
                family = "white"
            elif temperature >= 5_200:
                family = "yellow"
            elif temperature >= 3_700:
                family = "orange"
            else:
                family = "red"
            return family, "Gaia DR3 effective temperature; approximate fixed temperature bands"
        spectral = str(enrichment.get("spectraltype_esphs", "")).strip().upper()
        if spectral[:1] in {"O", "B", "A", "F", "G", "K", "M"}:
            family = {"O": "blue", "B": "blue-white", "A": "white", "F": "white", "G": "yellow", "K": "orange", "M": "red"}[spectral[0]]
            return family, "Gaia DR3 spectral classification; approximate class family"
    if bp_rp is not None:
        return colour_from_bp_rp(bp_rp), "Gaia DR3 bp_rp fixed bands; neutral when unavailable"
    spectral = (wds_spectral_type or "").strip().upper()
    spectral_class = next(
        (character for character in spectral if character in "OBAFGKM"),
        None,
    )
    if spectral_class:
        family = {
            "O": "blue", "B": "blue-white", "A": "white", "F": "white",
            "G": "yellow", "K": "orange", "M": "red",
        }[spectral_class]
        return family, "Reviewed WDS spectral type; approximate class family"
    return "neutral", "Gaia DR3 bp_rp fixed bands; neutral when unavailable"


def component_runtime(component: dict[str, Any], gcns: dict[str, dict[str, str]], cns5: dict[str, dict[str, str]], gaia: dict[str, dict[str, str]], override: dict[str, Any], wds_spectral_type: str | None = None) -> dict[str, Any]:
    gaia_id = component["gaia_source_id"]
    gcns_row = gcns.get(gaia_id)
    cns_row = cns5.get(component["cns5_id"])
    enrichment = gaia.get(gaia_id)
    astrometry = gcns_row or cns_row or {}
    bp_rp = optional_float(enrichment.get("bp_rp")) if enrichment else None
    if bp_rp is None and gcns_row:
        bp, rp = optional_float(gcns_row["phot_bp_mean_mag"]), optional_float(gcns_row["phot_rp_mean_mag"])
        bp_rp = bp - rp if bp is not None and rp is not None else None
    c20pc = (
        component["c20pc_match"]["enrichment"]
        if component.get("c20pc_match")
        else None
    )
    classical = component.get("classical_name_match")
    color_family, visual_derivation = presentation(
        enrichment, bp_rp, wds_spectral_type, c20pc
    )
    is_brown_dwarf = bool(
        c20pc and c20pc.get("object_class") == "brown_dwarf"
    )
    gaia_enrichment = None
    if enrichment:
        gaia_enrichment = {
            "phot_g_mean_mag": optional_float(enrichment["phot_g_mean_mag"]),
            "phot_bp_mean_mag": optional_float(enrichment["phot_bp_mean_mag"]),
            "phot_rp_mean_mag": optional_float(enrichment["phot_rp_mean_mag"]),
            "bp_rp": optional_float(enrichment["bp_rp"]),
            "radial_velocity_km_s": optional_float(
                enrichment["radial_velocity"]
            ),
            "radial_velocity_error_km_s": optional_float(
                enrichment["radial_velocity_error"]
            ),
            "phot_variable_flag": enrichment["phot_variable_flag"] or None,
            "non_single_star": enrichment["non_single_star"] or None,
            "effective_temperature_k": optional_float(
                enrichment["teff_gspphot"]
            ),
            "logg_gspphot": optional_float(enrichment["logg_gspphot"]),
            "luminosity_solar": optional_float(enrichment["lum_flame"]),
            "radius_solar": optional_float(enrichment["radius_flame"]),
            "spectral_type": enrichment["spectraltype_esphs"] or None,
            "star_class_probability": optional_float(
                enrichment["classprob_dsc_combmod_star"]
            ),
            "variability_class": enrichment["best_class_name"] or None,
            "variability_class_score": optional_float(
                enrichment["best_class_score"]
            ),
        }
    identifiers = {
        "gaia_dr3_source_id": gaia_id,
        "gcns_source_id": gaia_id if gcns_row else None,
        "cns5_id": component["cns5_id"],
        "gj_id": cns_row.get("gj_id") or None if cns_row else None,
        "hip_id": cns_row.get("hip_id") or None if cns_row else None,
        "cns5_component_id": cns_row.get("component_id") or None if cns_row else None,
        "cns6_system_id": cns_row.get("cns6_system_id") or None if cns_row else None,
        "c20pc_source_key": c20pc.get("source_key") if c20pc else None,
        "wise_id": c20pc.get("wise_id") if c20pc else None,
        "twomass_id": c20pc.get("twomass_id") if c20pc else None,
        "published_name": c20pc.get("published_name") if c20pc else None,
        "bayer_designation": (
            classical.get("bayer_designation") if classical else None
        ),
        "flamsteed_designation": (
            classical.get("flamsteed_designation") if classical else None
        ),
        "hd_id": classical.get("source_hd") if classical else None,
        "hr_id": classical.get("source_hr") if classical else None,
    }
    return {
        "id": component["id"], "gaia_source_id": gaia_id, "cns5_id": component["cns5_id"],
        "source_identities": component["source_identities"],
        "gaia_enrichment": gaia_enrichment,
        "c20pc_enrichment": c20pc,
        "object_class": c20pc.get("object_class") if c20pc else None,
        "designation": override.get("name", component["preferred_name_candidate"]), "identifiers": identifiers,
        "icrs": {
            "ra_deg": optional_float(astrometry.get("ra")), "dec_deg": optional_float(astrometry.get("dec")),
            "epoch_year": optional_float(astrometry.get("ref_epoch") or astrometry.get("epoch")),
            "parallax_mas": optional_float(astrometry.get("parallax")), "parallax_error_mas": optional_float(astrometry.get("parallax_error")),
        },
        "astrometry_quality": {
            "parallax_over_error": None, "visibility_periods_used": None,
            "ruwe": optional_float(gcns_row.get("ruwe")) if gcns_row else None,
        },
        "photometry": {
            "g_magnitude": optional_float(enrichment.get("phot_g_mean_mag")) if enrichment else optional_float(astrometry.get("g_mag") or astrometry.get("phot_g_mean_mag")),
            "bp_rp": bp_rp,
        },
        "visual": {
            "color_family": color_family,
            "marker_radius": (
                BROWN_DWARF_MARKER_RADIUS if is_brown_dwarf else MARKER_RADIUS
            ),
            "intensity": 0.25 if is_brown_dwarf else 1.0,
            "pick_radius": MINIMUM_PICK_RADIUS,
            "derivation": visual_derivation,
            "source_facts": {
                "effective_temperature_k": optional_float(
                    enrichment.get("teff_gspphot")
                ) if enrichment else None,
                "spectral_type": (
                    enrichment.get("spectraltype_esphs") or None
                    if enrichment else None
                ),
                "bp_rp": bp_rp,
                "wds_spectral_type": wds_spectral_type,
                "c20pc_effective_temperature_k": (
                    c20pc.get("effective_temperature_k") if c20pc else None
                ),
                "c20pc_spectral_type": (
                    c20pc.get("spectral_type") if c20pc else None
                ),
                "object_class": c20pc.get("object_class") if c20pc else None,
            },
        },
        "provenance": {
            "position": component["position_derivation"], "catalogues": [name for name, record in (("GCNS", gcns_row), ("CNS5", cns_row), ("Gaia DR3", enrichment), ("Kirkpatrick et al. 2024 20-pc census", c20pc), ("VizieR IV/27A classical names", classical)) if record],
            "enrichment": (
                "; ".join(
                    value
                    for value in (
                        "Gaia DR3 left join" if enrichment else None,
                        "reviewed Kirkpatrick et al. 2024 20-pc census" if c20pc else None,
                        "exact HIP match to VizieR IV/27A" if classical else None,
                    )
                    if value
                )
                if any((enrichment, c20pc, classical))
                else None
            ),
        },
    }


def distance_uncertainty_pc(
    component: dict[str, Any],
    gcns: dict[str, dict[str, str]],
    cns5: dict[str, dict[str, str]],
) -> float | None:
    gcns_row = gcns.get(component.get("gaia_source_id"))
    if gcns_row:
        median = optional_float(gcns_row.get("dist_50"))
        lower = optional_float(gcns_row.get("dist_16"))
        upper = optional_float(gcns_row.get("dist_84"))
        if median is not None and lower is not None and upper is not None:
            return round(max(abs(median - lower), abs(upper - median)) * 1000, 12)
    cns5_row = cns5.get(component.get("cns5_id"))
    if cns5_row:
        parallax = optional_float(cns5_row.get("parallax"))
        error = optional_float(cns5_row.get("parallax_error"))
        if parallax is not None and parallax > 0 and error is not None:
            return round(1000 * error / (parallax * parallax), 12)
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the static reconciled astronomy runtime catalogue.")
    parser.parse_args()
    (
        candidates,
        review,
        manifests,
        gcns_rows,
        cns5_rows,
        gaia_rows,
        _c20pc_rows,
    ) = accepted_candidates()
    config = read_json(CONFIG_PATH)
    radius_ly = float(config["context_radius_ly"])
    radius_pc = radius_ly / LY_PER_PC
    if radius_pc >= 100:
        raise ValueError("Configured context sphere crosses the 100 pc GCNS boundary")
    overrides = {entry["candidate_system_id"]: entry for entry in review["overrides"]}
    component_overrides = {entry["candidate_component_id"]: entry for entry in review.get("component_overrides", [])}
    components = {entry["id"]: entry for entry in candidates["components"]}
    candidate_by_id = {entry["id"]: entry for entry in candidates["systems"]}
    anchor_names = mapped_anchor_names()
    bootstraps = resolve_anchor_bootstraps(
        anchor_names, review, candidates
    )
    anchor_positions = {"sol": {"xg": 0.0, "yg": 0.0, "zg": 0.0}}
    for bootstrap in bootstraps:
        anchor_id = bootstrap["anchor_id"]
        candidate = candidate_by_id.get(bootstrap.get("system_id"))
        if candidate is None:
            raise ValueError(f"{anchor_id} bootstrap does not identify a candidate system")
        adopted_id = overrides.get(candidate["id"], {}).get("adopted_component_id", candidate["adopted_component_candidate"])
        position = components[adopted_id]["position_pc"]
        if position is None:
            raise ValueError(f"{anchor_id} bootstrap system has no source-backed position")
        if distance(position, {"xg": 0.0, "yg": 0.0, "zg": 0.0}) + radius_pc > 100:
            raise ValueError(f"Required context sphere crosses the 100 pc GCNS boundary: {anchor_id}")
        anchor_positions[anchor_id] = position
    if set(anchor_positions) != set(anchor_names):
        raise ValueError("Generation needs one source-backed bootstrap per mapped anchor")
    gcns = {row["source_id"]: row for row in gcns_rows}
    cns5 = {row["cns5_id"]: row for row in cns5_rows}
    gaia = {row["source_id"]: row for row in gaia_rows}
    wds_by_system: dict[str, list[dict[str, Any]]] = {}
    for decision in review.get("wds_decisions", []):
        wds_by_system.setdefault(decision["system_id"], []).append(
            {
                "wds_coordinate": decision["wds_coordinate"],
                "discoverer": decision["discoverer"],
                "components": decision["components"],
                "component_ids": list(decision["component_ids"]),
                "membership_action": decision["membership_action"],
                "reason": decision["reason"],
            }
        )
    wds_spectral_by_component: dict[str, str] = {}
    for candidate in candidates["systems"]:
        for evidence in candidate.get("wds_membership_evidence", []):
            for component_id, spectral_type in (
                wds_component_spectral_types(evidence).items()
            ):
                wds_spectral_by_component.setdefault(
                    component_id, spectral_type
                )
    systems: list[dict[str, Any]] = []
    for candidate in candidates["systems"]:
        override = overrides.get(candidate["id"], {})
        adopted_id = override.get("adopted_component_id", candidate["adopted_component_candidate"])
        if adopted_id is None:
            continue
        if adopted_id not in candidate["component_ids"]:
            raise ValueError(f"{candidate['id']} adopts a component outside its system")
        adopted = components[adopted_id]
        if adopted["position_pc"] is None:
            # An unmapped source remains in the reviewed candidate graph.  It cannot
            # become a spatial runtime node or coverage member without invented
            # geometry; a required narrative anchor would have failed before here.
            continue
        position = adopted["position_pc"]
        if not any(distance(position, anchor) <= radius_pc + 1e-12 for anchor in anchor_positions.values()):
            continue
        members = [component_runtime(components[component_id], gcns, cns5, gaia, component_overrides.get(component_id, {}), wds_spectral_by_component.get(component_id)) for component_id in candidate["component_ids"]]
        name = override.get("name", candidate["preferred_name_candidate"])
        alternates = sorted(set(override.get("alternates", candidate["alternate_name_candidates"])))
        systems.append({
            "id": candidate["id"], "name": name, "alternates": alternates,
            "position_pc": position, "render_position": {"x": position["xg"], "y": position["zg"], "z": -position["yg"]},
            "distance_from_sol_pc": round(distance(position, {"xg": 0.0, "yg": 0.0, "zg": 0.0}), 12),
            "distance_uncertainty_pc": distance_uncertainty_pc(
                adopted, gcns, cns5
            ), "components": members,
            "provenance": {
                "catalogues": sorted(
                    {
                        *{
                            catalogue
                            for member in members
                            for catalogue in member["provenance"]["catalogues"]
                        },
                        *(["WDS"] if candidate["id"] in wds_by_system else []),
                    }
                ),
                "source_object_ids": sorted(
                    {
                        *{
                            identifier
                            for member in members
                            for identifier in member["source_identities"]
                        },
                        *{
                            "wds:"
                            + decision["wds_coordinate"]
                            + ":"
                            + decision["discoverer"]
                            + decision["components"]
                            for decision in wds_by_system.get(
                                candidate["id"], []
                            )
                        },
                    }
                ),
                "adopted_component_id": adopted_id,
                "review_version": review["schema_version"],
                "wds_designations": sorted(
                    wds_by_system.get(candidate["id"], []),
                    key=lambda item: (
                        item["wds_coordinate"],
                        item["discoverer"],
                        item["components"],
                        item["membership_action"],
                    ),
                ),
            },
        })
    preferred_names = ["sol", *[system["name"].casefold() for system in systems]]
    if len(preferred_names) != len(set(preferred_names)):
        raise ValueError(
            "Generated system preferred names collide after review overrides"
        )
    systems.sort(key=lambda system: (system["distance_from_sol_pc"], system["id"]))
    sol = {
        "id": "sol", "name": "Sol", "alternates": ["Sun"], "position_pc": {"xg": 0.0, "yg": 0.0, "zg": 0.0}, "render_position": {"x": 0.0, "y": 0.0, "z": 0.0}, "distance_from_sol_pc": 0.0, "distance_uncertainty_pc": 0.0,
        "components": [{"id": "stellar-component-sol", "gaia_source_id": None, "cns5_id": None, "source_identities": [], "gaia_enrichment": None, "c20pc_enrichment": None, "object_class": "star", "designation": "Sol", "identifiers": {"gaia_dr3_source_id": None, "gcns_source_id": None, "cns5_id": None, "gj_id": None, "hip_id": None, "cns5_component_id": None, "cns6_system_id": None, "c20pc_source_key": None, "wise_id": None, "twomass_id": None, "published_name": None, "bayer_designation": None, "flamsteed_designation": None, "hd_id": None, "hr_id": None}, "icrs": {"ra_deg": None, "dec_deg": None, "epoch_year": None, "parallax_mas": None, "parallax_error_mas": None}, "astrometry_quality": {"parallax_over_error": None, "visibility_periods_used": None, "ruwe": None}, "photometry": {"g_magnitude": None, "bp_rp": None}, "visual": {"color_family": "yellow", "marker_radius": MARKER_RADIUS, "intensity": 1.0, "pick_radius": MINIMUM_PICK_RADIUS, "derivation": "generated Sol origin", "source_facts": {"effective_temperature_k": None, "spectral_type": None, "bp_rp": None, "wds_spectral_type": None, "c20pc_effective_temperature_k": None, "c20pc_spectral_type": None, "object_class": "star"}}, "provenance": {"position": "generated canonical origin", "catalogues": [], "enrichment": None}}],
        "provenance": {"catalogues": ["Generated canonical origin"], "source_object_ids": [], "adopted_component_id": "stellar-component-sol", "review_version": review["schema_version"], "wds_designations": []},
    }
    coverage = [{"anchor_id": anchor_id, "anchor_position_pc": anchor_position, "radius_ly": radius_ly, "system_count": sum(1 for system in systems if distance(system["position_pc"], anchor_position) <= radius_pc + 1e-12), "source_record_count": sum(len(system["components"]) for system in systems if distance(system["position_pc"], anchor_position) <= radius_pc + 1e-12), "gcns_boundary_pc": 100.0} for anchor_id, anchor_position in sorted(anchor_positions.items())]
    runtime_sources = {name: {"normalised_sha256": manifest["normalised_sha256"], "row_count": manifest["row_count"], "acknowledgement": manifest["acknowledgement"]} for name, manifest in manifests.items() if name not in {"wds", "c20pc"}}
    runtime_sources["wds"] = {"snapshot_sha256": manifests["wds"]["uncompressed_sha256"], "candidate_sha256": manifests["wds"]["candidate_sha256"], "row_count": manifests["wds"]["row_count"], "candidate_row_count": manifests["wds"]["candidate_row_count"], "acknowledgement": manifests["wds"]["acknowledgement"]}
    runtime_sources["c20pc"] = {
        "table4_sha256": manifests["c20pc"]["queries"]["table4"][
            "normalised_sha256"
        ],
        "notes_sha256": manifests["c20pc"]["queries"]["notes4"][
            "normalised_sha256"
        ],
        "references_sha256": manifests["c20pc"]["queries"]["refs"][
            "normalised_sha256"
        ],
        "table4_row_count": manifests["c20pc"]["queries"]["table4"][
            "row_count"
        ],
        "notes_row_count": manifests["c20pc"]["queries"]["notes4"][
            "row_count"
        ],
        "reference_row_count": manifests["c20pc"]["queries"]["refs"][
            "row_count"
        ],
        "acknowledgement": manifests["c20pc"]["acknowledgement"],
    }
    output = {"schema_version": "4.0.0", "metadata": {"generated_at": max(manifest["retrieved_at"] for manifest in manifests.values()), "coordinate_frame": "Sun-centered Galactic Cartesian", "units": "pc", "render_mapping": "scene.x=Xg; scene.y=Zg; scene.z=-Yg", "configuration": {"context_radius_ly": radius_ly}, "coverage": coverage, "sources": runtime_sources}, "systems": [sol, *systems]}
    write_json(GENERATED_PATH, output)
    print(f"Wrote {len(output['systems'])} reconciled system markers to {GENERATED_PATH.relative_to(GENERATED_PATH.parent.parent)}")


if __name__ == "__main__":
    main()
