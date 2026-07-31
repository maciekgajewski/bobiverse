import { Html, Line, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  SRGBColorSpace,
} from "three";
import type { NarrativeRecord } from "../narrative/model";
import { bodySurfaceRequestPath } from "../narrative/model";
import {
  systemViewLayout,
  orbitalRegionPoints,
  visibleSystemLabelIds,
  type SystemViewModel,
} from "../domain/system-view";

const ignoreRaycast = () => undefined;

function orbitalPathPoints(radius: number): [number, number, number][] {
  return Array.from({ length: 97 }, (_, index) => {
    const angle = (index / 96) * Math.PI * 2;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, -0.025];
  });
}

function SphericalBody({
  nodeId,
  model,
  assets,
  radius,
  preview,
  reducedMotion,
}: {
  nodeId: string;
  model: SystemViewModel;
  assets: NarrativeRecord;
  radius: number;
  preview: boolean;
  reducedMotion: boolean;
}) {
  const entity = model.nodes.get(nodeId)!.entity;
  const loadedTexture = useTexture(bodySurfaceRequestPath(entity, assets));
  const texture = useMemo(() => {
    const prepared = loadedTexture.clone();
    prepared.colorSpace = SRGBColorSpace;
    prepared.generateMipmaps = true;
    prepared.needsUpdate = true;
    return prepared;
  }, [loadedTexture]);
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!preview && !reducedMotion && ref.current)
      ref.current.rotation.y += delta * 0.035;
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[radius, 28, 18]} />
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0.02} />
      </mesh>
    </group>
  );
}

function LocalStar({ radius }: { radius: number }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 28, 18]} />
      <meshBasicMaterial color="#fff0b0" />
      <pointLight color="#fff0c8" intensity={1.8} distance={12} />
    </mesh>
  );
}

function OrbitalRegion({
  kind,
  radius,
  subdued,
}: {
  kind: unknown;
  radius: number;
  subdued: boolean;
}) {
  const geometry = useMemo(() => {
    const points = orbitalRegionPoints(
      kind as "asteroid_belt" | "kuiper_belt" | "oort_cloud",
      radius,
    );
    const positions = points.flatMap((point) => [...point]);
    const next = new BufferGeometry();
    next.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return next;
  }, [kind, radius]);
  return (
    <points geometry={geometry} raycast={ignoreRaycast}>
      <pointsMaterial
        color={kind === "kuiper_belt" ? "#82b8d8" : "#b79b74"}
        transparent
        opacity={subdued ? 0.07 : kind === "oort_cloud" ? 0.16 : 0.52}
        size={kind === "oort_cloud" ? 0.025 : 0.035}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

export function SystemViewScene({
  model,
  focusedId,
  selectedId,
  keyboardFocusedId,
  assets,
  reducedMotion,
  onSelect,
  onKeyboardFocusChange = () => undefined,
}: {
  model: SystemViewModel;
  focusedId: string;
  selectedId: string | null;
  keyboardFocusedId: string | null;
  assets: NarrativeRecord;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onKeyboardFocusChange?: (id: string | null) => void;
}) {
  const { size } = useThree();
  const compact = size.width < 720 || size.height < 480;
  const layout = useMemo(
    () => systemViewLayout(model, focusedId, compact),
    [compact, focusedId, model],
  );
  const fitScale = useMemo(() => {
    const horizontalExtent = Math.max(
      1,
      ...layout.map((item) => Math.abs(item.position[0]) + item.radius + 0.6),
    );
    const verticalExtent = Math.max(
      1,
      ...layout.map((item) => Math.abs(item.position[1]) + item.radius + 0.6),
    );
    const aspect = Math.max(size.width / Math.max(size.height, 1), 0.35);
    return Math.min(1, (3.4 * aspect) / horizontalExtent, 3.4 / verticalExtent);
  }, [layout, size.height, size.width]);
  const scene = useRef<Group>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const labelIds = useMemo(
    () =>
      visibleSystemLabelIds(
        layout,
        model.activeCounts,
        selectedId,
        keyboardFocusedId,
        hoveredId,
      ),
    [hoveredId, keyboardFocusedId, layout, model.activeCounts, selectedId],
  );
  const transition = useRef(1);
  useEffect(() => {
    transition.current = reducedMotion ? 1 : 0;
    if (scene.current)
      scene.current.scale.setScalar(fitScale * (reducedMotion ? 1 : 0.94));
  }, [fitScale, focusedId, reducedMotion]);
  useFrame((_, delta) => {
    if (!scene.current || transition.current >= 1) return;
    transition.current = Math.min(1, transition.current + delta * 3.2);
    scene.current.scale.setScalar(
      fitScale * (0.94 + transition.current * 0.06),
    );
  });
  return (
    <group
      ref={scene}
      scale={fitScale}
      userData={{
        testId: "system-view-scene",
        layoutWidth: size.width,
        layoutHeight: size.height,
      }}
    >
      <ambientLight intensity={0.9} />
      {layout.map((item) => {
        const node = model.nodes.get(item.id)!;
        const region = ["asteroid_belt", "kuiper_belt", "oort_cloud"].includes(
          String(node.entity.kind),
        );
        const activeCount = model.activeCounts.get(item.id) ?? 0;
        return (
          <group
            key={`${item.id}:${item.detail}`}
            position={[...item.position]}
            onClick={
              item.interactive
                ? (event) => {
                    event.stopPropagation();
                    onSelect(item.id);
                  }
                : undefined
            }
            onPointerOver={
              item.interactive
                ? (event) => {
                    event.stopPropagation();
                    setHoveredId(item.id);
                  }
                : undefined
            }
            onPointerOut={
              item.interactive ? () => setHoveredId(null) : undefined
            }
          >
            {item.interactive && (
              <mesh>
                {region && node.entity.kind !== "oort_cloud" ? (
                  <torusGeometry args={[item.radius * 1.58, 0.22, 8, 48]} />
                ) : (
                  <sphereGeometry
                    args={[
                      region
                        ? item.radius * 2.35
                        : Math.max(item.radius * 2, 0.34),
                      12,
                      8,
                    ]}
                  />
                )}
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            )}
            {node.entity.kind === "star" ? (
              <LocalStar radius={item.radius} />
            ) : region ? (
              <OrbitalRegion
                kind={node.entity.kind}
                radius={item.radius}
                subdued={
                  node.entity.kind === "oort_cloud" && item.detail === "context"
                }
              />
            ) : node.entity.kind === "star_system" ? null : (
              <SphericalBody
                nodeId={item.id}
                model={model}
                assets={assets}
                radius={item.radius}
                preview={item.detail === "preview" || item.detail === "context"}
                reducedMotion={reducedMotion}
              />
            )}
            {item.detail === "child" && item.orbitRadius && (
              <Line
                points={orbitalPathPoints(item.orbitRadius)}
                position={[-item.position[0], -item.position[1], 0]}
                color="#527a9b"
                transparent
                opacity={0.42}
                raycast={() => undefined}
              />
            )}
            {labelIds.has(item.id) && (
              <Html
                center
                position={[0, item.radius + 0.24, 0]}
                style={{ pointerEvents: item.interactive ? "auto" : "none" }}
              >
                {item.interactive ? (
                  <button
                    className={`system-object-label ${selectedId === item.id ? "selected" : ""} ${keyboardFocusedId === item.id ? "keyboard-focused" : ""} ${activeCount > 0 ? "active" : ""}`}
                    onClick={() => onSelect(item.id)}
                    onFocus={() => onKeyboardFocusChange(item.id)}
                    onBlur={() => onKeyboardFocusChange(null)}
                  >
                    {String(node.entity.name)}
                    {activeCount > 1
                      ? ` · ${activeCount} active`
                      : activeCount
                        ? " · active"
                        : ""}
                  </button>
                ) : (
                  <span
                    className={`system-object-label ${selectedId === item.id ? "selected" : ""} ${keyboardFocusedId === item.id ? "keyboard-focused" : ""} ${activeCount > 0 ? "active" : ""}`}
                  >
                    {String(node.entity.name)}
                    {activeCount > 1
                      ? ` · ${activeCount} active`
                      : activeCount
                        ? " · active"
                        : ""}
                  </span>
                )}
              </Html>
            )}
            {selectedId === item.id && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[item.radius * 1.45, 0.015, 6, 48]} />
                <meshBasicMaterial color={new Color("#7de9ff")} />
              </mesh>
            )}
            {activeCount > 0 && (
              <>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[item.radius * 1.65, 0.02, 6, 48]} />
                  <meshBasicMaterial color={new Color("#8cebd4")} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[item.radius * 1.9, 0.008, 6, 48]} />
                  <meshBasicMaterial color={new Color("#8cebd4")} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
