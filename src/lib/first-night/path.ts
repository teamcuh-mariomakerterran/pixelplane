/**
 * First Night guided path — DEFERRED (Brian lead design, 2026-08-05).
 * Scaffold kept for one future full sweep after systems stabilize.
 * Do not polish copy/steps on every feature add — rewrite once when ready.
 */

export type FirstNightStep = {
  id: string;
  title: string;
  body: string;
  /** world focus point */
  x: number;
  y: number;
  zoom: number;
  /** optional beacon label */
  beacon: string;
  /** special action */
  action?: "open_engine" | "none";
};

/** Placeholder steps — will be rewritten in the late guided-path sweep */
export const FIRST_NIGHT_STEPS: FirstNightStep[] = [
  {
    id: "characters",
    title: "1 · Character collage",
    body: "This is your Characters feed. Art lives on the plane — not buried in folders. Pan around the rat ninja sheets.",
    x: 200,
    y: 120,
    zoom: 0.85,
    beacon: "Characters",
  },
  {
    id: "anim_field",
    title: "2 · Animation field",
    body: "Anims feed is beside characters. Draw an animation square (A) or slice a sheet — production and anim share one plane.",
    x: 1600,
    y: 120,
    zoom: 0.55,
    beacon: "Anims",
  },
  {
    id: "smash_alley",
    title: "3 · Smash alley",
    body: "Destructibles sit in a spatial cluster. Smallest pad wins ownership (nested scope). F in City Engine will smash the play version.",
    x: 280,
    y: 920,
    zoom: 0.9,
    beacon: "Smash alley",
  },
  {
    id: "quest",
    title: "4 · Quest tree",
    body: "Street Heat lives next to the build field. Magnet links nearby smashables. Canvas proximity = data.",
    x: 1680,
    y: 900,
    zoom: 0.7,
    beacon: "Street Heat",
  },
  {
    id: "city",
    title: "5 · City Engine",
    body: "Hit Enter City to playtest. Your quest loads as Active Mission — smash crates (F) to advance 0/5. Esc returns to Studio.",
    x: 400,
    y: 400,
    zoom: 0.35,
    beacon: "Play suite",
    action: "open_engine",
  },
];

export function stepCount() {
  return FIRST_NIGHT_STEPS.length;
}
