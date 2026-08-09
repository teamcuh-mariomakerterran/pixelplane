import { useEffect, useState } from "react";
import { useStudio } from "@/store/studio";
import { useHotkeys } from "@/store/hotkeys";
import { TopBar } from "./TopBar";
import { LeftToolbar } from "./LeftToolbar";
import { RightPanel } from "./RightPanel";
import { CanvasWorkspace } from "./CanvasWorkspace";
import { GeneratePanel } from "./GeneratePanel";
import { HelpModal } from "./HelpModal";
import { EngineConnectModal } from "./EngineConnectModal";
import { DestinationPicker } from "./DestinationPicker";
import { WirePalette } from "./WirePalette";
import { StarterPackPanel } from "./StarterPackPanel";
import { SolitaireOverlay } from "./SolitaireWidget";
import { MiniMap } from "./MiniMap";
import { BookmarkStrip, CanvasOverlays } from "./CanvasOverlays";
import { SharedPlaneHost, SharedPlanePanel } from "./SharedPlanePanel";
import { GuidesPanel } from "./GuidesPanel";
import { IconLibraryPanel } from "./IconLibraryPanel";
import { QuestTreePanel } from "./QuestTreeOverlay";
import { DestructiblesPanel } from "./DestructiblesPanel";
import { JourneyTicker } from "./JourneyTicker";
import { FirstNightGuide } from "./FirstNightGuide";
import { SystemsDock } from "./SystemsDock";
import { MemoryWebPanel } from "./MemoryWebPanel";
import { CharacterDistrictPanel } from "./CharacterDistrictPanel";
import { CityDistrictPanel } from "./CityDistrictPanel";
import { CityEngineView } from "@/components/engine/CityEngineView";
import { useSpatialNav } from "@/store/spatial-nav";
import { usePlaneSystems } from "@/store/plane-systems";
import { useMemoryWeb } from "@/store/memory-web";
import { loadSnapshot, pickSnapshot, saveSnapshot } from "@/lib/pixel/persist";
import { useCollab } from "@/store/collab";
import {
  eventToChord,
  chordKey,
  type HotkeyAction,
} from "@/lib/hotkeys/defaults";
import type { ToolId } from "@/lib/pixel/types";

function runAction(action: HotkeyAction) {
  const state = useStudio.getState();
  const hk = useHotkeys.getState();

  if (action.kind === "tool") {
    state.setTool(action.tool);
    if (action.tool !== "wire-zone") state.setActiveConnector(null);
    // first-use tip near center-left of viewport
    hk.pushTip(action.tool, { x: 72, y: 100 });
    return;
  }

  if (action.kind === "bookmark_save") {
    hk.saveBookmark(action.slot, state.camera);
    return;
  }

  if (action.kind === "bookmark_jump") {
    const bm = hk.jumpBookmark(action.slot);
    if (bm) {
      state.setCamera({ x: bm.x, y: bm.y, zoom: bm.zoom });
      state.setStatus(`Jumped to location F${action.slot}`);
    }
    return;
  }

  if (action.kind === "command") {
    switch (action.cmd) {
      case "undo":
        state.undo();
        break;
      case "redo":
        state.redo();
        break;
      case "copy":
        state.copySelection();
        break;
      case "cut":
        state.cutSelection();
        break;
      case "paste": {
        const board = state.getActiveArtboard();
        if (board) state.pasteClipboard(board.id, 0, 0);
        break;
      }
      case "duplicate":
        if (state.activeArtboardId) state.duplicateArtboard(state.activeArtboardId);
        break;
      case "save":
        void saveSnapshot(pickSnapshot(state)).then(() =>
          state.setStatus("Project saved to browser storage"),
        );
        break;
      case "help":
        state.setShowHelp(true);
        break;
      case "brush_dec":
        state.setBrushSize(state.brushSize - 1);
        break;
      case "brush_inc":
        state.setBrushSize(state.brushSize + 1);
        break;
    }
  }
}

export function StudioShell() {
  const [ready, setReady] = useState(false);
  const seedDemo = useStudio((s) => s.seedDemo);
  const applySnapshot = useStudio((s) => s.applySnapshot);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snap = await loadSnapshot();
      if (cancelled) return;
      const s = useStudio.getState();
      if (snap && Array.isArray(snap.artboards) && (snap.artboards as unknown[]).length > 0) {
        applySnapshot(snap as unknown as Record<string, unknown>);
      } else if (s.artboards.length === 0) {
        seedDemo();
      }
      setReady(true);
      // intro tip for bookmarks once
      setTimeout(() => {
        useHotkeys.getState().pushTip("bookmarks", { x: 80, y: 64 });
        useHotkeys.getState().pushTip("minimap", { x: window.innerWidth - 360, y: window.innerHeight - 220 });
      }, 1200);
    })();
    return () => {
      cancelled = true;
    };
  }, [seedDemo, applySnapshot]);

  // debounced autosave
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastSaved = 0;
    const unsub = useStudio.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const st = useStudio.getState();
        if (st.artboards.length === 0) return;
        const now = Date.now();
        if (now - lastSaved < 4000) return;
        lastSaved = now;
        void saveSnapshot(pickSnapshot(st));
      }, 2500);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [ready]);

  // tip when tool changes via toolbar click
  useEffect(() => {
    if (!ready) return;
    let prev = useStudio.getState().tool;
    const unsub = useStudio.subscribe((s) => {
      if (s.tool !== prev) {
        prev = s.tool;
        useHotkeys.getState().pushTip(s.tool, { x: 72, y: 100 });
      }
    });
    return unsub;
  }, [ready]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const state = useStudio.getState();
      const hk = useHotkeys.getState();

      // Space pan is always special-cased
      if (e.code === "Space" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        state.setSpacePan(true);
        return;
      }

      // Esc cancels mask tool
      if (e.key === "Escape" && usePlaneSystems.getState().maskTool) {
        e.preventDefault();
        usePlaneSystems.getState().cancelMask();
        return;
      }

      const chord = eventToChord(e);
      if (!chord) return;

      // Rebind listening mode (after conflict or manual rebind)
      if (hk.rebindMode) {
        e.preventDefault();
        if (chord.key === "escape") {
          const oid = hk.rebindMode.afterConflictOverlayId;
          if (oid) hk.dismissOverlay(oid);
          hk.setRebindMode(null);
          hk.pushToast("Cancelled", "Hotkey rebind cancelled", {
            x: 24,
            y: 72,
          });
          return;
        }

        // Phase: pick which binding to rebind
        if (hk.rebindMode.bindingId === "__pick__") {
          const hit = hk.findByChord(chord);
          if (!hit) {
            hk.pushToast("Nothing bound there", "Try a key that already has an action", {
              x: 80,
              y: 80,
            });
            hk.setRebindMode(null);
            return;
          }
          hk.setRebindMode({ bindingId: hit.id });
          hk.pushToast(`Rebinding “${hit.label}”`, "Press the new key combo now (Esc cancel)", {
            x: 80,
            y: 80,
          });
          return;
        }

        // Phase: reassign displaced binding after conflict
        const oid = hk.rebindMode.afterConflictOverlayId;
        if (oid) {
          hk.completeReassign(oid, chord);
          return;
        }

        // Phase: assign new chord to selected binding (may open conflict dialog)
        hk.tryAssignChord(hk.rebindMode.bindingId, chord, { x: 80, y: 90 });
        return;
      }

      // Ctrl+L — Look at this beacon (Wave B3 / Gemini)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const id = useSpatialNav.getState().dropBeacon({ label: "Look at this" });
        // broadcast to shared plane peers
        try {
          const collab = useCollab.getState();
          if (collab.joined && collab.sendReliable) {
            const cam = useStudio.getState().camera;
            const vw = window.innerWidth - 360;
            const vh = window.innerHeight - 80;
            const wx = (vw / 2 - cam.x) / cam.zoom;
            const wy = (vh / 2 - cam.y) / cam.zoom;
            collab.sendReliable({
              v: 1,
              t: "look_at",
              fromName: collab.displayName,
              color: collab.selfColor,
              label: "Look at this",
              worldX: wx,
              worldY: wy,
              zoom: cam.zoom,
            });
          }
        } catch {
          /* ignore */
        }
        hk.pushToast("Beacon dropped", "Peers will get a camera pull when online · G to cycle", {
          x: 80,
          y: 90,
        });
        void id;
        return;
      }

      // G — cycle beacons (when not typing)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "g") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          useSpatialNav.getState().cycleBeacons();
          return;
        }
      }

      // Ctrl+Alt+K — start rebind: next key picks which action, then new combo
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        hk.pushToast(
          "Rebind mode",
          "Press the current hotkey you want to change, then the new combo",
          { x: 80, y: 80 },
        );
        hk.setRebindMode({ bindingId: "__pick__" });
        return;
      }

      const binding = hk.findByChord(chord);
      if (!binding) return;

      // Don't steal browser defaults we don't own when unbound F-keys etc.
      e.preventDefault();
      runAction(binding.action);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") useStudio.getState().setSpacePan(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Live asset sockets — light poll while in studio
  useEffect(() => {
    const id = window.setInterval(() => {
      useMemoryWeb.getState().pollSockets();
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg">
      <AppModeRoot ready={ready} />
    </div>
  );
}

function AppModeRoot({ ready }: { ready: boolean }) {
  const mode = useStudio((s) => s.appMode);
  if (mode === "engine") {
    return <CityEngineView />;
  }
  return (
    <>
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftToolbar />
        <main className="relative min-w-0 flex-1">
          {ready ? (
            <CanvasWorkspace />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Loading workspace…
            </div>
          )}
          <WirePalette />
          <QuestTreePanel />
          <DestructiblesPanel />
          <JourneyTicker />
          <SystemsDock />
          <MemoryWebPanel />
          <CharacterDistrictPanel />
          <CityDistrictPanel />
          <FirstNightGuide />
          <SolitaireOverlay />
          <MiniMap />
          <BookmarkStrip />
          <CanvasOverlays />
          <SharedPlaneHost />
          <SharedPlanePanel />
          <StatusBar />
        </main>
        <div className="hidden sm:block">
          <RightPanel />
        </div>
      </div>
      <GeneratePanel />
      <HelpModal />
      <EngineConnectModal />
      <DestinationPicker />
      <StarterPackPanel />
      <GuidesPanel />
      <IconLibraryPanel />
    </>
  );
}

function StatusBar() {
  const status = useStudio((s) => s.status);
  const tool = useStudio((s) => s.tool);
  const hover = useStudio((s) => s.hoverPixel);
  const mode = useStudio((s) => s.meta.pixelMode);
  const engine = useStudio((s) => s.engineProject);
  const wires = useStudio((s) => s.wireZones.length);
  const zoom = useStudio((s) => s.camera.zoom);
  const bookmarks = useHotkeys((s) => s.bookmarks);
  const bmCount = Object.values(bookmarks).filter(Boolean).length;

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-border/80 bg-bg-elevated/90 px-3 py-1 text-[10px] text-muted backdrop-blur-sm">
      <span className="truncate">{status}</span>
      <span className="ml-2 shrink-0 font-mono">
        {tool} · {mode} · z
        {zoom < 0.1 ? (zoom * 100).toFixed(1) : Math.round(zoom * 100)}%
        {bmCount ? ` · ${bmCount} cams` : ""}
        {engine ? ` · ${engine.engine}` : ""}
        {wires ? ` · ${wires} planes` : ""}
        {hover ? ` · ${Math.floor(hover.worldX)},${Math.floor(hover.worldY)}` : ""}
      </span>
    </div>
  );
}
