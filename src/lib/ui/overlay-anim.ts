/**
 * In-canvas popup entrance animations — choosable presets + custom CSS keyframes.
 */

export type OverlayAnim =
  | "fade"
  | "slide-up"
  | "slide-right"
  | "bounce"
  | "pixel-pop"
  | "glitch"
  | "soft-scale"
  | "custom";

export const OVERLAY_ANIM_OPTIONS: {
  id: OverlayAnim;
  label: string;
  css: string;
}[] = [
  { id: "fade", label: "Fade", css: "ppFadeIn 0.35s ease-out" },
  { id: "slide-up", label: "Slide up", css: "ppSlideUp 0.4s cubic-bezier(.2,.8,.2,1)" },
  { id: "slide-right", label: "Slide in", css: "ppSlideRight 0.4s cubic-bezier(.2,.8,.2,1)" },
  { id: "bounce", label: "Bounce", css: "ppBounce 0.55s cubic-bezier(.34,1.56,.64,1)" },
  { id: "pixel-pop", label: "Pixel pop", css: "ppPixelPop 0.45s steps(6,end)" },
  { id: "glitch", label: "Glitch", css: "ppGlitch 0.5s ease-out" },
  { id: "soft-scale", label: "Soft scale", css: "ppSoftScale 0.35s ease-out" },
  { id: "custom", label: "Custom", css: "ppCustom 0.5s ease-out" },
];

const LS_ANIM = "pixelplane_overlay_anim";
const LS_CUSTOM = "pixelplane_overlay_custom_css";

export function loadOverlayAnim(): OverlayAnim {
  try {
    const v = localStorage.getItem(LS_ANIM) as OverlayAnim | null;
    if (v && OVERLAY_ANIM_OPTIONS.some((o) => o.id === v)) return v;
  } catch {
    /* ignore */
  }
  return "bounce";
}

export function saveOverlayAnim(a: OverlayAnim) {
  try {
    localStorage.setItem(LS_ANIM, a);
  } catch {
    /* ignore */
  }
}

export function loadCustomAnimCss(): string {
  try {
    return localStorage.getItem(LS_CUSTOM) ?? "";
  } catch {
    return "";
  }
}

export function saveCustomAnimCss(css: string) {
  try {
    localStorage.setItem(LS_CUSTOM, css);
  } catch {
    /* ignore */
  }
}

export function animCssFor(a: OverlayAnim, custom?: string): string {
  if (a === "custom" && custom?.trim()) {
    // user provides full animation value e.g. "myAnim 0.4s ease"
    return custom.trim();
  }
  return OVERLAY_ANIM_OPTIONS.find((o) => o.id === a)?.css ?? "ppFadeIn 0.35s ease-out";
}

/** Shared keyframes injected once into the document */
export const OVERLAY_KEYFRAMES = `
@keyframes ppFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ppSlideUp {
  from { opacity: 0; transform: translateY(28px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ppSlideRight {
  from { opacity: 0; transform: translateX(-32px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes ppBounce {
  0% { opacity: 0; transform: scale(0.4) translateY(20px); }
  60% { opacity: 1; transform: scale(1.08) translateY(-4px); }
  100% { transform: scale(1) translateY(0); }
}
@keyframes ppPixelPop {
  0% { opacity: 0; transform: scale(0.2); image-rendering: pixelated; filter: contrast(2); }
  50% { opacity: 1; transform: scale(1.15); }
  100% { transform: scale(1); filter: none; }
}
@keyframes ppGlitch {
  0% { opacity: 0; transform: translate(-6px, 2px); filter: hue-rotate(90deg); }
  30% { opacity: 1; transform: translate(4px, -2px); }
  60% { transform: translate(-2px, 1px); filter: hue-rotate(0deg); }
  100% { transform: translate(0,0); }
}
@keyframes ppSoftScale {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes ppCustom {
  from { opacity: 0; transform: translateY(10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;
