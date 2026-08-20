/**
 * Engine module intake — how outside systems (other AIs, future districts) land.
 *
 * RULES FOR ANYONE ADDING A SYSTEM
 * --------------------------------
 * 1. You are a module. You are not sim.ts.
 * 2. Register once: registerEngineModule({ id, name, compile?, step?, draw? }).
 * 3. Never import Zustand stores from a step/draw function.
 *    Talk to EngineHost, or compile authoring into a runtime snapshot at Play.
 * 4. Do not add fields to EngineState unless your module owns them
 *    (prefer a Map on the module, keyed by play session).
 * 5. Visuals stay in draw() or indoor-draw / your own draw helper — not React state.
 * 6. The plane (canvas / studio) is the authoring surface. Play is the clock.
 *    Live wires push events in. The clock does not browse the desk.
 *
 * Drop a file in src/lib/city-engine/mods/<id>.ts and call registerEngineModule
 * from it, then import that file from CityEngineView (or a mods/index.ts barrel).
 *
 * FPS family: already programmed with Grok. When the source lands, it is a
 * module + perspective profile (`fps_raycast`, status authored). Do not fork
 * sim.ts. Do not invent a second runtime. Do not rewrite from Doom refs.
 */

import type { EngineHost } from "./host";
import type { EngineState } from "./sim";

export type PlayCompileContext = {
  host: EngineHost;
  state: EngineState;
};

export type EngineModule = {
  id: string;
  name: string;
  /** Once when Play starts. Compile vault / lab / cards / your desk into runtime. */
  compile?(ctx: PlayCompileContext): void;
  /** Every tick after core systems. Hitstop already applied by the orchestrator. */
  step?(s: EngineState, dt: number, host: EngineHost): void;
  /** Optional canvas pass after the world draw. */
  draw?(
    ctx: CanvasRenderingContext2D,
    s: EngineState,
    view: { w: number; h: number },
  ): void;
};

const registry: EngineModule[] = [];

export function registerEngineModule(mod: EngineModule): void {
  const i = registry.findIndex((m) => m.id === mod.id);
  if (i >= 0) registry[i] = mod;
  else registry.push(mod);
}

export function listEngineModules(): readonly EngineModule[] {
  return registry;
}

export function compileEngineModules(ctx: PlayCompileContext): void {
  for (const m of registry) {
    try {
      m.compile?.(ctx);
    } catch {
      /* a bad module must not kill Play */
    }
  }
}

export function stepEngineModules(s: EngineState, dt: number): void {
  for (const m of registry) {
    try {
      m.step?.(s, dt, s.host);
    } catch {
      /* */
    }
  }
}

export function drawEngineModules(
  ctx: CanvasRenderingContext2D,
  s: EngineState,
  view: { w: number; h: number },
): void {
  for (const m of registry) {
    try {
      m.draw?.(ctx, s, view);
    } catch {
      /* */
    }
  }
}
