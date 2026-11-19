import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface GlowSparklesProps {
  count: number;
  /** Size of the box the motes drift in. */
  scale: [number, number, number];
  position?: [number, number, number];
  /** Point size in pixels at a distance of one unit. */
  size?: number;
  speed?: number;
  color?: string;
  opacity?: number;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uScale;
  attribute vec3 aSeed;
  varying float vTwinkle;
  void main() {
    vec3 p = position;
    float t = uTime * (0.4 + aSeed.x * 0.6);
    p.x += sin(t + aSeed.y * 6.283) * 0.08 * uScale.x;
    p.y += sin(t * 0.7 + aSeed.z * 6.283) * 0.06 * uScale.y;
    p.z += cos(t * 0.8 + aSeed.x * 6.283) * 0.08 * uScale.z;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vTwinkle = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed.y * 2.0) + aSeed.z * 20.0);
    gl_PointSize = uSize * uPixelRatio * (0.6 + aSeed.z * 0.8) / -mv.z;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    // Soft core with a clean falloff to exactly zero at the edge of the point.
    float glow = pow(clamp(1.0 - d, 0.0, 1.0), 2.4);
    if (glow <= 0.001) discard;
    gl_FragColor = vec4(uColor * glow * vTwinkle * uOpacity, 1.0);
  }
`;

/** Drifting, twinkling motes of light (dust by the candle, fireflies in the world). */
export function GlowSparkles({
  count,
  scale,
  position,
  size = 3,
  speed = 0.3,
  color = "#ffd27a",
  opacity = 1,
}: GlowSparklesProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      positions[index * 3] = (Math.random() - 0.5) * scale[0];
      positions[index * 3 + 1] = (Math.random() - 0.5) * scale[1];
      positions[index * 3 + 2] = (Math.random() - 0.5) * scale[2];
      seeds[index * 3] = Math.random();
      seeds[index * 3 + 1] = Math.random();
      seeds[index * 3 + 2] = Math.random();
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    result.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    return result;
  }, [count, scale]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: size * 12 },
      uPixelRatio: { value: 1 },
      uScale: { value: new THREE.Vector3(...scale) },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    }),
    [size, scale, color, opacity],
  );

  useFrame((state, delta) => {
    const shader = material.current;
    if (!shader) return;
    shader.uniforms.uTime.value += delta * speed * 3;
    shader.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return (
    <points geometry={geometry} position={position} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
