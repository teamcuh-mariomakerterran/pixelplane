/**
 * NeonPurr VFX sheet pack — authored contact sheets from the Gridpaw bible.
 * Dropped as sourceUrl boards (no IDB pixel dump).
 */

import { useStudio } from "@/store/studio";
import { stampTimeline } from "@/store/timeline";

export type NeonKind = "explosion" | "debris" | "spark" | "beam" | "energy";

export type NeonSheet = {
  file: string;
  name: string;
  kind: NeonKind;
};

const KIND_RANGE: { kind: NeonKind; label: string; from: number; to: number }[] = [
  { kind: "explosion", label: "Explosion", from: 1, to: 22 },
  { kind: "debris", label: "Debris", from: 23, to: 40 },
  { kind: "spark", label: "Spark", from: 41, to: 55 },
  { kind: "beam", label: "Beam", from: 56, to: 70 },
  { kind: "energy", label: "Energy", from: 71, to: 85 },
];

function kindOf(i: number): { kind: NeonKind; label: string } {
  const hit = KIND_RANGE.find((r) => i >= r.from && i <= r.to) ?? KIND_RANGE[4]!;
  return { kind: hit.kind, label: hit.label };
}

export const NEONPURR_SHEETS: NeonSheet[] = Array.from({ length: 85 }, (_, n) => {
  const i = n + 1;
  const { kind, label } = kindOf(i);
  return {
    file: `np_${String(i).padStart(3, "0")}.png`,
    name: `NeonPurr · ${label} ${String(i).padStart(2, "0")}`,
    kind,
  };
});

export const NEONPURR_BASE = "/vfx/neonpurr";

/** Display size on the plane (native 1168×784). */
const DW = 292;
const DH = 196;
const GAP = 16;
const COLS = 8;

export function summonNeonPurrVfx(): number {
  const studio = useStudio.getState();
  useStudio.setState((st) => ({
    artboards: st.artboards.map((b) =>
      b.sourceUrl?.includes("/vfx/neonpurr/") && b.sourceUrl.endsWith(".jpg")
        ? { ...b, sourceUrl: b.sourceUrl.replace(/\.jpg$/, ".png") }
        : b,
    ),
  }));
  const existing = new Set(
    useStudio
      .getState()
      .artboards.filter((b) => b.sourceUrl?.includes("/vfx/neonpurr/"))
      .map((b) => b.sourceUrl),
  );
  const cam = studio.camera;
  const z = cam.zoom || 1;
  const ox = (-cam.x + 80) / z;
  const oy = (-cam.y + 60) / z;

  let n = 0;
  for (let i = 0; i < NEONPURR_SHEETS.length; i++) {
    const item = NEONPURR_SHEETS[i]!;
    const url = `${NEONPURR_BASE}/${item.file}`;
    if (existing.has(url)) continue;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    studio.addArtboard({
      name: item.name,
      x: Math.round(ox + col * (DW + GAP)),
      y: Math.round(oy + row * (DH + GAP)),
      width: DW,
      height: DH,
      sourceUrl: url,
    });
    n++;
  }

  if (n) {
    const zw = COLS * (DW + GAP) + 24;
    const zh = Math.ceil(NEONPURR_SHEETS.length / COLS) * (DH + GAP) + 36;
    const zoneId = studio.createWireZone(ox - 20, oy - 28, zw, zh, "effects");
    if (zoneId) studio.renameWireZone(zoneId, "NeonPurr · VFX sheets");
    studio.setCamera({
      x: -ox * Math.min(0.38, z) + 40,
      y: -oy * Math.min(0.38, z) + 40,
      zoom: Math.min(0.38, z),
    });
    studio.setStatus(`NeonPurr · ${n} VFX sheets on the plane`);
    stampTimeline("NeonPurr VFX", `${n} sheets`);
  } else {
    studio.setStatus("NeonPurr sheets already on the plane");
  }
  return n;
}

export function neonPurrSmashUrls(): string[] {
  return [1, 6, 12, 18, 74, 79].map(
    (i) => `${NEONPURR_BASE}/np_${String(i).padStart(3, "0")}.jpg`,
  );
}
