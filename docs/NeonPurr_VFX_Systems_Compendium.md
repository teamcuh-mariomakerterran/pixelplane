# Neon_Purr: Gridpaw — VFX Systems Compendium
**Custom Engine Reference Document**  
Compiled: August 13, 2026  
Covers everything from pure effect animation sheets through advanced custom-engine VFX systems.

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [Animation Sheet Library Overview](#2-animation-sheet-library-overview)
3. [EffectPlayer System (Sprite Sheet Layer)](#3-effectplayer-system-sprite-sheet-layer)
4. [Shader Pack](#4-shader-pack)
5. [Particle System (CPU)](#5-particle-system-cpu)
6. [Custom Engine Adaptations](#6-custom-engine-adaptations)
7. [Advanced Systems (The 8 Pillars)](#7-advanced-systems-the-8-pillars)
8. [Recommended Build Order](#8-recommended-build-order)
9. [Spatial Hashing Notes (Next Priority)](#9-spatial-hashing-notes-next-priority)
10. [GPU Particles (Future)](#10-gpu-particles-future)

---

## 1. Core Philosophy

- **Pure effects only** for beams, explosions, sparks, debris, smoke.
- Bright, high-contrast, saturated neon (cyan / magenta / purple dominant).
- Hard 1-2px near-black outlines on authored sheets.
- Chunky visible pixels.
- Fully transparent backgrounds.
- Directional variants (South, South-East, East) for flip-friendly 8-way coverage.
- Multi-layer compositing + intensity scaling is preferred over drawing more frames.
- Procedural systems exist to multiply the value of hand-authored sheets, not replace them.

---

## 2. Animation Sheet Library Overview

### Beam / Thruster / Weapon Effects
- Sharp Ion Ignition
- Violent Hybrid Flash
- Beam Travel / Mid-Air Streaks
- Splitting Beams
- Curved / Arcing Trails
- Color-Shifting Beams
- Lingering After-Image Trails
- Charged Ultimate Sequences
- Plasma Whip / Energy Ribbon
- Bonus Chaos (multi-split + color-shift + after-image)
- Dragon Ball Z style Mega Beams (standard + extended + extra-thick)

All produced in South / South-East / East directions where applicable.

### Explosion Library
- Side View: Medium Sharp, Heavy Chaotic, Energy Burst
- Top-Down: Medium, Wide Bloom, Heavy Impact
- Isometric (2:1): Medium, Large Scale, Sharp Energy
- Extra Variations: Tiny Pops, Massive Screen-Fillers, Multi-Hit Chains, Residual Energy/Smoke, Delayed Secondary Blasts

### Impact & Reaction
- Metal Sparks
- Energy Ricochet
- Shield Impact
- Heavy Hit Reaction
- Mixed Impact

### Debris & Shrapnel
- Metal Shrapnel
- Energy Debris
- Mixed Debris + Sparks
- Heavy Chunk Debris
- Scattering Debris Fields

### Smoke
- Side View: Large Area Columns, Smaller Columns
- Isometric: Medium, Large, Thin Wisps

---

## 3. EffectPlayer System (Sprite Sheet Layer)

### Purpose
Play one or more sprite sheets with intensity, direction, layering, and optional screen shake.

### Core Features
- Multi-layer stacking (core + outer + residual)
- Intensity scales size, alpha, and frame range
- Direction via rotation or pre-authored directional sheets
- Screen shake integration
- Error handling for missing sheets

### Recommended Data (Custom Engine)

```cpp
struct VFXLayer {
    SpriteSheet* sheet;
    float scale_multiplier = 1.0f;
    float alpha = 1.0f;
    float speed = 1.0f;
    float start_normalized = 0.0f;
    float end_normalized = 1.0f;
};

struct VFXInstance {
    std::vector<VFXLayer> layers;
    Vec2 position;
    float rotation = 0.0f;
    float intensity = 1.0f;
    float age = 0.0f;
    float lifetime = 1.0f;
    bool active = false;
};
```

### Playback Logic (Simplified)

```cpp
for each active VFXInstance:
    float t = age / lifetime;
    for each layer:
        float layer_t = clamp(t * layer.speed, layer.start_normalized, layer.end_normalized);
        int frame = int(layer_t * (sheet->frame_count - 1));
        Draw(sheet, frame, position, rotation, scale * intensity * layer.scale_multiplier, alpha);
    age += dt * (hit_stop.active ? hit_stop.vfx_time_scale : 1.0f);
```

### Screen Shake

```cpp
struct ShakeState {
    float strength = 0.0f;
    float timer = 0.0f;
    float decay = 8.0f;
};

void AddShake(float strength, float duration);
```

Apply random offset to camera while timer > 0, then decay.

---

## 4. Shader Pack

Four core shaders designed for neon pixel-art VFX:

### 4.1 Hue / Color Shift
- Converts RGB → HSV, shifts hue, adjusts saturation/value, converts back.
- Primary use: turn cyan sheets into magenta or purple at runtime.

### 4.2 Additive Glow
- Boosts bright pixels and tints them.
- Makes beams and explosions feel more energetic.

### 4.3 Dissolve
- Noise-based dissolve with optional bright edge.
- Perfect for residual smoke, fading debris, and death of energy effects.

### 4.4 Heat Haze / UV Distortion
- Dual-noise UV offset over time.
- Subtle distortion over large beams or residual energy.

**Material System Recommendation**

```cpp
struct Material {
    Shader* shader;
    BlendMode blend; // Alpha, Additive, Multiply
    float hue_shift;
    float dissolve_amount;
    float distortion_strength;
    Texture* noise_texture;
};
```

Support material instances so per-effect parameters can change without cloning everything.

---

## 5. Particle System (CPU)

### Particle Struct

```cpp
struct Particle {
    Vec2 position;
    Vec2 velocity;
    float life;
    float max_life;
    float scale;
    float rotation;
    float angular_velocity;
    int frame;
    Color color;
};
```

### Emitter Features Worth Supporting
- Emission rate + one-shot + explosiveness
- Shape (Point, Circle, Cone, Box)
- Lifetime + variance
- Speed, spread, gravity, drag
- Scale over life (curve)
- Color over life (gradient)
- Sprite sheet animation
- Sub-emitters (particle death spawns another emitter)
- Simple collision / bounce
- Force fields (attractor, turbulence, vortex)

### Hybrid Approach (Recommended)
Use the EffectPlayer for the main authored explosion/beam, then spawn a CPU particle burst for sparks, extra debris, and residual energy. This almost always looks better than pure particles or pure sheets alone.

---

## 6. Custom Engine Adaptations

### Object Pooling
- Separate pools for VFXInstances and Particles
- Pre-allocate at level load
- Free-list or generational indices
- Track peak usage for tuning

### Sprite Atlas Handling
- Pack VFX sheets into large atlases (2048/4096)
- Store frames as UV rects + pivot
- Nearest filtering for pixel art
- Optional controlled mips for very large explosions

### Time Scale Separation
- Gameplay uses normal `dt`
- Pure VFX systems use `dt * vfx_time_scale` (for selective hit-stop)

---

## 7. Advanced Systems (The 8 Pillars)

### 7.1 Selective Hit-Stop
- Freeze only VFX layers for 1–4 frames on heavy hits.
- Gameplay continues at full speed.
- Extremely high “weight” feel for very low cost.

### 7.2 Time-Ribbon Trails
- Short history of positions (≈ 200–250 ms).
- Rendered as additive triangle strips with chromatic aberration.
- Attach to fast beams and high-intensity projectiles.

### 7.3 Reactive Color Bleed
- Strong effects spawn temporary color fields.
- Nearby sprites/tiles lerp toward the effect’s hue and receive a brightness boost.
- Spatial query + smooth falloff.

### 7.4 Procedural Secondary Physics Debris
- Big explosions spawn real physics bodies using debris sheets.
- They collide, spin, then dissolve.
- Highest single multiplier for explosion “feel”.

### 7.5 Directional Impact Memory
- Surfaces store last strong hit direction + intensity.
- Shader uses this for directional scorch / residual glow.
- Fades over seconds to tens of seconds.

### 7.6 Persistent World Scar System
- Large effects write long-lasting or permanent scars (scorch, cracks, neon stains).
- Separate layer or render target.
- Can persist across sessions.

### 7.7 Neon Inheritance
- Overlapping energy fields can mix or exchange hue.
- Beams that cross change color mid-flight.
- Visually unique and memorable.

### 7.8 Audio-Reactive Intensity
- Residual energy and haze subtly pulse with music/sound energy.
- Keep subtle. Apply only to lingering effects.

---

## 8. Recommended Build Order

1. Selective Hit-Stop
2. Time-Ribbon Trails
3. Reactive Color Bleed
4. Procedural Physics Debris
5. Directional Impact Memory
6. Persistent World Scars
7. Neon Inheritance
8. Audio-Reactive VFX

**After the above:** Spatial Hashing → GPU Particles

---

## 9. Spatial Hashing Notes (Next Priority)

Several systems (Color Bleed, Neon Inheritance, Impact Memory queries, Scar lookups) benefit heavily from a spatial hash or grid.

Basic approach:
- Fixed cell size (e.g. 64 or 128 px)
- Each cell holds a list of active effect IDs or entity IDs
- Insert/remove on move or spawn/despawn
- Query returns only the cells that overlap the search radius

This keeps the advanced systems viable even with many simultaneous effects.

---

## 10. GPU Particles (Future)

Once CPU particles + spatial hashing are solid:

- Move particle simulation to compute shader or vertex/geometry path
- Keep the same emitter interface so gameplay code does not change
- Use GPU particles for very high count effects (rain of sparks, dense residual fields)
- Keep CPU particles for anything that needs precise collision or sub-emitters

---

## Final Notes

- All systems above are designed to multiply the value of the hand-authored sheets rather than replace them.
- The hybrid model (authored multi-layer sheets + particles + procedural systems) produces the most expensive-looking results for the least ongoing art cost.
- Keep everything data-driven and hot-reloadable during development.

This compendium is the single reference for the VFX architecture going forward.

**End of Compendium**
