/**
 * Indoor presentation — floors, trim, furniture silhouettes, light shafts.
 * Vault fixtures stay the data; this is how the house looks.
 */

import type { FixtureDef, RoomDef } from "@/lib/vault/types";
import type { IndoorBits } from "./house-memory";
import { roomIsLit } from "./house-memory";
import { connectorsFor } from "./vault-runtime";

function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function floorKind(room: RoomDef): "wood" | "tile" | "concrete" | "carpet" {
  const n = room.name.toLowerCase();
  if (n.includes("kitchen")) return "tile";
  if (n.includes("base") || n.includes("cellar")) return "concrete";
  if (n.includes("bed") || n.includes("hall")) return "carpet";
  return "wood";
}

function drawFloor(ctx: CanvasRenderingContext2D, room: RoomDef, t: number, lit: boolean) {
  const kind = floorKind(room);
  const { x, y, w, h } = room;
  if (kind === "wood") {
    ctx.fillStyle = lit ? "#3c322c" : "#1c1614";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = lit ? "rgba(70,54,42,0.85)" : "rgba(30,24,20,0.8)";
    ctx.lineWidth = 1;
    for (let yy = y + 6; yy < y + h; yy += 7) {
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
      ctx.stroke();
      for (let xx = x + 18 + ((yy / 7) % 2) * 22; xx < x + w; xx += 44) {
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, Math.min(y + h, yy + 7));
        ctx.stroke();
      }
    }
  } else if (kind === "tile") {
    ctx.fillStyle = lit ? "#3a3c40" : "#18191c";
    ctx.fillRect(x, y, w, h);
    const ts = 8;
    for (let ty = 0; ty < h; ty += ts) {
      for (let tx = 0; tx < w; tx += ts) {
        const on = ((tx / ts + ty / ts) & 1) === 0;
        ctx.fillStyle = on
          ? lit
            ? "rgba(72,76,82,0.55)"
            : "rgba(28,30,34,0.5)"
          : lit
            ? "rgba(48,50,54,0.4)"
            : "rgba(16,16,18,0.4)";
        ctx.fillRect(x + tx, y + ty, ts - 0.5, ts - 0.5);
      }
    }
  } else if (kind === "concrete") {
    ctx.fillStyle = lit ? "#2a2826" : "#121110";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(20,18,16,0.45)";
    for (let i = 0; i < 14; i++) {
      const sx = x + hash01(i + 2) * w;
      const sy = y + hash01(i + 9) * h;
      ctx.fillRect(sx, sy, 6 + hash01(i) * 10, 3);
    }
    // pipes
    ctx.strokeStyle = "rgba(80,70,58,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 8);
    ctx.lineTo(x + w - 4, y + 8);
    ctx.stroke();
    ctx.fillStyle = "rgba(40,36,30,0.7)";
    ctx.fillRect(x + 10, y + 6, 5, 14);
  } else {
    ctx.fillStyle = lit ? "#3a2e34" : "#1a1418";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = lit ? "rgba(90,60,70,0.18)" : "rgba(40,24,30,0.2)";
    ctx.fillRect(x + 8, y + 10, w - 16, h - 20);
  }

  // baseboards
  ctx.fillStyle = lit ? "rgba(22,18,16,0.75)" : "rgba(8,6,6,0.8)";
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - 3, y, 3, h);

  // ambient dust
  if (lit) {
    for (let i = 0; i < 6; i++) {
      const px = x + ((hash01(i + t * 0.04) * w) % w);
      const py = y + ((hash01(i + 4 + t * 0.03) * h) % h);
      ctx.fillStyle = `rgba(255,230,190,${0.08 + 0.08 * hash01(i + 3)})`;
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

function drawFurniture(
  ctx: CanvasRenderingContext2D,
  f: FixtureDef,
  bits: IndoorBits,
  t: number,
  dayPhase: number,
) {
  const on = !!bits.activated[f.id];
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  const n = f.name.toLowerCase();

  if (f.mode === "window") {
    const night = dayPhase > 0.58 && dayPhase < 0.92;
    ctx.fillStyle = night ? "#1a2840" : "#8eb4d4";
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = "rgba(220,200,160,0.7)";
    ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
    ctx.beginPath();
    ctx.moveTo(cx, f.y);
    ctx.lineTo(cx, f.y + f.h);
    ctx.moveTo(f.x, cy);
    ctx.lineTo(f.x + f.w, cy);
    ctx.stroke();
    // light shaft
    if (!night) {
      const g = ctx.createLinearGradient(cx, f.y + f.h, cx + 18, f.y + f.h + 36);
      g.addColorStop(0, "rgba(220,230,255,0.22)");
      g.addColorStop(1, "rgba(220,230,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(f.x + 2, f.y + f.h);
      ctx.lineTo(f.x + f.w - 2, f.y + f.h);
      ctx.lineTo(f.x + f.w + 16, f.y + f.h + 38);
      ctx.lineTo(f.x - 8, f.y + f.h + 38);
      ctx.fill();
    }
    return;
  }

  if (n.includes("couch") || n.includes("chair")) {
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x, f.y + 4, f.w, f.h - 4);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(f.x, f.y, 6, f.h);
    ctx.fillRect(f.x + f.w - 6, f.y, 6, f.h);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(f.x + 8, f.y + 5, (f.w - 18) / 2 - 1, f.h * 0.45);
    ctx.fillRect(cx + 1, f.y + 5, (f.w - 18) / 2 - 1, f.h * 0.45);
    return;
  }

  if (n.includes("tv") || n.includes("set")) {
    ctx.fillStyle = "#14161c";
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = on ? `rgba(140,200,255,${0.35 + 0.2 * Math.sin(t * 9)})` : "#0a0c12";
    ctx.fillRect(f.x + 2, f.y + 2, f.w - 4, f.h - 7);
    if (on) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(f.x + 3, f.y + 4 + i * 5, f.w - 6, 1);
      }
    }
    ctx.fillStyle = "#2a2c32";
    ctx.fillRect(f.x + f.w * 0.3, f.y + f.h - 5, f.w * 0.4, 5);
    return;
  }

  if (n.includes("fridge")) {
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(f.x + 2, f.y + 2, f.w - 4, f.h * 0.38);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(f.x + f.w - 4, f.y + 8, 2, 10);
    if (on) {
      ctx.fillStyle = "rgba(255,240,200,0.35)";
      ctx.fillRect(f.x + f.w, f.y + 4, 10, f.h - 8);
    }
    return;
  }

  if (n.includes("bed") || n.includes("mattress")) {
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = "rgba(230,220,210,0.85)";
    ctx.fillRect(f.x + 2, f.y + 2, f.w * 0.35, f.h - 4);
    ctx.fillStyle = "rgba(80,50,60,0.55)";
    ctx.fillRect(f.x + f.w * 0.38, f.y + 3, f.w * 0.58, f.h - 6);
    return;
  }

  if (f.mode === "stair") {
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = "rgba(232,168,56,0.55)";
    for (let i = 0; i < 4; i++) {
      const yy = f.y + 3 + i * (f.h / 4);
      ctx.beginPath();
      ctx.moveTo(f.x + 2, yy);
      ctx.lineTo(f.x + f.w - 2, yy + 2);
      ctx.stroke();
    }
    if (f.locked && !bits.unlocked[f.id]) {
      ctx.fillStyle = "rgba(232,168,56,0.7)";
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
    }
    return;
  }

  if (f.phone) {
    const pulse = bits.phoneRinging ? 0.45 + 0.5 * Math.abs(Math.sin(t * 10)) : 0;
    if (pulse) {
      ctx.fillStyle = `rgba(232,93,93,${pulse})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(cx, cy + 1, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(f.x + 2, f.y, f.w - 4, 4);
    return;
  }

  if (n.includes("sink")) {
    ctx.fillStyle = "#6a7278";
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = "#2a3034";
    ctx.fillRect(f.x + 3, f.y + 4, f.w - 6, f.h - 8);
    ctx.fillStyle = "#c8c4bc";
    ctx.fillRect(cx - 1, f.y + 1, 2, 5);
    return;
  }

  if (n.includes("closet") || n.includes("dresser") || n.includes("crate")) {
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.strokeRect(f.x + 2, f.y + 3, f.w / 2 - 3, f.h - 6);
    ctx.strokeRect(cx + 1, f.y + 3, f.w / 2 - 3, f.h - 6);
    return;
  }

  // default block + label plate
  ctx.fillStyle = on ? "#d4e8ff" : f.color;
  ctx.fillRect(f.x, f.y, f.w, f.h);
  ctx.strokeStyle = on ? "rgba(210,230,255,0.9)" : "rgba(232,216,180,0.4)";
  ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
}

export function drawIndoorRoom(
  ctx: CanvasRenderingContext2D,
  bits: IndoorBits,
  t: number,
  dayPhase: number,
  worldW: number,
  worldH: number,
  zoom: number,
) {
  const room = bits.rooms.find((r) => r.id === bits.roomId);
  const lit = room ? roomIsLit(bits, bits.roomId) : true;

  ctx.fillStyle = "rgba(4,4,8,0.88)";
  if (room) {
    ctx.beginPath();
    ctx.rect(-24, -24, worldW + 48, worldH + 48);
    ctx.rect(room.x, room.y, room.w, room.h);
    ctx.fill("evenodd");
    drawFloor(ctx, room, t, lit);
    ctx.strokeStyle = "rgba(232,168,56,0.28)";
    ctx.strokeRect(room.x + 0.5, room.y + 0.5, room.w - 1, room.h - 1);
  }

  if (room && !lit) {
    ctx.fillStyle = "rgba(4,3,8,0.45)";
    ctx.fillRect(room.x, room.y, room.w, room.h);
  }

  if (bits.lastSit && bits.lastSit.roomId === bits.roomId) {
    ctx.fillStyle = "rgba(192,132,252,0.22)";
    ctx.beginPath();
    ctx.ellipse(bits.lastSit.x, bits.lastSit.y, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const c of bits.crumbs ?? []) {
    if (c.roomId !== bits.roomId) continue;
    ctx.fillStyle = "rgba(180,140,80,0.7)";
    ctx.fillRect(c.x - 1, c.y - 1, 2, 2);
  }

  for (const door of connectorsFor(bits)) {
    ctx.fillStyle = door.locked ? "rgba(232,168,56,0.35)" : "rgba(62,207,207,0.4)";
    ctx.beginPath();
    ctx.ellipse(door.x, door.y, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = door.locked ? "rgba(232,168,56,0.7)" : "rgba(180,240,240,0.7)";
    ctx.stroke();
  }

  const sorted = [...bits.fixtures].sort((a, b) => a.z - b.z || a.y - b.y);
  for (const f of sorted) {
    if (f.roomId !== bits.roomId || bits.gone[f.id]) continue;
    if (f.hiddenUntil && !bits.activated[f.hiddenUntil]) continue;
    ctx.globalAlpha = lit ? 1 : 0.4;
    drawFurniture(ctx, f, bits, t, dayPhase);
    if (f.w >= 12 && zoom > 0.55) {
      ctx.fillStyle = "rgba(255,236,210,0.72)";
      ctx.font = "7px ui-sans-serif";
      ctx.fillText(f.name.slice(0, 16), f.x + 1, f.y - 2);
    }
    if (f.base || f.solid) {
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.strokeRect(f.x, f.y, f.w, f.h);
    }
    ctx.globalAlpha = 1;
  }

  for (const L of bits.lights) {
    if (L.roomId !== bits.roomId) continue;
    if (bits.lightsOn[L.id] === false) continue;
    const flick =
      L.flicker === "none"
        ? 1
        : L.flicker === "regular"
          ? 0.55 + 0.45 * (Math.sin(t * 14) * 0.5 + 0.5)
          : 0.35 + 0.65 * (hash01(Math.floor(t * (L.flickerMutate ? 9 : 6))) > 0.55 ? 1 : 0.25);
    const tvOn = bits.fixtures.some(
      (f) => bits.activated[f.id] && Math.hypot(f.x - L.x, f.y - L.y) < 40,
    );
    const str = L.strength * flick * (L.color === "#7ec8ff" && !tvOn ? 0.18 : 1);
    const g = ctx.createRadialGradient(L.x, L.y, 2, L.x, L.y, L.feather);
    g.addColorStop(0, `rgba(200,230,255,${0.42 * str})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(L.x, L.y, L.feather, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const r of bits.roaches ?? []) {
    if (r.roomId !== bits.roomId) continue;
    ctx.fillStyle = "#2a1c14";
    ctx.fillRect(r.x - 2, r.y - 1, 4, 2);
    ctx.fillRect(r.x + 2, r.y - 1, 1, 1);
  }

  if (room && zoom > 0.4) {
    ctx.fillStyle = "rgba(232,168,56,0.9)";
    ctx.font = "8px ui-sans-serif";
    const floor =
      typeof room.floor === "number" ? (room.floor < 0 ? "B1" : `F${room.floor}`) : "";
    ctx.fillText(
      `${room.name}${floor ? " · " + floor : ""}${lit ? "" : " · dark"}`,
      room.x + 5,
      room.y + 11,
    );
    if (room.ambient) {
      ctx.fillStyle = "rgba(180,170,150,0.55)";
      ctx.font = "6px ui-sans-serif";
      ctx.fillText(room.ambient, room.x + 5, room.y + 19);
    }
  }
}

export function drawDarkCone(
  ctx: CanvasRenderingContext2D,
  room: RoomDef,
  px: number,
  py: number,
  rot: number,
  lit: boolean,
) {
  if (lit) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(room.x, room.y, room.w, room.h);
  ctx.clip();
  const g = ctx.createRadialGradient(px, py, 4, px, py, 52);
  g.addColorStop(0, "rgba(255,220,160,0.16)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, 52, rot - 0.55, rot + 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
