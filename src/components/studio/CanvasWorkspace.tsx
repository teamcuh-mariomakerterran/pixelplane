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
import { useCollab } from "@/store/collab";
import { useMemoryWeb } from "@/store/memory-web";
import { useSignature } from "@/store/signature";
import { useSoundSprites } from "@/store/sound-sprites";
import { useRuleCards, whenLabel, thenLabel } from "@/store/rule-cards";
import { compositeLayers, bufferToImageData } from "@/lib/pixel/buffer";
import { wireZoneHeat, worldCenterFromCamera } from "@/lib/spatial/wave-a";
import { zoneWorld, padWorld } from "@/lib/character-district/layout";
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
        | "move-district";
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

const boardCache = new Map<string, { rev: string; canvas: HTMLCanvasElement }>();
const animCache = new Map<string, { key: string; canvas: HTMLCanvasElement }>();
const ghostImgCache = new Map<string, HTMLImageElement>();

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
}) {
  const key = boardRevKey(b);
  const hit = boardCache.get(b.id);
  if (hit && hit.rev === key) return hit.canvas;
  const c = document.createElement("canvas");
  c.width = b.width;
  c.height = b.height;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const buf = compositeLayers(b.layers, b.width, b.height);
  ctx.putImageData(bufferToImageData(buf, b.width, b.height), 0, 0);
  boardCache.set(b.id, { rev: key, canvas: c });
  return c;
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
  ctx.putImageData(bufferToImageData(frame.data, anim.frameW, anim.frameH), 0, 0);
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

      // Parallax stacks
      for (const px of state.parallaxStacks) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(px.x, px.y, px.viewW, px.viewH);
        ctx.clip();
        ctx.fillStyle = "rgba(20,24,40,0.85)";
        ctx.fillRect(px.x, px.y, px.viewW, px.viewH);
        const t = Date.now() / 1000;
        for (const L of px.layers) {
          if (L.visible === false) continue;
          const board = L.artboardId
            ? state.artboards.find((b) => b.id === L.artboardId)
            : null;
          const scrollX = (L.scrollScaleX ?? L.depth ?? L.speedX ?? 0.5) * (px.autoPreview ? t * 40 : 0);
          const scrollY = (L.scrollScaleY ?? L.depth ?? L.speedY ?? 0.5) * (px.autoPreview ? t * 10 : 0);
          if (board) {
            const c = getBoardCanvas(board);
            ctx.drawImage(
              c,
              px.x + (L.offsetX ?? 0) - (scrollX % Math.max(1, board.width)),
              px.y + (L.offsetY ?? 0) - (scrollY % Math.max(1, board.height)),
            );
          } else {
            ctx.fillStyle = hexAlpha("#818cf8", 0.15 + (L.depth ?? 0.5) * 0.2);
            ctx.fillRect(
              px.x + ((L.offsetX ?? 0) - scrollX * 0.1),
              px.y + (L.offsetY ?? 0),
              px.viewW,
              px.viewH * 0.4,
            );
          }
        }
        ctx.restore();
        ctx.strokeStyle =
          px.id === state.activeParallaxId ? "rgba(129,140,248,0.95)" : "rgba(129,140,248,0.5)";
        ctx.lineWidth = 1.5 / cam.zoom;
        ctx.strokeRect(px.x, px.y, px.viewW, px.viewH);
        if (cam.zoom > 0.2) {
          labels.push({
            text: `${px.name} · ${px.mode}`,
            x: cam.x + px.x * cam.zoom,
            y: cam.y + px.y * cam.zoom - 4,
            color: "rgba(129,140,248,0.95)",
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
            const c = getBoardCanvas(b);
            ctx.drawImage(c, b.x, b.y);
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

      // Particles
      for (const p of state.particles) {
        const active = p.id === state.activeParticleId;
        ctx.fillStyle = hexAlpha(p.color || "#2dd4bf", 0.12);
        ctx.strokeStyle = active ? p.color || "#2dd4bf" : hexAlpha(p.color || "#2dd4bf", 0.55);
        ctx.lineWidth = 1.25 / cam.zoom;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeRect(p.x, p.y, p.w, p.h);
        // simple sparkle dots
        if (p.playing !== false) {
          const n = 12;
          const t = Date.now() / 400;
          ctx.fillStyle = hexAlpha(p.color || "#2dd4bf", 0.7);
          for (let i = 0; i < n; i++) {
            const px = p.x + ((Math.sin(t + i * 1.7) * 0.5 + 0.5) * p.w);
            const py = p.y + ((Math.cos(t * 0.8 + i) * 0.5 + 0.5) * p.h);
            ctx.fillRect(px, py, 2 / cam.zoom, 2 / cam.zoom);
          }
        }
        if (cam.zoom > 0.3) {
          labels.push({
            text: `${p.name || p.kind}`,
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

      // Destructibles
      for (const d of state.destructibles) {
        const stage = currentStage(d);
        const ratio = d.hp / Math.max(1, d.maxHp);
        ctx.fillStyle = hexAlpha(d.color, 0.35 + ratio * 0.4);
        ctx.strokeStyle =
          d.id === state.activeDestructibleId ? "#fff" : hexAlpha(d.color, 0.9);
        ctx.lineWidth = 1.25 / cam.zoom;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeRect(d.x, d.y, d.w, d.h);
        // hp bar
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(d.x, d.y - 6 / cam.zoom, d.w, 3 / cam.zoom);
        ctx.fillStyle = ratio > 0.5 ? "#4ecb71" : ratio > 0.2 ? "#e8a838" : "#e85d5d";
        ctx.fillRect(d.x, d.y - 6 / cam.zoom, d.w * ratio, 3 / cam.zoom);
        if (cam.zoom > 0.35) {
          labels.push({
            text: `${d.name} · ${stage?.label ?? ""}`,
            x: cam.x + d.x * cam.zoom,
            y: cam.y + d.y * cam.zoom - 10,
            color: "rgba(249,115,22,0.95)",
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

    // Select / move hits
    if (tool === "select" || tool === "move") {
      // viewports
      const wave = useWaveA.getState();
      for (let i = wave.gameViewports.length - 1; i >= 0; i--) {
        const vp = wave.gameViewports[i]!;
        if (wx >= vp.x && wx <= vp.x + vp.w && wy >= vp.y && wy <= vp.y + vp.h) {
          wave.selectViewport(vp.id);
          dragRef.current = {
            kind: "move-viewport",
            x0: wx,
            y0: wy,
            lastX: wx,
            lastY: wy,
            targetId: vp.id,
            ox: vp.x,
            oy: vp.y,
          };
          return;
        }
      }
      for (let i = wave.constraintStamps.length - 1; i >= 0; i--) {
        const st = wave.constraintStamps[i]!;
        const swW = st.pixelW * st.scale;
        const shH = st.pixelH * st.scale;
        if (wx >= st.x && wx <= st.x + swW && wy >= st.y && wy <= st.y + shH) {
          wave.setActiveStamp(st.id);
          dragRef.current = {
            kind: "move-stamp",
            x0: wx,
            y0: wy,
            lastX: wx,
            lastY: wy,
            targetId: st.id,
            ox: st.x,
            oy: st.y,
          };
          return;
        }
      }
      // districts
      const dists = useCharacterDistrict.getState().districts;
      for (let i = dists.length - 1; i >= 0; i--) {
        const d = dists[i]!;
        if (wx >= d.x && wx <= d.x + d.w && wy >= d.y && wy <= d.y + d.h) {
          useCharacterDistrict.getState().selectDistrict(d.id);
          if (tool === "move") {
            dragRef.current = {
              kind: "move-district",
              x0: wx,
              y0: wy,
              lastX: wx,
              lastY: wy,
              targetId: d.id,
              ox: d.x,
              oy: d.y,
            };
          }
          return;
        }
      }
      for (const d of state.destructibles) {
        if (wx >= d.x && wx <= d.x + d.w && wy >= d.y && wy <= d.y + d.h) {
          state.selectDestructible(d.id);
          if (tool === "move") {
            dragRef.current = {
              kind: "move-dest",
              x0: wx,
              y0: wy,
              lastX: wx,
              lastY: wy,
              targetId: d.id,
              ox: d.x,
              oy: d.y,
            };
          }
          return;
        }
      }
      for (const q of state.questTrees) {
        if (wx >= q.x && wx <= q.x + q.w && wy >= q.y && wy <= q.y + q.h) {
          state.selectQuestTree(q.id);
          if (tool === "move") {
            dragRef.current = {
              kind: "move-quest",
              x0: wx,
              y0: wy,
              lastX: wx,
              lastY: wy,
              targetId: q.id,
              ox: q.x,
              oy: q.y,
            };
          }
          return;
        }
      }
      for (const z of state.wireZones) {
        if (wx >= z.x && wx <= z.x + z.w && wy >= z.y && wy <= z.y + z.h) {
          state.selectWireZone(z.id);
          if (state.activeConnector) {
            state.beginWireConnect({
              zoneId: z.id,
              category: state.activeConnector,
              screenX: e.clientX,
              screenY: e.clientY,
            });
          }
          if (tool === "move") {
            dragRef.current = {
              kind: "move-zone",
              x0: wx,
              y0: wy,
              lastX: wx,
              lastY: wy,
              targetId: z.id,
              ox: z.x,
              oy: z.y,
            };
          }
          return;
        }
      }
      for (const p of state.parallaxStacks) {
        if (wx >= p.x && wx <= p.x + p.viewW && wy >= p.y && wy <= p.y + p.viewH) {
          state.selectParallax(p.id);
          if (tool === "move") {
            dragRef.current = {
              kind: "move-parallax",
              x0: wx,
              y0: wy,
              lastX: wx,
              lastY: wy,
              targetId: p.id,
              ox: p.x,
              oy: p.y,
            };
          }
          return;
        }
      }
      for (const a of state.animRegions) {
        if (wx >= a.x && wx <= a.x + a.frameW && wy >= a.y && wy <= a.y + a.frameH) {
          state.selectAnim(a.id);
          if (tool === "move") {
            dragRef.current = {
              kind: "move-anim",
              x0: wx,
              y0: wy,
              lastX: wx,
              lastY: wy,
              targetId: a.id,
              ox: a.x,
              oy: a.y,
            };
          }
          return;
        }
      }
      for (const p of state.particles) {
        if (wx >= p.x && wx <= p.x + p.w && wy >= p.y && wy <= p.y + p.h) {
          state.selectParticle(p.id);
          if (tool === "move") {
            dragRef.current = {
              kind: "move-particle",
              x0: wx,
              y0: wy,
              lastX: wx,
              lastY: wy,
              targetId: p.id,
              ox: p.x,
              oy: p.y,
            };
          }
          return;
        }
      }
      for (const actor of state.actors) {
        const anim = state.animRegions.find((a) => a.id === actor.animId);
        const fw = (anim?.frameW ?? 16) * (actor.scale ?? 1);
        const fh = (anim?.frameH ?? 16) * (actor.scale ?? 1);
        if (wx >= actor.x && wx <= actor.x + fw && wy >= actor.y && wy <= actor.y + fh) {
          if (tool === "move") {
            dragRef.current = {
              kind: "move-actor",
              x0: wx,
              y0: wy,
              lastX: wx,
              lastY: wy,
              targetId: actor.id,
              ox: actor.x,
              oy: actor.y,
            };
          }
          return;
        }
      }
      const board = hitArtboard(wx, wy);
      if (board) {
        state.selectArtboard(board.id);
        if (tool === "move") {
          dragRef.current = {
            kind: "move-board",
            x0: wx,
            y0: wy,
            lastX: wx,
            lastY: wy,
            targetId: board.id,
            ox: board.x,
            oy: board.y,
          };
        }
        return;
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
    const state = useStudio.getState();
    const rect = canvas!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

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
