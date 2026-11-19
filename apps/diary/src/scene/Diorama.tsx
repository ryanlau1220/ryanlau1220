import { Float, Html, useTexture } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { type DiaryEntry, formatEntryDate } from "../lib/diary";
import { GlowSparkles } from "./GlowSparkles";

const GROUND_RADIUS = 1.35;
const GROUND_Y = 0.16;

interface DioramaProps {
  active: boolean;
  entries: DiaryEntry[];
  /** Entries hidden by the current search or tag; drawn faded and not selectable. */
  dimmedIds: Set<string>;
  selectedId: string | null;
  low: boolean;
  reducedMotion: boolean;
  /** Drag yaw, written by the experience's pointer handlers. */
  yaw: { current: number };
  onSelect: (entry: DiaryEntry) => void;
}

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

function Ground() {
  const geometry = useMemo(() => {
    const shape = new THREE.CircleGeometry(GROUND_RADIUS, 96, 0, Math.PI * 2);
    const rand = seeded(42);
    const position = shape.attributes.position as THREE.BufferAttribute;
    for (let index = 1; index < position.count; index++) {
      const x = position.getX(index);
      const y = position.getY(index);
      const wobble = 1 + (rand() - 0.5) * 0.06;
      position.setXY(index, x * wobble, y * wobble);
    }
    shape.rotateX(-Math.PI / 2);
    return shape;
  }, []);
  return (
    <group position={[0, GROUND_Y, 0]}>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#5d7d3a" roughness={1} />
      </mesh>
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[GROUND_RADIUS * 0.99, GROUND_RADIUS * 0.9, 0.08, 64, 1, true]} />
        <meshStandardMaterial color="#5a3a20" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* A winding stone path toward the cottage */}
      {Array.from({ length: 11 }, (_, index) => {
        const t = index / 10;
        const x = Math.sin(t * 3.2) * 0.32;
        const z = 1.05 - t * 1.25;
        return (
          <mesh key={index} position={[x, 0.006, z]} rotation={[0, t * 2, 0]} receiveShadow>
            <cylinderGeometry args={[0.06 + (index % 3) * 0.012, 0.07, 0.012, 7]} />
            <meshStandardMaterial color="#cbb68e" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function Tree({
  position,
  scale,
  tint,
  sway,
}: {
  position: [number, number, number];
  scale: number;
  tint: string;
  sway: number;
}) {
  const crown = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (crown.current) crown.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + sway) * 0.035;
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.04, 0.32, 6]} />
        <meshStandardMaterial color="#5b3a22" roughness={1} />
      </mesh>
      <group ref={crown} position={[0, 0.3, 0]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <icosahedronGeometry args={[0.17, 0]} />
          <meshStandardMaterial color={tint} roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0.08, 0.2, 0.02]} castShadow>
          <icosahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial color={tint} roughness={0.85} flatShading />
        </mesh>
        <mesh position={[-0.07, 0.24, -0.03]} castShadow>
          <icosahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color={tint} roughness={0.85} flatShading />
        </mesh>
      </group>
    </group>
  );
}

function Cottage() {
  const glow = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (glow.current)
      glow.current.intensity =
        0.9 + Math.sin(clock.elapsedTime * 7) * 0.08 + Math.sin(clock.elapsedTime * 13) * 0.05;
  });
  return (
    <group position={[0.05, GROUND_Y, -0.55]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.28, 0.32]} />
        <meshStandardMaterial color="#e9d6b0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.38, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.36, 0.26, 4]} />
        <meshStandardMaterial color="#8c3b24" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0.12, 0.44, 0.04]} castShadow>
        <boxGeometry args={[0.06, 0.16, 0.06]} />
        <meshStandardMaterial color="#6d4c35" roughness={1} />
      </mesh>
      {/* Warm windows and door */}
      {[
        [-0.11, 0.15, 0.161],
        [0.11, 0.15, 0.161],
      ].map((position) => (
        <mesh key={position[0]} position={position as [number, number, number]}>
          <planeGeometry args={[0.07, 0.07]} />
          <meshStandardMaterial
            color="#ffcf7a"
            emissive="#ffb347"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.07, 0.161]}>
        <planeGeometry args={[0.07, 0.13]} />
        <meshStandardMaterial color="#5b3720" roughness={1} />
      </mesh>
      <pointLight
        ref={glow}
        position={[0, 0.16, 0.3]}
        color="#ffb860"
        distance={1.4}
        decay={2}
        intensity={0.9}
      />
    </group>
  );
}

function Mushroom({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.012, 0.016, 0.06, 6]} />
        <meshStandardMaterial color="#f3e8d0" />
      </mesh>
      <mesh position={[0, 0.065, 0]}>
        <sphereGeometry args={[0.04, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e2574c" emissive="#ff6f61" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/** Where the n-th memory stands: around the meadow, starting front-right. */
export function memoryPosition(index: number, total: number): [number, number, number] {
  if (total === 1) return [0.42, GROUND_Y, 0.42];
  const angle = -0.9 + (index / Math.max(1, total)) * Math.PI * 2;
  const radius = 0.78 + (index % 2) * 0.18;
  return [Math.cos(angle) * radius, GROUND_Y, Math.sin(angle) * radius];
}

function PhotoCard({
  url,
  width,
  height,
  offset,
  tilt,
  highlight,
}: {
  url: string;
  width: number;
  height: number;
  offset: [number, number, number];
  tilt: number;
  highlight: boolean;
}) {
  const texture = useTexture(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  const aspect = width / height;
  const photoHeight = aspect >= 1 ? 0.26 / aspect : 0.32;
  const photoWidth = photoHeight * aspect;
  return (
    <group position={offset} rotation={[0, 0, tilt]}>
      <mesh position={[0, -0.02, -0.002]} castShadow>
        <planeGeometry args={[photoWidth + 0.04, photoHeight + 0.09]} />
        <meshStandardMaterial
          color="#fffaf0"
          emissive="#ffd9a0"
          emissiveIntensity={highlight ? 0.55 : 0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.005, 0]}>
        <planeGeometry args={[photoWidth, photoHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Letter({ highlight }: { highlight: boolean }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.2, 0.01]} />
        <meshStandardMaterial
          color="#f1e2c0"
          emissive="#ffd9a0"
          emissiveIntensity={highlight ? 0.5 : 0.1}
        />
      </mesh>
      <mesh position={[0, 0, 0.008]}>
        <circleGeometry args={[0.035, 20]} />
        <meshStandardMaterial color="#9b2c1f" roughness={0.4} />
      </mesh>
    </group>
  );
}

function Memory({
  entry,
  position,
  dimmed,
  selected,
  reducedMotion,
  showTag,
  onSelect,
}: {
  showTag: boolean;
  entry: DiaryEntry;
  position: [number, number, number];
  dimmed: boolean;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: (entry: DiaryEntry) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const holder = useRef<THREE.Group>(null);
  const highlight = (hovered || selected) && !dimmed;

  useFrame(() => {
    const group = holder.current;
    if (!group) return;
    const target = dimmed ? 0.55 : highlight ? 1.12 : 1;
    group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, target, 0.12));
  });

  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!dimmed) onSelect(entry);
  };
  const photos = entry.photos.slice(0, 3);

  return (
    <group position={position}>
      {/* Lantern post marking the memory */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.016, 0.32, 6]} />
        <meshStandardMaterial color="#3b2a1c" />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial
          color="#ffdf9e"
          emissive="#ffb347"
          emissiveIntensity={dimmed ? 0.3 : 4}
          toneMapped={false}
        />
      </mesh>
      {/* Always mounted: changing the number of lights would recompile every shader mid-flight. */}
      <pointLight
        position={[0, 0.36, 0.05]}
        color="#ffc070"
        distance={0.9}
        intensity={dimmed ? 0 : 0.6}
      />

      <Float
        speed={reducedMotion || dimmed ? 0 : 1.6}
        rotationIntensity={0.25}
        floatIntensity={0.5}
        floatingRange={[0.02, 0.09]}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a three.js object; its label button is the keyboard path. */}
        <group
          ref={holder}
          position={[0, 0.72, 0]}
          onClick={select}
          onPointerOver={(event) => {
            event.stopPropagation();
            if (dimmed) return;
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "";
          }}
        >
          {photos.length > 0 ? (
            <Suspense fallback={<Letter highlight={highlight} />}>
              {photos.map((photo, index) => (
                <PhotoCard
                  key={photo.id}
                  url={photo.url}
                  width={photo.width}
                  height={photo.height}
                  offset={[(index - (photos.length - 1) / 2) * 0.16, index * 0.02, -index * 0.03]}
                  tilt={(index - (photos.length - 1) / 2) * -0.18}
                  highlight={highlight}
                />
              ))}
            </Suspense>
          ) : (
            <Letter highlight={highlight} />
          )}
          {/* Generous invisible hit area so the memory is easy to tap on phones. */}
          <mesh visible={false}>
            <boxGeometry args={[0.5, 0.5, 0.2]} />
          </mesh>
        </group>
      </Float>

      {showTag ? (
        <Html position={[0, 0.02, 0.12]} center distanceFactor={2.4} zIndexRange={[10, 0]}>
          <button
            type="button"
            className="memory-tag"
            data-dimmed={dimmed}
            tabIndex={dimmed ? -1 : 0}
            onClick={() => !dimmed && onSelect(entry)}
          >
            <span className="memory-tag-date">{formatEntryDate(entry.entryDate)}</span>
            <span className="memory-tag-title">{entry.title}</span>
          </button>
        </Html>
      ) : null}
    </group>
  );
}

export function Diorama({
  active,
  entries,
  dimmedIds,
  selectedId,
  low,
  reducedMotion,
  yaw,
  onSelect,
}: DioramaProps) {
  const root = useRef<THREE.Group>(null);
  const grow = useRef({ value: 0 });
  const [settled, setSettled] = useState(false);

  useLayoutEffect(() => {
    const state = grow.current;
    setSettled(false);
    const tween = gsap.to(state, {
      value: active ? 1 : 0,
      duration: reducedMotion ? 0.01 : active ? 2.4 : 1.1,
      delay: active && !reducedMotion ? 0.9 : 0,
      ease: active ? "elastic.out(1, 0.75)" : "power2.in",
      onUpdate: () => {
        if (active && state.value > 0.92) setSettled(true);
      },
    });
    return () => {
      tween.kill();
    };
  }, [active, reducedMotion]);

  useFrame(() => {
    const group = root.current;
    if (!group) return;
    // Kept in the scene (tiny) while hidden so its shaders compile before the camera arrives.
    const value = Math.max(grow.current.value, 0.0001);
    group.scale.set(value, value, value);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, yaw.current, 0.08);
  });

  const trees = useMemo(() => {
    const rand = seeded(9);
    const tints = ["#4f7a35", "#3f6b2e", "#6f8f3a", "#c08a2e", "#8fa846"];
    return Array.from({ length: low ? 9 : 14 }, (_, index) => {
      const angle = rand() * Math.PI * 2;
      const radius = 0.55 + rand() * 0.7;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Keep the front of the meadow open for the memories and the path.
      const blocked = z > 0.15 && Math.abs(x) < 0.75;
      return blocked
        ? null
        : {
            position: [x, GROUND_Y, z] as [number, number, number],
            scale: 0.7 + rand() * 0.7,
            tint: tints[index % tints.length],
            sway: rand() * 10,
          };
    }).filter((tree) => tree !== null);
  }, [low]);

  return (
    <group ref={root}>
      <Ground />
      <Cottage />
      {trees.map((tree, index) => (
        <Tree key={index} {...tree} />
      ))}
      <Mushroom position={[-0.35, GROUND_Y, 0.55]} />
      <Mushroom position={[-0.28, GROUND_Y, 0.62]} scale={0.7} />
      <Mushroom position={[0.75, GROUND_Y, -0.1]} scale={0.8} />
      <Mushroom position={[-0.8, GROUND_Y, -0.25]} scale={1.1} />
      {entries.map((entry, index) => (
        <Memory
          key={entry.id}
          entry={entry}
          position={memoryPosition(index, entries.length)}
          dimmed={dimmedIds.has(entry.id)}
          selected={entry.id === selectedId}
          reducedMotion={reducedMotion}
          showTag={settled}
          onSelect={onSelect}
        />
      ))}
      <GlowSparkles
        count={low ? 30 : 70}
        scale={[2.4, 1.2, 2.4]}
        position={[0, 0.75, 0]}
        size={3.2}
        speed={reducedMotion ? 0 : 0.35}
        color="#ffd27a"
        opacity={0.9}
      />
    </group>
  );
}
