/**
 * Rule Cards inspector — sticky logic WHEN → THEN for Studio + City Engine.
 */
import { useRuleCards, whenLabel, thenLabel } from "@/store/rule-cards";
import { useStudio } from "@/store/studio";
import { FileJson, Plus, ScrollText, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function RuleCardsPanel() {
  const cards = useRuleCards((s) => s.cards);
  const activeId = useRuleCards((s) => s.activeId);
  const show = useRuleCards((s) => s.showOnPlane);

  if (!show && cards.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute bottom-14 right-3 z-40 w-72 max-h-[42vh] overflow-hidden rounded-lg border border-border/80 bg-bg-elevated/95 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
          <ScrollText size={12} /> Rule cards
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Seed Street Heat deck"
            className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted hover:text-fg"
            onClick={() => useRuleCards.getState().seedStreetHeatDeck()}
          >
            Seed deck
          </button>
          <button
            type="button"
            title="Add blank card"
            className="rounded border border-border p-0.5 text-muted hover:text-fg"
            onClick={() => useRuleCards.getState().placeCard()}
          >
            <Plus size={12} />
          </button>
          <button
            type="button"
            title="Export input map JSON"
            className="rounded border border-border p-0.5 text-muted hover:text-fg"
            onClick={() => {
              const json = useRuleCards.getState().exportInputMapJson();
              const blob = new Blob([json], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "pixelplane_rule_cards.json";
              a.click();
              useStudio.getState().setStatus("Exported rule cards JSON");
            }}
          >
            <FileJson size={12} />
          </button>
        </div>
      </div>
      <div className="max-h-[34vh] overflow-y-auto p-1.5">
        {cards.length === 0 && (
          <p className="px-1 py-2 text-[10px] text-muted">
            No rules yet. Seed the Street Heat deck or add a card. Live in City Engine.
          </p>
        )}
        {cards.map((c) => {
          const active = c.id === activeId;
          return (
            <div
              key={c.id}
              className={cn(
                "mb-1 rounded border px-2 py-1.5 text-[10px]",
                active
                  ? "border-accent/50 bg-accent/10"
                  : "border-border/70 bg-surface/60",
                !c.enabled && "opacity-55",
              )}
              onClick={() => useRuleCards.getState().select(c.id)}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className="font-semibold"
                  style={{ color: c.color }}
                >
                  {c.name}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    title="Toggle"
                    className="text-muted hover:text-fg"
                    onClick={(e) => {
                      e.stopPropagation();
                      useRuleCards.getState().toggleEnabled(c.id);
                    }}
                  >
                    {c.enabled ? (
                      <ToggleRight size={14} className="text-emerald-400" />
                    ) : (
                      <ToggleLeft size={14} />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    className="text-muted hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      useRuleCards.getState().removeCard(c.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="mt-0.5 text-muted">WHEN {whenLabel(c.when)}</div>
              <div className="text-violet-300/90">→ {thenLabel(c.then)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
