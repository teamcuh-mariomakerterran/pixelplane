# PixelPlane — Live Compendium & Handoff

> **Product name (working):** PixelPlane  
> **One-liner:** An infinite collage canvas where 2D game art production, animation, parallax, playtest toys, and engine folder wiring live on **one** plane — not a pile of disconnected tools.  
> **Status date:** 2026-08-01  
> **Compendium version:** 1.0.0  
> **Rule:** Every material change to the product **must** update this file in the same turn (see §0).

---

## 0. How to use this document (mandatory for every AI)

### Team roles
| Role | Who |
|------|-----|
| **Human lead / co-designer** | Brian Moore (only human on the project) |
| **AI lead / co-designer / builder** | Grok Build (primary implementer in this sandbox) |
| **Ideas advisor (no code)** | Gemini — product/systems “A,B,C → consider D” voice; see **`GEMINI_BRIEFING.md`** |
| **Future helpers** | Other AIs (e.g. Claude, Copilot) — read COMPENDIUM first; do not invent parallel product stories |
| **End-user guide polish** | Copilot may reformat §12 into a neat reference booklet |

### After every change (non-negotiable)
1. Implement the feature/fix.
2. **Self-audit** (§11): typecheck, browser smoke if UI changed, no silent stubs.
3. Update this file:
   - §3 changelog (newest first)
   - §4 system status if behavior changed
   - §5 stubs if stub count changed
   - §6–8 roadmap checkboxes when starting/finishing epic work
   - §12 user tips if user-facing
4. Prefer finishing over stubs. If a stub is unavoidable: mark `STUB`, owner, next step, file path.

### First Calamity (epoch · 2026-08-09)
Partial writes wiped core plane files with **no version control**. Recovery succeeded; git init followed.
**Rule forever:** commit after every real ship. Freestyle hard — crash soft.

### Sandbox / preview contract (platform)
- App serves on **`0.0.0.0:8080`** via Vite; platform live preview discovers it.
- **`/workspace/startup.sh`** must start the dev server idempotently (platform revive).
- User has **no shell** — never ask them to run npm/localhost.
- Skills: `.grok/skills/design-ui`, `building-games`, etc. when relevant.
- Screenshots for agent QA: `/workspace/screenshots/` only.

### Repo entry for AIs
```
Read COMPENDIUM.md fully
→ skim §4 “what works”
→ skim §5 stubs
→ skim §6–8 next work
→ open listed source files
→ implement
→ self-audit
→ update this file
```

---

## 1. Product vision (north star)

Brian’s product is **not** “another Aseprite clone.” It is:

1. A **vast open plane** (infinite pan/zoom) that holds sprite sheets, concept art, environments, HUD, notes, animations, particles, parallax stacks, mini-games, and feed planes **side by side**.
2. **Animation squares** drawn on the plane become live frame stacks with inspector tools.
3. **Drag assets** from production areas into anim regions, then into **scene** regions to playtest in context.
4. **Engine wiring**: connector icons + feed planes map canvas regions → Godot / Unity / Unreal / GameMaker / generic folder trees with size presets and export ZIP.
5. **Generator** path (prompt + reference → pixel characters/anims) — currently procedural; deeper AI later.
6. **Commercial uniqueness:** features no other tool combines (timeline-on-canvas, palette gravity, play kernels, wire heatmaps, in-canvas UI language, etc.). See §6–8.

### 1.1 Identity doctrine (Brian — 2026-08-02)

**We are not trying to “beat” Aseprite, PixelLab, pix2d, or anyone.**  
Those tools gave creative minds real power. We respect that. Our posture is: *thank you for the present — we’re building the gift from the future.*

| We are | We are not |
|--------|------------|
| An **ecosystem** — a glove that fits many hands | A stack of half-baked feature checkboxes |
| **Connection made physical** (spatial layout = meaning) | A race to clone every competitor feature first |
| Serious **engine-side development** + living systems | An idea graveyard with pretty screenshots |
| A place for **friends, jams, teams, strangers, family** | Arrogant “move over losers” branding |
| The **holy-shit juice** only we would invent | Redundancy and complacency dressed as “all-in-one” |

**Skipping stones:** cool concepts from elsewhere we may absorb and improve — ingredients, not the meal.  
**The juice:** systems only PixelPlane’s plane makes natural — spatial scope, collage production, co-presence, playtest-in-place, wire-as-sight, father–son create-together, accessibility through *visual* being-with.

**Who the glove fits (non-exhaustive):**
- Friends hanging out / teaching workflow across countries (translation later = another bridge)
- College jams, small and large dev teams
- People who aren’t “making a game” — notes, video on the plane, shared watching while someone doodles (ADHD-friendly motion)
- Private/masked regions when you need a temporary bubble
- Non-verbal, autistic, deaf, or visually-comfort-first creators — *join as observer without forcing chat*
- Personality mismatches that struggle on the phone: replace empty pleasantries with *look at this car / this walk cycle / this dumb stick figure that somehow walks*

**Emotional north star:** structure for connection that still builds skill and joy — especially **a father and son still in each other’s lives** on the same plane, learning together, not only “catching up.”

**Quality bar for every feature:** treat it as a **living, breathing system** (serious, coherent, finishable) — not a half idea glued on. Roadblocks mean more angles, more lines of thought, maybe another set of eyes — not “impossible.”

**Pride metric:** people say *I needed this and didn’t know until I had it* and *how did they even pull that off?* — and Brian also gets the baddest toolkit to make the games *he* loves.

**Inspiration (legal note):** pix2d (MIT) is reference for *workflow ideas*, **not** UI chrome to copy. Generator UX studied from spritesheets.ai / autosprite.io as *UX research*, not code theft. User-supplied free-use art is in `public/starter-pack/`.

### 1.2 Engine growth doctrine (Brian — 2026-08-04)

**End state (not tomorrow, but always aimed at):** PixelPlane is not only a toolkit *plus* a mini sandbox. It grows into a **full, seamless game-creation package** — art → anim → systems → play → ship — in our style and flow, including tools and ideas the industry hasn’t standardized yet. External engines (Godot/Unity/…) remain first-class **export / wire** targets forever; our own engine is the **native play + eventually full production runtime**.

**Birthplace:** the **City Engine** (GTA-style top-down open-world sandbox) is seed, not toy. Every piece we add there must **feed a growing system** — flow, function, and extension points — so future systems land without catastrophic backtracking.

**Perspective template ladder (build one well → clone the pattern):**

1. **Complete one perspective “blueprint”** (current: top-down crime sandbox feel) with the systems we want for that style.  
2. Freeze it as a **game-type template** (assets + engine wiring + camera language + folder defaults).  
3. Repeat for top-down family: true top-down, isometric, angled/oblique 3/4, etc.  
4. Later families: FPS/Doom-style (open architecture refs only), RTS, RPG, puzzle, sports, …  
5. Far horizon: foundation strong enough for **3D**, not only 2D pixel that *feels* 3D-aware.

**User choice modes (design for both):**

| Mode | Behavior |
|------|----------|
| **Guided** | Perspective + pixel size (16/32/64/…) suggests which assets fit, what facings matter, folder defaults |
| **Free** | User sets perspective/engine intent; engine **wires toward** that (camera, collision assumptions, export layout) with **zero nagging** |

**Studio org at company scale (background vision):** role canvases (art / anim / systems / env / QA) under one project; **central feed-hub planes** so a character or anim can be wired to a hub and fan out to other teams’ planes. Spatial scope + wire zones are early DNA for that.

**Implementation rules for Grok (always):**

1. Prefer **pluggable modules** (camera, input, physics stub, world realm outdoor/indoor, props, quest hooks) over hard-coded one-game logic.  
2. Name and document **perspective profiles** even if only one is implemented.  
3. Studio art + City Engine share **contracts** (destructibles registry, quest JSON, spatial scopes, pixel size) — never a one-way demo hack.  
4. Clean-room forever: mechanics free; no stolen expression.  
5. Small finished living systems > half a mega-engine.

---

## 2. Journey log (historical)

| When (approx) | What happened |
|---------------|----------------|
| Kickoff | Brian: pixel studio like pix2d + infinite plane + anim squares + engine wire + generator + commercial ambition |
| Early build | TanStack Start app: canvas editor, layers, tools, anim regions, particles, place actors |
| Engine system | Folder trees, wire zones, destination picker, multi-engine export ZIP |
| Starter pack | Free-use rat ninja / neon / sheets hydrated onto plane; Pack panel |
| Parallax | Rain-city layers; multi-engine parallax export configs; canvas depth scroll |
| Solitaire | Droppable Klondike + skin template artboards rebind card art |
| Mega plane | Huge zoom range, multi-scale grid, sector labels, large feed fields |
| Map + persist | Minimap, IndexedDB autosave, sheet slicer, duplicate artboard |
| Hotkeys + UX language | StarCraft F1–F12 locations; rebind with conflict; **in-canvas tips/dialogs** (not browser modals) |
| Now | Compendium established; **all §6–8 signature features planned for full implementation** |

---

## 3. Changelog (newest first)

### 2026-08-10 — Goodies wave 7 · EMS · bikes · factories · interiors
- **+34 sheets (115 citykit total):** motorcycles (clean→wreck), EMS fleet + damage, sports/color cars, taxi damage, heavy factories, living-room interiors, mega fortresses, dense cyber facades, server rooms, purple modular pipes, rail+crane kit, garden helipads
- **Ctrl+K → city kit** dumps all 115

### 2026-08-10 — Goodies wave 6 · Port · rails · neon fleet
- **+26 sheets (81 citykit total):** hospitals/civic, port cranes/containers, rail tracks, rust sedans, civilian fleet, armored side views, neon road strips/props, labeled venues, purple pods, midrise apts, industrial fronts, hangars, slum roofs, tiered forts
- **Ctrl+K → city kit** dumps all 81

### 2026-08-10 — Goodies wave 5 · City kit expansion
- **+31 sheets (55 citykit total):** street shops, JP neon signs, armored vehicles, maglev trains, elevated rails, road sets/atlas, alleys, debris, civic temples, fortresses, factories, HVAC roofs, pipes, corridors, elevators
- **Ctrl+K → city kit** dumps all 55

### 2026-08-10 — Goodies wave 4 · City kit
- **24 magenta sheets:** neon/weaponized cars, 8-dir truck, trains/containers, road connectors, street debris, towers, gothic mansions, modular blocks, industrial plant, hangars/cranes, airport, rooftops, compounds
- **Ctrl+K → city kit** (fast) · full goodies now wave 1–4

### 2026-08-10 — Goodies wave 3 · Skyline kit
- **15 iso buildings:** Corp tower, Control, WARE 6×6, Plaza twins, Broadcast, Chrome Tools, Holo Gear, Core Stack, duplex, Data core, Beacon spire, Hab Fortress, Diamond HQ, Sat hub, fire-escape block + PSU fan prop
- **Full brew station** art behind Brew kernel
- **Ctrl+K → skyline** (fast kit) · **quest tools** loads 8 named slots (Audio Deck → Access Pass)

### 2026-08-10 — Goodies wave 2 + Brew kernel
- **+24 assets:** office furniture, landmarks/metro, hangars, named street shops, ports, heavy weapon sheets, quest tools/gadgets, scavenge loot, full bar/cook/brew district art
- **Brew kernel:** heat/cool/pour minigame (sweet spot 55–72°) skinned from bar drop
- **Summon Goodies** now dumps wave 1+2 (~45 boards) into one Night Ops feed

### 2026-08-10 — Holy Shit Layer III (Wave C · time / kernels / sound)
- **Goodies Drop pack:** weapons/armor, fish/tech, road grids, neon tiles, buildings, UI HUD, props, solitaire chrome → `/public/packs/goodies`
- **Summon Goodies** (Ctrl+K) dumps boards + Night Ops feed plane
- **Living timeline:** stamp + auto-stamp moments; scrub camera; strip UI
- **Play kernels:** Inventory (12 slots) + Active Leads checklist (UI from drop)
- **Sound-as-sprite:** chips on plane, click to play Web Audio patterns (blip/bass/noise/chord/siren)

### 2026-08-10 — Holy Shit Layer II (Wave B production magic)
- **Reference Orbit:** pin boards → cyan satellite cards orbit the view with tethers
- **Diff Lantern:** compare active board vs nearest neighbor; hot amber Δ pixels
- **Mutation Rails:** neon / dusk / silhouette / chrome variants from one board
- **Night District hero in City Engine:** cyberpunk chassis sprite on foot (toggleable)
- Systems dock: Orbit · Lantern · Mutate · Command palette entries
- Status: Wave B signature systems 5–8 shipped (palette gravity was Layer I)

### 2026-08-10 — Post-Calamity Ascension (freestyle era)
- **Doctrine:** freestyle is good; the First Calamity taught us backups. Git is mandatory.
- **First Calamity (record):** mid-Wave-A partial file writes destroyed `CanvasWorkspace`, hotkey defaults, briefly studio store — no git yet. Rebuilt from bundle + architecture knowledge. **Matter of record: never again without commits.**
- **Command palette:** Ctrl/Cmd+K god surface — tools, suite, Wave A, F-jumps, Night District.
- **Palette Gravity:** nearby boards emit living swatches under the brush (Magnet HUD).
- **Night District pack:** cyberpunk hero/blocks/roads/fleet/FX → `/public/packs/night-district` · Summon onto plane.
- **Plane atmosphere:** void vignette + cyan/amber grid pulse.
- **City Engine chrome:** Birthplace · freestyle era label.

### 2026-08-10 — Studio polish pass
- Tips no longer cover Plane systems dock (dock z-[45], tip clamp, one tip at a time)
- Wave A tool glyphs: `tool_*_viewport.png`, `tool_*_stamp.png`
- Guide example title: `GridPaw_Feature Pipeline` → `Example_Feature Pipeline` (codename was leaking as product name)
- MiniMap: dropped `@ts-nocheck`


### 2026-08-08 — Brian pixel icon packs wired (amber/cyan + UI/FX)
- Sliced tool / pack E / pack F sheets → `/public/pixel-icons/`
- Theme toggle: **amber · cyan · vector** (toolbar cycle + library)
- Left toolbar uses PixelIcon; library shows packs + UI chrome preview
- Explosion sheets → 16-frame smash FX in City Engine
- Minimap frame, stamina, quest panel, UI kit ingested
- **Audit:** typecheck + browser icon load smoke

### 2026-08-06 — City District: weighted tiles + sub-tile footing (Brian catch)
- **Tile mutation pools:** AutoTile rules with weighted variants; paint demo strip; decal pass (skid/litter/graffiti/puddle).
- **Footing collision:** bottom-strip colliders; overhang band; walk-under awnings; z re-draw when under.
- Studio panel (grid icon) + canvas debug colors; engine loads Studio footings or demo awnings; foot resolve in sim.
- Export city_district_tiles_footing.json.
- **Audit:** typecheck pass. Peon catch = god-tier early systems.

### 2026-08-05 late — Full self-audit (typecheck · build · browser)
- **Typecheck:** clean (`tsc --noEmit`)
- **Production build:** clean (Vite + Nitro Vercel output)
- **Browser smoke:** Studio chrome, Memory Web, Character District, City Engine, Look-at-This, Plane systems — **0 page errors, 0 console errors**
- **Modules:** all critical spatial / memory / district / engine files present; startup.sh OK
- **Known soft gaps (not bugs):** First Night deferred (no CTA); ghost pulse needs Studio open after engine for halo; compose export multi-download not single ZIP; P2P needs peers; AI gen still procedural; pixel icon packs not wired (`pixelSrc` reserved)
- **Status date:** 2026-08-05

### 2026-08-05 — Anim district holy-shit tier (audio · springs · ghost pulse)
- **D_Audio:** frame SFX anchors on anim strips; export in state-machine JSON.
- **D_Spring:** secondary spring nodes (stiffness/damping/mass); Verlet sim preview.
- **D_Debug Ghost Pulse:** City Engine reports locomotion state → state pads halo on plane + LIVE in panel.
- **Audit:** typecheck + smoke.

### 2026-08-05 — Character District 3 slices (Gemini D_Hitbox / D_Composite / D_Bake)
- **Hitbox onion:** drag-draw G/R/B on active anim frame; ghost prev frame; Apply to all frames; Propagate → next.
- **DNA gravity:** chassis set + radius ring + tether rays when modular boards enter field.
- **Dual bake export:** Layered (per-piece PNG + meta) vs Baked atlas; plane stays non-destructive.
- Panel sections + canvas viz + pointer draw path.
- **Audit:** typecheck pass.

### 2026-08-05 — Character District doctrine + scaffold (Gemini)
- Adopted **Animation District** blueprint: DNA · Facing · Strips · Logic.
- **D_State:** state pads bind anim strips by center-in-pad; manual bind exception.
- **D_Compose** noted (modular non-destructive; bake at export).
- Collision color standard: green hurt / red hit / blue push.
- Transitions with conditions (`Velocity > 0`, `On_Anim_End`).
- Scaffold: `lib/character-district/*`, store, canvas draw, panel, top-bar clapperboard, export state-machine JSON.
- Diagrams from Gemini ASCII archived as design source.
- **Audit:** typecheck pass.

### 2026-08-05 — Memory Web (general) + Live Asset Sockets
- **Memory Web** (`lib/memory-web/`): agents (npc/player/group/faction), events, disposition, gossip propagate to group/faction; group-by-selection + plane-cluster + faction assignment.
- Demo seed: Neon Crew + Syndicate; smash-near memory propagates.
- Studio: **Brain** panel — select, group, faction, dialogue hooks, export JSON; plane markers + cluster rects.
- City Engine: NPCs spawn from web; **F smash** writes memories; floating dialogue labels.
- **Live sockets** (`lib/engine/live-sockets.ts`): bind artboard/anim → engineKey; rev fingerprint poll; rebuild from feed planes; hot status in engine.
- **Audit:** typecheck pass.

### 2026-08-05 — Hard systems wave (masks · D_10x · Play Ghost · export map)
- **A3 Private / Witness / Focus masks:** draw bubbles on plane; dock tools; collab `mask` fanout; Esc cancel.
- **D_10x Interest:** `spatial/interest.ts` 512px chunks; local interest from camera; collab `interest` + cursor; optional chunk grid viz.
- **C1 Export map (lite):** Systems dock → per-plane asset counts + folder paths.
- **Watch mode:** editor ↔ witness role on dock.
- **Play Ghost (novel):** City Engine records foot/drive/indoor trail; leaving drops raster note on Studio plane.
- **SystemsDock** UI left edge.
- **Audit:** typecheck pass.

### 2026-08-05 — First Night deferred (Brian lead design)
- **A1 First Night** moved out of active Wave A polish: do **one full sweep** after more systems exist — not re-iterate every feature add.
- Scaffold (path steps, guide UI, beacons) may remain as dormant tooling; not the product front door until the sweep.
- Active focus: living systems (spatial, engine birthplace, co-presence architecture D_10x, private mask, export seriousness) per Gemini stack minus early tour lock-in.
- **Audit:** docs + UI de-emphasis.

### 2026-08-09 — Wave A signature systems shipped
- **Session ghosts:** Ctrl+F1…F12 captures ghost thumb; plane draw + Ghosts toggle.
- **Game viewport (Ghost of the game):** tool U, resolution presets, safe/HUD guides, capture PNG.
- **Constraint stamps:** tool N, pixel cages on plane, active stamp.
- **Wire heat map:** SystemsDock toggle; zones glow by density + wire health.
- Recovered CanvasWorkspace + defaults + studio store after mid-impl file damage; app smoke-clean.

### 2026-08-04 — Gemini stack adopted · Wave A kickoff
- **Official execution stack** (Gemini): B3→Wave A; C3 deferred; add D_10x Interest Management; D_Scope nested priority.
- **A1 First Night:** guided path art→anim→smash→quest→City Engine (`FirstNightGuide`, `first-night/path.ts`).
- **B3 Look-at-This:** beacons (`spatial-nav` store), Ctrl+L drop, G cycle, collab `look_at` camera pull, on-plane pulse pins.
- **D_Scope:** `spatial/priority.ts` — smallest pad owns; export uses owner only; multi-pad highlight on active artboard.
- Soft pad + scope UI notes in Feed planes inspector.
- **Audit:** typecheck pass; First Night + beacon UI wired.

### 2026-08-04 — Engine birthplace: perspective + quest contract
- **`perspective.ts`**: modular perspective profiles (live: top-down open world; blueprints for true top-down, iso, 3/4, FPS…). Zoom language driven by profile.
- **`quest-runtime.ts`**: Studio quest trees → City Engine mission; smash/ram events advance objectives (e.g. Street Heat 0/5).
- **sim.ts**: profile on state; smashCount; emitQuest on destroy; indoor/drive zoom via profile.
- **CityEngineView**: Active Quest HUD; loads primary Studio tree on enter; profile label “engine birthplace”.
- **Audit:** typecheck pass; browser: quest HUD + F-smash increments progress.

### 2026-08-04 — Engine growth doctrine (full package horizon)
- §1.2 + §17: City Engine is **engine birthplace**, not a permanent mini-demo.
- Perspective template ladder (finish one top-down blueprint → iso / 3-4 / FPS / RTS / RPG / … → 3D foundation).
- Guided vs free perspective modes; company multi-canvas + central feed hubs noted.
- Build rule: modular seams always — no backtracking traps.
- **Audit:** docs only.

### 2026-08-02 — Identity doctrine locked (Brian)
- Wrote §1.1: ecosystem not competition; respect for existing tools; glove-for-many-hands; connection > pleasantries; living systems quality bar; father–son north star; holy-shit pride metric.
- Spatial + manual exception affirmed as product physics.
- **Audit:** docs only.

### 2026-08-02 — Spatial proximity scoping (Gemini D)
- Adopted Gemini idea: **canvas coordinates = organizational structure**.
- `src/lib/spatial/scope.ts` — collectScoped / scopeForZone / scopeForQuest / spatial quest links.
- Feed plane inspector shows **Spatial scope** membership; plane labels show counts.
- Quest panel **Magnet** binds nearby smashables onto objectives by proximity.
- Export writes `_pixelplane/spatial_scopes.json` + manifest.spatialScopes.
- **Audit:** typecheck pass.

### 2026-08-02 — Gemini ideas advisor onboarded
- Added **`GEMINI_BRIEFING.md`**: product snapshot for Gemini (no-code third eyes).
- COMPENDIUM team table: Gemini = ideas advisor only; Grok remains sole implementer.
- **Audit:** docs only.

### 2026-08-02 — Foundation expansion wave
- **City Engine smashables:** crates/barrels/pots/signs; **F** melee; vehicle ram; debris + wanted nudge.
- **Demo seed:** quest tree “Street Heat” + smash alley on plane; wire zones for quests & destructibles.
- **Export ZIP:** quests/trees/*.quest.json + destructibles_registry.json in package.
- **Quest panel:** click node → edit title/body live.
- **Wire heat map** glow on busy feed planes; **ghost F-key bookmarks** on plane.
- **Journey ticker** soft tips under canvas (family + ship identity).
- **Audit:** typecheck pass; studio + city smash smoke.

### 2026-08-02 — Destructibles + Quest builder wire
- Wire categories **destructibles** (HP stages pristine→debris, drops) and **quests** (on-plane quest tree builder).
- Drawing a Quests plane spawns Start→Objective→Branch→Rewards→End; panel adds nodes + JSON export.
- Drawing Destructibles plane places crate prop; panel: hit/smash, spawn crate/barrel/pot/sign.
- Engine folders include destructibles/* and quests/* subtrees.
- **Audit:** typecheck pass; browser draws quest tree + destructible.

### 2026-08-02 — Project skills → Icon + Anim libraries
- Mapped `.grok/skills/game-*` (asset-core, animation-frames, ui-icons, tilesets, character-consistency) into **AGENTS.project.md**.
- New `src/lib/icon-library` catalog + panel (wire/HUD/anim/chrome ids; pixelSrc swap-ready).
- Anim Lab `doctrine.ts` loop audit + RightPanel cycle presets (idle/walk/run…).
- **Audit:** typecheck + icon library panel open.

### 2026-08-02 — Indoor scenes (enter buildings)
- Built-in interiors: shop, loft apt, warehouse, syndicate office with outdoor ◆ door markers.
- Studio **Building** icon → `createIndoorScene` artboard kind `indoor` (paint layout; amber strip = exit).
- City Engine loads studio indoors as extra doors; E enters/exits; indoor cam zoom; collision on walls.
- **Audit:** typecheck pass; browser door flow exercised.

### 2026-08-02 — Dual suite: Studio + City Engine (clean-room)
- **Two suites one app:** `appMode` studio | engine. Studio unchanged as top asset layer; City Engine is play sandbox.
- City map + vehicle sheet from Brian art (`public/engine/`). Drive = zoomed city view; on foot = closer zoom (lerp).
- Original sim: WASD, enter/exit E, traffic spawns, minimap, wanted stub. No GTA assets/code.
- Legal refs studied: Carnage3D (MIT reimpl architecture ideas), FreeCrime (open clone goals), Baker/Selden mechanics principle — **our code only**.
- **Audit:** typecheck pass; browser enter van → DRIVING 60u/s city zoom → exit ON FOOT.

### 2026-08-02 — Chunk-stitching QA guide
- Added TC-001…TC-020 chunk border QA tracker (96×64) + edge-type reference to Guides pack (procgen).
- **Audit:** manifest count 11; guide markdown served.

### 2026-08-02 — Useful Guides pack (Copilot dumps)
- Extracted 10 guides from RAR (docx/xlsx → markdown in `public/guides/`).
- In-app **Guides** panel (book icon): search, categories, offline reader.
- Categories: pixel-art, pipeline, systems, procgen, multiplayer.
- **Audit:** typecheck pass; manifest served; browser open list + reader.

### 2026-08-01 — Shared planes (multiplayer co-op) + popup anims
- WebRTC P2P mesh: signaling `/api/rtc` (PGLite/Neon), `useP2PRoom`, collab protocol (cursors, canvas messages, layer branch share, social wave).
- UI: Top bar **Shared plane** panel — room codes, join/leave, messages, popup entrance picker (fade/bounce/pixel-pop/glitch/custom…).
- Peer cursors drawn on the infinite plane; in-canvas collab notes use popup anim system.
- Vision: art teams, friends, **parent–child long-distance create-together** (e.g. CO ↔ AZ).
- **Audit:** typecheck pass; `/api/rtc` 200; browser panel + join smoke.

### 2026-08-01 — Animation Beast foundation (offline knowledge)
- New `src/lib/anim-lab/`: silhouette extraction, secondary spring chains (tail/ear/cloak/hair/cape), silhouette-locked cosmetics + recolor variants, self-audit scorer.
- Studio actions: `applySecondaryMotion`, `applyCosmeticSystem`, `auditAnim` — bake **siblings** (original kept).
- Inspector **Animation Beast** panel on selected anim.
- Vision locked: rich offline knowledge spine; gen is optional gas only. Second-layer + cosmetics-follow-silhouette are first-class.
- **Audit:** `npm run typecheck` pass; browser smoke for panel + actions.

### 2026-08-01 — Legal absorb + anim lab doctrine (§15)
- Defined legal absorb pipeline; PixelLab as optional API provider; anti-LoRA-primary path; cohesion via lab tools; provider plugin plan.
- **Audit:** docs only; typecheck N/A for this section.

### 2026-08-01 — Compendium v1.0.0
- Added `COMPENDIUM.md` as live handoff + history + user instruction source.
- Documented full system map, stubs, signature feature roadmap (all features committed), self-audit protocol.
- **Audit:** `npm run typecheck` clean; no new runtime code in this step.

### 2026-08-01 — Camera locations + in-canvas UX language
- StarCraft-style **Ctrl+F1…F12** save / **F1…F12** jump; bookmark strip; inspector grid.
- Hotkey rebind (**Ctrl+Alt+K**); conflict dialogs **on canvas**.
- First-use **feature tips** as canvas cards with creative uses.
- Files: `src/store/hotkeys.ts`, `src/lib/hotkeys/defaults.ts`, `src/components/studio/CanvasOverlays.tsx`, `StudioShell.tsx`, `RightPanel.tsx`.
- **Audit:** typecheck clean; Playwright verified save/jump + tips; no console errors.

### 2026-08-01 — Minimap, autosave, sheet slicer
- Plane map click-to-jump; IndexedDB project autosave; slice artboard → anim frames.
- Files: `MiniMap.tsx`, `lib/pixel/persist.ts`, studio `sliceArtboardToAnim` / `applySnapshot`.
- **Audit:** typecheck; browser save + slicer UI present.

### 2026-08-01 — Mega plane
- Zoom ~2%–6400%; multi-scale grid; larger feed planes; spread starter layout.
- **Audit:** screenshots at extreme zoom-out.

### 2026-08-01 — Parallax + Solitaire + engines
- Parallax stacks + engine configs; playable Solitaire + skins; export packages.
- **Audit:** Klondike rules + skin binding smoke-tested earlier in session.

---

## 4. Architecture — what exists and works

### 4.1 Stack
| Layer | Tech |
|-------|------|
| Framework | React 19, TypeScript, TanStack Start / Router, Vite 8 |
| State | Zustand (`studio`, `hotkeys`, `solitaire`) |
| Style | Tailwind v4, dark charcoal + amber accent |
| Pixels | `Uint8ClampedArray` buffers, canvas 2D, pixel-perfect |
| Persist | IndexedDB (`pixelplane_v1`), localStorage for hotkeys/bookmarks/tips |
| Engines | Godot, Unity, Unreal, GameMaker, Generic export |
| Port | `0.0.0.0:8080` |

### 4.2 Key source map

| Path | Responsibility |
|------|----------------|
| `src/routes/index.tsx` | Mounts `StudioShell` |
| `src/components/studio/StudioShell.tsx` | Shell, hotkeys dispatch, autosave lifecycle, tips on tool change |
| `src/components/studio/CanvasWorkspace.tsx` | Infinite plane render + pointer tools + parallax draw |
| `src/components/studio/LeftToolbar.tsx` | Tools + palette |
| `src/components/studio/RightPanel.tsx` | Inspector: project, cams, engine tree, layers, slicer, anims, particles, parallax |
| `src/components/studio/TopBar.tsx` | Project actions, zoom, gen, pack, engine, solitaire, help |
| `src/components/studio/MiniMap.tsx` | Overview + jump |
| `src/components/studio/CanvasOverlays.tsx` | Tips, toasts, hotkey conflict dialogs, bookmark strip |
| `src/components/studio/WirePalette.tsx` | Drag wire connector icons |
| `src/components/studio/EngineConnectModal.tsx` | Create/link game project + engine |
| `src/components/studio/DestinationPicker.tsx` | Wire zone → folder destination |
| `src/components/studio/GeneratePanel.tsx` | Prompt generator UI |
| `src/components/studio/SolitaireWidget.tsx` | Playable Klondike overlay on plane |
| `src/components/studio/StarterPackPanel.tsx` | Drop free-use assets |
| `src/store/studio.ts` | **Core** domain state (~2k lines): artboards, anims, particles, actors, parallax, wires, history, seed/hydrate |
| `src/store/hotkeys.ts` | Bindings, bookmarks, overlays |
| `src/store/solitaire.ts` | Solitaire instances + skins |
| `src/lib/pixel/*` | Buffer ops, generate, bg-remove, types, persist |
| `src/lib/engine/*` | Folder templates, export ZIP, parallax engine configs |
| `src/lib/solitaire/*` | Rules engine, card draw, skin template |
| `src/lib/hotkeys/defaults.ts` | Default bindings + FEATURE_TIPS copy |
| `src/lib/starter-pack.ts` | Manifest loader helpers |
| `public/starter-pack/` | Free-use demo art + `manifest.json` |
| `startup.sh` | Revive-safe `npm run dev` |

### 4.3 Domain model (studio)

- **Artboard** — pixel document on plane (sheet / scene / hud / note / skin_template kinds).
- **Layer** — named buffer inside artboard.
- **AnimRegion** — frameW×frameH stack, fps, onion, playhead.
- **SceneActor** — instance of an anim placed on plane.
- **ParticleSystem** — region FX (procedural).
- **ParallaxStack** — layered depths, viewport or sheet-wide, engine hints.
- **WireZone** — feed plane rectangle → category + folder path.
- **EngineProject** — engine id + folder tree + size defaults.
- **Camera** — x, y, zoom (screen-space transform).
- **Selection / clipboard / history** — pixel edit undo stack (bounded).

### 4.4 Systems that work (shipping quality for demo)

| System | Quality | Notes |
|--------|---------|-------|
| Infinite canvas pan/zoom | **Solid** | 0.02–64 zoom; multi-scale grid; origin axes |
| Pixel tools (brush/eraser/fill/shapes/marquee) | **Solid** | On active artboard layer |
| Layers | **Solid** | Add/dup/delete/merge/visibility/lock |
| Anim regions | **Solid** | Create, fps, frames, play, onion, export sheet |
| Sheet slicer | **Solid** | Grid cut → anim; skips empty cells |
| Place actors | **Solid** | Live frame playback on plane |
| Particles | **OK** | Procedural kinds; not a full particle lab |
| Parallax preview | **Solid** | Depth scroll on pan; multi-layer |
| Engine connect + wire zones | **Solid** | Godot default demo; destination picker |
| Export ZIP | **Solid** | Folders + engine-specific stubs/configs |
| Starter pack | **Solid** | Manifest-driven; auto seed on empty |
| Solitaire | **Solid** | Full Klondike; skin rebinding from artboards |
| Minimap | **Solid** | Click jump |
| Autosave | **Solid** | IndexedDB; Ctrl+S; restore on load |
| Camera bookmarks F1–F12 | **Solid** | Persist localStorage |
| Hotkey rebind + conflict | **Solid** | Canvas dialogs |
| In-canvas feature tips | **Solid** | First-use; localStorage seen flags |
| Indoor building enter | **Foundation solid** | Doors, 4 builtins + Studio indoor artboards |
| City Engine play suite | **Foundation solid** | Top-down city drive/foot, original art |
| Useful guides panel | **Solid** | 10 offline Copilot research guides |
| Shared plane collab | **Foundation solid** | P2P room codes, cursors, messages, layer branch |
| Animation Beast | **Foundation solid** | Secondary springs, silhouette cosmetics, self-audit (`src/lib/anim-lab`) |
| Generator | **OK / limited** | Procedural pixel character — **not** remote AI yet |
| Background remove | **OK** | Heuristic chroma-ish remove on active board |
| Auth / multiplayer / DB | **Template only** | Not product surface for PixelPlane yet |

---

## 5. Stubs, gaps, known limits

| Item | Status | Location | Next step |
|------|--------|----------|-----------|
| True AI image/anim generation | **STUB / local procedural** | `lib/pixel/generate.ts`, `GeneratePanel.tsx` | Provider interface + optional **PixelLab API** (user key); procedural stays offline fallback — see §15 |
| Full CRDT multi-user pixel edit on one layer | **Planned** | Presence + messages + layer branch now; live co-paint later |
| Non-destructive multi-secondary stack on one anim | **Partial** | Currently bakes **new sibling** anims | Layer compositor stack on single AnimRegion |
| Cosmetics from user artboards (not procedural hat) | **Partial** | `makeHatStamp` demo + recolor variants | Pick stamp from selection/artboard |
| Second-layer “knows” bone chains from sheet tags | **Planned** | silhouette anchors only today | Optional light skeleton slots + sheet metadata |
| Reference-image generator | **Partial** | Generator accepts mode but depth limited | Style seed from *user’s* boards only; API init-image when key present |
| Multiplayer collab | **Unused template** | `lib/multiplayer/*` | Out of scope until single-player plane is feature-complete |
| Auth / accounts | **Template** | `lib/auth/*` | Commercial phase |
| Full Unreal/Unity live plugins | **Export configs only** | `lib/engine/*` | Deeper importers later |
| Particle lab (curves, sprites) | **Basic** | studio particles + canvas draw | Expand with kernel system |
| Solitaire skins from E: drive cards | **Blocked** | User machine not mounted | User upload into starter-pack |
| Mobile touch polish | **Partial** | Works but desktop-first | Touch targets + pinch zoom |
| Living collage timeline | **NOT STARTED** | — | §6.1 |
| Ghost game viewport | **SHIPPED** | tool U · presets · canvas frames · capture PNG | §6.2 |
| Mutation rails | **NOT STARTED** | — | §6.3 |
| Palette gravity | **NOT STARTED** | — | §6.4 |
| Sound-as-sprite | **NOT STARTED** | — | §6.5 |
| Rule cards | **NOT STARTED** | — | §6.6 |
| Diff lantern | **NOT STARTED** | — | §6.7 |
| Session ghosts | **SHIPPED** | F-key thumbs · plane ghosts · toggle | §6.8 |
| Play kernels (beyond solitaire) | **NOT STARTED** | Solitaire is v0 kernel | §6.9 |
| Reference orbit | **NOT STARTED** | — | §6.10 |
| Constraint stamps | **SHIPPED** | tool N · pixel cages · active clamp-ready | §6.11 |
| Wire heat map | **SHIPPED** | Plane systems toggle · zone glow | §6.12 |

**Policy:** No silent half-features. If incomplete, it is listed here with a path and next step.

---

## 6. Signature feature roadmap (ALL will be built)

Brian’s directive (2026-08-01): **do not pick only a few** — implement the full set so PixelPlane owns a category.

### 6.1 Living collage timeline
- **Status:** Shipped lite (Layer III) — moments strip + camera jump
- **Idea:** Horizontal beat line on plane; X = time; anims/actors/particles/parallax scrub in sync.
- **Data:** `TimelineRail { id, y, startX, endX, bpm?, durationMs }` + links from actors/anims.
- **UI:** Tool or icon drop; scrub head; play.
- **Export:** Optional cutscene JSON / Godot AnimationPlayer stub.
- **Status:** Planned

### 6.2 Ghost of the game (viewport frame)
- **Idea:** Drop resolution frame (320×180, 640×360, custom); contents = “player view” with HUD layers.
- **Data:** `GameViewport { x,y,w,h, resolution, showSafeArea }`.
- **UI:** Drag corners; optional letterbox; screenshot export of viewport only.
- **Status:** Shipped (Wave A) — tool + canvas + capture

### 6.3 Mutation rails (non-destructive variants)
- **Idea:** Base artboard → child rails (recolor, outline, scale, 8-bit crush); edit base, variants update.
- **Data:** `MutationRail { parentId, ops[] }` or artboard `kind: "variant"` + ops.
- **Status:** Planned

### 6.4 Palette gravity
- **Idea:** Palette anchor node; nearby artboards snap colors toward palette (strength slider).
- **Data:** `PaletteAnchor { colors[16|32], radius, strength }`.
- **Status:** Planned

### 6.5 Sound-as-sprite
- **Idea:** Audio chips on plane; scrub with anim playhead; export to engine audio folders.
- **Data:** `AudioChip { buffer or url, syncAnimId? }`.
- **Note:** Browser AudioBuffer; user uploads samples.
- **Status:** Planned

### 6.6 Rule cards
- **Idea:** Sticky logic cards (“Space → Walk”); export stub scripts / input map.
- **Data:** `RuleCard { when, then, links[] }` DSL (intentionally small).
- **Status:** Planned

### 6.7 Diff lantern
- **Idea:** Compare two boards; lantern shows only differing pixels.
- **Status:** Shipped (Layer II) — nearest-neighbor compare + hot overlay

### 6.8 Session ghosts
- **Idea:** Optional thumbnail snapshot when saving F-key location; show ghost under current.
- **Status:** Shipped (Wave A) — saveBookmark thumbs + plane draw + SystemsDock toggle

### 6.9 Play kernels
- **Idea:** Generalize Solitaire: platformer sandbox, inventory grid, dialogue box, card hand — all skinnable from plane art.
- **Architecture:** `KernelPlugin { id, place(x,y), render, tick, skinSlots }`.
- **Status:** Solitaire = first kernel; others planned

### 6.10 Reference orbit
- **Idea:** Pin reference in screen space or world space; toggle orbit mode.
- **Status:** Shipped (Layer II) — screen-space satellite cards + tethers

### 6.11 Constraint stamps
- **Idea:** Spatial 48×48 / tile cages; paste/generate auto-fits; sync size to engine folders.
- **Status:** Shipped (Wave A) — tool N, plane cages, active stamp

### 6.12 Wire heat map
- **Idea:** Glow feed planes / artboards by export coverage vs orphans.
- **Status:** Shipped (Wave A) — SystemsDock “Wire heat” toggle

### Implementation order (recommended waves)

**Wave A — Spatial power (next)**  
1. Session ghosts (fast win on F-keys)  
2. Game viewport frame  
3. Constraint stamps  
4. Wire heat map  

**Wave B — Production magic**  
5. Mutation rails  
6. Palette gravity  
7. Diff lantern  
8. Reference orbit  

**Wave C — Time, feel, logic**  
9. Living collage timeline  
10. Play kernels framework + 1–2 new kernels  
11. Sound-as-sprite  
12. Rule cards  

**Wave D — Generator depth**  
13. Stronger procedural + reference pipeline  
14. Optional external AI backend when commercial  

---

## 7. Currently being worked on

| Item | Owner | State |
|------|-------|-------|
| Live compendium + handoff discipline | Grok + Brian | **Active (this file)** |
| Wave A signature features | Grok | **Shipped (canvas + toolbar + dock)** |
| Hands-on playtest feedback | Brian | **Imminent (post-work)** |

---

## 8. Near-term implementation plan (concrete)

When resuming build after this doc:

1. **Session ghosts** — on `saveBookmark`, rasterize minimap region or store camera + optional PNG thumbnail in localStorage/IDB; draw ghost under bookmark jump toast / on plane corner.
2. **GameViewport** type + tool + canvas draw + “capture viewport PNG”.
3. **ConstraintStamp** tool: place rect with fixed pixel size; clamp paste into stamp.
4. **Wire heat map** toggle: color zones by whether folder has exported assets / artboards overlapping zone.
5. Update this compendium after each.

---

## 9. Commercial notes

- Goal: ship commercially as all-in-one creative plane for 2D game assets.
- Default curated icons package (Brian’s free-use set) at purchase; user can swap any UI icon later.
- Engine connection is a **brief setup**, then canvas feeds folders.
- Legal: original UI chrome; open-source inspiration only; user assets free-use as provided.
- Multiplayer / accounts later; core value is single-creator infinite plane.

---

## 10. Dev commands (agent-only; never tell user to run these)

```bash
sh /workspace/startup.sh          # ensure preview server
npm run dev                       # 0.0.0.0:8080
npm run typecheck
npm run build                     # must pass for Vercel-style deploy
node scripts/browser-smoke.mjs http://127.0.0.1:8080/ /workspace/screenshots/smoke.png
```

---

## 11. Self-audit checklist (run after every change)

- [ ] `npm run typecheck` exits 0  
- [ ] Dev server still healthy on 8080  
- [ ] If UI: Playwright or smoke — visible content, **no page errors**  
- [ ] No new silent stubs; any incomplete work listed in §5  
- [ ] `startup.sh` still correct if start command changed  
- [ ] This file updated (§3 + relevant sections)  
- [ ] User-facing behavior reflected in §12 if needed  

### Audit log

| Date | Change | typecheck | browser | notes |
|------|--------|-----------|---------|-------|
| 2026-08-01 | Compendium created | pass | n/a (docs) | Baseline handoff |
| 2026-08-01 | Hotkeys / tips | pass | pass | F1 save/jump + tips |
| 2026-08-01 | Minimap / save / slice | pass | pass | — |

---

## 12. Instruction booklet source (for Copilot → pretty guide)

> **Audience:** any skill level. **Tone:** plain language.  
> Copilot may reformat this section into a polished PDF/page; **keep behavior accurate**.

### 12.1 What is PixelPlane?
A giant digital **work table** for 2D games. Draw sprites, cut animations, build backgrounds, test a little solitaire skin, and mark areas that export into Godot/Unity/etc. — all without switching apps.

### 12.2 Moving around
| Action | How |
|--------|-----|
| Pan | Hold **Space** and drag, or Hand tool (H) |
| Zoom | Mouse wheel, or − / + in top bar (down to ~2%, up to huge pixel zoom) |
| Fit everything | Grid icon near zoom controls |
| Overview map | **Plane map** bottom-right — click to jump |
| Camera locations | **Ctrl+F1…F12** save a view; **F1…F12** return (like StarCraft base cams) |
| Reset wide view | Click the % zoom readout |

### 12.3 Drawing
1. Create or select an **artboard** (plus button or Pack).  
2. Choose **Brush (B)**, color, size (`[` `]`).  
3. Other tools: Eraser (E), Fill (G), Line (L), Rect (R), Ellipse (O), Eyedropper (I).  
4. **Marquee (S)** then Ctrl+C / X / V to move pixels.  
5. **Layers** panel: stack, hide, lock, merge.  
6. **Remove BG** / **Export PNG** in top bar when a board is active.

### 12.4 Animations
1. **Animation square (A)** — drag a rectangle on empty plane.  
2. Or select a sheet → **Sheet slicer** in inspector → frame size → **Slice to animation**.  
3. Play/pause, FPS, add frames, onion skin in inspector.  
4. **Place (T)** — drop a live looping actor onto a scene area.

### 12.5 Particles & parallax
- **Particle (P)** — drag a FX region; pick kind in inspector.  
- **Parallax** — demo rain-city stack; pan to see depth. Wire/export knows multiple engines.

### 12.6 Feed planes (engine wiring)
1. **Connect** (top bar) — create project, pick engine, root folder name, default character size.  
2. Open **Wires** palette — drag a category icon (characters, anims, env, UI…).  
3. Draw a **feed plane** or drop icon on a rectangle.  
4. Pick destination folder (or create character entity folders).  
5. Art that lives in that plane is conceptually “owned” by that folder for export.  
6. **Export** downloads a ZIP shaped for your engine.

### 12.7 Starter pack & generate
- **Pack** — free-use demo art (rats, neon, sheets). Drag onto plane.  
- **Generate** — describe a character; procedural pixel frames appear as artboards/anims (not cloud AI yet).

### 12.8 Solitaire
- Top bar **Solitaire** places a full Klondike game on the plane.  
- Template artboards nearby can rebind card backs/faces/table art for playtesting skins.

### 12.9 Saving
- Autosaves in **this browser**.  
- **Ctrl/Cmd+S** or Inspector → Project → Save now.  
- Clear save if you want a fresh seed demo.

### 12.10 Tips & hotkeys
- First time you use a tool, a **tip card** appears on the canvas (not a scary popup).  
- **Ctrl+Alt+K** rebind hotkeys; conflicts ask you on-canvas what to do.  
- **?** help overlay.  
- Undo/redo: Ctrl+Z / Ctrl+Y.  
- Duplicate artboard: Ctrl+D.

### 12.11 How systems work together (the magic)
```
Draw / Pack / Generate  →  artboards on the plane
         ↓
   Slice or Anim square  →  animation regions
         ↓
   Place actors + parallax + particles  →  living scene collage
         ↓
   Feed planes + Connect  →  engine folders
         ↓
   Export ZIP  →  drop into Godot / Unity / etc.
```
Camera F-keys + plane map let you treat the canvas like a **whole studio floor**: F1 characters, F2 anims, F3 world, F4 HUD…

### 12.13 Animation Beast (inspector)
Select an animation → **Animation Beast**:
- **+ Tail / Ear / Cloak / Hair / Cape** — offline secondary motion; new strip appears beside original  
- **Cosmetics · head/back** — silhouette-locked variants (gear follows the body)  
- **Self-audit** — score + plain-language issues (empty frames, teleports, volume pops)

This is the “brain” growing offline — not random generation.

### 12.15 Useful guides
Top bar **book** icon → offline info dumps (pixel art mastery, UI buttons, rarity, multiplayer, procgen, tools comparisons). Search + categories. Great for launch packaging.

### 12.14 Shared plane (create together)
Top bar **people** icon → Shared plane:
1. Set your name · share a **room code** with someone you trust  
2. **Join shared plane** — peer-to-peer (not for strangers/competitive)  
3. See their **cursor** on the infinite canvas  
4. Send a **canvas message** (appears in their view with your popup animation)  
5. **Share layer branch** — sends a copy of your active layer as a new board on their plane  
6. Choose **popup entrance** styles (bounce, pixel pop, custom…)  

Perfect for art teams, friends, or family creating together across cities.

### 12.12 What’s coming (so users aren’t surprised)
Timeline-on-canvas, game viewport frames, palette gravity, mutation variants, more playtest mini-games, sound chips, logic cards, wire coverage heatmap — all planned as first-class plane citizens.

---

## 13. Decision log

| 2026-08-02 | **Spatial Proximity Scoping** (Gemini D) adopted: physical location on the plane scopes assets to feed planes / quests; reduces manual wire fatigue as canvas scales. |


| Decision | Choice | Why |
|----------|--------|-----|
| Infinite one plane vs multi-document | One plane | Brian’s collage vision |
| Zustand vs only React state | Zustand | Large pixel domain + tick loops |
| In-canvas UI vs modals | In-canvas first | Product language / “ahead of curve” |
| Procedural gen first | Yes | Works offline; AI later |
| Solitaire first play kernel | Yes | Proves skinnable playtest toy |
| All signature features | Commit to all | Category ownership, not feature checklist product |
| Compendium living doc | Required | Single human + multi-AI continuity |

---

## 15. Legal absorb strategy & animation lab (no LoRA-on-Brian’s-PC required)

> Added 2026-08-01 after Brian’s questions on legality, PixelLab account, failed local LoRA, and building a great anim system without heavy local ML.

### 15.1 What “absorb” means for us (legal definition)

| Allowed | Not allowed |
|---------|-------------|
| Brian’s free-use / owned art into Pack, demos, tests, style *references he opts in* | Scraping or shipping others’ proprietary sprites as ours |
| Studying **public UX** (what buttons exist, workflow order) of sites like spritesheets.ai / autosprite / PixelLab | Copying their code, models, trademarks, or distinctive UI chrome |
| Using **APIs we pay for** under their ToS (e.g. PixelLab API) with user keys | Shipping their model weights or reverse‑engineering closed models |
| Open-source **algorithms** under MIT/Apache (pixel quantize, optical flow ideas, aseprite file format docs, etc.) | Copying GPL into our core without license strategy |
| Procedural + rule-based systems we write | Training on scraped commercial game assets without rights |

**Absorb pipeline (human-approved):**
1. Brian drops sheets → we **catalog + tag** (size, actions, facings) in Pack / lab fixtures.  
2. Sheets become **working anims** (slice) and **regression tests** for the lab.  
3. Optional later: “use this board as style reference” → sent only to a **licensed API** or offline procedural matcher — never silent training on random web art.  
4. Compendium §5 lists any external dependency.

### 15.2 PixelLab account — how it helps (and how it doesn’t)

[PixelLab](https://www.pixellab.ai/) is a **commercial pixel + animation SaaS** with:
- Character / anim generation, skeleton and text anim endpoints  
- **REST API** (`api.pixellab.ai`) for characters, `animate-with-text`, skeleton anim, inpainting, palettes  
- Intended for **integration into other tools** (also MCP for coding agents)

**Our legal use pattern:**
- PixelLab = **optional cloud provider** behind our Generate panel (Brian pastes **his API key**; key stays in browser local settings, not committed to git).  
- Output frames land on **our plane** as artboards/anims → he edits, wires, exports.  
- We do **not** embed PixelLab’s UI or claim their tech as ours.  
- Commercial shipping: respect PixelLab ToS on API output + our own ToS that “cloud gen requires user’s account.”

**What it does *not* require:** running a LoRA on Brian’s machine.

### 15.3 Why LoRA-on-laptop is the wrong primary path (for now)

Brian already saw: local LoRA ≈ freeze PC, weak output (icons). Reality:
- Good pixel anim models want **VRAM + time** Brian shouldn’t burn for v1.  
- Cohesion comes more from **palette locks, size contracts, onion, retarget, timeline** than from random diffusion frames.  
- Strategy: **cloud API when he wants AI**, **lab tools always offline**.

Later (new machine / budget): optional local model as another *provider plugin* — same interface as PixelLab, never the core.

### 15.4 Amazing animation system **without** relying on generative randomness

Pillars (build order aligns with Waves A–C):

1. **Contract-first anims** — frame size stamps (48×48…), facing folders, action strips; slicer + empty-frame skip (exists).  
2. **Onion + ghost frames + F-key session ghosts** — continuity by eye.  
3. **Living collage timeline** — X = time; scrub whole plane.  
4. **Palette gravity + mutation rails** — cohesion without re-rolling AI.  
5. **Retarget / in-between assists (classical)** — copy limb regions, hold/ease frame insertion, flip-facing, not neural.  
6. **Play kernels** — feel timing in Solitaire / platformer sandbox with *his* frames.  
7. **Sound chips** — hear the cut.  
8. **Provider slot (optional)** — PixelLab / future APIs / procedural fallback fill *gaps*; lab remains the product.

**Cohesion formula we own:**  
`locked palette + locked canvas size + onion + timeline + human/AI frames mixed on one plane`  
…beats “hope the LoRA matched last frame.”

### 15.5 Provider plugin architecture (planned, not fully built)

```
GeneratePanel / Anim lab
        │
        ▼
  GenerationProvider interface
   ├─ ProceduralProvider (offline, always on)     ← exists (basic)
   ├─ PixelLabProvider (API key, cloud)           ← planned
   ├─ ReferenceMatchProvider (quantize + nearest  ← planned light
   │     palette from Brian’s boards; no GPU)
   └─ (future) LocalModelProvider
        │
        ▼
   Artboards + AnimRegions on the plane
```

No provider may read disk outside project/Pack without Brian’s action.

### 15.6 Direct plan (next actions)

| Phase | Action | Legal |
|-------|--------|-------|
| **Now** | Keep accepting Brian’s sheets → Pack + slice demos + tags in compendium | His rights |
| **Now** | Strengthen **lab** (timeline, ghosts, stamps, heat map) offline | Our code |
| **Soon** | `GenerationProvider` + settings “PixelLab API key” + map API frames → plane | His key + ToS |
| **Soon** | Reference mode: pick *his* board as style seed for procedural / API init image | Opt-in only |
| **Later** | Local models only as optional provider when hardware allows | Weights he installs |
| **Never** | Scrape competitors’ private assets or ship their code | — |

### 15.7 Web resources (ideas only — not to copy code)

- PixelLab product + API docs: https://www.pixellab.ai/ · https://api.pixellab.ai/v2/docs  
- Study *workflow* of spritesheets.ai / autosprite (UX research)  
- Open algorithms: color quantization, spritesheet packing, classic onion-skin patterns in open pixel editors (MIT/Apache only; read licenses)

### 15.8 One-sentence doctrine

**The plane and the lab are the product; AI is a plug-in gas station — legal fuel only, never the engine block, never trained in secret on what isn’t ours.**


### 15.9 Animation Beast vision (second layers + cosmetics)

Brian’s target: a system so rich with **animator knowledge** that offline it self-audits and produces what you want — including **second-layer motion** (tails that lag correctly) and a **cosmetic system** that tracks **silhouette/anchors** so gear doesn’t drift.

| Module | Path | Now |
|--------|------|-----|
| Silhouette | `anim-lab/silhouette.ts` | Mass, anchors, hull, overlap |
| Secondary | `anim-lab/secondary.ts` | Tail/ear/cloak/hair/cape Verlet bake |
| Cosmetics | `anim-lab/cosmetics.ts` | Anchor lock + scale follow + HSV variants |
| Audit | `anim-lab/audit.ts` | Score + teleport/volume/empty findings |
| UI | RightPanel → Animation Beast | +Tail… Cosmetics · Self-audit |

**Growth path:** custom stamps from artboards → multi-layer non-destructive stack → light slot skeleton from tagged sheets → audit auto-fixes → still zero dependency on LoRA for correctness.

---

## 13. Decision log

| Decision | Choice | Why |
|----------|--------|-----|
| Infinite one plane vs multi-document | One plane | Brian’s collage vision |
| Zustand vs only React state | Zustand | Large pixel domain + tick loops |
| In-canvas UI vs modals | In-canvas first | Product language / “ahead of curve” |
| Procedural gen first | Yes | Works offline; AI later |
| Solitaire first play kernel | Yes | Proves skinnable playtest toy |
| All signature features | Commit to all | Category ownership |
| Knowledge-first anim beast | Yes | Offline secondary + cosmetics + audit; gen is gas only |
| Compendium living doc | Required | Single human + multi-AI continuity |

---

## 14. Message to future AIs (Brian + Grok leads)

You are not starting a new app. You are **continuing PixelPlane**.

1. Do not replace the infinite-plane metaphor with a conventional multi-page editor.  
2. Do not copy proprietary UIs from other products.  
3. Prefer plane-native UI (tips, dialogs, tools) over browser modals.  
4. Keep engine wiring honest — export must mean something.  
5. Animation Beast = encoded knowledge, not random gen.  
6. Update this compendium or you are incomplete.  
7. Brian’s taste: **vast, playful, commercial-grade, unique.**

---

*End of live compendium — update in place; never fork silent parallel docs without linking here.*

## 16. Shared plane doctrine

- **Co-op among people who choose each other** — family, friends, art teams. Not anonymous ranked play.
- Server only **signals** WebRTC; art traffic is peer-to-peer when possible.
- Canvas UI language (messages, tips) is the social layer — not browser chat popups.
- Layer branch = safe fork of work; deeper live co-paint is future CRDT work.
- Emotional product goal: a father in Colorado and a son in Arizona on the **same plane**, making things together.

## 17. Dual suite doctrine (Studio ↔ City Engine → full engine)

| Suite | Role |
|-------|------|
| **Studio** | Infinite plane — make / slice / wire / guides / shared collab assets |
| **City Engine** | **Birthplace of PixelPlane Engine** — play sandbox that grows module-by-module into a real engine |
| **Export wires** | Forever optional path out to Godot / Unity / Unreal / GameMaker / generic |

- Mechanics of open-world crime sandboxes are **not copyrighted** (ideas); expression is. We never ship Rockstar art or decompiled code.
- Study open reimpls (Carnage3D MIT, FreeCrime) for *architecture patterns only* → write fresh TypeScript. Same rule later for FPS (e.g. open raycast/Doom-style refs).
- Symbiosis path: Studio exports feed engine folders; engine requests art from plane (next: live pull tiles/vehicles from artboards).
- Camera language (current profile): **drive = wide city view**; **foot = close**; indoor = closer still.
- **Growth:** complete this profile as a **template blueprint** → clone for iso / 3-4 / other genres (see §1.2). Every feature must leave a clean seam for the next template.
- Org vision: multi-canvas teams + **central feed hubs** between art/anim/systems/env/QA planes.

---

## 18. (reserved)

## 19. Gemini execution stack (2026-08-04 — official · revised 2026-08-05)

> Spatial is default gravity; manual is exception. Camera beacons = navigation physics.

| Wave | Items |
|------|--------|
| **A Foundation (active)** | A2 Spatial scope v2 · A3 Private mask · **B3 Look-at-This** |
| **B Co-presence + scale** | B1 Shared reliability · **D_10x Interest management** · B2 Watch mode |
| **C Engine seriousness** | C1 Export map UI · C2 Quest+smash contract · **D_Scope nested priority** |
| **D Signature polish** | D1 Ghost viewport · D2 Reference orbit · C3 Anim Beast (deferred) |
| **Late sweep (not active)** | **A1 First Night** — one full guided-path pass after systems stabilize (Brian 2026-08-05). Scaffold may exist; do not polish/re-iterate per feature. |

**Status:** B3 + D_Scope + C2 live. A1 **deferred**. Next: A2/A3, D_10x, engine contracts, co-presence — not tour copy.


## 20. Novel systems backlog (seeded 2026-08-05)

| System | Status | Why it's rare / high leverage |
|--------|--------|--------------------------------|
| **Play Ghost** | Live | Playtest path becomes plane art — memory of the session |
| **Private / Witness / Focus masks** | Live | Spatial privacy + ADHD bubble + non-verbal observe |
| **D_10x interest chunks** | Live foundation | 10-person plane without melting net |
| **Spatial export map** | Live lite | See ZIP membership before export |
| **Resonance guides** | Idea | Same pixel-size assets magnet-snap when nearby |
| **Director timeline strip** | Idea | Scrub play ghosts + quest events as film strip on plane |
| **Faction memory web (engine)** | Idea | NPCs remember smash/wanted across sessions |
| **Live asset sockets** | Idea | Engine hot-reloads board when Studio edits wired region |
| **Chrono heat** | Idea | Where the team spent time this week — glow on plane |
| **Multi-canvas feed hub** | Idea | Team planes fan into a central wire hub |

