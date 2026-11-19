import { Html } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Phase } from "./phase";
import { createLeatherCover, createPageEdgeTexture, createPaperTexture } from "./textures";

export const PAGE = { width: 1.5, depth: 2.1, block: 0.09 } as const;
const COVER = { width: 1.56, depth: 2.18, thickness: 0.035 } as const;
const HINGE_Y = COVER.thickness + PAGE.block; // top of the right-hand page block

export interface ChapterSummary {
  year: string;
  count: number;
}

interface BookProps {
  phase: Phase;
  chapters: ChapterSummary[];
  fontsReady: boolean;
  reducedMotion: boolean;
  onOpen: () => void;
  onSelectChapter: (year: string) => void;
  /** Incremented to riffle a few pages, e.g. when entering a chapter. */
  flutter: number;
}

/** A sheet that turns around the spine and curls like paper while it travels. */
function TurningSheet({
  progress,
  index,
  paper,
}: {
  progress: { value: number };
  index: number;
  paper: THREE.Texture;
}) {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(PAGE.width, PAGE.depth, 28, 1);
    plane.rotateX(-Math.PI / 2);
    plane.translate(PAGE.width / 2, 0, 0);
    plane.userData.base = Float32Array.from(plane.attributes.position.array);
    return plane;
  }, []);

  useFrame(() => {
    const p = THREE.MathUtils.clamp(progress.value - index * 0.12, 0, 1);
    const eased = p * p * (3 - 2 * p);
    const theta = eased * Math.PI;
    const k = (-1.6 * Math.sin(eased * Math.PI)) / PAGE.width;
    const base = geometry.userData.base as Float32Array;
    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let vertex = 0; vertex < position.count; vertex++) {
      const s = base[vertex * 3];
      let x: number;
      let y: number;
      if (Math.abs(k) < 1e-4) {
        x = Math.cos(theta) * s;
        y = Math.sin(theta) * s;
      } else {
        x = (Math.sin(theta + k * s) - Math.sin(theta)) / k;
        y = (Math.cos(theta) - Math.cos(theta + k * s)) / k;
      }
      position.setXYZ(vertex, x, y + 0.002 * (3 - index), base[vertex * 3 + 2]);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh geometry={geometry} position={[0, HINGE_Y + 0.003, 0]} castShadow>
      <meshStandardMaterial map={paper} side={THREE.DoubleSide} roughness={0.9} />
    </mesh>
  );
}

export function Book({
  phase,
  chapters,
  fontsReady,
  reducedMotion,
  onOpen,
  onSelectChapter,
  flutter,
}: BookProps) {
  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const leftPaper = useRef<THREE.MeshStandardMaterial>(null);
  const motion = useRef({ open: 0, slide: 0, riffle: 0 });
  const [hovered, setHovered] = useState(false);
  const [showContents, setShowContents] = useState(false);

  const textures = useMemo(() => {
    const paper = createPaperTexture(true);
    const plain = createPaperTexture(false);
    const edge = createPageEdgeTexture();
    return { paper, plain, edge };
  }, []);

  // The cover title needs the web fonts; redraw once they are ready.
  const coverTexture = useMemo(
    () => (fontsReady ? createLeatherCover("My Diary", "Ryan Lau") : createLeatherCover("", "")),
    [fontsReady],
  );
  useEffect(() => () => coverTexture.dispose(), [coverTexture]);

  const isOpen = phase !== "cover";

  useLayoutEffect(() => {
    const state = motion.current;
    const duration = reducedMotion ? 0.01 : 2.2;
    const tween = gsap.to(state, {
      open: isOpen ? 1 : 0,
      slide: isOpen ? 1 : 0,
      duration,
      ease: "power3.inOut",
      onUpdate: () => {
        if (state.open > 0.85 && isOpen) setShowContents(phase === "open");
      },
    });
    if (!isOpen || phase !== "open") setShowContents(false);
    return () => {
      tween.kill();
    };
  }, [isOpen, phase, reducedMotion]);

  useEffect(() => {
    if (flutter === 0 || reducedMotion) return;
    const state = motion.current;
    state.riffle = 0;
    const tween = gsap.to(state, { riffle: 1.4, duration: 1.6, ease: "power2.inOut" });
    return () => {
      tween.kill();
    };
  }, [flutter, reducedMotion]);

  useFrame((frame) => {
    const state = motion.current;
    if (hinge.current) hinge.current.rotation.z = state.open * Math.PI;
    if (root.current) {
      root.current.position.x = THREE.MathUtils.lerp(-COVER.width / 2, 0, state.slide);
      root.current.rotation.y = THREE.MathUtils.lerp(0.14, 0, state.slide);
      const lift = !isOpen && hovered ? 0.04 + Math.sin(frame.clock.elapsedTime * 2.4) * 0.01 : 0;
      root.current.position.y = THREE.MathUtils.lerp(root.current.position.y, lift, 0.1);
    }
    if (leftPaper.current)
      leftPaper.current.opacity = THREE.MathUtils.smoothstep(state.open, 0.7, 1);
  });

  const pageSides = [
    textures.edge,
    textures.edge,
    textures.plain,
    textures.plain,
    textures.edge,
    textures.edge,
  ];
  const coverMaterials = useMemo(() => {
    const leather = new THREE.MeshStandardMaterial({
      color: "#4f150f",
      roughness: 0.62,
      metalness: 0.05,
    });
    const front = new THREE.MeshStandardMaterial({
      map: coverTexture,
      roughness: 0.55,
      metalness: 0.15,
    });
    const inside = new THREE.MeshStandardMaterial({ color: "#7c2a1d", roughness: 0.8 });
    return [leather, leather, front, inside, leather, leather];
  }, [coverTexture]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (phase !== "cover") return;
    event.stopPropagation();
    onOpen();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a three.js object; the "Open the diary" button is the keyboard path.
    <group
      ref={root}
      onClick={handleClick}
      onPointerOver={() => {
        if (phase === "cover") {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      {/* Back cover */}
      <mesh position={[COVER.width / 2, COVER.thickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[COVER.width, COVER.thickness, COVER.depth]} />
        <meshStandardMaterial color="#4f150f" roughness={0.62} />
      </mesh>
      {/* Spine */}
      <mesh position={[-0.02, HINGE_Y / 2 + 0.01, 0]} castShadow>
        <boxGeometry args={[0.05, HINGE_Y + 0.03, COVER.depth]} />
        <meshStandardMaterial color="#45120c" roughness={0.6} />
      </mesh>
      {/* Right-hand pages */}
      <mesh
        position={[PAGE.width / 2 + 0.02, COVER.thickness + PAGE.block / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[PAGE.width, PAGE.block, PAGE.depth]} />
        {pageSides.map((map, index) => (
          <meshStandardMaterial
            key={index}
            attach={`material-${index}`}
            map={map}
            roughness={0.95}
          />
        ))}
      </mesh>
      <mesh
        position={[PAGE.width / 2 + 0.02, HINGE_Y + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[PAGE.width, PAGE.depth]} />
        <meshStandardMaterial map={textures.paper} roughness={0.95} />
      </mesh>

      {/* Front cover and left-hand pages swing together around the spine. */}
      <group ref={hinge} position={[0, HINGE_Y, 0]}>
        <mesh position={[PAGE.width / 2 + 0.02, PAGE.block / 2, 0]} castShadow>
          <boxGeometry args={[PAGE.width, PAGE.block, PAGE.depth]} />
          {pageSides.map((map, index) => (
            <meshStandardMaterial
              key={index}
              attach={`material-${index}`}
              map={map}
              roughness={0.95}
            />
          ))}
        </mesh>
        <mesh position={[PAGE.width / 2 + 0.02, -0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[PAGE.width, PAGE.depth]} />
          <meshStandardMaterial ref={leftPaper} map={textures.paper} transparent roughness={0.95} />
        </mesh>
        <mesh
          position={[COVER.width / 2, PAGE.block + COVER.thickness / 2, 0]}
          material={coverMaterials}
          castShadow
        >
          <boxGeometry args={[COVER.width, COVER.thickness, COVER.depth]} />
        </mesh>
      </group>

      {[0, 1, 2].map((index) => (
        <TurningSheet
          key={index}
          index={index}
          progress={riffleProxy(motion.current)}
          paper={textures.plain}
        />
      ))}

      {showContents ? (
        <Html
          transform
          position={[-PAGE.width / 2 - 0.02, HINGE_Y + 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={0.105}
          zIndexRange={[20, 0]}
        >
          <nav className="book-contents" aria-label="Chapters">
            <p className="book-contents-title">Contents</p>
            <ol>
              {chapters.map((chapter) => (
                <li key={chapter.year}>
                  <button type="button" onClick={() => onSelectChapter(chapter.year)}>
                    <span>Chapter {chapter.year}</span>
                    <span className="book-contents-dots" aria-hidden="true" />
                    <span>
                      {chapter.count} {chapter.count === 1 ? "memory" : "memories"}
                    </span>
                  </button>
                </li>
              ))}
              {chapters.length === 0 ? (
                <li className="book-contents-empty">The pages are still blank.</li>
              ) : null}
            </ol>
          </nav>
        </Html>
      ) : null}
      {showContents ? (
        <Html
          transform
          position={[PAGE.width / 2 + 0.02, HINGE_Y + 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={0.105}
          zIndexRange={[20, 0]}
        >
          <div className="book-preface">
            <p>Dear reader,</p>
            <p>
              these pages hold the places I went, the people I learned from, and the little moments
              I did not want to forget.
            </p>
            <p>Choose a chapter, and step inside.</p>
            <p className="book-preface-sign">— Ryan</p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

/** The sheets read `value`; the shared motion object stores it as `riffle`. */
function riffleProxy(state: { riffle: number }) {
  return {
    get value() {
      return state.riffle;
    },
  };
}
