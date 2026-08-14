/**
 * Bridge Rule Cards → City Engine runtime effects.
 * Pure helpers; no React. Called from sim tick + action hooks.
 */

import type { RuleCard, RuleThen, RuleWhen } from "@/store/rule-cards";

export type RuleEvent =
  | { type: "smash" }
  | { type: "enter_vehicle" }
  | { type: "key"; code: string }
  | { type: "tick"; wanted: number; sprinting: boolean; braking: boolean };

export type RuleEffect = {
  status?: string;
  hint?: string;
  wantedDelta?: number;
  playSiren?: boolean;
  speedMult?: number;
  remaps?: Array<{ from: string; to: string }>;
  fireTrigger?: "boil" | "tile_kit" | "qa" | "mutate" | "bloom";
};

function whenMatches(when: RuleWhen, ev: RuleEvent, wanted: number): boolean {
  switch (when.kind) {
    case "key":
      return ev.type === "key" && ev.code === when.code;
    case "smash":
      return ev.type === "smash";
    case "enter_vehicle":
      return ev.type === "enter_vehicle";
    case "wanted_above":
      return (
        (ev.type === "tick" && ev.wanted >= when.level) ||
        (ev.type === "smash" && wanted >= when.level)
      );
    case "sprint":
      return ev.type === "tick" && ev.sprinting;
    case "brake":
      return ev.type === "tick" && ev.braking;
    default:
      return false;
  }
}

function applyThen(then: RuleThen): RuleEffect {
  switch (then.kind) {
    case "status":
      return { status: then.text };
    case "wanted_delta":
      return { wantedDelta: then.amount };
    case "play_siren":
      return { playSiren: true };
    case "hint":
      return { hint: then.text };
    case "boost_speed":
      return { speedMult: then.mult };
    case "remap_key":
      return { remaps: [{ from: then.from, to: then.to }] };
    case "fire_trigger":
      return { fireTrigger: then.trigger };
  }
}

/** Evaluate all enabled cards against one event. */
export function evalRules(
  cards: RuleCard[],
  ev: RuleEvent,
  wanted = 0,
): RuleEffect {
  const out: RuleEffect = {};
  for (const c of cards) {
    if (!c.enabled) continue;
    if (!whenMatches(c.when, ev, wanted)) continue;
    const e = applyThen(c.then);
    if (e.status) out.status = e.status;
    if (e.hint) out.hint = e.hint;
    if (e.wantedDelta) out.wantedDelta = (out.wantedDelta ?? 0) + e.wantedDelta;
    if (e.playSiren) out.playSiren = true;
    if (e.speedMult)
      out.speedMult = (out.speedMult ?? 1) * e.speedMult;
    if (e.remaps) out.remaps = [...(out.remaps ?? []), ...e.remaps];
    if (e.fireTrigger) out.fireTrigger = e.fireTrigger;
  }
  return out;
}

/** Cooldown tracker for continuous tick rules (siren, sprint hint spam). */
export type RuleCooldowns = {
  sirenAt: number;
  sprintHintAt: number;
  wantedSirenLevel: number;
};

export function createCooldowns(): RuleCooldowns {
  return { sirenAt: 0, sprintHintAt: 0, wantedSirenLevel: 0 };
}
