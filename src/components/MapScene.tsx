import { Billboard, Html, Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  PerspectiveCamera,
  Vector3,
  Vector4,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { GalacticPlaneGrid } from "./GalacticPlaneGrid";
import { GalacticStarfield } from "./GalacticStarfield";
import type { StellarSystem } from "../domain/types";
import {
  DISPLAY_DISTANCE_UNIT,
  calculateMapScale,
  formatDistance,
} from "../domain/units";
import {
  cameraPositionForFraming,
  easeInOutQuad,
  focusDurationMs,
  perspectiveWorldWidthAtTarget,
} from "../domain/camera-motion";
import { closestMarkerSystemId } from "../domain/star-picking";
import { resolveCaptionVisibility } from "../domain/caption-visibility";
import type { SystemViewModel } from "../domain/system-view";
import type { NarrativeRecord } from "../narrative/model";
import { SystemViewScene } from "./SystemViewScene";
import {
  NARRATIVE_MARKER_COLOR,
  ASTRONOMY_CONTEXT_EMPHASIS,
  NARRATIVE_CORE_HALO_SCALE,
  NARRATIVE_VISIBLE_FOOTPRINT_SCALE,
  STAR_SPRITE_FRAGMENT_SHADER,
  colorFamilyColor,
  componentOffset,
  componentPickRadius,
  componentVisibleRadius,
  narrativeMarkerGeometry,
  narrativeRingSegments,
  selectionFrameSegments,
  starOpticalVariation,
} from "../domain/star-visual";

interface MapSceneProps {
  systems: StellarSystem[];
  selectedId: string | null;
  knownSystemIds: ReadonlySet<string>;
  activeSystemIds: ReadonlySet<string>;
  resetToken: number;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onReady: () => void;
  onScaleChange: (scale: MapScale) => void;
  systemView?: SystemViewModel | null;
  systemFocusId?: string | null;
  narrativeSelectedId?: string | null;
  systemKeyboardFocusedId?: string | null;
  assets?: NarrativeRecord;
  onSystemSelect?: (id: string) => void;
}

type SceneProps = Omit<MapSceneProps, "onDeselect">;

export interface MapScale {
  label: string;
  pixelWidth: number;
}

const DEFAULT_CAMERA_DIRECTION: [number, number, number] = [10.5, 8, 12];
const MAP_CAMERA_FOV_DEGREES = 47;
export const MAP_CAMERA_DAMPING_FACTOR = 0.09;

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
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
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
  systems,
  knownSystemIds,
  activeSystemIds,
  systemMode,
}: {
  resetToken: number;
  selected: StellarSystem | undefined;
  systems: StellarSystem[];
  knownSystemIds: ReadonlySet<string>;
  activeSystemIds: ReadonlySet<string>;
  systemMode: boolean;
}) {
  const { camera, gl, size } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const motion = useRef<CameraMotion | null>(null);
  const interstellarSnapshot = useRef<{
    camera: Vector3;
    target: Vector3;
    selectedId: string | null;
  } | null>(null);
  const selectedRef = useRef(selected);
  const skipNextSelectedFocus = useRef(false);
  const reducedMotion = useReducedMotion();
  const cancelMotion = () => {
    motion.current = null;
  };
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
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
    if (systemMode || interstellarSnapshot.current) return;
    motion.current = null;
    const control = controls.current;
    if (control) {
      const damping = control.enableDamping;
      control.enableDamping = false;
      control.update();
      control.enableDamping = damping;
    }
    const position = cameraPositionForFraming(
      systems.map((system) => system.render_position),
      {
        x: DEFAULT_CAMERA_DIRECTION[0],
        y: DEFAULT_CAMERA_DIRECTION[1],
        z: DEFAULT_CAMERA_DIRECTION[2],
      },
      MAP_CAMERA_FOV_DEGREES,
      size.width / size.height,
    );
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(0, 0, 0);
    control?.target.set(0, 0, 0);
    control?.update();
  }, [camera, resetToken, size.height, size.width, systems, systemMode]);
  useEffect(() => {
    const bridge: Bob034MapPerformanceBridge = {
      snapshot: () => {
        const target =
          controls.current?.target ??
          (systemMode ? new Vector3(0, 0, 0) : undefined);
        if (!target) {
          throw new Error("Map controls are not ready.");
        }
        return {
          camera: camera.position.toArray(),
          target: target.toArray(),
        };
      },
      screenPoint: (systemId) => {
        const system = systems.find((candidate) => candidate.id === systemId);
        if (!system) throw new Error(`Unknown rendered system ${systemId}.`);
        const projected = new Vector3(
          system.render_position.x,
          system.render_position.y,
          system.render_position.z,
        ).project(camera);
        const bounds = gl.domElement.getBoundingClientRect();
        return {
          x: bounds.left + (projected.x * 0.5 + 0.5) * bounds.width,
          y: bounds.top + (-projected.y * 0.5 + 0.5) * bounds.height,
        };
      },
      fixture: {
        systemIds: systems.map((system) => system.id),
        componentIds: systems.flatMap((system) =>
          system.components.map((component) => component.id),
        ),
        knownSystemIds: [...knownSystemIds],
        activeSystemIds: [...activeSystemIds],
      },
      renderer: () => {
        const context = gl.getContext();
        const extension = context.getExtension("WEBGL_debug_renderer_info");
        return extension
          ? String(
              context.getParameter(extension.UNMASKED_RENDERER_WEBGL) ??
                context.getParameter(context.RENDERER),
            )
          : String(context.getParameter(context.RENDERER));
      },
    };
    window.__bob034MapPerformance = bridge;
    return () => {
      if (window.__bob034MapPerformance === bridge) {
        delete window.__bob034MapPerformance;
      }
    };
  }, [activeSystemIds, camera, gl, knownSystemIds, systemMode, systems]);
  useEffect(() => {
    const control = controls.current;
    if (!control) return;
    if (systemMode) {
      if (!interstellarSnapshot.current) {
        interstellarSnapshot.current = {
          camera: camera.position.clone(),
          target: control.target.clone(),
          selectedId: selectedRef.current?.id ?? null,
        };
      }
      focus(new Vector3(0, 0, 0), new Vector3(0, 0, 8));
    } else if (interstellarSnapshot.current) {
      const snapshot = interstellarSnapshot.current;
      const exitSelection = selectedRef.current;
      skipNextSelectedFocus.current = true;
      if (exitSelection && exitSelection.id !== snapshot.selectedId) {
        const target = new Vector3(
          exitSelection.render_position.x,
          exitSelection.render_position.y,
          exitSelection.render_position.z,
        );
        focus(
          target,
          snapshot.camera.clone().add(target.clone().sub(snapshot.target)),
        );
      } else {
        focus(snapshot.target, snapshot.camera);
      }
      interstellarSnapshot.current = null;
    }
  }, [camera, focus, systemMode]);
  useEffect(() => {
    if (!selected || systemMode) return;
    if (skipNextSelectedFocus.current) {
      skipNextSelectedFocus.current = false;
      return;
    }
    const { x, y, z } = selected.render_position;
    const target = new Vector3(x, y, z);
    const currentTarget = controls.current?.target ?? new Vector3();
    focus(
      target,
      camera.position.clone().add(target.clone().sub(currentTarget)),
    );
  }, [camera, focus, selected, systemMode]);
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
      dampingFactor={MAP_CAMERA_DAMPING_FACTOR}
      minDistance={2}
      maxDistance={45}
      onStart={cancelMotion}
      enabled={!systemMode}
    />
  );
}

function StarMarker({
  system,
  selected,
  selectedSystem,
  known,
  active,
  hovered,
  captionVisible,
  onHover,
  dimmed = false,
  pickable = true,
  modeOpacity = 1,
  captionOpacity = modeOpacity,
  emphasis,
}: {
  system: StellarSystem;
  selected: boolean;
  selectedSystem: StellarSystem | undefined;
  known: boolean;
  active: boolean;
  hovered: boolean;
  captionVisible: boolean;
  onHover: (id: string | null) => void;
  dimmed?: boolean;
  pickable?: boolean;
  modeOpacity?: number;
  captionOpacity?: number;
  emphasis?: number;
}) {
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
      onPointerOver={
        pickable
          ? (event) => {
              event.stopPropagation();
              onHover(system.id);
            }
          : undefined
      }
      onPointerOut={pickable ? () => onHover(null) : undefined}
    >
      {system.components.map((component, index) => {
        const radius = componentVisibleRadius(component, known);
        const optics = starOpticalVariation(
          component.id,
          component.visual.intensity,
        );
        const offset = componentOffset(
          component,
          index,
          system.components.length,
        );
        return (
          <Billboard key={component.id} position={offset} follow>
            <mesh
              userData={{ systemId: system.id }}
              raycast={pickable ? undefined : ignoreRaycast}
            >
              <planeGeometry
                args={[
                  componentPickRadius(component) * 2,
                  componentPickRadius(component) * 2,
                ]}
              />
              <meshBasicMaterial
                transparent
                opacity={0}
                depthWrite={false}
                colorWrite={false}
                side={DoubleSide}
              />
            </mesh>
            <mesh
              userData={{ systemId: system.id }}
              raycast={pickable ? undefined : ignoreRaycast}
            >
              <planeGeometry args={[radius * 2, radius * 2]} />
              <shaderMaterial
                transparent
                depthWrite={false}
                side={DoubleSide}
                blending={AdditiveBlending}
                uniforms={{
                  uColor: {
                    value: new Color(
                      colorFamilyColor(component.visual.color_family),
                    ),
                  },
                  uIntensity: { value: component.visual.intensity },
                  uEmphasis: {
                    value:
                      (emphasis ??
                        (dimmed
                          ? 0.06
                          : known
                            ? 1
                            : ASTRONOMY_CONTEXT_EMPHASIS)) * modeOpacity,
                  },
                  uCoreHaloScale: {
                    value: known ? NARRATIVE_CORE_HALO_SCALE : 1,
                  },
                  uCoreHalo: {
                    value: new Vector4(
                      optics.coreRadius,
                      optics.haloRadius,
                      optics.haloFalloff,
                      optics.rayTipSoftness,
                    ),
                  },
                  uRays: {
                    value: new Vector4(
                      optics.primaryRayLength,
                      optics.primaryRayStrength,
                      optics.secondaryRayLength,
                      optics.secondaryRayStrength,
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
      {active && <NarrativeRing />}
      {selected && <SelectionFrame name={system.name} />}
      {captionVisible && !hovered && (
        <Billboard position={[0, -0.32, 0]} follow raycast={ignoreRaycast}>
          <Html
            center
            style={{ pointerEvents: "none", opacity: captionOpacity }}
          >
            <div className="narrative-map-label">{system.name}</div>
          </Html>
        </Billboard>
      )}
      {hovered && (
        <Html position={[0, 0.28, 0]} center style={{ pointerEvents: "none" }}>
          <div className="map-tooltip">
            {system.name}
            {selectedDistance !== null && (
              <small>
                {formatDistance(selectedDistance)} from {selectedSystem?.name}
              </small>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function SegmentedRing({
  radius,
  color,
}: {
  radius: [number, number];
  color: string;
}) {
  return (
    <Billboard follow raycast={ignoreRaycast}>
      {narrativeRingSegments(radius[0], radius[1]).map((points, index) => {
        return (
          <Line
            key={index}
            points={points}
            color={color}
            lineWidth={1}
            transparent
            opacity={0.9}
            raycast={ignoreRaycast}
          />
        );
      })}
    </Billboard>
  );
}

function NarrativeRing() {
  const geometry = narrativeMarkerGeometry(true);
  return (
    <>
      <SegmentedRing
        radius={geometry.ringRadii[0]!}
        color={NARRATIVE_MARKER_COLOR}
      />
      <Billboard follow raycast={ignoreRaycast}>
        <SegmentedRing
          radius={geometry.ringRadii[1]!}
          color={NARRATIVE_MARKER_COLOR}
        />
        <Line
          points={[
            [0, geometry.tick![0], 0],
            [0, geometry.tick![1], 0],
          ]}
          color={NARRATIVE_MARKER_COLOR}
          lineWidth={1}
          raycast={ignoreRaycast}
        />
      </Billboard>
    </>
  );
}

function SelectionFrame({ name }: { name: string }) {
  const half = 0.34;
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
          color={NARRATIVE_MARKER_COLOR}
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
  onScaleChange,
}: {
  onScaleChange: (scale: MapScale) => void;
}) {
  const { camera, size } = useThree();
  const controls = useThree(
    (state) => state.controls as OrbitControlsImpl | null,
  );
  const observedScale = useRef("");
  const reportedScale = useRef("");
  const scaleChangedAt = useRef(0);
  const pendingScale = useRef<MapScale | null>(null);
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
    );
    const label = `${displayDistance.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    })} ${DISPLAY_DISTANCE_UNIT}`;
    const next = `${label}:${pixelWidth}`;
    if (next !== observedScale.current) {
      observedScale.current = next;
      scaleChangedAt.current = performance.now();
      pendingScale.current = { label, pixelWidth };
    } else if (
      reportedScale.current !== next &&
      performance.now() - scaleChangedAt.current >= 120 &&
      pendingScale.current
    ) {
      reportedScale.current = next;
      const settled = pendingScale.current;
      queueMicrotask(() => onScaleChange(settled));
    }
  });
  return null;
}

function CaptionController({
  systems,
  knownSystemIds,
  activeSystemIds,
  selectedId,
  hoveredId,
  onChange,
}: {
  systems: readonly StellarSystem[];
  knownSystemIds: ReadonlySet<string>;
  activeSystemIds: ReadonlySet<string>;
  selectedId: string | null;
  hoveredId: string | null;
  onChange: (ids: ReadonlySet<string>) => void;
}) {
  const { camera, size } = useThree();
  const last = useRef(0);
  const observed = useRef("");
  const reported = useRef("");
  const changedAt = useRef(0);
  const pendingVisible = useRef<ReadonlySet<string>>(new Set());
  useFrame(() => {
    if (performance.now() - last.current < 120) return;
    last.current = performance.now();
    const candidates = systems
      .filter(
        (system) =>
          knownSystemIds.has(system.id) ||
          system.id === selectedId ||
          system.id === hoveredId,
      )
      .map((system) => {
        const point = new Vector3(
          system.render_position.x,
          system.render_position.y,
          system.render_position.z,
        ).project(camera);
        const priority =
          system.id === selectedId
            ? 3
            : system.id === hoveredId
              ? 2
              : activeSystemIds.has(system.id)
                ? 1
                : 0;
        return {
          id: system.id,
          priority,
          x: (point.x * 0.5 + 0.5) * size.width,
          y: (-point.y * 0.5 + 0.5) * size.height,
          visible: point.z >= -1 && point.z <= 1,
        };
      });
    const visible = resolveCaptionVisibility(candidates);
    const key = [...visible].sort().join("\u0000");
    if (key !== observed.current) {
      observed.current = key;
      changedAt.current = performance.now();
      pendingVisible.current = visible;
    } else if (
      reported.current !== key &&
      performance.now() - changedAt.current >= 120
    ) {
      reported.current = key;
      const settled = pendingVisible.current;
      queueMicrotask(() => onChange(settled));
    }
  });
  return null;
}

function Scene({
  systems,
  selectedId,
  knownSystemIds,
  activeSystemIds,
  resetToken,
  onSelect,
  onReady,
  onScaleChange,
  systemView = null,
  systemFocusId = null,
  narrativeSelectedId = null,
  systemKeyboardFocusedId = null,
  assets = { assets: [] },
  onSystemSelect = () => undefined,
}: SceneProps) {
  useEffect(onReady, [onReady]);
  const selected = systems.find((system) => system.id === selectedId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [captionIds, setCaptionIds] = useState<ReadonlySet<string>>(new Set());
  const [displayedSystem, setDisplayedSystem] = useState<{
    model: SystemViewModel;
    focusId: string;
  } | null>(null);
  const [interstellarOpacity, setInterstellarOpacity] = useState(1);
  const interstellarOpacityRef = useRef(1);
  useEffect(() => {
    interstellarOpacityRef.current = interstellarOpacity;
  }, [interstellarOpacity]);
  useEffect(() => {
    const target = systemView ? 0 : 1;
    const from = interstellarOpacityRef.current;
    if (from === target) return;
    const startedAt = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 220);
      setInterstellarOpacity(from + (target - from) * progress);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [systemView]);
  useEffect(() => {
    if (systemView && systemFocusId) {
      const show = window.requestAnimationFrame(() =>
        setDisplayedSystem({ model: systemView, focusId: systemFocusId }),
      );
      return () => window.cancelAnimationFrame(show);
    }
    const clear = window.setTimeout(() => setDisplayedSystem(null), 220);
    return () => window.clearTimeout(clear);
  }, [systemFocusId, systemView]);
  return (
    <>
      <color attach="background" args={["#050812"]} />
      <GalacticStarfield />
      <ambientLight intensity={0.7} />
      {interstellarOpacity > 0 && (
        <GalacticPlaneGrid opacity={interstellarOpacity} />
      )}
      {displayedSystem && (
        <SystemViewLayer
          model={displayedSystem.model}
          focusedId={displayedSystem.focusId}
          selectedId={narrativeSelectedId}
          keyboardFocusedId={systemKeyboardFocusedId}
          assets={assets}
          onSelect={onSystemSelect}
        />
      )}
      {interstellarOpacity > 0 && (
        <>
          <Text
            position={[16, 0.04, 0]}
            fontSize={0.13}
            color="#536986"
            fillOpacity={interstellarOpacity}
            anchorX="center"
          >
            Galactic center · +Xg
          </Text>
          <Text
            position={[0, 8, 0]}
            fontSize={0.13}
            color="#536986"
            fillOpacity={interstellarOpacity}
            anchorX="center"
          >
            Galactic north · +Zg
          </Text>
        </>
      )}
      <group
        position={(() => {
          const entered = displayedSystem
            ? systems.find(
                (system) => system.id === displayedSystem.model.astronomyId,
              )
            : undefined;
          return entered
            ? [
                -entered.render_position.x * (1 - interstellarOpacity),
                -entered.render_position.y * (1 - interstellarOpacity),
                -entered.render_position.z * (1 - interstellarOpacity),
              ]
            : [0, 0, 0];
        })()}
        onClick={(event) => {
          const systemId = closestMarkerSystemId(event.intersections);
          if (!displayedSystem && systemId) onSelect(systemId);
        }}
      >
        {systems.map((system) => {
          const entered = displayedSystem?.model.astronomyId === system.id;
          const background = Boolean(displayedSystem && !entered);
          const baseEmphasis = knownSystemIds.has(system.id)
            ? 1
            : ASTRONOMY_CONTEXT_EMPHASIS;
          return (
            <StarMarker
              key={system.id}
              system={system}
              selected={!displayedSystem && selectedId === system.id}
              selectedSystem={selected}
              known={knownSystemIds.has(system.id)}
              active={!displayedSystem && activeSystemIds.has(system.id)}
              hovered={!displayedSystem && hoveredId === system.id}
              captionVisible={captionIds.has(system.id)}
              onHover={setHoveredId}
              pickable={!displayedSystem}
              modeOpacity={entered ? interstellarOpacity : 1}
              captionOpacity={interstellarOpacity}
              emphasis={
                background
                  ? 0.06 + (baseEmphasis - 0.06) * interstellarOpacity
                  : undefined
              }
            />
          );
        })}
      </group>
      <CameraController
        resetToken={resetToken}
        selected={selected}
        systems={systems}
        knownSystemIds={knownSystemIds}
        activeSystemIds={activeSystemIds}
        systemMode={Boolean(systemView)}
      />
      {!systemView && <CameraScaleReporter onScaleChange={onScaleChange} />}
      {!systemView && (
        <CaptionController
          systems={systems}
          knownSystemIds={knownSystemIds}
          activeSystemIds={activeSystemIds}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onChange={setCaptionIds}
        />
      )}
    </>
  );
}

function SystemViewLayer(
  props: Omit<ComponentProps<typeof SystemViewScene>, "reducedMotion">,
) {
  const reducedMotion = useReducedMotion();
  return <SystemViewScene {...props} reducedMotion={reducedMotion} />;
}

export function StarMap({ onDeselect, ...props }: MapSceneProps) {
  return (
    <Canvas
      camera={{
        position: DEFAULT_CAMERA_DIRECTION,
        fov: MAP_CAMERA_FOV_DEGREES,
      }}
      dpr={[1, 1.8]}
      onPointerMissed={props.systemView ? undefined : onDeselect}
      data-testid="star-map-canvas"
      data-galactic-starfield="permanent"
      data-star-sprite="expressive-hybrid"
      data-component-render-calls="2"
      data-context-emphasis={ASTRONOMY_CONTEXT_EMPHASIS}
      data-known-core-halo-scale={NARRATIVE_CORE_HALO_SCALE}
      data-known-visible-footprint-scale={NARRATIVE_VISIBLE_FOOTPRINT_SCALE}
      data-known-marker="caption-only"
      data-active-marker="double-segmented-ring-and-tick"
      data-hover-marker="tooltip"
      data-grid="whisper"
      data-system-mode={props.systemView ? "schematic" : "interstellar"}
    >
      <Scene {...props} />
    </Canvas>
  );
}
