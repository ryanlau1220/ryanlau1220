import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { Project } from "../data/registry";
import { getProjectPreviewUrl } from "../project-images";

interface ProjectOrbitProps {
  projects: Project[];
  activeIndex: number;
  onSelect: (index: number) => void;
  children: ReactNode;
}

export function ProjectOrbit({ projects, activeIndex, onSelect, children }: ProjectOrbitProps) {
  const orbitRef = useRef<HTMLElement>(null);
  const activeRef = useRef(activeIndex);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  activeRef.current = activeIndex;

  useEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit || projects.length < 2) return;
    let lastWheel = Number.NEGATIVE_INFINITY;
    const onWheel = (event: WheelEvent) => {
      if (
        !window.matchMedia("(min-width: 48rem)").matches ||
        event.ctrlKey ||
        Math.abs(event.deltaY) <= Math.abs(event.deltaX)
      )
        return;
      const next = activeRef.current + (event.deltaY > 0 ? 1 : -1);
      if (next < 0 || next >= projects.length) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheel < 650) return;
      lastWheel = now;
      onSelect(next);
    };
    orbit.addEventListener("wheel", onWheel, { passive: false });
    return () => orbit.removeEventListener("wheel", onWheel);
  }, [projects.length, onSelect]);

  const previous = projects[(activeIndex - 1 + projects.length) % projects.length];
  const next = projects[(activeIndex + 1) % projects.length];

  return (
    <section
      ref={orbitRef}
      className="project-orbit"
      aria-label="Project gallery"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (touch) touchRef.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const start = touchRef.current;
        const touch = event.changedTouches[0];
        touchRef.current = null;
        if (!start || !touch || projects.length < 2) return;
        const x = touch.clientX - start.x;
        const y = touch.clientY - start.y;
        if (Math.abs(x) > 60 && Math.abs(x) > Math.abs(y) * 1.4) {
          onSelect((activeIndex + (x < 0 ? 1 : -1) + projects.length) % projects.length);
        }
      }}
    >
      {projects.length > 1 && previous && next && (
        <>
          <button
            type="button"
            className="orbit-neighbor orbit-neighbor-before"
            onClick={() => onSelect((activeIndex - 1 + projects.length) % projects.length)}
            aria-label={`Show ${previous.title}`}
          >
            {getProjectPreviewUrl(previous) ? (
              <img src={getProjectPreviewUrl(previous)} alt="" loading="lazy" />
            ) : (
              <span aria-hidden="true">{previous.title.charAt(0)}</span>
            )}
          </button>
          <button
            type="button"
            className="orbit-neighbor orbit-neighbor-after"
            onClick={() => onSelect((activeIndex + 1) % projects.length)}
            aria-label={`Show ${next.title}`}
          >
            {getProjectPreviewUrl(next) ? (
              <img src={getProjectPreviewUrl(next)} alt="" loading="lazy" />
            ) : (
              <span aria-hidden="true">{next.title.charAt(0)}</span>
            )}
          </button>
        </>
      )}
      <div className="orbit-active">{children}</div>
    </section>
  );
}
