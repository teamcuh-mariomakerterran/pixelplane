// @ts-nocheck
/**
 * Pack a play-project ZIP from wired canvas content.
 * This is a PixelPlane archive — not an export to another engine.
 */

import { compositeLayers } from "@/lib/pixel/buffer";
import { sheetFromFrames } from "@/lib/pixel/generate";
import { engineReadme, findFolderById, findFolderByCategory, slugify } from "./templates";
import { buildEngineParallaxPackage } from "./parallax";
import type {
  AnimRegion,
  Artboard,
  EngineProject,
  ParallaxStack,
  ParticleSystem,
  WireZone,
} from "@/lib/pixel/types";

type ExportFile = { path: string; data: Uint8Array | string };

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function u16(n: number) {
  return [n & 0xff, (n >>> 8) & 0xff];
}
function u32(n: number) {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

/** Minimal ZIP (store only, no compression). */
export function buildZip(files: ExportFile[]): Blob {
  const parts: Uint8Array[] = [];
  const central: number[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.path.replace(/\\/g, "/"));
    const data =
      typeof file.data === "string"
        ? new TextEncoder().encode(file.data)
        : file.data;
    const crc = crc32(data);
    const local: number[] = [
      0x50, 0x4b, 0x03, 0x04, // sig
      20, 0, // version
      0, 0, // flags
      0, 0, // method store
      0, 0, 0, 0, // time/date
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0), // extra
    ];
    const localHeader = new Uint8Array([...local, ...nameBytes]);
    parts.push(localHeader, data);

    const cen: number[] = [
      0x50, 0x4b, 0x01, 0x02,
      20, 0, 20, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
    ];
    central.push(...cen, ...nameBytes);
    offset += localHeader.length + data.length;
  }

  const centralDir = new Uint8Array(central);
  parts.push(centralDir);
  const end = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06,
    0, 0, 0, 0,
    ...u16(files.length),
    ...u16(files.length),
    ...u32(centralDir.length),
    ...u32(offset),
    ...u16(0),
  ]);
  parts.push(end);

  return new Blob(parts as BlobPart[], { type: "application/zip" });
}

async function pngBytes(data: Uint8ClampedArray, w: number, h: number): Promise<Uint8Array> {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
  if (!blob) return new Uint8Array();
  return new Uint8Array(await blob.arrayBuffer());
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function centerIn(
  cx: number,
  cy: number,
  zx: number,
  zy: number,
  zw: number,
  zh: number,
) {
  return cx >= zx && cy >= zy && cx < zx + zw && cy < zy + zh;
}

export type WireExportContext = {
  project: EngineProject;
  zones: WireZone[];
  artboards: Artboard[];
  animRegions: AnimRegion[];
  particles: ParticleSystem[];
  parallaxStacks: ParallaxStack[];
  questTrees?: import("@/lib/pixel/types").QuestTree[];
  destructibles?: import("@/lib/pixel/types").DestructibleProp[];
};

export async function buildEnginePackage(ctx: WireExportContext): Promise<Blob> {
  const {
    project,
    zones,
    artboards,
    animRegions,
    particles,
    parallaxStacks,
    questTrees = [],
    destructibles = [],
  } = ctx;
  const root = project.rootFolderName || slugify(project.name);
  const files: ExportFile[] = [];
  const manifest: {
    project: string;
    engine: string;
    zones: { name: string; path: string; assets: string[] }[];
    parallax: { name: string; path: string; layers: string[] }[];
    quests: { id: string; name: string; path: string }[];
    destructibles: { id: string; name: string; maxHp: number; drops: string[] }[];
    /** Gemini D: spatial membership snapshots per feed plane */
    spatialScopes: {
      zone: string;
      folder: string | null;
      artboards: string[];
      anims: string[];
      smash: string[];
    }[];
    exportedAt: string;
  } = {
    project: project.name,
    engine: project.engine,
    zones: [],
    parallax: [],
    quests: [],
    destructibles: [],
    spatialScopes: [],
    exportedAt: new Date().toISOString(),
  };

  // Always include folder stubs so empty trees still exist
  const walk = (nodes: typeof project.folders) => {
    for (const n of nodes) {
      files.push({ path: `${root}/${n.path}/.gitkeep`, data: "" });
      walk(n.children);
    }
  };
  walk(project.folders);

  const wired = zones.filter((z) => z.folderId && z.enabled);
  const { resolveSpatialOwner } = await import("@/lib/spatial/priority");

  for (const zone of wired) {
    const folder = findFolderById(project.folders, zone.folderId!);
    if (!folder) continue;
    const destBase = `${root}/${folder.path}`;
    const listed: string[] = [];

    for (const board of artboards) {
      const cx = board.x + board.width / 2;
      const cy = board.y + board.height / 2;
      // D_Scope: only export to nested owner (smallest pad), not every overlapping parent
      const own = resolveSpatialOwner(wired, cx, cy);
      if (own.owner?.id !== zone.id) continue;
      const pixels = compositeLayers(board.layers, board.width, board.height);
      const name = `${slugify(board.name)}.png`;
      let sub = "";
      if (folder.isEntityRoot && folder.children.some((c) => c.name === "main")) {
        sub = "/main";
      }
      if (folder.category === "parallax" && folder.children.some((c) => c.name === "layers")) {
        sub = "/layers";
      }
      const path = `${destBase}${sub}/${name}`;
      files.push({ path, data: await pngBytes(pixels, board.width, board.height) });
      listed.push(path);
    }

    for (const anim of animRegions) {
      const cx = anim.x + anim.frameW / 2;
      const cy = anim.y + anim.frameH / 2;
      const own = resolveSpatialOwner(wired, cx, cy);
      if (own.owner?.id !== zone.id) continue;
      const sheet = sheetFromFrames(
        anim.frames.map((f) => f.data),
        anim.frameW,
        anim.frameH,
      );
      const base = slugify(anim.name);
      let sub = "";
      if (folder.children.some((c) => c.name === "sheets")) sub = "/sheets";
      else if (folder.children.some((c) => c.name === "walk") && /walk/i.test(anim.name))
        sub = "/walk";
      else if (folder.children.some((c) => c.name === "idle") && /idle/i.test(anim.name))
        sub = "/idle";
      else if (folder.isEntityRoot && folder.children.some((c) => c.name === "main")) sub = "/main";

      const sheetPath = `${destBase}${sub}/${base}_sheet.png`;
      files.push({
        path: sheetPath,
        data: await pngBytes(sheet.data, sheet.width, sheet.height),
      });
      listed.push(sheetPath);

      for (let i = 0; i < anim.frames.length; i++) {
        const fp = `${destBase}${sub}/${base}_f${String(i).padStart(2, "0")}.png`;
        files.push({
          path: fp,
          data: await pngBytes(anim.frames[i].data, anim.frameW, anim.frameH),
        });
        listed.push(fp);
      }
    }

    for (const p of particles) {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      if (!centerIn(cx, cy, zone.x, zone.y, zone.w, zone.h)) continue;
      const metaPath = `${destBase}/${slugify(p.name)}_fx.json`;
      files.push({
        path: metaPath,
        data: JSON.stringify(
          {
            name: p.name,
            kind: p.kind,
            color: p.color,
            rate: p.rate,
            life: p.life,
            size: { w: p.w, h: p.h },
          },
          null,
          2,
        ),
      });
      listed.push(metaPath);
    }

    manifest.zones.push({
      name: zone.name,
      path: folder.path,
      assets: listed,
    });
  }

  // Spatial scope snapshot (Gemini D — canvas coords = organization)
  {
    const { scopeForZone } = await import("@/lib/spatial/scope");
    for (const zone of zones.filter((z) => z.enabled)) {
      const sc = scopeForZone(
        {
          artboards,
          animRegions,
          particles,
          destructibles: destructibles ?? [],
          questTrees: questTrees ?? [],
        },
        zone,
        { pad: 0 },
      );
      manifest.spatialScopes.push({
        zone: zone.name,
        folder: zone.folderPath,
        artboards: sc.artboards.map((b) => b.name),
        anims: sc.anims.map((a) => a.name),
        smash: sc.destructibles.map((d) => d.name),
      });
    }
    files.push({
      path: `${root}/_pixelplane/spatial_scopes.json`,
      data: JSON.stringify(
        {
          version: 1,
          doctrine:
            "Canvas coordinates are organizational structure. Asset centers inside a feed plane scope to that plane’s folder.",
          scopes: manifest.spatialScopes,
        },
        null,
        2,
      ),
    });
  }

  // Parallax stacks → engine-native config + layer PNGs
  const parallaxRoot =
    findFolderByCategory(project.folders, "parallax") ??
    ({ path: artRootFallback(project), name: "parallax" } as const);

  for (const stack of parallaxStacks) {
    let destRel = stack.folderPath;
    if (!destRel) {
      // stack center inside a wire zone?
      const cx = stack.x + stack.viewW / 2;
      const cy = stack.y + stack.viewH / 2;
      const zone = wired.find((z) => centerIn(cx, cy, z.x, z.y, z.w, z.h));
      if (zone?.folderPath) destRel = zone.folderPath;
      else destRel = `${parallaxRoot.path}/${slugify(stack.name)}`;
    }
    const base = `${root}/${destRel}`;
    const layerPaths: string[] = [];

    for (let i = 0; i < stack.layers.length; i++) {
      const L = stack.layers[i];
      const path = `${base}/layers/${String(i).padStart(2, "0")}_${slugify(L.name)}.png`;
      files.push({ path, data: await pngBytes(L.data, L.w, L.h) });
      layerPaths.push(path);
    }

    // horizontal sheet of all layers for review
    if (stack.layers.length) {
      const maxH = Math.max(...stack.layers.map((l) => l.h));
      const totalW = stack.layers.reduce((s, l) => s + l.w, 0) + (stack.layers.length - 1) * 4;
      const sheet = new Uint8ClampedArray(totalW * maxH * 4);
      let ox = 0;
      for (const L of stack.layers) {
        for (let y = 0; y < L.h; y++) {
          for (let x = 0; x < L.w; x++) {
            const si = (y * L.w + x) * 4;
            const di = (y * totalW + (ox + x)) * 4;
            sheet[di] = L.data[si];
            sheet[di + 1] = L.data[si + 1];
            sheet[di + 2] = L.data[si + 2];
            sheet[di + 3] = L.data[si + 3];
          }
        }
        ox += L.w + 4;
      }
      const sheetPath = `${base}/sheets/${slugify(stack.name)}_layers_sheet.png`;
      files.push({ path: sheetPath, data: await pngBytes(sheet, totalW, maxH) });
      layerPaths.push(sheetPath);
    }

    const pkg = buildEngineParallaxPackage(stack, project.engine, destRel);
    for (const f of pkg.setupFiles) {
      files.push({ path: `${root}/${f.path}`, data: f.content });
      layerPaths.push(`${root}/${f.path}`);
    }

    manifest.parallax.push({
      name: stack.name,
      path: destRel,
      layers: layerPaths,
    });
  }

  // Also export unwired boards to a _unwired dump so nothing is lost
  const unwiredBoards = artboards.filter((board) => {
    const cx = board.x + board.width / 2;
    const cy = board.y + board.height / 2;
    return !wired.some((z) => centerIn(cx, cy, z.x, z.y, z.w, z.h));
  });
  for (const board of unwiredBoards) {
    const pixels = compositeLayers(board.layers, board.width, board.height);
    const path = `${root}/_unwired/${slugify(board.name)}.png`;
    files.push({ path, data: await pngBytes(pixels, board.width, board.height) });
  }

  // Quest trees → engine-ready JSON
  const questRoot =
    findFolderByCategory(project.folders, "quests")?.path ?? "quests";
  for (const tree of questTrees) {
    const path = `${root}/${questRoot}/trees/${slugify(tree.name)}.quest.json`;
    const payload = {
      id: tree.id,
      name: tree.name,
      version: 1,
      nodes: tree.nodes.map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        next: n.next,
        edgeLabels: n.edgeLabels ?? {},
        links: n.links ?? {},
      })),
    };
    files.push({ path, data: JSON.stringify(payload, null, 2) });
    manifest.quests.push({ id: tree.id, name: tree.name, path });
  }

  // Destructible registry for engines
  const destRoot =
    findFolderByCategory(project.folders, "destructibles")?.path ?? "destructibles";
  if (destructibles.length) {
    const reg = destructibles.map((d) => ({
      id: d.id,
      name: d.name,
      maxHp: d.maxHp,
      drops: d.drops,
      stages: d.stages.map((s) => ({ label: s.label, hpMax: s.hpMax })),
      engineBreakable: d.engineBreakable,
      size: { w: d.w, h: d.h },
    }));
    const path = `${root}/${destRoot}/destructibles_registry.json`;
    files.push({ path, data: JSON.stringify({ version: 1, props: reg }, null, 2) });
    for (const d of destructibles) {
      manifest.destructibles.push({
        id: d.id,
        name: d.name,
        maxHp: d.maxHp,
        drops: d.drops,
      });
    }
  }

  files.push({
    path: `${root}/pixelplane_manifest.json`,
    data: JSON.stringify(manifest, null, 2),
  });
  files.push({
    path: `${root}/README_PIXELPLANE.md`,
    data: engineReadme(project),
  });

  // de-dupe paths (last wins)
  const map = new Map<string, ExportFile>();
  for (const f of files) map.set(f.path, f);
  return buildZip([...map.values()]);
}

function artRootFallback(_project: EngineProject) {
  return "art/parallax";
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
