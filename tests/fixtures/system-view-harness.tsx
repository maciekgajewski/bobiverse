import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SystemViewScene } from "../../src/components/SystemViewScene";
import { projectSystemView } from "../../src/domain/system-view";
import type {
  NarrativeEntity,
  NarrativeWorld,
} from "../../src/narrative/model";
import "../../src/styles.css";

function location(
  id: string,
  name: string,
  kind: string,
  parentId: string | null,
  childIds: string[],
): NarrativeEntity {
  return {
    id,
    name,
    kind,
    entity_type: "location",
    parent_location_id: parentId,
    parent_relation: parentId === "fixture" ? "member_of_system" : "orbits",
    child_ids: childIds,
  };
}

const entities: NarrativeEntity[] = [
  location("fixture", "Fixture Binary", "star_system", null, ["a", "b"]),
  location("a", "Fixture A", "star", "fixture", [
    "a-belt",
    "station",
    "locale",
  ]),
  location("a-belt", "A Belt", "asteroid_belt", "a", []),
  location("station", "Orbiting station", "megastructure", "a", []),
  {
    ...location("locale", "Non-orbital locale", "locale", "a", []),
    parent_relation: "located_on",
  },
  location("b", "Fixture B", "star", "fixture", ["b-belt"]),
  location("b-belt", "B Belt", "kuiper_belt", "b", []),
];
entities[0]!.astronomy_object_id = "fixture-astronomy";
const world: NarrativeWorld = {
  entities,
  activity: [],
  view: { chapter: "1.1", display_date: "2133" },
};
const model = projectSystemView(world, "fixture", "chapter")!;

declare global {
  interface Window {
    __systemViewFixture?: { focus: (id: string) => void };
  }
}

export function Harness() {
  const [focusedId, setFocusedId] = useState("fixture");
  useEffect(() => {
    window.__systemViewFixture = { focus: setFocusedId };
    return () => {
      delete window.__systemViewFixture;
    };
  }, []);
  return (
    <>
      <output aria-label="Projected fixture nodes">
        {[...model.nodes.keys()].join(" ")}
      </output>
      <Canvas camera={{ position: [0, -5.4, 7.2], fov: 47 }}>
        <SystemViewScene
          model={model}
          focusedId={focusedId}
          selectedId={null}
          keyboardFocusedId={null}
          assets={{ assets: [] }}
          reducedMotion
          onSelect={setFocusedId}
        />
      </Canvas>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
