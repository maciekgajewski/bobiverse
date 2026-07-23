import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BackSide,
  ClampToEdgeWrapping,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
} from "three";
import galacticStarfieldTexture from "../assets/galactic-starfield.avif";
import { backdropPositionForCamera } from "../domain/galactic-starfield";

const BACKDROP_RADIUS = 100;
const BACKDROP_OPACITY = 0.22;
const ignoreRaycast = () => undefined;

const VERTEX_SHADER = `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  varying vec3 vDirection;
  #include <common>

  void main() {
    float longitude = atan(-vDirection.z, vDirection.x);
    float latitude = asin(clamp(vDirection.y, -1.0, 1.0));
    float u = fract(0.5 - longitude / (2.0 * PI));
    float v = 0.5 - latitude / PI;
    vec4 texel = texture2D(uTexture, vec2(u, v));
    gl_FragColor = vec4(texel.rgb, texel.a * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** A camera-centred, fixed-Galactic-frame decorative sky; it is never pickable. */
export function GalacticStarfield() {
  const starfield = useLoader(TextureLoader, galacticStarfieldTexture);
  const dome = useRef<Group>(null);
  const configuredStarfield = useMemo(() => {
    const texture = starfield.clone();
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  }, [starfield]);

  useEffect(() => {
    return () => configuredStarfield.dispose();
  }, [configuredStarfield]);

  useFrame(({ camera }) => {
    const position = backdropPositionForCamera(camera.position);
    dome.current?.position.set(position.x, position.y, position.z);
  });

  return (
    <group ref={dome} renderOrder={-1000} raycast={ignoreRaycast}>
      <mesh renderOrder={-1000} raycast={ignoreRaycast}>
        <sphereGeometry args={[BACKDROP_RADIUS, 64, 32]} />
        <shaderMaterial
          transparent
          depthTest={false}
          depthWrite={false}
          side={BackSide}
          uniforms={{
            uTexture: { value: configuredStarfield },
            uOpacity: { value: BACKDROP_OPACITY },
          }}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
        />
      </mesh>
    </group>
  );
}
