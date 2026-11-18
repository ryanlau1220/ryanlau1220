import { useEffect, useRef } from "react";

export function LiquidBackground() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const noiseRef = useRef<SVGFETurbulenceElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        fieldRef.current?.style.setProperty("--pointer-x", `${x * 100}%`);
        fieldRef.current?.style.setProperty("--pointer-y", `${y * 100}%`);
        noiseRef.current?.setAttribute(
          "baseFrequency",
          `${0.006 + x * 0.007} ${0.008 + y * 0.007}`,
        );
      });
    };
    window.addEventListener("pointermove", update, { passive: true });
    return () => {
      window.removeEventListener("pointermove", update);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="liquid-background" ref={fieldRef} aria-hidden="true">
      <svg className="liquid-filter">
        <filter id="liquid-displacement">
          <feTurbulence
            ref={noiseRef}
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves="2"
            seed="8"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="72"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <div className="liquid-field" />
      <div className="liquid-pointer" />
    </div>
  );
}
