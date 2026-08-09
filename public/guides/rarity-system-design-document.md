## § 01 OVERVIEW & DESIGN PHILOSOPHY

### Purpose of the Rarity System

The rarity system serves as the foundational visual and gameplay language for communicating item value, scarcity, and power to the player. It operates across three simultaneous layers:

Player Motivation — Rarity tiers create an aspirational ladder. Players grind not just for stats, but for the visual prestige and identity of higher-tier items. A player carrying an Exotic backpack is making a statement.

Economy Signaling — In any trading, looting, or crafting system, rarity is an instant shorthand for item worth. The system must communicate "this is valuable" before the player reads a single stat line.

Visual Hierarchy — In a scene with multiple dropped items, rarity glow and animation guide the player's eye. Higher rarity items demand attention. Common items recede. This is intentional and must be preserved across all contexts.

### The Cyber Noir Aesthetic Lens

Every tier tells a story rooted in the world's cyber noir fiction. Rarity is not just a game mechanic — it is a narrative signal about where an item came from, who made it, and what it costs to obtain it. Designers and artists should internalize the world story of each tier:

Common — Street-level scrap. Off-the-shelf. Mass produced in gray-market factories.

Uncommon — Modified hardware. Someone cared enough to tinker. Above the noise floor.

Rare — Black market imports. Not on any official manifest. Expensive and intentional.

Epic — Prototype-grade. Corporate black labs. Dangerous to own.

Legendary — Pre-collapse relic. Tech nobody understands anymore. Should not exist.

Exotic / Exotic — Outside the registry entirely. No origin. The city doesn't know it. It just is.

### Pixel Art Constraints

All glow, animation, and atmospheric effects must be achievable in chunky 16-bit pixel art style. The following techniques are the approved toolkit for all rarity expression:

Dithered halos — Concentric rings of decreasing saturation pixels simulate bloom without alpha transparency

Scanline shimmer — Horizontal 1px dark lines animated to scroll vertically

Pixel bloom — Hard-edged pixel "explosion" of color around item outlines

Sprite oscillation — Integer-pixel up/down float on a looping frame cycle

Palette cycling — Swapping specific palette slots across frames to simulate color animation

## § 02 RARITY TIER DEFINITIONS

The following table provides a quick cross-reference for all six tiers. Detailed subsections follow.

── TIER DETAIL ─────────────────────────────────────────────────────────────────────────────────

## § 03 VISUAL STYLE GUIDELINES BY TIER

### Pixel Art Execution Rules

Outline Thickness Per Tier

Outline thickness is a primary legibility cue independent of color. Artists must adhere to the following per-tier outline budgets:

Dithering Patterns

Checkerboard dither — Used for mid-tone transitions and medium-intensity glow bleed. Alternating pixels of glow color and background on a 1:1 grid. Standard use: second ring of glow bloom, shadow-to-midtone transition on Epic+.

Diagonal stripe dither — Used for glow bleed-off at the outer falloff zone. Every other diagonal pixel lit. Creates a softer apparent fade. Standard use: outer 1–2px of bloom zone on Legendary and Exotic.

Sparse scatter dither — Individual isolated pixels at approximately 10–20% density. Used for extreme outer glow falloff and the "particle dust" feel at Legendary+.

No sub-pixel dithering — All dithering operates on whole pixel boundaries. No fractional pixel techniques. The chunky pixel identity is preserved in all dither operations.

Handling the Chunky Pixel Style

This game uses a deliberately bold, thick-pixel aesthetic. The following rules are mandatory for all rarity art:

No sub-pixel anti-aliasing. Ever. Under any circumstances. Edges are hard.

Embrace the blocky quality — small details at 16x16 or 32x32 must read as bold shapes, not fine linework

Minimum recognizable feature size: 2x2 pixels. Single pixels are used only for glow scatter and particle effects

Shading uses stepped color bands, not smooth gradients. Maximum 3 shade bands per color zone

Highlights are placed on a single pixel row or column — not blended across multiple pixels

Color Palette Discipline

Lower tiers (Common, Uncommon) use desaturated, muted palettes. Common should feel grayscale-adjacent. Uncommon introduces the first hint of real color.

Mid tiers (Rare, Epic) use increasingly saturated palettes. Colors become vivid and directional — blue for Rare, violet for Epic.

Upper tiers (Legendary, Exotic) use fully saturated neon-shifted palettes. Every color choice at these tiers should feel slightly impossible — too bright, too pure, too clean for the world's grime.

Palette saturation increases monotonically from Common to Exotic. No upper-tier item should ever use a color more muted than the tier below it.

### Animation Guidelines

All animations must loop seamlessly. The last frame must transition back to the first frame without a visible pop or jump.

Pulse animations use a sine-wave easing curve applied to pixel brightness values — ease in, ease out, not linear.

Particle pixels are 1x1 or 2x2 pixel blocks only. No sub-pixel movement. Particle position updates on whole-pixel intervals.

Scanline effects: horizontal 1px dark lines (value: approximately 40% darkness overlay) spaced every 2–4 pixels, animated to scroll vertically on a 1-pixel-per-frame basis.

Float animations (Epic bobber, Exotic items): integer pixel offsets only. 2px up, hold, 2px down, hold. No fractional offsets.

### Glow / Bloom Pixel Art Technique

The standard glow ring construction, applied at appropriate scale per tier:

Inner ring (Ring 1): 100% glow color, 1px solid border around item outline

Second ring (Ring 2): 60% saturation glow color, checkerboard dither, 1px wide

Third ring (Ring 3): 30% saturation glow color, sparse diagonal dither, 1–2px wide

Outer falloff: Single scattered pixels at 10–15% brightness — no pattern, organically placed

Tiers that do not include a given ring simply stop at the appropriate ring for their glow intensity level. Common uses no rings. Uncommon uses only Ring 1 (static). Rare uses Rings 1–2. Epic uses Rings 1–3. Legendary and Exotic use all rings plus outer falloff.

## § 04 APPLICATION TO BACKPACKS

Backpacks are a primary player-carried item type and serve as one of the most visible rarity expression surfaces. The backpack is visible on the player character sprite in-world, making rarity legibility critical even at character sprite scale.

## § 05 APPLICATION TO FISHING BOBBERS

Fishing bobbers present a unique rarity expression challenge: small size (6–10px diameter sphere), partial submersion in water, and the need to communicate rarity while in motion. The water interaction layer is an additional canvas for rarity expression — ripple color and spread are tier-specific.

## § 06 APPLICATION TO CRATE DROPS

Crate drops are world events — they fall from above, land in the game world, and remain until opened. The drop, landing, and idle phases each have distinct rarity expression requirements. Higher rarity crates turn the landing into a visual event.

## § 07 APPLICATION TO INVENTORY ICONS

Inventory icons are the highest-density rarity expression surface — 32x32 pixels (or 16x16 for compact views) must communicate tier, item type, and relative value at a glance. The icon border frame, background fill, and sprite treatment are all tier-defined.

### Icon Border Frames

Each rarity tier has a distinct icon border frame that is a separate composited asset overlaid at render time. The frame is NOT embedded in the item sprite — this allows one item sprite to be used across all rarity levels with tier-appropriate framing applied dynamically.

### Background Fill by Tier

The icon background (behind the item sprite but inside the frame) is tier-colored to provide instant gestalt recognition even before border details are processed:

### Item Sprite Rendering in Icon

Common / Uncommon: Flat pixel sprite, no special effects. Sprite renders at full palette but no glow, no border highlight beyond the frame.

Rare: A 1px glow pixel border traces the item sprite's silhouette inside the icon, using the blue glow color (#40C4FF). Static — not animated.

Epic: Inner glow on the item sprite using dithered purple pixels within the silhouette's interior-facing edges. Background halo visible as a faint dithered purple cloud behind the sprite.

Legendary: Full glow (all rings), animated shimmer frame sweeping across the sprite on the standard Legendary animation loop. Item sprite itself has a warm highlight pixel that cycles brighter/dimmer (2-frame brightness toggle).

Exotic: Dual-color glow wrapping the entire sprite silhouette. The sprite itself has palette-cycling pixels on its highlight zones — key highlight pixels alternate between magenta and cyan on the 500ms cycle.

### Hover and Selection State

When an inventory icon is hovered or selected by the player cursor, the tier's visual treatment amplifies:

Bloom radius of glow increases by 2–3px beyond idle state

Frame border brightens to full saturation (if it was in a dimmed idle phase, it snaps to max brightness)

A tooltip appears above/below the icon displaying the tier name in the tier's primary color, item name, and key stats

Exotic hover state: both magenta and cyan bloom amplify simultaneously; the tooltip header line alternates between magenta and cyan text color on the 500ms cycle

### Stacking Count Badges

Item quantity count badges (the number displayed in the icon corner for stackable items) use the tier's primary color as the badge background with white Consolas-style pixel text. The badge is a small rectangle (approximately 8x6px) in the bottom-right corner of the icon frame, using the tier primary hex as fill.

## § 08 RARITY QUICK REFERENCE CARD

Developer reference — print and pin. All values are definitive. Do not interpolate between tiers.

## § 09 IMPLEMENTATION NOTES FOR DEVELOPERS

### Rarity Enum Definition

Rarity tier is stored and referenced as an enum throughout all systems. Do not use integer or string comparisons directly — always use the enum:

RARITY :: COMMON | UNCOMMON | RARE | EPIC | LEGENDARY | EXOTIC

### Sprite Sheet & Animation Config

Animation frames stored as standard sprite sheets; frame dimensions, count, playback rate, and loop behavior defined in a rarity animation config table (JSON or equivalent data format)

The config table is keyed by RARITY enum value and contains: frame_count, fps, loop_mode (FORWARD / PINGPONG / NONE), particle_enabled, particle_cap

Frame rate values are defined as target FPS; the animation system should use delta-time accumulation for frame advancement, not fixed-step

### Icon Border Compositing

Icon border frames are separate assets, composited over the base item sprite at render time

Border frame asset naming convention: icon_border_[TIER]_[frame_index].png

Static tiers (Common, Uncommon, Rare) use a single border frame. Animated tiers (Epic, Legendary, Exotic) use a border sprite sheet matching their animation frame count

Icon background fill is a flat color rectangle rendered below the item sprite — generated from the palette asset, not a separate image asset

### Exotic Dual-Color Cycle

### Particle Systems

Legendary and Exotic particle systems are defined in a dedicated particle config file, separate from the main animation config

Legendary particle config: 1x1 gold pixel blocks, upward velocity only, 1–2 active particles per item, 1.0 second spawn interval, 1.5 second lifetime, linear fade-out on final 3 frames

Exotic particle config: 1x1 pixel blocks alternating magenta/cyan per spawn, emit from all 4 edges, radial outward velocity (8 directions), max 8 active particles per item at any time (hard cap), 0.5 second spawn interval, 1.0 second lifetime

Performance cap: Particle pixel count is hard-capped at 8 per item instance. If multiple Exotic items are simultaneously visible on screen, each maintains its own 8-particle cap independently. No global particle budget pooling at this time.

### Scanline Effect Implementation

Scanline scroll is implemented as a separate overlay sprite (a repeating 1px dark stripe pattern matching the item's bounding box) that advances by 1px per frame in the vertical axis

When the overlay scrolls past the bottom of the bounding box, it wraps to the top — seamless loop

Scanline opacity (darkness value) is tier-specific: Legendary uses 30% darkening, Exotic uses 20% darkening (lighter scan to not obscure the dual-color content)

Scanline spacing: 1px dark line every 3px (i.e., dark — light — light — dark — light — light pattern)

── END OF DOCUMENT ─────────────────────────────────────────────────────────────────────────────

RARITY SYSTEM DESIGN DOCUMENT v1.0  ■  GAME DESIGN DIVISION  ■  INTERNAL USE ONLY
 ■░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░■

| ██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██ ░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░ Rarity System Design Document Visual Identity, Tier Definitions & Item Application Guidelines VERSION 1.0  |  GAME DESIGN DIVISION  |  CLASSIFICATION: INTERNAL LAST REVISED: 2026.07.26  |  STATUS: ACTIVE  |  AUTHOR: GAME DESIGN TEAM ░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░ ██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██░░██ |

| --- | --- | --- | --- | --- |

| ■ Core Design Pillar Rarity must be immediately legible at a glance. Color, glow, and animation work together as a unified signal — not independent decorations. No tier should be identifiable by color alone, and no tier should rely on fine detail that is lost at small sizes. Every rarity expression must read correctly at 16x16 pixels. |

| --- |

| ■ Accessibility Note Color is the primary rarity signal but NOT the only signal. Shape, animation intensity, and border style also encode rarity independently. A colorblind player must still be able to distinguish tiers by border thickness, animation complexity, and glow intensity alone. This is a hard design requirement, not a stretch goal. |

| --- |

| Tier | Primary Hex | Shadow Hex | Glow Hex | Border Style | Glow Intensity | Animation Type | Palette Size | Drop Rate |

| --- | --- | --- | --- | --- | --- | --- | --- | --- |

| COMMON | #9E9E9E | #616161 | — | 1px solid gray | None | Static | 3–4 colors | Very High |

| UNCOMMON | #66BB6A | #388E3C | #A5D6A7 | 1px + corner notches | Subtle | Slow idle pulse | 4–5 colors | High |

| RARE | #2196F3 | #0D47A1 | #40C4FF | 2px dashed blue | Medium | Slow shimmer cycle | 5–6 colors | Moderate |

| EPIC | #7B1FA2 | #CE93D8 | #EA80FC | 2px pulsing brackets | Strong | Oscillating aura cycle | 6–7 colors | Low |

| LEGENDARY | #FFD700 | #FF6F00 | #FFAB40 | 3px scanline flicker | Intense | Aura + particles + sweep | 7–8 colors | Very Low |

| EXOTIC | #FF00FF | #00FFFF | Dual-cycle | 4px alternating M/C | Overwhelming | Full aura — all systems | 8–10 colors | Exceptional |

| ▪ TIER 1 — COMMON Common "Off-the-shelf scrap. Found in every back-alley vendor stall. Nobody's proud of it, but everyone has it." •  Color Family: #9E9E9E primary  |  #616161 shadow  |  #E0E0E0 highlight •  Border Style: 1px solid gray, no decoration, no corner treatment •  Glow Intensity: None — no glow pixels, no bloom, no aura •  Animation Type: Static — single frame, no animation •  Palette Complexity: 3–4 colors max. Flat shading. No dithering permitted. •  Visual Feel: Utilitarian. Unadorned. Faintly worn. No special treatment whatsoever. |

| --- | --- | --- |

| ▪ TIER 2 — UNCOMMON Uncommon "Modified hardware. Someone put in the work. Slightly above the grid — enough to notice, not enough to covet." •  Color Family: #66BB6A primary  |  #388E3C shadow  |  #A5D6A7 highlight •  Border Style: 1px green border with subtle pixel corner notches (single pixel removed at each corner, creating a chamfered look) •  Glow Intensity: Subtle — faint 1px green pixel outer border glow, static in non-animated state •  Animation Type: Very slow idle pulse — barely perceptible shimmer on highlight pixels over a 3–4 second loop (2–4 frames) •  Palette Complexity: 4–5 colors. Slight dithering on shadow edges only. •  Visual Feel: A faint signal that this item deserves a second look. Not glamorous — just slightly elevated. |

| --- | --- | --- |

| ▪ TIER 3 — RARE Rare "Black market imports. Not on any official manifest. Someone paid for this — and paid more than you'd think." •  Color Family: #2196F3 primary  |  #0D47A1 shadow  |  #82B1FF highlight  |  #40C4FF glow •  Border Style: 2px blue border with pixel dash pattern — dash-gap-dash-gap sequence, dashes on all four sides •  Glow Intensity: Medium — blue outer glow 2–3px dithered bloom, faint inner light on center pixels •  Animation Type: Slow shimmer — highlight pixels cycle brightness on a 2–3 second loop (4–6 frames) •  Palette Complexity: 5–6 colors. Dithering used on glow and shadow transition zones. •  Visual Feel: Noticeably different. Players immediately recognize this as above baseline. There is an energy to it. |

| --- | --- | --- | --- |

| ▪ TIER 4 — EPIC Epic "Prototype-grade. Corporate black labs. The kind of gear that gets people killed. Not for owning — for being seen with." •  Color Family: #7B1FA2 base  |  #CE93D8 mid  |  #EA80FC glow •  Border Style: 2px purple border with animated corner L-bracket overlays — pixel corner shapes that pulse inward/outward on a 4-second cycle •  Glow Intensity: Strong — purple-magenta bloom radiating 3–4px, slight inner core lighting on the item's center mass •  Animation Type: Oscillating shimmer — highlight pixels rotate through a brightness wave over 4 seconds; corner brackets animate independently (6–8 frames) •  Palette Complexity: 6–7 colors. Heavy dithering on glow halos. Inner-glow dither pattern on item face. •  Visual Feel: Unmistakably powerful. The item glows with contained, barely-managed energy. It looks like it wants to do something. |

| --- | --- | --- |

| ▪ TIER 5 — LEGENDARY Legendary "Pre-collapse relic. Shouldn't exist. Runs on tech nobody understands anymore. The engineers who built it are dead." •  Color Family: #FFD700 primary  |  #FF6F00 warm shadow  |  #FFF9C4 bright highlight  |  #FFAB40 glow •  Border Style: 3px animated gold border — pixel scanline flicker effect along all border edges (not interior); border brightness pulses on a 2-second cycle •  Glow Intensity: Intense — warm gold outer bloom 4–5px with dithered amber core. Inner glow lights item from within, creating a sense of heat or power source inside. •  Animation Type: Continuous slow aura rotation; gold particle pixels (1x1 bright gold pixel blocks) drift upward from item base on loop; shimmer wave sweeps across full item every 3 seconds (8–12 frames) •  Palette Complexity: 7–8 colors. Full dithering on shadow and glow zones. Scanline texture overlay on flat surfaces. •  Visual Feel: The room gets brighter. Players stop what they are doing. This is a moment. This item arriving in a scene is an event. |

| --- | --- | --- | --- |

| ▪ TIER 6 — EXOTIC Exotic / Dual Signature "Exists outside the registry. No manufacturer. No origin. The net doesn't know it. The city doesn't know it. It just is. And it is looking back at you." •  Color Family: #FF00FF magenta primary  |  #00FFFF cyan secondary  |  Glow alternates between both on a 500ms cycle •  Border Style: 4px animated border — magenta/cyan pixel color cycle alternating every 0.5 seconds; corner bracket pixels animate with opposing flicker phase (magenta corners when cyan border, and vice versa) •  Glow Intensity: Overwhelming — dual-color bloom: magenta on left/bottom axis, cyan on right/top axis, blending in a dithered purple zone at center. 6–8px total bloom radius. This item affects adjacent pixel space. •  Animation Type: Full aura cycle — item oscillates 2px up/down float; particle pixels emit from ALL edges in both magenta and cyan; vertical scanline sweep moves top-to-bottom every 2 seconds; key highlight pixels cycle between magenta and cyan (12–16 frames) •  Palette Complexity: 8–10 colors. Full dithering. Dual-tone palette cycling. This tier intentionally breaks the normal palette budget — that budget violation IS the rarity signal. •  Visual Feel: Otherworldly. Alien. Players have never seen anything like it. The item radiates wrongness — beautiful, impossible wrongness. It should not exist. It does. |

| --- | --- | --- |

| ■ Reserved Color Rule Neon magenta (#FF00FF) and cyan (#00FFFF) are reserved as accent-only colors for Rare+ borders and glows, and as primary palette colors ONLY at the Exotic tier. No Common, Uncommon, or general world art may use these colors as primary fill or dominant hues. Violations break the Exotic tier's visual authority. |

| --- |

| Tier | Outline Thickness | Outline Color | Treatment |

| --- | --- | --- | --- |

| Common | 1px | #444444 — dark gray | Solid, uniform, no variation |

| Uncommon | 1px | #388E3C — dark green | Solid; corner pixel removed (chamfer notch) |

| Rare | 2px | #2196F3 — electric blue | Dashed pattern; inner 1px solid, outer 1px glow row |

| Epic | 2px | #CE93D8 — violet | Solid; animated L-bracket corners as overlaid sprite |

| Legendary | 3px | #FFD700 — gold | Chunky solid; scanline flicker animation on border pixels |

| Exotic | 4px | #FF00FF / #00FFFF | Alternating M/C full border color cycle; maximum visual weight |

| Tier | Frame Count | Loop Behavior | FPS (Approx.) |

| --- | --- | --- | --- |

| Common | 1 frame (static) | No loop | — |

| Uncommon | 2–4 frames | Ping-pong loop | 2–4 fps |

| Rare | 4–6 frames | Forward loop | 4–6 fps |

| Epic | 6–8 frames | Forward loop | 6–8 fps |

| Legendary | 8–12 frames | Forward loop, compound | 8–12 fps |

| Exotic | 12–16 frames | Forward loop, multi-layer | 12–16 fps |

| ■ Glow Construction Standard Glow is achieved through dithered concentric rings of decreasing color saturation and brightness — not through alpha blending or shader effects. All glow is hard-pixel simulation. Pre-render glow into sprite frames. No runtime glow compositing. |

| --- |

| COMMON BACKPACK Flat gray pixel art. Simple rectangular silhouette with no decorative elements. Worn texture simulated using dithered dark smudges at corners and stress points. Straps are dark gray (#424242). Single-strap buckle is a flat, dull metal pixel. 1px outline. No glow. No animation. The definition of "functional and forgettable." |

| --- |

| UNCOMMON BACKPACK Green-tinted metal clasps and zipper pull pixels distinguish this from Common. A subtle green highlight ridge runs along the top edge of the main compartment — a single 1px line of #A5D6A7. When selected or hovered, the 1px notched border becomes visible around the entire item frame. The green elements suggest intentional modification — aftermarket parts fitted by someone who cared. |

| --- |

| RARE BACKPACK A neon-blue stripe panel runs along the outer side panel of the backpack — a 2px bright blue line (#40C4FF) with a 1px dither shadow beneath it. Buckles and fastener pixels emit a subtle blue glow (Ring 1–2 construction). In the equipped world state, a dithered blue aura (Ring 2 intensity) is visible around the full backpack silhouette. The stripe animation: highlight pixels on the stripe pulse slowly, as if carrying a current. |

| --- |

| EPIC BACKPACK A purple holo-panel occupies the front face — a rectangular inset zone, approximately 40% of the backpack's front area, that cycles through a 6-frame shimmer animation (brightness sweep left-to-right). The outer frame shows animated corner L-brackets at all four corners, with the brackets pulsing inward and outward. Purple bloom radiates from the strap attachment points. This backpack reads as corporate-grade equipment with active power systems. |

| --- |

| LEGENDARY BACKPACK Gold trim runs along every seam, strap connection point, and zipper line — replacing what would be gray hardware with bright #FFD700 pixel accents. A subtle scanline sweep animation (1px dark scanline scrolling vertically) moves across the body every 4 seconds. Faint upward particle drift (1x1 gold pixels, 2–3 active at once, rising from shoulder strap attachment points) loops continuously. The backpack appears ancient but immaculate — engineered to a standard that no longer exists. |

| --- |

| EXOTIC BACKPACK  // DUAL-TONE Magenta/cyan split-panel design: the left half of the backpack surface glows magenta (#FF00FF dominant), the right half glows cyan (#00FFFF dominant), with a dithered center blend zone of approximately 4px width where checkerboard-dithered magenta and cyan pixels create a purple zone. The entire item oscillates 2px up and down. Particle pixels (1x1 blocks) emit continuously from both shoulder attachment points — magenta particles from the left, cyan from the right. The backpack projects dual-tone bloom onto the adjacent player character sprite — a 4px magenta tint on the left body half, cyan on the right. |

| --- |

| COMMON BOBBER Classic red-and-white chunky pixel sphere, approximately 6–8 pixel diameter. Flat colors: white upper hemisphere (#E0E0E0), red lower hemisphere (#CC3333), black equator line (1px). No animation. Water surface shows basic static ripple pixels (gray-tinted). Entirely static. Looks like it came out of a gas station vending machine. |

| --- |

| UNCOMMON BOBBER Green-and-white sphere replacing the Common red with muted green (#66BB6A lower half). A subtle white highlight pixel on the upper-left of the sphere provides a gloss sheen effect (2-frame animation: pixel on / pixel off at 2fps). A faint pixel ripple in the water surface around the bobber animates on a 2-frame loop — gray ripple pixels expanding outward by 1px per frame. |

| --- |

| RARE BOBBER Blue chrome finish — the sphere body uses a metallic blue palette (#2196F3 to #82B1FF highlight). A single glowing blue pixel dot sits on the top cap (the highest pixel of the sphere), pulsing in brightness on a 2-second cycle. Water ripples around the bobber are tinted with blue pixels (#40C4FF at 1px rings). In idle state, the bobber has a faint full-body blue glow pulse (Ring 1 intensity, cycling on/off over 3 seconds). |

| --- |

| EPIC BOBBER Purple holographic-stripe pattern across the sphere body — alternating 1px horizontal lines of #7B1FA2 and #CE93D8 creating a data-panel look. A shimmer sweep animation (bright highlight line scrolling top to bottom across the sphere, 6 frames) plays continuously. Purple water ripple aura extends 4–6px from bobber center. Crucially: the bobber slightly levitates above the waterline by 2px — it maintains a 2px gap between its lower edge and the water surface on its float animation, emphasizing that it is not quite following the rules of physics. |

| --- |

| LEGENDARY BOBBER Gold orb with a luminous amber core pixel visible through the sphere shell — the center-most pixel of the sphere uses #FFF9C4 (near-white) to suggest an internal light source. Gold ripple rings (#FFD700 then #FFAB40) expand outward from the bobber in the water on a 4-frame cycle. A faint upward gold particle trail (1x1 pixels, #FFD700) rises from the top cap pixel at approximately 1 particle per second. The entire bobber radiates warm ambient light — the water pixels immediately around it have their brightness values increased in the sprite frame. |

| --- |

| EXOTIC BOBBER  // REALITY QUESTIONABLE A magenta/cyan dual-tone glowing sphere that splits into alternating color zones as it animates — the upper hemisphere cycles between magenta and cyan dominance on the 500ms palette swap cycle, with the lower hemisphere on the opposing phase. The surrounding water surface is tinted by the glow: magenta ripple pixels radiate from one side, cyan from the other, meeting in a dithered blend at the midpoint. The bobber hovers at all times (3–4px above waterline) and rotates its color zones slowly through the animation cycle. It does not look like any fishing equipment. It looks like a piece of alien sensory technology that someone attached a hook to because they needed to catch fish and it was the only thing that worked. |

| --- |

| COMMON CRATE Gray stamped metal crate. Dull surface with a pixel-stenciled "STANDARD ISSUE" label (2-3px tall pixel text on crate face). No animation in idle state. Landing: no visual effect — crate simply appears on the ground. No dust, no impact ring, no flash. It lands like a box of nothing because it is. |

| --- |

| UNCOMMON CRATE Green-stenciled exterior markings. A single green blink-light pixel on the lid (alternates between #66BB6A and off on a 1-second cycle — the slowest possible blink). Small green pixel dust on impact: 4–6 green pixels scatter from impact point in a 2-frame animation, then disappear. Idle state: blink-light only. |

| --- |

| RARE CRATE Blue crate with neon-blue LED strip pixel along the full length of the lid seam — a 1px continuous #40C4FF line that pulses in brightness. Blue glow bloom on the ground shadow beneath the crate (Ring 1–2 intensity, static). Impact effect: short blue pixel burst (4–6 frame animation showing 6–8 blue pixels scattering outward from impact point, then fading via saturation reduction over 2 frames). After landing: LED strip and ground bloom persist in idle. |

| --- |

| EPIC CRATE Black crate body with a purple holographic security seal on the primary face — a rectangular sprite with a 6-frame shimmer animation playing in the seal zone. Corners of the crate have purple L-bracket pixel overlays (matching the item border treatment). Landing creates a purple shockwave ring: an expanding pixel circle starting at 2px radius, expanding to 8px over 4 frames, then fading on frame 5. The shockwave ring is drawn in #EA80FC. After landing, the security seal animation continues indefinitely. |

| --- |

| LEGENDARY CRATE Gold-paneled crate with scanline texture overlay on all flat surfaces. Emits a warm upward amber light bloom from the top surface in idle (Ring 2–3 intensity, static). Landing sequence is a multi-stage event: 1.  Impact frame: gold pixel burst — 8–12 gold pixels scatter outward 2.  Frames 2–3: expanding gold ring (pixel circle, 6–12px radius sweep) 3.  Frame 4: brief scanline flash — white 1px scanlines sweep upward across the screen region around the crate over 2 frames 4.  Frames 5+: settling glow — crate transitions into idle pulsing state Idle state: soft gold pulse on the surface, continuous faint upward particle drift (2 active particles), scanline overlay scrolling at reduced speed. |

| --- |

| EXOTIC CRATE  // CLASSIFICATION: ANOMALOUS This is not a crate. It is a floating black cube with magenta and cyan rune-like pixel symbols on each visible face — the symbols animate through a cycling pattern (not random — a defined looping sequence of 4–6 symbol states). It does not fall. It phases in: appearing at the drop destination with a 3-frame dissolve-in (sparse checkerboard pixel fill expanding to full opacity). It descends slowly with no physics — constant, dreamlike downward movement over 1–2 seconds. Landing sequence: 1.  Silence — 2 frames of no effect 2.  Dual-tone shockwave: magenta inner pixel ring expands from 2px to 6px; simultaneously a cyan outer ring expands from 6px to 14px; both fade on the 4th frame 3.  Idle state: cube rotates slowly on its Y-axis (simulated through a sprite sheet sequence of 8 rotation frames); continuous dual-color particle emission from all visible edges; adjacent sprites receive a 4px dual-tone tint bloom |

| --- |

| Tier | Frame Thickness | Frame Style | Animation |

| --- | --- | --- | --- |

| Common | 1px | Solid gray (#9E9E9E) | None — static |

| Uncommon | 1px | Green (#66BB6A) + pixel corner notch | None — static |

| Rare | 2px | Blue (#2196F3) dashes on corners only | None — static |

| Epic | 2px | Purple (#CE93D8) solid + L-bracket corners | Brackets pulse inward/outward — looping |

| Legendary | 3px | Gold (#FFD700) solid | Scanline flicker on border pixels — looping |

| Exotic | 4px | Alternating #FF00FF / #00FFFF full border | Full border color cycle — 500ms swap |

| Tier | Background Color | Notes |

| --- | --- | --- |

| Common | #1A1A1A | Near-black — neutral ground |

| Uncommon | #0D1F0D | Dark green-black tint |

| Rare | #0A0F1F | Dark blue-black tint |

| Epic | #150A1F | Dark purple-black tint |

| Legendary | #1F1500 | Dark amber-black tint |

| Exotic | #1A001A → #001A1A | Left: magenta-black. Right: cyan-black. Dithered center blend. |

| Tier | Primary Color | Glow Level | Border | Frames | Palette | One-Line Descriptor |

| --- | --- | --- | --- | --- | --- | --- |

| COMMON | #9E9E9E | None | 1px solid | 1 | 3–4 colors | Gray. Flat. Forgotten. Functional. |

| UNCOMMON | #66BB6A | Subtle | 1px notched | 2–4 | 4–5 colors | Green glint. Modified. Worth a look. |

| RARE | #2196F3 | Medium | 2px dashed | 4–6 | 5–6 colors | Blue glow. Off-manifest. Clearly special. |

| EPIC | #EA80FC | Strong | 2px brackets | 6–8 | 6–7 colors | Violet aura. Prototype. Unmistakably powerful. |

| LEGENDARY | #FFD700 | Intense | 3px scanline | 8–12 | 7–8 colors | Gold bloom. Pre-collapse. The room stops. |

| EXOTIC | #FF00FF / #00FFFF | Overwhelming | 4px M/C cycle | 12–16 | 8–10 colors | Dual-tone. No origin. Alive. Wrong. Perfect. |

| ◆ Architecture Note: Pre-Rendered Frames All glow effects are implemented as pre-rendered sprite frames. No runtime shader or post-process glow is required or permitted. The glow you see is the glow in the sprite sheet — nothing more. This ensures consistent visual output across all target hardware and eliminates frame-rate-dependent glow artifacts. |

| --- |

| ◆ Centralized Palette Asset All tier-specific colors are defined in a single centralized rarity palette asset file. Do not hardcode hex values in gameplay code, UI code, or shader parameters. Reference the palette asset exclusively. This allows global rarity color adjustments without a codebase search-and-replace. |

| --- |

| ◆ Exotic — Palette Swap Implementation The Exotic tier's dual-color magenta/cyan cycling is implemented as a 2-frame palette swap on a 500ms timer — not as two separate full sprite sheets. The base Exotic sprite uses two designated palette slots (EXOTIC_PRIMARY and EXOTIC_SECONDARY). Frame A: PRIMARY = #FF00FF, SECONDARY = #00FFFF. Frame B: PRIMARY = #00FFFF, SECONDARY = #FF00FF. The timer triggers a palette swap between these two states. This minimizes asset duplication while achieving the full cycling visual. |

| --- |

| ■ Final Note to Implementers Every visual element in this system has been designed to compound. Color tells the story, border thickness confirms it, animation intensity proves it, and particle density cements it. If an item looks wrong at any tier, check all four dimensions — not just color. The system works as a whole. |

| --- |