from __future__ import annotations

import math

from jsonschema import Draft202012Validator

from common import GENERATED_PATH, ROOT, read_json


def main() -> None:
    document = read_json(GENERATED_PATH)
    schema = read_json(ROOT / "data" / "schema" / "nearby-systems.schema.json")
    errors = sorted(Draft202012Validator(schema).iter_errors(document), key=lambda error: list(error.path))
    if errors:
        raise ValueError("Schema validation failed:\n" + "\n".join(error.message for error in errors))

    systems = document["systems"]
    system_ids = [system["id"] for system in systems]
    if len(systems) != 21 or len(system_ids) != len(set(system_ids)) or system_ids[0] != "sol":
        raise ValueError("Dataset must contain Sol and exactly 20 distinct non-Sol systems")
    if [system["distance_from_sol_pc"] for system in systems] != sorted(system["distance_from_sol_pc"] for system in systems):
        raise ValueError("Systems must be ordered by their adopted distance from Sol")
    component_ids: set[str] = set()
    for system in systems:
        position = system["position_pc"]
        render = system["render_position"]
        values = [*position.values(), *render.values(), system["distance_from_sol_pc"]]
        if not all(math.isfinite(value) for value in values):
            raise ValueError(f"{system['id']} has a non-finite coordinate")
        if render != {"x": position["xg"], "y": position["zg"], "z": -position["yg"]}:
            raise ValueError(f"{system['id']} violates the canonical-to-scene mapping")
        for component in system["components"]:
            component_id = component["id"]
            if component_id in component_ids:
                raise ValueError(f"Duplicate component reference: {component_id}")
            component_ids.add(component_id)
    print(f"Validated {len(systems)} systems and {len(component_ids)} component references")


if __name__ == "__main__":
    main()
