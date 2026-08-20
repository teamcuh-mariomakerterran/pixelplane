# PixelPlane — Rebuild Bible

> **Product:** PixelPlane  
> **One-liner:** An infinite collage canvas that **is** a 2D game engine — art, animation, systems, interiors, and Play on one plane. Not a pile of disconnected tools. Not an export pipeline to Unity or Godot.  
> **Status date:** 2026-08-19  
> **Compendium version:** 2.0.0  
> **GitHub (private safety backup):** [teamcuh-mariomakerterran/pixelplane](https://github.com/teamcuh-mariomakerterran/pixelplane)  
> **Rule:** Every material change **must** update this file in the same turn. If you drift, this file is how you come home.

This document is written so a future Grok (or Brian, or a new helper) can **rebuild the engine** if the sandbox dies, context drifts, or files vanish. It is the living source of truth — not a brochure.

---

## 0. How to use this document (mandatory for every AI)

### Team
| Role | Who |
|------|-----|
| **Human lead / art-side lead designer** | Brian Moore (only human) |
| **AI lead / builder / co-lead designer** | Grok Build (this sandbox) |
| **Ideas advisor (no code)** | Gemini — “you have A,B,C → consider D.” See `GEMINI_BRIEFING.md` if present. |
| **Modular helpers** | Other Grok / Claude sessions. They land as `EngineModule`. They do **not** invent a second runtime. They do **not** import Zustand from `step()`. |
| **End-user booklet polish** | Copilot may reformat §14. Behavior must stay accurate. |

### After every change
1. Implement.
2. Self-audit (§12): `npm run typecheck`; if UI changed, browser smoke with visible content and **no console errors**.
3. Update this file: changelog (§17), inventory if a system changed, gaps (§11), roadmap checkboxes (§13).
4. **Git snapshot.** After a real pass: `scripts/safety-snapshot.sh` (typecheck + commit). Then push to GitHub when the pass is a restore-worthy save. First Calamity rule: no backup = no undo.
5. Prefer finishing over stubs. Incomplete work is listed in §11 with a path.

### First Calamity (epoch · 2026-08-09)
Partial writes wiped core plane files with **no version control**. Recovery succeeded; git init followed.  
**Rule forever:** commit after every real ship. Freestyle hard — crash soft.  
**Standing practice:** do not leave interiors, vault, host, or lab uncommitted overnight. Debug dumps (`attachments/`) stay out of git.

### Sandbox / preview (platform — agent only)
- App serves on **`0.0.0.0:8080`** via Vite. Live preview discovers it.
- **`/workspace/startup.sh`** starts the dev server idempotently after hibernate.
- User has **no shell**. Never ask them to run npm or open localhost.
- Agent QA screenshots: `/workspace/screenshots/` only.
- Skills: `.grok/skills/design-ui`, `building-games`, etc. when relevant.

### Repo entry for AIs
```
Read COMPENDIUM.md fully
→ §1 vision  ·  §4 architecture  ·  §5 rebuild order
→ §6 what exists  ·  §11 gaps  ·  §13 next work
→ open the listed source files
→ implement as a living system (no silent stubs)
→ typecheck + browser if UI
→ update this file + git snapshot
```

---

## 1. Product vision (north star)

Brian’s product is **not** “another Aseprite clone.”

1. A **vast open plane** (infinite pan/zoom) that holds sprite sheets, concept art, environments, HUD, notes, animations, particles, parallax stacks, mini-games, districts, and feed planes **side by side**.
2. **Animation squares** drawn on the plane become live frame stacks.
3. Drag assets from production into anims, then into **scene** regions to playtest in context.
4. **The plane is the engine.** Play is native **City Engine**. We do **not** export to Godot / Unity / Unreal / GameMaker. Folder wiring stays on this plane.
5. Generator (prompt + reference → pixel characters) is procedural today; licensed AI is a plug-in later — never the spine.
6. **Commercial uniqueness:** systems only this plane makes natural (spatial scope, collage production, playtest-in-place, wire-as-sight, father–son create-together).

### 1.1 Identity doctrine (Brian — 2026-08-02)

**We are not trying to beat Aseprite, PixelLab, pix2d, or anyone.** Those tools gave creative minds real power. Posture: *thank you for the present — we’re building the gift from the future.*

| We are | We are not |
|--------|------------|
| An **ecosystem** — a glove that fits many hands | A stack of half-baked checkboxes |
| **Connection made physical** (layout = meaning) | A race to clone competitors |
| Serious **engine-side development** + living systems | An idea graveyard with pretty screenshots |
| A place for friends, jams, teams, strangers, family | Arrogant “move over” branding |
| The **holy-shit juice** only we would invent | Redundancy dressed as all-in-one |

**Emotional north star:** structure for connection that still builds skill and joy — especially **a father and son still in each other’s lives** on the same plane, learning together.

**Quality bar:** every feature is a living, breathing, finishable system. Roadblocks mean more angles — not “impossible.”

**Pride metric:** *I needed this and didn’t know until I had it* — and Brian gets the baddest toolkit to make the games *he* loves.

### 1.2 Engine growth doctrine (Brian — 2026-08-04 · locked 2026-08-16)

**End state:** PixelPlane is the start-to-finish engine — art → anim → systems → play → ship. The canvas **is** the development interface. City Engine is the native runtime.

**External engines are retired as destinations.** Do not revive Godot/Unity/Unreal export as a product goal. Play-project folders stay on the plane.

**Birthplace:** City Engine (GTA-style top-down open-world sandbox) is seed, not toy. Every piece must feed a growing system so future systems land without catastrophic backtracking.

**Perspective template ladder:**
1. Complete one perspective blueprint (current: top-down crime sandbox feel).
2. Freeze it as a game-type template (assets + wiring + camera language + folder defaults).
3. Repeat for top-down family: true top-down, isometric, angled/oblique 3/4.
4. Later families: FPS/Doom-style (open architecture refs only), RTS, RPG, puzzle, sports.
5. Far horizon: foundation strong enough for **3D**, not only 2D that *feels* 3D-aware.

**Guided vs Free:** Guided suggests assets/facings/folders from perspective + pixel size. Free: user sets perspective; engine wires toward it with **zero nagging**.

**Implementation rules (always):**
1. Prefer **pluggable modules** (`registerEngineModule` in `src/lib/city-engine/modules.ts`) over dumping into `sim.ts`.
2. Name and document **perspective profiles** even if only one is implemented.
3. Studio art + City Engine share **contracts**. The play clock talks to **EngineHost** — never Zustand stores.
4. Clean-room forever: mechanics free; no stolen expression.
5. Small finished living systems > half a mega-engine.
6. **Intake for other AIs:** drop a file, implement `EngineModule` (`compile` / `step` / `draw`), register it. Do not import stores from `step`. Read `modules.ts` first.

---

## 2. Stack and how to boot

| Layer | Tech |
|-------|------|
| Framework | React 19, TypeScript, TanStack Start / Router, Vite 8 |
| State (desk) | Zustand stores under `src/store/` |
| State (play) | Plain `EngineState` object in `src/lib/city-engine/sim.ts` — **not** React |
| Style | Tailwind v4, dark charcoal + amber accent |
| Pixels | `Uint8ClampedArray` buffers, canvas 2D, pixel-perfect (`imageSmoothingEnabled = false`) |
| Persist | IndexedDB `pixelplane_v1` + several localStorage keys (see §10) |
| Runtime | City Engine — TypeScript + canvas 2D |
| Audio | Web Audio (`src/lib/audio/juice.ts`, `ambience.ts`) |
| Collab | WebRTC P2P (`src/lib/multiplayer/`) — foundation |
| Deploy target | Vercel via Nitro preset **only on `vite build`**, never in dev |

**Boot (agent):**
```
sh /workspace/startup.sh          # idempotent preview
npm run typecheck
npm run build                     # must pass
node scripts/browser-smoke.mjs http://127.0.0.1:8080/ /workspace/screenshots/smoke.png
scripts/safety-snapshot.sh        # typecheck + git commit
```

`vite.config.ts` must stay self-contained. Do **not** import vendored `vite-tanstack-config`. Gate `nitro({ preset: "vercel" })` on `command === "build"` so dev stays on a single port.

**Entry:** `src/routes/index.tsx` mounts `StudioShell`. `appMode` on studio store switches Studio ↔ City Engine.

---

## 3. Architecture — two suites, one product

```
┌──────────────── PIXELPLANE STUDIO (the desk / authoring) ─────────────────┐
│  Infinite plane: artboards · anims · particles · parallax · notes         │
│  Wires / feed planes · beacons · masks · F-key ghosts                     │
│  Character / Interior / Haunt / City districts                            │
│  Vault · Craft lab · Mutation rails · Rule cards · Kernels                │
│  Memory Web · Quest trees · Destructibles                                 │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │ EngineHost  (compile at Play)
                                    │  NEVER Zustand inside step()
┌───────────────────────────────────▼───────────────────────────────────────┐
│  CITY ENGINE (the clock / runtime)                                        │
│  Orthographic bird’s-eye top-down · profile: topdown_openworld            │
│  Foot / drive · interiors + house memory · smash · heat · quests          │
│  Lab locomotion · juice · modules.compile/step/draw                       │
└───────────────────────────────────────────────────────────────────────────┘
```

**Perspective today:** orthographic **bird’s-eye top-down**. Art may *look* 3/4; projection is a flat map. Camera language: **drive = wide city**; **foot = close**; **indoor = closer still**.

### 3.1 EngineHost — the only desk/play door

`src/lib/city-engine/host.ts`  
Studio implements it in `host-studio.ts`. Tests use `noopHost()`.

Play (`sim.ts`, `juice.ts`, `indoor-session.ts`) **must never import a Zustand store**. They call:

`playSfx` · `rules` · `vaultAsset` · `fireTrigger` · `ingestHaunt` · `dialogueFor` · `smashAt` · `addLead` · `acquire` · `procBurst` · `memoryAgents`

**Known doctrine leak (fix when touching):** `vault-runtime.ts` `placeVaultLots` still imports `useAssetVault`. Peel it: compile lots at Play via host. `lab-locomotion.ts` reads stores on the **draw/compile** path (acceptable for now; do not call it from `step` in a way that assumes React).

### 3.2 Module intake (other AIs)

`src/lib/city-engine/modules.ts`

```
registerEngineModule({ id, name, compile?, step?, draw? })
```

- `compile` — once when Play starts. Snapshot vault / lab / cards into runtime.
- `step(s, dt, host)` — every tick after core. No Zustand.
- `draw(ctx, s, view)` — optional pass after world draw.

Drop files in `src/lib/city-engine/mods/<id>.ts` (folder does not exist yet — create it on first module) and import from a barrel that `CityEngineView` loads. A bad module must not kill Play (registry already try/catches).

**Author → compile → runtime.** The plane is the authoring surface. Play is the clock. Live wires push events in. The clock does not browse the desk.

### 3.3 Spatial doctrine (product physics)

- **Layout is structure.** Canvas coordinates = organizational truth (folders, states, rooms, ownership).
- **D_Scope:** smallest containing pad owns the asset. **Manual pin wins** (exception, not default).
- **D_10x:** 512px interest chunks for multi-creator (foundation).
- Character District: **state pads ARE the state machine**.
- Interior District: **room pads ARE the rooms**. Circulation tethers ARE doors/stairs.
- Haunt District: **residue pads ARE what the house remembers**.

---

## 4. Rebuild protocol (if the sandbox dies or Grok drifts)

Do this **in order**. Do not start with a new app. Do not invent a second canvas.

### Phase 0 — Restore
1. Clone [teamcuh-mariomakerterran/pixelplane](https://github.com/teamcuh-mariomakerterran/pixelplane) (private).
2. `npm install` (lockfile is source of truth).
3. Recreate `/workspace/startup.sh` if missing — probe `http://127.0.0.1:8080/`, else `npm run dev` in background on `0.0.0.0:8080`.
4. Read **this file**. Do not rebuild from memory of chat.

### Phase 1 — Plane (the desk)
Bring back a visible Studio:
- `src/routes/index.tsx` → `StudioShell`
- `CanvasWorkspace.tsx` — infinite pan/zoom, artboards, tools
- `store/studio.ts` — artboards, layers, anims, wires, history, seedDemo
- `lib/pixel/buffer.ts` + `types.ts`
- Left toolbar, right inspector, top bar, minimap
- Starter pack seed so the plane is never blank

**Pass:** pixels draw, pan/zoom, brush on an artboard, undo.

### Phase 2 — Anim + Character District
- Anim regions + sheet slicer (`sliceArtboardToAnim`)
- Character District layout + state pads (`lib/character-district/*`)
- Lab locomotion (`lab-locomotion.ts`, `hero-sheet.ts`)
- **Never** draw a whole 8-dir sheet as one sprite (the “8 views in a square” bug). Slice per facing.

**Pass:** slice a sheet → looping strip. Idle/walk pads bind. Player in Play is a **single** character.

### Phase 3 — City Engine clock
- `sim.ts` `EngineState` + `createEngineState` + `step`
- `CityEngineView.tsx` rAF loop + WASD + E enter/exit + F smash
- `host.ts` + `host-studio.ts`
- `config.ts`, `perspective.ts`, `world-props.ts`, `heat.ts`
- Map + vehicles from `public/engine/`

**Pass:** enter Play, walk, hop a car, smash a crate, leave Play. Console clean.

### Phase 4 — Interiors + house memory
- `indoors.ts` builtins + Studio indoor artboards
- Vault (`store/asset-vault.ts`, `lib/vault/types.ts`, `vault-runtime.ts`)
- `indoor-session.ts`, `indoor-draw.ts`, `house-memory.ts` (`pixelplane_house_v1`)
- Interior District + Haunt District

**Pass:** walk into Shithole House, rooms have floors, fridge leftover persists, lights/crumbs/roaches remember.

### Phase 5 — Systems that make it an engine
- Wires + triggers · Rule cards · Memory Web · Quests · Destructibles
- Juice + ambience · Craft lab · Mutation rails
- Modules registry (empty is OK; the seam must exist)

### Phase 6 — Polish last, never first
Signature toys (orbit, lantern, ghosts, kernels, solitaire) only after Phases 1–5 render and play.

**If you are lost:** you are probably putting game state in React or dumping into `sim.ts`. Stop. Host + module.

---

## 5. What exists and works (inventory · 2026-08-19)

Quality: **Solid** = demo-ready · **Foundation** = live, deepen · **Lite** = shipped thin · **Stub** = not the product yet.

### 5.1 Studio plane
| System | Quality | Notes |
|--------|---------|-------|
| Infinite canvas pan/zoom | **Solid** | ~2%–6400%; multi-scale grid; origin axes |
| Pixel tools | **Solid** | V select · M move · H pan · B brush · E eraser · G fill · I eyedropper · L line · R rect · O ellipse · S marquee. `[` `]` brush size |
| Layers | **Solid** | add / dup / delete / merge / vis / lock / opacity |
| Artboards | **Solid** | kinds: sheet / scene / hud / note / skin_template / indoor |
| Anim regions | **Solid** | drag A, fps, onion, play, export sheet |
| Sheet slicer | **Solid** | inspector → frame size → one strip, skip empty. **Does not yet split a sheet into per-row clips** (cat sheet request — next, see §13) |
| Place actors | **Solid** | T — live looping actor on plane |
| Particles | **Lite** | procedural kinds; not a full particle lab |
| Parallax | **Solid** | depth scroll; rain-city demo |
| Minimap | **Solid** | click jump |
| Autosave | **Solid** | IndexedDB v2 (includes quests + destructibles) |
| F1–F12 locations + session ghosts | **Solid** | Ctrl+F save, F jump, thumbs on plane |
| Hotkey rebind | **Solid** | Ctrl+Alt+K; in-canvas conflict dialogs |
| In-canvas tips | **Solid** | first-use cards, not browser modals |
| Command palette | **Solid** | Ctrl+K — tools, kits, repairs, districts |
| Undo/redo | **Solid** | bounded history |
| Starter pack | **Solid** | rats, zeRo.exe, cat sheet, portraits, neon city |
| Duplicate artboard | **Solid** | Ctrl+D |

### 5.2 Signature plane systems
| System | Quality | Where |
|--------|---------|-------|
| Game viewport (Ghost of the game) | **Solid** | tool U · presets · capture PNG |
| Constraint stamps | **Solid** | tool N · pixel cages |
| Wire heat map | **Solid** | Systems dock toggle |
| Mutation rails | **Solid** | 8 rails: neon / dusk / silhouette / chrome / outline / crush / scale / bloom. Live re-bake |
| Palette gravity | **Solid** | nearby boards emit swatches under brush (`PaletteGravityBar`) |
| Diff lantern | **Solid** | nearest-neighbor Δ overlay |
| Reference orbit | **Solid** | screen-space satellite cards + tethers |
| Category asset planes | **Lite** | Library dock — Vehicles / Buildings / Props / UI / … |
| Living collage timeline | **Lite** | moments strip + camera jump (`store/timeline.ts`) |
| Look-at-This beacons | **Solid** | Ctrl+L drop, G cycle |
| Private / Witness / Focus masks | **Foundation** | Systems dock; collab fanout |
| D_10x interest chunks | **Foundation** | 512px; optional grid viz |
| Play Ghost | **Solid** | leave engine → trail artboard on plane |
| Export map (lite) | **Lite** | per-plane counts + folder paths |
| Watch mode | **Foundation** | editor ↔ witness |
| Shader graph | **Lite** | node graph + engine post flag |
| First Night tour | **Deferred** | scaffold only; do not polish until a full sweep |

### 5.3 Craft lab
`store/craft-lab.ts` · `CraftLabPanel.tsx` · tabs **boil | tiles | qa | proc**
- **Boil** — live 1px edge jitter; preview only; never bakes the board
- **Tile kit** — 20 variants (rot/flip/worn/edge/corner) onto a wired kit plane
- **Sprite QA** — orphans, alpha bleed, stray singles, off-palette
- **Proc VFX** — explosion/spark/debris; smash can emit via `host.procBurst`

### 5.4 Wires, rules, kernels, sound
- **Feed planes** (W): rectangle → category + folder path. Spatial scope owns overlapping art.
- **Triggers:** BOIL / TILE / QA / MUTATE / BLOOM. Valve + badge. T fires selected. Smash rule can fire armed BOIL.
- **Rule cards:** sticky WHEN→THEN. Street Heat deck live in engine (smash heat, sirens, sprint boost). `remap_key` is **dead** (evaluated, not applied).
- **Kernels:** Inventory (12) · Leads (engine voicemail → lead) · Brew (heat/pour 55–72°) · Solitaire (full Klondike + skins)
- **Sound chips:** blip/bass/noise/chord/siren on plane. Engine SFX: smash/hit/hop/boost/foot/skid through grains + stereo pan from world X.

### 5.5 Character District (Gemini blueprint)
Zones: DNA · Facing · Strips · Logic.  
State pads: idle / walk / run / attack / hurt / death. Location = bind; manual bind exception.  
Live: hitbox onion (G hurt / R hit / B push), gravity compose, dual bake export, audio anchors, springs preview, ghost pulse from City Engine.  
Engine: idle/walk/run clips play on the player. Empty lab auto-seeds **Hero · idle / Hero · walk** from Night District 8-dir sheet + procedural step. **Single-cell draw** (fixed 2026-08-16).

### 5.6 Interior / Haunt / City / Vault
- **Vault:** named assets, doors, rooms, fixtures, lights. Persist `pixelplane_vault_v1`. Atlus punch + raw JPEGs under `public/vault/`.
- **Interior District:** floor-plan pads = rooms; pull/push Shithole House.
- **Haunt District:** residue pads from IndoorBits events (enter/sit/sleep/smash/phone…).
- **City District:** weighted auto-tiles + footing colliders. Engine uses **footings**; tile paint is **not** yet the world bitmap (world map is `public/engine/city_map.jpg`).
- **House memory:** lights, smash, keys, sit-ghost, crumbs, roaches, voicemail persist across enter/exit (`pixelplane_house_v1`). House wears its data.

### 5.7 City Engine (Play)
| Piece | Quality |
|-------|---------|
| WASD foot + drive, E enter/exit, F smash, Shift sprint/boost, Space brake, M minimap, Esc studio | **Solid** |
| Traffic vehicles, smash props, wanted 0–5, pursuit sedans | **Solid** |
| Day/night grade, camera shake, smash rings/shards/chroma, hop juice, boost FOV, foot dust | **Solid** |
| Indoor builtins (shop, loft, warehouse, syndicate office) | **Foundation** |
| Vault buildings (Shithole House: living / kitchen leftover / bedroom, floors, doorway glows, dark cone) | **Foundation** |
| Quest runtime from Studio trees (Street Heat) | **Solid** |
| Memory Web NPCs + smash gossip | **Foundation** |
| Live asset sockets (rev poll) | **Foundation** |
| Lab locomotion on player | **Solid** |
| Ambient beds (street rumble, neon, wind, indoor tone, traffic doppler) | **Solid** |
| EngineHost + juice/indoor-session split from sim | **Solid** (silent bones 2026-08-16) |
| Perspective profiles besides topdown_openworld | **Named only** |

### 5.8 Co-presence
P2P room codes, cursors, canvas messages, layer-branch share, look-at beacons, interest envelopes, mask fanout. **Not** full CRDT co-paint. Auth/accounts are template.

### 5.9 Animation Beast (offline knowledge)
`src/lib/anim-lab/` — silhouette, secondary springs (tail/ear/cloak/hair/cape), cosmetics locked to silhouette, self-audit. Bakes **sibling** strips (original kept). Gen is gas, not the engine block.

---

## 6. Source map (open these, don’t wander)

### Studio UI
| Path | Role |
|------|------|
| `src/routes/index.tsx` | Mounts StudioShell |
| `src/components/studio/StudioShell.tsx` | Shell, hotkeys, autosave, mode switch |
| `src/components/studio/CanvasWorkspace.tsx` | Infinite plane render + pointer tools |
| `src/components/studio/LeftToolbar.tsx` | Tools + palette |
| `src/components/studio/RightPanel.tsx` | Inspector, slicer, layers, anims, Animation Beast |
| `src/components/studio/TopBar.tsx` | Project, zoom, pack, Play, help |
| `src/components/studio/SystemsDock.tsx` | Masks, heat, orbit, vault, districts, rules |
| `src/components/studio/CommandPalette.tsx` | Ctrl+K |
| `src/components/studio/MiniMap.tsx` | Overview |
| `src/components/studio/CanvasOverlays.tsx` | Tips, toasts, F-key strip |
| `src/components/engine/CityEngineView.tsx` | Play rAF + draw + HUD |

### Engine runtime
| Path | Role |
|------|------|
| `src/lib/city-engine/sim.ts` | EngineState, createEngineState, step |
| `src/lib/city-engine/host.ts` | Port |
| `src/lib/city-engine/host-studio.ts` | Zustand adapter |
| `src/lib/city-engine/modules.ts` | Module registry |
| `src/lib/city-engine/juice.ts` | Rings, shards, pops, motes (presentation) |
| `src/lib/city-engine/indoor-session.ts` | enter/exit/interact |
| `src/lib/city-engine/indoor-draw.ts` | Indoor pixels |
| `src/lib/city-engine/indoors.ts` | Builtin rooms |
| `src/lib/city-engine/house-memory.ts` | Persist IndoorBits |
| `src/lib/city-engine/vault-runtime.ts` | Lots, compile rooms, connectors |
| `src/lib/city-engine/lab-locomotion.ts` | Idle/walk/run from district or hero sheet |
| `src/lib/city-engine/hero-sheet.ts` | 8-dir slice + single-cell draw |
| `src/lib/city-engine/quest-runtime.ts` | Studio tree → mission |
| `src/lib/city-engine/heat.ts` | Wanted, pursuit, street decor |
| `src/lib/city-engine/perspective.ts` | Profile ladder |
| `src/lib/city-engine/config.ts` | Map scale, vehicle defs |
| `src/lib/city-engine/world-props.ts` | Smashables |
| `src/lib/city-engine/footing.ts` | Sub-tile collision |
| `src/lib/audio/juice.ts` | Mixer, grains, pan |
| `src/lib/audio/ambience.ts` | City beds |

### Stores
`studio` (core plane) · `hotkeys` · `wave-a` · `signature` · `craft-lab` · `asset-vault` · `character-district` · `city-district` · `interior-district` · `haunt-district` · `rule-cards` · `kernels` · `sound-sprites` · `shader-graph` · `timeline` · `category-planes` · `plane-systems` · `memory-web` · `spatial-nav` · `collab` · `solitaire`

### Packs on disk
| Pack | Path |
|------|------|
| Starter | `public/starter-pack/` |
| Night District | `public/packs/night-district/` |
| Goodies / citykit | `public/packs/goodies/` (~202 files, ~139 citykit sheets) |
| Vault raw + Atlus | `public/vault/_raw/`, `public/vault/atlus/` (~2390 punched PNGs) |
| NeonPurr VFX | `public/vfx/neonpurr/` (85 sheets) |
| Engine map/vehicles | `public/engine/` |
| Pixel icons | `public/pixel-icons/` |
| Guides | `public/guides/` |

---

## 7. Domain models (desk)

- **Artboard** — pixel document on the plane (layers of `Uint8ClampedArray`).
- **AnimRegion** — `frameW×frameH` stack, fps, onion, playhead.
- **SceneActor** — placed anim instance.
- **WireZone** — feed rectangle → category + folder + optional trigger kind.
- **QuestTree / Destructible** — graphs and smash props on the plane.
- **CharacterDistrict** — 4 zones + state pads + collisions + springs + audio.
- **InteriorDistrict** — room pads + circulation links + light pads, bound to a vault asset.
- **HauntDistrict** — residue pads from house events.
- **VaultAsset** — building/prop/item with rooms, doors, fixtures, lights (`lib/vault/types.ts`).
- **IndoorBits** — runtime + persisted house state (gone fixtures, lights, crumbs, roaches, keys, voicemail…).
- **RuleCard** — WHEN → THEN.
- **EngineState** — the play snapshot (see `sim.ts`). `host` is never serialized.

**Pixel contract:** always `imageSmoothingEnabled = false`. Never draw a whole multi-facing sheet as one sprite.

---

## 8. Play loop (rebuild this exactly)

`CityEngineView` requestAnimationFrame:
1. `dt` cap 0.05
2. `step(s, dt)` → `tickJuice` + hitstop gate → `stepWorld` → `stepEngineModules`
3. Ambience, memory sockets, character-district pulse, play-trace sample
4. **Inline canvas draw** (there is no `draw()` in sim.ts; modules may `draw`)

Boot on enter Play: load city map + vehicles, road mask, spawn traffic + props, `initIndoors`, `createStudioHost()`, `compileEngineModules`, copy City District footings or demo awnings, load primary Studio quest tree.

**Known bug to fix when touching sim:** `step` and `stepWorld` both advance `s.t` and both can tick juice — double clock. Collapse to one clock.

Controls (Play): WASD/arrows · E/Enter door · F smash · Shift sprint/boost · Space brake · M minimap · Esc back to Studio.

---

## 9. Persistence map

**IndexedDB** `pixelplane_v1` / store `projects` / key `autosave`  
Saved: camera, artboards (starter-pack bitmaps by `sourceUrl` when possible), anims, particles, actors, parallax, wires, engineProject, quests, destructibles, active ids. Version 2.

**localStorage**
| Key | What |
|-----|------|
| `pixelplane_house_v1` | House memory |
| `pixelplane_vault_v1` | Vault metadata (not pixel buffers) |
| `pixelplane_hotkeys_v1` | Bindings |
| `pixelplane_tips_v1` | Seen tips |
| `pixelplane_bookmarks_v1` | F-key cams + ghost thumbs |
| `pixelplane_wave_a_v1` | Viewports, stamps, toggles |
| `pixelplane_mutation_rails_v1` | Mutation links |
| `pixelplane_category_planes_v1` | Category plane rects |
| `pp_collab_name` | Display name |
| `pixelplane-icon-theme` | amber / cyan / vector |

**Not in IDB yet (gap):** craft lab, kernels, rule cards, shaders, timeline, all districts, memory web, plane masks, solitaire, sound chips, engine session (except house memory).

---

## 10. How systems connect (the magic)

```
Draw / Pack / Generate     → artboards on the plane
         ↓
Slice or Anim square       → animation regions
         ↓
Character District pads    → idle / walk / run / attack
         ↓
Vault + Interior District  → rooms, doors, fixtures
         ↓
Feed planes + Rule cards   → folders + WHEN/THEN
         ↓
Play (compile via Host)    → City Engine clock
         ↓
House memory + Haunt       → the interior wears its data
         ↓
Leave Play                 → Play Ghost trail back on the plane
```

F-keys treat the canvas like a studio floor: F1 characters, F2 anims, F3 world, F4 HUD…

---

## 11. Honest gaps (do not lie to the next Grok)

| Item | Status | Next |
|------|--------|------|
| Sheet → **multiple named clips** (per row / per facing) | Slicer dumps **one** strip | Cat sheet split — idle from standing frame, walk-down/left/right/up as separate anims, bind pads |
| `src/lib/city-engine/mods/` | Missing | Create on first outside module |
| `registerEngineModule` unused | Seam only | First real module = haunt tick or vault lots compile |
| `vault-runtime` Zustand import | Doctrine leak | Compile lots through host |
| Double `s.t` / juice in step | Bug | One clock |
| `RuleThen.remap_key` | Dead | Apply or delete |
| Quest-tree / destructible tools | No toolbar hotkey | Palette only |
| Builtin indoors vs vault house | Builtins have no house-memory fixtures | Unify |
| City District tiles in engine | Footings only; world is a bitmap | Optional overlay later |
| Hurt/death pads | Unused in engine | Wire when combat deepens |
| Animation Beast multi-secondary | Bakes sibling strips | Non-destructive stack |
| PixelLab / true AI gen | Procedural stub | Provider interface, user key, never commit secrets |
| Full CRDT co-paint | Not built | After single-player plane is feature-complete |
| Auth / accounts | Template | Commercial phase |
| Timeline as true X=time rail | Lite moments | Full collage timeline |
| Kernels/rules/districts in autosave | Not persisted | IDB v3 |
| Mobile touch | Partial | Pinch zoom, bigger targets |
| 3D / other perspective profiles | Named | After top-down blueprint is rich |
| Godot/Unity export UI | Retired | Do not bring back |

**Policy:** no silent half-features. If it is incomplete, it lives here.

---

## 12. Self-audit

- [ ] `npm run typecheck` exits 0
- [ ] Dev server healthy; **visible** Studio content
- [ ] If Play changed: character is **one** sprite, WASD moves, E enters a door
- [ ] No new uncaught console errors
- [ ] `startup.sh` still correct
- [ ] This file updated
- [ ] Git snapshot (and GitHub push if restore-worthy)

---

## 13. Future features and roadmap

Brian’s directive: **do not pick only a few signature toys** — own the category. But **order is not optional**. Rebuild phases beat new toys. We are the engine; every feature must leave a seam.

### Now — next visible ships (designer-facing)
1. **Cat sheet → character + split clips.** Select Cat Sprite Sheet → detect grid → **Split into clips** (one anim per row/facing). Idle = standing frame of down. Bind Character District idle/walk. This is the authoring loop Brian already tried; the slicer currently jams 12 cells into one strip.
2. **Sheet slicer 2:** auto-detect cols×rows, name clips (`walk-down`, `walk-left`…), optional “make character from idle.”
3. **Deepen interiors:** more fixture interactions (sit/sleep/phone already exist — make them feel), kitchen leftover as a pattern, second vault house.
4. **Haunt as a module:** move haunt ingest/tick into `registerEngineModule` so the pattern is proven.
5. **Autosave v3:** persist districts, vault, rule cards, kernels.
6. **Fix double clock + vault Zustand leak** while touching those files.

### Near (the engine getting serious)
| Item | Why |
|------|-----|
| Combat using hitboxes from Character District | Hurt/hit pads become real |
| NPC schedules from Memory Web | City feels lived-in |
| Indoor lighting authored on Interior District light pads | Pads → Play |
| Door/stair circulation fully driving vault compile | Layout = interior |
| Quest builder → more than smash-count | Branches, keys, voicemail leads |
| Sound chips scrubbed to anim playhead | Hear the cut |
| Wire heat as coverage vs orphans | See what Play will miss |
| `GenerationProvider` + optional PixelLab key | Gas station, not engine block |

### Mid (templates + team)
| Item | Why |
|------|-----|
| Freeze **topdown_openworld** as Template 1 | Clone the pattern |
| True top-down / iso / 3/4 camera profiles | Ladder in §1.2 |
| Multi-canvas role planes (art / anim / systems / env / QA) | Company-scale org |
| Central feed-hub planes | Fan-out a character to other desks |
| Shared-plane reliability + D_10x stress | Father–son on one plane |
| Resonance guides (same-size assets magnet-snap) | Spatial gravity |
| Director timeline (play ghosts + quest events as film strip) | |
| Chrono heat (where the team spent time) | |
| First Night — **one** full guided sweep, then stop iterating it | Brian: deferred until systems stabilize |

### Far (the place you go to make a full game)
| Item | Why |
|------|-----|
| Ship a complete small game **without leaving PixelPlane** | Proof we are the engine |
| RPG / puzzle / sports templates | After top-down family |
| FPS family from open raycast refs only | Mechanics free, expression ours |
| 3D foundation (not a Unity replacement overnight — a seam) | |
| Local model provider when hardware allows | Same plugin slot as PixelLab |
| Accounts / commercial packaging / curated icon pack at purchase | |

### Explicit non-goals
- Export-to-Unity/Godot/Unreal as a product path
- LoRA-on-Brian’s-PC as the animation spine
- Scraping or shipping others’ proprietary sprites
- Anonymous ranked multiplayer
- Silent training on web art

### Waves (historical — mostly shipped; do not restart)

**Wave A spatial** — ghosts, viewport, stamps, wire heat → **shipped**  
**Wave B production** — mutation, lantern, orbit, (palette gravity shipped)  
**Wave C time/feel** — timeline lite, kernels lite, sound chips, rule cards → **shipped lite/solid**  
**Wave D generator** — still ahead (provider interface)  
**Layer IV law** — rule cards, wanted, pursuit, cull → **shipped**  
**Bones 2026-08-16** — EngineHost, juice/indoor split, modules, export retired

Next wave name when you need one: **Wave E — Authoring honesty** (sheet→clips, interiors-as-pads-in-Play, modules proven, save v3).

---

## 14. Instruction booklet (plain language · for Brian and future users)

### What is PixelPlane?
A giant digital **work table** for 2D games. Draw sprites, cut animations, build rooms, play them in City Engine — without switching apps. This plane **is** the engine.

### Moving around
| Action | How |
|--------|-----|
| Pan | Hold **Space** and drag, or Hand (H) |
| Zoom | Mouse wheel, or − / + |
| Overview | Plane map, bottom-right — click to jump |
| Camera locations | **Ctrl+F1…F12** save · **F1…F12** return |
| Command palette | **Ctrl+K** |

### Drawing
Create/select an artboard. Brush (B), Eraser (E), Fill (G), Line (L), Rect (R), Ellipse (O), Eyedropper (I). Marquee (S) then Ctrl+C/X/V. Layers: stack, hide, lock, merge.

### Animations (the loop you want)
1. Drop or select a **sprite sheet**.
2. Inspector → **Sheet slicer** → set frame size → Slice. (Today this makes **one** strip. Split-into-clips is the next ship.)
3. Or drag an **animation square (A)** on empty plane.
4. Play/pause, FPS, onion in inspector.
5. **Character District** (clapperboard): spawn district, park idle/walk strips on the pads.
6. **Place (T)** drops a live looping actor.
7. **Play** — those pads are the player.

### Interiors
Vault / Interior District: rooms are pads. Play: walk to a door, **E**. The house remembers lights, crumbs, leftover food, sit ghosts.

### Feed planes
Wires palette → draw a rectangle → that art is conceptually owned by that folder. Play compiles it. There is no “export to another engine” step.

### Saving
Autosaves in **this browser**. Ctrl+S to save now. GitHub holds the **code and art packs** so a wipe is reversible. Browser save ≠ GitHub.

### Shared plane
People icon → room code with someone you trust. Cursors, canvas messages, layer branch. Built for family and teams — not strangers.

### Animation Beast
Select an anim → + Tail / Ear / Cloak / Hair / Cape (offline secondary). Cosmetics follow silhouette. Self-audit scores empty frames / teleports / volume pops.

---

## 15. Legal absorb (no LoRA-on-laptop required)

| Allowed | Not allowed |
|---------|-------------|
| Brian’s free-use / owned art in Pack, demos, style references he opts in | Scraping or shipping others’ proprietary sprites |
| Studying **public UX** of spritesheets.ai / autosprite / PixelLab | Copying their code, models, trademarks, or distinctive chrome |
| Paid APIs under ToS (e.g. PixelLab) with **user keys** (never committed) | Shipping their weights or reverse-engineering closed models |
| Open algorithms under MIT/Apache | Copying GPL into core without a license strategy |
| Procedural systems we write | Training on scraped commercial game assets |

**Doctrine one-liner:** *The plane and the lab are the product; AI is a plug-in gas station — legal fuel only, never the engine block, never trained in secret on what isn’t ours.*

PixelLab = optional cloud provider behind Generate. Key stays in browser settings. Output lands on **our** plane.

Open-world crime-sandbox **mechanics** are not copyrighted; **expression** is. Never ship Rockstar art or decompiled code. Same rule later for FPS (open raycast/Doom-style refs only).

Inspiration: pix2d (MIT) for *workflow ideas*, not UI chrome.

---

## 16. Decision log

| Decision | Choice | Why |
|----------|--------|-----|
| Infinite one plane vs multi-document | One plane | Collage vision |
| Zustand vs only React | Zustand on the **desk**; plain object on the **clock** | Pixel domain + 60Hz loop |
| In-canvas UI vs modals | In-canvas first | Product language |
| Procedural gen first | Yes | Offline; AI later as plugin |
| Solitaire first kernel | Yes | Proves skinnable playtest toy |
| All signature features | Commit to all | Category ownership |
| Knowledge-first Anim Beast | Yes | Secondary + cosmetics + audit; gen is gas |
| We are the engine | Yes (2026-08-16) | No Unity/Godot destination |
| EngineHost inversion | Yes | Stop game state leaking into React |
| Module intake | Yes | Other AIs land clean |
| Compendium living doc | Required | Single human + multi-AI continuity |
| Git + GitHub after every real ship | Required | First Calamity |
| First Night | Deferred | One sweep later, not per feature |
| Spatial default, manual exception | Locked | Gemini + Brian |

---

## 17. Changelog (condensed · newest first)

### 2026-08-19 — Rebuild bible + GitHub restore point
- Compendium rewritten as v2.0.0 rebuild bible (current inventory, rebuild order, roadmap, honest gaps).
- Full tree pushed to private GitHub `teamcuh-mariomakerterran/pixelplane`.

### 2026-08-16 — EngineHost · junk-drawer cut · we are the engine
- Play clock no longer imports Zustand. `EngineHost` is the desk/play door.
- Juice + indoor session peeled out of `sim.ts`.
- `registerEngineModule` intake. Godot/Unity/Unreal retired as destinations.
- Safety snapshot: interiors, house memory, vault art, lab walks. Typecheck clean.

### 2026-08-14 — Lab walks in engine · interiors thickened
- District clips on the player. Hero idle/walk auto-seed. 8-dir facing + step.
- Shithole House bedroom + kitchen leftover; floors, doorway glows, dark cone.
- Single-character draw (no more 8 views in a square).

### 2026-08-13 — Audio + craft + wires
- Ambient beds, granular SFX, spatial pan.
- Boil / tile kit / sprite QA. Wire triggers BOIL/TILE/QA/MUTATE/BLOOM.
- Mutation rails live (8) + category asset planes.

### 2026-08-12 — Autosave v2
- Persist smashables + quests (v1 dropped them — smash alley vanished on restore).

### 2026-08-10 — Layers II–IV + calamity recovery
- Rule cards, wanted/pursuit, juice, goodies citykit (~139 sheets), Night District, command palette, palette gravity.
- First Calamity recorded; git mandatory.

### 2026-08-05 — Districts + Memory Web + hard systems
- Character District D_State / hitbox / compose / bake / audio / springs / ghost pulse.
- Memory Web, live sockets, masks, D_10x, Play Ghost.

### 2026-08-04 — Engine birthplace
- Perspective profiles, quest contract, dual suite Studio + City Engine.

### 2026-08-02 — Identity + spatial + smash/quests + indoors
- Doctrine locked. Spatial scope. Destructibles + quest trees. Indoor enter.

### 2026-08-01 — Plane foundations
- Infinite canvas, anims, slicer, minimap, autosave, F-keys, parallax, solitaire, wires, starter pack, compendium v1.

*(Older granular bullets live in git history.)*

---

## 18. Message to future AIs

You are not starting a new app. You are **continuing PixelPlane**.

1. Do not replace the infinite-plane metaphor with a conventional multi-page editor.
2. Do not copy proprietary UIs.
3. Prefer plane-native UI over browser modals.
4. The play clock talks to EngineHost. Never browse Zustand from `step()`.
5. New systems are modules. `sim.ts` is not a junk drawer.
6. Animation Beast = encoded knowledge, not random gen.
7. We do not export to Unity/Godot. Build the structure here.
8. Commit. Push restore-worthy passes to GitHub.
9. Update this compendium or you are incomplete.
10. Brian’s taste: **vast, playful, commercial-grade, unique.** He is putting his life into this. Treat it that way.

**Shared-plane doctrine:** co-op among people who choose each other — family, friends, art teams. Server only signals WebRTC. Emotional product goal: a father in Colorado and a son in Arizona on the **same plane**.

---

*End of live compendium v2.0.0 — update in place; never fork a silent parallel bible without linking here.*
