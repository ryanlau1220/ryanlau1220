import * as THREE from "three";

/** Small seeded random so procedural textures look the same on every visit. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return [element, element.getContext("2d")!] as const;
}

function finish(element: HTMLCanvasElement, repeat = 1) {
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat !== 1) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
  }
  return texture;
}

export function createWoodTexture() {
  const [element, context] = canvas(1024, 1024);
  const rand = random(7);
  context.fillStyle = "#4a2a16";
  context.fillRect(0, 0, 1024, 1024);
  // Planks
  for (let plank = 0; plank < 4; plank++) {
    const y = plank * 256;
    const tone = 0.85 + rand() * 0.3;
    context.fillStyle = `rgb(${74 * tone}, ${43 * tone}, ${23 * tone})`;
    context.fillRect(0, y, 1024, 256);
    for (let line = 0; line < 70; line++) {
      const lineY = y + rand() * 256;
      context.strokeStyle = `rgba(${rand() > 0.5 ? "30,15,6" : "110,70,40"}, ${0.08 + rand() * 0.18})`;
      context.lineWidth = 0.6 + rand() * 2.4;
      context.beginPath();
      context.moveTo(0, lineY);
      for (let x = 0; x <= 1024; x += 32) {
        context.lineTo(x, lineY + Math.sin(x * 0.01 + line) * (2 + rand() * 4));
      }
      context.stroke();
    }
    context.fillStyle = "rgba(10,5,2,0.6)";
    context.fillRect(0, y, 1024, 3);
  }
  // Knots
  for (let knot = 0; knot < 6; knot++) {
    const gradient = context.createRadialGradient(0, 0, 2, 0, 0, 30 + rand() * 30);
    gradient.addColorStop(0, "rgba(25,12,5,0.7)");
    gradient.addColorStop(1, "rgba(25,12,5,0)");
    context.save();
    context.translate(rand() * 1024, rand() * 1024);
    context.scale(2.2, 0.8);
    context.fillStyle = gradient;
    context.fillRect(-80, -80, 160, 160);
    context.restore();
  }
  return finish(element, 3);
}

export function createLeatherCover(title: string, subtitle: string) {
  const [element, context] = canvas(1024, 1408);
  const rand = random(11);
  const base = context.createLinearGradient(0, 0, 1024, 1408);
  base.addColorStop(0, "#6e1f17");
  base.addColorStop(0.5, "#5a1811");
  base.addColorStop(1, "#3f0f0a");
  context.fillStyle = base;
  context.fillRect(0, 0, 1024, 1408);
  // Grain
  for (let index = 0; index < 9000; index++) {
    context.fillStyle = `rgba(${rand() > 0.5 ? "0,0,0" : "255,200,170"}, ${rand() * 0.06})`;
    context.fillRect(rand() * 1024, rand() * 1408, 2 + rand() * 3, 2 + rand() * 3);
  }
  const gold = context.createLinearGradient(0, 0, 1024, 0);
  gold.addColorStop(0, "#b88a35");
  gold.addColorStop(0.5, "#f4d488");
  gold.addColorStop(1, "#b88a35");
  context.strokeStyle = gold;
  context.lineWidth = 6;
  context.strokeRect(70, 70, 884, 1268);
  context.lineWidth = 2;
  context.strokeRect(96, 96, 832, 1216);
  // Corner flourishes
  for (const [x, y, sx, sy] of [
    [96, 96, 1, 1],
    [928, 96, -1, 1],
    [96, 1312, 1, -1],
    [928, 1312, -1, -1],
  ]) {
    context.save();
    context.translate(x, y);
    context.scale(sx, sy);
    context.beginPath();
    context.moveTo(0, 90);
    context.bezierCurveTo(0, 30, 30, 0, 90, 0);
    context.moveTo(24, 70);
    context.bezierCurveTo(30, 40, 40, 30, 70, 24);
    context.stroke();
    context.restore();
  }
  // Emblem: a crescent moon with a star.
  context.fillStyle = gold;
  context.beginPath();
  context.arc(512, 470, 110, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#5a1811";
  context.beginPath();
  context.arc(560, 440, 104, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = gold;
  star(context, 600, 540, 26, 11);
  star(context, 430, 360, 14, 6);

  context.textAlign = "center";
  context.fillStyle = gold;
  context.shadowColor = "rgba(0,0,0,0.5)";
  context.shadowBlur = 8;
  context.font = '128px "IM Fell English", Georgia, serif';
  context.fillText(title, 512, 800);
  context.font = '76px "Caveat", cursive';
  context.fillText(subtitle, 512, 900);
  return finish(element);
}

function star(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outer: number,
  inner: number,
) {
  context.beginPath();
  for (let point = 0; point < 10; point++) {
    const radius = point % 2 === 0 ? outer : inner;
    const angle = (point * Math.PI) / 5 - Math.PI / 2;
    context.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  context.closePath();
  context.fill();
}

export function createPaperTexture(lines = true) {
  const [element, context] = canvas(512, 704);
  const rand = random(3);
  const base = context.createRadialGradient(256, 300, 80, 256, 352, 520);
  base.addColorStop(0, "#f7ecd2");
  base.addColorStop(1, "#dcc394");
  context.fillStyle = base;
  context.fillRect(0, 0, 512, 704);
  for (let index = 0; index < 2500; index++) {
    context.fillStyle = `rgba(120,80,30,${rand() * 0.05})`;
    context.fillRect(rand() * 512, rand() * 704, 1 + rand() * 2, 1 + rand() * 2);
  }
  if (lines) {
    context.strokeStyle = "rgba(110,80,50,0.18)";
    context.lineWidth = 1;
    for (let y = 90; y < 680; y += 34) {
      context.beginPath();
      context.moveTo(40, y);
      context.lineTo(472, y);
      context.stroke();
    }
  }
  return finish(element);
}

/** Edge of a page block: many thin stacked sheets. */
export function createPageEdgeTexture() {
  const [element, context] = canvas(64, 256);
  context.fillStyle = "#e9d8b2";
  context.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 3) {
    context.fillStyle = `rgba(120,85,45,${0.12 + ((y * 7) % 10) / 60})`;
    context.fillRect(0, y, 64, 1);
  }
  return finish(element);
}
