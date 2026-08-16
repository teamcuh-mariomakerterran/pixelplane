/**
 * Shader Graph — compile a node DAG to a fragment shader.
 * Nodes live on the plane; preview is a WebGL quad.
 */

export type ShaderNodeKind =
  | "input_tex"
  | "input_time"
  | "noise"
  | "scanlines"
  | "chroma"
  | "disperse"
  | "pixelate"
  | "vignette"
  | "hue"
  | "glow"
  | "posterize"
  | "crt"
  | "ripple"
  | "dither"
  | "output";

export type ShaderNode = {
  id: string;
  kind: ShaderNodeKind;
  name: string;
  x: number;
  y: number;
  enabled: boolean;
  amount: number;
};

export type ShaderSource = "card" | "nearest";

export type ShaderPresetId =
  | "neon"
  | "vhs"
  | "night"
  | "acid"
  | "thermal"
  | "film"
  | "fringe"
  | "prism";

export type ShaderGraph = {
  id: string;
  name: string;
  x: number;
  y: number;
  viewW: number;
  viewH: number;
  nodes: ShaderNode[];
  playing: boolean;
  source?: ShaderSource;
  preset?: ShaderPresetId;
};

export const NODE_META: Record<
  ShaderNodeKind,
  { label: string; color: string; hint: string }
> = {
  input_tex: { label: "Tex", color: "#94a3b8", hint: "Source pixels" },
  input_time: { label: "Time", color: "#64748b", hint: "Clock" },
  noise: { label: "Noise", color: "#a78bfa", hint: "Film grain" },
  scanlines: { label: "Scan", color: "#22d3ee", hint: "CRT lines" },
  chroma: { label: "Chroma", color: "#f472b6", hint: "Lens CA · radial + anamorphic" },
  disperse: { label: "Disperse", color: "#e879f9", hint: "Spectral prism · Cauchy IOR" },
  pixelate: { label: "Pixel", color: "#e8a838", hint: "Quantize UV" },
  vignette: { label: "Vignette", color: "#78716c", hint: "Edge darken" },
  hue: { label: "Hue", color: "#4ade80", hint: "Rotate / spin" },
  glow: { label: "Glow", color: "#fb923c", hint: "Neon lift" },
  posterize: { label: "Poster", color: "#818cf8", hint: "Band colors" },
  crt: { label: "CRT", color: "#38bdf8", hint: "Barrel tube" },
  ripple: { label: "Ripple", color: "#e879f9", hint: "UV warp" },
  dither: { label: "Dither", color: "#fbbf24", hint: "Bayer grit" },
  output: { label: "Out", color: "#e8a838", hint: "Preview" },
};

export const ALL_KINDS: ShaderNodeKind[] = [
  "input_tex",
  "pixelate",
  "scanlines",
  "chroma",
  "disperse",
  "glow",
  "vignette",
  "noise",
  "hue",
  "posterize",
  "crt",
  "ripple",
  "dither",
  "output",
];

export const NODE_W = 72;
export const NODE_H = 28;
export const GRAPH_PAD = 12;
export const TITLE_H = 22;
export const TITLE_W = 360;
export const PREVIEW_GAP = 20;

export const SHADER_PRESETS: Record<
  ShaderPresetId,
  {
    name: string;
    hint: string;
    color: string;
    on: Partial<Record<ShaderNodeKind, number>>;
  }
> = {
  neon: {
    name: "Neon CRT",
    hint: "scan · lens CA · glow",
    color: "#22d3ee",
    on: { scanlines: 0.5, chroma: 0.38, glow: 0.48, vignette: 0.55, noise: 0.22, crt: 0.42 },
  },
  vhs: {
    name: "VHS Tape",
    hint: "tracking · split",
    color: "#f472b6",
    on: { scanlines: 0.72, chroma: 0.78, noise: 0.58, ripple: 0.48, crt: 0.36, vignette: 0.4 },
  },
  night: {
    name: "Night Vision",
    hint: "green tube",
    color: "#4ade80",
    on: { hue: 0.36, vignette: 0.82, noise: 0.52, scanlines: 0.58, glow: 0.38 },
  },
  acid: {
    name: "Acid Rain",
    hint: "hue spin · warp",
    color: "#c084fc",
    on: { hue: 0.9, ripple: 0.72, glow: 0.58, chroma: 0.48, posterize: 0.42 },
  },
  thermal: {
    name: "Thermal",
    hint: "heat bands",
    color: "#fb923c",
    on: { hue: 0.14, posterize: 0.78, glow: 0.68, vignette: 0.5, dither: 0.45 },
  },
  film: {
    name: "Film Grain",
    hint: "quiet grade",
    color: "#94a3b8",
    on: { noise: 0.64, vignette: 0.72, posterize: 0.22, dither: 0.35 },
  },
  fringe: {
    name: "Lens Fringe",
    hint: "radial + anamorphic CA",
    color: "#fb7185",
    on: { chroma: 0.92, vignette: 0.38, crt: 0.22 },
  },
  prism: {
    name: "Prism",
    hint: "8-tap spectrum · Cauchy",
    color: "#e879f9",
    on: { disperse: 0.82, glow: 0.32, vignette: 0.36, chroma: 0.18 },
  },
};

export const PRESET_ORDER: ShaderPresetId[] = [
  "neon",
  "vhs",
  "fringe",
  "prism",
  "night",
  "acid",
  "thermal",
  "film",
];

function makeNode(
  kind: ShaderNodeKind,
  x: number,
  y: number,
  enabled: boolean,
  amount: number,
): ShaderNode {
  return {
    id: `sn_${kind}`,
    kind,
    name: NODE_META[kind].label,
    x,
    y,
    enabled,
    amount,
  };
}

export function layoutGraph(g: ShaderGraph, ox: number, oy: number): ShaderGraph {
  const nodes = ALL_KINDS.map((kind, i) => {
    const prev = g.nodes.find((n) => n.kind === kind);
    const x = ox + (i % 5) * 88;
    const y = oy + TITLE_H + 8 + Math.floor(i / 5) * 40;
    if (prev) return { ...prev, x, y, name: NODE_META[kind].label };
    return makeNode(kind, x, y, kind === "input_tex" || kind === "output", 0.5);
  });
  const rows = Math.ceil(ALL_KINDS.length / 5);
  const previewY = oy + TITLE_H + 8 + rows * 40 + PREVIEW_GAP;
  return {
    ...g,
    x: ox,
    y: previewY,
    viewW: 360,
    viewH: 220,
    nodes,
  };
}

export function graphSelfOverlaps(g: ShaderGraph): boolean {
  for (const n of g.nodes) {
    if (
      n.x < g.x + g.viewW &&
      n.x + NODE_W > g.x &&
      n.y < g.y + g.viewH &&
      n.y + NODE_H > g.y
    ) {
      return true;
    }
  }
  return false;
}

export function defaultGraph(x = 2400, y = 1100): ShaderGraph {
  const preset = SHADER_PRESETS.neon;
  const stub: ShaderGraph = {
    id: "sg_lab",
    name: `${preset.name} · Shader Lab`,
    x,
    y,
    viewW: 360,
    viewH: 220,
    nodes: ALL_KINDS.map((kind) => {
      const amt = preset.on[kind];
      return makeNode(
        kind,
        0,
        0,
        kind === "input_tex" || kind === "output" || amt != null,
        amt ?? 0.5,
      );
    }),
    playing: true,
    source: "card",
    preset: "neon",
  };
  return layoutGraph(stub, x, y);
}

export function migrateGraph(g: ShaderGraph): ShaderGraph {
  const have = new Set(g.nodes.map((n) => n.kind));
  const missing = ALL_KINDS.filter((k) => !have.has(k));
  const extra = missing.map((kind) => makeNode(kind, 0, 0, false, 0.45));
  const next: ShaderGraph = {
    ...g,
    viewW: Math.max(g.viewW, 360),
    viewH: Math.max(g.viewH, 220),
    source: g.source ?? "card",
    nodes: extra.length ? [...g.nodes, ...extra] : g.nodes,
  };
  if (missing.length || graphSelfOverlaps(next) || next.viewH < 220) {
    const ox = next.nodes.length ? Math.min(...next.nodes.map((n) => n.x)) : next.x;
    const oy = next.nodes.length
      ? Math.min(...next.nodes.map((n) => n.y)) - TITLE_H
      : next.y;
    return layoutGraph(next, ox, oy);
  }
  return next;
}

export function applyPresetToGraph(g: ShaderGraph, presetId: ShaderPresetId): ShaderGraph {
  const p = SHADER_PRESETS[presetId];
  const base = migrateGraph(g);
  const nodes = base.nodes.map((n) => {
    const amt = p.on[n.kind];
    const enabled = n.kind === "input_tex" || n.kind === "output" || amt != null;
    return { ...n, enabled, amount: amt ?? n.amount, name: NODE_META[n.kind].label };
  });
  return { ...base, name: `${p.name} · Shader Lab`, preset: presetId, nodes };
}

export function graphFingerprint(g: ShaderGraph): string {
  return g.nodes.map((n) => `${n.kind}:${n.enabled ? 1 : 0}`).join("|");
}

/** Compile enabled nodes into a single fragment shader + uniform defaults. */
export function compileGraph(g: ShaderGraph): {
  frag: string;
  amounts: Record<string, number>;
} {
  const on = new Set(g.nodes.filter((n) => n.enabled).map((n) => n.kind));
  const amounts: Record<string, number> = {};
  for (const n of g.nodes) amounts[n.kind] = n.amount;

  const frag = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime;
uniform float uScan;
uniform float uChroma;
uniform float uDisperse;
uniform float uPixel;
uniform float uVignette;
uniform float uHue;
uniform float uGlow;
uniform float uNoise;
uniform float uPoster;
uniform float uCrt;
uniform float uRipple;
uniform float uDither;
varying vec2 vUv;

vec3 hueShift(vec3 c, float a) {
  float ang = a * 6.2831853;
  float cosA = cos(ang);
  float sinA = sin(ang);
  mat3 m = mat3(
    0.299+0.701*cosA+0.168*sinA, 0.587-0.587*cosA+0.330*sinA, 0.114-0.114*cosA-0.497*sinA,
    0.299-0.299*cosA-0.328*sinA, 0.587+0.413*cosA+0.035*sinA, 0.114-0.114*cosA+0.292*sinA,
    0.299-0.300*cosA+1.250*sinA, 0.587-0.588*cosA-1.050*sinA, 0.114+0.886*cosA-0.203*sinA
  );
  return clamp(c * m, 0.0, 1.0);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Visible spectrum 400–700nm → rough sRGB. Ends fade so it doesn't blow white.
vec3 wl2rgb(float nm) {
  float t = clamp((nm - 400.0) / 300.0, 0.0, 1.0);
  vec3 c = vec3(
    smoothstep(0.12, 0.0, t) * 0.55 + smoothstep(0.42, 0.72, t),
    sin(clamp((t - 0.04) / 0.72, 0.0, 1.0) * 3.14159265),
    1.0 - smoothstep(0.08, 0.42, t)
  );
  float fade = smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.9, 1.0, t));
  return max(c, 0.0) * fade;
}

void main() {
  vec2 uv = vUv;

  ${on.has("crt") ? `
  vec2 vc = uv * 2.0 - 1.0;
  vc *= 1.0 + uCrt * 0.22 * dot(vc, vc);
  uv = vc * 0.5 + 0.5;
  ` : ""}

  ${on.has("ripple") ? `
  uv.x += sin(uv.y * 30.0 + uTime * 3.4) * uRipple * 0.014;
  uv.y += cos(uv.x * 24.0 + uTime * 2.1) * uRipple * 0.010;
  ` : ""}

  ${on.has("pixelate") ? `
  float px = mix(1.0, 24.0, uPixel);
  vec2 grid = uRes / px;
  uv = (floor(uv * grid) + 0.5) / grid;
  ` : ""}

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.02, 0.03, 0.05, 1.0);
    return;
  }

  vec4 src = texture2D(uTex, uv);
  ${on.has("disperse") ? `
  // Chromatic dispersion — Cauchy n(λ) ≈ A + B/λ², 8 spectral taps.
  // Violet bends more than red. Dir = radial (lens fire) + slight prism tilt.
  {
    vec2 fromC = uv - 0.5;
    float r = length(fromC);
    vec2 rad = r > 0.0008 ? fromC / r : vec2(1.0, 0.0);
    float ang = uDisperse > 0.68 ? uTime * 0.12 : 0.0;
    float ca = cos(ang);
    float sa = sin(ang);
    vec2 tilt = vec2(0.55, 0.18);
    vec2 dir = normalize(rad * 0.75 + vec2(tilt.x * ca - tilt.y * sa, tilt.x * sa + tilt.y * ca));
    float fire = mix(0.45, 1.0, smoothstep(0.08, 0.55, r));
    float k = uDisperse * 0.012 * fire;
    vec3 acc = vec3(0.0);
    vec3 wsum = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float t = float(i) / 7.0;
      float nm = mix(400.0, 700.0, t);
      float um = nm * 0.001;
      // Cauchy: B/λ² relative to green 550nm (mediump-safe in µm)
      float disp = (1.0 / (um * um) - 3.3058) * k;
      vec2 suv = uv + dir * disp;
      vec3 w = wl2rgb(nm);
      acc += texture2D(uTex, suv).rgb * w;
      wsum += w;
    }
    src.rgb = acc / max(wsum, vec3(0.001));
  }
  ` : ""}
  ${on.has("chroma") && !on.has("disperse") ? `
  // Lens CA: anamorphic linear + radial fringe (R out, B in, G barely)
  vec2 cc = uv - 0.5;
  float r2 = dot(cc, cc);
  float k = uChroma * 0.016;
  vec2 off = vec2(k, 0.0) + cc * r2 * k * 2.6;
  src.r = texture2D(uTex, uv + off).r;
  src.g = texture2D(uTex, uv + off * 0.12).g;
  src.b = texture2D(uTex, uv - off).b;
  ` : ""}
  ${on.has("chroma") && on.has("disperse") ? `
  // Micro anamorphic on top of the spectrum
  float mk = uChroma * 0.006;
  src.r = mix(src.r, texture2D(uTex, uv + vec2(mk, 0.0)).r, 0.45);
  src.b = mix(src.b, texture2D(uTex, uv - vec2(mk, 0.0)).b, 0.45);
  ` : ""}

  vec3 col = src.rgb;

  ${on.has("hue") ? `
  float spin = uHue * 0.5 + step(0.72, uHue) * uTime * 0.16;
  col = hueShift(col, spin);
  ` : ""}

  ${on.has("posterize") ? `
  float bands = mix(16.0, 4.0, uPoster);
  col = floor(col * bands + 0.5) / bands;
  ` : ""}

  ${on.has("glow") ? `
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col += col * luma * uGlow * 0.9;
  ` : ""}

  ${on.has("scanlines") ? `
  float line = sin(uv.y * uRes.y * 3.14159);
  col *= 1.0 - uScan * 0.38 * (0.5 + 0.5 * line);
  col *= 0.90 + 0.10 * sin(uTime * 18.0 + uv.y * 42.0);
  ` : ""}

  ${on.has("noise") ? `
  float n = hash(uv * uRes + uTime * 60.0);
  col += (n - 0.5) * uNoise * 0.2;
  ` : ""}

  ${on.has("dither") ? `
  float dith = hash(floor(uv * uRes) + floor(uTime * 12.0));
  float levels = mix(32.0, 6.0, uDither);
  col += (dith - 0.5) * uDither * 0.1;
  col = floor(col * levels + 0.5) / levels;
  ` : ""}

  ${on.has("vignette") ? `
  vec2 v2 = uv * 2.0 - 1.0;
  float vig = 1.0 - dot(v2, v2) * uVignette * 0.8;
  col *= clamp(vig, 0.12, 1.0);
  ` : ""}

  ${on.has("crt") ? `
  float roll = 0.96 + 0.04 * sin(uTime * 1.7 + uv.y * 8.0);
  col *= roll;
  ` : ""}

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), src.a);
}
`.trim();

  return { frag, amounts };
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export type ShaderPreviewHandle = {
  canvas: HTMLCanvasElement;
  draw: (src: CanvasImageSource, time: number, amounts: Record<string, number>) => void;
  dispose: () => void;
};

export function createShaderPreview(w = 360, h = 220, frag: string): ShaderPreviewHandle | null {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, alpha: true });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("[shader]", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, "aPos");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[shader-link]", gl.getProgramInfoLog(prog));
    return null;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const loc = {
    uTex: gl.getUniformLocation(prog, "uTex"),
    uRes: gl.getUniformLocation(prog, "uRes"),
    uTime: gl.getUniformLocation(prog, "uTime"),
    uScan: gl.getUniformLocation(prog, "uScan"),
    uChroma: gl.getUniformLocation(prog, "uChroma"),
    uDisperse: gl.getUniformLocation(prog, "uDisperse"),
    uPixel: gl.getUniformLocation(prog, "uPixel"),
    uVignette: gl.getUniformLocation(prog, "uVignette"),
    uHue: gl.getUniformLocation(prog, "uHue"),
    uGlow: gl.getUniformLocation(prog, "uGlow"),
    uNoise: gl.getUniformLocation(prog, "uNoise"),
    uPoster: gl.getUniformLocation(prog, "uPoster"),
    uCrt: gl.getUniformLocation(prog, "uCrt"),
    uRipple: gl.getUniformLocation(prog, "uRipple"),
    uDither: gl.getUniformLocation(prog, "uDither"),
  };

  return {
    canvas,
    draw(src, time, amounts) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src as TexImageSource);
      } catch {
        return;
      }
      gl.uniform1i(loc.uTex, 0);
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
      gl.uniform1f(loc.uTime, time);
      gl.uniform1f(loc.uScan, amounts.scanlines ?? 0);
      gl.uniform1f(loc.uChroma, amounts.chroma ?? 0);
      gl.uniform1f(loc.uDisperse, amounts.disperse ?? 0);
      gl.uniform1f(loc.uPixel, amounts.pixelate ?? 0);
      gl.uniform1f(loc.uVignette, amounts.vignette ?? 0);
      gl.uniform1f(loc.uHue, amounts.hue ?? 0);
      gl.uniform1f(loc.uGlow, amounts.glow ?? 0);
      gl.uniform1f(loc.uNoise, amounts.noise ?? 0);
      gl.uniform1f(loc.uPoster, amounts.posterize ?? 0);
      gl.uniform1f(loc.uCrt, amounts.crt ?? 0);
      gl.uniform1f(loc.uRipple, amounts.ripple ?? 0);
      gl.uniform1f(loc.uDither, amounts.dither ?? 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      gl.deleteTexture(tex);
    },
  };
}

/** Procedural neon test card so the lab has a source even with no nearby board. */
export function createCrtTestCard(w = 360, h = 220): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#070b18");
  g.addColorStop(0.5, "#121428");
  g.addColorStop(1, "#1c0c22");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const sil = [24, 78, 46, 104, 62, 54, 88, 122, 44, 92, 68, 140, 38, 80, 108, 56];
  let x = 0;
  for (const bh of sil) {
    const bw = w / sil.length + 2;
    ctx.fillStyle = "#07080f";
    ctx.fillRect(x, h - bh - 16, bw, bh);
    ctx.fillStyle = "#22d3ee";
    for (let yy = h - bh; yy < h - 20; yy += 7) {
      for (let xx = x + 3; xx < x + bw - 3; xx += 6) {
        if ((xx + yy) % 3 === 0) ctx.fillRect(xx, yy, 2, 2);
      }
    }
    ctx.fillStyle = "#f472b6";
    if (bh > 90) ctx.fillRect(x + 4, h - bh - 10, bw - 10, 3);
    x += bw - 2;
  }

  const bars = ["#ef4444", "#e8a838", "#4ade80", "#22d3ee", "#818cf8", "#f472b6"];
  bars.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(14 + i * 24, 10, 22, 32);
  });

  ctx.fillStyle = "#f472b6";
  ctx.font = "bold 22px ui-sans-serif, system-ui";
  ctx.fillText("PIXELPLANE", 16, 72);
  ctx.fillStyle = "#22d3ee";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText("SHADER BUS  ·  LIVE GRADE", 16, 90);

  ctx.strokeStyle = "rgba(62,207,207,0.16)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (h / 10) * i);
    ctx.lineTo(w, (h / 10) * i);
    ctx.stroke();
  }
  return c;
}
