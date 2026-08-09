REFERENCE GUIDE · INDIE GAME DEVELOPMENT & PIXEL ART

# Pixel Art UI Button Design Guide

Cyber Noir, Neon Palettes & Retro 16-Bit Style

Date: July 2026  |  Edition: 1.0  |  Audience: Indie Game Developers, Pixel Artists

Scope: Tutorials, gallery resources, palettes, animation techniques, and best practices for designing pixel art UI button sets in cyber noir and retro 16-bit style for indie games.

## Executive Summary

This guide provides indie game developers and pixel artists with a structured, production-ready reference for designing cohesive pixel art UI button families in cyber noir and retro 16-bit aesthetics. The five core principles below frame every section that follows.

1. Button families require a shared visual grammar. Cohesive button sets (menu, back, enter, action) must share consistent dimensions, a defined palette, border treatment, shadow direction, and label conventions. Variation between button types should be deliberate — not accidental.

2. Every button needs at minimum four states. Normal, Hover/Focus, Pressed/Active, and Disabled are non-negotiable. Missing any one of these states creates a UI that feels unfinished or inaccessible.

3. Cyber noir and neon palettes use a disciplined dark foundation. Near-black backgrounds (#080c1a–#12122A) are paired with two near-complementary neon signals — typically cyan (#00F0FF) and hot pink/magenta (#FF006E) — plus a sparing hazard accent (warning yellow #EEFF00). Neon is a signal, not a fill.

4. Chunky 16-bit buttons operate within tight technical constraints. Standard sizes range from 48×16px to 64×20px, use 3–6 colors per button, employ no anti-aliasing, and rely on sharp pixel outlines. These constraints are features — not limitations.

5. Visual feedback must be fast and physically convincing. Press feedback should fire in under 100ms — ideally 60–80ms. The pressed state is simulated by collapsing the drop shadow, shifting the label 1–2px downward, and optionally firing a brief neon glow flash. If the button doesn't feel like it physically compresses, the interaction is incomplete.

## Table of Contents

1. What Makes a Cohesive Pixel Art Button Family

2. The Four Essential Button States

3. Cyber Noir & Neon Color Palettes

4. Chunky 16-Bit Style: Dimensions, Borders & Shadows

5. Hover & Pressed State Animation Techniques

6. Visual Feedback Best Practices

7. Recommended Tools & Software

8. Example Galleries & Asset Packs

9. Key Tutorials & Guides with Links

10. Actionable Takeaways

References

## Section 1: What Makes a Cohesive Pixel Art Button Family

A button family is a set of UI controls that share a single visual grammar. In a retro-style game, a complete family typically includes four tiers, each with a distinct role and visual weight:

Primary: PLAY, ENTER, CONFIRM — the most visually prominent button on any screen.

Secondary: MENU, SETTINGS, INVENTORY — supporting actions, visually subordinate to primary.

Tertiary / Navigation: BACK, CANCEL — lightweight, often outline-only or ghost style.

Action / Hazard: DELETE, RETRY — distinct from the main family using the hazard accent color (warning yellow or hot red) to signal consequence.

All members of a well-designed family share the following properties exactly: the same base height, the same border thickness (typically 1px), the same label font and point size, the same shadow direction, and the same palette roles. They differ only in width (wider buttons for primary), accent color intensity, and fill weight.

### Button Type Comparison Table

### Button Labeling Conventions

Good button wording uses clear, decisive verbs. The player should never have to think about what will happen when they click. Follow these conventions consistently:

PLAY — not GO or START (ambiguous intent)

CONFIRM — not YES (not descriptive of the action)

RETURN — not B or BACK (too hardware-specific)

RETRY — not TRY AGAIN (too casual for a snappy UI)

One screen = one primary action. Never place two primary buttons side-by-side.

## Section 2: The Four Essential Button States

Every button in a pixel art game UI must exist in at minimum four states. Designing fewer than four states is one of the most common mistakes in indie game UI development. Each state communicates precise, immediate information to the player about what the button is doing and whether it is available.

### State Descriptions

1. Normal — The resting, default interactive state. Full drop shadow present below and to the right of the button. Label centered both vertically and horizontally. Border is dim (panel-level, not fully neon). This is the baseline from which all other states derive.

2. Hover / Focus — Triggered when the cursor enters the button area, or when keyboard or gamepad navigation highlights the button. In cyber noir style: the border switches from dim to full neon (e.g., #1C1C44 → #00F0FF). Color brightens slightly. The glow effect, if any, activates. There must be no delay — the hover response IS the signal. A slow hover feels broken. This state also serves as the keyboard/gamepad focus indicator and must never be removed for accessibility.

3. Pressed / Active — Triggered on pointer-DOWN, not pointer-up. This is critical. The shadow collapses (removed or reduced to 1px). The label shifts 1–2px down and 1px right to simulate physical compression. If using engine transforms: scale to 0.95–0.98. Transition time must be fast — 60–80ms maximum, no more than 100ms. In pure pixel art: simply swap to the pre-drawn "pressed" sprite frame.

4. Disabled — The button is present but non-interactive. Opacity reduced to approximately 40%. Desaturated to gray — all color removed. Hover response removed entirely. Cursor changes to a non-interactive indicator. Never make a disabled button look like a rendering bug — it must read as clearly intentional and non-interactive at a glance.

### Button State Reference Table

Sources: Indieklem "#8 – Better-designed buttons" (https://indieklem.com); GameJuice "UI Feedback Design" (https://gamejuice.dev/ui-feedback).

## Section 3: Cyber Noir & Neon Color Palettes

Selecting the right palette is the single most consequential decision in cyber noir UI design. The palette must do three jobs simultaneously: establish the dark, oppressive atmosphere of the noir aesthetic; make interactive elements instantly readable through neon contrast; and avoid "color vibration" — the perceptual blurring that occurs when two saturated hues share a border.

### Palette 1 — Cyberpunk Neon (12 Colors)

Available at pixel-editor.com/palettes/cyberpunk-neon. This is the most production-ready palette for pure cyber noir button design, with explicit role assignments for every color.

### Palette 2 — CYBERPUNK / NEON CITY (16 Colors, Lospec — CC0)

By Paleto, part of Paleto Vol. 02. Licensed CC0 — completely free to use in any project, including commercial. Available at https://lospec.com/palette-list/cyberpunk-neon-city. Downloadable directly as .ASE into Aseprite. Tagged: cyberpunk, neon, scifi, futuristic.

This palette's four-quadrant structure — darks, blues, neons, and near-whites — maps cleanly onto the color role formula described below.

### Palette 3 — Cyberpunk Neons (11 Colors, Lospec by Chippix)

Available at https://lospec.com/palette-list/cyberpunk-neons. 138 likes, 3,311+ downloads. A teal-to-magenta spectrum built on a deep violet-black background — more restrained than Palette 1, with a stronger teal identity. Excellent for games with a colder, more clinical cyber aesthetic.

### The Cyberpunk Color Role Formula

Regardless of which palette you choose, apply the same five-role system to your button design. This formula was refined from color theory work by Vayce and Pixel-Editor.com:

## Section 4: Chunky 16-Bit Style — Dimensions, Borders & Shadows

The physical construction of a 16-bit pixel art button is defined by its grid dimensions, outline treatment, shadow geometry, and label placement. These are not aesthetic choices — they are functional specifications that must be decided before the first pixel is drawn.

### Recommended Button Dimensions

### The Six Production-Ready Button Style Archetypes

Based on the Cyberpunk Neon HUD UI Kit by Hollow Pixel (https://hollowpixel.itch.io/cyberpunk-neon-hud), six style archetypes cover the full range of cyberpunk button needs at 64×20px, each in 3 states and labeled/blank variants (36 sprites total per kit):

### Shadow Construction Technique

In pixel art, shadows are drawn manually — there is no CSS box-shadow equivalent. The technique is straightforward:

After drawing the button body, draw a row of dark pixels 2–4px below the bottom edge of the button, offset 2–4px to the right.

Use a color 2–3 steps darker than the button's base fill color — not pure black, which looks disconnected.

For cyber noir: shadow pixels can tint slightly toward the complement of the button's neon color (e.g., a hot pink button casts a dark violet-black shadow).

For the pressed state: remove or reduce this shadow to a single 1px bottom line. This single change — shadow collapse — is the most important signal that the button has been physically compressed.

## Section 5: Hover & Pressed State Animation Techniques

Animating button states in pixel art requires a different mindset from web CSS animations. The goal is not smoothness — it is decisiveness. A pixel art button should snap, not glide. The following techniques apply to both sprite-based and hybrid engine approaches.

### Approach A: Pure Sprite Sheet (Pixel Art Engines)

This approach is used in Godot (AnimatedSprite2D), GameMaker (image_index), and Unity (Sprite Renderer with Animator). Each button state is a pre-drawn sprite frame.

Create 3–4 frames per button: Normal, Hover, Pressed, Disabled — all hand-drawn at full resolution.

Maximum 2–3 transition frames between states. More frames make the button feel sluggish and indecisive.

Use Aseprite's onion skinning to keep the label and border pixel-perfect across frames — even a 1-pixel drift in label position is visible at game resolution.

Export as a single horizontal sprite sheet, one row per button style (e.g., 4 frames wide × 6 styles tall). Include JSON/XML metadata for frame boundaries.

Run at 10–12 FPS for button transition animation — fast enough to feel snappy, slow enough to read as deliberately retro.

### Approach B: Hybrid (Sprite + Engine Transforms)

In many modern pixel art games, the sprite provides the visual texture while the engine handles scale/position transforms for feedback. This gives the best of both worlds.

### Neon Glow Technique for Pixel Art

The neon glow effect is what separates a competent cyber noir button from a great one. In pure pixel art (no shaders), the glow is simulated as follows:

On the hover frame, draw 1–2 pixels outward from the button's neon border in the accent color at approximately 50% opacity (or use the mid-tone of your neon in your palette).

On the pressed frame, remove the outer glow pixels — neon dims as current "flows" through the press. This subtle dimming reads as energy transfer.

For engine-based glow: apply a Glow / Bloom post-process shader triggered on hover, with intensity 0.6 on hover and 0.2 on press.

## Section 6: Visual Feedback Best Practices

The following eight principles distill the consensus from game UI research, indie developer postmortems, and interaction design literature into actionable rules for pixel art button feedback.

Immediate hover response — no delay, no tween-in. The hover state must activate the moment the cursor enters the button's bounding box. Even a 50ms delay on hover makes the interface feel laggy. The responsiveness IS the signal. Aesthetic smoothness on hover entry is secondary to speed of acknowledgment.

Press on pointer-down, not pointer-up. Wire the pressed sprite/state to the mousedown or touchstart event. This eliminates the perceptual latency gap that makes buttons feel "sticky" or unresponsive. Every frame of delay on a button press is a frame the player questions whether they clicked correctly.

Elastic bounce-back from press to normal. Return from the pressed state with a brief overshoot — scale from 0.95 to 1.02 before settling at 1.0. A linear return (0.95 → 1.0 with no overshoot) feels inert and mechanical. The overshoot costs 30–50ms and multiplies the "alive" feeling of the button many times over.

Disabled states must be unambiguous and intentional. 40% opacity and full desaturation (gray) communicates "this option exists but is not available now." Never make a disabled button look like a rendering artifact. Players should understand at a glance that the button is non-interactive — not by clicking it and getting no response.

Consistency is the multiplier. If your primary button squashes on press, every button squashes on press. If one button has an elastic bounce, all buttons have an elastic bounce. Build a UI animation vocabulary (a library of standard transitions and state rules) and enforce it across every UI element. Inconsistency teaches players that the UI has unpredictable behavior.

Neon glow as focus ring for keyboard and gamepad navigation. In cyber noir style, the glowing neon border is the ideal focus indicator. It is visible, thematic, and unambiguous. Never suppress focus indicators for aesthetic reasons — this breaks keyboard and controller accessibility. The glow ring serves the same purpose as a browser's default focus outline, but with style.

Shadow collapse on press is the single most important visual change. For "physical button" feel in pixel art, the drop shadow collapsing (disappearing or reducing to 1px) as the label shifts 1–2px downward is the highest-ROI visual change you can make. It takes 2 sprite frames to implement and transforms the button from a graphic into a mechanical object.

Sound design pairs with visual feedback and amplifies it. A subtle 8-bit click, beep, or whoosh sound synchronized with the pressed state reinforces the state change neurologically — the combination of audio + visual feedback is significantly more convincing than either alone. In retro-style games, audio is part of the aesthetic contract with the player. Design button sounds as part of the component, not as an afterthought.

Sources: GameJuice (https://gamejuice.dev); UIXplor (https://uixplor.com); Indieklem (https://indieklem.com); Bugnet Blog "UI Design Basics for Indie Developers" (https://bugnet.gg).

## Section 7: Recommended Tools & Software

Choosing the right tool for pixel art button creation depends on your team size, budget, engine target, and animation needs. The following five tools cover the full spectrum from professional solo-developer workhorses to free open-source alternatives.

## Section 8: Example Galleries & Asset Packs

The following asset packs provide production-ready pixel art buttons for cyber noir, neon, and retro sci-fi game UI. Use these as reference, starting material, or direct game assets — check individual licenses before commercial use.

## Section 9: Key Tutorials & Guides with Links

The following eight resources are the recommended starting points for any developer building a pixel art UI button system for a cyber noir or retro 16-bit game. Titles link directly to the source.

"How to Make a Pixelated Button in Aseprite – Step-by-Step Tutorial!"
 Author/Source: Potato (YouTube). URL: https://www.youtube.com/watch?v=pixelated-button-aseprite — search YouTube for exact video.
 Covers Aseprite canvas setup, button shaping with the pencil tool, detail and shadow passes, and exporting the finished sprite. The definitive beginner Aseprite button tutorial for pixel art newcomers who want immediate results.

"#8 – Better-designed buttons"
 Author/Source: Indieklem Blog. URL: https://indieklem.com
 The clearest single resource on the four essential button states, border and shadow construction techniques, and visual hierarchy for button families. Strongly recommended as the first read before drawing any button.

"How to Create a Pixel Game UI in Adobe Photoshop"
 Author/Source: Envato Tuts+. URL: https://design.tutsplus.com
 Photoshop-based workflow for pixel art UI prototyping, including symmetry guides, pixel snapping configuration, and color palette management. Useful for studios that already own Photoshop and want to mock up button layouts before committing to Aseprite production.

"Creating Readable UI Elements in Top-Down Pixel Art"
 Author/Source: PathBits Blog. URL: https://pathbits.com
 Addresses the hardest pixel art UI challenge: readability at 1x resolution. Covers simplicity principles, consistent iconography, contrast optimization, and player interaction design — topics that are often skipped by tutorials focused on appearance over legibility.

"UI Design Basics for Indie Developers"
 Author/Source: Bugnet Blog. URL: https://bugnet.gg
 Introduces the "tiny design system" philosophy for indie developers: two fonts, a palette with defined roles, one button component built with all states defined, reused everywhere. Prevents the fragmented UI syndrome that afflicts most first-time indie game UIs.

"Designing Interactive Buttons That Feel Alive"
 Author/Source: UIXplor Blog. URL: https://uixplor.com
 Detailed treatment of hover lift, active compression, shimmer microinteraction, and easing asymmetry — all in web CSS, but directly translatable to game engine animation systems. Essential reading for understanding the physics of button interaction design.

"UI Feedback Design: Buttons, Health Bars, and Transitions That Feel Right"
 Author/Source: GameJuice. URL: https://gamejuice.dev/ui-feedback
 Game-specific feedback design: scale-up on hover, squash on press, elastic bounce-back, and disabled state treatment — with exact timing values for each transition. The most game-engine-oriented resource in this list, with examples in Unity and Godot contexts.

"Cyberpunk Neon Palette — 12 Hex Colors, Sci-Fi Use Cases & Tips"
 Author/Source: Pixel-Editor.com. URL: https://pixel-editor.com/palettes/cyberpunk-neon
 Full breakdown of the 12-color Cyberpunk Neon palette with explicit role assignments for each color, contrast ratio notes for text legibility, and animation tips specific to neon-glow button effects. Start here if you are using this palette.

## Section 10: Actionable Takeaways

The following ten items are concrete, executable actions. Each can be completed in a single work session. Implement them in order for best results.

Pick one palette and commit to it. Choose from the three palettes in Section 3 and apply it to your entire UI without mixing palette families. Mid-project palette switching is one of the most expensive refactors in pixel art game development. Choose before you draw your first button.

Write your button component spec sheet before drawing anything. Document: dimensions (e.g., 64×20px standard), border thickness (1px solid), shadow offset (2px bottom-right), all 4 state definitions, and label font/size. This one-page spec eliminates all ambiguity for every button you will ever draw in the project.

Design the primary button first, then derive all other types. The primary button establishes the visual language. Secondary and tertiary buttons are derived by reducing fill weight, darkening borders, and reducing shadow. Work top-down through the hierarchy — never start with tertiary buttons.

Use verb-based labels without exception. PLAY, CONFIRM, RETURN, RETRY. Never use OK, Yes, No, Go, or generic directional arrows as a substitute for a real label. If your button label is ambiguous, your design is incomplete — not the player's interpretation.

In Aseprite, create a 4-frame tag per button style. Name the tags: Normal, Hover, Pressed, Disabled. Enable onion skinning when drawing each frame to keep every pixel — especially the label — perfectly aligned across all states. A 1-pixel drift in label position is visible at 1x resolution.

Wire pressed state to pointer-DOWN in your engine from day one. In Godot: use _input() with InputEventMouseButton and check pressed == true. In Unity: use IPointerDownHandler. In GameMaker: use the mouse_check_button_pressed() event. Do not refactor this later — wire it correctly the first time.

Implement shadow collapse and 1–2px label shift as your minimum viable pressed state. These two changes — collapsing the drop shadow and shifting the label 1px down — require no engine transform system and can be done in pure sprite art. They produce 80% of the "physical button" feeling with minimal implementation cost.

Build a UI animation vocabulary document. List every standard transition your UI uses: hover speed (150–200ms ease-out), press speed (60–80ms), bounce-back (120–160ms elastic), disabled fade (200ms). Every new UI element inherits from this vocabulary. Consistency is the multiplier — one strong pattern applied everywhere beats ten clever patterns applied inconsistently.

Download the Lospec CYBERPUNK / NEON CITY palette (CC0) as your immediate starting point. Go to https://lospec.com/palette-list/cyberpunk-neon-city, click Download → .ASE, and drag the file into your Aseprite palette panel. You will have a production-ready 16-color cyberpunk palette inside your editor in under 60 seconds, licensed for commercial use with no attribution required.

Play-test the full button family at native game resolution before finalizing. Details that appear sharp and polished at 8× zoom in Aseprite often become unreadable or visually cluttered at 1× or 2× game resolution. Set Aseprite's preview window to 1× and test legibility of all button labels, border widths, and shadow visibility before shipping the sprite sheet.

## References

Indieklem. "#8 – Better-designed buttons." Indieklem Blog, 2024–2025. https://indieklem.com

GameJuice. "UI Feedback Design: Buttons, Health Bars, and Transitions That Feel Right." GameJuice, 2024–2025. https://gamejuice.dev/ui-feedback

UIXplor. "Designing Interactive Buttons That Feel Alive." UIXplor Blog, 2024–2025. https://uixplor.com

Pixel-Editor.com. "Cyberpunk Neon Palette — 12 Hex Colors, Sci-Fi Use Cases & Tips." Pixel-Editor.com, 2024–2025. https://pixel-editor.com/palettes/cyberpunk-neon

Paleto. "CYBERPUNK / NEON CITY — 16-Color Palette (CC0)." Lospec Palette List, Paleto Vol. 02, 2023–2024. https://lospec.com/palette-list/cyberpunk-neon-city

Chippix. "Cyberpunk Neons — 11-Color Palette." Lospec Palette List, 2023–2024. https://lospec.com/palette-list/cyberpunk-neons

Hollow Pixel. "Cyberpunk Neon HUD UI Kit." itch.io, 2024. https://hollowpixel.itch.io/cyberpunk-neon-hud

Potato. "How to Make a Pixelated Button in Aseprite – Step-by-Step Tutorial!" YouTube, 2024. https://www.youtube.com/watch?v=pixelated-button-aseprite (search YouTube for exact video).

Envato Tuts+. "How to Create a Pixel Game UI in Adobe Photoshop." Envato Tuts+ Design & Illustration, 2022–2024. https://design.tutsplus.com

PathBits. "Creating Readable UI Elements in Top-Down Pixel Art." PathBits Blog, 2023–2025. https://pathbits.com

Bugnet. "UI Design Basics for Indie Developers." Bugnet Blog, 2024–2025. https://bugnet.gg

Vayce. "Cyberpunk Color Palette Generator — Color Role Theory." Vayce, 2024–2025. Available via web search: Vayce cyberpunk palette generator.

Lospec. "Palette List — Community Pixel Art Palette Library." Lospec, ongoing. https://lospec.com/palette-list

Aseprite. "Aseprite — Animated Sprite Editor & Pixel Art Tool." Aseprite.org, 2024. https://www.aseprite.org

Pixelorama. "Pixelorama — Free & Open Source Pixel Art Editor." Orama Interactive / Godot Engine, 2024. Available via https://orama-interactive.itch.io/pixelorama

Compiled July 2026  |  For Indie Game Developers and Pixel Artists  |  All palette hex values are provided for reference; verify licenses before commercial use. Links current as of publication date.

| Design Principle — Fill Weight Hierarchy Primary buttons use a full-color fill. Secondary buttons use an outline or ghost style (transparent fill with neon border). Tertiary buttons are visually the lightest — a simple text label with a minimal dim border. This hierarchy communicates importance without requiring size differences. |

| --- |

| Button Type | Visual Weight | Fill Style | Border Color | Label Case | Example Labels |

| --- | --- | --- | --- | --- | --- |

| Primary | Highest | Solid neon fill | Bright neon (#00F0FF) | ALL CAPS | PLAY, CONFIRM, ENTER |

| Secondary | Medium | Ghost / outline only | Dim accent (#1C1C44) | ALL CAPS | MENU, SETTINGS, INVENTORY |

| Tertiary / Nav | Low | Transparent or dark fill | Subtle border (#2a2445) | ALL CAPS | BACK, CANCEL, CLOSE |

| Hazard / Action | Context-high | Hazard accent fill | Warning yellow (#EEFF00) | ALL CAPS | DELETE, RETRY, RESET |

| Note — Corner Treatment In pixel art, even a 1–2px rounded corner signals friendliness and approachability. Sharp 90° corners signal aggression, danger, or precision. Use corner treatment deliberately: primary action buttons can afford 1px softening; hazard buttons should remain fully square to reinforce their consequence. Source: Indieklem, "#8 – Better-designed buttons." https://indieklem.com |

| --- |

| Optional 5th State — Selected / Active Toggle For toggle-style buttons (e.g., FULLSCREEN ON/OFF, MUSIC MUTE/UNMUTE), add a fifth Selected/Active state. This state persists until toggled off — it's distinct from Pressed, which is transient. Use a filled background with the neon accent at medium intensity to show "this is currently active." |

| --- |

| State | Trigger | Visual Change | Drop Shadow | Label Position | Transition Speed |

| --- | --- | --- | --- | --- | --- |

| Normal | Default / idle | Dim border, base fill color | Full (2–4px offset) | Centered | N/A (baseline state) |

| Hover / Focus | Cursor enter / keyboard nav | Border → full neon; slight fill brighten; glow activates | Full (maintained) | Centered (unchanged) | Instant (0ms) or ≤50ms |

| Pressed / Active | Pointer-DOWN event | Shadow collapses; scale 0.95–0.98; fill darkens | Collapsed / removed | Shifted 1–2px down, 1px right | 60–80ms (snappy) |

| Disabled | Programmatic / unavailable | ~40% opacity; fully desaturated to gray | Removed | Centered (unchanged) | N/A (set on load) |

| Selected (optional) | Toggle activation | Neon fill at medium intensity; persists | Reduced or full | Centered (unchanged) | 80–120ms ease-out |

| Swatch | Hex Code | Name | Primary Role in UI Buttons |

| --- | --- | --- | --- |

|  | #080810 | Void Black | Pixel outlines, absolute darkest shadow |

|  | #12122A | Night Asphalt | Button background / body fill (dark state) |

|  | #1C1C44 | Neon District | Normal-state border, mid-shadow color |

|  | #FF006E | Hot Pink | Primary neon signal — hover borders, CTA fill |

|  | #FF66B2 | Neon Rose | Hover highlight on Hot Pink elements |

|  | #00F0FF | Cyan Flash | Active-state indicator, secondary signal |

|  | #7700EE | Electric Violet | Panel frames, decorative borders |

|  | #BB44FF | Violet Glow | Glow FX, outer pixel glow on hover |

|  | #EEFF00 | Warning Yellow | Hazard / danger buttons — use sparingly |

|  | #F0F0FF | Ghost White | Button label text — all UI copy |

| Hex Code | Hex Code | Hex Code | Hex Code |

| --- | --- | --- | --- |

| #0a0a14 | #12101e | #1c1830 | #2a2445 |

| #0d2240 | #0a3a5c | #105080 | #1870a8 |

| #ff0090 | #ff44cc | #00ffff | #00ccff |

| #ccff00 | #ff6600 | #ffe040 | #e8e8ff |

| Hex Code | Approximate Role | Hex Code | Approximate Role |

| --- | --- | --- | --- |

| #0b001b | Void / deep background | #4d004f | Dark magenta shadow |

| #08173d | Dark blue-black body | #c1115a | Magenta signal |

| #03274c | Deep navy panel | #e13a6a | Bright magenta hover |

| #084f64 | Teal-dark surface | #e46a87 | Rose highlight |

| #0f9595 | Teal signal (active) | #eca6c0 | Ghost text / disabled |

| #53ebe4 | Bright teal neon (hover) |  |  |

| Role | Function | Typical Hex Range | Where Used in Buttons |

| --- | --- | --- | --- |

| Background | Establishes the "void" — the world behind UI | #080810–#12122A | Page/screen background, button body fill |

| Surface | Panel, card, modal backgrounds | #1C1C44–#2a2445 | Button interior fill (normal state) |

| Primary Signal | Main neon — first neon the eye sees | Cyan #00F0FF / Teal #53ebe4 | Hover border, active indicators, focus ring |

| Secondary Signal | Complementary neon — contrast to primary | Magenta #FF006E / Pink #FF44CC | CTA fill, primary button accent |

| Hazard / Alert | Danger, consequence, irreversible action | #EEFF00 / #FF6600 | DELETE, RETRY, RESET buttons — used rarely |

| Anti-Pattern — Large Neon Fills Use neon only on UI states — focus rings, selected states, CTAs, and active indicators. Do NOT use neon as large background fills. Large neon panels lose their signal value and look cheap. Separate saturated hues with neutral tones to prevent color vibration. Keep one ink color for all text (Ghost White or near-white). Keep hazard colors extremely rare — if everything is a hazard, nothing is. Sources: Vayce Cyberpunk Color Palette Generator; Pixel-Editor.com. |

| --- |

| Button Type | Recommended Size (px) | Border Thickness | Shadow Offset | Corner Style |

| --- | --- | --- | --- | --- |

| Small / Tertiary | 48×16px | 1px solid outline | 2px bottom-right | Sharp 90° or 1px radius |

| Standard / Secondary | 64×20px | 1px solid outline | 2–3px bottom-right | 1–2px radius (friendly) |

| Wide / Primary | 96×20px or 128×24px | 1px solid outline | 3–4px bottom-right | 0–1px (depends on tone) |

| Hazard / Action | 64×20px | 1–2px solid outline | 2px bottom-right | Sharp 90° (intentional) |

| Tab / Nav | 48×16px or variable | 1px top + sides only | None (tab fills to panel) | 1px top corners only |

| Archetype | Shape Description | Best Use | Corner Style |

| --- | --- | --- | --- |

| SOLID | Full rectangular fill, standard 90° corners | Primary actions — PLAY, CONFIRM | Sharp / 0px |

| ANGLED | Parallelogram-style diagonal cut at one or both ends | Action buttons, combat UI, speed | Angled pixel cut |

| DOUBLE | Double-border: inner neon outline + outer dark outline | High-emphasis primary buttons | Sharp / 0px |

| HAZARD | Warning stripe texture in shadow area, hazard coloring | Destructive actions — DELETE, RESET | Sharp / 0px |

| PILL | Rounded ends (simulated at pixel scale with 3–4px radius) | Secondary / soft UI — inventory, settings | Max pixel radius |

| TAB | Open-bottom tab shape, connects to panel below | Navigation tabs — WORLD MAP, STATS | Top corners only |

| Pro Tip — Shadow Palette Color Never use #000000 for button shadows in cyber noir style. Pure black reads as a rendering error. Instead, use your Void Black (#080810) or, for a neon-tinted shadow, mix your neon accent with the background: approximately 80% Night Asphalt + 20% neon hue. The result is a shadow that belongs to the world rather than floating above it. |

| --- |

| Event | Transform | Duration | Easing |

| --- | --- | --- | --- |

| Cursor enters (hover in) | Scale 1.0 → 1.05 | 150–200ms | Ease-out (slow, inviting) |

| Cursor exits (hover out) | Scale 1.05 → 1.0 | 100–150ms | Ease-in-out |

| Pointer-DOWN (press) | Scale 1.05 → 0.95–0.98 | 60–80ms | Linear or ease-in (snappy) |

| Pointer-UP (release) | Scale 0.95 → 1.02 → 1.0 | 120–160ms total | Elastic ease-out (overshoot) |

| The asymmetry between hover (slow, inviting) and press (fast, decisive) creates a satisfying "ping-pong" feel. If both transitions use the same speed and easing, the button loses character. |

| --- |

| Critical — Press on Pointer-DOWN, Not Pointer-UP Trigger the pressed sprite/state at the mousedown (or equivalent gamepad/touch) event — not at mouseup/click. Waiting for the release adds approximately 30ms of perceived latency that players can feel even if they cannot describe it. This is the single most common timing mistake in indie game button design. Source: GameJuice "UI Feedback Design" (https://gamejuice.dev/ui-feedback); UIXplor "Designing Interactive Buttons That Feel Alive" (https://uixplor.com). |

| --- |

| Tool | Primary Use | Cost | Platform | Notable Feature for Button Design |

| --- | --- | --- | --- | --- |

| Aseprite | Primary pixel art editor & animation | $19.99 one-time (or compile from GitHub free) | Windows / Mac / Linux | Onion skinning; tag-based animation; sprite sheet export with JSON/XML frame metadata; real-time 1x preview window |

| Adobe Photoshop | General image editing in pixel mode | ~$20/month (subscription) | Windows / Mac | Powerful for prototyping button layouts and mockup sheets; limited animation tools; best used for initial ideation and palette testing |

| Lospec Pixel Editor | Browser-based pixel art, zero install | Free | Browser (any OS) | Integrated Lospec palette library — load any CC0 palette directly into the editor; ideal for quick palette validation and sharing work-in-progress |

| LibreSprite | Full-featured pixel art editor (Aseprite fork) | Free / open source | Windows / Mac / Linux | Feature-comparable to older Aseprite builds; no cost; suitable for teams that cannot budget per-seat Aseprite licenses |

| Pixelorama | Pixel art editor with animation, Godot-native | Free | Windows / Mac / Linux / Browser | Built in Godot Engine — exports directly into Godot-compatible sprite sheets; built-in animation timeline; ideal for Godot-based indie projects |

| Resource — Lospec.com Palette Library Lospec (https://lospec.com/palette-list) is the definitive community resource for pixel art palettes. Palettes are filterable by tag (search "cyberpunk"), color count, and license. Every palette is downloadable in .PNG, .PAL, .ASE, .TXT, .GPL, and .HEX formats. The .ASE format loads directly into Aseprite's palette panel with a single drag-and-drop — making it the fastest path from "I need a neon palette" to "I am drawing with it." |

| --- |

| # | Name & Author | Style | Contents | Price | Link |

| --- | --- | --- | --- | --- | --- |

| 1 | Cyberpunk Neon HUD UI Kit by Hollow Pixel | Dark neon cyberpunk | 280 assets: 36 buttons (6 styles × 3 states × labeled/blank), 2 pixel fonts, 7 spritesheets | $5.90 | hollowpixel.itch.io/cyberpunk-neon-hud |

| 2 | Free Pixel Game UI for Cyberpunk by Free Game Assets | Cyberpunk / free UI | Free UI elements: panels, buttons, health bars, basic HUD components | Free | itch.io (search: "Free Pixel Game UI for Cyberpunk") |

| 3 | UI User Interface Pack – Cyber by ToffeeCraft | Cyber / retro | Comprehensive UI pack; rated 5.0/5 (34 ratings) — community-verified quality | Paid | toffee-craft.itch.io |

| 4 | Ultimate Pixel Sci-Fi UI Set by Finnmercury | Sci-fi / cyber | Sci-fi UI elements; free demo available; full set includes buttons, panels, icons | $2.99 | itch.io (search: "Ultimate Pixel Sci-Fi UI") |

| 5 | Pixel Fantasy Cyberpunk RPG UI Pack by etahoshi | Cyberpunk RPG pixel | Free UI elements for pixel-style RPG; buttons, frames, inventory UI | Free | itch.io (search: "Pixel Fantasy Cyberpunk RPG UI") |

| 6 | 148 Free Pixel Art UI Button Pack by Electronic Brains | Multi-style pixel art | 148 buttons across 4 color palette options — excellent for rapid prototyping and style testing | Free | itch.io (search: "148 Free Pixel Art UI Button Pack") |

| 7 | rogue noir Cyberpunk Assetpack by Sam | Dark fantasy cyberpunk | Huge 2D pixel art dark fantasy cyberpunk asset pack; rated 5.0/5 (12 ratings) | $10 | itch.io (search: "rogue noir Cyberpunk Assetpack") |

| 8 | Lospec Palette Gallery — Cyberpunk Tag | Community palette library | Hundreds of palettes filterable by tag, downloadable in .ASE, .PNG, .GPL, .HEX — direct Aseprite import | Free | lospec.com/palette-list |