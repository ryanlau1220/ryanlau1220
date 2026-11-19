import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { Phase } from "./phase";

interface Shot {
  position: [number, number, number];
  target: [number, number, number];
}

const SHOTS: Record<Phase, Shot> = {
  cover: { position: [0.9, 3.6, 4.4], target: [0, 0.1, 0.15] },
  open: { position: [0, 4.6, 2.6], target: [0, 0, 0.2] },
  world: { position: [0, 1.25, 2.75], target: [0, 0.62, 0] },
};

/** Pull the camera back on narrow screens so the whole book or world stays in frame. */
function framed(shot: Shot, aspect: number): Shot {
  const reference = 1.45;
  const pull = aspect < reference ? Math.min(1.95, (reference / aspect) ** 0.62) : 1;
  const [x, y, z] = shot.position;
  const [tx, ty, tz] = shot.target;
  return {
    position: [tx + (x - tx) * pull, ty + (y - ty) * pull, tz + (z - tz) * pull],
    target: shot.target,
  };
}

export function CameraRig({
  phase,
  reducedMotion,
  instant,
}: {
  phase: Phase;
  reducedMotion: boolean;
  instant: boolean;
}) {
  const { camera, size, pointer } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const position = useRef(
    new THREE.Vector3(...framed(SHOTS[instant ? phase : "cover"], aspect).position),
  );
  const target = useRef(new THREE.Vector3(...SHOTS[instant ? phase : "cover"].target));
  const previous = useRef<Phase>(instant ? phase : "cover");
  const look = useRef(new THREE.Vector3());

  useLayoutEffect(() => {
    const shot = framed(SHOTS[phase], aspect);
    const from = previous.current;
    previous.current = phase;
    const duration = reducedMotion ? 0.01 : 2.6;
    const timeline = gsap.timeline({ defaults: { ease: "power3.inOut" } });

    if (phase === "world" && from === "open" && !reducedMotion) {
      // Rise over the pages, then dive down into the miniature world.
      const over = framed({ position: [0, 3.1, 1.2], target: [0, 0.3, 0] }, aspect);
      timeline
        .to(position.current, {
          x: over.position[0],
          y: over.position[1],
          z: over.position[2],
          duration: 1.1,
          ease: "power2.inOut",
        })
        .to(
          target.current,
          {
            x: over.target[0],
            y: over.target[1],
            z: over.target[2],
            duration: 1.1,
            ease: "power2.inOut",
          },
          "<",
        )
        .to(position.current, {
          x: shot.position[0],
          y: shot.position[1],
          z: shot.position[2],
          duration: 2.1,
        })
        .to(
          target.current,
          { x: shot.target[0], y: shot.target[1], z: shot.target[2], duration: 2.1 },
          "<",
        );
    } else {
      timeline
        .to(position.current, {
          x: shot.position[0],
          y: shot.position[1],
          z: shot.position[2],
          duration,
        })
        .to(
          target.current,
          { x: shot.target[0], y: shot.target[1], z: shot.target[2], duration },
          "<",
        );
    }
    return () => {
      timeline.kill();
    };
  }, [phase, aspect, reducedMotion]);

  useFrame((_, delta) => {
    // A gentle, breathing handheld drift plus pointer parallax.
    const time = performance.now() / 1000;
    const drift = reducedMotion ? 0 : 1;
    const parallax = phase === "world" ? 0.18 : 0.12;
    look.current.lerp(
      new THREE.Vector3(pointer.x * parallax, pointer.y * parallax * 0.6, 0),
      Math.min(1, delta * 2),
    );
    camera.position.set(
      position.current.x + look.current.x + Math.sin(time * 0.31) * 0.03 * drift,
      position.current.y + look.current.y + Math.sin(time * 0.43) * 0.02 * drift,
      position.current.z,
    );
    camera.lookAt(target.current);
  });

  return null;
}
