/**
 * Asset Vault — drop, name, doors, rooms, fixtures, built, clipboard.
 */
import { useAssetVault, defaultFixture } from "@/store/asset-vault";
import { useStudio } from "@/store/studio";
import { cn } from "@/lib/utils";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Plus,
  Copy,
  Pin,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  VAULT_KINDS,
  INTERACT_MODES,
  PICKUP_KINDS,
  ASSET_PERSPECTIVES,
  PERSPECTIVE_LABEL,
  type VaultKind,
  type VaultAsset,
  type AssetPerspective,
} from "@/lib/vault/types";

export function AssetVaultPanel() {
  const show = useAssetVault((s) => s.showPanel);
  const tab = useAssetVault((s) => s.tab);
  const assets = useAssetVault((s) => s.assets);
  const selectedId = useAssetVault((s) => s.selectedId);
  const clip = useAssetVault((s) => s.clip);
  const drawMode = useAssetVault((s) => s.drawMode);
  const inspectFixtureId = useAssetVault((s) => s.inspectFixtureId);
  const [open, setOpen] = useState(true);
  const [kindPick, setKindPick] = useState<VaultKind>("building");
  const [kindFilter, setKindFilter] = useState<"all" | VaultKind | "interior" | "street">("all");
  const [camFilter, setCamFilter] = useState<"all" | AssetPerspective>("all");
  const drag = useRef<{ x: number; y: number } | null>(null);
  const selected = assets.find((a) => a.id === selectedId) ?? null;
  const fixture = selected?.fixtures.find((f) => f.id === inspectFixtureId) ?? null;
  const built = assets.filter((a) => a.built);
  const catalog =
    tab === "built" ? built : tab === "clip" ? assets.filter((a) => clip.some((c) => c.assetId === a.id)) : assets;
  const list = catalog.filter((a) => {
    if (kindFilter === "interior") return a.tags.includes("interior");
    if (kindFilter === "street") return a.tags.includes("street");
    if (kindFilter !== "all" && a.kind !== kindFilter) return false;
    if (camFilter !== "all" && a.perspective !== camFilter) return false;
    return true;
  });

  if (!show) return null;

  return (
    <div className="pointer-events-auto absolute bottom-14 left-2 z-40 w-[22rem] overflow-hidden rounded-lg border border-border/80 bg-bg-elevated/95 shadow-xl backdrop-blur max-sm:left-2 max-sm:right-2 max-sm:w-auto max-sm:bottom-16">
      <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
          <Archive size={12} /> Asset vault
        </div>
        <div className="flex items-center gap-1">
          {(["library", "inspect", "built", "clip"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "rounded border px-1.5 py-0.5 text-[9px] font-semibold capitalize",
                tab === t ? "border-accent/50 bg-accent/15 text-fg" : "border-border text-muted hover:text-fg",
              )}
              onClick={() => useAssetVault.getState().setTab(t)}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            className="rounded border border-border p-0.5 text-muted hover:text-fg"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="max-h-[48vh] space-y-2 overflow-y-auto p-2 text-[10px]">
          {(tab === "library" || tab === "built" || tab === "clip") && (
            <>
              {tab === "library" && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <select
                      className="rounded border border-border bg-surface px-1 py-1 text-fg"
                      value={kindPick}
                      onChange={(e) => setKindPick(e.target.value as VaultKind)}
                    >
                      {VAULT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="flex-1 rounded border border-accent/40 bg-accent/15 px-2 py-1 font-semibold text-fg"
                      onClick={() => useAssetVault.getState().ingestActive(kindPick)}
                    >
                      Ingest active board
                    </button>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded border border-cyan/40 bg-cyan/10 px-2 py-1 font-semibold text-fg"
                    onClick={() => void useAssetVault.getState().ingestPack()}
                  >
                    Load Atlus pack
                  </button>
                  <div className="flex flex-wrap gap-0.5">
                    {(
                      [
                        ["all", "All"],
                        ["interior", "Interior"],
                        ["street", "Street"],
                        ["ui", "UI"],
                        ["building", "Bldg"],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[9px]",
                          kindFilter === k
                            ? "border-accent/50 bg-accent/15 text-fg"
                            : "border-border text-muted hover:text-fg",
                        )}
                        onClick={() => setKindFilter(k)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {(
                      [
                        ["all", "Any cam"],
                        ["threequarter", "3/4"],
                        ["topdown", "Top"],
                        ["side", "Side"],
                        ["ui", "Flat"],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[9px]",
                          camFilter === k
                            ? "border-cyan/50 bg-cyan/10 text-fg"
                            : "border-border text-muted hover:text-fg",
                        )}
                        onClick={() => setCamFilter(k)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-subtle">
                    {list.length} shown · click to inspect · drop puts one on the plane
                  </p>
                </div>
              )}
              {tab === "clip" && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="flex-1 rounded border border-accent/40 bg-accent/15 px-2 py-1 font-semibold"
                    onClick={() => useAssetVault.getState().dropClipPlane()}
                  >
                    Drop clipboard plane
                  </button>
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-1 text-muted"
                    onClick={() => useAssetVault.getState().clearClip()}
                  >
                    Clear
                  </button>
                </div>
              )}
              <div className="space-y-1">
                {list.length === 0 && (
                  <p className="text-muted">
                    {tab === "clip" ? "Pin assets from inspect." : "Ingest a board to start the catalog."}
                  </p>
                )}
                {list.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded border px-1.5 py-1 text-left",
                      selectedId === a.id
                        ? "border-accent/50 bg-accent/10 text-fg"
                        : "border-border text-muted",
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-fg"
                      onClick={() => useAssetVault.getState().select(a.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        useAssetVault.getState().pinClip(a.id);
                        useStudio.getState().setStatus(`Pinned ${a.name} to clipboard`);
                      }}
                    >
                      {a.sourceUrl ? (
                        <img
                          src={a.sourceUrl}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-sm border border-border/60 object-contain bg-[repeating-conic-gradient(#2a2830_0%_25%,#1a181e_0%_50%)] bg-[length:8px_8px]"
                        />
                      ) : (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-border/60 bg-surface text-[8px] text-subtle">
                          {a.kind.slice(0, 2)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-fg">{a.name}</span>
                        <span className="text-subtle">
                          {PERSPECTIVE_LABEL[a.perspective]}
                          {" · "}
                          {a.kind}
                          {a.enterable ? " · enter" : ""}
                          {a.built ? " · built" : ""}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[9px] text-muted hover:text-fg"
                      onClick={() => useAssetVault.getState().dropToPlane(a.id)}
                    >
                      Drop
                    </button>
                    {a.parentId && <span className="text-subtle">copy</span>}
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-subtle">Right-click → clipboard. City Engine loads enterable buildings as lots.</p>
            </>
          )}

          {tab === "inspect" && selected && (
            <div className="space-y-2">
              <input
                className="w-full rounded border border-border bg-surface px-2 py-1 text-fg"
                value={selected.name}
                onChange={(e) => useAssetVault.getState().rename(selected.id, e.target.value)}
              />
              <div className="flex gap-1">
                <select
                  className="rounded border border-border bg-surface px-1 py-1"
                  value={selected.kind}
                  onChange={(e) => useAssetVault.getState().setKind(selected.id, e.target.value as VaultKind)}
                >
                  {VAULT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded border border-border bg-surface px-1 py-1"
                  value={selected.perspective}
                  onChange={(e) =>
                    useAssetVault.getState().setPerspective(selected.id, e.target.value as AssetPerspective)
                  }
                >
                  {ASSET_PERSPECTIVES.map((p) => (
                    <option key={p} value={p}>
                      {PERSPECTIVE_LABEL[p]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={cn(
                    "rounded border px-2 py-1",
                    selected.enterable ? "border-cyan/40 bg-cyan/10 text-fg" : "border-border text-muted",
                  )}
                  onClick={() => useAssetVault.getState().setEnterable(selected.id, !selected.enterable)}
                >
                  {selected.enterable ? "Enterable" : "Facade only"}
                </button>
              </div>
              {selected.sourceUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={selected.sourceUrl}
                    alt=""
                    className="h-16 w-16 rounded border border-border object-contain bg-[repeating-conic-gradient(#2a2830_0%_25%,#1a181e_0%_50%)] bg-[length:8px_8px]"
                  />
                  <button
                    type="button"
                    className="rounded border border-accent/40 bg-accent/15 px-2 py-1 font-semibold"
                    onClick={() => useAssetVault.getState().dropToPlane(selected.id)}
                  >
                    Drop on plane
                  </button>
                </div>
              )}

              {selected.enterable && (
                <>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className={cn(
                        "rounded border px-2 py-1",
                        drawMode === "door" ? "border-amber-500/50 bg-amber-500/10 text-fg" : "border-border text-muted",
                      )}
                      onClick={() =>
                        useAssetVault.getState().setDrawMode(drawMode === "door" ? "idle" : "door")
                      }
                    >
                      Draw door
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded border px-2 py-1",
                        drawMode === "room" ? "border-amber-500/50 bg-amber-500/10 text-fg" : "border-border text-muted",
                      )}
                      onClick={() =>
                        useAssetVault.getState().setDrawMode(drawMode === "room" ? "idle" : "room")
                      }
                    >
                      Draw room
                    </button>
                  </div>
                  <DoorCanvas
                    selected={selected}
                    mode={drawMode}
                    drag={drag}
                  />
                  <div className="text-subtle">
                    {selected.doors.length} door{selected.doors.length === 1 ? "" : "s"} · {selected.rooms.length} room
                    {selected.rooms.length === 1 ? "" : "s"}
                  </div>
                  {selected.rooms.map((r) => (
                    <div key={r.id} className="space-y-0.5 rounded border border-border/50 px-1 py-0.5">
                      <div className="flex items-center justify-between text-muted">
                        <input
                          className="w-28 rounded border border-transparent bg-transparent px-0.5 text-fg"
                          value={r.name}
                          onChange={(e) =>
                            useAssetVault.getState().patchRoom(selected.id, r.id, { name: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          className="text-subtle hover:text-fg"
                          onClick={() => useAssetVault.getState().removeRoom(selected.id, r.id)}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 text-[9px]">
                        <select
                          className="rounded border border-border bg-surface px-0.5"
                          value={r.floor ?? (r.downstairs ? -1 : 0)}
                          onChange={(e) =>
                            useAssetVault.getState().patchRoom(selected.id, r.id, {
                              floor: Number(e.target.value),
                              downstairs: Number(e.target.value) < 0,
                            })
                          }
                        >
                          <option value={1}>floor +1</option>
                          <option value={0}>floor 0</option>
                          <option value={-1}>floor -1</option>
                        </select>
                        {(
                          [
                            ["dark", "dark", !!r.dark],
                            ["locked", "lock", !!r.locked],
                            ["window", "window", !!r.window],
                          ] as const
                        ).map(([key, label, on]) => (
                          <button
                            key={key}
                            type="button"
                            className={cn(
                              "rounded border px-1 py-0.5",
                              on ? "border-cyan/40 bg-cyan/10 text-fg" : "border-border text-muted",
                            )}
                            onClick={() =>
                              useAssetVault.getState().patchRoom(selected.id, r.id, { [key]: !on })
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted hover:text-fg"
                  onClick={() => useAssetVault.getState().duplicateFurnished(selected.id)}
                >
                  <Copy size={10} /> Furnish copy
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted hover:text-fg"
                  onClick={() => useAssetVault.getState().openIndoorOnPlane(selected.id)}
                >
                  Indoor plane
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted hover:text-fg"
                  onClick={() => useAssetVault.getState().pinClip(selected.id)}
                >
                  <Pin size={10} /> Clip
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent/15 px-2 py-1 font-semibold"
                  onClick={() => useAssetVault.getState().saveBuilt(selected.id)}
                >
                  Save built
                </button>
              </div>

              {selected.rooms[0] && (
                <div className="space-y-1 rounded border border-border/60 p-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold uppercase tracking-wide text-subtle">Fixtures</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 text-muted hover:text-fg"
                      onClick={() =>
                        useAssetVault.getState().addFixture(
                          selected.id,
                          defaultFixture(selected.rooms[0]!.id, "New prop"),
                        )
                      }
                    >
                      <Plus size={10} /> add
                    </button>
                  </div>
                  {selected.fixtures.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={cn(
                        "flex w-full justify-between rounded px-1 py-0.5",
                        inspectFixtureId === f.id ? "bg-accent/15 text-fg" : "text-muted hover:text-fg",
                      )}
                      onClick={() => useAssetVault.getState().inspectFixture(f.id)}
                      onDoubleClick={() => useAssetVault.getState().inspectFixture(f.id)}
                    >
                      <span>{f.name}</span>
                      <span className="text-subtle">{f.mode}</span>
                    </button>
                  ))}
                </div>
              )}

              {fixture && selected && (
                <FixtureEditor assetId={selected.id} fixtureId={fixture.id} />
              )}

              <div className="space-y-1 rounded border border-border/60 p-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase tracking-wide text-subtle">Lights</span>
                  <button
                    type="button"
                    className="text-muted hover:text-fg"
                    onClick={() => {
                      const room = selected.rooms[0];
                      if (!room) return;
                      useAssetVault.getState().addLight(selected.id, {
                        roomId: room.id,
                        x: room.w / 2,
                        y: 20,
                        strength: 0.7,
                        coneDeg: 80,
                        heading: 90,
                        feather: 40,
                        flicker: "none",
                        flickerMutate: false,
                        color: "#e8c070",
                      });
                    }}
                  >
                    <Plus size={10} />
                  </button>
                </div>
                {selected.lights.map((L) => (
                  <div key={L.id} className="flex items-center gap-1 text-muted">
                    <span className="flex-1">
                      {L.flicker} · {Math.round(L.strength * 100)}%
                    </span>
                    <select
                      className="rounded border border-border bg-surface px-0.5"
                      value={L.flicker}
                      onChange={(e) =>
                        useAssetVault.getState().patchLight(selected.id, L.id, {
                          flicker: e.target.value as typeof L.flicker,
                        })
                      }
                    >
                      <option value="none">steady</option>
                      <option value="regular">pulse</option>
                      <option value="irregular">flicker</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "inspect" && !selected && (
            <p className="text-muted">Pick an asset from Library first.</p>
          )}
        </div>
      )}
    </div>
  );
}

function DoorCanvas({
  selected,
  mode,
  drag,
}: {
  selected: VaultAsset;
  mode: "idle" | "door" | "room";
  drag: React.MutableRefObject<{ x: number; y: number } | null>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const a = selected;
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#141218";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2a2830";
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = "#2a2430";
    ctx.fillRect(w * 0.2, h * 0.15, w * 0.6, h * 0.7);
    for (const d of a.doors) {
      ctx.fillStyle = "rgba(232,168,56,0.55)";
      ctx.fillRect(d.nx * w, d.ny * h, d.nw * w, d.nh * h);
    }
    for (const r of a.rooms) {
      ctx.strokeStyle = "rgba(62,207,207,0.45)";
      ctx.strokeRect((r.x / 280) * w, (r.y / 208) * h, (r.w / 280) * w, (r.h / 208) * h);
    }
  };

  return (
    <canvas
      ref={(c) => {
        if (!c) return;
        (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = c;
        const ctx = c.getContext("2d");
        if (ctx) draw(ctx, c.width, c.height);
      }}
      width={280}
      height={140}
      className="w-full cursor-crosshair rounded border border-border bg-surface"
      onPointerDown={(e) => {
        if (mode === "idle") return;
        const r = e.currentTarget.getBoundingClientRect();
        drag.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      }}
      onPointerUp={(e) => {
        if (!drag.current || mode === "idle") return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const nx = Math.min(drag.current.x, x);
        const ny = Math.min(drag.current.y, y);
        const nw = Math.abs(x - drag.current.x);
        const nh = Math.abs(y - drag.current.y);
        drag.current = null;
        if (nw < 0.03 || nh < 0.03) return;
        if (mode === "door") {
          useAssetVault.getState().addDoor(a.id, { nx, ny, nw, nh, label: "door" });
        } else {
          useAssetVault.getState().addRoom(a.id, {
            name: `Room ${a.rooms.length + 1}`,
            x: nx * 280,
            y: ny * 208,
            w: nw * 280,
            h: nh * 208,
          });
        }
      }}
    />
  );
}

function FixtureEditor({ assetId, fixtureId }: { assetId: string; fixtureId: string }) {
  const f = useAssetVault((s) => s.assets.find((a) => a.id === assetId)?.fixtures.find((x) => x.id === fixtureId));
  const assets = useAssetVault((s) => s.assets);
  const asset = assets.find((a) => a.id === assetId);
  if (!f || !asset) return null;
  const patch = (p: Partial<typeof f>) => useAssetVault.getState().patchFixture(assetId, fixtureId, p);
  return (
    <div className="space-y-1 rounded border border-accent/30 bg-accent/5 p-1.5">
      <div className="font-semibold text-fg">Double-click properties · {f.name}</div>
      <input
        className="w-full rounded border border-border bg-surface px-1 py-0.5"
        value={f.name}
        onChange={(e) => patch({ name: e.target.value })}
      />
      <select
        className="w-full rounded border border-border bg-surface"
        value={f.roomId}
        onChange={(e) => patch({ roomId: e.target.value })}
      >
        {asset.rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-muted">
        <input
          type="checkbox"
          checked={f.interactable}
          onChange={(e) => patch({ interactable: e.target.checked })}
        />
        Interactable
      </label>
      <label className="flex items-center gap-2 text-muted">
        Mode
        <select
          className="flex-1 rounded border border-border bg-surface"
          value={f.mode}
          onChange={(e) => patch({ mode: e.target.value as typeof f.mode })}
        >
          {INTERACT_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-muted">
        <input type="checkbox" checked={f.consume} onChange={(e) => patch({ consume: e.target.checked })} />
        Disappears when used
      </label>
      <label className="flex items-center gap-2 text-muted">
        <input type="checkbox" checked={f.base} onChange={(e) => patch({ base: e.target.checked })} />
        Base (items sit on top)
      </label>
      <label className="flex items-center gap-2 text-muted">
        <input
          type="checkbox"
          checked={f.destructible}
          onChange={(e) => patch({ destructible: e.target.checked })}
        />
        Destructible
      </label>
      <label className="flex items-center gap-2 text-muted">
        <input
          type="checkbox"
          checked={!!f.solid}
          onChange={(e) => patch({ solid: e.target.checked })}
        />
        Solid (blocks walk)
      </label>
      <label className="flex items-center gap-2 text-muted">
        <input
          type="checkbox"
          checked={!!f.saves}
          onChange={(e) => patch({ saves: e.target.checked })}
        />
        Sleep save (house keeps you)
      </label>
      <label className="flex items-center gap-2 text-muted">
        <input
          type="checkbox"
          checked={!!f.phone}
          onChange={(e) => patch({ phone: e.target.checked })}
        />
        Phone / voicemail
      </label>
      <label className="flex items-center gap-2 text-muted">
        <input
          type="checkbox"
          checked={!!f.isKey}
          onChange={(e) => patch({ isKey: e.target.checked, pickupKind: e.target.checked ? "key" : f.pickupKind })}
        />
        Is key
      </label>
      {f.isKey && (
        <input
          className="w-full rounded border border-border bg-surface px-1 py-0.5"
          placeholder="key id (e.g. basement)"
          value={f.keyId ?? ""}
          onChange={(e) => patch({ keyId: e.target.value })}
        />
      )}
      <label className="flex items-center gap-2 text-muted">
        <input
          type="checkbox"
          checked={!!f.locked}
          onChange={(e) => patch({ locked: e.target.checked })}
        />
        Locked
      </label>
      {(f.mode === "stair" || f.locked) && (
        <select
          className="w-full rounded border border-border bg-surface"
          value={f.stairTo ?? ""}
          onChange={(e) => patch({ stairTo: e.target.value || null, mode: f.mode === "stair" ? "stair" : f.mode })}
        >
          <option value="">— stair to room —</option>
          {asset.rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}
      <label className="flex items-center gap-2 text-muted">
        <input
          type="checkbox"
          checked={!!f.crumbs}
          onChange={(e) => patch({ crumbs: e.target.checked })}
        />
        Leaves crumbs (roaches)
      </label>
      {(f.mode === "dialog" || f.mode === "pickup" || f.mode === "sit" || f.mode === "sleep" || f.mode === "window") && (
        <textarea
          className="h-16 w-full rounded border border-border bg-surface px-1 py-0.5 text-fg"
          placeholder="Dialog…"
          value={f.dialog}
          onChange={(e) => patch({ dialog: e.target.value })}
        />
      )}
      {f.mode === "pickup" && (
        <div className="flex gap-1">
          <select
            className="flex-1 rounded border border-border bg-surface"
            value={f.pickupKind ?? "custom"}
            onChange={(e) => patch({ pickupKind: e.target.value as typeof f.pickupKind })}
          >
            {PICKUP_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          {f.pickupKind === "junk" && (
            <input
              type="number"
              className="w-16 rounded border border-border bg-surface px-1"
              value={f.sellValue ?? 0}
              onChange={(e) => patch({ sellValue: Number(e.target.value) })}
            />
          )}
        </div>
      )}
      {(f.mode === "switch" || f.mode === "button") && (
        <select
          className="w-full rounded border border-border bg-surface"
          value={f.linkId ?? ""}
          onChange={(e) => patch({ linkId: e.target.value || undefined })}
        >
          <option value="">— connect to —</option>
          {asset.fixtures
            .filter((x) => x.id !== f.id)
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}
