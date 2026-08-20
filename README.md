# PixelPlane

Infinite-canvas pixel studio that **is** a 2D game engine. Art, animation, interiors, systems, and Play live on one plane.

**Private safety backup** of Brian Moore + Grok Build’s engine.  
**Bible:** [`COMPENDIUM.md`](./COMPENDIUM.md) — read that to continue or rebuild. Do not start a new app.

## What this is

- **Studio** — infinite collage canvas (draw, slice, districts, wires, vault)
- **City Engine** — native runtime (top-down open world, interiors, smash, heat, lab walks)
- **Not** an export pipeline to Unity / Godot / Unreal

## Run

```bash
npm install
npm run dev
```

Listens on `0.0.0.0:8080`. `startup.sh` is the sandbox revive entry.

```bash
npm run typecheck
npm run build
scripts/safety-snapshot.sh   # typecheck + git commit
```

## Snapshot

- 2026-08-19 — Compendium v2 rebuild bible + full GitHub push
- 2026-08-16 — EngineHost, interiors, vault, lab walks
- 2026-08-13 — juice / wires / craft / audio beds
