import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Shuffle,
  Spade,
  X,
  Undo2,
  LayoutTemplate,
  Link2,
} from "lucide-react";
import { useSolitaire } from "@/store/solitaire";
import { useStudio } from "@/store/studio";
import { compositeLayers } from "@/lib/pixel/buffer";
import { resolveSkinSlot } from "@/lib/solitaire/template";
import { faceUpRunStart, type MoveSource } from "@/lib/solitaire/engine";
import type { Card, SolitaireInstance } from "@/lib/solitaire/types";
import { CARD_H, CARD_W } from "@/lib/solitaire/cards-draw";
import { cn } from "@/lib/utils";

const TAB_PEEK = 18;

function useCardImage(
  inst: SolitaireInstance,
  key: string,
  faceUp: boolean,
): string {
  const artboards = useStudio((s) => s.artboards);
  // cheap rev fingerprint from bound boards
  const revKey = useMemo(() => {
    const slots = inst.skin.slots;
    const ids = [
      slots.card_back,
      slots[key as keyof typeof slots],
      ...Object.values(slots).filter(Boolean),
    ];
    return ids
      .map((id) => {
        const b = artboards.find((a) => a.id === id);
        return b ? `${b.id}:${b.layers.map((l) => l.rev).join(",")}` : "";
      })
      .join("|");
  }, [artboards, inst.skin.slots, key]);

  return useMemo(() => {
    const slotKey = faceUp ? (key as Parameters<typeof resolveSkinSlot>[1]) : "card_back";
    const { data, w, h } = resolveSkinSlot(inst.skin, slotKey, artboards, compositeLayers);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
    return c.toDataURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inst.id, inst.skin, key, faceUp, revKey, artboards]);
}

function CardView({
  inst,
  card,
  style,
  onPointerDown,
  dimmed,
}: {
  inst: SolitaireInstance;
  card: Card;
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent) => void;
  dimmed?: boolean;
}) {
  const src = useCardImage(inst, card.id, card.faceUp);
  const w = CARD_W * inst.scale;
  const h = CARD_H * inst.scale;
  return (
    <img
      src={src}
      alt={card.faceUp ? card.id : "card back"}
      draggable={false}
      onPointerDown={onPointerDown}
      className={cn(
        "absolute select-none rounded-sm shadow-md",
        card.faceUp ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        dimmed && "opacity-40",
      )}
      style={{
        width: w,
        height: h,
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}

function EmptySlot({
  inst,
  kind,
  onPointerUp,
}: {
  inst: SolitaireInstance;
  kind: "foundation" | "tableau";
  onPointerUp?: () => void;
}) {
  const key = kind === "foundation" ? "empty_foundation" : "empty_tableau";
  const src = useCardImage(inst, key, true);
  const w = CARD_W * inst.scale;
  const h = CARD_H * inst.scale;
  return (
    <img
      src={src}
      alt="empty"
      draggable={false}
      onPointerUp={onPointerUp}
      className="absolute rounded-sm opacity-70"
      style={{ width: w, height: h, imageRendering: "pixelated" }}
    />
  );
}

export function SolitaireOverlay() {
  const instances = useSolitaire((s) => s.instances);
  const camera = useStudio((s) => s.camera);
  if (instances.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {instances.map((inst) => (
        <SolitaireBoard key={inst.id} inst={inst} camera={camera} />
      ))}
    </div>
  );
}

function SolitaireBoard({
  inst,
  camera,
}: {
  inst: SolitaireInstance;
  camera: { x: number; y: number; zoom: number };
}) {
  const select = useSolitaire((s) => s.select);
  const active = useSolitaire((s) => s.activeId === inst.id);
  const draw = useSolitaire((s) => s.draw);
  const move = useSolitaire((s) => s.move);
  const autoFoundation = useSolitaire((s) => s.autoFoundation);
  const undoMove = useSolitaire((s) => s.undoMove);
  const newDeal = useSolitaire((s) => s.newDeal);
  const remove = useSolitaire((s) => s.remove);
  const setMinimized = useSolitaire((s) => s.setMinimized);
  const placeTemplate = useSolitaire((s) => s.placeTemplateNear);
  const rebind = useSolitaire((s) => s.rebindSkinFromTemplate);
  const setDrag = useSolitaire((s) => s.setDrag);
  const drag = useSolitaire((s) => s.drag);
  const moveInstance = useSolitaire((s) => s.moveInstance);

  const [selected, setSelected] = useState<MoveSource | null>(null);
  const [draggingWin, setDraggingWin] = useState<null | { ox: number; oy: number }>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const left = camera.x + inst.x * camera.zoom;
  const top = camera.y + inst.y * camera.zoom;
  const scale = camera.zoom;
  const cw = CARD_W * inst.scale;
  const ch = CARD_H * inst.scale;
  const pad = 12;
  const boardW = pad * 2 + cw * 7 + 8 * 6;
  const boardH = pad * 2 + 36 + ch + 16 + ch + 12 * TAB_PEEK + 40;

  const g = inst.game;

  const onStockClick = () => {
    select(inst.id);
    draw(inst.id);
    setSelected(null);
  };

  const tryDrop = useCallback(
    (dest: Parameters<typeof move>[2]) => {
      if (!selected) return;
      move(inst.id, selected, dest);
      setSelected(null);
    },
    [selected, move, inst.id],
  );

  const pick = (src: MoveSource) => {
    select(inst.id);
    if (selected) {
      // second click = attempt move
      if (src.kind === "tableau") {
        move(inst.id, selected, { kind: "tableau", col: src.col });
      } else if (src.kind === "foundation") {
        move(inst.id, selected, { kind: "foundation", index: src.index });
      }
      setSelected(null);
      return;
    }
    setSelected(src);
  };

  // window drag on chrome
  useEffect(() => {
    if (!draggingWin) return;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX - camera.x) / camera.zoom - draggingWin.ox;
      const ny = (e.clientY - camera.y) / camera.zoom - draggingWin.oy;
      moveInstance(inst.id, nx, ny);
    };
    const onUp = () => setDraggingWin(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingWin, camera, inst.id, moveInstance]);

  if (inst.minimized) {
    return (
      <button
        type="button"
        className="pointer-events-auto absolute flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated/95 px-3 py-1.5 text-[11px] font-medium text-fg shadow-lg backdrop-blur"
        style={{ left, top }}
        onClick={() => setMinimized(inst.id, false)}
      >
        <Spade size={12} className="text-accent" />
        {inst.name}
        <Maximize2 size={11} className="text-muted" />
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-auto absolute overflow-hidden rounded-[var(--radius-md)] border shadow-2xl backdrop-blur-md",
        active ? "border-accent ring-1 ring-accent/40" : "border-border",
      )}
      style={{
        left,
        top,
        width: boardW * scale,
        height: boardH * scale,
        transformOrigin: "top left",
      }}
      onPointerDown={() => select(inst.id)}
    >
      <div
        style={{
          width: boardW,
          height: boardH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* felt */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, #1a5c3a 0%, #0f3d28 55%, #0a281a 100%)",
          }}
        />

        {/* chrome bar */}
        <div
          className="absolute left-0 right-0 top-0 z-20 flex h-9 items-center gap-1 border-b border-black/30 bg-bg-elevated/90 px-2"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            const ox = (e.clientX - camera.x) / camera.zoom - inst.x;
            const oy = (e.clientY - camera.y) / camera.zoom - inst.y;
            setDraggingWin({ ox, oy });
          }}
        >
          <Spade size={13} className="text-accent" />
          <span className="text-[11px] font-semibold text-fg">{inst.name}</span>
          <span className="text-[10px] text-muted">
            · {g.moves} moves · score {g.score}
            {g.phase === "won" ? " · YOU WIN!" : ""}
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <IconBtn title="Undo" onClick={() => undoMove(inst.id)}>
              <Undo2 size={12} />
            </IconBtn>
            <IconBtn title="New deal" onClick={() => newDeal(inst.id)}>
              <Shuffle size={12} />
            </IconBtn>
            <IconBtn title="Place skin template on canvas" onClick={() => placeTemplate(inst.id)}>
              <LayoutTemplate size={12} />
            </IconBtn>
            <IconBtn title="Re-bind skin from template boards" onClick={() => rebind(inst.id)}>
              <Link2 size={12} />
            </IconBtn>
            <IconBtn title="Minimize" onClick={() => setMinimized(inst.id, true)}>
              <Minimize2 size={12} />
            </IconBtn>
            <IconBtn title="Close" onClick={() => remove(inst.id)}>
              <X size={12} />
            </IconBtn>
          </div>
        </div>

        {/* stock / waste / foundations */}
        <div className="absolute left-0 right-0 top-9" style={{ height: ch + pad * 2 }}>
          {/* stock */}
          <div
            className="absolute"
            style={{ left: pad, top: pad }}
            onClick={onStockClick}
          >
            {g.stock.length > 0 ? (
              <CardView
                inst={inst}
                card={{ id: "hearts_1", suit: "hearts", rank: 1, faceUp: false }}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-sm border border-dashed border-white/25 text-[10px] text-white/50"
                style={{ width: cw, height: ch }}
              >
                recycle
              </div>
            )}
          </div>

          {/* waste — show up to 3 */}
          <div className="absolute" style={{ left: pad + cw + 12, top: pad }}>
            {g.waste.length === 0 && (
              <div
                className="rounded-sm border border-white/10"
                style={{ width: cw, height: ch }}
              />
            )}
            {g.waste.slice(-3).map((c, i, arr) => (
              <CardView
                key={c.id + i}
                inst={inst}
                card={c}
                style={{ left: i * 14, top: 0 }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (i === arr.length - 1) {
                    if (e.detail === 2) {
                      autoFoundation(inst.id, { kind: "waste" });
                    } else {
                      pick({ kind: "waste" });
                    }
                  }
                }}
                dimmed={
                  selected?.kind === "waste" ? false : selected != null && i === arr.length - 1
                    ? false
                    : false
                }
              />
            ))}
            {selected?.kind === "waste" && (
              <div
                className="pointer-events-none absolute rounded-sm ring-2 ring-accent"
                style={{
                  left: Math.max(0, Math.min(2, g.waste.length - 1)) * 14,
                  width: cw,
                  height: ch,
                }}
              />
            )}
          </div>

          {/* foundations */}
          {[0, 1, 2, 3].map((fi) => {
            const pile = g.foundations[fi as 0 | 1 | 2 | 3];
            const leftF = pad + (3 + fi) * (cw + 8);
            return (
              <div
                key={fi}
                className="absolute"
                style={{ left: leftF, top: pad }}
                onClick={() => {
                  if (selected) tryDrop({ kind: "foundation", index: fi as 0 | 1 | 2 | 3 });
                  else if (pile.length)
                    pick({ kind: "foundation", index: fi as 0 | 1 | 2 | 3 });
                }}
              >
                {pile.length === 0 ? (
                  <EmptySlot inst={inst} kind="foundation" />
                ) : (
                  <CardView
                    inst={inst}
                    card={pile[pile.length - 1]}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (e.detail === 2) {
                        autoFoundation(inst.id, {
                          kind: "foundation",
                          index: fi as 0 | 1 | 2 | 3,
                        });
                      } else pick({ kind: "foundation", index: fi as 0 | 1 | 2 | 3 });
                    }}
                  />
                )}
                {selected?.kind === "foundation" && selected.index === fi && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-accent"
                    style={{ width: cw, height: ch }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* tableau */}
        <div className="absolute left-0 right-0" style={{ top: 9 + pad * 2 + ch + 8 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((col) => {
            const pile = g.tableau[col];
            const leftT = pad + col * (cw + 8);
            const runStart = faceUpRunStart(pile);
            return (
              <div
                key={col}
                className="absolute"
                style={{ left: leftT, top: 0, width: cw, height: ch + pile.length * TAB_PEEK }}
                onClick={() => {
                  if (selected && pile.length === 0) {
                    tryDrop({ kind: "tableau", col });
                  }
                }}
              >
                {pile.length === 0 && <EmptySlot inst={inst} kind="tableau" />}
                {pile.map((c, idx) => {
                  const isSelected =
                    selected?.kind === "tableau" &&
                    selected.col === col &&
                    idx >= selected.fromIndex;
                  return (
                    <CardView
                      key={c.id + idx}
                      inst={inst}
                      card={c}
                      style={{
                        top: idx * TAB_PEEK,
                        outline: isSelected ? "2px solid #e8a838" : undefined,
                        zIndex: idx,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (!c.faceUp) return;
                        if (e.detail === 2 && idx === pile.length - 1) {
                          autoFoundation(inst.id, {
                            kind: "tableau",
                            col,
                            fromIndex: idx,
                          });
                          setSelected(null);
                          return;
                        }
                        if (selected && selected.kind === "tableau" && selected.col !== col) {
                          move(inst.id, selected, { kind: "tableau", col });
                          setSelected(null);
                          return;
                        }
                        if (selected && selected.kind === "waste") {
                          move(inst.id, selected, { kind: "tableau", col });
                          setSelected(null);
                          return;
                        }
                        if (selected && selected.kind === "foundation") {
                          move(inst.id, selected, { kind: "tableau", col });
                          setSelected(null);
                          return;
                        }
                        // start from this card if it's in a face-up run
                        const from = Math.max(runStart, idx);
                        if (pile[from]?.faceUp) pick({ kind: "tableau", col, fromIndex: from });
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {g.phase === "won" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
            <div className="rounded-[var(--radius-md)] border border-accent bg-bg-elevated px-6 py-4 text-center shadow-xl">
              <div className="text-lg font-bold text-accent">You win!</div>
              <div className="mt-1 text-xs text-muted">
                {g.moves} moves · score {g.score}
              </div>
              <button
                type="button"
                className="mt-3 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg"
                onClick={() => newDeal(inst.id)}
              >
                Deal again
              </button>
            </div>
          </div>
        )}

        <div className="absolute bottom-1 left-2 right-2 text-[9px] text-white/45">
          Click stock to draw · click card then target · double-click to foundation · skins live
          from template boards
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg"
    >
      {children}
    </button>
  );
}

/** Compact launcher shown when no instances — optional, TopBar uses place directly */
export function SolitaireLauncherButton() {
  const place = useSolitaire((s) => s.placeSolitaire);
  const camera = useStudio((s) => s.camera);
  return (
    <button
      type="button"
      title="Drop Klondike solitaire on the plane (with skin template)"
      onClick={() => {
        const x = (-camera.x + 80) / camera.zoom;
        const y = (-camera.y + 60) / camera.zoom;
        place(x, y, true);
      }}
      className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-[11px] font-medium text-muted hover:border-accent/50 hover:text-fg"
    >
      <Spade size={13} className="text-accent" />
      Solitaire
    </button>
  );
}
