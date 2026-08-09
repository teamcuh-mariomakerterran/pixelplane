// @ts-nocheck
import { useEffect, useRef } from "react";
import { useStudio } from "@/store/studio";
import { Map as MapIcon } from "lucide-react";

type MiniMeta = { minX: number; minY: number; scale: number; ox: number; oy: number };

/** Outer bezel size (3× pixel frame). Canvas sits inset so chrome is never covered. */
const FRAME_W = 189;
const FRAME_H = 192;
const INSET = 16;

/**
 * Always-on plane minimap — click to jump the camera.
 * Pixel frame is an overlay bezel; map draws only in the hollow center.
 */
export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metaRef = useRef<MiniMeta | null>(null);
  const artboards = useStudio((s) => s.artboards);
  const zones = useStudio((s) => s.wireZones);
  const anims = useStudio((s) => s.animRegions);
  const parallax = useStudio((s) => s.parallaxStacks);
  const camera = useStudio((s) => s.camera);
  const setCamera = useStudio((s) => s.setCamera);

  const W = FRAME_W - INSET * 2;
  const H = FRAME_H - INSET * 2;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = W * dpr;
    c.height = H * dpr;
    c.style.width = `${W}px`;
    c.style.height = `${H}px`;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    let minX = -200,
      minY = -200,
      maxX = 1600,
      maxY = 1200;
    const expand = (x: number, y: number, w: number, h: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    };
    for (const b of artboards) expand(b.x, b.y, b.width, b.height);
    for (const z of zones) expand(z.x, z.y, z.w, z.h);
    for (const a of anims) expand(a.x, a.y, a.frameW, a.frameH);
    for (const p of parallax) expand(p.x, p.y, p.viewW, p.viewH);

    const pad = 300;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    const worldW = Math.max(1, maxX - minX);
    const worldH = Math.max(1, maxY - minY);
    const scale = Math.min(W / worldW, H / worldH);
    const ox = (W - worldW * scale) / 2;
    const oy = (H - worldH * scale) / 2;
    const tx = (x: number) => ox + (x - minX) * scale;
    const ty = (y: number) => oy + (y - minY) * scale;

    ctx.fillStyle = "#0c0e14";
    ctx.fillRect(0, 0, W, H);

    for (const z of zones) {
      ctx.fillStyle = z.color + "33";
      ctx.strokeStyle = z.color + "99";
      ctx.lineWidth = 1;
      ctx.fillRect(tx(z.x), ty(z.y), z.w * scale, z.h * scale);
      ctx.strokeRect(tx(z.x), ty(z.y), z.w * scale, z.h * scale);
    }

    for (const b of artboards) {
      ctx.fillStyle = "rgba(232,168,56,0.55)";
      ctx.fillRect(tx(b.x), ty(b.y), Math.max(2, b.width * scale), Math.max(2, b.height * scale));
    }

    for (const a of anims) {
      ctx.fillStyle = "rgba(167,139,250,0.7)";
      ctx.fillRect(tx(a.x), ty(a.y), Math.max(2, a.frameW * scale), Math.max(2, a.frameH * scale));
    }

    for (const p of parallax) {
      ctx.fillStyle = "rgba(129,140,248,0.55)";
      ctx.fillRect(tx(p.x), ty(p.y), Math.max(3, p.viewW * scale), Math.max(3, p.viewH * scale));
    }

    ctx.strokeStyle = "rgba(232,168,56,0.45)";
    ctx.beginPath();
    ctx.moveTo(tx(0), 0);
    ctx.lineTo(tx(0), H);
    ctx.moveTo(0, ty(0));
    ctx.lineTo(W, ty(0));
    ctx.stroke();

    const vw = (typeof window !== "undefined" ? window.innerWidth - 360 : 1000) / camera.zoom;
    const vh = (typeof window !== "undefined" ? window.innerHeight - 80 : 700) / camera.zoom;
    const vx = -camera.x / camera.zoom;
    const vy = -camera.y / camera.zoom;
    ctx.strokeStyle = "#e8a838";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx(vx), ty(vy), vw * scale, vh * scale);

    metaRef.current = { minX, minY, scale, ox, oy };
  }, [artboards, zones, anims, parallax, camera, W, H]);

  const onClick = (e: React.MouseEvent) => {
    const c = canvasRef.current;
    const m = metaRef.current;
    if (!c || !m) return;
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = m.minX + (mx - m.ox) / m.scale;
    const worldY = m.minY + (my - m.oy) / m.scale;
    const vw = window.innerWidth - 360;
    const vh = window.innerHeight - 80;
    setCamera({
      x: vw / 2 - worldX * camera.zoom,
      y: vh / 2 - worldY * camera.zoom,
    });
  };

  return (
    <div className="absolute bottom-8 right-2 z-20 flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg-elevated/95 shadow-xl backdrop-blur-md">
      {/* Title bar — always above the map, never covered */}
      <div className="relative z-20 flex shrink-0 items-center gap-1 border-b border-border bg-bg-elevated px-2 py-1 text-[10px] font-medium text-muted">
        <MapIcon size={11} className="text-accent" />
        Plane map
        <span className="ml-auto font-mono text-[9px] text-subtle">
          {camera.zoom < 0.1
            ? `${(camera.zoom * 100).toFixed(1)}%`
            : `${Math.round(camera.zoom * 100)}%`}
        </span>
      </div>

      {/* Bezel + map: frame overlay sits on top so chrome is never covered by the map */}
      <div
        className="relative shrink-0 bg-[#0c0e14]"
        style={{ width: FRAME_W, height: FRAME_H }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={onClick}
          className="absolute cursor-crosshair"
          style={{
            left: INSET,
            top: INSET,
            width: W,
            height: H,
          }}
          title="Click to jump"
        />
        <img
          src="/pixel-icons/ui/mini_map_frame_hollow.png"
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full select-none"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}
