import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { DiaryEntry } from "../lib/diary";
import type { SceneQuality } from "../lib/quality";
import { Book, type ChapterSummary } from "./Book";
import { CameraRig } from "./CameraRig";
import { Diorama } from "./Diorama";
import { GlowSparkles } from "./GlowSparkles";
import type { Phase } from "./phase";
import { createWoodTexture } from "./textures";

export interface DiarySceneProps {
  phase: Phase;
  instant: boolean;
  chapters: ChapterSummary[];
  entries: DiaryEntry[];
  dimmedIds: Set<string>;
  selectedId: string | null;
  quality: SceneQuality;
  fontsReady: boolean;
  flutter: number;
  yaw: { current: number };
  onOpen: () => void;
  onSelectChapter: (year: string) => void;
  onSelectEntry: (entry: DiaryEntry) => void;
  onReady: () => void;
}

function Desk() {
  const wood = useMemo(() => createWoodTexture(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[18, 18]} />
      <meshStandardMaterial map={wood} roughness={0.7} metalness={0.05} />
    </mesh>
  );
}

function Candle({ low }: { low: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  const flame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const flicker =
      1 + Math.sin(time * 9) * 0.05 + Math.sin(time * 23) * 0.04 + Math.sin(time * 3.1) * 0.06;
    if (light.current) light.current.intensity = 9 * flicker;
    if (flame.current) {
      flame.current.scale.set(1, flicker, 1);
      flame.current.rotation.z = Math.sin(time * 5) * 0.06;
    }
  });
  return (
    <group position={[-2.35, 0, -1.25]}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.14, 0.64, 24]} />
        <meshStandardMaterial color="#efe2c4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.28, 0.3, 0.04, 32]} />
        <meshStandardMaterial color="#8a6a3a" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh ref={flame} position={[0, 0.74, 0]}>
        <coneGeometry args={[0.035, 0.14, 12]} />
        <meshStandardMaterial
          color="#ffe6a6"
          emissive="#ffb347"
          emissiveIntensity={6}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={light}
        position={[0, 0.95, 0]}
        color="#ffae55"
        distance={9}
        decay={1.6}
        intensity={9}
        castShadow={!low}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.002}
      />
    </group>
  );
}

function Scenery({ low }: { low: boolean }) {
  return (
    <>
      {/* Dried flowers and a scattered keepsake to dress the desk. */}
      <group position={[2.3, 0, -0.9]} rotation={[0, 0.6, 0]}>
        {[0, 1, 2, 3, 4].map((index) => (
          <group key={index} rotation={[0, 0, -0.2 + index * 0.1]}>
            <mesh position={[index * 0.05, 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.006, 0.006, 0.9, 5]} />
              <meshStandardMaterial color="#6b5a2e" />
            </mesh>
            <mesh position={[0.45 + index * 0.05, 0.03, (index - 2) * 0.05]}>
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshStandardMaterial color="#e2b04a" emissive="#a86b14" emissiveIntensity={0.3} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh
        position={[2.1, 0.012, 1.3]}
        rotation={[-Math.PI / 2, 0, 0.35]}
        receiveShadow
        castShadow
      >
        <planeGeometry args={[0.7, 0.5]} />
        <meshStandardMaterial color="#e8d6ae" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <GlowSparkles
        count={low ? 40 : 110}
        scale={[7, 3, 5]}
        position={[0, 1.4, 0]}
        size={2.2}
        speed={0.18}
        color="#ffdca8"
        opacity={0.55}
      />
    </>
  );
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  const sent = useRef(false);
  useFrame(() => {
    if (!sent.current) {
      sent.current = true;
      onReady();
    }
  });
  return null;
}

export default function DiaryScene(props: DiarySceneProps) {
  const { quality } = props;
  return (
    <Canvas
      shadows={!quality.low}
      dpr={quality.low ? [1, 1.5] : [1, 2]}
      camera={{ fov: 38, near: 0.05, far: 60, position: [0.9, 3.6, 4.4] }}
      gl={{ antialias: !quality.low, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        // Only the pixels are decorative; page text and memory labels stay reachable.
        gl.domElement.setAttribute("aria-hidden", "true");
      }}
    >
      <color attach="background" args={["#0b0604"]} />
      <fog attach="fog" args={["#0b0604", 6, 16]} />
      <ambientLight color="#ffd7b0" intensity={0.22} />
      <hemisphereLight color="#ffd9a8" groundColor="#1a0d05" intensity={0.35} />
      {/* Cool moonlight from the window behind the desk, for depth. */}
      <directionalLight position={[3, 5, -4]} color="#9fb4ff" intensity={0.35} />
      <spotLight
        position={[0.4, 5.5, 2.6]}
        angle={0.5}
        penumbra={0.9}
        color="#ffe2b8"
        intensity={22}
        distance={14}
        castShadow={!props.quality.low}
        shadow-mapSize={[1024, 1024]}
      />
      <CameraRig
        phase={props.phase}
        reducedMotion={quality.reducedMotion}
        instant={props.instant}
      />
      <Suspense fallback={null}>
        <Desk />
        <Candle low={quality.low} />
        <Scenery low={quality.low} />
        <Book
          phase={props.phase}
          chapters={props.chapters}
          fontsReady={props.fontsReady}
          reducedMotion={quality.reducedMotion}
          onOpen={props.onOpen}
          onSelectChapter={props.onSelectChapter}
          flutter={props.flutter}
        />
        <Diorama
          active={props.phase === "world"}
          entries={props.entries}
          dimmedIds={props.dimmedIds}
          selectedId={props.selectedId}
          low={quality.low}
          reducedMotion={quality.reducedMotion}
          yaw={props.yaw}
          onSelect={props.onSelectEntry}
        />
        <ReadySignal onReady={props.onReady} />
      </Suspense>
      <EffectComposer multisampling={quality.low ? 0 : 4}>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.85}
          luminanceSmoothing={0.2}
          intensity={quality.low ? 0.7 : 1.1}
        />
        <Noise opacity={0.035} premultiply />
        <Vignette offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
