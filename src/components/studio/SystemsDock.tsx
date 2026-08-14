import { usePlaneSystems } from "@/store/plane-systems";
import { useCollab } from "@/store/collab";
import { useStudio } from "@/store/studio";
import { useWaveA } from "@/store/wave-a";
import { useSignature } from "@/store/signature";
import { scopeForZone } from "@/lib/spatial/scope";
import {
  Eye,
  EyeOff,
  Grid3x3,
  Map,
  Shield,
  Focus,
  Users,
  Flame,
  Ghost,
  Orbit,
  Lamp,
  GitBranch,
  ScrollText,
  Aperture,
  Library,
  Waves,
} from "lucide-react";
import { useRuleCards } from "@/store/rule-cards";
import { useShaderGraph } from "@/store/shader-graph";
import { useCategoryPlanes } from "@/store/category-planes";
import { useCraftLab } from "@/store/craft-lab";
import { cn } from "@/lib/utils";

/**
 * Dock for hard plane systems: private mask, watch mode, chunk grid, export map,
 * Wave A: wire heat + session ghosts.
 * z-[45] sits above tip overlays (z-40) so tips never block dock clicks.
 */
export function SystemsDock() {
  const maskTool = usePlaneSystems((s) => s.maskTool);
  const maskMode = usePlaneSystems((s) => s.maskMode);
  const role = usePlaneSystems((s) => s.collabRole);
  const showChunk = usePlaneSystems((s) => s.showChunkGrid);
  const showExport = usePlaneSystems((s) => s.showExportMap);
  const interestN = usePlaneSystems((s) => s.localInterest.length);
  const masks = usePlaneSystems((s) => s.masks);
  const joined = useCollab((s) => s.joined);
  const showHeat = useWaveA((s) => s.showWireHeatMap);
  const showGhosts = useWaveA((s) => s.showSessionGhosts);
  const orbitOn = useSignature((s) => s.orbitEnabled);
  const orbitN = useSignature((s) => s.orbitPins.length);
  const diffOn = useSignature((s) => s.diffEnabled);
  const ruleN = useRuleCards((s) => s.cards.length);
  const rulesShow = useRuleCards((s) => s.showOnPlane);
  const shaderN = useShaderGraph((s) => s.graphs.length);
  const shaderShow = useShaderGraph((s) => s.showOnPlane);
  const railN = useSignature((s) => s.links.length);
  const railsShow = useSignature((s) => s.showRailsPanel);
  const catShow = useCategoryPlanes((s) => s.showPanel);
  const catN = useCategoryPlanes((s) => s.planes.length);
  const craftShow = useCraftLab((s) => s.showPanel);
  const boilOn = useCraftLab((s) => s.boilOn);

  return (
    <div className="pointer-events-none absolute left-2 top-14 z-[45] flex max-w-[220px] flex-col gap-1.5">
      <div className="pointer-events-auto rounded-lg border border-border/80 bg-bg-elevated/95 p-1.5 shadow-lg backdrop-blur">
        <div className="mb-1 px-1 text-[9px] font-semibold uppercase tracking-wider text-muted">
          Plane systems
        </div>
        <div className="flex flex-wrap gap-1">
          <DockBtn
            active={maskTool && maskMode === "private"}
            title="Draw private bubble (ADHD / personal space)"
            onClick={() => {
              usePlaneSystems.getState().setMaskMode("private");
              usePlaneSystems.getState().setMaskTool(true);
            }}
          >
            <Shield size={12} /> Private
          </DockBtn>
          <DockBtn
            active={maskTool && maskMode === "witness"}
            title="Witness bubble — others see dim, soft edit"
            onClick={() => {
              usePlaneSystems.getState().setMaskMode("witness");
              usePlaneSystems.getState().setMaskTool(true);
            }}
          >
            <Eye size={12} /> Witness pad
          </DockBtn>
          <DockBtn
            active={maskTool && maskMode === "focus"}
            title="Focus bubble — dim outside"
            onClick={() => {
              usePlaneSystems.getState().setMaskMode("focus");
              usePlaneSystems.getState().setMaskTool(true);
            }}
          >
            <Focus size={12} /> Focus
          </DockBtn>
          <DockBtn
            active={role === "witness"}
            title="Watch mode — observe without editing pressure"
            onClick={() =>
              usePlaneSystems
                .getState()
                .setCollabRole(role === "witness" ? "editor" : "witness")
            }
          >
            {role === "witness" ? <EyeOff size={12} /> : <Users size={12} />}{" "}
            {role === "witness" ? "Watching" : "Editor"}
          </DockBtn>
          <DockBtn
            active={showChunk}
            title="D_10x interest chunk grid"
            onClick={() => usePlaneSystems.getState().setShowChunkGrid(!showChunk)}
          >
            <Grid3x3 size={12} /> Chunks
          </DockBtn>
          <DockBtn
            active={showExport}
            title="Spatial export map (what goes where)"
            onClick={() => usePlaneSystems.getState().setShowExportMap(!showExport)}
          >
            <Map size={12} /> Export map
          </DockBtn>
          <DockBtn
            active={showHeat}
            title="Wire heat map — feed planes glow by coverage / orphans"
            onClick={() => {
              useWaveA.getState().setShowWireHeatMap(!showHeat);
              useStudio
                .getState()
                .setStatus(
                  !showHeat
                    ? "Wire heat map on · orphans run hot"
                    : "Wire heat map off",
                );
            }}
          >
            <Flame size={12} /> Wire heat
          </DockBtn>
          <DockBtn
            active={showGhosts}
            title="Session ghosts — F-key bookmark thumbnails on the plane"
            onClick={() => {
              useWaveA.getState().setShowSessionGhosts(!showGhosts);
              useStudio
                .getState()
                .setStatus(
                  !showGhosts
                    ? "Session ghosts visible · Ctrl+F1…F12 to capture"
                    : "Session ghosts hidden",
                );
            }}
          >
            <Ghost size={12} /> Ghosts
          </DockBtn>
          <DockBtn
            active={orbitOn && orbitN > 0}
            title="Reference Orbit — pin active board; cards circle the view"
            onClick={() => {
              const sig = useSignature.getState();
              if (!sig.orbitPins.length) sig.pinActiveToOrbit();
              else sig.setOrbitEnabled(!sig.orbitEnabled);
            }}
          >
            <Orbit size={12} /> Orbit {orbitN || ""}
          </DockBtn>
          <DockBtn
            active={diffOn}
            title="Diff lantern — hot pixels where two boards diverge"
            onClick={() => {
              const sig = useSignature.getState();
              if (sig.diffEnabled) sig.clearDiff();
              else sig.runDiffLantern();
            }}
          >
            <Lamp size={12} /> Lantern
          </DockBtn>
          <DockBtn
            active={railsShow && railN > 0}
            title="Mutation rails — live variants from the active board"
            onClick={() => {
              const sig = useSignature.getState();
              if (!sig.links.length) {
                sig.spawnMutationRails();
                return;
              }
              const next = !sig.showRailsPanel;
              sig.setShowRailsPanel(next);
              useStudio
                .getState()
                .setStatus(next ? "Mutation rails inspector" : "Rails inspector hidden");
            }}
          >
            <GitBranch size={12} /> Mutate {railN || ""}
          </DockBtn>
          <DockBtn
            active={catShow}
            title="Asset planes — open a wired category workspace"
            onClick={() => {
              const c = useCategoryPlanes.getState();
              c.setShowPanel(!c.showPanel);
              useStudio
                .getState()
                .setStatus(
                  !c.showPanel
                    ? "Asset planes · pick vehicles, buildings, UI…"
                    : "Asset planes hidden",
                );
            }}
          >
            <Library size={12} /> Library {catN || ""}
          </DockBtn>
          <DockBtn
            active={craftShow || boilOn}
            title="Craft lab — boil, tile kit, sprite QA"
            onClick={() => {
              const c = useCraftLab.getState();
              const next = !c.showPanel;
              c.setShowPanel(next);
              useStudio
                .getState()
                .setStatus(next ? "Craft lab · boil / tiles / QA" : "Craft lab hidden");
            }}
          >
            <Waves size={12} /> Craft
          </DockBtn>
          <DockBtn
            active={rulesShow && ruleN > 0}
            title="Rule cards — sticky WHEN→THEN logic · seed Street Heat deck"
            onClick={() => {
              const r = useRuleCards.getState();
              if (!r.cards.length) {
                r.seedStreetHeatDeck();
                useStudio.getState().setStatus("Street Heat rule deck seeded");
                return;
              }
              const next = !r.showOnPlane;
              r.setShowOnPlane(next);
              useStudio
                .getState()
                .setStatus(next ? "Rule cards visible" : "Rule cards hidden");
            }}
          >
            <ScrollText size={12} /> Rules {ruleN || ""}
          </DockBtn>
          <DockBtn
            active={shaderShow && shaderN > 0}
            title="Shader lab — Neon CRT node graph · click to seed / toggle"
            onClick={() => {
              const g = useShaderGraph.getState();
              if (!g.graphs.length) {
                g.seedLab(true);
                return;
              }
              const next = !g.showOnPlane;
              g.setShowOnPlane(next);
              useStudio
                .getState()
                .setStatus(next ? "Shader lab visible" : "Shader lab hidden");
            }}
          >
            <Aperture size={12} /> Shader {shaderN || ""}
          </DockBtn>
        </div>
        <div className="mt-1 px-1 text-[9px] text-subtle">
          Interest {interestN} chunks · masks {masks.length}
          {joined ? " · shared" : ""}
        </div>
        {maskTool && (
          <div className="mt-1 rounded bg-sky-500/15 px-1.5 py-1 text-[9px] text-sky-200">
            Drag on plane to place {maskMode} bubble · Esc cancel
          </div>
        )}
      </div>
      {showExport && <ExportMapMini />}
    </div>
  );
}

function DockBtn({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px]",
        active
          ? "border-accent/50 bg-accent/15 text-accent"
          : "border-border bg-surface text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function ExportMapMini() {
  const wireZones = useStudio((s) => s.wireZones);
  const artboards = useStudio((s) => s.artboards);
  const animRegions = useStudio((s) => s.animRegions);
  const particles = useStudio((s) => s.particles);
  const destructibles = useStudio((s) => s.destructibles);
  const questTrees = useStudio((s) => s.questTrees);
  const zones = wireZones.map((z) => {
    const sc = scopeForZone(
      { artboards, animRegions, particles, destructibles, questTrees },
      z,
      { pad: 0 },
    );
    return {
      id: z.id,
      name: z.name,
      color: z.color,
      folderPath: z.folderPath,
      count: sc.count,
    };
  });
  return (
    <div className="pointer-events-auto max-h-48 overflow-y-auto rounded-lg border border-border bg-bg-elevated/95 p-2 text-[10px] shadow-lg">
      <div className="mb-1 font-semibold text-fg">Spatial export map</div>
      <p className="mb-1 text-[9px] text-subtle">
        Nested owner (smallest pad) · manual pin wins
      </p>
      {zones.length === 0 && <div className="text-muted">No feed planes</div>}
      {zones.map((z) => (
        <div key={z.id} className="mb-1 border-b border-border/50 pb-1 last:border-0">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: z.color }} />
            <span className="truncate text-fg">{z.name}</span>
          </div>
          <div className="truncate font-mono text-[8px] text-subtle">
            {z.folderPath ?? "unwired"} · {z.count} assets
          </div>
        </div>
      ))}
    </div>
  );
}
