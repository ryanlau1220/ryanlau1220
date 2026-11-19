import { useEffect, useState } from "react";

export interface SceneQuality {
  /** Phones and small tablets: fewer particles, no shadows, lighter post-processing. */
  low: boolean;
  reducedMotion: boolean;
  portrait: boolean;
}

function read(): SceneQuality {
  if (typeof window === "undefined") return { low: false, reducedMotion: false, portrait: false };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return {
    low: coarse || window.innerWidth < 768,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    portrait: window.innerHeight > window.innerWidth,
  };
}

export function useSceneQuality() {
  const [quality, setQuality] = useState<SceneQuality>(read);
  useEffect(() => {
    const update = () => setQuality(read());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return quality;
}
