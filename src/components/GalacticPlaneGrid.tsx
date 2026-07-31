import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DoubleSide, ShaderMaterial, Vector3 } from "three";
import {
  GALACTIC_GRID_FADE_END,
  GALACTIC_GRID_FADE_START,
  GALACTIC_GRID_AXIS_STRENGTH,
  GALACTIC_GRID_GRAZING_FADE_END,
  GALACTIC_GRID_GRAZING_FADE_START,
  GALACTIC_GRID_LINE_STRENGTH,
} from "../domain/galactic-plane-grid";

const GRID_SIZE = 128;

/** The plane remains visible when the reader orbits to either Galactic hemisphere. */
export const GALACTIC_GRID_MATERIAL_SIDE = DoubleSide;

const VERTEX_SHADER = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uCameraPosition;
  uniform float uModeOpacity;
  varying vec3 vWorldPosition;
  #include <common>

  void main() {
    vec2 gridDistance = abs(fract(vWorldPosition.xz - 0.5) - 0.5) /
      fwidth(vWorldPosition.xz);
    float gridLine = 1.0 - min(min(gridDistance.x, gridDistance.y), 1.0);
    float axisWidth = max(fwidth(vWorldPosition.x), fwidth(vWorldPosition.z)) * 1.5;
    float axisLine = 1.0 - smoothstep(0.0, axisWidth, min(abs(vWorldPosition.x), abs(vWorldPosition.z)));
    float planarDistance = length(vWorldPosition.xz - uCameraPosition.xz);
    float fadeProgress = clamp((planarDistance - ${GALACTIC_GRID_FADE_START.toFixed(1)}) / ${(
      GALACTIC_GRID_FADE_END - GALACTIC_GRID_FADE_START
    ).toFixed(1)}, 0.0, 1.0);
    float fade = 1.0 - fadeProgress * fadeProgress * (3.0 - 2.0 * fadeProgress);
    float grazing = smoothstep(
      ${GALACTIC_GRID_GRAZING_FADE_START.toFixed(2)},
      ${GALACTIC_GRID_GRAZING_FADE_END.toFixed(2)},
      abs(normalize(uCameraPosition - vWorldPosition).y)
    );
    float line = max(
      gridLine * ${GALACTIC_GRID_LINE_STRENGTH.toFixed(2)},
      axisLine * ${GALACTIC_GRID_AXIS_STRENGTH.toFixed(2)}
    );
    vec3 color = mix(vec3(0.039, 0.078, 0.137), vec3(0.082, 0.157, 0.263), axisLine);
    gl_FragColor = vec4(color, line * fade * grazing * uModeOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** A non-pickable one-unit Galactic-plane grid that fades away from the camera. */
export function GalacticPlaneGrid({ opacity = 1 }: { opacity?: number }) {
  const material = useRef<ShaderMaterial>(null);

  useFrame(({ camera }) => {
    material.current?.uniforms.uCameraPosition?.value.copy(camera.position);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => undefined}>
      <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        side={GALACTIC_GRID_MATERIAL_SIDE}
        uniforms={{
          uCameraPosition: { value: new Vector3() },
          uModeOpacity: { value: opacity },
        }}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
      />
    </mesh>
  );
}
