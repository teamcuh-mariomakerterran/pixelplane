import { useEffect, useRef, useState } from "react";
import {
  createEngineState,
  step,
  tryEnterExit,
  trySmash,
  nearestVehicle,
  buildRoadMask,
  spawnStarterVehicles,
  spawnWorldProps,
  vehicleDef,
  initIndoors,
  setQuestRuntime,
  syncNpcsFromMemory,
  wantedStars,
  type EngineState,
} from "@/lib/city-engine/sim";
import { unlockAudio } from "@/lib/audio/juice";
import { tickCityAmbience, stopCityAmbience, ambienceLabel } from "@/lib/audio/ambience";
import { propLabel } from "@/lib/city-engine/world-props";
import { indoorFromArtboard } from "@/lib/city-engine/indoors";
import { ENGINE, CONTROLS_HELP, VEHICLE_DEFS } from "@/lib/city-engine/config";
import {
  pickPrimaryQuest,
  questTreeToRuntime,
  questHudLine,
} from "@/lib/city-engine/quest-runtime";
import {
  createTrace,
  pushSample,
  finalizeTrace,
  type PlayTrace,
} from "@/lib/city-engine/play-trace";
import { usePlaneSystems } from "@/store/plane-systems";
import { useMemoryWeb } from "@/store/memory-web";
import { useCharacterDistrict } from "@/store/character-district";
import { useStudio } from "@/store/studio";
import { useSignature } from "@/store/signature";
import { useRuleCards } from "@/store/rule-cards";
import { compositeLayers, bufferToImageData } from "@/lib/pixel/buffer";
import { FX_EXPLOSIONS } from "@/lib/icon-library/pixel-packs";
import { getDecorCellCanvases, clearDecorCellCache } from "@/lib/city-engine/sheet-cells";
import { sliceHeroFacings, drawHeroFacing } from "@/lib/city-engine/hero-sheet";
import {
  seedHeroLabFromImage,
  resolveLocoClip,
  drawLocoClip,
  drawHeroStep,
} from "@/lib/city-engine/lab-locomotion";
import { createStudioHost } from "@/lib/city-engine/host-studio";
import {
  compileEngineModules,
  drawEngineModules,
} from "@/lib/city-engine/modules";
import { drawIndoorRoom, drawDarkCone } from "@/lib/city-engine/indoor-draw";
import { roomIsLit } from "@/lib/city-engine/house-memory";
import { useShaderGraph } from "@/store/shader-graph";
import {
  compileGraph,
  createShaderPreview,
  graphFingerprint,
  migrateGraph,
  type ShaderGraph,
  type ShaderPreviewHandle,
} from "@/lib/shaders/graph";
import { applyCanvasCA } from "@/lib/pixel/chroma";
import { generateProcVfx } from "@/lib/pixel/proc-vfx";
import { ArrowLeft, Crosshair, Car, Building2, ScrollText, Ghost, Star, Aperture } from "lucide-react";

let engineGradeScratch: HTMLCanvasElement | null = null;
let engineGradeSlot: { key: string; handle: ShaderPreviewHandle } | null = null;
const procBurstCache = new Map<string, HTMLCanvasElement[]>();

function hash01(n: number) {
  let x = (n * 374761393) | 0;
  x = (x ^ (x >>> 13)) * 1274126177;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function framesForBurst(kind: string, seed: number, hue: number, intensity: number) {
  const key = `${kind}|${seed}|${hue.toFixed(2)}|${intensity}`;
  const hit = procBurstCache.get(key);
  if (hit) return hit;
  const out = generateProcVfx({
    kind: kind === "spark" ? "spark" : kind === "debris" ? "debris" : "explosion",
    seed,
    hue,
    intensity,
    frames: 6,
    size: 48,
    direction: 0,
    spread: 180,
  });
  const canvases = out.frames.map((f) => {
    const c = document.createElement("canvas");
    c.width = f.w;
    c.height = f.h;
    c.getContext("2d")?.putImageData(bufferToImageData(f.data, f.w, f.h), 0, 0);
    return c;
  });
  if (procBurstCache.size > 24) {
    const first = procBurstCache.keys().next().value;
    if (first) procBurstCache.delete(first);
  }
  procBurstCache.set(key, canvases);
  return canvases;
}

function applyEngineGrade(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  graph: ShaderGraph,
  time: number,
) {
  const g = migrateGraph(graph);
  const pw = Math.min(960, Math.max(320, Math.round(w)));
  const ph = Math.min(540, Math.max(200, Math.round(h)));
  const fp = `${graphFingerprint(g)}@${pw}x${ph}`;
  if (!engineGradeSlot || engineGradeSlot.key !== fp) {
    engineGradeSlot?.handle.dispose();
    const { frag } = compileGraph(g);
    const handle = createShaderPreview(pw, ph, frag);
    if (!handle) return;
    engineGradeSlot = { key: fp, handle };
  }
  if (!engineGradeScratch) engineGradeScratch = document.createElement("canvas");
  const sc = engineGradeScratch;
  if (sc.width !== canvas.width || sc.height !== canvas.height) {
    sc.width = canvas.width;
    sc.height = canvas.height;
  }
  const sctx = sc.getContext("2d");
  if (!sctx) return;
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.drawImage(canvas, 0, 0);
  const amounts: Record<string, number> = {};
  for (const n of g.nodes) amounts[n.kind] = n.amount;
  engineGradeSlot.handle.draw(sc, time, amounts);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(engineGradeSlot.handle.canvas, 0, 0, w, h);
}

/**
 * PixelPlane City Engine — original top-down sandbox.
 * Birthplace of the full engine: modular perspective + quest contracts.
 * Play Ghost: session path drops onto Studio plane when you leave.
 * Layer IV: wanted stars · heat pursuit · plane-fed decor · camera shake.
 */
export function CityEngineView() {
  const leave = () => {
    const tr = traceRef.current;
    if (tr && tr.samples.length > 4) {
      const s = stateRef.current;
      const done = finalizeTrace(tr, {
        smashCount: s.smashCount,
        questName: s.quest?.name,
        questCompleted: s.quest?.completed,
      });
      usePlaneSystems.getState().commitPlayGhost(done);
    }
    useStudio.getState().setAppMode("studio");
    stopCityAmbience();
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<EngineState>(
    createEngineState("topdown_openworld", createStudioHost()),
  );
  const traceRef = useRef<PlayTrace>(createTrace());
  const mapImg = useRef<HTMLImageElement | null>(null);
  const vehImg = useRef<HTMLImageElement | null>(null);
  const boomFrames = useRef<HTMLImageElement[]>([]);
  const heroImg = useRef<HTMLImageElement | null>(null);
  const decorImgs = useRef<Map<string, HTMLImageElement>>(new Map());
  const [hud, setHud] = useState({
    status: "",
    mode: "foot",
    realm: "outdoor",
    wanted: 0,
    stars: 0,
    heat: 0,
    speed: 0,
    hint: "" as string | null,
    indoorName: "",
    quest: "",
    smashCount: 0,
    profile: "Top-down open world",
    questDone: false,
    rules: 0,
    combo: 0,
    boosting: false,
    amb: "street",
    dialog: "" as string,
    room: "",
    keys: 0,
    saved: false,
    ringing: false,
    clip: "",
    ambient: "",
  });
  const [ready, setReady] = useState(false);
  const enginePost = useShaderGraph((s) => s.enginePost);

  useEffect(() => {
    boomFrames.current = FX_EXPLOSIONS.v2.map((src) => {
      const im = new Image();
      im.src = src;
      return im;
    });
    const hero = new Image();
    hero.crossOrigin = "anonymous";
    hero.src = "/packs/night-district/cyberpunk_male_main_character.png";
    hero.onload = () => {
      heroImg.current = hero;
      try {
        seedHeroLabFromImage(hero);
      } catch {
        /* */
      }
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const map = new Image();
      map.crossOrigin = "anonymous";
      map.src = ENGINE.mapUrl;
      const veh = new Image();
      veh.crossOrigin = "anonymous";
      veh.src = ENGINE.vehicleSheetUrl;
      await Promise.all([
        new Promise<void>((res, rej) => {
          map.onload = () => res();
          map.onerror = () => rej(new Error("map"));
        }),
        new Promise<void>((res, rej) => {
          veh.onload = () => res();
          veh.onerror = () => rej(new Error("veh"));
        }),
      ]);
      if (!alive) return;
      mapImg.current = map;
      vehImg.current = veh;
      const s = stateRef.current;
      s.worldW = map.naturalWidth * ENGINE.mapScale;
      s.worldH = map.naturalHeight * ENGINE.mapScale;
      s.player.x = s.worldW * 0.48;
      s.player.y = s.worldH * 0.52;

      const c = document.createElement("canvas");
      c.width = map.naturalWidth;
      c.height = map.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(map, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const { mask, w, h } = buildRoadMask(id, s.worldW, s.worldH);
      s.roadMask = mask;
      s.maskW = w;
      s.maskH = h;
      s.mapReady = true;
      s.outdoorW = s.worldW;
      s.outdoorH = s.worldH;
      const studio = useStudio.getState();
      const extras = studio.artboards
        .filter((b) => b.kind === "indoor")
        .map((b, i) => {
          const layer = b.layers.find((l) => l.id === b.activeLayerId) ?? b.layers[0];
          const data = layer
            ? new Uint8ClampedArray(layer.data)
            : compositeLayers(b.layers, b.width, b.height);
          const ang = (i / Math.max(1, studio.artboards.length)) * Math.PI * 2;
          const cx = s.worldW * 0.5 + Math.cos(ang) * 120;
          const cy = s.worldH * 0.5 + Math.sin(ang) * 120;
          return indoorFromArtboard({
            id: b.id,
            name: b.name,
            data,
            w: b.width,
            h: b.height,
            exteriorX: cx,
            exteriorY: cy,
          });
        });
      initIndoors(s, extras);
      if (s.vaultLots[0]) {
        const lot = s.vaultLots[0]!;
        s.player.x = lot.x + lot.w / 2;
        s.player.y = lot.y + lot.h + 18;
      } else if (s.indoorScenes[0]?.exteriorDoors[0]) {
        const d = s.indoorScenes[0].exteriorDoors[0]!;
        s.player.x = d.x + 30;
        s.player.y = d.y + 40;
      }
      spawnStarterVehicles(s);
      spawnWorldProps(s);
      clearDecorCellCache();
      // preload decor images from plane packs (sliced to single cells at draw time)
      for (const d of s.decor) {
        if (!decorImgs.current.has(d.url)) {
          const im = new Image();
          im.crossOrigin = "anonymous";
          im.src = d.url;
          decorImgs.current.set(d.url, im);
        }
      }
      syncNpcsFromMemory(s);
      compileEngineModules({ host: s.host, state: s });
      try {
        const { useCityDistrict } = await import("@/store/city-district");
        const ft = useCityDistrict.getState().footings;
        if (ft.length) {
          s.footings = ft;
        } else {
          const { seedFootingDefs, placeFooting } = await import(
            "@/lib/city-engine/footing"
          );
          const defs = seedFootingDefs();
          const aw = defs.find((d) => d.id === "awning_64")!;
          s.footings = [
            placeFooting(aw, s.player.x + 40, s.player.y - 30),
            placeFooting(aw, s.player.x + 110, s.player.y - 30),
            placeFooting(
              defs.find((d) => d.id === "building_wall_48")!,
              s.player.x - 80,
              s.player.y - 20,
            ),
          ];
        }
      } catch {
        /* ignore */
      }
      if (useMemoryWeb.getState().sockets.length === 0) {
        useMemoryWeb.getState().rebuildSocketsFromWires();
      }
      const tree = pickPrimaryQuest(studio.questTrees);
      if (tree) {
        setQuestRuntime(s, questTreeToRuntime(tree));
      } else {
        s.status = "Street · E doors/cars · F smash · smash builds heat ★";
      }
      // auto-seed rule deck if empty so engine has living contracts
      if (useRuleCards.getState().cards.length === 0) {
        useRuleCards.getState().seedStreetHeatDeck();
      }
      setReady(true);
    };
    void load().catch(() => {
      stateRef.current.status = "Failed to load engine art — check /engine assets";
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      unlockAudio();
      const s = stateRef.current;
      if (e.code === "Escape") {
        e.preventDefault();
        leave();
        return;
      }
      if (e.type === "keydown") {
        s.keys[e.code] = true;
        if (e.code === "KeyE" || e.code === "Enter") {
          e.preventDefault();
          tryEnterExit(s);
        }
        if (e.code === "KeyM") {
          s.showMinimap = !s.showMinimap;
        }
        if (e.code === "KeyF") {
          e.preventDefault();
          trySmash(s);
        }
      } else {
        s.keys[e.code] = false;
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      step(s, dt);
      tickCityAmbience({
        listenerX: s.camX,
        wanted: s.player.wanted,
        driving: s.player.mode === "drive",
        indoor: s.realm === "indoor",
        dayPhase: s.dayPhase,
        speed:
          s.player.mode === "drive"
            ? Math.abs(
                s.vehicles.find((v) => v.id === s.player.vehicleId)?.speed ?? 0,
              )
            : 0,
      });
      if (Math.floor(s.t * 2) !== Math.floor((s.t - dt) * 2)) {
        const payloads = useMemoryWeb.getState().pollSockets();
        for (const p of payloads) {
          s.liveRev[p.engineKey] = p.rev;
          if (payloads.length) {
            s.status = `Live socket · ${p.engineKey} r${p.rev}`;
          }
        }
        const speed =
          s.player.mode === "drive"
            ? Math.abs(
                s.vehicles.find((v) => v.id === s.player.vehicleId)?.speed ?? 0,
              )
            : s.loco.state === "run"
              ? 50
              : s.loco.state === "walk"
                ? 22
                : 0;
        useCharacterDistrict.getState().reportEngineState({
          mode: s.player.mode,
          speed,
          smashing: s.smashFlash > 0,
          indoor: s.realm === "indoor",
          t: s.t,
        });
      }
      {
        const mode =
          s.realm === "indoor"
            ? "indoor"
            : s.player.mode === "drive"
              ? "drive"
              : "foot";
        traceRef.current = pushSample(traceRef.current, {
          x: s.player.x,
          y: s.player.y,
          mode,
          t: s.t,
        });
      }

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, 0, w, h);

      // trauma² shake + slight rotation (Squirrel Eiserloh) — not linear random
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const trauma = Math.min(1, s.trauma || 0);
      const shakeAmt = trauma * trauma * (reduced ? 0.15 : 1);
      const tn = s.t * 31;
      const shakeX = shakeAmt * 16 * (Math.sin(tn * 1.7) * 0.62 + Math.sin(tn * 4.1) * 0.38) + (s.kickX || 0);
      const shakeY = shakeAmt * 16 * (Math.cos(tn * 1.9) * 0.62 + Math.sin(tn * 5.2) * 0.38) + (s.kickY || 0);
      const shakeRot = shakeAmt * 0.028 * Math.sin(tn * 3.3) + (s.bank || 0) * 0.045;

      const punchZ = 1 + (s.punch || 0) * 0.09;
      const z = s.camZoom * punchZ;
      const ox = Math.round(w / 2 - s.camX * z + shakeX);
      const oy = Math.round(h / 2 - s.camY * z + shakeY);

      if (shakeRot) {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(shakeRot);
        ctx.translate(-w / 2, -h / 2);
      }

      if (s.realm === "outdoor" && mapImg.current) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(z, z);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(mapImg.current, 0, 0, s.outdoorW, s.outdoorH);
        // day/night color grade
        const phase = s.dayPhase;
        // 0 dawn · 0.25 day · 0.5 dusk · 0.75 night
        let tint = "rgba(0,0,0,0)";
        if (phase > 0.55 && phase < 0.95) {
          // night cyan/purple
          const n = phase < 0.75 ? (phase - 0.55) / 0.2 : (0.95 - phase) / 0.2;
          tint = `rgba(20,10,50,${0.12 + n * 0.28})`;
        } else if (phase > 0.4 && phase < 0.55) {
          const n = (phase - 0.4) / 0.15;
          tint = `rgba(180,60,40,${n * 0.18})`;
        } else if (phase < 0.12 || phase > 0.95) {
          tint = "rgba(255,160,80,0.1)";
        }
        if (tint !== "rgba(0,0,0,0)") {
          ctx.fillStyle = tint;
          ctx.fillRect(0, 0, s.outdoorW, s.outdoorH);
        }
        ctx.restore();
      } else if (s.realm === "indoor" && s.indoorBake) {
        try {
          const src = s.indoorBake.data;
          const need = s.indoorBake.w * s.indoorBake.h * 4;
          const buf = src.length === need ? src : (() => {
            const p = new Uint8ClampedArray(need);
            p.set(src.subarray(0, Math.min(src.length, need)));
            return p;
          })();
          const img = new ImageData(new Uint8ClampedArray(buf), s.indoorBake.w, s.indoorBake.h);
          const tmp = document.createElement("canvas");
          tmp.width = s.indoorBake.w;
          tmp.height = s.indoorBake.h;
          tmp.getContext("2d")!.putImageData(img, 0, 0);
          ctx.save();
          ctx.translate(ox, oy);
          ctx.scale(z, z);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tmp, 0, 0, s.worldW, s.worldH);
          ctx.restore();
        } catch {
          /* keep going */
        }
        const bits = s.indoorBits;
        if (bits) {
          ctx.save();
          ctx.translate(ox, oy);
          ctx.scale(z, z);
          ctx.imageSmoothingEnabled = false;
          drawIndoorRoom(ctx, bits, s.t, s.dayPhase, s.worldW, s.worldH, z);
          const room = bits.rooms.find((r) => r.id === bits.roomId);
          if (room && !roomIsLit(bits, bits.roomId)) {
            drawDarkCone(ctx, room, s.player.x, s.player.y, s.player.rot, false);
          }
          ctx.restore();
        }
      }

      if (s.realm === "outdoor") {
        // tire skids (under everything moving)
        for (const k of s.skids) {
          const a = Math.max(0, k.life / 0.85);
          ctx.save();
          ctx.translate(ox + k.x * z, oy + k.y * z);
          ctx.rotate(k.rot);
          ctx.fillStyle = `rgba(20,18,16,${0.35 * a})`;
          ctx.fillRect(-10 * z, -3 * z, 18 * z, 2.2 * z);
          ctx.fillRect(-10 * z, 2 * z, 18 * z, 2.2 * z);
          ctx.restore();
        }

        // Street decor: ONE cell from each citykit sheet (never the whole contact sheet)
        for (const d of s.decor) {
          const fw = Math.min(d.w || 48, 56);
          const fh = Math.min(d.h || 36, 48);
          const dx = ox + d.x * z;
          const dy = oy + d.y * z;
          const dw = fw * z;
          const dh = fh * z;
          if (dx + dw < 0 || dy + dh < 0 || dx > w || dy > h) continue;
          const im = decorImgs.current.get(d.url);
          if (im && im.complete && im.naturalWidth > 0) {
            ctx.imageSmoothingEnabled = false;
            let cells: HTMLCanvasElement[] = [];
            try {
              cells = getDecorCellCanvases(d.url, im);
            } catch {
              cells = [];
            }
            // Reject any cell that is still basically a contact sheet
            const safe = cells.filter(
              (c) =>
                c.width > 0 &&
                c.height > 0 &&
                c.width <= 128 &&
                c.height <= 128 &&
                c.width * c.height < im.naturalWidth * im.naturalHeight * 0.15,
            );
            const cell = safe.length
              ? safe[((d as { cellIndex?: number }).cellIndex ?? 0) % safe.length]!
              : null;
            if (cell) {
              const scale = Math.min(dw / cell.width, dh / cell.height);
              const cw = Math.max(8, Math.min(dw, cell.width * scale));
              const ch = Math.max(8, Math.min(dh, cell.height * scale));
              ctx.fillStyle = "rgba(0,0,0,0.35)";
              ctx.fillRect(dx + (dw - cw) / 2 + 2, dy + (dh - ch) / 2 + 2, cw, ch);
              ctx.drawImage(cell, dx + (dw - cw) / 2, dy + (dh - ch) / 2, cw, ch);
            } else {
              // solid proxy — NEVER drawImage the raw sheet
              ctx.fillStyle = "rgba(62,207,207,0.4)";
              ctx.fillRect(dx, dy, dw, dh);
              ctx.strokeStyle = "rgba(232,168,56,0.5)";
              ctx.strokeRect(dx, dy, dw, dh);
            }
          } else {
            ctx.fillStyle = "rgba(62,207,207,0.25)";
            ctx.fillRect(dx, dy, dw, dh);
          }
        }

        for (const p of s.props) {
          if (p.gone && p.debrisT <= 0) continue;
          const px = ox + (p.x + p.w / 2) * z;
          const py = oy + (p.y + p.h / 2) * z;
          const pw = p.w * z;
          const ph = p.h * z;
          if (p.gone) {
            const frames = boomFrames.current;
            const fi = Math.min(
              frames.length - 1,
              Math.floor((1 - Math.min(1, p.debrisT / 0.6)) * frames.length),
            );
            const fr = frames[fi];
            if (fr && fr.complete) {
              const ssz = Math.max(pw, ph) * 2.2;
              ctx.drawImage(fr, px - ssz / 2, py - ssz / 2, ssz, ssz);
            } else {
              ctx.fillStyle = `rgba(180,100,40,${p.debrisT * 0.5})`;
              ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph * 0.4);
            }
          } else {
            const hpRatio = p.hp / p.maxHp;
            ctx.fillStyle =
              p.kind === "barrel"
                ? "#6b5b4a"
                : p.kind === "pot"
                  ? "#8b6914"
                  : p.kind === "sign"
                    ? "#c4a35a"
                    : "#8b6914";
            ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
            ctx.strokeStyle = "rgba(0,0,0,0.5)";
            ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
            if (hpRatio < 1) {
              ctx.fillStyle = "#222";
              ctx.fillRect(px - pw / 2, py - ph / 2 - 5, pw, 3);
              ctx.fillStyle = hpRatio > 0.4 ? "#4ecb71" : "#f97316";
              ctx.fillRect(px - pw / 2, py - ph / 2 - 5, pw * hpRatio, 3);
            }
            if (s.smashFlash > 0.08) {
              ctx.fillStyle = `rgba(255,255,255,${s.smashFlash * 0.7})`;
              ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
            }
          }
        }

        for (const v of s.vehicles) {
          const isHeat = s.heatUnits.some((h) => h.vehicleId === v.id);
          drawVehicle(
            ctx,
            v,
            ox,
            oy,
            z,
            vehImg.current,
            s.player.vehicleId,
            isHeat,
          );
        }

        // time-ribbon — additive strip + chromatic split (NeonPurr pillar 2)
        {
          const rib = s.ribbon ?? [];
          if (rib.length >= 2) {
            const left: { x: number; y: number }[] = [];
            const right: { x: number; y: number }[] = [];
            for (let i = 0; i < rib.length; i++) {
              const a = rib[i]!;
              const b = rib[Math.min(rib.length - 1, i + 1)]!;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              const age = Math.max(0, 1 - (s.t - a.t) / 0.24);
              const hw = (1.2 + age * 5.5) * z;
              const px = ox + a.x * z;
              const py = oy + a.y * z;
              left.push({ x: px + (-dy / len) * hw, y: py + (dx / len) * hw });
              right.push({ x: px - (-dy / len) * hw, y: py - (dx / len) * hw });
            }
            const paint = (sx: number, sy: number, fill: string) => {
              ctx.beginPath();
              ctx.moveTo(left[0]!.x + sx, left[0]!.y + sy);
              for (let i = 1; i < left.length; i++) ctx.lineTo(left[i]!.x + sx, left[i]!.y + sy);
              for (let i = right.length - 1; i >= 0; i--) {
                ctx.lineTo(right[i]!.x + sx, right[i]!.y + sy);
              }
              ctx.closePath();
              ctx.fillStyle = fill;
              ctx.fill();
            };
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.55;
            paint(0, 0, "rgba(80,255,210,0.55)");
            ctx.globalAlpha = 0.35;
            paint(-2, 0, "rgba(255,50,90,0.7)");
            paint(2, 0, "rgba(50,160,255,0.7)");
            ctx.restore();
          }
        }

        // boost trail ghosts
        for (const k of s.boostTrail) {
          const a = Math.max(0, k.life / 0.22);
          ctx.save();
          ctx.translate(ox + k.x * z, oy + k.y * z);
          ctx.rotate(k.rot);
          ctx.fillStyle = `rgba(62,207,207,${0.28 * a})`;
          ctx.fillRect(-12 * z, -5 * z, 22 * z, 10 * z);
          ctx.restore();
        }

        for (const lot of s.vaultLots ?? []) {
          const lx = ox + lot.x * z;
          const ly = oy + lot.y * z;
          ctx.fillStyle = "#2a2430";
          ctx.fillRect(lx, ly, lot.w * z, lot.h * z);
          ctx.strokeStyle = "rgba(232,168,56,0.7)";
          ctx.lineWidth = Math.max(1, 1.2 * z);
          ctx.strokeRect(lx, ly, lot.w * z, lot.h * z);
          ctx.fillStyle = "rgba(232,168,56,0.95)";
          ctx.font = `${Math.max(8, 9 * z)}px ui-sans-serif`;
          ctx.fillText(lot.name, lx + 3, ly - 4);
          const pulse = 0.45 + 0.35 * Math.sin(s.t * 5);
          ctx.fillStyle = `rgba(232,168,56,${pulse})`;
          ctx.fillRect(lx + lot.w * z * 0.35, ly + lot.h * z * 0.72, lot.w * z * 0.3, lot.h * z * 0.22);
        }

        for (const sc of s.indoorScenes) {
          for (const d of sc.exteriorDoors) {
            const dx = ox + d.x * z;
            const dy = oy + d.y * z;
            ctx.fillStyle = "rgba(167,139,250,0.9)";
            ctx.beginPath();
            ctx.moveTo(dx, dy - 10);
            ctx.lineTo(dx + 7, dy + 4);
            ctx.lineTo(dx - 7, dy + 4);
            ctx.closePath();
            ctx.fill();
          }
        }

        for (const n of s.npcs) {
          const nx = ox + n.x * z;
          const ny = oy + n.y * z;
          ctx.fillStyle = n.color;
          ctx.beginPath();
          ctx.arc(nx, ny, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#111";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.font = "10px sans-serif";
          ctx.fillText(n.name, nx + 10, ny - 4);
          if (n.label) {
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.font = "9px sans-serif";
            const short = n.label.length > 36 ? n.label.slice(0, 34) + "…" : n.label;
            ctx.fillText(short, nx + 10, ny + 10);
          }
        }

        // foot dust
        for (const d of s.dust) {
          const a = Math.max(0, d.life / 0.6);
          ctx.fillStyle = `rgba(200,190,160,${a * 0.45})`;
          ctx.beginPath();
          ctx.arc(ox + d.x * z, oy + d.y * z, (2 + a * 2) * z * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // smash shards
        for (const sh of s.shards ?? []) {
          const a = Math.max(0, sh.life);
          ctx.save();
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.translate(ox + sh.x * z, oy + sh.y * z);
          ctx.rotate(sh.rot);
          ctx.fillStyle = sh.color;
          ctx.fillRect((-sh.w / 2) * z, (-sh.h / 2) * z, sh.w * z, sh.h * z);
          ctx.restore();
        }

        // impact rings
        for (const r of s.rings ?? []) {
          const u = 1 - r.life / r.max;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - u) * 0.85;
          ctx.strokeStyle = r.color;
          ctx.lineWidth = Math.max(1, (2.4 - u * 1.6) * z);
          ctx.beginPath();
          ctx.arc(ox + r.x * z, oy + r.y * z, (8 + u * 46) * z, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // procedural VFX bursts (Craft Lab · smash)
        for (const b of s.procBursts ?? []) {
          const frames = framesForBurst(b.kind, b.seed, b.hue, b.intensity);
          const fi = Math.min(frames.length - 1, Math.floor((b.age / b.life) * frames.length));
          const fr = frames[fi];
          if (!fr) continue;
          const sc = (0.9 + b.intensity * 0.06) * z;
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.95;
          ctx.drawImage(
            fr,
            ox + b.x * z - (fr.width * sc) / 2,
            oy + b.y * z - (fr.height * sc) / 2,
            fr.width * sc,
            fr.height * sc,
          );
          ctx.restore();
        }

        // glass sparks
        for (const sp of s.sparks ?? []) {
          const a = Math.max(0, Math.min(1, sp.life * 3));
          ctx.save();
          ctx.globalAlpha = a;
          ctx.strokeStyle = sp.color;
          ctx.lineWidth = Math.max(1, 1.4 * z);
          ctx.beginPath();
          ctx.moveTo(ox + sp.x * z, oy + sp.y * z);
          ctx.lineTo(ox + (sp.x - sp.vx * 0.04) * z, oy + (sp.y - sp.vy * 0.04) * z);
          ctx.stroke();
          ctx.restore();
        }

        // ambient motes
        for (const m of s.motes ?? []) {
          ctx.globalAlpha = Math.max(0, Math.min(0.7, m.life * 0.45));
          ctx.fillStyle = m.color;
          ctx.fillRect(ox + m.x * z, oy + m.y * z, m.size * z, m.size * z);
        }
        ctx.globalAlpha = 1;

        // combo / smash pops
        ctx.font = `${Math.max(10, 12 * z)}px ui-sans-serif, system-ui`;
        ctx.textAlign = "center";
        for (const pop of s.pops) {
          const u = pop.life / pop.max;
          const t = 1 - u;
          const c1 = 1.70158;
          const c3 = c1 + 1;
          const back = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
          const scale = 0.55 + back * 0.7;
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, u));
          ctx.fillStyle = pop.color;
          ctx.strokeStyle = "rgba(0,0,0,0.65)";
          ctx.lineWidth = 3;
          const px = ox + pop.x * z;
          const py = oy + pop.y * z;
          ctx.translate(px, py);
          ctx.scale(scale, scale);
          ctx.strokeText(pop.text, 0, 0);
          ctx.fillText(pop.text, 0, 0);
          ctx.restore();
        }
        ctx.textAlign = "start";

        // interaction rings (enter / smash)
        {
          const px = ox + s.player.x * z;
          const py = oy + s.player.y * z;
          if (s.player.mode === "foot") {
            ctx.strokeStyle = "rgba(232,168,56,0.2)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, ENGINE.enterRadius * z, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = "rgba(249,115,22,0.18)";
            ctx.beginPath();
            ctx.arc(px, py, 72 * z, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      const under = s.underOverhang;
      for (const f of s.footings) {
        const fx = ox + f.x * z;
        const fy = oy + f.y * z;
        if (f.def.overhangH > 0) {
          ctx.fillStyle = under
            ? "rgba(180,83,9,0.35)"
            : "rgba(180,83,9,0.55)";
          ctx.fillRect(
            fx,
            fy + f.def.overhangY * z,
            f.def.tileW * z,
            f.def.overhangH * z,
          );
        }
        ctx.fillStyle = "rgba(78,203,113,0.5)";
        ctx.fillRect(
          fx + f.def.footX * z,
          fy + f.def.footY * z,
          f.def.footW * z,
          f.def.footH * z,
        );
      }

      {
        const px = ox + s.player.x * z;
        const py = oy + s.player.y * z;
        for (const g of s.ghosts ?? []) {
          const a = Math.max(0, g.life / g.max);
          ctx.save();
          ctx.globalAlpha = a * 0.45;
          ctx.translate(ox + g.x * z, oy + g.y * z);
          ctx.rotate(g.rot);
          ctx.fillStyle = s.player.mode === "drive" ? "#3ecfcf" : "#f472b6";
          ctx.fillRect(-7 * z, -4 * z, 14 * z, 8 * z);
          ctx.restore();
        }
        if (s.player.mode === "foot") {
          const useHero =
            useSignature.getState().nightHeroInEngine &&
            heroImg.current &&
            heroImg.current.complete;
          if (useHero) {
            const facings = sliceHeroFacings(heroImg.current!);
            const sq = (1 - (s.squash || 0) * 0.28) * (s.indoorBits?.sitting ? 0.62 : 1);
            const moving = s.loco.state === "walk" || s.loco.state === "run";
            const clip = resolveLocoClip(s.loco.state);
            if (clip) s.loco.clip = `${clip.name} · ${s.loco.state}`;
            else s.loco.clip = moving ? "hero-step" : "hero-idle";
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.beginPath();
            ctx.ellipse(px, py + 4 * z, 7 * z, 2.6 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            const seededWalk = clip?.name.toLowerCase() === "hero · walk";
            const useLab =
              !!clip &&
              clip.canvases.length > 1 &&
              (s.loco.state !== "walk" && s.loco.state !== "run"
                ? clip.name.toLowerCase() !== "hero · idle"
                : !seededWalk || Math.sin(s.player.rot) > 0.35);
            let drew = false;
            if (useLab && clip) {
              drew = drawLocoClip(
                ctx,
                clip,
                s.loco.frame,
                s.player.rot,
                px,
                py,
                z,
                sq,
              );
            }
            if (!drew) {
              drew = drawHeroStep(
                ctx,
                facings,
                s.player.rot,
                moving,
                s.loco.frame,
                px,
                py,
                z,
                sq,
              );
            }
            if (!drew) {
              drew = drawHeroFacing(ctx, facings, s.player.rot, moving, px, py, z, sq);
            }
            if (!drew) {
              ctx.fillStyle = under ? "#fbbf24" : "#e8a838";
              ctx.beginPath();
              ctx.arc(px, py, 7, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            const sq = 1 - (s.squash || 0) * 0.35;
            ctx.save();
            ctx.translate(px, py);
            ctx.scale(1 / sq, sq);
            ctx.fillStyle = under ? "#fbbf24" : "#e8a838";
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.strokeStyle = "#fff";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(s.player.rot) * 12, Math.sin(s.player.rot) * 12);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      if (under) {
        for (const f of s.footings) {
          if (!f.def.walkUnder || f.def.overhangH <= 0) continue;
          const fx = ox + f.x * z;
          const fy = oy + f.y * z;
          ctx.fillStyle = "rgba(180,83,9,0.65)";
          ctx.fillRect(
            fx,
            fy + f.def.overhangY * z,
            f.def.tileW * z,
            f.def.overhangH * z,
          );
        }
      }

      if (shakeRot) {
        ctx.restore();
      }

      if (s.smashFlash > 0) {
        ctx.fillStyle = `rgba(255,120,40,${s.smashFlash * 0.25})`;
        ctx.fillRect(0, 0, w, h);
      }
      if ((s.flash || 0) > 0.02 && !reduced) {
        ctx.fillStyle = `rgba(255,250,240,${s.flash * 0.38})`;
        ctx.fillRect(0, 0, w, h);
      }

      // chromatic aberration — real RGB split, not tinted rects
      const chroma = reduced ? 0 : s.chroma || 0;
      if (chroma > 0.04) {
        applyCanvasCA(ctx, w, h, chroma, "prism");
      } else if (!reduced && (hud.boosting || (s.letterbox || 0) > 0.55)) {
        applyCanvasCA(ctx, w, h, 0.18 + (s.letterbox || 0) * 0.12, "linear");
      }

      // boost speed lines — radial streaks
      if (!reduced && (hud.boosting || (s.player.mode === "drive" && s.wasBoosting) || (s.letterbox || 0) > 0.35)) {
        ctx.save();
        ctx.globalAlpha = 0.22 + (s.letterbox || 0) * 0.18;
        ctx.strokeStyle = "#3ecfcf";
        ctx.lineWidth = 1.2;
        const cx = w / 2;
        const cy = h / 2;
        for (let i = 0; i < 18; i++) {
          const ang = (i / 18) * Math.PI * 2 + s.t * 0.4;
          const r0 = 40 + ((i * 47 + s.t * 280) % 80);
          const r1 = r0 + 36 + (hud.boosting ? 24 : 0);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
          ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
          ctx.stroke();
        }
        ctx.restore();
      }

      // heat red edge pulse
      const stars = wantedStars(s.player.wanted);
      if (stars > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(s.t * 6);
        ctx.strokeStyle = `rgba(239,68,68,${0.15 + stars * 0.08 * pulse})`;
        ctx.lineWidth = 2 + stars;
        ctx.strokeRect(4, 4, w - 8, h - 8);
        if (!reduced) {
          const strobe = 0.5 + 0.5 * Math.sin(s.t * 14);
          const gL = ctx.createLinearGradient(0, 0, 90, 0);
          gL.addColorStop(0, `rgba(239,68,68,${0.12 + stars * 0.05 * strobe})`);
          gL.addColorStop(1, "rgba(239,68,68,0)");
          ctx.fillStyle = gL;
          ctx.fillRect(0, 0, 90, h);
          const gR = ctx.createLinearGradient(w, 0, w - 90, 0);
          gR.addColorStop(0, `rgba(56,189,248,${0.12 + stars * 0.05 * (1 - strobe)})`);
          gR.addColorStop(1, "rgba(56,189,248,0)");
          ctx.fillStyle = gR;
          ctx.fillRect(w - 90, 0, 90, h);
        }
      }

      const box = reduced ? 0 : s.letterbox || 0;
      if (box > 0.02) {
        const bh = (28 + box * 36) * box;
        ctx.fillStyle = "#050608";
        ctx.fillRect(0, 0, w, bh);
        ctx.fillRect(0, h - bh, w, bh);
      }

      if (s.showMinimap && s.realm === "outdoor" && mapImg.current) {
        const mw = 140;
        const mh = 140;
        const mx0 = w - mw - 12;
        const my0 = 56;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(mx0 - 4, my0 - 4, mw + 8, mh + 8);
        ctx.drawImage(mapImg.current, mx0, my0, mw, mh);
        const pmx = mx0 + (s.player.x / s.outdoorW) * mw;
        const pmy = my0 + (s.player.y / s.outdoorH) * mh;
        ctx.fillStyle = "#e8a838";
        ctx.beginPath();
        ctx.arc(pmx, pmy, 3, 0, Math.PI * 2);
        ctx.fill();
        // heat blips
        for (const u of s.heatUnits) {
          const hv = s.vehicles.find((v) => v.id === u.vehicleId);
          if (!hv) continue;
          const hx = mx0 + (hv.x / s.outdoorW) * mw;
          const hy = my0 + (hv.y / s.outdoorH) * mh;
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3);
        }
      }

      drawEngineModules(ctx, s, { w, h });

      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      if (useShaderGraph.getState().enginePost) {
        const graph = useShaderGraph.getState().graphs[0];
        if (graph?.playing) {
          try {
            applyEngineGrade(canvas, ctx, w, h, dpr, graph, s.t);
          } catch {
            /* keep raw frame */
          }
        }
      }

      hudAcc += dt;
      if (hudAcc > 0.1) {
        hudAcc = 0;
        let speed = 0;
        if (s.player.vehicleId) {
          const v = s.vehicles.find((x) => x.id === s.player.vehicleId);
          speed = v ? Math.abs(v.speed) : 0;
        }
        setHud({
          status: s.status,
          mode: s.player.mode,
          realm: s.realm,
          wanted: s.player.wanted,
          stars: wantedStars(s.player.wanted),
          heat: s.heatUnits.length,
          speed,
          hint: s.interactHint,
          indoorName: s.indoor?.scene.name ?? "",
          quest: questHudLine(s.quest),
          smashCount: s.smashCount,
          profile: s.profile.label,
          questDone: !!s.quest?.completed,
          rules: s.host.rules().filter((c) => c.enabled).length,
          combo: s.combo,
          boosting: s.player.mode === "drive" && !!(s.keys["ShiftLeft"] || s.keys["ShiftRight"]),
          amb: ambienceLabel(s.dayPhase, s.realm === "indoor"),
          dialog: s.dialog?.text ?? "",
          room: s.indoorBits?.rooms.find((r) => r.id === s.indoorBits?.roomId)?.name ?? "",
          keys: s.indoorBits?.keys.length ?? 0,
          saved: !!s.indoorBits?.savedAt,
          ringing: !!s.indoorBits?.phoneRinging,
          clip: s.loco.clip || s.loco.state,
          ambient:
            s.indoorBits?.rooms.find((r) => r.id === s.indoorBits?.roomId)?.ambient ?? "",
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      stopCityAmbience();
    };
  }, [ready]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="h-full w-full touch-none" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={leave}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/60 px-2.5 py-1.5 text-xs text-white backdrop-blur hover:bg-black/80"
          >
            <ArrowLeft size={14} /> Studio
          </button>
          <button
            type="button"
            title="Grade the city with the Shader Lab look"
            onClick={() => {
              const st = useShaderGraph.getState();
              if (!st.graphs[0]) st.seedLab(false);
              st.setEnginePost(!st.enginePost);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs backdrop-blur ${
              enginePost
                ? "border-cyan-400/50 bg-cyan-950/70 text-cyan-200"
                : "border-white/15 bg-black/60 text-white/80 hover:bg-black/80"
            }`}
          >
            <Aperture size={14} /> {enginePost ? "CRT ON" : "CRT"}
          </button>
          <div className="rounded-md border border-white/10 bg-black/55 px-2.5 py-1.5 backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              City Engine · Birthplace
            </div>
            <div className="text-[10px] text-cyan-300/80">
              {hud.profile} · Layer IV heat · {hud.rules} rules live
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-violet-500/30 bg-black/55 px-2 py-1 text-[10px] text-violet-200 backdrop-blur">
            <Ghost size={12} /> trail recording
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/55 px-3 py-2 text-right backdrop-blur">
          <div className="flex items-center justify-end gap-2 text-xs text-white">
            {hud.realm === "indoor" ? (
              <Building2 size={14} className="text-violet-400" />
            ) : hud.mode === "drive" ? (
              <Car size={14} className="text-sky-400" />
            ) : (
              <Crosshair size={14} className="text-amber-400" />
            )}
            <span className="font-semibold">
              {hud.realm === "indoor"
                ? "INDOORS"
                : hud.mode === "drive"
                  ? "DRIVING"
                  : "ON FOOT"}
            </span>
          </div>
          <div className="font-mono text-[10px] text-white/60">
            {hud.realm === "indoor"
              ? [hud.indoorName, hud.room].filter(Boolean).join(" · ") || "interior"
              : hud.mode === "drive"
                ? `${Math.round(hud.speed)} u/s · city cam`
                : "walk · street cam"}
          </div>
          {hud.realm === "indoor" && (
            <div className="mt-0.5 text-[9px] text-violet-200/80">
              {hud.keys ? `${hud.keys} key${hud.keys > 1 ? "s" : ""}` : "no keys"}
              {hud.saved ? " · house kept you" : ""}
              {hud.ringing ? " · PHONE" : ""}
              {hud.ambient ? ` · ${hud.ambient}` : ""}
            </div>
          )}
          {hud.clip && (
            <div className="mt-0.5 font-mono text-[9px] text-amber-200/70">
              clip · {hud.clip}
            </div>
          )}
          {/* Wanted stars */}
          <div className="mt-1 flex items-center justify-end gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star
                key={i}
                size={12}
                className={
                  i < hud.stars
                    ? "fill-red-500 text-red-500"
                    : "text-white/20"
                }
              />
            ))}
          </div>
          {hud.heat > 0 && (
            <div className="text-[10px] text-red-400">
              {hud.heat} unit{hud.heat > 1 ? "s" : ""} pursuing
            </div>
          )}
          <div className="text-[10px] text-white/45">smashed {hud.smashCount}</div>
          {hud.combo > 1 && (
            <div
              className="mt-0.5 font-mono text-sm font-black text-orange-400"
              style={{
                transform: `scale(${1 + Math.min(0.45, hud.combo * 0.04)})`,
                textShadow: "0 0 12px rgba(251,146,60,0.65)",
              }}
            >
              {hud.combo}× {hud.combo >= 8 ? "OVERDRIVE" : "COMBO"}
            </div>
          )}
          {hud.boosting && (
            <div className="text-[10px] text-cyan-300">BOOST</div>
          )}
          <div className="mt-1 text-[9px] uppercase tracking-wider text-white/40">
            amb · {hud.amb}
          </div>
        </div>
      </div>

      {hud.quest && (
        <div
          className={`pointer-events-none absolute left-3 top-16 max-w-xs rounded-md border px-3 py-2 backdrop-blur ${
            hud.questDone
              ? "border-emerald-500/40 bg-emerald-950/70"
              : "border-sky-500/30 bg-black/65"
          }`}
        >
          <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
            <ScrollText size={12} /> Active quest
          </div>
          <div className="text-xs text-white/90">{hud.quest}</div>
          <div className="mt-1 text-[9px] text-white/45">
            Wired from Studio plane · smash (F) / ram advances · heat from rules
          </div>
        </div>
      )}

      {hud.hint && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-xs text-amber-200 backdrop-blur">
          {hud.hint}
        </div>
      )}

      {hud.dialog && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 w-[min(92vw,420px)] -translate-x-1/2 rounded-md border border-amber-500/30 bg-black/80 px-3 py-2 text-[12px] leading-relaxed text-amber-50 backdrop-blur">
          {hud.dialog}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 max-w-sm rounded-md border border-white/10 bg-black/60 px-3 py-2 text-[10px] leading-relaxed text-white/80 backdrop-blur">
        <div className="mb-1 font-semibold text-amber-400/90">{hud.status}</div>
        <pre className="whitespace-pre-wrap font-sans text-white/55">{CONTROLS_HELP}</pre>
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-sm text-white">
          Loading city…
        </div>
      )}
    </div>
  );
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  v: { defId: string; x: number; y: number; rot: number; id?: string; heat?: boolean },
  ox: number,
  oy: number,
  z: number,
  sheet: HTMLImageElement | null,
  activeId: string | null,
  isHeat = false,
) {
  const def = vehicleDef(v.defId);
  const x = ox + v.x * z;
  const y = oy + v.y * z;
  const active = activeId === v.id;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(v.rot);
  const dw = active ? 56 : 48;
  const dh = active ? 28 : 24;
  if (active) {
    ctx.fillStyle = "rgba(232,168,56,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, dw * 0.7, dh * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (isHeat) {
    ctx.fillStyle = "rgba(239,68,68,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, dw * 0.75, dh * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (sheet && sheet.complete && sheet.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, def.sx, def.sy, def.sw, def.sh, -dw / 2, -dh / 2, dw, dh);
  } else {
    ctx.fillStyle = isHeat ? "#ef4444" : def.color;
    ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
  }
  if (isHeat) {
    // light bar
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(-6, -dh / 2 - 3, 12, 3);
    ctx.fillStyle = Math.floor(performance.now() / 120) % 2 ? "#3b82f6" : "#ef4444";
    ctx.fillRect(-8, -dh / 2 - 4, 4, 4);
    ctx.fillStyle = Math.floor(performance.now() / 120) % 2 ? "#ef4444" : "#3b82f6";
    ctx.fillRect(4, -dh / 2 - 4, 4, 4);
  }
  ctx.restore();
}

// silence unused import lint for VEHICLE_DEFS if tree-shaken differently
void VEHICLE_DEFS;
void propLabel;
void nearestVehicle;
