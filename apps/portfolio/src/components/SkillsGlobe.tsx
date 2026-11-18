import { ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SKILL_CATEGORIES, TECHNOLOGY_CATEGORIES } from "../data/registry";

const COLORS = [
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef6f91",
  "#0ea5e9",
  "#84cc16",
  "#a78bfa",
  "#f97316",
  "#14b8a6",
  "#ec4899",
];
const skills = SKILL_CATEGORIES.flatMap((category, categoryIndex) =>
  Object.entries(TECHNOLOGY_CATEGORIES)
    .filter(([, domain]) => domain === category)
    .map(([name]) => ({ name, category, color: COLORS[categoryIndex % COLORS.length] })),
);
const points = skills.map((skill, index) => {
  const y = 1 - (index + 0.5) * (2 / skills.length);
  const radius = Math.sqrt(1 - y * y);
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  return {
    ...skill,
    position: new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius),
  };
});

// Find a view that brings the largest concentration of this domain toward the camera.
function domainView(category: string) {
  const domainPoints = points.filter((point) => point.category === category);
  let best = { x: -0.12, y: 0, score: -1 };
  for (let pitch = -7; pitch <= 7; pitch++) {
    const x = pitch * 0.2;
    for (let longitude = 0; longitude < 48; longitude++) {
      const y = (longitude * Math.PI * 2) / 48;
      const score = domainPoints.reduce((total, point) => {
        const depth =
          Math.sin(x) * point.position.y +
          Math.cos(x) * (-Math.sin(y) * point.position.x + Math.cos(y) * point.position.z);
        return total + Math.max(0, depth - 0.4);
      }, 0);
      if (score > best.score) best = { x, y, score };
    }
  }
  return { x: best.x, y: best.y };
}

type Props = {
  selectedSkill: string | null;
  onSelectSkill: (skill: string | null) => void;
  onShowList: () => void;
};

export default function SkillsGlobe({ selectedSkill, onSelectSkill, onShowList }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedRef = useRef(selectedSkill);
  const categoryRef = useRef("All domains");
  const rotationRef = useRef({ x: -0.12, y: 0 });
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const focusRef = useRef<{ x: number; y: number } | null>(null);
  const swayRef = useRef(0);
  const zoomRef = useRef(3.3);
  const pausedUntilRef = useRef(0);
  const draggedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [category, setCategory] = useState("All domains");
  const [failed, setFailed] = useState(false);
  selectedRef.current = selectedSkill;
  categoryRef.current = category;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    mount.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    const globe = new THREE.Group();
    scene.add(globe);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.18,
    });
    const rings: THREE.BufferGeometry[] = [];
    for (let i = -4; i <= 4; i++) {
      const latitude = (i * Math.PI) / 10;
      const ring = new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 97 }, (_, j) => {
          const a = (j * Math.PI * 2) / 96;
          return new THREE.Vector3(
            Math.cos(a) * Math.cos(latitude),
            Math.sin(latitude),
            Math.sin(a) * Math.cos(latitude),
          );
        }),
      );
      rings.push(ring);
      globe.add(new THREE.Line(ring, lineMaterial));
    }
    for (let i = 0; i < 8; i++) {
      const longitude = (i * Math.PI) / 8;
      const ring = new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 97 }, (_, j) => {
          const a = (j * Math.PI * 2) / 96;
          return new THREE.Vector3(
            Math.cos(a) * Math.cos(longitude),
            Math.sin(a),
            Math.cos(a) * Math.sin(longitude),
          );
        }),
      );
      rings.push(ring);
      globe.add(new THREE.Line(ring, lineMaterial));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map((point) => point.position),
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        points.flatMap((point) => {
          const c = new THREE.Color(point.color);
          return [c.r, c.g, c.b];
        }),
        3,
      ),
    );
    const material = new THREE.PointsMaterial({
      size: 0.018,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    globe.add(new THREE.Points(geometry, material));
    let frame = 0;
    let visible = true;
    let last = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    observer.observe(mount);
    const projected = new THREE.Vector3();
    const world = new THREE.Vector3();
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden) {
        last = time;
        return;
      }
      const delta = Math.min((time - (last || time)) / 1000, 0.05);
      last = time;
      if (!selectedRef.current && !dragRef.current && targetRef.current) {
        const target = targetRef.current;
        const progress = 1 - Math.exp(-delta * 6);
        rotationRef.current.x += (target.x - rotationRef.current.x) * progress;
        rotationRef.current.y += (target.y - rotationRef.current.y) * progress;
        if (
          Math.abs(target.x - rotationRef.current.x) + Math.abs(target.y - rotationRef.current.y) <
          0.002
        ) {
          rotationRef.current = { ...target };
          targetRef.current = null;
        }
      } else if (!selectedRef.current && !dragRef.current && time > pausedUntilRef.current) {
        if (focusRef.current) {
          swayRef.current += delta * 0.22;
          rotationRef.current.y = focusRef.current.y + Math.sin(swayRef.current) * 0.25;
        } else {
          rotationRef.current.y += delta * 0.12;
        }
      }
      globe.rotation.set(rotationRef.current.x, rotationRef.current.y, 0);
      const width = mount.clientWidth,
        height = mount.clientHeight;
      camera.position.z = zoomRef.current * Math.max(1, (height / width) * 0.95);
      if (!width || !height) return;
      if (
        renderer.domElement.width !== Math.floor(width * renderer.getPixelRatio()) ||
        renderer.domElement.height !== Math.floor(height * renderer.getPixelRatio())
      ) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      camera.updateMatrixWorld();
      globe.updateMatrixWorld();
      // Balance labels across the projected surface, prioritizing points facing the camera.
      const regions: { index: number; x: number; y: number; w: number; depth: number }[][] =
        Array.from({ length: 12 }, () => []);
      points.forEach((point, index) => {
        const button = labelRefs.current[index];
        if (!button) return;
        world.copy(point.position).applyMatrix4(globe.matrixWorld);
        projected.copy(world).project(camera);
        const x = ((projected.x + 1) * width) / 2;
        const y = ((1 - projected.y) * height) / 2;
        const textWidth = Math.min(150, point.name.length * 6.2 + 20);
        if (
          world.z <= 1 / camera.position.z ||
          x <= textWidth / 2 ||
          x >= width - textWidth / 2 ||
          y <= 25 ||
          y >= height - 25 ||
          (categoryRef.current !== "All domains" && point.category !== categoryRef.current)
        )
          return;
        const column = Math.min(3, Math.floor((x / width) * 4));
        const row = Math.min(2, Math.floor((y / height) * 3));
        regions[row * 4 + column].push({ index, x, y, w: textWidth, depth: world.z });
      });
      regions.forEach((region) => {
        region.sort((a, b) => b.depth - a.depth);
      });
      const shown = new Set<number>();
      const occupied: { x: number; y: number; w: number }[] = [];
      const limit = width < 500 ? 12 : 22;
      let remaining = true;
      while (occupied.length < limit && remaining) {
        remaining = false;
        for (const region of regions) {
          while (region.length > 0) {
            const candidate = region.shift();
            if (!candidate) break;
            remaining = true;
            if (
              occupied.some(
                (other) =>
                  Math.abs(other.y - candidate.y) < 25 &&
                  Math.abs(other.x - candidate.x) < (other.w + candidate.w) / 2,
              )
            )
              continue;
            const button = labelRefs.current[candidate.index];
            if (!button) continue;
            occupied.push(candidate);
            shown.add(candidate.index);
            button.style.transform = `translate(${candidate.x}px, ${candidate.y}px) translate(-50%, -50%)`;
            button.style.visibility = "visible";
            break;
          }
          if (occupied.length >= limit) break;
        }
      }
      labelRefs.current.forEach((button, index) => {
        if (button && !shown.has(index)) button.style.visibility = "hidden";
      });
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      geometry.dispose();
      material.dispose();
      rings.forEach((ring) => {
        ring.dispose();
      });
      lineMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const pause = () => {
    pausedUntilRef.current = performance.now() + 4000;
  };
  const focusDomain = (domain: string) => {
    const destination = domain === "All domains" ? { x: -0.12, y: 0 } : domainView(domain);
    const currentY = rotationRef.current.y;
    const y =
      currentY + Math.atan2(Math.sin(destination.y - currentY), Math.cos(destination.y - currentY));
    targetRef.current = { x: destination.x, y };
    focusRef.current = domain === "All domains" ? null : { x: destination.x, y };
    swayRef.current = 0;
    pause();
  };
  const finishDrag = () => {
    if (dragRef.current?.moved && categoryRef.current !== "All domains") {
      focusRef.current = { ...rotationRef.current };
      swayRef.current = 0;
    }
    dragRef.current = null;
    pause();
  };
  if (failed)
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-3 text-sm text-neutral-500">
        <p>The skills globe could not be displayed.</p>
        <button
          type="button"
          onClick={onShowList}
          className="text-blue-600 dark:text-blue-400 underline"
        >
          View skills list
        </button>
      </div>
    );
  return (
    <div>
      <div className="mx-auto w-full max-w-[320px] px-3 sm:px-0">
        <label htmlFor="globe-domain" className="sr-only">
          Explore a domain
        </label>
        <div className="relative">
          <Globe2
            aria-hidden="true"
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-blue-600 dark:text-blue-400"
          />
          <select
            id="globe-domain"
            name="domain"
            value={category}
            onChange={(event) => {
              const domain = event.target.value;
              categoryRef.current = domain;
              setCategory(domain);
              focusDomain(domain);
            }}
            className="skill-domain-select w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white/80 py-3 pl-11 pr-10 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-neutral-700 dark:bg-neutral-950/80 dark:text-neutral-100 dark:hover:border-blue-500"
          >
            <option value="All domains">All domains</option>
            {SKILL_CATEGORIES.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
          />
        </div>
      </div>
      <div
        ref={mountRef}
        data-testid="skills-globe"
        className="relative mx-auto h-[400px] w-full max-w-[850px] select-none overflow-hidden sm:h-[540px] cursor-grab active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          targetRef.current = null;
          draggedRef.current = false;
          dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
          pause();
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          const dx = event.clientX - drag.x,
            dy = event.clientY - drag.y;
          if (Math.abs(dx) + Math.abs(dy) > 2) {
            drag.moved = true;
            draggedRef.current = true;
          }
          rotationRef.current.y += dx * 0.008;
          if (event.pointerType !== "touch")
            rotationRef.current.x = Math.max(
              -1.2,
              Math.min(1.2, rotationRef.current.x + dy * 0.008),
            );
          drag.x = event.clientX;
          drag.y = event.clientY;
          pause();
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerLeave={finishDrag}
      >
        {points.map((point, index) => (
          <button
            key={point.name}
            data-domain={point.category}
            ref={(element) => {
              labelRefs.current[index] = element;
            }}
            type="button"
            style={{ visibility: "hidden" }}
            onClick={() => {
              if (draggedRef.current) return;
              pause();
              onSelectSkill(point.name);
            }}
            className="absolute left-0 top-0 z-10 whitespace-nowrap rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[10px] font-medium text-neutral-800 shadow-sm transition-colors hover:border-blue-400 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-100 dark:hover:text-blue-300"
          >
            <span
              className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: point.color }}
            />
            {point.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-500">
        <span>Drag to rotate · Select a skill to explore</span>
        <button
          type="button"
          onClick={() => {
            zoomRef.current = Math.max(2.6, zoomRef.current - 0.3);
            pause();
          }}
          className="rounded border border-neutral-200 px-2 py-1 dark:border-neutral-700"
          aria-label="Zoom in globe"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            zoomRef.current = Math.min(4.5, zoomRef.current + 0.3);
            pause();
          }}
          className="rounded border border-neutral-200 px-2 py-1 dark:border-neutral-700"
          aria-label="Zoom out globe"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            zoomRef.current = 3.3;
            focusDomain(categoryRef.current);
          }}
          className="rounded border border-neutral-200 px-2 py-1 dark:border-neutral-700"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
