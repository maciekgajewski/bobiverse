import { Billboard, Html, Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Mesh,
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
import notoSansRegularUrl from "../assets/fonts/NotoSans-Regular.ttf?url";
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
  zoomedSystemId: string | null;
  onSelect: (id: string) => void;
  onComponentSelect: (id: string) => void;
  onDeselect: () => void;
  onReady: () => void;
  onScaleChange: (scale: MapScale) => void;
}

type SceneProps = Omit<MapSceneProps, "onDeselect"> & {
  interactionsLocked: boolean;
  isInteractionLocked: () => boolean;
  onCameraRestoringChange: (restoring: boolean) => void;
};

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
  onComplete?: () => void;
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
  systems,
  knownSystemIds,
  activeSystemIds,
  zoomedSystemId,
  restoring,
  onRestoringChange,
}: {
  resetToken: number;
  selected: StellarSystem | undefined;
  systems: StellarSystem[];
  knownSystemIds: ReadonlySet<string>;
  activeSystemIds: ReadonlySet<string>;
  zoomedSystemId: string | null;
  restoring: boolean;
  onRestoringChange: (restoring: boolean) => void;
}) {
  const { camera, gl, size } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const motion = useRef<CameraMotion | null>(null);
  const reducedMotion = useReducedMotion();
  const restorePose = useRef<{ camera: Vector3; target: Vector3 } | null>(null);
  const restoredWindow = useRef({ width: 0, height: 0, at: 0 });
  const pendingDeferredFraming = useRef(false);
  const previousFramingInputs = useRef({
    resetToken,
    systems,
    width: size.width,
    height: size.height,
  });
  const framingRevision = useRef(0);
  const zoomedSystemIdRef = useRef(zoomedSystemId);
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
      const travelDistance = Math.max(
        camera.position.distanceTo(destination),
        control.target.distanceTo(target),
      );
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
    zoomedSystemIdRef.current = zoomedSystemId;
  }, [zoomedSystemId]);
  useEffect(() => {
    const restored = restoredWindow.current;
    const previous = previousFramingInputs.current;
    const resetRequested = previous.resetToken !== resetToken;
    const systemsChanged = previous.systems !== systems;
    const sizeChanged =
      previous.width !== size.width || previous.height !== size.height;
    previousFramingInputs.current = {
      resetToken,
      systems,
      width: size.width,
      height: size.height,
    };
    if (
      pendingDeferredFraming.current &&
      sizeChanged &&
      !resetRequested &&
      !systemsChanged &&
      window.innerWidth === restored.width &&
      window.innerHeight === restored.height
    ) {
      pendingDeferredFraming.current = false;
      return;
    }
    pendingDeferredFraming.current = false;
    restoredWindow.current.at = 0;
    if (zoomedSystemIdRef.current || restorePose.current) return;
    framingRevision.current += 1;
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
  }, [camera, resetToken, size.height, size.width, systems]);
  useEffect(() => {
    const bridge: Bob034MapPerformanceBridge = {
      snapshot: () => {
        const target = controls.current?.target;
        if (!target) {
          throw new Error("Map controls are not ready.");
        }
        return {
          camera: camera.position.toArray(),
          target: target.toArray(),
          controlsEnabled: controls.current?.enabled ?? false,
          cameraTransitionActive: motion.current !== null,
          restorePending: restorePose.current !== null,
          framingRevision: framingRevision.current,
          capturedCamera: restorePose.current?.camera.toArray() ?? null,
          capturedTarget: restorePose.current?.target.toArray() ?? null,
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
  }, [activeSystemIds, camera, gl, knownSystemIds, systems]);
  useEffect(() => {
    if (zoomedSystemId || restorePose.current) return;
    if (!selected) return;
    const { x, y, z } = selected.render_position;
    const target = new Vector3(x, y, z);
    const currentTarget = controls.current?.target ?? new Vector3();
    focus(
      target,
      camera.position.clone().add(target.clone().sub(currentTarget)),
    );
  }, [camera, focus, selected, zoomedSystemId]);
  useEffect(() => {
    const control = controls.current;
    if (!control) return;
    if (zoomedSystemId) {
      const system = systems.find(
        (candidate) => candidate.id === zoomedSystemId,
      );
      if (!system) return;
      const target = new Vector3(
        system.render_position.x,
        system.render_position.y,
        system.render_position.z,
      );
      // Finish any ordinary system focus before capturing the pre-entry pose.
      // The system-mode transition must start from that completed focus even
      // when Enter system is pressed immediately after selecting the system.
      const ordinaryFocus = motion.current;
      if (ordinaryFocus) {
        camera.position.copy(ordinaryFocus.toCamera);
        control.target.copy(ordinaryFocus.toTarget);
        motion.current = null;
      }
      const damping = control.enableDamping;
      control.enableDamping = false;
      control.update();
      control.enableDamping = damping;
      if (!restorePose.current) {
        restorePose.current = {
          camera: camera.position.clone(),
          target: control.target.clone(),
        };
      }
      camera.position.add(target.clone().sub(control.target));
      control.target.copy(target);
      control.update();
      const destination = target
        .clone()
        .add(camera.position.clone().sub(target).multiplyScalar(0.08));
      control.enabled = false;
      focus(target, destination);
      return;
    }
    const saved = restorePose.current;
    if (!saved) return;
    control.enabled = false;
    onRestoringChange(true);
    const restore = () => {
      camera.position.copy(saved.camera);
      control.target.copy(saved.target);
      control.enabled = true;
      control.update();
      restorePose.current = null;
      // Exiting changes the surrounding topbar/inspector layout. Ignore the
      // resulting delayed ResizeObserver framing pass so it cannot overwrite
      // the exact pose that was just restored; later ordinary resizes reframe.
      restoredWindow.current = {
        width: window.innerWidth,
        height: window.innerHeight,
        at: performance.now(),
      };
      pendingDeferredFraming.current = true;
      onRestoringChange(false);
    };
    if (reducedMotion) {
      restore();
      return;
    }
    motion.current = {
      startedAt: performance.now(),
      durationMs: focusDurationMs(camera.position.distanceTo(saved.camera)),
      fromCamera: camera.position.clone(),
      fromTarget: control.target.clone(),
      toCamera: saved.camera,
      toTarget: saved.target,
      onComplete: restore,
    };
  }, [
    camera,
    focus,
    onRestoringChange,
    reducedMotion,
    systems,
    zoomedSystemId,
  ]);
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
    if (progress === 1) {
      motion.current = null;
      current.onComplete?.();
    }
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={MAP_CAMERA_DAMPING_FACTOR}
      minDistance={2}
      maxDistance={45}
      enabled={!zoomedSystemId && !restoring}
      onStart={cancelMotion}
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
  zoomed,
  entered,
  interactionLocked,
  onHover,
}: {
  system: StellarSystem;
  selected: boolean;
  selectedSystem: StellarSystem | undefined;
  known: boolean;
  active: boolean;
  hovered: boolean;
  captionVisible: boolean;
  zoomed: boolean;
  entered: boolean;
  interactionLocked: boolean;
  onHover: (id: string | null) => void;
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
      onPointerOver={(event) => {
        if (zoomed || interactionLocked) return;
        event.stopPropagation();
        onHover(system.id);
      }}
      onPointerOut={() => {
        onHover(null);
      }}
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
        const pickable = !interactionLocked && (!zoomed || entered);
        return (
          <Billboard key={component.id} position={offset} follow>
            <mesh
              userData={{ systemId: system.id, componentId: component.id }}
              raycast={pickable ? Mesh.prototype.raycast : ignoreRaycast}
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
              userData={{ systemId: system.id, componentId: component.id }}
              raycast={pickable ? Mesh.prototype.raycast : ignoreRaycast}
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
                      zoomed && !entered
                        ? 0.08
                        : known
                          ? 1
                          : ASTRONOMY_CONTEXT_EMPHASIS,
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
      {!zoomed && active && <NarrativeRing />}
      {!zoomed && selected && <SelectionFrame />}
      {!zoomed && captionVisible && !hovered && (
        <Billboard position={[0, -0.32, 0]} follow raycast={ignoreRaycast}>
          <Html center style={{ pointerEvents: "none" }}>
            <div className="narrative-map-label">{system.name}</div>
          </Html>
        </Billboard>
      )}
      {!zoomed && hovered && (
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

function SelectionFrame() {
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
    );
    const label = `${displayDistance.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    })} ${DISPLAY_DISTANCE_UNIT}`;
    const next = `${label}:${pixelWidth}`;
    if (next !== lastScale.current) {
      lastScale.current = next;
      onScaleChange({ label, pixelWidth });
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
  const previous = useRef("");
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
    if (key !== previous.current) {
      previous.current = key;
      onChange(visible);
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
  zoomedSystemId,
  onSelect,
  onComponentSelect,
  onReady,
  onScaleChange,
  interactionsLocked,
  isInteractionLocked,
  onCameraRestoringChange,
}: SceneProps) {
  useEffect(onReady, [onReady]);
  const selected = systems.find((system) => system.id === selectedId);
  const zoomed = zoomedSystemId !== null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [captionIds, setCaptionIds] = useState<ReadonlySet<string>>(new Set());
  return (
    <>
      <color attach="background" args={["#050812"]} />
      <GalacticStarfield />
      <ambientLight intensity={0.7} />
      {!zoomed && <GalacticPlaneGrid />}
      {!zoomed && (
        <Text
          position={[16, 0.04, 0]}
          font={notoSansRegularUrl}
          fontSize={0.13}
          color="#536986"
          anchorX="center"
        >
          Galactic center · +Xg
        </Text>
      )}
      {!zoomed && (
        <Text
          position={[0, 8, 0]}
          font={notoSansRegularUrl}
          fontSize={0.13}
          color="#536986"
          anchorX="center"
        >
          Galactic north · +Zg
        </Text>
      )}
      <group
        onClick={(event) => {
          if (isInteractionLocked()) return;
          if (zoomed) {
            const componentId = event.intersections.find(
              (intersection) =>
                typeof intersection.object.userData.componentId === "string" &&
                intersection.object.userData.systemId === zoomedSystemId,
            )?.object.userData.componentId as string | undefined;
            if (componentId) onComponentSelect(componentId);
            return;
          }
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
            known={knownSystemIds.has(system.id)}
            active={activeSystemIds.has(system.id)}
            hovered={hoveredId === system.id}
            captionVisible={captionIds.has(system.id)}
            zoomed={zoomed}
            entered={system.id === zoomedSystemId}
            interactionLocked={interactionsLocked}
            onHover={setHoveredId}
          />
        ))}
      </group>
      <CameraController
        resetToken={resetToken}
        selected={selected}
        systems={systems}
        knownSystemIds={knownSystemIds}
        activeSystemIds={activeSystemIds}
        zoomedSystemId={zoomedSystemId}
        restoring={interactionsLocked}
        onRestoringChange={onCameraRestoringChange}
      />
      {!zoomed && <CameraScaleReporter onScaleChange={onScaleChange} />}
      {!zoomed && (
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

export function StarMap({ onDeselect, ...props }: MapSceneProps) {
  const [cameraRestoring, setCameraRestoring] = useState(false);
  const cameraRestoringRef = useRef(false);
  const onCameraRestoringChange = useCallback((restoring: boolean) => {
    cameraRestoringRef.current = restoring;
    setCameraRestoring(restoring);
  }, []);
  const isInteractionLocked = useCallback(() => cameraRestoringRef.current, []);
  return (
    <Canvas
      camera={{
        position: DEFAULT_CAMERA_DIRECTION,
        fov: MAP_CAMERA_FOV_DEGREES,
      }}
      dpr={[1, 1.8]}
      onPointerMissed={() => {
        if (!cameraRestoringRef.current) onDeselect();
      }}
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
    >
      <Scene
        {...props}
        interactionsLocked={cameraRestoring}
        isInteractionLocked={isInteractionLocked}
        onCameraRestoringChange={onCameraRestoringChange}
      />
    </Canvas>
  );
}
