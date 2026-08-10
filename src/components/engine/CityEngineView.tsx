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
  type EngineState,
} from "@/lib/city-engine/sim";
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
import { compositeLayers } from "@/lib/pixel/buffer";
import { FX_EXPLOSIONS } from "@/lib/icon-library/pixel-packs";
import { ArrowLeft, Crosshair, Car, Building2, ScrollText, Ghost } from "lucide-react";

/**
 * PixelPlane City Engine — original top-down sandbox.
 * Birthplace of the full engine: modular perspective + quest contracts.
 * Play Ghost: session path drops onto Studio plane when you leave.
 */
export function CityEngineView() {
  const leave = () => {
    // drop play ghost onto plane before exit
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
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<EngineState>(createEngineState("topdown_openworld"));
  const traceRef = useRef<PlayTrace>(createTrace());
  const mapImg = useRef<HTMLImageElement | null>(null);
  const vehImg = useRef<HTMLImageElement | null>(null);
  const boomFrames = useRef<HTMLImageElement[]>([]);
  const [hud, setHud] = useState({
    status: "",
    mode: "foot",
    realm: "outdoor",
    wanted: 0,
    speed: 0,
    hint: "" as string | null,
    indoorName: "",
    quest: "",
    smashCount: 0,
    profile: "Top-down open world",
    questDone: false,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    boomFrames.current = FX_EXPLOSIONS.v2.map((src) => {
      const im = new Image();
      im.src = src;
      return im;
    });
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

      // road mask
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
      // Studio indoor artboards → enterable interiors
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
      if (s.indoorScenes[0]?.exteriorDoors[0]) {
        const d = s.indoorScenes[0].exteriorDoors[0]!;
        s.player.x = d.x + 30;
        s.player.y = d.y + 40;
      }
      spawnStarterVehicles(s);
      spawnWorldProps(s);
      // Memory web NPCs into the city
      syncNpcsFromMemory(s);
      // City District footings (Studio-authored) → engine collision
      try {
        const { useCityDistrict } = await import("@/store/city-district");
        const ft = useCityDistrict.getState().footings;
        if (ft.length) {
          s.footings = ft;
        } else {
          // demo awnings near player if none authored
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
      // Live sockets: ensure we have some bindings
      if (useMemoryWeb.getState().sockets.length === 0) {
        useMemoryWeb.getState().rebuildSocketsFromWires();
      }
      // Studio quest trees → live mission contract
      const tree = pickPrimaryQuest(studio.questTrees);
      if (tree) {
        setQuestRuntime(s, questTreeToRuntime(tree));
      } else {
        s.status = "Street · E doors/cars · F smash · no Studio quest wired yet";
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
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
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
      // Live asset sockets poll (~2Hz)
      if (Math.floor(s.t * 2) !== Math.floor((s.t - dt) * 2)) {
        const payloads = useMemoryWeb.getState().pollSockets();
        for (const p of payloads) {
          s.liveRev[p.engineKey] = p.rev;
          if (payloads.length) {
            s.status = `Live socket · ${p.engineKey} r${p.rev}`;
          }
        }
        // D_Debug ghost pulse → Studio state pads
        const speed =
          s.player.mode === "drive"
            ? Math.abs(
                s.vehicles.find((v) => v.id === s.player.vehicleId)?.speed ?? 0,
              )
            : s.keys["KeyW"] || s.keys["ArrowUp"]
              ? 30
              : s.keys["KeyS"] || s.keys["ArrowDown"] || s.keys["KeyA"] || s.keys["KeyD"]
                ? 18
                : 0;
        useCharacterDistrict.getState().reportEngineState({
          mode: s.player.mode,
          speed,
          smashing: s.smashFlash > 0,
          indoor: s.realm === "indoor",
          t: s.t,
        });
      }
      // Play Ghost sample
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

      // clear
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, 0, w, h);

      const z = s.camZoom;
      const ox = w / 2 - s.camX * z;
      const oy = h / 2 - s.camY * z;

      if (s.realm === "outdoor" && mapImg.current) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(z, z);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(mapImg.current, 0, 0, s.outdoorW, s.outdoorH);
        ctx.restore();
      } else if (s.realm === "indoor" && s.indoorBake) {
        const img = new ImageData(
          new Uint8ClampedArray(s.indoorBake.data),
          s.indoorBake.w,
          s.indoorBake.h,
        );
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
      }

      // street smashables
      if (s.realm === "outdoor") {
        for (const p of s.props) {
          if (p.gone && p.debrisT <= 0) continue;
          const px = ox + (p.x + p.w / 2) * z;
          const py = oy + (p.y + p.h / 2) * z;
          const pw = p.w * z;
          const ph = p.h * z;
          if (p.gone) {
            // Brian explosion sheet — frame by debris timer
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
          }
        }

        for (const v of s.vehicles) {
          drawVehicle(ctx, v, ox, oy, z, vehImg.current, s.player.vehicleId);
        }

        // door markers
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

        // Memory-web NPCs
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
      }

      // City District footings: solid footing + overhang (draws after player if under)
      const under = s.underOverhang;
      for (const f of s.footings) {
        const fx = ox + f.x * z;
        const fy = oy + f.y * z;
        // body (building mass above footing)
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
        // footing strip (collision)
        ctx.fillStyle = "rgba(78,203,113,0.5)";
        ctx.fillRect(
          fx + f.def.footX * z,
          fy + f.def.footY * z,
          f.def.footW * z,
          f.def.footH * z,
        );
      }

      // player
      {
        const px = ox + s.player.x * z;
        const py = oy + s.player.y * z;
        if (s.player.mode === "foot") {
          ctx.fillStyle = under ? "#fbbf24" : "#e8a838";
          ctx.beginPath();
          ctx.arc(px, py, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#111";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.strokeStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(s.player.rot) * 12, py + Math.sin(s.player.rot) * 12);
          ctx.stroke();
        }
      }

      // overhang re-draw when under so roof appears above player
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

      // smash screen punch
      if (s.smashFlash > 0) {
        ctx.fillStyle = `rgba(255,120,40,${s.smashFlash * 0.25})`;
        ctx.fillRect(0, 0, w, h);
      }

      // minimap
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
      }

      // vignette
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

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
          speed,
          hint: s.interactHint,
          indoorName: s.indoor?.scene.name ?? "",
          quest: questHudLine(s.quest),
          smashCount: s.smashCount,
          profile: s.profile.label,
          questDone: !!s.quest?.completed,
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="h-full w-full touch-none" />

      {/* chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={leave}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/60 px-2.5 py-1.5 text-xs text-white backdrop-blur hover:bg-black/80"
          >
            <ArrowLeft size={14} /> Studio
          </button>
          <div className="rounded-md border border-white/10 bg-black/55 px-2.5 py-1.5 backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              City Engine · Birthplace
            </div>
            <div className="text-[10px] text-cyan-300/80">
              {hud.profile} · freestyle era · ghost trail on exit
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
              ? hud.indoorName || "interior"
              : hud.mode === "drive"
                ? `${Math.round(hud.speed)} u/s · city cam`
                : "walk · street cam"}
          </div>
          {hud.wanted > 0.2 && (
            <div className="text-[10px] text-red-400">wanted {hud.wanted.toFixed(1)}</div>
          )}
          <div className="text-[10px] text-white/45">smashed {hud.smashCount}</div>
        </div>
      </div>

      {/* Quest contract HUD — Studio tree → play */}
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
            Wired from Studio plane · smash (F) / ram advances objectives
          </div>
        </div>
      )}

      {hud.hint && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-xs text-amber-200 backdrop-blur">
          {hud.hint}
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
  v: { defId: string; x: number; y: number; rot: number; id?: string },
  ox: number,
  oy: number,
  z: number,
  sheet: HTMLImageElement | null,
  activeId: string | null,
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
  if (sheet && sheet.complete && sheet.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sheet,
      def.sx,
      def.sy,
      def.sw,
      def.sh,
      -dw / 2,
      -dh / 2,
      dw,
      dh,
    );
  } else {
    ctx.fillStyle = def.color;
    ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
    ctx.fillStyle = "#222";
    ctx.fillRect(dw * 0.15, -dh * 0.25, dw * 0.25, dh * 0.5);
  }
  ctx.strokeStyle = active ? "#e8a838" : "rgba(0,0,0,0.65)";
  ctx.lineWidth = active ? 2.5 : 1.25;
  ctx.strokeRect(-dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}
