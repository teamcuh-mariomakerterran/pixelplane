import {
  Undo2,
  Redo2,
  Download,
  Upload,
  Wand2,
  Eraser,
  HelpCircle,
  Grid3x3,
  FolderPlus,
  ImagePlus,
  ZoomIn,
  ZoomOut,
  Gamepad2,
  Cable,
  PackageOpen,
  Users,
  BookOpen,
  Car,
  Building2,
  Shapes,
  Brain,
  Clapperboard,
} from "lucide-react";
import { useRef } from "react";
import { useStudio } from "@/store/studio";
import { useCollab } from "@/store/collab";
import { useMemoryWeb } from "@/store/memory-web";
import { useCharacterDistrict } from "@/store/character-district";
import { useCityDistrict } from "@/store/city-district";
import { pixelateImage, imageDataToBuffer } from "@/lib/pixel/buffer";
import { engineLabel } from "@/lib/engine/templates";
import { cn } from "@/lib/utils";
import { SolitaireLauncherButton } from "./SolitaireWidget";

export function TopBar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = useStudio((s) => s.meta);
  const camera = useStudio((s) => s.camera);
  const status = useStudio((s) => s.status);
  const engine = useStudio((s) => s.engineProject);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const exportActivePng = useStudio((s) => s.exportActivePng);
  const removeBgActive = useStudio((s) => s.removeBgActive);
  const setShowGenerate = useStudio((s) => s.setShowGenerate);
  const setShowHelp = useStudio((s) => s.setShowHelp);
  const setShowEngine = useStudio((s) => s.setShowEngineConnect);
  const setShowWire = useStudio((s) => s.setShowWirePalette);
  const showWire = useStudio((s) => s.showWirePalette);
  const setShowStarter = useStudio((s) => s.setShowStarterPack);
  const setShowGuides = useStudio((s) => s.setShowGuides);
  const setAppMode = useStudio((s) => s.setAppMode);
  const createIndoorScene = useStudio((s) => s.createIndoorScene);
  const setShowIconLibrary = useStudio((s) => s.setShowIconLibrary);
  const showIconLibrary = useStudio((s) => s.showIconLibrary);
  const setMeta = useStudio((s) => s.setMeta);
  const importImageToArtboard = useStudio((s) => s.importImageToArtboard);
  const newProject = useStudio((s) => s.newProject);
  const setCamera = useStudio((s) => s.setCamera);
  const addArtboard = useStudio((s) => s.addArtboard);
  const setShowCollab = useCollab((s) => s.setShowPanel);
  const collabOn = useCollab((s) => s.enabled);
  const collabJoined = useCollab((s) => s.joined);
  const showMem = useMemoryWeb((s) => s.showPanel);
  const showDist = useCharacterDistrict((s) => s.showPanel);
  const showCity = useCityDistrict((s) => s.showPanel);

  const onImport = async (file: File) => {
    const bmp = await createImageBitmap(file);
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const max = meta.pixelMode === "8bit" ? 64 : meta.pixelMode === "16bit" ? 128 : 256;
    if (c.width > max || c.height > max) {
      const scale = Math.min(max / c.width, max / c.height);
      const tw = Math.max(8, Math.round(c.width * scale));
      const th = Math.max(8, Math.round(c.height * scale));
      const data = pixelateImage(id, tw, th, meta.pixelMode);
      importImageToArtboard(data, tw, th, file.name.replace(/\.\w+$/, ""));
    } else {
      importImageToArtboard(
        imageDataToBuffer(id),
        c.width,
        c.height,
        file.name.replace(/\.\w+$/, ""),
      );
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-bg-elevated px-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-sm font-semibold text-accent-fg">
          P
        </div>
        <button
          type="button"
          title="Command palette (Ctrl+K)"
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))}
          className="hidden items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-subtle hover:border-accent/40 hover:text-accent sm:inline-flex"
        >
          ⌘K
        </button>
        <div className="hidden sm:block">
          <div className="text-sm font-semibold tracking-tight text-fg">PixelPlane</div>
          <div className="-mt-0.5 text-[10px] text-subtle">
            {engine
              ? `${engineLabel(engine.engine)} · ${engine.rootFolderName}`
              : "Infinite pixel workspace"}
          </div>
        </div>
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <IconBtn title="New project" onClick={() => newProject()}>
          <FolderPlus size={16} />
        </IconBtn>
        <IconBtn title="New 128 artboard" onClick={() => addArtboard({ width: 128, height: 128 })}>
          <ImagePlus size={16} />
        </IconBtn>
        <IconBtn title="Import image" onClick={() => fileRef.current?.click()}>
          <Upload size={16} />
        </IconBtn>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = "";
          }}
        />
        <IconBtn title="Export PNG" onClick={() => exportActivePng()}>
          <Download size={16} />
        </IconBtn>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <IconBtn title="Undo (Ctrl+Z)" onClick={() => undo()}>
          <Undo2 size={16} />
        </IconBtn>
        <IconBtn title="Redo (Ctrl+Y)" onClick={() => redo()}>
          <Redo2 size={16} />
        </IconBtn>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <SolitaireLauncherButton />

      <div className="mx-1 h-6 w-px bg-border" />

      <IconBtn
        title="Shared plane — create with friends & family"
        onClick={() => setShowCollab(true)}
        active={collabOn || collabJoined}
      >
        <Users size={16} />
      </IconBtn>

      <IconBtn
        title="City Engine — drive the city (play suite)"
        onClick={() => setAppMode("engine")}
      >
        <Car size={16} />
      </IconBtn>
      <IconBtn
        title="Memory Web + live asset sockets — NPCs, groups, factions"
        onClick={() => useMemoryWeb.getState().setShowPanel(!showMem)}
        active={showMem}
      >
        <Brain size={16} />
      </IconBtn>
      <IconBtn
        title="Character District — spatial anim state machine (Gemini)"
        onClick={() => {
          const st = useCharacterDistrict.getState();
          if (!st.districts.length) st.spawnDistrict();
          else st.setShowPanel(!showDist);
        }}
        active={showDist}
      >
        <Clapperboard size={16} />
      </IconBtn>
      <IconBtn
        title="City District — weighted tiles + footing collision"
        onClick={() => useCityDistrict.getState().setShowPanel(!showCity)}
        active={showCity}
      >
        <Grid3x3 size={16} />
      </IconBtn>
      <IconBtn
        title="New indoor scene — design a building interior for City Engine"
        onClick={() => createIndoorScene()}
      >
        <Building2 size={16} />
      </IconBtn>
      <IconBtn
        title="Icon library — wires, HUD, anim presets (swappable packs later)"
        onClick={() => setShowIconLibrary(!showIconLibrary)}
        active={showIconLibrary}
      >
        <Shapes size={16} />
      </IconBtn>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <IconBtn title="AI Generate" onClick={() => setShowGenerate(true)}>
          <Wand2 size={16} />
        </IconBtn>
        <IconBtn title="Remove background" onClick={() => removeBgActive()}>
          <Eraser size={16} />
        </IconBtn>
        <IconBtn
          title="Toggle grid"
          onClick={() => setMeta({ showGrid: !meta.showGrid })}
          active={meta.showGrid}
        >
          <Grid3x3 size={16} />
        </IconBtn>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <IconBtn
          title="Play project folders"
          onClick={() => setShowEngine(true)}
          active={!!engine}
        >
          <Gamepad2 size={16} />
        </IconBtn>
        <IconBtn
          title="Wire connectors"
          onClick={() => setShowWire(!showWire)}
          active={showWire}
        >
          <Cable size={16} />
        </IconBtn>
        <IconBtn title="Free-use starter pack" onClick={() => setShowStarter(true)}>
          <PackageOpen size={16} />
        </IconBtn>
        <IconBtn title="Useful guides (info dumps)" onClick={() => setShowGuides(true)}>
          <BookOpen size={16} />
        </IconBtn>
      </div>

      <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

      <div className="hidden items-center gap-1 sm:flex">
        <IconBtn
          title="Zoom out (way out)"
          onClick={() => setCamera({ zoom: Math.max(0.02, camera.zoom / 1.35) })}
        >
          <ZoomOut size={16} />
        </IconBtn>
        <button
          type="button"
          className="min-w-[3.2rem] rounded px-1 font-mono text-[10px] text-muted hover:text-fg"
          onClick={() => setCamera({ zoom: 0.35, x: 120, y: 80 })}
          title="Reset to wide plane view"
        >
          {camera.zoom < 0.1
            ? `${(camera.zoom * 100).toFixed(1)}%`
            : `${Math.round(camera.zoom * 100)}%`}
        </button>
        <IconBtn
          title="Zoom in (pixel scale)"
          onClick={() => setCamera({ zoom: Math.min(64, camera.zoom * 1.35) })}
        >
          <ZoomIn size={16} />
        </IconBtn>
        <IconBtn
          title="Zoom to fit all art on the plane"
          onClick={() => {
            const s = useStudio.getState();
            const boards = s.artboards;
            const zones = s.wireZones;
            let minX = 0,
              minY = 0,
              maxX = 800,
              maxY = 600;
            if (boards.length || zones.length) {
              minX = Infinity;
              minY = Infinity;
              maxX = -Infinity;
              maxY = -Infinity;
              for (const b of boards) {
                minX = Math.min(minX, b.x);
                minY = Math.min(minY, b.y);
                maxX = Math.max(maxX, b.x + b.width);
                maxY = Math.max(maxY, b.y + b.height);
              }
              for (const z of zones) {
                minX = Math.min(minX, z.x);
                minY = Math.min(minY, z.y);
                maxX = Math.max(maxX, z.x + z.w);
                maxY = Math.max(maxY, z.y + z.h);
              }
              // padding for the "huge field" feel
              const pad = 400;
              minX -= pad;
              minY -= pad;
              maxX += pad;
              maxY += pad;
            }
            const vw = window.innerWidth - 320;
            const vh = window.innerHeight - 80;
            const zw = vw / Math.max(1, maxX - minX);
            const zh = vh / Math.max(1, maxY - minY);
            const zoom = Math.max(0.02, Math.min(2, Math.min(zw, zh) * 0.92));
            setCamera({
              zoom,
              x: -minX * zoom + 40,
              y: -minY * zoom + 40,
            });
          }}
        >
          <Grid3x3 size={16} />
        </IconBtn>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        <span className="hidden max-w-[240px] truncate text-[10px] text-muted lg:inline">
          {status}
        </span>
        <IconBtn title="Help" onClick={() => setShowHelp(true)}>
          <HelpCircle size={16} />
        </IconBtn>
      </div>
    </header>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition",
        active
          ? "bg-accent/20 text-accent"
          : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
