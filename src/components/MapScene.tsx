import { Billboard, Html, Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  PerspectiveCamera,
  Vector3,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { DistanceUnit, StellarSystem } from "../domain/types";
import { calculateMapScale, formatDistance } from "../domain/units";
import {
  easeInOutQuad,
  focusDurationMs,
  perspectiveWorldWidthAtTarget,
} from "../domain/camera-motion";
import { GALACTIC_PLANE_SCENE_ROTATION } from "../domain/coordinates";
import { closestMarkerSystemId } from "../domain/star-picking";
import {
  STAR_SPRITE_FRAGMENT_SHADER,
  componentOffset,
  markerRadius,
  selectionFrameSegments,
  spectralColor,
} from "../domain/star-visual";

interface MapSceneProps {
  systems: StellarSystem[];
  selectedId: string | null;
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
  unit,
}: {
  system: StellarSystem;
  selected: boolean;
  selectedSystem: StellarSystem | undefined;
  unit: DistanceUnit;
}) {
  const [hovered, setHovered] = useState(false);
  const position = system.render_position;
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
                fragmentShader={STAR_SPRITE_FRAGMENT_SHADER}
              />
            </mesh>
          </Billboard>
        );
      })}
      {selected && <SelectionFrame name={system.name} />}
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

function CameraScaleReporter({
  unit,
  onScaleChange,
}: {
  unit: DistanceUnit;
  onScaleChange: (scale: MapScale) => void;
}) {
  const { camera, size } = useThree();
  const controls = useThree(
    (state) => state.controls as OrbitControlsImpl | null,
  );
  const lastScale = useRef("");
  useFrame(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const focus = controls?.target ?? { x: 0, y: 0, z: 0 };
    const worldWidthPc = perspectiveWorldWidthAtTarget(
      camera.position,
      focus,
      camera.getEffectiveFOV(),
      size.width / size.height,
    );
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
        rotation={[...GALACTIC_PLANE_SCENE_ROTATION]}
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
            unit={unit}
          />
        ))}
      </group>
      <CameraController resetToken={resetToken} selected={selected} />
      <CameraScaleReporter unit={unit} onScaleChange={onScaleChange} />
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
