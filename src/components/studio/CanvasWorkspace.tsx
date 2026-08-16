// @ts-nocheck
/**
 * Infinite plane: artboards, anims, wires, quests, districts, Wave A overlays.
 * Camera: screen = cam.x + world * cam.zoom
 */
import { useCallback, useEffect, useRef } from "react";
import { useStudio } from "@/store/studio";
import { useHotkeys } from "@/store/hotkeys";
import { useWaveA } from "@/store/wave-a";
import { usePlaneSystems } from "@/store/plane-systems";
import { useSpatialNav } from "@/store/spatial-nav";
import { useCharacterDistrict } from "@/store/character-district";
import { useInteriorDistrict } from "@/store/interior-district";
import { useHauntDistrict } from "@/store/haunt-district";
import { useCollab } from "@/store/collab";
import { useMemoryWeb } from "@/store/memory-web";
import { useSignature } from "@/store/signature";
import { useCraftLab } from "@/store/craft-lab";
import { applyBoil, boilDrawMotion, boilFrame, type BoilSpark } from "@/lib/pixel/boil";
import { QA_COLORS } from "@/lib/pixel/sprite-qa";
import { blitSpriteCA } from "@/lib/pixel/chroma";
import { tickBoilSizzle } from "@/lib/audio/juice";
import {
  TRIGGER_META,
  triggerBadgeBox,
  triggerValveBox,
  hitBox,
  type WireTriggerKind,
} from "@/lib/wires/triggers";
import { railById } from "@/lib/pixel/mutation-rails";
import { useSoundSprites } from "@/store/sound-sprites";
import { useRuleCards, whenLabel, thenLabel } from "@/store/rule-cards";
import { compositeLayers, bufferToImageData, coercePixelData, isBufferHollow } from "@/lib/pixel/buffer";
import { getStarterHtmlImage, prefetchStarterImages } from "@/lib/starter-pack";
import { drawParticleSystem, beginParticleFrame } from "@/lib/pixel/particles-draw";
import { useShaderGraph } from "@/store/shader-graph";
import {
  NODE_META,
  NODE_W,
  NODE_H,
  TITLE_W,
  TITLE_H,
  compileGraph,
  createShaderPreview,
  createCrtTestCard,
  graphFingerprint,
  graphSelfOverlaps,
  type ShaderPreviewHandle,
} from "@/lib/shaders/graph";
import { wireZoneHeat, worldCenterFromCamera } from "@/lib/spatial/wave-a";
import { zoneWorld, padWorld } from "@/lib/character-district/layout";
import {
  zoneWorld as interiorZoneWorld,
  padWorld as interiorPadWorld,
} from "@/lib/interior-district/layout";
import { CHUNK } from "@/lib/spatial/interest";
import { currentStage } from "@/lib/destructibles/presets";

type DragMode =
  | null
  | {
      kind:
        | "pan"
        | "paint"
        | "shape"
        | "marquee"
        | "anim-region"
        | "particle"
        | "wire-zone"
        | "mask"
        | "move-board"
        | "move-anim"
        | "move-zone"
        | "move-quest"
        | "move-actor"
        | "move-particle"
        | "move-parallax"
        | "move-dest"
        | "move-viewport"
        | "move-stamp"
        | "move-district"
        | "move-rule"
        | "move-shader"
        | "move-shader-node";
      x0: number;
      y0: number;
      lastX: number;
      lastY: number;
      artboardId?: string;
      targetId?: string;
      erase?: boolean;
      shape?: "line" | "rect" | "ellipse";
      ox?: number;
      oy?: number;
    };

function hexAlpha(hex: string, a: number) {
  const h = (hex || "#888").replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

function railColor(id: string) {
  return railById(id)?.color ?? "#e8a838";
}

function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  } catch {
    return false;
  }
}

const boilScratch: { c: HTMLCanvasElement | null } = { c: null };
const boilGhosts = new Map<string, HTMLCanvasElement>();
type BoilMote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
  g: number;
  b: number;
};
const boilMotes: BoilMote[] = [];
const boilSrcCache = new Map<string, Uint8ClampedArray>();
const boilReadCanvas: { c: HTMLCanvasElement | null } = { c: null };

function pixelsFromArtboard(b: {
  id: string;
  width: number;
  height: number;
  sourceUrl?: string;
  layers?: { data: unknown; visible?: boolean; opacity?: number }[];
}): Uint8ClampedArray | null {
  const w = b.width | 0;
  const h = b.height | 0;
  if (w < 2 || h < 2) return null;
  if (b.sourceUrl) {
    const key = `u:${b.sourceUrl}:${w}x${h}`;
    const hit = boilSrcCache.get(key);
    if (hit) return hit;
    const img = getStarterHtmlImage(b.sourceUrl);
    if (img && img.complete && img.naturalWidth > 0) {
      if (!boilReadCanvas.c) boilReadCanvas.c = document.createElement("canvas");
      const c = boilReadCanvas.c;
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
      const x = c.getContext("2d", { willReadFrequently: true });
      if (!x) return null;
      x.imageSmoothingEnabled = false;
      x.clearRect(0, 0, w, h);
      x.drawImage(img, 0, 0, w, h);
      const data = new Uint8ClampedArray(x.getImageData(0, 0, w, h).data);
      boilSrcCache.set(key, data);
      return data;
    }
  }
  try {
    const c = getBoardCanvas(b as never);
    if (c && c.width > 0 && c.height > 0) {
      const x = c.getContext("2d", { willReadFrequently: true });
      if (x) return new Uint8ClampedArray(x.getImageData(0, 0, c.width, c.height).data);
    }
  } catch {
    /* */
  }
  const layer = b.layers?.[0];
  if (layer && !isBufferHollow(layer.data, w, h)) {
    return compositeLayers(
      (b.layers || []).map((L) => ({
        data: L.data as Uint8ClampedArray,
        visible: L.visible !== false,
        opacity: L.opacity ?? 1,
      })),
      w,
      h,
    );
  }
  return null;
}

function drawBoil(
  ctx: CanvasRenderingContext2D,
  img: ImageData,
  x: number,
  y: number,
  boardId: string,
  chroma: number,
) {
  if (!boilScratch.c) boilScratch.c = document.createElement("canvas");
  const c = boilScratch.c;
  if (c.width !== img.width) c.width = img.width;
  if (c.height !== img.height) c.height = img.height;
  const tctx = c.getContext("2d");
  if (!tctx) return;
  tctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const ghost = boilGhosts.get(boardId);
  if (ghost && ghost.width === img.width) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.drawImage(ghost, x + 1, y);
    ctx.restore();
  }
  blitSpriteCA(ctx, c, x, y, chroma);
  let slot = boilGhosts.get(boardId);
  if (!slot || slot.width !== img.width || slot.height !== img.height) {
    slot = document.createElement("canvas");
    slot.width = img.width;
    slot.height = img.height;
    boilGhosts.set(boardId, slot);
  }
  slot.getContext("2d")?.drawImage(c, 0, 0);
}

const boardCache = new Map<string, { rev: string; canvas: HTMLCanvasElement }>();
const animCache = new Map<string, { key: string; canvas: HTMLCanvasElement }>();
const shaderPreviewCache = new Map<
  string,
  { key: string; handle: ShaderPreviewHandle }
>();
let crtTestCard: HTMLCanvasElement | null = null;
function getCrtCard() {
  if (!crtTestCard) crtTestCard = createCrtTestCard(320, 200);
  return crtTestCard;
}
const ghostImgCache = new Map<string, HTMLImageElement>();
const layerDataCache = new Map<string, { rev: number; canvas: HTMLCanvasElement }>();

/** Clear blit caches (call after factory reset / rehydrate). */
export function clearPlaneBlitCaches() {
  boardCache.clear();
  animCache.clear();
  layerDataCache.clear();
  boilGhosts.clear();
  boilMotes.length = 0;
  boilSrcCache.clear();
  for (const s of shaderPreviewCache.values()) {
    try {
      s.handle.dispose();
    } catch {
      /* */
    }
  }
  shaderPreviewCache.clear();
}

function getLayerDataCanvas(
  id: string,
  data: unknown,
  w: number,
  h: number,
  rev = 1,
): HTMLCanvasElement | null {
  if (!w || !h) return null;
  const hit = layerDataCache.get(id);
  if (hit && hit.rev === rev) return hit.canvas;
  try {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.putImageData(bufferToImageData(coercePixelData(data, w, h), w, h), 0, 0);
    layerDataCache.set(id, { rev, canvas: c });
    return c;
  } catch {
    return null;
  }
}

function boardRevKey(b: {
  id: string;
  layers: { id: string; rev: number; visible: boolean; opacity: number }[];
}) {
  return b.layers.map((l) => `${l.id}:${l.rev}:${l.visible ? 1 : 0}:${l.opacity}`).join("|");
}

function getBoardCanvas(b: {
  id: string;
  width: number;
  height: number;
  layers: {
    id: string;
    data: Uint8ClampedArray;
    visible: boolean;
    opacity: number;
    rev: number;
  }[];
}): HTMLCanvasElement | null {
  if (!b.width || !b.height) return null;
  const key = boardRevKey(b);
  const hit = boardCache.get(b.id);
  if (hit && hit.rev === key) return hit.canvas;
  try {
    const c = document.createElement("canvas");
    c.width = b.width;
    c.height = b.height;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    const buf = compositeLayers(b.layers, b.width, b.height);
    ctx.putImageData(bufferToImageData(buf, b.width, b.height), 0, 0);
    boardCache.set(b.id, { rev: key, canvas: c });
    return c;
  } catch (err) {
    console.warn("[getBoardCanvas]", b.id, err);
    return null;
  }
}

function getAnimCanvas(anim: {
  id: string;
  frameW: number;
  frameH: number;
  frames: { data: Uint8ClampedArray }[];
  currentFrame: number;
}) {
  const fi = Math.max(0, Math.min(anim.frames.length - 1, anim.currentFrame | 0));
  const frame = anim.frames[fi];
  if (!frame) return null;
  const key = `${fi}:${frame.data.length}:${anim.frameW}x${anim.frameH}`;
  const hit = animCache.get(anim.id);
  if (hit && hit.key === key) return hit.canvas;
  const c = document.createElement("canvas");
  c.width = anim.frameW;
  c.height = anim.frameH;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  try {
    ctx.putImageData(bufferToImageData(frame.data, anim.frameW, anim.frameH), 0, 0);
  } catch {
    return null;
  }
  animCache.set(anim.id, { key, canvas: c });
  return c;
}

function getGhostImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  let img = ghostImgCache.get(url);
  if (img) return img.complete ? img : null;
  img = new Image();
  img.src = url;
  ghostImgCache.set(url, img);
  return img.complete ? img : null;
}

export function CanvasWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragMode>(null);
  const sizeRef = useRef({ w: 800, h: 600 });
  const rafRef = useRef(0);

  const resize = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    sizeRef.current = { w, h };
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(() => resize());
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [resize]);

  // Animation tick + interest
  useEffect(() => {
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 50) {
        last = t;
        useStudio.getState().tickAnimations();
        const cam = useStudio.getState().camera;
        const { w, h } = sizeRef.current;
        usePlaneSystems.getState().updateLocalInterest(cam, w, h);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Draw loop
  useEffect(() => {
    let alive = true;
    const draw = () => {
      if (!alive) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        requestAnimationFrame(draw);
        return;
      }
      const { w: sw, h: sh } = sizeRef.current;
      const state = useStudio.getState();
      const cam = state.camera;
      const wave = useWaveA.getState();
      const plane = usePlaneSystems.getState();
      const spatial = useSpatialNav.getState();
      const districts = useCharacterDistrict.getState();
      const collab = useCollab.getState();
      const mem = useMemoryWeb.getState();
      const labels: { text: string; x: number; y: number; color: string; bg?: string }[] = [];

      // clear
      ctx.setTransform(
        Math.min(window.devicePixelRatio || 1, 2),
        0,
        0,
        Math.min(window.devicePixelRatio || 1, 2),
        0,
        0,
      );
      ctx.imageSmoothingEnabled = false;
      // deep void + subtle vignette pulse (post-calamity atmosphere)
      const tPulse = (performance.now() % 8000) / 8000;
      const pulse = 0.5 + 0.5 * Math.sin(tPulse * Math.PI * 2);
      ctx.fillStyle = "#0a0c11";
      ctx.fillRect(0, 0, sw, sh);
      const grd = ctx.createRadialGradient(sw * 0.5, sh * 0.45, sw * 0.1, sw * 0.5, sh * 0.5, sw * 0.75);
      grd.addColorStop(0, "rgba(20,28,40,0)");
      grd.addColorStop(0.7, `rgba(12,16,28,${0.15 + pulse * 0.05})`);
      grd.addColorStop(1, "rgba(6,8,14,0.55)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, sw, sh);

      // world transform
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      // grid
      if (state.meta.showGrid !== false) {
        const gs = state.meta.gridSize || 16;
        const worldL = -cam.x / cam.zoom;
        const worldT = -cam.y / cam.zoom;
        const worldR = (sw - cam.x) / cam.zoom;
        const worldB = (sh - cam.y) / cam.zoom;
        const x0 = Math.floor(worldL / gs) * gs;
        const y0 = Math.floor(worldT / gs) * gs;
        ctx.strokeStyle = `rgba(62,207,207,${0.03 + pulse * 0.02})`;
        ctx.lineWidth = 1 / cam.zoom;
        ctx.beginPath();
        for (let x = x0; x < worldR; x += gs) {
          ctx.moveTo(x, worldT);
          ctx.lineTo(x, worldB);
        }
        for (let y = y0; y < worldB; y += gs) {
          ctx.moveTo(worldL, y);
          ctx.lineTo(worldR, y);
        }
        ctx.stroke();
        // major axes
        ctx.strokeStyle = `rgba(232,168,56,${0.14 + pulse * 0.08})`;
        // cyan secondary major every 8 cells drawn via minor boost below
        ctx.beginPath();
        ctx.moveTo(0, worldT);
        ctx.lineTo(0, worldB);
        ctx.moveTo(worldL, 0);
        ctx.lineTo(worldR, 0);
        ctx.stroke();
      }

      // D_10x chunk grid
      if (plane.showChunkGrid) {
        const worldL = -cam.x / cam.zoom;
        const worldT = -cam.y / cam.zoom;
        const worldR = (sw - cam.x) / cam.zoom;
        const worldB = (sh - cam.y) / cam.zoom;
        const cx0 = Math.floor(worldL / CHUNK);
        const cy0 = Math.floor(worldT / CHUNK);
        const cx1 = Math.floor(worldR / CHUNK);
        const cy1 = Math.floor(worldB / CHUNK);
        const interest = new Set(plane.localInterest);
        for (let cy = cy0; cy <= cy1; cy++) {
          for (let cx = cx0; cx <= cx1; cx++) {
            const key = `${cx},${cy}`;
            const hot = interest.has(key);
            ctx.fillStyle = hot ? "rgba(232,168,56,0.06)" : "rgba(255,255,255,0.015)";
            ctx.strokeStyle = hot ? "rgba(232,168,56,0.25)" : "rgba(255,255,255,0.06)";
            ctx.lineWidth = 1 / cam.zoom;
            ctx.fillRect(cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
            ctx.strokeRect(cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
          }
        }
      }

      // Wire zones
      for (const zone of state.wireZones) {
        if (!zone.enabled) continue;
        const heatInfo = wave.showWireHeatMap
          ? wireZoneHeat(zone, state.artboards)
          : { heat: 0, orphans: 0, covered: 0, wired: !!(zone.folderId || zone.folderPath) };
        const heat = heatInfo.heat;
        const fillA = wave.showWireHeatMap ? 0.08 + heat * 0.22 : 0.07;
        ctx.fillStyle = hexAlpha(zone.color, fillA);
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
        ctx.strokeStyle = hexAlpha(zone.color, 0.55 + (wave.showWireHeatMap ? heat * 0.35 : 0));
        ctx.lineWidth = (zone.id === state.activeWireZoneId ? 2.5 : 1.25) / cam.zoom;
        ctx.setLineDash(
          zone.folderId || zone.folderPath ? [] : [8 / cam.zoom, 6 / cam.zoom],
        );
        ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
        ctx.setLineDash([]);

        if (wave.showWireHeatMap && heat > 0.05) {
          ctx.strokeStyle = hexAlpha(zone.color, 0.25 + heat * 0.55);
          ctx.lineWidth = (1 + heat * 4) / cam.zoom;
          ctx.strokeRect(
            zone.x - 2 / cam.zoom,
            zone.y - 2 / cam.zoom,
            zone.w + 4 / cam.zoom,
            zone.h + 4 / cam.zoom,
          );
        }

        if (cam.zoom > 0.18) {
          labels.push({
            text: zone.name + (zone.folderPath ? ` → ${zone.folderPath}` : " · unwired"),
            x: cam.x + zone.x * cam.zoom + 4,
            y: cam.y + zone.y * cam.zoom - 4,
            color: hexAlpha(zone.color, 0.95),
            bg: "rgba(10,12,18,0.75)",
          });
          if (wave.showWireHeatMap) {
            labels.push({
              text: heatInfo.wired
                ? `heat ${(heat * 100) | 0}% · ${heatInfo.covered} boards`
                : `orphan risk · ${heatInfo.covered} boards`,
              x: cam.x + zone.x * cam.zoom + 4,
              y: cam.y + zone.y * cam.zoom + 12,
              color: heatInfo.wired ? "rgba(78,203,113,0.9)" : "rgba(249,115,22,0.95)",
            });
          }
        }

        const trig = zone.trigger;
        if (trig && trig.kind && trig.kind !== "none") {
          const meta = TRIGGER_META[trig.kind as WireTriggerKind];
          const badge = triggerBadgeBox(zone, cam.zoom);
          const valve = triggerValveBox(zone, cam.zoom);
          const age = trig.lastFiredAt ? (Date.now() - trig.lastFiredAt) / 1000 : 99;
          const flash = age < 0.7 ? 1 - age / 0.7 : 0;
          ctx.fillStyle = hexAlpha(meta.color, trig.armed ? 0.22 + flash * 0.45 : 0.08);
          ctx.fillRect(badge.x, badge.y, badge.w, badge.h);
          ctx.strokeStyle = hexAlpha(meta.color, trig.armed ? 0.95 : 0.4);
          ctx.lineWidth = 1 / cam.zoom;
          ctx.setLineDash(trig.armed ? [] : [3 / cam.zoom, 3 / cam.zoom]);
          ctx.strokeRect(badge.x, badge.y, badge.w, badge.h);
          ctx.setLineDash([]);
          if (cam.zoom > 0.25) {
            labels.push({
              text: trig.armed ? meta.short : `${meta.short} · off`,
              x: cam.x + badge.x * cam.zoom + 4,
              y: cam.y + (badge.y + badge.h) * cam.zoom - 3,
              color: hexAlpha(meta.color, 0.95),
            });
          }
          ctx.beginPath();
          ctx.arc(
            valve.x + valve.w / 2,
            valve.y + valve.h / 2,
            valve.w / 2,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = trig.armed
            ? hexAlpha(meta.color, 0.85 + flash * 0.15)
            : "rgba(40,44,56,0.9)";
          ctx.fill();
          ctx.strokeStyle = hexAlpha(meta.color, 0.9);
          ctx.lineWidth = 1.2 / cam.zoom;
          ctx.stroke();
        }
      }

      // Constraint stamps (under art so cage frames sit as guides)
      for (const stamp of wave.constraintStamps) {
        const swW = stamp.pixelW * stamp.scale;
        const shH = stamp.pixelH * stamp.scale;
        ctx.fillStyle = hexAlpha(stamp.color, stamp.active ? 0.1 : 0.05);
        ctx.fillRect(stamp.x, stamp.y, swW, shH);
        ctx.strokeStyle = hexAlpha(stamp.color, stamp.active ? 0.95 : 0.5);
        ctx.lineWidth = (stamp.active ? 2 : 1) / cam.zoom;
        ctx.setLineDash([4 / cam.zoom, 3 / cam.zoom]);
        ctx.strokeRect(stamp.x, stamp.y, swW, shH);
        ctx.setLineDash([]);
        // pixel grid hint
        if (cam.zoom * stamp.scale > 4 && stamp.pixelW <= 64) {
          ctx.strokeStyle = hexAlpha(stamp.color, 0.15);
          ctx.lineWidth = 1 / cam.zoom;
          ctx.beginPath();
          for (let i = 1; i < stamp.pixelW; i++) {
            const x = stamp.x + i * stamp.scale;
            ctx.moveTo(x, stamp.y);
            ctx.lineTo(x, stamp.y + shH);
          }
          for (let j = 1; j < stamp.pixelH; j++) {
            const y = stamp.y + j * stamp.scale;
            ctx.moveTo(stamp.x, y);
            ctx.lineTo(stamp.x + swW, y);
          }
          ctx.stroke();
        }
        if (cam.zoom > 0.2) {
          labels.push({
            text: `${stamp.name}${stamp.active ? " · ACTIVE" : ""}`,
            x: cam.x + stamp.x * cam.zoom,
            y: cam.y + stamp.y * cam.zoom - 6,
            color: hexAlpha(stamp.color, 0.95),
          });
        }
      }

      // Game viewports
      for (const vp of wave.gameViewports) {
        const active = vp.id === wave.activeViewportId;
        ctx.fillStyle = hexAlpha(vp.color, 0.04);
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        ctx.strokeStyle = hexAlpha(vp.color, active ? 0.95 : 0.55);
        ctx.lineWidth = (active ? 2.5 : 1.5) / cam.zoom;
        ctx.strokeRect(vp.x, vp.y, vp.w, vp.h);
        // safe area 90%
        if (vp.showSafeArea) {
          const padX = vp.w * 0.05;
          const padY = vp.h * 0.05;
          ctx.strokeStyle = hexAlpha(vp.color, 0.35);
          ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
          ctx.strokeRect(vp.x + padX, vp.y + padY, vp.w - padX * 2, vp.h - padY * 2);
          ctx.setLineDash([]);
        }
        // hud guide band
        if (vp.showHudGuide) {
          ctx.fillStyle = hexAlpha(vp.color, 0.08);
          ctx.fillRect(vp.x, vp.y, vp.w, vp.h * 0.12);
          ctx.fillRect(vp.x, vp.y + vp.h * 0.88, vp.w, vp.h * 0.12);
        }
        // res label
        if (cam.zoom > 0.15) {
          labels.push({
            text: `${vp.name} · ${vp.resW}×${vp.resH}`,
            x: cam.x + vp.x * cam.zoom,
            y: cam.y + vp.y * cam.zoom - 6,
            color: hexAlpha(vp.color, 0.95),
          });
        }
      }

      // Character districts
      for (const d of districts.districts) {
        ctx.fillStyle = hexAlpha(d.color, 0.04);
        ctx.strokeStyle = hexAlpha(d.color, d.id === districts.activeId ? 0.9 : 0.45);
        ctx.lineWidth = 2 / cam.zoom;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeRect(d.x, d.y, d.w, d.h);
        for (const key of Object.keys(d.zones) as (keyof typeof d.zones)[]) {
          const zw = zoneWorld(d, key);
          ctx.fillStyle = "rgba(255,255,255,0.02)";
          ctx.strokeStyle = hexAlpha(d.color, 0.35);
          ctx.lineWidth = 1 / cam.zoom;
          ctx.fillRect(zw.x, zw.y, zw.w, zw.h);
          ctx.strokeRect(zw.x, zw.y, zw.w, zw.h);
          if (cam.zoom > 0.25) {
            labels.push({
              text: d.zones[key].label,
              x: cam.x + zw.x * cam.zoom + 4,
              y: cam.y + zw.y * cam.zoom + 12,
              color: "rgba(232,168,56,0.75)",
            });
          }
        }
        for (const pad of d.statePads) {
          const pw = padWorld(d, pad);
          ctx.fillStyle = hexAlpha(pad.color, 0.12);
          ctx.strokeStyle = hexAlpha(pad.color, 0.7);
          ctx.lineWidth = 1.25 / cam.zoom;
          ctx.fillRect(pw.x, pw.y, pw.w, pw.h);
          ctx.strokeRect(pw.x, pw.y, pw.w, pw.h);
          if (cam.zoom > 0.3) {
            labels.push({
              text: pad.state,
              x: cam.x + pw.x * cam.zoom + 4,
              y: cam.y + pw.y * cam.zoom + 12,
              color: hexAlpha(pad.color, 0.95),
            });
          }
        }
        if (districts.showGravityRings && districts.gravityRadius > 0) {
          ctx.strokeStyle = "rgba(232,168,56,0.2)";
          ctx.lineWidth = 1 / cam.zoom;
          ctx.beginPath();
          ctx.arc(
            d.x + d.w / 2,
            d.y + d.h / 2,
            districts.gravityRadius,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
        if (cam.zoom > 0.15) {
          labels.push({
            text: d.name,
            x: cam.x + d.x * cam.zoom,
            y: cam.y + d.y * cam.zoom - 6,
            color: hexAlpha(d.color, 0.95),
          });
        }
      }

      // Interior districts — floor plan pads
      const interiors = useInteriorDistrict.getState();
      for (const d of interiors.districts) {
        ctx.fillStyle = hexAlpha(d.color, 0.04);
        ctx.strokeStyle = hexAlpha(d.color, d.id === interiors.activeId ? 0.9 : 0.4);
        ctx.lineWidth = 2 / cam.zoom;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeRect(d.x, d.y, d.w, d.h);
        for (const key of Object.keys(d.zones)) {
          const zw = interiorZoneWorld(d, key);
          ctx.strokeStyle = hexAlpha(d.color, 0.3);
          ctx.lineWidth = 1 / cam.zoom;
          ctx.strokeRect(zw.x, zw.y, zw.w, zw.h);
          if (cam.zoom > 0.25) {
            labels.push({
              text: d.zones[key].label,
              x: cam.x + zw.x * cam.zoom + 4,
              y: cam.y + zw.y * cam.zoom + 12,
              color: "rgba(62,207,207,0.75)",
            });
          }
        }
        for (const link of d.links) {
          const a = d.roomPads.find((p) => p.id === link.fromPadId);
          const b = d.roomPads.find((p) => p.id === link.toPadId);
          if (!a || !b) continue;
          ctx.strokeStyle = link.kind === "stair" ? "rgba(232,168,56,0.7)" : "rgba(62,207,207,0.45)";
          ctx.lineWidth = (link.kind === "stair" ? 2 : 1.2) / cam.zoom;
          ctx.beginPath();
          ctx.moveTo(d.x + a.x + a.w / 2, d.y + a.y + a.h / 2);
          ctx.lineTo(d.x + b.x + b.w / 2, d.y + b.y + b.h / 2);
          ctx.stroke();
        }
        for (const pad of d.roomPads) {
          const pw = interiorPadWorld(d, pad);
          ctx.fillStyle = hexAlpha(pad.color, pad.dark ? 0.08 : 0.16);
          ctx.strokeStyle = hexAlpha(pad.color, pad.locked ? 0.95 : 0.7);
          ctx.lineWidth = 1.25 / cam.zoom;
          ctx.fillRect(pw.x, pw.y, pw.w, pw.h);
          ctx.strokeRect(pw.x, pw.y, pw.w, pw.h);
          if (cam.zoom > 0.3) {
            labels.push({
              text: `${pad.name}${pad.window ? " win" : ""}${pad.locked ? " lock" : ""}`,
              x: cam.x + pw.x * cam.zoom + 4,
              y: cam.y + pw.y * cam.zoom + 12,
              color: hexAlpha(pad.color, 0.95),
            });
          }
        }
        for (const lp of d.lightPads) {
          ctx.fillStyle = lp.color;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(d.x + lp.x, d.y + lp.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (cam.zoom > 0.15) {
          labels.push({
            text: d.name,
            x: cam.x + d.x * cam.zoom,
            y: cam.y + d.y * cam.zoom - 6,
            color: hexAlpha(d.color, 0.95),
          });
        }
      }

      // Haunt districts — residue pads
      const haunts = useHauntDistrict.getState();
      for (const d of haunts.districts) {
        ctx.fillStyle = hexAlpha(d.color, 0.05);
        ctx.strokeStyle = hexAlpha(d.color, d.id === haunts.activeId ? 0.9 : 0.4);
        ctx.lineWidth = 2 / cam.zoom;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeRect(d.x, d.y, d.w, d.h);
        if (d.sleepNode) {
          ctx.fillStyle = "rgba(192,132,252,0.35)";
          ctx.fillRect(d.x + d.sleepNode.x, d.y + d.sleepNode.y, 72, 28);
          if (cam.zoom > 0.3) {
            labels.push({
              text: d.lastSave ? "SLEPT" : "SLEEP",
              x: cam.x + (d.x + d.sleepNode.x) * cam.zoom + 4,
              y: cam.y + (d.y + d.sleepNode.y) * cam.zoom + 14,
              color: "rgba(232,200,255,0.95)",
            });
          }
        }
        for (const r of d.residues) {
          ctx.fillStyle = "rgba(192,132,252,0.14)";
          ctx.strokeStyle = "rgba(192,132,252,0.55)";
          ctx.lineWidth = 1 / cam.zoom;
          ctx.fillRect(d.x + r.x, d.y + r.y, 80, 40);
          ctx.strokeRect(d.x + r.x, d.y + r.y, 80, 40);
          if (cam.zoom > 0.35) {
            labels.push({
              text: r.label.slice(0, 22),
              x: cam.x + (d.x + r.x) * cam.zoom + 3,
              y: cam.y + (d.y + r.y) * cam.zoom + 12,
              color: "rgba(232,210,255,0.9)",
            });
          }
        }
        if (cam.zoom > 0.15) {
          labels.push({
            text: d.name,
            x: cam.x + d.x * cam.zoom,
            y: cam.y + d.y * cam.zoom - 6,
            color: hexAlpha(d.color, 0.95),
          });
        }
      }

      // Parallax stacks — draw real layer pixels (artboard link OR embedded buffer)
      for (const px of state.parallaxStacks) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(px.x, px.y, px.viewW, px.viewH);
        ctx.clip();
        ctx.fillStyle = "rgba(12,16,28,0.95)";
        ctx.fillRect(px.x, px.y, px.viewW, px.viewH);
        const t = Date.now() / 1000;
        let drew = 0;
        for (const L of px.layers) {
          if (L.visible === false) continue;
          const board = L.artboardId
            ? state.artboards.find((b) => b.id === L.artboardId)
            : null;
          const scrollX =
            (L.scrollScaleX ?? L.depth ?? L.speedX ?? 0.5) * (px.autoPreview !== false ? t * 28 : 0);
          const scrollY =
            (L.scrollScaleY ?? L.depth ?? L.speedY ?? 0.5) * (px.autoPreview !== false ? t * 8 : 0);
          let c: HTMLCanvasElement | null = null;
          let lw = 0;
          let lh = 0;
          if (board) {
            const layer0 = board.layers?.[0];
            const boardHollow =
              !layer0 || isBufferHollow(layer0.data, board.width, board.height);
            if (!boardHollow) {
              try {
                c = getBoardCanvas(board);
                lw = board.width;
                lh = board.height;
              } catch {
                c = null;
              }
            } else if (board.sourceUrl) {
              // hollow board — blit starter image into a temp canvas for tiling
              const img = getStarterHtmlImage(board.sourceUrl);
              if (img && img.complete && img.naturalWidth > 0) {
                const tc = document.createElement("canvas");
                tc.width = board.width;
                tc.height = board.height;
                const tctx = tc.getContext("2d")!;
                tctx.imageSmoothingEnabled = false;
                tctx.drawImage(img, 0, 0, board.width, board.height);
                c = tc;
                lw = board.width;
                lh = board.height;
              } else {
                prefetchStarterImages([board.sourceUrl]);
              }
            }
          }
          if (!c && L.data && (L.w || L.width) && (L.h || L.height)) {
            lw = (L.w || L.width) | 0;
            lh = (L.h || L.height) | 0;
            if (!isBufferHollow(L.data, lw, lh)) {
              c = getLayerDataCanvas(
                `${px.id}:${L.id}`,
                L.data,
                lw,
                lh,
                L.rev || 1,
              );
            }
          }
          if (c && lw && lh) {
            // tile horizontally so viewport always filled
            const baseX = px.x + (L.offsetX ?? 0) - (scrollX % lw);
            const baseY = px.y + (L.offsetY ?? 0) - (scrollY % Math.max(1, lh));
            for (let ox = -lw; ox < px.viewW + lw; ox += lw) {
              ctx.drawImage(c, baseX + ox, baseY);
            }
            drew++;
          } else {
            // visible failure stripe so empty layers aren't silent
            ctx.fillStyle = hexAlpha("#818cf8", 0.12 + (L.depth ?? 0.5) * 0.15);
            ctx.fillRect(px.x, px.y + drew * 18, px.viewW, 16);
          }
        }
        ctx.restore();
        ctx.strokeStyle =
          px.id === state.activeParallaxId ? "rgba(129,140,248,0.95)" : "rgba(129,140,248,0.55)";
        ctx.lineWidth = 1.5 / cam.zoom;
        ctx.strokeRect(px.x, px.y, px.viewW, px.viewH);
        if (cam.zoom > 0.15) {
          labels.push({
            text: `${px.name} · ${drew}/${px.layers?.length || 0} layers`,
            x: cam.x + px.x * cam.zoom,
            y: cam.y + px.y * cam.zoom - 4,
            color: "rgba(129,140,248,0.95)",
            bg: "rgba(10,12,20,0.75)",
          });
        }
      }

      // Artboards (frustum-culled for fat city kits)
      {
        const worldL = -cam.x / cam.zoom - 40;
        const worldT = -cam.y / cam.zoom - 40;
        const worldR = (sw - cam.x) / cam.zoom + 40;
        const worldB = (sh - cam.y) / cam.zoom + 40;
        const tNow = performance.now();
        for (const b of state.artboards) {
          // frustum cull
          if (
            b.x + b.width < worldL ||
            b.y + b.height < worldT ||
            b.x > worldR ||
            b.y > worldB
          ) {
            continue;
          }
          const active = b.id === state.activeArtboardId;
          // LOD: far zoom = solid color + name only (no full pixel blit)
          const lodSkip =
            cam.zoom < 0.12 && b.width * cam.zoom < 48 && !active;
          if (lodSkip) {
            ctx.fillStyle = active ? "rgba(232,168,56,0.35)" : "rgba(62,80,100,0.45)";
            ctx.fillRect(b.x, b.y, b.width, b.height);
            ctx.strokeStyle = active ? "#e8a838" : "rgba(140,150,170,0.4)";
            ctx.lineWidth = 1 / cam.zoom;
            ctx.strokeRect(b.x, b.y, b.width, b.height);
            continue;
          }
          // checkerboard bg (skip when zoomed way out)
          if (cam.zoom > 0.25) {
            const cell = 8;
            for (let yy = 0; yy < b.height; yy += cell) {
              for (let xx = 0; xx < b.width; xx += cell) {
                const on = ((xx / cell) | 0) + ((yy / cell) | 0);
                ctx.fillStyle = on % 2 === 0 ? "#1a1f2a" : "#141820";
                ctx.fillRect(
                  b.x + xx,
                  b.y + yy,
                  Math.min(cell, b.width - xx),
                  Math.min(cell, b.height - yy),
                );
              }
            }
          } else {
            ctx.fillStyle = "#141820";
            ctx.fillRect(b.x, b.y, b.width, b.height);
          }
          try {
            const layer = b.layers?.[0];
            const hollow =
              !layer || isBufferHollow(layer.data, b.width, b.height);
            let painted = false;
            const craft = useCraftLab.getState();
            const wantBoil =
              craft.boilOn &&
              (craft.boilAll ||
                b.id === state.activeArtboardId ||
                (craft.boilBoardIds?.includes(b.id) ?? false)) &&
              b.width * b.height <= 360000;
            let boiledOk = false;
            if (wantBoil) {
              try {
                const src = pixelsFromArtboard(b);
                if (src && src.length >= b.width * b.height * 4) {
                  const frame = boilFrame(tNow, craft.boil.intensity);
                  const sparks: BoilSpark[] = [];
                  const boiled = applyBoil(
                    src,
                    b.width,
                    b.height,
                    craft.boil,
                    frame,
                    sparks,
                  );
                  const img = bufferToImageData(boiled, b.width, b.height);
                  const mot = boilDrawMotion(
                    craft.boil.pattern,
                    tNow,
                    craft.boil.intensity,
                  );
                  ctx.save();
                  ctx.translate(b.x + b.width / 2 + mot.ox, b.y + b.height / 2 + mot.oy);
                  if (mot.rot) ctx.rotate(mot.rot);
                  ctx.transform(mot.scaleX, 0, mot.shearX, mot.scaleY, 0, 0);
                  ctx.translate(-(b.x + b.width / 2), -(b.y + b.height / 2));
                  drawBoil(ctx, img, b.x, b.y, b.id, mot.chroma);
                  ctx.restore();
                  boiledOk = true;
                  painted = true;
                  if (!prefersReducedMotion()) {
                    for (const sp of sparks) {
                      boilMotes.push({
                        x: b.x + sp.x,
                        y: b.y + sp.y,
                        vx: (Math.random() - 0.5) * 22,
                        vy: -10 - Math.random() * 18,
                        life: 0.4 + Math.random() * 0.4,
                        r: sp.c[0],
                        g: sp.c[1],
                        b: sp.c[2],
                      });
                    }
                    if (boilMotes.length > 80) {
                      boilMotes.splice(0, boilMotes.length - 80);
                    }
                  }
                  const pulse = 0.5 + 0.5 * Math.sin(tNow / 220);
                  ctx.save();
                  ctx.strokeStyle = `rgba(62,207,207,${0.35 + pulse * 0.5})`;
                  ctx.lineWidth = (1.6 + pulse) / cam.zoom;
                  ctx.strokeRect(
                    b.x - 3 / cam.zoom,
                    b.y - 3 / cam.zoom,
                    b.width + 6 / cam.zoom,
                    b.height + 6 / cam.zoom,
                  );
                  ctx.restore();
                }
              } catch {
                boiledOk = false;
              }
            }
            // Static blit only when boil didn't paint the live sprite
            if (!boiledOk) {
              if (b.sourceUrl) {
                const img = getStarterHtmlImage(b.sourceUrl);
                if (img && img.complete && img.naturalWidth > 0) {
                  ctx.imageSmoothingEnabled = false;
                  ctx.drawImage(
                    img,
                    b.x,
                    b.y,
                    b.width || img.naturalWidth,
                    b.height || img.naturalHeight,
                  );
                  painted = true;
                } else {
                  prefetchStarterImages([b.sourceUrl]);
                }
              }
              if (!painted && !hollow) {
                try {
                  const c = getBoardCanvas(b);
                  if (c && c.width > 0 && c.height > 0) {
                    ctx.drawImage(c, b.x, b.y);
                    painted = true;
                  }
                } catch {
                  painted = false;
                }
              }
            }
            // QA overlay
            try {
              const craft = useCraftLab.getState();
              if (craft.qaOn && craft.qaReport && craft.qaReport.boardId === b.id) {
                for (const hit of craft.qaReport.hits) {
                  ctx.fillStyle = QA_COLORS[hit.kind] || "#e8a838";
                  ctx.globalAlpha = 0.85;
                  ctx.fillRect(b.x + hit.x, b.y + hit.y, 1, 1);
                  ctx.globalAlpha = 1;
                }
              }
            } catch {
              /* */
            }
            if (!painted) {
              ctx.fillStyle = "rgba(232,60,80,0.2)";
              ctx.fillRect(b.x, b.y, b.width, b.height);
              if (cam.zoom > 0.2) {
                labels.push({
                  text: `${b.name} · loading art…`,
                  x: cam.x + b.x * cam.zoom,
                  y: cam.y + b.y * cam.zoom + 14,
                  color: "rgba(255,200,120,0.95)",
                  bg: "rgba(40,24,8,0.85)",
                });
              }
            }
          } catch {
            /* ignore */
          }
          // active board pulse glow
          if (active) {
            const pulse = 0.5 + 0.5 * Math.sin(tNow / 380);
            ctx.strokeStyle = `rgba(232,168,56,${0.55 + pulse * 0.4})`;
            ctx.lineWidth = (2 + pulse) / cam.zoom;
            ctx.strokeRect(
              b.x - 2 / cam.zoom,
              b.y - 2 / cam.zoom,
              b.width + 4 / cam.zoom,
              b.height + 4 / cam.zoom,
            );
          }
          ctx.strokeStyle = active ? "#e8a838" : "rgba(140,150,170,0.55)";
          ctx.lineWidth = (active ? 2 : 1) / cam.zoom;
          ctx.strokeRect(
            b.x - 0.5 / cam.zoom,
            b.y - 0.5 / cam.zoom,
            b.width + 1 / cam.zoom,
            b.height + 1 / cam.zoom,
          );
          if (cam.zoom > 0.35) {
            labels.push({
              text: b.name,
              x: cam.x + b.x * cam.zoom,
              y: cam.y + b.y * cam.zoom - 4,
              color: active ? "rgba(232,168,56,0.95)" : "rgba(200,210,220,0.7)",
            });
          }
        }
      }

      // Selection marquee (committed)
      if (state.selection) {
        const s = state.selection;
        const board = state.artboards.find((b) => b.id === s.artboardId);
        if (board) {
          ctx.strokeStyle = "rgba(62,207,207,0.9)";
          ctx.lineWidth = 1 / cam.zoom;
          ctx.setLineDash([4 / cam.zoom, 3 / cam.zoom]);
          ctx.strokeRect(board.x + s.x, board.y + s.y, s.w, s.h);
          ctx.setLineDash([]);
        }
      }

      // boil motes + sizzle
      {
        const craft = useCraftLab.getState();
        const dt = 1 / 60;
        for (let i = boilMotes.length - 1; i >= 0; i--) {
          const m = boilMotes[i]!;
          m.life -= dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.vy -= 22 * dt;
          if (m.life <= 0) {
            boilMotes.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = Math.max(0, m.life * 1.8);
          ctx.fillStyle = `rgb(${m.r},${m.g},${m.b})`;
          ctx.fillRect(m.x, m.y, 1, 1);
        }
        ctx.globalAlpha = 1;
        tickBoilSizzle(craft.boilOn, craft.boil.intensity);
      }

      // Anim regions
      for (const a of state.animRegions) {
        const active = a.id === state.activeAnimId;
        ctx.fillStyle = "rgba(20,16,32,0.85)";
        ctx.fillRect(a.x, a.y, a.frameW, a.frameH);
        // onion
        if (a.onionSkin && a.frames.length > 1) {
          const prev = (a.currentFrame - 1 + a.frames.length) % a.frames.length;
          const next = (a.currentFrame + 1) % a.frames.length;
          for (const [fi, alpha] of [
            [prev, 0.25],
            [next, 0.2],
          ] as const) {
            try {
              const tmp = { ...a, currentFrame: fi };
              const c = getAnimCanvas(tmp);
              if (c) {
                ctx.globalAlpha = alpha;
                ctx.drawImage(c, a.x, a.y);
                ctx.globalAlpha = 1;
              }
            } catch {
              /* */
            }
          }
        }
        try {
          const c = getAnimCanvas(a);
          if (c) ctx.drawImage(c, a.x, a.y);
        } catch {
          /* */
        }
        ctx.strokeStyle = active ? "#a78bfa" : "rgba(167,139,250,0.5)";
        ctx.lineWidth = (active ? 2 : 1) / cam.zoom;
        ctx.strokeRect(a.x, a.y, a.frameW, a.frameH);
        if (cam.zoom > 0.3) {
          labels.push({
            text: `${a.name} · ${a.currentFrame + 1}/${a.frames.length}`,
            x: cam.x + a.x * cam.zoom,
            y: cam.y + a.y * cam.zoom - 4,
            color: "rgba(167,139,250,0.9)",
          });
        }
      }

      // Particles — atlas + LOD + frustum + global cap
      beginParticleFrame();
      const fxView = {
        left: -cam.x / cam.zoom,
        top: -cam.y / cam.zoom,
        right: (sw - cam.x) / cam.zoom,
        bottom: (sh - cam.y) / cam.zoom,
        zoom: cam.zoom,
      };
      for (const p of state.particles) {
        const active = p.id === state.activeParticleId;
        try {
          drawParticleSystem(
            ctx,
            {
              id: p.id,
              x: p.x,
              y: p.y,
              w: p.w,
              h: p.h,
              kind: p.kind || "magic",
              color: p.color || "#2dd4bf",
              playing: p.playing,
              rate: p.rate,
              life: p.life,
            },
            cam.zoom,
            performance.now(),
            fxView,
          );
        } catch {
          ctx.fillStyle = hexAlpha(p.color || "#2dd4bf", 0.12);
          ctx.fillRect(p.x, p.y, p.w, p.h);
        }
        if (active) {
          ctx.strokeStyle = "#e8a838";
          ctx.lineWidth = 2 / cam.zoom;
          ctx.strokeRect(p.x - 2 / cam.zoom, p.y - 2 / cam.zoom, p.w + 4 / cam.zoom, p.h + 4 / cam.zoom);
        }
        if (cam.zoom > 0.28) {
          labels.push({
            text: `${p.name || "FX"} · ${p.kind || "magic"}${p.playing === false ? " · paused" : ""}`,
            x: cam.x + p.x * cam.zoom,
            y: cam.y + p.y * cam.zoom - 4,
            color: hexAlpha(p.color || "#2dd4bf", 0.95),
          });
        }
      }

      // Scene actors
      for (const actor of state.actors) {
        const anim = state.animRegions.find((a) => a.id === actor.animId);
        if (!anim) {
          ctx.fillStyle = "rgba(232,168,56,0.3)";
          ctx.fillRect(actor.x, actor.y, 16, 16);
          continue;
        }
        const scale = actor.scale ?? 1;
        try {
          const c = getAnimCanvas(anim);
          if (c) {
            ctx.save();
            if (actor.flipX) {
              ctx.translate(actor.x + anim.frameW * scale, actor.y);
              ctx.scale(-scale, scale);
              ctx.drawImage(c, 0, 0);
            } else {
              ctx.drawImage(c, actor.x, actor.y, anim.frameW * scale, anim.frameH * scale);
            }
            ctx.restore();
          }
        } catch {
          /* */
        }
      }

      // Destructibles — bold street props (to the right of Neon Alley)
      for (const d of state.destructibles) {
        const stage = currentStage(d);
        const ratio = d.hp / Math.max(1, d.maxHp);
        const active = d.id === state.activeDestructibleId;
        ctx.fillStyle = hexAlpha(d.color, active ? 0.32 : 0.16);
        ctx.fillRect(d.x - 4 / cam.zoom, d.y - 4 / cam.zoom, d.w + 8 / cam.zoom, d.h + 8 / cam.zoom);
        ctx.fillStyle = hexAlpha(d.color, 0.5 + ratio * 0.4);
        ctx.strokeStyle = active ? "#fff" : hexAlpha(d.color, 0.95);
        ctx.lineWidth = (active ? 2.5 : 1.5) / cam.zoom;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeRect(d.x, d.y, d.w, d.h);
        // inner block glyph
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(d.x + 4, d.y + 4, d.w - 8, d.h - 8);
        ctx.fillStyle = hexAlpha(d.color, 0.95);
        ctx.fillRect(d.x + d.w * 0.25, d.y + d.h * 0.25, d.w * 0.5, d.h * 0.5);
        // hp bar
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(d.x, d.y - 7 / cam.zoom, d.w, 4 / cam.zoom);
        ctx.fillStyle = ratio > 0.5 ? "#4ecb71" : ratio > 0.2 ? "#e8a838" : "#e85d5d";
        ctx.fillRect(d.x, d.y - 7 / cam.zoom, d.w * ratio, 4 / cam.zoom);
        // only label active (or high zoom) — prevents text pile-up on the alley
        if (active || cam.zoom > 0.7) {
          labels.push({
            text: active
              ? `${d.name} · ${stage?.label ?? ""}`
              : d.name.split(" ")[0] || d.name,
            x: cam.x + d.x * cam.zoom,
            y: cam.y + d.y * cam.zoom - 10,
            color: "rgba(249,115,22,0.95)",
            bg: "rgba(12,10,8,0.78)",
          });
        }
      }

      // Quest trees
      for (const q of state.questTrees) {
        ctx.fillStyle = hexAlpha(q.color, 0.06);
        ctx.strokeStyle =
          q.id === state.activeQuestTreeId ? hexAlpha(q.color, 0.95) : hexAlpha(q.color, 0.45);
        ctx.lineWidth = 1.5 / cam.zoom;
        ctx.fillRect(q.x, q.y, q.w, q.h);
        ctx.strokeRect(q.x, q.y, q.w, q.h);
        // edges
        const byId = new Map(q.nodes.map((n) => [n.id, n]));
        ctx.strokeStyle = hexAlpha(q.color, 0.55);
        ctx.lineWidth = 1.25 / cam.zoom;
        for (const n of q.nodes) {
          for (const next of n.next || []) {
            const m = byId.get(next);
            if (!m) continue;
            ctx.beginPath();
            ctx.moveTo(q.x + n.x + 40, q.y + n.y + 16);
            ctx.lineTo(q.x + m.x + 40, q.y + m.y + 16);
            ctx.stroke();
          }
        }
        for (const n of q.nodes) {
          const nx = q.x + n.x;
          const ny = q.y + n.y;
          ctx.fillStyle = "rgba(18,16,10,0.9)";
          ctx.strokeStyle = hexAlpha(q.color, 0.85);
          ctx.lineWidth = 1 / cam.zoom;
          ctx.fillRect(nx, ny, 90, 36);
          ctx.strokeRect(nx, ny, 90, 36);
          if (cam.zoom > 0.35) {
            labels.push({
              text: n.title || n.kind,
              x: cam.x + nx * cam.zoom + 4,
              y: cam.y + ny * cam.zoom + 12,
              color: hexAlpha(q.color, 0.95),
            });
          }
        }
        if (cam.zoom > 0.2) {
          labels.push({
            text: q.name,
            x: cam.x + q.x * cam.zoom,
            y: cam.y + q.y * cam.zoom - 6,
            color: hexAlpha(q.color, 0.95),
          });
        }
      }

      // Private / witness / focus masks
      for (const m of plane.masks) {
        ctx.fillStyle = hexAlpha(m.color, m.mode === "focus" ? 0.05 : 0.1);
        ctx.strokeStyle = hexAlpha(m.color, 0.7);
        ctx.lineWidth = 1.5 / cam.zoom;
        ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
        ctx.fillRect(m.x, m.y, m.w, m.h);
        ctx.strokeRect(m.x, m.y, m.w, m.h);
        ctx.setLineDash([]);
        if (cam.zoom > 0.25) {
          labels.push({
            text: `${m.name} · ${m.mode}`,
            x: cam.x + m.x * cam.zoom,
            y: cam.y + m.y * cam.zoom - 4,
            color: hexAlpha(m.color, 0.95),
          });
        }
      }
      if (plane.maskDraft) {
        const d = plane.maskDraft;
        const x = Math.min(d.x0, d.x1);
        const y = Math.min(d.y0, d.y1);
        const ww = Math.abs(d.x1 - d.x0);
        const hh = Math.abs(d.y1 - d.y0);
        ctx.strokeStyle = "rgba(56,189,248,0.8)";
        ctx.setLineDash([4 / cam.zoom, 3 / cam.zoom]);
        ctx.strokeRect(x, y, ww, hh);
        ctx.setLineDash([]);
      }

      // Session ghosts (F-key bookmarks)
      if (wave.showSessionGhosts) {
        const bms = useHotkeys.getState().bookmarks;
        for (const [slot, bm] of Object.entries(bms)) {
          if (!bm) continue;
          let wx = bm.worldX;
          let wy = bm.worldY;
          if (wx == null || wy == null) {
            const c = worldCenterFromCamera(bm, sw, sh);
            wx = c.wx;
            wy = c.wy;
          }
          // ghost thumb
          if (bm.thumbDataUrl) {
            const img = getGhostImage(bm.thumbDataUrl);
            if (img) {
              const tw = 48 / cam.zoom;
              const th = 32 / cam.zoom;
              ctx.globalAlpha = 0.45;
              ctx.drawImage(img, wx - tw / 2, wy - th / 2, tw, th);
              ctx.globalAlpha = 1;
            }
          }
          ctx.strokeStyle = "rgba(232,168,56,0.4)";
          ctx.lineWidth = 1.5 / cam.zoom;
          ctx.setLineDash([4 / cam.zoom, 4 / cam.zoom]);
          ctx.beginPath();
          ctx.arc(wx, wy, 28 / cam.zoom, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          if (cam.zoom > 0.2) {
            labels.push({
              text: `F${slot}`,
              x: cam.x + wx * cam.zoom,
              y: cam.y + wy * cam.zoom,
              color: "rgba(232,168,56,0.85)",
            });
          }
        }
      }

      // Spatial beacons
      for (const b of spatial.beacons) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        ctx.strokeStyle = hexAlpha(b.color || "#e8a838", 0.4 + pulse * 0.5);
        ctx.lineWidth = 2 / cam.zoom;
        ctx.beginPath();
        ctx.arc(b.x, b.y, (18 + pulse * 10) / cam.zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = hexAlpha(b.color || "#e8a838", 0.85);
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4 / cam.zoom, 0, Math.PI * 2);
        ctx.fill();
        if (cam.zoom > 0.2) {
          labels.push({
            text: b.label || "Beacon",
            x: cam.x + b.x * cam.zoom + 8,
            y: cam.y + b.y * cam.zoom,
            color: hexAlpha(b.color || "#e8a838", 0.95),
          });
        }
      }

      // Live sockets markers
      for (const s of mem.sockets || []) {
        if (!s.enabled) continue;
        let sx: number | null = null;
        let sy: number | null = null;
        if (s.artboardId) {
          const b = state.artboards.find((a) => a.id === s.artboardId);
          if (b) {
            sx = b.x + b.width / 2;
            sy = b.y + b.height / 2;
          }
        } else if (s.wireZoneId) {
          const z = state.wireZones.find((z) => z.id === s.wireZoneId);
          if (z) {
            sx = z.x + z.w / 2;
            sy = z.y + 12;
          }
        }
        if (sx == null) continue;
        ctx.fillStyle = "rgba(62,207,207,0.85)";
        ctx.beginPath();
        ctx.arc(sx, sy, 5 / cam.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(62,207,207,0.5)";
        ctx.lineWidth = 1 / cam.zoom;
        ctx.strokeRect(sx - 8 / cam.zoom, sy - 8 / cam.zoom, 16 / cam.zoom, 16 / cam.zoom);
      }

      // Collab presence
      for (const p of Object.values(collab.presence || {})) {
        if (!p || p.peerId === collab.selfId) continue;
        ctx.fillStyle = hexAlpha(p.color || "#e8a838", 0.9);
        ctx.beginPath();
        ctx.arc(p.worldX, p.worldY, 5 / cam.zoom, 0, Math.PI * 2);
        ctx.fill();
        if (cam.zoom > 0.25) {
          labels.push({
            text: p.name || "peer",
            x: cam.x + p.worldX * cam.zoom + 6,
            y: cam.y + p.worldY * cam.zoom - 4,
            color: hexAlpha(p.color || "#e8a838", 0.95),
          });
        }
      }

      // Drag preview
      const dp = state.dragPreview;
      if (dp) {
        const x = Math.min(dp.x0, dp.x1);
        const y = Math.min(dp.y0, dp.y1);
        const ww = Math.abs(dp.x1 - dp.x0);
        const hh = Math.abs(dp.y1 - dp.y0);
        ctx.strokeStyle = "rgba(62,207,207,0.9)";
        ctx.lineWidth = 1.25 / cam.zoom;
        ctx.setLineDash([5 / cam.zoom, 4 / cam.zoom]);
        if (dp.kind === "line") {
          ctx.beginPath();
          ctx.moveTo(dp.x0, dp.y0);
          ctx.lineTo(dp.x1, dp.y1);
          ctx.stroke();
        } else if (dp.kind === "ellipse") {
          ctx.beginPath();
          ctx.ellipse(x + ww / 2, y + hh / 2, ww / 2, hh / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(x, y, ww, hh);
        }
        ctx.setLineDash([]);
      }

      // Sound-as-sprite chips (world)
      {
        const sfx = useSoundSprites.getState();
        if (sfx.show) {
          for (const c of sfx.chips) {
            const sx = c.x;
            const sy = c.y;
            const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200 + c.x);
            ctx.fillStyle = `rgba(192,132,252,${0.35 + pulse * 0.25})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 14 / cam.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(232,168,56,0.9)";
            ctx.lineWidth = 1.5 / cam.zoom;
            ctx.stroke();
            // waveform ticks
            ctx.strokeStyle = "rgba(62,207,207,0.85)";
            ctx.beginPath();
            for (let i = -6; i <= 6; i++) {
              const h = (4 + Math.abs(Math.sin(performance.now() / 120 + i + c.y)) * 8) / cam.zoom;
              ctx.moveTo(sx + (i * 2) / cam.zoom, sy - h / 2);
              ctx.lineTo(sx + (i * 2) / cam.zoom, sy + h / 2);
            }
            ctx.stroke();
            labels.push({
              text: c.name,
              x: cam.x + sx * cam.zoom + 10,
              y: cam.y + sy * cam.zoom - 8,
              color: "#e9d5ff",
              bg: "rgba(40,20,60,0.75)",
            });
          }
        }
      }

      // Rule cards (sticky logic notes — Layer IV)
      {
        const rules = useRuleCards.getState();
        if (rules.showOnPlane) {
          const cw = 148;
          const ch = 78;
          for (const card of rules.cards) {
            const active = card.id === rules.activeId;
            // soft shadow
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(card.x + 3 / cam.zoom, card.y + 3 / cam.zoom, cw, ch);
            // body
            ctx.fillStyle = card.enabled
              ? "rgba(18,22,32,0.92)"
              : "rgba(18,22,32,0.55)";
            ctx.fillRect(card.x, card.y, cw, ch);
            // accent strip
            ctx.fillStyle = hexAlpha(card.color, card.enabled ? 0.95 : 0.4);
            ctx.fillRect(card.x, card.y, 5, ch);
            // border
            ctx.strokeStyle = active
              ? "#e8a838"
              : hexAlpha(card.color, card.enabled ? 0.75 : 0.35);
            ctx.lineWidth = (active ? 2 : 1.25) / cam.zoom;
            ctx.strokeRect(card.x, card.y, cw, ch);
            // pin dot
            ctx.fillStyle = hexAlpha(card.color, 1);
            ctx.beginPath();
            ctx.arc(card.x + cw - 10, card.y + 10, 3.5 / cam.zoom, 0, Math.PI * 2);
            ctx.fill();
            if (cam.zoom > 0.2) {
              labels.push({
                text: card.name + (card.enabled ? "" : " · off"),
                x: cam.x + (card.x + 10) * cam.zoom,
                y: cam.y + (card.y + 16) * cam.zoom,
                color: hexAlpha(card.color, 0.95),
              });
              labels.push({
                text: `WHEN ${whenLabel(card.when)}`,
                x: cam.x + (card.x + 10) * cam.zoom,
                y: cam.y + (card.y + 34) * cam.zoom,
                color: "rgba(200,210,220,0.85)",
              });
              labels.push({
                text: `→ ${thenLabel(card.then).slice(0, 28)}`,
                x: cam.x + (card.x + 10) * cam.zoom,
                y: cam.y + (card.y + 50) * cam.zoom,
                color: "rgba(167,139,250,0.9)",
              });
            }
          }
        }
      }

      // Shader graphs — node chips + live WebGL CRT preview
      {
        const sg = useShaderGraph.getState();
        if (sg.graphs.some(graphSelfOverlaps)) {
          sg.migrateAll();
        }
        if (sg.showOnPlane) {
          const tNow = performance.now() / 1000;
          for (const g of sg.graphs) {
            const active = g.id === sg.activeId;
            // title bar
            const barH = TITLE_H;
            const titleY = Math.min(...g.nodes.map((n) => n.y)) - TITLE_H - 6;
            const titleX = Math.min(...g.nodes.map((n) => n.x));
            const titleW = TITLE_W;
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.fillRect(titleX + 2, titleY + 2, titleW, barH);
            ctx.fillStyle = active ? "rgba(18,28,36,0.94)" : "rgba(14,20,28,0.88)";
            ctx.fillRect(titleX, titleY, titleW, barH);
            ctx.fillStyle = "#3ecfcf";
            ctx.fillRect(titleX, titleY, 4, barH);
            ctx.strokeStyle = active ? "#e8a838" : "rgba(62,207,207,0.55)";
            ctx.lineWidth = (active ? 1.75 : 1) / cam.zoom;
            ctx.strokeRect(titleX, titleY, titleW, barH);

            // wires — pulse when both ends are live
            const sorted = [...g.nodes].sort((a, b) => a.x + a.y * 0.2 - (b.x + b.y * 0.2));
            const pulse = 0.22 + 0.18 * Math.sin(tNow * 3.2);
            ctx.lineWidth = 1.35 / cam.zoom;
            for (let i = 0; i < sorted.length - 1; i++) {
              const a = sorted[i]!;
              const b = sorted[i + 1]!;
              if (!a.enabled && !b.enabled) continue;
              ctx.strokeStyle =
                a.enabled && b.enabled
                  ? `rgba(62,207,207,${0.28 + pulse})`
                  : "rgba(62,207,207,0.16)";
              ctx.beginPath();
              ctx.moveTo(a.x + NODE_W, a.y + NODE_H / 2);
              const mx = (a.x + NODE_W + b.x) / 2;
              const my = (a.y + b.y) / 2 + Math.sin(tNow * 2 + i) * 4;
              ctx.quadraticCurveTo(mx, my, b.x, b.y + NODE_H / 2);
              ctx.stroke();
            }

            for (const n of g.nodes) {
              const meta = NODE_META[n.kind];
              const on = n.enabled;
              const nActive = n.id === sg.activeNodeId;
              ctx.fillStyle = "rgba(0,0,0,0.3)";
              ctx.fillRect(n.x + 2 / cam.zoom, n.y + 2 / cam.zoom, NODE_W, NODE_H);
              ctx.fillStyle = on ? "rgba(16,22,30,0.94)" : "rgba(16,22,30,0.5)";
              ctx.fillRect(n.x, n.y, NODE_W, NODE_H);
              ctx.fillStyle = hexAlpha(meta.color, on ? 0.95 : 0.35);
              ctx.fillRect(n.x, n.y, 4, NODE_H);
              ctx.strokeStyle = nActive ? "#e8a838" : hexAlpha(meta.color, on ? 0.7 : 0.3);
              ctx.lineWidth = (nActive ? 1.75 : 1) / cam.zoom;
              ctx.strokeRect(n.x, n.y, NODE_W, NODE_H);
              if (cam.zoom > 0.22) {
                labels.push({
                  text: meta.label + (on ? "" : " · off"),
                  x: cam.x + (n.x + 8) * cam.zoom,
                  y: cam.y + (n.y + 18) * cam.zoom,
                  color: hexAlpha(meta.color, on ? 0.95 : 0.45),
                });
              }
            }

            // preview
            const vx = g.x;
            const vy = g.y;
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(vx + 3, vy + 3, g.viewW, g.viewH);
            ctx.fillStyle = "#0a0c12";
            ctx.fillRect(vx, vy, g.viewW, g.viewH);
            ctx.strokeStyle = active ? "#e8a838" : "rgba(62,207,207,0.6)";
            ctx.lineWidth = (active ? 2 : 1.25) / cam.zoom;
            ctx.strokeRect(vx, vy, g.viewW, g.viewH);

            try {
              const fp = graphFingerprint(g);
              let slot = shaderPreviewCache.get(g.id);
              if (!slot || slot.key !== fp) {
                slot?.handle.dispose();
                const { frag } = compileGraph(g);
                const handle = createShaderPreview(g.viewW, g.viewH, frag);
                if (handle) {
                  slot = { key: fp, handle };
                  shaderPreviewCache.set(g.id, slot);
                } else {
                  slot = undefined;
                }
              }
              if (slot) {
                const amounts: Record<string, number> = {};
                for (const n of g.nodes) amounts[n.kind] = n.amount;
                let src: CanvasImageSource = getCrtCard();
                if (g.source !== "card") {
                  let bestD = 520;
                  for (const b of state.artboards) {
                    const d = Math.hypot(
                      b.x + b.width / 2 - (vx + g.viewW / 2),
                      b.y + b.height / 2 - (vy + g.viewH / 2),
                    );
                    if (d < bestD) {
                      const c = getBoardCanvas(b);
                      if (c) {
                        src = c;
                        bestD = d;
                      }
                    }
                  }
                }
                if (g.playing) slot.handle.draw(src, tNow, amounts);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(slot.handle.canvas, vx, vy, g.viewW, g.viewH);
              }
            } catch {
              ctx.fillStyle = "rgba(62,207,207,0.12)";
              ctx.fillRect(vx, vy, g.viewW, g.viewH);
            }

            if (cam.zoom > 0.18) {
              labels.push({
                text: "⠿  " + g.name + (g.playing ? "" : " · paused") + "  · drag",
                x: cam.x + titleX * cam.zoom,
                y: cam.y + titleY * cam.zoom - 3,
                color: "#3ecfcf",
                bg: "rgba(8,14,20,0.8)",
              });
              labels.push({
                text: `src ${g.source === "nearest" ? "board" : "CRT"}`,
                x: cam.x + (vx + 6) * cam.zoom,
                y: cam.y + (vy + g.viewH - 4) * cam.zoom,
                color: "rgba(232,168,56,0.9)",
                bg: "rgba(8,14,20,0.7)",
              });
            }
          }
        }
      }

      ctx.restore();

      // Screen-space labels
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.textBaseline = "bottom";
      for (const L of labels) {
        if (L.x < -40 || L.y < -20 || L.x > sw + 40 || L.y > sh + 20) continue;
        if (L.bg) {
          const tw = ctx.measureText(L.text).width;
          ctx.fillStyle = L.bg;
          ctx.fillRect(L.x - 2, L.y - 12, tw + 6, 14);
        }
        ctx.fillStyle = L.color;
        ctx.fillText(L.text, L.x, L.y);
      }

      // --- Wave B: Diff Lantern (world-space hot pixels) ---
      {
        const sig = useSignature.getState();
        if (sig.diffEnabled && sig.diffResult) {
          const d = sig.diffResult;
          const age = (performance.now() / 1000) % 1;
          const pulse = 0.55 + 0.45 * Math.sin(age * Math.PI * 2);
          const img = bufferToImageData(d.data, d.w, d.h);
          // temp canvas for alpha pulse
          const tmp = document.createElement("canvas");
          tmp.width = d.w;
          tmp.height = d.h;
          const tctx = tmp.getContext("2d");
          if (tctx) {
            tctx.putImageData(img, 0, 0);
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
              tmp,
              cam.x + d.x * cam.zoom,
              cam.y + d.y * cam.zoom,
              d.w * cam.zoom,
              d.h * cam.zoom,
            );
            ctx.restore();
            // lantern rim
            ctx.strokeStyle = `rgba(255,180,40,${0.4 + pulse * 0.4})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(
              cam.x + d.x * cam.zoom - 2,
              cam.y + d.y * cam.zoom - 2,
              d.w * cam.zoom + 4,
              d.h * cam.zoom + 4,
            );
            ctx.fillStyle = "rgba(255,180,40,0.9)";
            ctx.font = "10px ui-sans-serif, system-ui";
            ctx.fillText(
              `LANTERN · ${d.changed} Δ · ${d.aName} ↔ ${d.bName}`,
              cam.x + d.x * cam.zoom,
              cam.y + d.y * cam.zoom - 6,
            );
          }
        }
      }

      // --- Wave B: Reference Orbit (screen-space pin cards) ---
      {
        const sig = useSignature.getState();
        if (sig.orbitEnabled && sig.orbitPins.length) {
          const t = performance.now() / 1000;
          const cx = sw * 0.5;
          const cy = sh * 0.42;
          const n = sig.orbitPins.length;
          const boards = state.artboards;
          for (let i = 0; i < n; i++) {
            const pin = sig.orbitPins[i];
            const board = boards.find((b) => b.id === pin.boardId);
            if (!board) continue;
            const ang = t * sig.orbitSpeed + (i / n) * Math.PI * 2;
            const r = sig.orbitRadius + Math.sin(t * 1.7 + i) * 8;
            const sx = cx + Math.cos(ang) * r;
            const sy = cy + Math.sin(ang) * r * 0.55;
            // card
            const cardW = 72;
            const cardH = 56;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(Math.sin(t + i) * 0.05);
            ctx.fillStyle = "rgba(15,18,28,0.92)";
            ctx.strokeStyle = "rgba(62,207,207,0.75)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(-cardW / 2, -cardH / 2, cardW, cardH);
            ctx.fill();
            ctx.stroke();
            // mini thumb
            try {
              const comp = compositeLayers(board.layers, board.width, board.height);
              const idata = bufferToImageData(comp, board.width, board.height);
              const tc = document.createElement("canvas");
              tc.width = board.width;
              tc.height = board.height;
              const tx = tc.getContext("2d");
              if (tx) {
                tx.putImageData(idata, 0, 0);
                const max = 48;
                const sc = Math.min(max / board.width, max / board.height);
                const dw = board.width * sc;
                const dh = board.height * sc;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(tc, -dw / 2, -dh / 2 - 4, dw, dh);
              }
            } catch {}
            ctx.fillStyle = "rgba(62,207,207,0.95)";
            ctx.font = "9px ui-sans-serif, system-ui";
            ctx.textAlign = "center";
            const lab = pin.label.length > 12 ? pin.label.slice(0, 11) + "…" : pin.label;
            ctx.fillText(lab, 0, cardH / 2 - 6);
            ctx.textAlign = "start";
            ctx.restore();
            // tether to world board
            const bx = cam.x + (board.x + board.width / 2) * cam.zoom;
            const by = cam.y + (board.y + board.height / 2) * cam.zoom;
            ctx.strokeStyle = "rgba(62,207,207,0.2)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }
      }

      // Mutation rails — parent→child tethers + rail tags
      {
        const sig = useSignature.getState();
        if (sig.links.length) {
          const boards = state.artboards;
          for (const link of sig.links) {
            const parent = boards.find((b) => b.id === link.parentId);
            const child = boards.find((b) => b.id === link.childId);
            if (!parent || !child) continue;
            const px = cam.x + (parent.x + parent.width) * cam.zoom;
            const py = cam.y + (parent.y + parent.height / 2) * cam.zoom;
            const cx = cam.x + child.x * cam.zoom;
            const cy = cam.y + (child.y + child.height / 2) * cam.zoom;
            const color = railColor(link.railId);
            ctx.strokeStyle = hexAlpha(color, 0.55);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(px, py);
            const midX = (px + cx) / 2;
            ctx.bezierCurveTo(midX, py, midX, cy, cx, cy);
            ctx.stroke();
            if (cam.zoom > 0.28) {
              labels.push({
                text: `${link.name}${link.live ? "" : " · frozen"} · ${Math.round(link.amount * 100)}`,
                x: cam.x + child.x * cam.zoom,
                y: cam.y + child.y * cam.zoom - 16,
                color: hexAlpha(color, 0.95),
                bg: "rgba(12,14,18,0.75)",
              });
            }
          }
        }
      }

      // Hover pixel crosshair hint
      if (state.hoverPixel && cam.zoom > 2) {
        const hx = cam.x + state.hoverPixel.worldX * cam.zoom;
        const hy = cam.y + state.hoverPixel.worldY * cam.zoom;
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(hx, hy, cam.zoom, cam.zoom);
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(id);
    };
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const cam = useStudio.getState().camera;
    return {
      x: (sx - cam.x) / cam.zoom,
      y: (sy - cam.y) / cam.zoom,
    };
  }, []);

  const hitArtboard = (wx: number, wy: number) => {
    const boards = useStudio.getState().artboards;
    for (let i = boards.length - 1; i >= 0; i--) {
      const b = boards[i]!;
      if (wx >= b.x && wx < b.x + b.width && wy >= b.y && wy < b.y + b.height) return b;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    // Sound chips first
    {
      const sfx = useSoundSprites.getState();
      for (let i = sfx.chips.length - 1; i >= 0; i--) {
        const c = sfx.chips[i];
        if (Math.hypot(wx - c.x, wy - c.y) < 18) {
          sfx.play(c.id);
          sfx.select(c.id);
          useStudio.getState().setStatus(`Playing ${c.name}`);
          return;
        }
      }
    }
    const state = useStudio.getState();
    const plane = usePlaneSystems.getState();
    const tool = state.spacePan || e.button === 1 || e.button === 2 ? "pan" : state.tool;

    // Mask tool
    if (plane.maskTool && e.button === 0) {
      plane.beginMask(wx, wy);
      dragRef.current = { kind: "mask", x0: wx, y0: wy, lastX: wx, lastY: wy };
      return;
    }

    if (tool === "pan" || e.button === 1) {
      dragRef.current = { kind: "pan", x0: sx, y0: sy, lastX: sx, lastY: sy };
      return;
    }

    const startDrag = (
      kind: NonNullable<DragMode>["kind"],
      id: string,
      ox: number,
      oy: number,
    ) => {
      dragRef.current = {
        kind,
        x0: wx,
        y0: wy,
        lastX: wx,
        lastY: wy,
        targetId: id,
        ox,
        oy,
      };
    };

    // Plane windows — always grabbable, even with brush/fill active
    {
      const sg = useShaderGraph.getState();
      if (sg.showOnPlane) {
        for (let gi = sg.graphs.length - 1; gi >= 0; gi--) {
          const g = sg.graphs[gi]!;
          for (let ni = g.nodes.length - 1; ni >= 0; ni--) {
            const n = g.nodes[ni]!;
            if (wx >= n.x && wx <= n.x + NODE_W && wy >= n.y && wy <= n.y + NODE_H) {
              sg.select(g.id, n.id);
              startDrag("move-shader-node", `${g.id}|${n.id}`, n.x, n.y);
              return;
            }
          }
          const titleY = Math.min(...g.nodes.map((n) => n.y)) - TITLE_H - 6;
          const titleX = Math.min(...g.nodes.map((n) => n.x));
          const inPreview =
            wx >= g.x && wx <= g.x + g.viewW && wy >= g.y && wy <= g.y + g.viewH;
          const inTitle =
            wx >= titleX &&
            wx <= titleX + TITLE_W &&
            wy >= titleY &&
            wy <= titleY + TITLE_H;
          if (inPreview || inTitle) {
            sg.select(g.id, null);
            startDrag("move-shader", g.id, g.x, g.y);
            return;
          }
        }
      }
    }
    {
      const rules = useRuleCards.getState();
      if (rules.showOnPlane) {
        const cw = 148;
        const ch = 78;
        for (let i = rules.cards.length - 1; i >= 0; i--) {
          const card = rules.cards[i]!;
          if (wx >= card.x && wx <= card.x + cw && wy >= card.y && wy <= card.y + ch) {
            rules.select(card.id);
            startDrag("move-rule", card.id, card.x, card.y);
            return;
          }
        }
      }
    }

    // Select / move hits — boards and props; zones last
    if (tool === "select" || tool === "move") {
      for (const p of state.particles) {
        if (wx >= p.x && wx <= p.x + p.w && wy >= p.y && wy <= p.y + p.h) {
          state.selectParticle(p.id);
          startDrag("move-particle", p.id, p.x, p.y);
          return;
        }
      }

      for (const d of state.destructibles) {
        if (wx >= d.x && wx <= d.x + d.w && wy >= d.y && wy <= d.y + d.h) {
          state.selectDestructible(d.id);
          startDrag("move-dest", d.id, d.x, d.y);
          return;
        }
      }

      for (const a of state.animRegions) {
        if (wx >= a.x && wx <= a.x + a.frameW && wy >= a.y && wy <= a.y + a.frameH) {
          state.selectAnim(a.id);
          startDrag("move-anim", a.id, a.x, a.y);
          return;
        }
      }

      for (const actor of state.actors) {
        const anim = state.animRegions.find((a) => a.id === actor.animId);
        const fw = (anim?.frameW ?? 16) * (actor.scale ?? 1);
        const fh = (anim?.frameH ?? 16) * (actor.scale ?? 1);
        if (wx >= actor.x && wx <= actor.x + fw && wy >= actor.y && wy <= actor.y + fh) {
          startDrag("move-actor", actor.id, actor.x, actor.y);
          return;
        }
      }

      const board = hitArtboard(wx, wy);
      if (board) {
        state.selectArtboard(board.id);
        startDrag("move-board", board.id, board.x, board.y);
        return;
      }

      for (const p of state.parallaxStacks) {
        if (wx >= p.x && wx <= p.x + p.viewW && wy >= p.y && wy <= p.y + p.viewH) {
          state.selectParallax(p.id);
          startDrag("move-parallax", p.id, p.x, p.y);
          return;
        }
      }

      const wave = useWaveA.getState();
      for (let i = wave.gameViewports.length - 1; i >= 0; i--) {
        const vp = wave.gameViewports[i]!;
        if (wx >= vp.x && wx <= vp.x + vp.w && wy >= vp.y && wy <= vp.y + vp.h) {
          wave.selectViewport(vp.id);
          startDrag("move-viewport", vp.id, vp.x, vp.y);
          return;
        }
      }
      for (let i = wave.constraintStamps.length - 1; i >= 0; i--) {
        const st = wave.constraintStamps[i]!;
        const swW = st.pixelW * st.scale;
        const shH = st.pixelH * st.scale;
        if (wx >= st.x && wx <= st.x + swW && wy >= st.y && wy <= st.y + shH) {
          wave.setActiveStamp(st.id);
          startDrag("move-stamp", st.id, st.x, st.y);
          return;
        }
      }

      const dists = useCharacterDistrict.getState().districts;
      for (let i = dists.length - 1; i >= 0; i--) {
        const d = dists[i]!;
        if (wx >= d.x && wx <= d.x + d.w && wy >= d.y && wy <= d.y + d.h) {
          useCharacterDistrict.getState().selectDistrict(d.id);
          startDrag("move-district", d.id, d.x, d.y);
          return;
        }
      }

      for (const q of state.questTrees) {
        if (wx >= q.x && wx <= q.x + q.w && wy >= q.y && wy <= q.y + q.h) {
          state.selectQuestTree(q.id);
          if (tool === "move" || grab) {
            startDrag("move-quest", q.id, q.x, q.y);
          }
          return;
        }
      }

      // Wire zones last — huge AABBs used to swallow every window on top
      for (const z of state.wireZones) {
        if (wx >= z.x && wx <= z.x + z.w && wy >= z.y && wy <= z.y + z.h) {
          const zoom = state.camera.zoom || 1;
          if (z.trigger && z.trigger.kind !== "none") {
            const badge = triggerBadgeBox(z, zoom);
            const valve = triggerValveBox(z, zoom);
            if (hitBox(badge, wx, wy)) {
              state.selectWireZone(z.id);
              state.fireZoneTrigger(z.id);
              return;
            }
            if (hitBox(valve, wx, wy)) {
              state.selectWireZone(z.id);
              state.armZoneTrigger(z.id, !z.trigger.armed);
              return;
            }
          }
          state.selectWireZone(z.id);
          if (state.activeConnector) {
            state.beginWireConnect({
              zoneId: z.id,
              category: state.activeConnector,
              screenX: e.clientX,
              screenY: e.clientY,
            });
          }
          const edge =
            wx < z.x + 14 ||
            wx > z.x + z.w - 14 ||
            wy < z.y + 14 ||
            wy > z.y + z.h - 14;
          if (tool === "move" || edge) {
            startDrag("move-zone", z.id, z.x, z.y);
          }
          return;
        }
      }

      state.selectArtboard(null);
      return;
    }

    if (tool === "place") {
      if (state.activeAnimId) {
        state.placeActorFromAnim(state.activeAnimId, Math.round(wx), Math.round(wy));
      } else {
        state.setStatus("Select an animation first, then place");
      }
      return;
    }

    if (tool === "destructible") {
      state.placeDestructible(Math.round(wx), Math.round(wy));
      return;
    }

    if (tool === "quest-tree") {
      state.addQuestTree(Math.round(wx), Math.round(wy));
      return;
    }

    if (tool === "game-viewport") {
      const id = useWaveA.getState().addGameViewport(wx - 160, wy - 90);
      useWaveA.getState().selectViewport(id);
      state.setStatus("Game viewport placed · Ghost of the game");
      useHotkeys.getState().pushTip("game-viewport", { x: sx, y: sy });
      return;
    }

    if (tool === "constraint-stamp") {
      const id = useWaveA.getState().addConstraintStamp(wx, wy);
      useWaveA.getState().setActiveStamp(id);
      state.setStatus("Constraint stamp placed · paste clamps here");
      useHotkeys.getState().pushTip("constraint-stamp", { x: sx, y: sy });
      return;
    }

    // Pixel tools need a board
    const board = hitArtboard(wx, wy) || state.getActiveArtboard();
    if (
      board &&
      (tool === "brush" ||
        tool === "eraser" ||
        tool === "fill" ||
        tool === "eyedropper" ||
        tool === "line" ||
        tool === "rect" ||
        tool === "ellipse" ||
        tool === "marquee")
    ) {
      if (tool === "fill") {
        state.selectArtboard(board.id);
        state.fillAt(board.id, Math.floor(wx - board.x), Math.floor(wy - board.y));
        return;
      }
      if (tool === "eyedropper") {
        state.selectArtboard(board.id);
        state.sampleAt(board.id, Math.floor(wx - board.x), Math.floor(wy - board.y));
        return;
      }
      if (tool === "brush" || tool === "eraser") {
        state.selectArtboard(board.id);
        state.pushHistory();
        state.paintAt(
          board.id,
          Math.floor(wx - board.x),
          Math.floor(wy - board.y),
          tool === "eraser",
        );
        dragRef.current = {
          kind: "paint",
          x0: wx,
          y0: wy,
          lastX: wx,
          lastY: wy,
          artboardId: board.id,
          erase: tool === "eraser",
        };
        return;
      }
      if (tool === "line" || tool === "rect" || tool === "ellipse" || tool === "marquee") {
        state.selectArtboard(board.id);
        const lx = Math.floor(wx - board.x);
        const ly = Math.floor(wy - board.y);
        state.setDragPreview({
          kind: tool === "marquee" ? "marquee" : tool,
          x0: board.x + lx,
          y0: board.y + ly,
          x1: board.x + lx,
          y1: board.y + ly,
          artboardId: board.id,
        });
        dragRef.current = {
          kind: tool === "marquee" ? "marquee" : "shape",
          shape: tool === "marquee" ? undefined : tool,
          x0: board.x + lx,
          y0: board.y + ly,
          lastX: board.x + lx,
          lastY: board.y + ly,
          artboardId: board.id,
        };
        return;
      }
    }

    // Region tools (world space)
    if (tool === "anim-region" || tool === "particle" || tool === "wire-zone") {
      state.setDragPreview({
        kind: tool,
        x0: wx,
        y0: wy,
        x1: wx,
        y1: wy,
      });
      dragRef.current = {
        kind: tool,
        x0: wx,
        y0: wy,
        lastX: wx,
        lastY: wy,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    const state = useStudio.getState();
    const board = hitArtboard(wx, wy);
    if (board) {
      state.setHoverPixel({
        x: Math.floor(wx - board.x),
        y: Math.floor(wy - board.y),
        worldX: wx,
        worldY: wy,
      });
    } else {
      state.setHoverPixel({ x: 0, y: 0, worldX: wx, worldY: wy });
    }

    // collab cursor
    try {
      if (useCollab.getState().joined) {
        useCollab.getState().sendCursor(wx, wy, state.camera);
      }
    } catch {
      /* */
    }

    const drag = dragRef.current;
    if (!drag) return;

    if (drag.kind === "pan") {
      const dx = sx - drag.lastX;
      const dy = sy - drag.lastY;
      state.panBy(dx, dy);
      drag.lastX = sx;
      drag.lastY = sy;
      return;
    }

    if (drag.kind === "mask") {
      usePlaneSystems.getState().updateMaskDraft(wx, wy);
      return;
    }

    if (drag.kind === "paint" && drag.artboardId) {
      const b = state.artboards.find((a) => a.id === drag.artboardId);
      if (b) {
        state.strokeLine(
          drag.artboardId,
          Math.floor(drag.lastX - b.x),
          Math.floor(drag.lastY - b.y),
          Math.floor(wx - b.x),
          Math.floor(wy - b.y),
          drag.erase,
        );
      }
      drag.lastX = wx;
      drag.lastY = wy;
      return;
    }

    if (drag.kind === "shape" || drag.kind === "marquee") {
      state.setDragPreview({
        kind: drag.kind === "marquee" ? "marquee" : drag.shape || "rect",
        x0: drag.x0,
        y0: drag.y0,
        x1: wx,
        y1: wy,
        artboardId: drag.artboardId,
      });
      drag.lastX = wx;
      drag.lastY = wy;
      return;
    }

    if (
      drag.kind === "anim-region" ||
      drag.kind === "particle" ||
      drag.kind === "wire-zone"
    ) {
      state.setDragPreview({
        kind: drag.kind,
        x0: drag.x0,
        y0: drag.y0,
        x1: wx,
        y1: wy,
      });
      drag.lastX = wx;
      drag.lastY = wy;
      return;
    }

    const dx = wx - drag.x0;
    const dy = wy - drag.y0;
    if (drag.kind === "move-board" && drag.targetId != null) {
      state.moveArtboard(drag.targetId, Math.round((drag.ox ?? 0) + dx), Math.round((drag.oy ?? 0) + dy));
    } else if (drag.kind === "move-anim" && drag.targetId) {
      state.moveAnim(drag.targetId, Math.round((drag.ox ?? 0) + dx), Math.round((drag.oy ?? 0) + dy));
    } else if (drag.kind === "move-zone" && drag.targetId) {
      state.moveWireZone(drag.targetId, Math.round((drag.ox ?? 0) + dx), Math.round((drag.oy ?? 0) + dy));
    } else if (drag.kind === "move-quest" && drag.targetId) {
      state.updateQuestTree(drag.targetId, {
        x: Math.round((drag.ox ?? 0) + dx),
        y: Math.round((drag.oy ?? 0) + dy),
      });
    } else if (drag.kind === "move-actor" && drag.targetId) {
      state.moveActor(drag.targetId, Math.round((drag.ox ?? 0) + dx), Math.round((drag.oy ?? 0) + dy));
    } else if (drag.kind === "move-particle" && drag.targetId) {
      state.moveParticle(drag.targetId, Math.round((drag.ox ?? 0) + dx), Math.round((drag.oy ?? 0) + dy));
    } else if (drag.kind === "move-rule" && drag.targetId) {
      useRuleCards.getState().moveCard(
        drag.targetId,
        Math.round((drag.ox ?? 0) + dx),
        Math.round((drag.oy ?? 0) + dy),
      );
    } else if (drag.kind === "move-shader" && drag.targetId) {
      useShaderGraph.getState().moveGraph(
        drag.targetId,
        Math.round((drag.ox ?? 0) + dx),
        Math.round((drag.oy ?? 0) + dy),
      );
    } else if (drag.kind === "move-shader-node" && drag.targetId) {
      const [gid, nid] = drag.targetId.split("|");
      if (gid && nid) {
        useShaderGraph.getState().moveNode(
          gid,
          nid,
          Math.round((drag.ox ?? 0) + dx),
          Math.round((drag.oy ?? 0) + dy),
        );
      }
    } else if (drag.kind === "move-parallax" && drag.targetId) {
      state.moveParallax(drag.targetId, Math.round((drag.ox ?? 0) + dx), Math.round((drag.oy ?? 0) + dy));
    } else if (drag.kind === "move-dest" && drag.targetId) {
      const d = state.destructibles.find((x) => x.id === drag.targetId);
      if (d) {
        useStudio.setState({
          destructibles: state.destructibles.map((x) =>
            x.id === drag.targetId
              ? { ...x, x: Math.round((drag.ox ?? 0) + dx), y: Math.round((drag.oy ?? 0) + dy) }
              : x,
          ),
        });
      }
    } else if (drag.kind === "move-viewport" && drag.targetId) {
      useWaveA.getState().updateViewport(drag.targetId, {
        x: Math.round((drag.ox ?? 0) + dx),
        y: Math.round((drag.oy ?? 0) + dy),
      });
    } else if (drag.kind === "move-stamp" && drag.targetId) {
      useWaveA.getState().updateStamp(drag.targetId, {
        x: Math.round((drag.ox ?? 0) + dx),
        y: Math.round((drag.oy ?? 0) + dy),
      });
    } else if (drag.kind === "move-district" && drag.targetId) {
      useCharacterDistrict.setState((s) => ({
        districts: s.districts.map((d) =>
          d.id === drag.targetId
            ? {
                ...d,
                x: Math.round((drag.ox ?? 0) + dx),
                y: Math.round((drag.oy ?? 0) + dy),
              }
            : d,
        ),
      }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* */
      }
    }
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (
      (drag.kind === "paint" || drag.kind === "shape") &&
      drag.artboardId
    ) {
      useSignature.getState().scheduleRebuke(drag.artboardId);
    }
    const state = useStudio.getState();
    const rect = canvas!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    // click-to-toggle shader nodes (no real drag)
    if (drag.kind === "move-shader-node" && drag.targetId) {
      const moved = Math.hypot(wx - drag.x0, wy - drag.y0);
      if (moved < 5) {
        const [gid, nid] = drag.targetId.split("|");
        if (gid && nid) {
          const g = useShaderGraph.getState().graphs.find((x) => x.id === gid);
          const n = g?.nodes.find((x) => x.id === nid);
          if (n && n.kind !== "input_tex" && n.kind !== "input_time" && n.kind !== "output") {
            useShaderGraph.getState().toggleNode(gid, nid);
            useStudio.getState().setStatus(
              `Shader · ${n.name} ${n.enabled ? "off" : "on"}`,
            );
          }
        }
      }
    }

    if (drag.kind === "mask") {
      usePlaneSystems.getState().commitMask();
      return;
    }

    if (drag.kind === "shape" && drag.artboardId && drag.shape) {
      const b = state.artboards.find((a) => a.id === drag.artboardId);
      if (b) {
        state.commitShape(
          drag.shape,
          drag.artboardId,
          Math.floor(drag.x0 - b.x),
          Math.floor(drag.y0 - b.y),
          Math.floor(wx - b.x),
          Math.floor(wy - b.y),
        );
      }
      state.setDragPreview(null);
      return;
    }

    if (drag.kind === "marquee" && drag.artboardId) {
      const b = state.artboards.find((a) => a.id === drag.artboardId);
      if (b) {
        const x0 = Math.floor(Math.min(drag.x0, wx) - b.x);
        const y0 = Math.floor(Math.min(drag.y0, wy) - b.y);
        const x1 = Math.floor(Math.max(drag.x0, wx) - b.x);
        const y1 = Math.floor(Math.max(drag.y0, wy) - b.y);
        state.setSelection({
          artboardId: drag.artboardId,
          x: x0,
          y: y0,
          w: Math.max(1, x1 - x0),
          h: Math.max(1, y1 - y0),
        });
      }
      state.setDragPreview(null);
      return;
    }

    if (drag.kind === "anim-region") {
      const x = Math.min(drag.x0, wx);
      const y = Math.min(drag.y0, wy);
      const w = Math.abs(wx - drag.x0);
      const h = Math.abs(wy - drag.y0);
      if (w > 4 && h > 4) state.createAnimRegion(x, y, w, h);
      state.setDragPreview(null);
      return;
    }

    if (drag.kind === "particle") {
      const x = Math.min(drag.x0, wx);
      const y = Math.min(drag.y0, wy);
      const w = Math.abs(wx - drag.x0);
      const h = Math.abs(wy - drag.y0);
      if (w > 4 && h > 4) state.createParticle(x, y, w, h);
      state.setDragPreview(null);
      return;
    }

    if (drag.kind === "wire-zone") {
      const x = Math.min(drag.x0, wx);
      const y = Math.min(drag.y0, wy);
      const w = Math.abs(wx - drag.x0);
      const h = Math.abs(wy - drag.y0);
      if (w > 16 && h > 16) {
        const cat = state.activeConnector || "characters";
        if (state.activeConnector && state.engineProject) {
          state.beginWireConnect({
            draft: { x, y, w, h },
            category: cat,
            screenX: e.clientX,
            screenY: e.clientY,
          });
        } else {
          state.createWireZone(x, y, w, h, cat);
        }
      }
      state.setDragPreview(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    useStudio.getState().zoomAt(factor, sx, sy);
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const tool = useStudio((s) => s.tool);
  const spacePan = useStudio((s) => s.spacePan);
  const cursor =
    spacePan || tool === "pan"
      ? "grab"
      : tool === "brush" || tool === "eraser"
        ? "crosshair"
        : tool === "move"
          ? "move"
          : "default";

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-[#0b0d12]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onContextMenu={onContextMenu}
      />
    </div>
  );
}
