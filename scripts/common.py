from __future__ import annotations

import hashlib
import json
import gzip
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "data" / "source"
CONFIG_PATH = ROOT / "data" / "config" / "map-display.json"
CONFIG_SCHEMA_PATH = ROOT / "data" / "schema" / "map-display.schema.json"
SOURCE_EXTRACT_SCHEMA_PATH = (
    ROOT / "data" / "schema" / "astronomy-source-extract.schema.json"
)
GENERATED_PATH = ROOT / "src" / "data" / "nearby-systems.json"
REVIEW_PATH = SOURCE_DIR / "system-review.json"
IDENTITY_REGISTRY_PATH = SOURCE_DIR / "identity-registry.json"
CANDIDATES_PATH = SOURCE_DIR / "system-candidates.json"
LANDMARKS_PATH = SOURCE_DIR / "major-local-systems.json"
GCNS_PATH = SOURCE_DIR / "gcns-neighbourhood.json"
CNS5_PATH = SOURCE_DIR / "cns5-nearby-components.json"
GAIA_ENRICHMENT_PATH = SOURCE_DIR / "gaia-dr3-enrichment.json"
WDS_PATH = SOURCE_DIR / "wds-precise.txt.gz"
WDS_FORMAT_PATH = SOURCE_DIR / "wdsweb-format.txt"
C20PC_PATH = SOURCE_DIR / "twenty-parsec-census.json"
C20PC_README_PATH = SOURCE_DIR / "twenty-parsec-census-readme.txt"
C20PC_SCHEMA_PATH = ROOT / "data" / "schema" / "twenty-parsec-census.schema.json"

LIGHT_YEARS_PER_PARSEC = 3.261563777
GAIA_CATALOGUE = "Gaia DR3 gaiadr3.gaia_source"
GAIA_RELEASE = "2022-06-13"
GAIA_ARCHIVE_URL = "https://gea.esac.esa.int/tap-server/tap/sync"
GAIA_ACKNOWLEDGEMENT = (
    "This work has made use of data from the European Space Agency (ESA) mission "
    "Gaia (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing "
    "and Analysis Consortium (DPAC, https://www.cosmos.esa.int/web/gaia/dpac/consortium)."
)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")


def value_sha256(value: Any) -> str:
    return sha256_bytes(canonical_json_bytes(value))


def read_gzip(path: Path) -> bytes:
    with gzip.open(path, "rb") as handle:
        return handle.read()


def normalize_astronomy_name(value: str) -> str:
    return " ".join(value.casefold().split())


def mapped_anchor_names(
    narrative_root: Path | None = None,
) -> dict[str, list[str]]:
    root = narrative_root or ROOT / "data" / "narrative"
    names_by_id: dict[str, set[str]] = {}
    locations_by_id: dict[str, dict[str, Any]] = {}

    def record(location: dict[str, Any]) -> None:
        astronomy_id = location.get("astronomy_object_id")
        if astronomy_id is None:
            return
        if not isinstance(astronomy_id, str) or not astronomy_id:
            raise ValueError("Mapped narrative location has an invalid astronomy ID")
        name = location.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(
                f'Mapped astronomy anchor "{astronomy_id}" lacks a narrative name'
            )
        names_by_id.setdefault(astronomy_id, set()).add(name)

    def introduce(location: dict[str, Any]) -> None:
        location_id = location.get("id")
        if not isinstance(location_id, str) or not location_id.startswith("location:"):
            raise ValueError("Narrative location lacks a valid stable ID")
        if location_id in locations_by_id:
            raise ValueError(f'Narrative location "{location_id}" is introduced twice')
        locations_by_id[location_id] = dict(location)
        record(locations_by_id[location_id])
        for child in location.get("children", []):
            if not isinstance(child, dict):
                raise ValueError(f'Narrative location "{location_id}" has an invalid child')
            introduce(child)

    zero_state = read_json(root / "baseline" / "zero-state.json")
    baseline_location = zero_state.get("locations")
    if not isinstance(baseline_location, dict):
        raise ValueError("Narrative zero state lacks its location hierarchy")
    introduce(baseline_location)

    chapters: list[tuple[tuple[int, ...], Path, dict[str, Any]]] = []
    for path in (root / "chapters").glob("*/*.json"):
        document = read_json(path)
        chapter = document.get("chapter")
        if not isinstance(chapter, str):
            raise ValueError(f"{path} lacks a chapter reading-order key")
        try:
            order = tuple(int(part) for part in chapter.split("."))
        except ValueError as error:
            raise ValueError(f'{path} has invalid chapter key "{chapter}"') from error
        chapters.append((order, path, document))

    for _, path, chapter in sorted(chapters):
        for entity in chapter.get("introducing", []):
            if (
                isinstance(entity, dict)
                and isinstance(entity.get("id"), str)
                and entity["id"].startswith("location:")
            ):
                introduce(entity)
        for update in chapter.get("updates", []):
            if not isinstance(update, dict):
                raise ValueError(f"{path} contains a malformed narrative update")
            location_id = update.get("entity_id")
            if not isinstance(location_id, str) or not location_id.startswith("location:"):
                continue
            location = locations_by_id.get(location_id)
            if location is None:
                raise ValueError(
                    f'{path} updates unknown narrative location "{location_id}"'
                )
            if "name" in update:
                location["name"] = update["name"]
            if "astronomy_object_id" in update:
                location["astronomy_object_id"] = update["astronomy_object_id"]
            record(location)

    return {
        anchor_id: sorted(names)
        for anchor_id, names in sorted(names_by_id.items())
    }


def mapped_anchor_ids(narrative_root: Path | None = None) -> list[str]:
    return list(mapped_anchor_names(narrative_root))


def resolve_anchor_bootstraps(
    anchor_names: dict[str, list[str]],
    review: dict[str, Any],
    candidates: dict[str, Any],
) -> list[dict[str, str]]:
    systems = candidates.get("systems", [])
    components = candidates.get("components", [])
    systems_by_id = {entry.get("id"): entry for entry in systems}
    components_by_id = {entry.get("id"): entry for entry in components}
    if len(systems_by_id) != len(systems) or len(components_by_id) != len(components):
        raise ValueError("Astronomy candidates contain duplicate stable identities")

    overrides = review.get("overrides", [])
    overrides_by_id = {
        entry.get("candidate_system_id"): entry for entry in overrides
    }
    if len(overrides_by_id) != len(overrides):
        raise ValueError("Astronomy review contains duplicate system overrides")

    effective_names: dict[str, list[str]] = {}
    owners_by_name: dict[str, set[str]] = {}
    for system_id, system in systems_by_id.items():
        override = overrides_by_id.get(system_id)
        if override is None:
            names = [
                system.get("preferred_name_candidate"),
                *system.get("alternate_name_candidates", []),
            ]
        else:
            names = [override.get("name"), *override.get("alternates", [])]
        if not names or any(
            not isinstance(name, str) or not name.strip() for name in names
        ):
            raise ValueError(
                f'{system_id} lacks complete accepted astronomy names'
            )
        normalized = sorted({normalize_astronomy_name(name) for name in names})
        effective_names[system_id] = normalized
        for name in normalized:
            owners_by_name.setdefault(name, set()).add(system_id)

    explicit = review.get("anchor_bootstraps", [])
    if not isinstance(explicit, list):
        raise ValueError("Astronomy review anchor_bootstraps must be an array")
    explicit_by_anchor: dict[str, dict[str, str]] = {}
    mapped_non_sol = set(anchor_names) - {"sol"}
    for entry in explicit:
        if not isinstance(entry, dict):
            raise ValueError("Astronomy review contains a malformed anchor bootstrap")
        anchor_id = entry.get("anchor_id")
        system_id = entry.get("system_id")
        catalogue = entry.get("catalogue")
        source_id = entry.get("source_id")
        if not isinstance(anchor_id, str) or not anchor_id:
            raise ValueError("Explicit anchor bootstrap lacks a non-empty anchor_id")
        if anchor_id in explicit_by_anchor:
            raise ValueError(
                f'{anchor_id} has duplicate explicit anchor bootstrap records'
            )
        if anchor_id not in mapped_non_sol:
            raise ValueError(
                f'{anchor_id} has an explicit bootstrap but is not a mapped non-Sol anchor'
            )
        if not isinstance(system_id, str) or not system_id:
            raise ValueError(
                f'{anchor_id} explicit bootstrap lacks a non-empty system_id'
            )
        if system_id != anchor_id:
            raise ValueError(
                f'{anchor_id} explicit bootstrap must keep system_id equal to anchor_id'
            )
        if catalogue not in {"gcns", "cns5"}:
            raise ValueError(
                f'{anchor_id} explicit bootstrap has an invalid catalogue'
            )
        if not isinstance(source_id, str) or re.fullmatch(r"[0-9]+", source_id) is None:
            raise ValueError(
                f'{anchor_id} explicit bootstrap has an invalid decimal source_id'
            )
        explicit_by_anchor[anchor_id] = {
            "anchor_id": anchor_id,
            "system_id": system_id,
            "catalogue": catalogue,
            "source_id": source_id,
        }

    def deterministic_bootstrap(anchor_id: str) -> dict[str, str]:
        system = systems_by_id.get(anchor_id)
        if system is None:
            raise ValueError(
                f'{anchor_id} does not identify an accepted candidate system'
            )
        override = overrides_by_id.get(anchor_id, {})
        adopted_id = override.get(
            "adopted_component_id", system.get("adopted_component_candidate")
        )
        if system.get("requires_review") and not override.get(
            "adopted_component_id"
        ):
            raise ValueError(
                f'{anchor_id} has an unresolved adopted-position review requirement'
            )
        if adopted_id not in system.get("component_ids", []):
            raise ValueError(
                f'{anchor_id} lacks an accepted adopted position component'
            )
        component = components_by_id.get(adopted_id)
        if component is None or component.get("position_pc") is None:
            raise ValueError(
                f'{anchor_id} adopted component lacks source-backed geometry'
            )
        derivation = component.get("position_derivation")
        if derivation == "gcns median Bayesian Cartesian geometry":
            catalogue = "gcns"
            source_id = component.get("gaia_source_id")
        elif derivation == "CNS5 astrometry transformed by Astropy":
            catalogue = "cns5"
            source_id = component.get("cns5_id")
        else:
            raise ValueError(
                f'{anchor_id} adopted component has unsupported position provenance'
            )
        if not isinstance(source_id, str) or re.fullmatch(r"[0-9]+", source_id) is None:
            raise ValueError(
                f'{anchor_id} adopted component lacks an exact decimal {catalogue} source identity'
            )
        return {
            "anchor_id": anchor_id,
            "system_id": anchor_id,
            "catalogue": catalogue,
            "source_id": source_id,
        }

    resolved: list[dict[str, str]] = []
    for anchor_id, narrative_names in anchor_names.items():
        if not isinstance(anchor_id, str) or not anchor_id:
            raise ValueError("Mapped astronomy anchor has an invalid stable ID")
        if not isinstance(narrative_names, list) or not narrative_names or any(
            not isinstance(name, str) or not name.strip()
            for name in narrative_names
        ):
            raise ValueError(
                f'{anchor_id} lacks complete narrative names for bootstrap resolution'
            )
        if anchor_id == "sol":
            continue
        expected = deterministic_bootstrap(anchor_id)
        explicit_entry = explicit_by_anchor.get(anchor_id)
        if explicit_entry is not None:
            if explicit_entry != expected:
                raise ValueError(
                    f'{anchor_id} explicit bootstrap differs from the accepted adopted source identity'
                )
            resolved.append(explicit_entry)
            continue
        accepted_names = set(effective_names[anchor_id])
        for narrative_name in narrative_names:
            normalized = normalize_astronomy_name(narrative_name)
            if normalized not in accepted_names:
                raise ValueError(
                    f'{anchor_id} narrative name "{narrative_name}" is not an exact accepted astronomy name or alias'
                )
            owners = owners_by_name.get(normalized, set())
            if owners != {anchor_id}:
                raise ValueError(
                    f'{anchor_id} narrative name "{narrative_name}" is not unique across accepted astronomy systems'
                )
        resolved.append(expected)
    return resolved
