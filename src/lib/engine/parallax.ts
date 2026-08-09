// @ts-nocheck
/**
 * Multi-engine parallax mapping for PixelPlane.
 *
 * Shared model on the canvas:
 *   depth 0.0  → static with camera (sky / farthest)
 *   depth 0.2  → far background
 *   depth 0.5  → mid
 *   depth 0.85 → near / rooftops
 *   depth 1.0  → locked to world (foreground, full scroll)
 *
 * Engine translation (export):
 *   Godot 4     → Parallax2D.scroll_scale  (0 = static, 1 = camera speed)
 *   Unity       → multiplier on camera delta (same 0..1 convention)
 *   Unreal      → Paper2D orthographic Z depth + scroll factor
 *   GameMaker   → layer_hspeed / layer_x offset factor vs camera
 */

import type { EngineId, ParallaxLayer, ParallaxStack } from "@/lib/pixel/types";
import { slugify } from "./templates";

export type EngineParallaxLayerSpec = {
  name: string;
  file: string;
  depth: number;
  /** Engine-native primary scroll factor (X) */
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
  /** Setup files relative to package root (scripts, scenes, readmes) */
  setupFiles: { path: string; content: string }[];
  summary: string;
};

/** Map PixelPlane depth → engine scroll factor (0 static … 1 full camera). */
export function depthToScroll(depth: number): number {
  return Math.max(0, Math.min(1.5, depth));
}

export function defaultDepthForIndex(i: number, total: number): number {
  if (total <= 1) return 0.3;
  // far → near
  return 0.12 + (i / (total - 1)) * 0.75;
}

export function layerEngineNotes(engine: EngineId, depth: number): string {
  const s = depthToScroll(depth).toFixed(2);
  switch (engine) {
    case "godot":
      return `Parallax2D.scroll_scale = Vector2(${s}, ${s})`;
    case "unity":
      return `parallaxEffect = ${s}  // pos = start + cam * effect (LateUpdate after Cinemachine)`;
    case "unreal":
      return `ScrollFactor = ${s}  // Paper2D / orthographic offset vs camera`;
    case "gamemaker":
      return `layer_x offset factor ${s}  // x = -camera_x * ${s}`;
    default:
      return `scroll_factor = ${s}`;
  }
}

export function buildEngineParallaxPackage(
  stack: ParallaxStack,
  engine: EngineId,
  assetBasePath: string,
): EngineParallaxPackage {
  const base = assetBasePath.replace(/\\/g, "/").replace(/\/$/, "");
  const stackSlug = slugify(stack.name);
  const layers: EngineParallaxLayerSpec[] = stack.layers.map((L, i) => {
    const scroll = depthToScroll(L.depth);
    return {
      name: L.name,
      file: `${base}/layers/${String(i).padStart(2, "0")}_${slugify(L.name)}.png`,
      depth: L.depth,
      scrollX: L.scrollScaleX ?? scroll,
      scrollY: L.scrollScaleY ?? scroll,
      repeatX: L.repeatX ?? true,
      repeatY: L.repeatY ?? false,
      autoscrollX: L.autoscrollX ?? 0,
      autoscrollY: L.autoscrollY ?? 0,
      zIndex: L.zIndex ?? i,
      notes: layerEngineNotes(engine, L.depth),
    };
  });

  const setupFiles = buildSetupFiles(engine, stack, stackSlug, layers, base);
  const summary = summarize(engine, stack, layers);

  return { engine, stackName: stack.name, layers, setupFiles, summary };
}

function summarize(
  engine: EngineId,
  stack: ParallaxStack,
  layers: EngineParallaxLayerSpec[],
): string {
  const mode = stack.mode === "sheet" ? "sheet-wide" : "viewport";
  return `${engine} · ${stack.name} · ${layers.length} layers · ${mode} · view ${stack.viewW}×${stack.viewH}`;
}

function buildSetupFiles(
  engine: EngineId,
  stack: ParallaxStack,
  stackSlug: string,
  layers: EngineParallaxLayerSpec[],
  base: string,
): { path: string; content: string }[] {
  switch (engine) {
    case "godot":
      return godotFiles(stack, stackSlug, layers, base);
    case "unity":
      return unityFiles(stack, stackSlug, layers, base);
    case "unreal":
      return unrealFiles(stack, stackSlug, layers, base);
    case "gamemaker":
      return gamemakerFiles(stack, stackSlug, layers, base);
    default:
      return genericFiles(stack, stackSlug, layers, base);
  }
}

/* ── Godot 4: Parallax2D + child Sprite2D per layer ─────────── */

function godotFiles(
  stack: ParallaxStack,
  stackSlug: string,
  layers: EngineParallaxLayerSpec[],
  base: string,
) {
  const nodes = layers
    .map((L, i) => {
      const node = `Layer_${i}_${slugify(L.name)}`;
      const res = `res://${L.file}`;
      const sx = L.scrollX.toFixed(3);
      const sy = L.scrollY.toFixed(3);
      const rx = L.repeatX ? Math.max(stack.viewW, 512) : 0;
      const ry = L.repeatY ? Math.max(stack.viewH, 288) : 0;
      return `
[node name="${node}" type="Parallax2D" parent="."]
scroll_scale = Vector2(${sx}, ${sy})
repeat_size = Vector2(${rx}, ${ry})
autoscroll = Vector2(${L.autoscrollX}, ${L.autoscrollY})
follow_viewport = true

[node name="Sprite" type="Sprite2D" parent="${node}"]
texture = ExtResource("${i}")
centered = false
texture_filter = 0
`;
    })
    .join("\n");

  const ext = layers
    .map((L, i) => `[ext_resource type="Texture2D" path="res://${L.file}" id="${i}"]`)
    .join("\n");

  const tscn = `[gd_scene load_steps=${layers.length + 1} format=3]
; PixelPlane → Godot 4 Parallax2D
; https://docs.godotengine.org/en/stable/classes/class_parallax2d.html
; scroll_scale 0 = farthest/static, 1 = matches Camera2D

${ext}

[node name="${stackSlug}" type="Node2D"]

${nodes}
`;

  const readme = `# Godot 4 — ${stack.name}

## How PixelPlane maps to Godot
| PixelPlane | Godot 4 |
|---|---|
| depth 0..1 | \`Parallax2D.scroll_scale\` (Vector2) |
| repeat | \`repeat_size\` (pixels) |
| autoscroll | \`autoscroll\` (px/sec) |
| layer PNG | child \`Sprite2D\` texture |

## Setup
1. Copy \`${base}/\` into your Godot project.
2. Open \`${stackSlug}_parallax.tscn\` (or instance it under your level).
3. Ensure a \`Camera2D\` is active — Parallax2D follows viewport by default.
4. For infinite rain/city strips, keep \`repeat_size.x\` ≥ viewport width.
5. Pixel art: Project → Rendering → Textures → Default Texture Filter = **Nearest**.

## Layers
${layers.map((L) => `- **${L.name}** depth=${L.depth.toFixed(2)} → scroll_scale=(${L.scrollX}, ${L.scrollY})`).join("\n")}
`;

  return [
    { path: `${base}/${stackSlug}_parallax.tscn`, content: tscn },
    { path: `${base}/GODOT_PARALLAX.md`, content: readme },
    {
      path: `${base}/parallax_config.json`,
      content: JSON.stringify({ engine: "godot", stack: stack.name, layers }, null, 2),
    },
  ];
}

/* ── Unity: LateUpdate parallax (Cinemachine-safe) ─────────── */

function unityFiles(
  stack: ParallaxStack,
  stackSlug: string,
  layers: EngineParallaxLayerSpec[],
  base: string,
) {
  const cs = `// PixelPlane → Unity 2D Parallax
// Place on an empty "ParallaxRoot" under your level.
// Runs in LateUpdate so it stays stable with Cinemachine.
// Convention: parallaxEffect 0 = static sky, 1 = locked to camera.

using UnityEngine;

[System.Serializable]
public class PixelPlaneParallaxLayer
{
    public Transform transform;
    [Range(0f, 1.5f)] public float parallaxEffect = 0.5f;
    public bool infiniteHorizontal = true;
    public float textureUnitSizeX;
}

public class PixelPlaneParallax : MonoBehaviour
{
    public Transform cameraTransform;
    public PixelPlaneParallaxLayer[] layers;

    Vector3 _lastCam;

    void Start()
    {
        if (!cameraTransform && Camera.main) cameraTransform = Camera.main.transform;
        _lastCam = cameraTransform.position;
        foreach (var L in layers)
        {
            if (!L.transform) continue;
            var sr = L.transform.GetComponent<SpriteRenderer>();
            if (sr && sr.sprite)
                L.textureUnitSizeX = sr.sprite.bounds.size.x;
        }
    }

    void LateUpdate()
    {
        if (!cameraTransform) return;
        Vector3 delta = cameraTransform.position - _lastCam;
        foreach (var L in layers)
        {
            if (!L.transform) continue;
            L.transform.position += new Vector3(delta.x * L.parallaxEffect, delta.y * L.parallaxEffect, 0f);
            if (L.infiniteHorizontal && L.textureUnitSizeX > 0.01f)
            {
                float dist = cameraTransform.position.x - L.transform.position.x;
                if (Mathf.Abs(dist) >= L.textureUnitSizeX)
                {
                    float offset = dist % L.textureUnitSizeX;
                    L.transform.position = new Vector3(
                        cameraTransform.position.x + offset,
                        L.transform.position.y,
                        L.transform.position.z);
                }
            }
        }
        _lastCam = cameraTransform.position;
    }
}

/* Suggested hierarchy:
 * ParallaxRoot (this script)
 *   Layer_Far   (SpriteRenderer)  parallaxEffect = ${layers[0]?.scrollX ?? 0.15}
 *   Layer_Mid   (SpriteRenderer)  parallaxEffect = ${layers[1]?.scrollX ?? 0.45}
 *   Layer_Near  (SpriteRenderer)  parallaxEffect = ${layers[2]?.scrollX ?? 0.85}
 *
 * Import PNGs as Sprite (2D and UI), Filter Mode = Point, Compression = None.
 */
`;

  const readme = `# Unity — ${stack.name}

## How PixelPlane maps to Unity
| PixelPlane depth | Unity \`parallaxEffect\` |
|---|---|
| 0.0 | static (sky) |
| 0.2–0.5 | far / mid backgrounds |
| 0.85+ | near props / rooftops |
| 1.0 | full camera follow |

## Setup
1. Import \`${base}/layers/*.png\` as **Sprite (2D and UI)**.
2. Filter Mode = **Point**, Compression = **None**.
3. Create empty GameObject \`ParallaxRoot\`, add \`PixelPlaneParallax.cs\`.
4. Child one SpriteRenderer per layer; assign array + camera (or Main Camera).
5. If using **Cinemachine**, keep this script in **LateUpdate** (already) so it runs after the brain.

## Layer values (from PixelPlane)
${layers.map((L) => `- **${L.name}**: parallaxEffect = ${L.scrollX.toFixed(3)}  (${L.file})`).join("\n")}
`;

  return [
    { path: `${base}/PixelPlaneParallax.cs`, content: cs },
    { path: `${base}/UNITY_PARALLAX.md`, content: readme },
    {
      path: `${base}/parallax_config.json`,
      content: JSON.stringify(
        {
          engine: "unity",
          stack: stack.name,
          layers: layers.map((L) => ({
            name: L.name,
            file: L.file,
            parallaxEffect: L.scrollX,
            infiniteHorizontal: L.repeatX,
          })),
        },
        null,
        2,
      ),
    },
  ];
}

/* ── Unreal: Paper2D / orthographic scroll factors ─────────── */

function unrealFiles(
  stack: ParallaxStack,
  stackSlug: string,
  layers: EngineParallaxLayerSpec[],
  base: string,
) {
  const cpp = `// PixelPlane → Unreal Paper2D-style parallax component (header sketch)
// Attach to an Actor that owns PaperSpriteComponents for each layer.
// Orthographic camera: offset each layer by CameraLocation * ScrollFactor.

#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "PixelPlaneParallaxComponent.generated.h"

USTRUCT(BlueprintType)
struct FPixelPlaneParallaxLayer
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite) USceneComponent* Component = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float ScrollFactor = 0.5f; // 0 static .. 1 camera
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FVector StartLocation = FVector::ZeroVector;
};

UCLASS(ClassGroup=(PixelPlane), meta=(BlueprintSpawnableComponent))
class UPixelPlaneParallaxComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FPixelPlaneParallaxLayer> Layers;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) AActor* CameraActor = nullptr;

    virtual void TickComponent(float DeltaTime, ELevelTick TickType,
        FActorComponentTickFunction* ThisTickFunction) override
    {
        Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
        if (!CameraActor) return;
        const FVector Cam = CameraActor->GetActorLocation();
        for (auto& L : Layers)
        {
            if (!L.Component) continue;
            const FVector Target(
                L.StartLocation.X + Cam.X * L.ScrollFactor,
                L.StartLocation.Y + Cam.Y * L.ScrollFactor,
                L.StartLocation.Z);
            L.Component->SetWorldLocation(Target);
        }
    }
};
`;

  const readme = `# Unreal Engine — ${stack.name}

## How PixelPlane maps to Unreal
PixelPlane depth becomes a **ScrollFactor** on each Paper2D / scene component:
- **0.0** — fixed screen sky
- **0.2–0.5** — distant city / mid plates
- **0.85+** — near rooftops / FG plates

## Setup (Paper2D or flipbook sprites)
1. Import \`${base}/layers/*.png\` (Texture Group: 2D Pixels, no mip filter if possible).
2. Create Paper Sprites (or materials with nearest filtering).
3. Spawn an Actor with one component per layer + \`UPixelPlaneParallaxComponent\`.
4. Assign the player/camera actor; set ScrollFactor from the table below.
5. Keep orthographic camera for pure 2D; Z can still order draw priority.

## Layer values
${layers.map((L) => `- **${L.name}**: ScrollFactor=${L.scrollX.toFixed(3)}  file=\`${L.file}\``).join("\n")}

## Alternative: true 3D depth
Place layers at different Y/Z distances and use a perspective camera — PixelPlane still exports the plate PNGs; set depth order to match far→near.
`;

  return [
    { path: `${base}/PixelPlaneParallaxComponent.h`, content: cpp },
    { path: `${base}/UNREAL_PARALLAX.md`, content: readme },
    {
      path: `${base}/parallax_config.json`,
      content: JSON.stringify({ engine: "unreal", stack: stack.name, layers }, null, 2),
    },
  ];
}

/* ── GameMaker: layer_x / layer_hspeed factors ─────────────── */

function gamemakerFiles(
  stack: ParallaxStack,
  stackSlug: string,
  layers: EngineParallaxLayerSpec[],
  base: string,
) {
  const layerIds = layers.map((L, i) => `layer_${i}_${slugify(L.name)}`);
  const gml = `/// PixelPlane → GameMaker Studio parallax
/// Call from Camera object's End Step (after camera position is final).
/// depth/factor 0 = static, 1 = moves with camera fully.

function pixelplane_parallax_update(_cam_x, _cam_y)
{
${layers
  .map((L, i) => {
    const id = layerIds[i];
    return `    // ${L.name}  depth=${L.depth.toFixed(2)}
    var _lx = -_cam_x * ${L.scrollX.toFixed(4)};
    var _ly = -_cam_y * ${L.scrollY.toFixed(4)};
    if (layer_exists("${id}"))
    {
        layer_x("${id}", _lx);
        layer_y("${id}", _ly);
    }`;
  })
  .join("\n\n")}
}

/*
 Room setup:
 1. Import sprites from ${base}/layers/
 2. Create Asset Layers (or Background layers) named:
${layerIds.map((id, i) => `    - ${id}  (factor ${layers[i].scrollX.toFixed(2)})`).join("\n")}
 3. Order: far at bottom of layer stack, near on top.
 4. Optional horizontal wrap: use layer_hspeed with tiled backgrounds,
    or manual wrap when sprite leaves view.
*/
`;

  const readme = `# GameMaker Studio — ${stack.name}

## How PixelPlane maps to GameMaker
| PixelPlane | GameMaker |
|---|---|
| depth 0..1 | camera-relative \`layer_x\` / \`layer_y\` factor |
| far layers | smaller factor (0.1–0.3) |
| near layers | larger factor (0.7–0.9) |
| repeat | tiled background or wrap logic |

## Setup
1. Import \`${base}/layers/*.png\` as sprites (disable interpolation).
2. Create one room layer per entry (names match the GML strings).
3. Paste \`pixelplane_parallax_update\` into a script; call from camera End Step:
   \`pixelplane_parallax_update(camera_get_view_x(view_camera[0]), camera_get_view_y(view_camera[0]));\`

## Layers
${layers.map((L, i) => `- **${L.name}** → layer \`${layerIds[i]}\` factor ${L.scrollX.toFixed(3)}`).join("\n")}
`;

  return [
    { path: `${base}/pixelplane_parallax.gml`, content: gml },
    { path: `${base}/GAMEMAKER_PARALLAX.md`, content: readme },
    {
      path: `${base}/parallax_config.json`,
      content: JSON.stringify(
        {
          engine: "gamemaker",
          stack: stack.name,
          layers: layers.map((L, i) => ({
            name: L.name,
            layer_id: layerIds[i],
            factor_x: L.scrollX,
            factor_y: L.scrollY,
            file: L.file,
          })),
        },
        null,
        2,
      ),
    },
  ];
}

function genericFiles(
  stack: ParallaxStack,
  stackSlug: string,
  layers: EngineParallaxLayerSpec[],
  base: string,
) {
  const readme = `# Generic engine — ${stack.name}

PixelPlane depth is a 0..1 scroll factor:
\`layer_offset = -camera_position * depth\`

Layers:
${layers.map((L) => `- ${L.name}: depth=${L.depth} file=${L.file}`).join("\n")}
`;
  return [
    { path: `${base}/PARALLAX.md`, content: readme },
    {
      path: `${base}/parallax_config.json`,
      content: JSON.stringify({ engine: "generic", stack: stack.name, layers }, null, 2),
    },
  ];
}

/** Suggested folder subpaths for a named parallax set under assets/parallax/ */
export const PARALLAX_SUBFOLDERS = [
  { name: "layers", label: "Layer PNGs (far→near)" },
  { name: "sheets", label: "Combined sheets" },
  { name: "config", label: "Engine config" },
] as const;
