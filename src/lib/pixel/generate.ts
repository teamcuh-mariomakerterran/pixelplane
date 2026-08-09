/**
 * Client-side pixel character + animation generator.
 * Combines patterns inspired by spritesheets.ai / AutoSprite UX:
 * prompt keywords → palette + body type + style → crisp pixel frames.
 * Not a scrape of those services — original procedural engine.
 */

import { createBuffer, setPixel, stampBrush, drawLine, drawRectOutline, drawEllipse } from "./buffer";
import type { PixelMode } from "./types";

export type GenStyle =
  | "8bit"
  | "16bit"
  | "hd-pixel"
  | "iso"
  | "silhouette"
  | "cartoon";

export type GenRequest = {
  prompt: string;
  style: GenStyle;
  mode: PixelMode;
  size: number; // frame size
  frames?: number;
  anim?: "idle" | "walk" | "run" | "attack" | "jump" | "none";
  humanoid?: boolean;
};

type Palette = {
  outline: [number, number, number];
  body: [number, number, number];
  bodyDark: [number, number, number];
  bodyLight: [number, number, number];
  accent: [number, number, number];
  accent2: [number, number, number];
  eye: [number, number, number];
  white: [number, number, number];
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantize(c: [number, number, number], mode: PixelMode): [number, number, number] {
  if (mode === "8bit") {
    return [
      Math.round(c[0] / 51) * 51,
      Math.round(c[1] / 51) * 51,
      Math.round(c[2] / 51) * 51,
    ];
  }
  if (mode === "16bit") {
    return [
      Math.round(c[0] / 17) * 17,
      Math.round(c[1] / 17) * 17,
      Math.round(c[2] / 17) * 17,
    ];
  }
  return c;
}

function darken(c: [number, number, number], f = 0.65): [number, number, number] {
  return [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];
}
function lighten(c: [number, number, number], f = 1.25): [number, number, number] {
  return [
    Math.min(255, Math.round(c[0] * f)),
    Math.min(255, Math.round(c[1] * f)),
    Math.min(255, Math.round(c[2] * f)),
  ];
}

const KEYWORD_COLORS: Record<string, [number, number, number]> = {
  red: [200, 48, 48],
  blue: [48, 96, 220],
  green: [48, 180, 80],
  cyan: [48, 220, 220],
  teal: [32, 180, 170],
  magenta: [220, 48, 160],
  pink: [255, 100, 160],
  purple: [140, 64, 200],
  orange: [230, 120, 32],
  yellow: [230, 200, 40],
  gold: [220, 180, 48],
  black: [28, 28, 36],
  white: [240, 240, 245],
  navy: [24, 32, 72],
  neon: [0, 255, 180],
  cyber: [0, 220, 200],
  fire: [255, 90, 30],
  ice: [140, 210, 255],
  forest: [40, 120, 60],
  rat: [40, 40, 52],
  cat: [240, 160, 120],
  knight: [120, 130, 150],
  ninja: [28, 28, 40],
  robot: [100, 120, 140],
  slime: [80, 220, 100],
};

function paletteFromPrompt(prompt: string, mode: PixelMode, rng: () => number): Palette {
  const p = prompt.toLowerCase();
  let body: [number, number, number] = [60, 70, 90];
  let accent: [number, number, number] = [60, 200, 200];
  let accent2: [number, number, number] = [220, 60, 140];
  let eye: [number, number, number] = [80, 255, 200];

  for (const [k, c] of Object.entries(KEYWORD_COLORS)) {
    if (p.includes(k)) {
      if (["cyan", "teal", "neon", "cyber", "ice"].includes(k)) accent = c;
      else if (["magenta", "pink", "red", "fire", "orange"].includes(k)) accent2 = c;
      else if (["eye", "glow"].includes(k)) eye = c;
      else body = c;
    }
  }
  // slight random variance
  body = quantize(
    [
      Math.min(255, body[0] + Math.floor((rng() - 0.5) * 20)),
      Math.min(255, body[1] + Math.floor((rng() - 0.5) * 20)),
      Math.min(255, body[2] + Math.floor((rng() - 0.5) * 20)),
    ],
    mode,
  );
  accent = quantize(accent, mode);
  accent2 = quantize(accent2, mode);
  eye = quantize(eye, mode);

  return {
    outline: quantize([12, 14, 20], mode),
    body,
    bodyDark: quantize(darken(body, 0.55), mode),
    bodyLight: quantize(lighten(body, 1.2), mode),
    accent,
    accent2,
    eye,
    white: quantize([245, 245, 250], mode),
  };
}

function detectCreature(prompt: string): "humanoid" | "quad" | "blob" | "robot" {
  const p = prompt.toLowerCase();
  if (/rat|cat|dog|wolf|fox|mouse|bunny|dragon/.test(p)) return "quad";
  if (/slime|blob|orb|ghost/.test(p)) return "blob";
  if (/robot|mech|droid|android/.test(p)) return "robot";
  return "humanoid";
}

function fillOval(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  col: [number, number, number],
  a = 255,
) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) setPixel(data, w, h, x, y, col[0], col[1], col[2], a);
    }
  }
}

function outlinePass(data: Uint8ClampedArray, w: number, h: number, outline: [number, number, number]) {
  const copy = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (copy[i + 3] === 0) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
          setPixel(data, w, h, x, y, outline[0], outline[1], outline[2], 255);
          break;
        }
        const ni = (ny * w + nx) * 4;
        if (copy[ni + 3] === 0) {
          // edge pixel — darken slightly as outline ring around
          // draw outline neighbor
          setPixel(data, w, h, nx, ny, outline[0], outline[1], outline[2], 255);
        }
      }
    }
  }
}

type Pose = {
  bodyY: number;
  legL: number;
  legR: number;
  armL: number;
  armR: number;
  headX: number;
  tail: number;
  weapon: number;
};

function poseForAnim(anim: GenRequest["anim"], frame: number, total: number): Pose {
  const t = total <= 1 ? 0 : frame / total;
  const s = Math.sin(t * Math.PI * 2);
  const c = Math.cos(t * Math.PI * 2);
  const base: Pose = {
    bodyY: 0,
    legL: 0,
    legR: 0,
    armL: 0,
    armR: 0,
    headX: 0,
    tail: 0,
    weapon: 0,
  };
  if (anim === "idle" || anim === "none" || !anim) {
    base.bodyY = Math.round(s * 1);
    base.tail = s * 2;
    base.armL = s * 1;
    return base;
  }
  if (anim === "walk") {
    base.legL = s * 4;
    base.legR = -s * 4;
    base.armL = -s * 3;
    base.armR = s * 3;
    base.bodyY = Math.abs(s) * 1;
    base.tail = -s * 3;
    return base;
  }
  if (anim === "run") {
    base.legL = s * 6;
    base.legR = -s * 6;
    base.armL = -s * 5;
    base.armR = s * 5;
    base.bodyY = Math.abs(s) * 2;
    base.headX = 1;
    base.tail = -s * 5;
    return base;
  }
  if (anim === "attack") {
    const swing = frame < total / 2 ? frame / (total / 2) : 1 - (frame - total / 2) / (total / 2);
    base.armR = -8 + swing * 14;
    base.weapon = swing * 10;
    base.bodyY = swing * 1;
    base.headX = swing * 1;
    return base;
  }
  if (anim === "jump") {
    const up = Math.sin(t * Math.PI);
    base.bodyY = -up * 8;
    base.legL = up * 3;
    base.legR = up * 3;
    base.armL = -up * 4;
    base.armR = -up * 4;
    return base;
  }
  return base;
}

function drawCharacterFrame(
  size: number,
  pal: Palette,
  creature: ReturnType<typeof detectCreature>,
  pose: Pose,
  style: GenStyle,
  hasWeapon: boolean,
) {
  const data = createBuffer(size, size);
  const s = size / 32; // scale factor from 32 base
  const sc = (n: number) => Math.round(n * s);
  const cx = Math.floor(size / 2) + pose.headX;
  const baseY = Math.floor(size * 0.72) + pose.bodyY;

  if (creature === "blob") {
    fillOval(data, size, size, cx, baseY - sc(6), sc(10), sc(8), pal.body);
    fillOval(data, size, size, cx - sc(3), baseY - sc(8), sc(2), sc(2), pal.eye);
    fillOval(data, size, size, cx + sc(3), baseY - sc(8), sc(2), sc(2), pal.eye);
    fillOval(data, size, size, cx, baseY - sc(4), sc(3), sc(2), pal.bodyDark);
  } else if (creature === "quad") {
    // body
    fillOval(data, size, size, cx, baseY - sc(8), sc(9), sc(7), pal.body);
    // head
    fillOval(data, size, size, cx + sc(7), baseY - sc(12), sc(6), sc(5), pal.body);
    // ears
    fillOval(data, size, size, cx + sc(4), baseY - sc(18), sc(2), sc(3), pal.accent2);
    fillOval(data, size, size, cx + sc(9), baseY - sc(18), sc(2), sc(3), pal.accent2);
    fillOval(data, size, size, cx + sc(4), baseY - sc(17), sc(1), sc(2), pal.bodyLight);
    fillOval(data, size, size, cx + sc(9), baseY - sc(17), sc(1), sc(2), pal.bodyLight);
    // eyes
    fillOval(data, size, size, cx + sc(8), baseY - sc(13), sc(2), sc(2), pal.eye);
    fillOval(data, size, size, cx + sc(11), baseY - sc(13), sc(1), sc(1), pal.white);
    // snout
    fillOval(data, size, size, cx + sc(12), baseY - sc(10), sc(2), sc(2), pal.accent2);
    // legs
    fillOval(data, size, size, cx - sc(5), baseY - sc(2) + pose.legL, sc(2), sc(4), pal.bodyDark);
    fillOval(data, size, size, cx - sc(1), baseY - sc(2) + pose.legR, sc(2), sc(4), pal.bodyDark);
    fillOval(data, size, size, cx + sc(3), baseY - sc(2) + pose.legL * 0.5, sc(2), sc(4), pal.bodyDark);
    fillOval(data, size, size, cx + sc(6), baseY - sc(2) + pose.legR * 0.5, sc(2), sc(4), pal.bodyDark);
    // feet accent
    fillOval(data, size, size, cx - sc(5), baseY + sc(2) + pose.legL, sc(2), sc(1), pal.accent2);
    fillOval(data, size, size, cx + sc(6), baseY + sc(2) + pose.legR * 0.5, sc(2), sc(1), pal.accent2);
    // tail
    const tx = cx - sc(10) + pose.tail;
    drawLine(
      data,
      size,
      size,
      cx - sc(8),
      baseY - sc(8),
      Math.round(tx),
      baseY - sc(14),
      Math.max(1, sc(2)),
      pal.accent2[0],
      pal.accent2[1],
      pal.accent2[2],
      255,
    );
    // jacket trim
    drawLine(
      data,
      size,
      size,
      cx - sc(4),
      baseY - sc(10),
      cx + sc(4),
      baseY - sc(6),
      1,
      pal.accent[0],
      pal.accent[1],
      pal.accent[2],
      255,
    );
    if (hasWeapon) {
      const wx = cx + sc(14) + pose.weapon;
      const wy = baseY - sc(14);
      drawLine(data, size, size, cx + sc(8), baseY - sc(10), Math.round(wx), Math.round(wy), 1, 180, 200, 220, 255);
      drawLine(data, size, size, Math.round(wx), Math.round(wy), Math.round(wx + sc(4)), Math.round(wy - sc(2)), 1, 200, 220, 240, 255);
    }
  } else if (creature === "robot") {
    drawRectOutline(
      data,
      size,
      size,
      cx - sc(6),
      baseY - sc(18),
      cx + sc(6),
      baseY - sc(4),
      1,
      pal.body[0],
      pal.body[1],
      pal.body[2],
      255,
      true,
    );
    fillOval(data, size, size, cx - sc(2), baseY - sc(14), sc(2), sc(2), pal.eye);
    fillOval(data, size, size, cx + sc(2), baseY - sc(14), sc(2), sc(2), pal.eye);
    // legs
    drawRectOutline(
      data,
      size,
      size,
      cx - sc(4),
      baseY - sc(4) + pose.legL,
      cx - sc(2),
      baseY + sc(4) + pose.legL,
      1,
      pal.bodyDark[0],
      pal.bodyDark[1],
      pal.bodyDark[2],
      255,
      true,
    );
    drawRectOutline(
      data,
      size,
      size,
      cx + sc(2),
      baseY - sc(4) + pose.legR,
      cx + sc(4),
      baseY + sc(4) + pose.legR,
      1,
      pal.bodyDark[0],
      pal.bodyDark[1],
      pal.bodyDark[2],
      255,
      true,
    );
  } else {
    // humanoid
    // head
    fillOval(data, size, size, cx, baseY - sc(18), sc(5), sc(5), pal.body);
    // hair/hood
    fillOval(data, size, size, cx, baseY - sc(20), sc(5), sc(3), pal.bodyDark);
    // eyes
    fillOval(data, size, size, cx - sc(2), baseY - sc(18), sc(1), sc(1), pal.eye);
    fillOval(data, size, size, cx + sc(2), baseY - sc(18), sc(1), sc(1), pal.eye);
    // torso
    drawRectOutline(
      data,
      size,
      size,
      cx - sc(5),
      baseY - sc(14),
      cx + sc(5),
      baseY - sc(2),
      1,
      pal.body[0],
      pal.body[1],
      pal.body[2],
      255,
      true,
    );
    // accent coat
    drawLine(
      data,
      size,
      size,
      cx - sc(5),
      baseY - sc(12),
      cx - sc(5),
      baseY,
      Math.max(1, sc(2)),
      pal.accent[0],
      pal.accent[1],
      pal.accent[2],
      255,
    );
    // arms
    drawLine(
      data,
      size,
      size,
      cx - sc(5),
      baseY - sc(12),
      cx - sc(9),
      baseY - sc(6) + pose.armL,
      Math.max(1, sc(2)),
      pal.body[0],
      pal.body[1],
      pal.body[2],
      255,
    );
    drawLine(
      data,
      size,
      size,
      cx + sc(5),
      baseY - sc(12),
      cx + sc(9) + pose.weapon,
      baseY - sc(6) + pose.armR,
      Math.max(1, sc(2)),
      pal.body[0],
      pal.body[1],
      pal.body[2],
      255,
    );
    // legs
    drawLine(
      data,
      size,
      size,
      cx - sc(2),
      baseY - sc(2),
      cx - sc(3),
      baseY + sc(8) + pose.legL,
      Math.max(1, sc(2)),
      pal.bodyDark[0],
      pal.bodyDark[1],
      pal.bodyDark[2],
      255,
    );
    drawLine(
      data,
      size,
      size,
      cx + sc(2),
      baseY - sc(2),
      cx + sc(3),
      baseY + sc(8) + pose.legR,
      Math.max(1, sc(2)),
      pal.bodyDark[0],
      pal.bodyDark[1],
      pal.bodyDark[2],
      255,
    );
    // boots
    stampBrush(
      data,
      size,
      size,
      cx - sc(3),
      baseY + sc(8) + pose.legL,
      Math.max(2, sc(3)),
      pal.accent2[0],
      pal.accent2[1],
      pal.accent2[2],
      255,
    );
    stampBrush(
      data,
      size,
      size,
      cx + sc(3),
      baseY + sc(8) + pose.legR,
      Math.max(2, sc(3)),
      pal.accent2[0],
      pal.accent2[1],
      pal.accent2[2],
      255,
    );
    if (hasWeapon) {
      drawLine(
        data,
        size,
        size,
        cx + sc(9) + pose.weapon,
        baseY - sc(6) + pose.armR,
        cx + sc(16) + pose.weapon,
        baseY - sc(16),
        1,
        190,
        200,
        220,
        255,
      );
    }
  }

  if (style !== "silhouette") {
    outlinePass(data, size, size, pal.outline);
  } else {
    // force silhouette
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        data[i] = pal.outline[0];
        data[i + 1] = pal.outline[1];
        data[i + 2] = pal.outline[2];
      }
    }
  }

  // crisp: no anti-alias — already integer
  return data;
}

export function generateCharacter(req: GenRequest): {
  frames: Uint8ClampedArray[];
  width: number;
  height: number;
  palette: Palette;
} {
  const seed = hash(req.prompt + req.style + req.anim);
  const rng = mulberry32(seed);
  const mode = req.mode ?? (req.style === "8bit" ? "8bit" : "16bit");
  const pal = paletteFromPrompt(req.prompt, mode, rng);
  const creature = req.humanoid === false ? detectCreature(req.prompt) : detectCreature(req.prompt);
  const size = req.size || (mode === "8bit" ? 32 : 48);
  const frameCount = req.frames ?? (req.anim && req.anim !== "none" ? 6 : 1);
  const hasWeapon = /sword|blade|weapon|ninja|knight|attack|katana/.test(req.prompt.toLowerCase());

  const frames: Uint8ClampedArray[] = [];
  for (let i = 0; i < frameCount; i++) {
    const pose = poseForAnim(req.anim ?? "idle", i, frameCount);
    frames.push(drawCharacterFrame(size, pal, creature, pose, req.style, hasWeapon));
  }

  return { frames, width: size, height: size, palette: pal };
}

export function generateParticlePreview(
  kind: "spark" | "smoke" | "magic" | "dust" | "slash",
  size: number,
  color: [number, number, number],
  frame: number,
  total: number,
) {
  const data = createBuffer(size, size);
  const t = frame / Math.max(1, total - 1);
  const cx = size / 2;
  const cy = size / 2;
  const rng = mulberry32(frame * 97 + kind.length * 13);

  if (kind === "spark") {
    for (let i = 0; i < 12; i++) {
      const ang = rng() * Math.PI * 2;
      const dist = t * size * 0.4 * (0.5 + rng());
      const x = Math.round(cx + Math.cos(ang) * dist);
      const y = Math.round(cy + Math.sin(ang) * dist);
      const a = Math.round((1 - t) * 255);
      stampBrush(data, size, size, x, y, 2, color[0], color[1], color[2], a);
    }
  } else if (kind === "smoke") {
    for (let i = 0; i < 8; i++) {
      const x = Math.round(cx + (rng() - 0.5) * size * 0.4);
      const y = Math.round(cy - t * size * 0.5 + (rng() - 0.5) * 4);
      const r = 2 + t * 6 * rng();
      const a = Math.round((1 - t) * 120);
      fillOval(data, size, size, x, y, r, r * 0.8, [color[0], color[1], color[2]], a);
    }
  } else if (kind === "magic") {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + t * Math.PI;
      const dist = size * 0.15 + Math.sin(t * Math.PI) * size * 0.25;
      const x = Math.round(cx + Math.cos(ang) * dist);
      const y = Math.round(cy + Math.sin(ang) * dist);
      stampBrush(data, size, size, x, y, 2, color[0], color[1], color[2], Math.round((1 - t * 0.5) * 255));
    }
  } else if (kind === "slash") {
    const x0 = Math.round(size * 0.15);
    const y0 = Math.round(size * (0.7 - t * 0.4));
    const x1 = Math.round(size * 0.85);
    const y1 = Math.round(size * (0.3 - t * 0.2));
    drawLine(data, size, size, x0, y0, x1, y1, 2, color[0], color[1], color[2], Math.round((1 - t) * 255));
  } else {
    // dust
    for (let i = 0; i < 10; i++) {
      const x = Math.round(cx + (rng() - 0.5) * size * 0.6);
      const y = Math.round(cy + t * size * 0.2 + (rng() - 0.5) * 6);
      stampBrush(data, size, size, x, y, 1, color[0], color[1], color[2], Math.round((1 - t) * 180));
    }
  }
  return data;
}

export function sheetFromFrames(frames: Uint8ClampedArray[], fw: number, fh: number, cols?: number) {
  const c = cols ?? Math.min(frames.length, 8);
  const rows = Math.ceil(frames.length / c);
  const data = createBuffer(c * fw, rows * fh);
  frames.forEach((f, i) => {
    const col = i % c;
    const row = Math.floor(i / c);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const si = (y * fw + x) * 4;
        const di = ((row * fh + y) * (c * fw) + (col * fw + x)) * 4;
        data[di] = f[si];
        data[di + 1] = f[si + 1];
        data[di + 2] = f[si + 2];
        data[di + 3] = f[si + 3];
      }
    }
  });
  return { data, width: c * fw, height: rows * fh, cols: c, rows };
}

// silence unused import if ellipse not used in some paths
void drawEllipse;
