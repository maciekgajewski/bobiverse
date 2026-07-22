import { Billboard, Html, Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, Color, DoubleSide, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { DistanceUnit, StellarSystem } from "../domain/types";
import { calculateMapScale, formatDistance } from "../domain/units";
import { easeInOutQuad, focusDurationMs } from "../domain/camera-motion";
import { closestMarkerSystemId } from "../domain/star-picking";
import {
  componentOffset,
  markerRadius,
  selectionFrameSegments,
  spectralColor,
} from "../domain/star-visual";

interface MapSceneProps {
  systems: StellarSystem[];
  selectedId: string | null;
  measurementIds: [string | null, string | null];
  unit: DistanceUnit;
  resetToken: number;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onReady: () => void;
  onScaleChange: (scale: MapScale) => void;
}

type SceneProps = Omit<MapSceneProps, "onDeselect">;

export interface MapScale {
  label: string;
  pixelWidth: number;
}

const DEFAULT_CAMERA: [number, number, number] = [10.5, 8, 12];

const ignoreRaycast = () => undefined;

interface CameraMotion {
  startedAt: number;
  durationMs: number;
  fromCamera: Vector3;
  fromTarget: Vector3;
  toCamera: Vector3;
  toTarget: Vector3;
}

function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reducedMotion;
}

function CameraController({
  resetToken,
  selected,
}: {
  resetToken: number;
  selected: StellarSystem | undefined;
}) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const motion = useRef<CameraMotion | null>(null);
  const reducedMotion = useReducedMotion();
  const cancelMotion = () => {
    motion.current = null;
  };
  const focus = useCallback(
    (target: Vector3, destination: Vector3) => {
      const control = controls.current;
      if (!control) return;
      if (reducedMotion) {
        camera.position.copy(destination);
        control.target.copy(target);
        control.update();
        return;
      }
      const travelDistance = control.target.distanceTo(target);
      motion.current = {
        startedAt: performance.now(),
        durationMs: focusDurationMs(travelDistance),
        fromCamera: camera.position.clone(),
        fromTarget: control.target.clone(),
        toCamera: destination,
        toTarget: target,
      };
    },
    [camera, reducedMotion],
  );
  useEffect(() => {
    motion.current = null;
    camera.position.set(...DEFAULT_CAMERA);
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [camera, resetToken]);
  useEffect(() => {
    if (!selected) return;
    const { x, y, z } = selected.render_position;
    const target = new Vector3(x, y, z);
    const currentTarget = controls.current?.target ?? new Vector3();
    focus(
      target,
      camera.position.clone().add(target.clone().sub(currentTarget)),
    );
  }, [camera, focus, selected]);
  useFrame(() => {
    const current = motion.current;
    const control = controls.current;
    if (!current || !control) return;
    const progress = Math.min(
      (performance.now() - current.startedAt) / current.durationMs,
      1,
    );
    const eased = easeInOutQuad(progress);
    camera.position.lerpVectors(current.fromCamera, current.toCamera, eased);
    control.target.lerpVectors(current.fromTarget, current.toTarget, eased);
    control.update();
    if (progress === 1) motion.current = null;
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={45}
      onStart={cancelMotion}
    />
  );
}

function StarMarker({
  system,
  selected,
  selectedSystem,
  endpoint,
  unit,
}: {
  system: StellarSystem;
  selected: boolean;
  selectedSystem: StellarSystem | undefined;
  endpoint: "a" | "b" | null;
  unit: DistanceUnit;
}) {
  const [hovered, setHovered] = useState(false);
  const position = system.render_position;
  const highlightColor =
    endpoint === "a" ? "#72e7ff" : endpoint === "b" ? "#ffb970" : "#d8f3ff";
  const selectedDistance = selectedSystem
    ? Math.hypot(
        system.position_pc.xg - selectedSystem.position_pc.xg,
        system.position_pc.yg - selectedSystem.position_pc.yg,
        system.position_pc.zg - selectedSystem.position_pc.zg,
      )
    : null;
  return (
    <group
      position={[position.x, position.y, position.z]}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {system.components.map((component, index) => {
        const radius = markerRadius(component.visual.radius_solar);
        const offset = componentOffset(
          component,
          index,
          system.components.length,
        );
        return (
          <Billboard key={component.id} position={offset} follow>
            <mesh userData={{ systemId: system.id }}>
              <planeGeometry args={[radius * 2, radius * 2]} />
              <shaderMaterial
                transparent
                depthWrite={false}
                side={DoubleSide}
                blending={AdditiveBlending}
                uniforms={{
                  uColor: {
                    value: new Color(
                      spectralColor(component.visual.spectral_class),
                    ),
                  },
                }}
                vertexShader="varying vec2 vUv; varying float vCameraDistance; void main() { vUv = uv; vCameraDistance = length((modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
                fragmentShader="uniform vec3 uColor; varying vec2 vUv; varying float vCameraDistance; void main() { float distanceFromCenter = length(vUv - 0.5) * 2.0; float halo = pow(max(1.0 - distanceFromCenter, 0.0), 2.2); float core = smoothstep(0.5, 0.0, distanceFromCenter); float attenuation = 1.0 - smoothstep(6.0, 45.0, vCameraDistance) * 0.65; float alpha = (halo * 0.7 + core * 0.3) * attenuation; gl_FragColor = vec4(uColor * (halo + core * 0.75) * attenuation, alpha); }"
              />
            </mesh>
            {endpoint && (
              <mesh userData={{ systemId: system.id }}>
                <ringGeometry args={[radius * 1.08, radius * 1.15, 28]} />
                <meshBasicMaterial
                  color={highlightColor}
                  transparent
                  opacity={0.92}
                  depthWrite={false}
                />
              </mesh>
            )}
          </Billboard>
        );
      })}
      {selected && <SelectionFrame name={system.name} />}
      {endpoint && !selected && (
        <Html distanceFactor={12} center style={{ pointerEvents: "none" }}>
          <div className="map-label">
            {`${endpoint.toUpperCase()} · `}
            {system.name}
            <small>
              {formatDistance(system.distance_from_sol_pc, unit, 1)}
            </small>
          </div>
        </Html>
      )}
      {system.id === "sol" && !selected && (
        <Billboard position={[0.34, 0.18, 0]} follow>
          <Html center style={{ pointerEvents: "none" }}>
            <div className="sol-label">Sol</div>
          </Html>
        </Billboard>
      )}
      {hovered && (
        <Html position={[0, 0.28, 0]} center style={{ pointerEvents: "none" }}>
          <div className="map-tooltip">
            {system.name}
            {selectedDistance !== null && (
              <small>
                {formatDistance(selectedDistance, unit)} from{" "}
                {selectedSystem?.name}
              </small>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function SelectionFrame({ name }: { name: string }) {
  const half = 0.27;
  const corner = 0.07;
  const segments = selectionFrameSegments(half, corner);
  return (
    <Billboard follow>
      {segments.map((segment, index) => (
        <Line
          key={index}
          points={[
            [segment[0]!, segment[1]!, segment[2]!],
            [segment[3]!, segment[4]!, segment[5]!],
            [segment[6]!, segment[7]!, segment[8]!],
          ]}
          color="#d8f3ff"
          transparent
          opacity={0.92}
          raycast={ignoreRaycast}
        />
      ))}
      <Html
        position={[half + 0.09, 0, 0]}
        distanceFactor={12}
        style={{ pointerEvents: "none" }}
      >
        <div className="selection-label">{name}</div>
      </Html>
    </Billboard>
  );
}

function MeasurementLine({
  systems,
  ids,
  unit,
}: {
  systems: StellarSystem[];
  ids: [string | null, string | null];
  unit: DistanceUnit;
}) {
  const measurement = useMemo(() => {
    const a = systems.find((system) => system.id === ids[0]);
    const b = systems.find((system) => system.id === ids[1]);
    if (!a || !b) return null;
    const points = [
      [a.render_position.x, a.render_position.y, a.render_position.z],
      [b.render_position.x, b.render_position.y, b.render_position.z],
    ] as [number, number, number][];
    return {
      points,
      midpoint: points[0].map(
        (value, index) => (value + points[1][index]) / 2,
      ) as [number, number, number],
      distancePc: Math.hypot(
        a.position_pc.xg - b.position_pc.xg,
        a.position_pc.yg - b.position_pc.yg,
        a.position_pc.zg - b.position_pc.zg,
      ),
    };
  }, [ids, systems]);
  if (!measurement) return null;
  return (
    <>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(measurement.points.flat()), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#72e7ff" linewidth={2} />
      </line>
      <Text
        position={[
          measurement.midpoint[0],
          measurement.midpoint[1] + 0.18,
          measurement.midpoint[2],
        ]}
        fontSize={0.2}
        color="#dffaff"
        anchorX="center"
        anchorY="middle"
      >
        {formatDistance(measurement.distancePc, unit)}
      </Text>
    </>
  );
}

function CameraScaleReporter({
  selected,
  unit,
  onScaleChange,
}: {
  selected: StellarSystem | undefined;
  unit: DistanceUnit;
  onScaleChange: (scale: MapScale) => void;
}) {
  const { camera, size, viewport } = useThree();
  const lastScale = useRef("");
  useFrame(() => {
    const focus = selected?.render_position ?? { x: 0, y: 0, z: 0 };
    const worldWidthPc = viewport.getCurrentViewport(camera, [
      focus.x,
      focus.y,
      focus.z,
    ]).width;
    const { displayDistance, pixelWidth } = calculateMapScale(
      worldWidthPc,
      size.width,
      unit,
    );
    const label = `${displayDistance.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    })} ${unit}`;
    const next = `${label}:${pixelWidth}`;
    if (next !== lastScale.current) {
      lastScale.current = next;
      onScaleChange({ label, pixelWidth });
    }
  });
  return null;
}

function Scene({
  systems,
  selectedId,
  measurementIds,
  unit,
  resetToken,
  onSelect,
  onReady,
  onScaleChange,
}: SceneProps) {
  useEffect(onReady, [onReady]);
  const selected = systems.find((system) => system.id === selectedId);
  return (
    <>
      <color attach="background" args={["#050812"]} />
      <ambientLight intensity={0.7} />
      <gridHelper
        args={[64, 64, "#152843", "#0a1423"]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <Text
        position={[16, 0.04, 0]}
        fontSize={0.13}
        color="#536986"
        anchorX="center"
      >
        Galactic center · +Xg
      </Text>
      <Text
        position={[0, 8, 0]}
        fontSize={0.13}
        color="#536986"
        anchorX="center"
      >
        Galactic north · +Zg
      </Text>
      <group
        onClick={(event) => {
          const systemId = closestMarkerSystemId(event.intersections);
          if (systemId) onSelect(systemId);
        }}
      >
        {systems.map((system) => (
          <StarMarker
            key={system.id}
            system={system}
            selected={selectedId === system.id}
            selectedSystem={selected}
            endpoint={
              measurementIds[0] === system.id
                ? "a"
                : measurementIds[1] === system.id
                  ? "b"
                  : null
            }
            unit={unit}
          />
        ))}
      </group>
      <MeasurementLine systems={systems} ids={measurementIds} unit={unit} />
      <CameraController resetToken={resetToken} selected={selected} />
      <CameraScaleReporter
        selected={selected}
        unit={unit}
        onScaleChange={onScaleChange}
      />
    </>
  );
}

export function StarMap({ onDeselect, ...props }: MapSceneProps) {
  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA, fov: 47 }}
      dpr={[1, 1.8]}
      onPointerMissed={onDeselect}
      data-testid="star-map-canvas"
    >
      <Scene {...props} />
    </Canvas>
  );
}
