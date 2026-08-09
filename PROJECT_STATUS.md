# PixelPlane — Project Status Write-Up  
**Date:** 2026-08-05 · **For:** Brian (lead) · Gemini (advisor) · future AI helpers  
**Builders:** Brian Moore (human lead) + Grok Build (implementer) · Gemini = ideas only, no code

---

## One-liner

**PixelPlane** is an infinite spatial canvas where 2D game art production, animation state machines, quests, destructibles, co-presence, and a symbiotic top-down **City Engine** all live on **one plane** — layout *is* structure (folders, states, ownership).

We are **not** “another Aseprite.” We respect existing tools; we are building an **ecosystem** and a future full game-dev toolkit, starting pixel/2D, with City Engine as the **birthplace** of a modular engine.

---

## Audit snapshot (2026-08-05)

| Check | Result |
|-------|--------|
| TypeScript | Pass |
| Production build (Vercel/Nitro) | Pass |
| Browser smoke (Studio + Memory + District + Engine) | Pass · **0** page/console errors |
| Mobile viewport load | Pass |
| Critical modules on disk | Pass |
| First Night tour | **Deferred on purpose** (one full sweep later) |

### Soft gaps (documented, not silent bugs)
- Ghost pulse: City Engine → store works; halo is best seen when Studio/district panel is open after playtest
- Compose export downloads multiple files (not one ZIP yet)
- Shared plane needs real peers; interest (D_10x) foundation is in, not stress-tested at 10 users
- AI pixel gen is procedural stub-path, not the spine
- Lucide icons default; Brian’s PixelLab packs → `pixelSrc` when ready
- Secondary spring = sim/export metadata, not full auto-baked pixel frames yet
- Hitbox draw on anim frame works; full multi-frame visual editor polish continues

---

## Architecture (how to think about it)

```
┌──────────────────── PIXELPLANE STUDIO (infinite plane) ────────────────────┐
│  Artboards · Anim regions · Particles · Parallax · Notes · Solitaire        │
│  Wire/feed planes (D_Scope nested ownership) · Beacons · Private masks      │
│  Character District (state pads = state machine) · Memory Web agents        │
│  Live asset sockets · Quest trees · Destructibles · Export map              │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │ contracts / ZIP / live sockets / pulse
┌───────────────────────────────────▼────────────────────────────────────────┐
│  CITY ENGINE (orthographic bird’s-eye top-down · profile: topdown_openworld)│
│  Foot / drive zoom · Indoors · Smash props · Quests · NPCs from Memory Web  │
│  Play Ghost trail back to plane · Ghost pulse state → Studio pads           │
└────────────────────────────────────────────────────────────────────────────┘
```

**Perspective today:** orthographic **bird’s-eye top-down** (not 3/4 camera). Art may *look* 3/4; projection is flat map. Future profiles: true top-down, iso, oblique 3/4, FPS, RTS, etc.

---

## What works (by system)

### Studio plane
- Infinite pan/zoom collage canvas, minimap, hotkeys (incl. location F-keys / conflict rebind design)
- Draw tools, artboards, anim regions, particles, place actors
- Wire/feed planes → engine folder trees (Godot/Unity/Unreal/GM/generic)
- Quest trees + destructibles on plane
- In-canvas notes/overlays language (not only modals)
- Solitaire playable widget (skin-swap direction)
- Starter pack assets, guides packaging path
- Look-at-This beacons (Ctrl+L), cycle G
- Plane systems dock: private/witness/focus masks, watch mode, chunk grid, export map

### Spatial doctrine (Gemini + Brian)
- **D_Scope:** smallest containing pad owns asset; **manual pin wins**
- **D_10x:** viewport interest chunks (collab foundation)
- Soft pad / export `spatial_scopes.json` path

### Memory Web (general, not faction-only)
- Agents: NPC / player / group / faction
- Group by selection, plane cluster, or faction
- Events + disposition + dialogue hooks
- City Engine smash → NPCs remember (propagate group/faction)
- Panel + plane markers + JSON export

### Live asset sockets
- Bind artboard/anim → engine keys
- Rev fingerprint poll; rebuild from feed planes
- Hot status when Studio pixels change

### Character & Animation District (Gemini blueprint — major)
| Zone / D | Status |
|----------|--------|
| 4-zone template (DNA · Facing · Strips · Logic) | Live scaffold |
| **D_State** state pads (location = state bind) | Live |
| Transitions + conditions | Live |
| **D_Hitbox** G/R/B + onion ghost + apply-all | Live |
| **D_Composite** gravity ring + tethers | Live |
| **D_Bake** layered vs baked atlas export | Live (multi-file) |
| **D_Audio** frame SFX anchors | Live |
| **D_Spring** secondary spring nodes + sim | Live (procedural offsets) |
| **D_Debug** ghost pulse from City Engine | Live (store + pad halo) |
| State machine JSON export v2 | Live |

### City Engine
- Top-down open-world birthplace profile
- Drive / foot zoom lerp, traffic vehicles, smashables, wanted tick
- Indoor scenes from Studio indoor artboards
- Quest runtime contract from Studio quest trees
- NPCs from Memory Web
- Play Ghost: leave engine → trail artboard on plane
- Live sockets poll + state pulse out

### Co-presence (foundation)
- P2P room, cursors, plane messages, look-at beacons, interest envelopes, mask fanout
- Watch mode role
- Not yet: full CRDT doc sync, 10-user stress

---

## Product identity (locked)

- Spatial layout = organizational + anim + quest truth  
- Manual is the **exception**  
- No LoRA/random gen as the **spine** of animation  
- Clean-room: mechanics free; no copying proprietary UI/art  
- First Night guided tour: **deferred** until systems stabilize (one sweep)  
- Engine grows from City Engine templates, not a rewrite  
- Multi-person plane is core (family / team / jam), not a bolt-on  

---

## Gemini collaboration model

- Gemini: product/systems advisor only (“you have A,B,C → consider D”)  
- Grok: implements, audits, updates COMPENDIUM  
- Brian: human lead, vision, art packs, final calls  

**Adopted from Gemini (high level):** spatial proximity ownership, nested scope, interest management, Animation District, state pads, hitbox onion, gravity compose, dual bake, audio anchors, springs, ghost pulse.

---

## Near-term stack (don’t thrash First Night)

| Priority | Work |
|----------|------|
| 1 | Harden Character District (drag SFX nodes spatially, bake spring into frames, single ZIP compose) |
| 2 | D_10x + shared-plane reliability for multi-creator |
| 3 | Engine contracts: quests/smash/sockets deeper; indoor design loop |
| 4 | Wire Brian’s PixelLab icon packs into `pixelSrc` |
| 5 | Perspective templates after top-down birthplace is richer |
| Late | First Night full guided path · full Anim Beast secondary bake · multi-canvas team hubs |

---

## Stats (rough)

- ~100+ TS/TSX source files under `src/`  
- Dual suite: Studio + City Engine  
- Living docs: `COMPENDIUM.md`, `GEMINI_BRIEFING.md`, this `PROJECT_STATUS.md`  

---

## One paragraph for Gemini

PixelPlane is a dual-suite spatial production environment: an infinite Studio plane (art, anim districts, wires, memory web, sockets, collab foundations) feeding a clean-room orthographic top-down City Engine. Layout is the state machine and the folder system. Character District now includes state pads, hitboxes with onion propagation, DNA gravity composite, dual bake export, frame audio anchors, secondary springs, and live ghost pulse from playtest. Typecheck, production build, and browser smoke are green as of 2026-08-05. First Night remains deferred. Next refinements should deepen district production velocity and multi-creator scale, not re-tour polish.
