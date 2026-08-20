/**
 * PixelPlane parallax — native depth model on this plane.
 *
 *   depth 0.0  → static with camera (sky / farthest)
 *   depth 0.2  → far background
 *   depth 0.5  → mid
 *   depth 0.85 → near / rooftops
 *   depth 1.0  → locked to world (foreground, full scroll)
 *
 * Play reads these stacks directly. There is no Godot / Unity / Unreal / GameMaker pack.
 */

import type { EngineId, ParallaxLayer, ParallaxStack } from "@/lib/pixel/types";
import { coerceEngineId } from "@/lib/pixel/types";
import { slugify } from "./templates";

export type EngineParallaxLayerSpec = {
  name: string;
  file: string;
  depth: number;
  scrollX: number;
  scrollY: number;
  repeatX: boolean;
  repeatY: boolean;
  autoscrollX: number;
  autoscrollY: number;
  zIndex: number;
  notes: string;
};

export type EngineParallaxPackage = {
  engine: EngineId;
  stackName: string;
  layers: EngineParallaxLayerSpec[];
  setupFiles: { path: string; content: string }[];
  summary: string;
};

/** Map PixelPlane depth → scroll factor (0 static … 1 full camera). */
export function depthToScroll(depth: number): number {
  return Math.max(0, Math.min(1.5, depth));
}

export function defaultDepthForIndex(i: number, total: number): number {
  if (total <= 1) return 0.3;
  return 0.12 + (i / (total - 1)) * 0.75;
}

export function layerEngineNotes(_engine: EngineId, depth: number): string {
  const s = depthToScroll(depth).toFixed(2);
  return `PixelPlane scroll_factor = ${s}  // layer_offset = -camera * factor`;
}

export function buildEngineParallaxPackage(
  stack: ParallaxStack,
  engine: EngineId,
  assetBasePath: string,
): EngineParallaxPackage {
  const base = assetBasePath.replace(/\\/g, "/").replace(/\/$/, "");
  const stackSlug = slugify(stack.name);
  const layers: EngineParallaxLayerSpec[] = stack.layers.map((L, i) => {
    const depth = typeof L.depth === "number" ? L.depth : defaultDepthForIndex(i, stack.layers.length);
    const scroll = depthToScroll(depth);
    const extra = L as ParallaxLayer & {
      scrollScaleX?: number;
      scrollScaleY?: number;
      repeatX?: boolean;
      repeatY?: boolean;
      autoscrollX?: number;
      autoscrollY?: number;
      zIndex?: number;
    };
    return {
      name: L.name,
      file: `${base}/layers/${String(i).padStart(2, "0")}_${slugify(L.name)}.png`,
      depth,
      scrollX: extra.scrollScaleX ?? scroll,
      scrollY: extra.scrollScaleY ?? scroll,
      repeatX: extra.repeatX ?? true,
      repeatY: extra.repeatY ?? false,
      autoscrollX: extra.autoscrollX ?? 0,
      autoscrollY: extra.autoscrollY ?? 0,
      zIndex: extra.zIndex ?? i,
      notes: layerEngineNotes(engine, depth),
    };
  });

  const setupFiles = pixelplaneFiles(stack, stackSlug, layers, base);
  const mode = stack.mode === "sheet" ? "sheet-wide" : "viewport";
  const summary = `pixelplane · ${stack.name} · ${layers.length} layers · ${mode} · view ${stack.viewW}×${stack.viewH}`;

  return {
    engine: coerceEngineId(engine),
    stackName: stack.name,
    layers,
    setupFiles,
    summary,
  };
}

function pixelplaneFiles(
  stack: ParallaxStack,
  stackSlug: string,
  layers: EngineParallaxLayerSpec[],
  base: string,
) {
  const readme = `# PixelPlane parallax — ${stack.name}

Depth is a 0..1 scroll factor on this plane:
\`layer_offset = -camera_position * depth\`

Play reads \`parallax_config.json\` directly. Do not translate this stack into another engine.

Layers:
${layers.map((L) => `- ${L.name}: depth=${L.depth} file=${L.file}`).join("\n")}
`;
  return [
    { path: `${base}/PARALLAX.md`, content: readme },
    {
      path: `${base}/parallax_config.json`,
      content: JSON.stringify(
        { engine: "pixelplane", stack: stack.name, slug: stackSlug, layers },
        null,
        2,
      ),
    },
  ];
}

/** Suggested folder subpaths for a named parallax set under art/parallax/ */
export const PARALLAX_SUBFOLDERS = [
  { name: "layers", label: "Layer PNGs (far→near)" },
  { name: "sheets", label: "Combined sheets" },
  { name: "config", label: "Play config" },
] as const;
