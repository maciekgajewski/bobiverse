import { Html, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { DistanceUnit, StellarSystem } from "../domain/types";
import { formatDistance } from "../domain/units";

interface MapSceneProps {
  systems: StellarSystem[];
  selectedId: string | null;
  measurementIds: [string | null, string | null];
  unit: DistanceUnit;
  resetToken: number;
  onSelect: (id: string) => void;
  onReady: () => void;
}

const DEFAULT_CAMERA: [number, number, number] = [10.5, 8, 12];

function CameraController({
  resetToken,
  selected,
}: {
  resetToken: number;
  selected: StellarSystem | undefined;
}) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    camera.position.set(...DEFAULT_CAMERA);
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [camera, resetToken]);
  useEffect(() => {
    if (!selected) return;
    const { x, y, z } = selected.render_position;
    controls.current?.target.set(x, y, z);
    camera.position.set(x + 8, y + 5, z + 8);
    controls.current?.update();
  }, [camera, selected]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={45}
    />
  );
}

function StarMarker({
  system,
  selected,
  endpoint,
  onSelect,
  unit,
}: {
  system: StellarSystem;
  selected: boolean;
  endpoint: "a" | "b" | null;
  onSelect: (id: string) => void;
  unit: DistanceUnit;
}) {
  const color =
    system.id === "sol"
      ? "#ffd88a"
      : endpoint === "a"
        ? "#72e7ff"
        : endpoint === "b"
          ? "#ffb970"
          : selected
            ? "#d8f3ff"
            : "#8ba6ff";
  const position = system.render_position;
  const radius = system.id === "sol" ? 0.16 : selected || endpoint ? 0.13 : 0.1;
  return (
    <group
      position={[position.x, position.y, position.z]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(system.id);
      }}
    >
      <mesh>
        <sphereGeometry args={[radius, 20, 20]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {(selected || endpoint || system.id === "sol") && (
        <Html distanceFactor={12} center style={{ pointerEvents: "none" }}>
          <div className="map-label">
            {endpoint ? `${endpoint.toUpperCase()} · ` : ""}
            {system.name}
            <small>
              {formatDistance(system.distance_from_sol_pc, unit, 1)}
            </small>
          </div>
        </Html>
      )}
    </group>
  );
}

function MeasurementLine({
  systems,
  ids,
}: {
  systems: StellarSystem[];
  ids: [string | null, string | null];
}) {
  const points = useMemo(() => {
    const a = systems.find((system) => system.id === ids[0]);
    const b = systems.find((system) => system.id === ids[1]);
    if (!a || !b) return null;
    return [
      [a.render_position.x, a.render_position.y, a.render_position.z],
      [b.render_position.x, b.render_position.y, b.render_position.z],
    ] as [number, number, number][];
  }, [ids, systems]);
  if (!points) return null;
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flat()), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#72e7ff" linewidth={2} />
    </line>
  );
}

function Scene({
  systems,
  selectedId,
  measurementIds,
  unit,
  resetToken,
  onSelect,
  onReady,
}: MapSceneProps) {
  useEffect(onReady, [onReady]);
  const selected = systems.find((system) => system.id === selectedId);
  return (
    <>
      <color attach="background" args={["#050812"]} />
      <ambientLight intensity={0.7} />
      <gridHelper
        args={[16, 16, "#2a4367", "#172842"]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <Text
        position={[4.5, 0.06, 0]}
        fontSize={0.26}
        color="#8fa9cc"
        anchorX="center"
      >
        +Xg · Galactic center
      </Text>
      <Text
        position={[0, 0.06, -4.5]}
        fontSize={0.26}
        color="#8fa9cc"
        anchorX="center"
      >
        +Yg
      </Text>
      <Text
        position={[0, 2.4, 0]}
        fontSize={0.24}
        color="#8fa9cc"
        anchorX="center"
      >
        +Zg · Galactic north
      </Text>
      {systems.map((system) => (
        <StarMarker
          key={system.id}
          system={system}
          selected={selectedId === system.id}
          endpoint={
            measurementIds[0] === system.id
              ? "a"
              : measurementIds[1] === system.id
                ? "b"
                : null
          }
          onSelect={onSelect}
          unit={unit}
        />
      ))}
      <MeasurementLine systems={systems} ids={measurementIds} />
      <CameraController resetToken={resetToken} selected={selected} />
    </>
  );
}

export function StarMap(props: MapSceneProps) {
  return (
    <Canvas camera={{ position: DEFAULT_CAMERA, fov: 47 }} dpr={[1, 1.8]}>
      <Scene {...props} />
    </Canvas>
  );
}
