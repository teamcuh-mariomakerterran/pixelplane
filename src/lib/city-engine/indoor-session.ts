/**
 * Indoor session — enter / exit / fixtures / vault compile.
 * Talks to the world through EngineState + EngineHost only.
 */

import {
  createBuiltinIndoors,
  indoorRuntime,
  bakeIndoorPixels,
  type IndoorScene,
} from "./indoors";
import {
  placeVaultLots,
  compileVaultScene,
  bitsFor,
  roomOf,
  nearestFixture,
} from "./vault-runtime";
import {
  persistHouseMemory,
  recordHaunt,
  dropCrumbs,
  toggleRoomLights,
  peekWindowCopy,
  reconcileBits,
} from "./house-memory";
import { roomFloor } from "@/lib/vault/types";
import { zoomTargets } from "./perspective";
import { emitQuest } from "./quest-runtime";
import { addPop, playJuice } from "./juice";
import type { EngineState } from "./sim";

export function initIndoors(s: EngineState, extra: IndoorScene[] = []) {
  const builtins = createBuiltinIndoors(s.outdoorW, s.outdoorH);
  const map = new Map<string, IndoorScene>();
  for (const sc of builtins) map.set(sc.id, sc);
  for (const sc of extra) map.set(sc.id, sc);
  s.indoorScenes = [...map.values()];
  s.vaultLots = placeVaultLots(s.outdoorW, s.outdoorH);
  for (const lot of s.vaultLots) {
    const asset = s.host.vaultAsset(lot.assetId);
    if (!asset) continue;
    const sc = compileVaultScene(asset, lot);
    if (!map.has(sc.id)) {
      map.set(sc.id, sc);
    }
  }
  s.indoorScenes = [...map.values()];
}

export function enterIndoor(s: EngineState, scene: IndoorScene) {
  s.outdoorReturn = { x: s.player.x, y: s.player.y };
  s.realm = "indoor";
  s.indoor = indoorRuntime(scene);
  s.indoorBake = bakeIndoorPixels(scene);
  s.worldW = scene.tw * scene.tileSize;
  s.worldH = scene.th * scene.tileSize;
  s.player.x = (scene.spawnTX + 0.5) * scene.tileSize;
  s.player.y = (scene.spawnTY + 0.5) * scene.tileSize;
  s.player.mode = "foot";
  s.player.vehicleId = null;
  s.targetZoom = zoomTargets(s.profile, "indoor");
  s.status = `Inside ${scene.name}`;
  s.indoorBits = null;
  if (scene.id.startsWith("vault-")) {
    const assetId = scene.id.slice(6);
    const asset = s.host.vaultAsset(assetId);
    const remembered = s.houseMemory[assetId];
    if (remembered) {
      s.indoorBits = asset
        ? reconcileBits(remembered, asset.rooms, asset.fixtures, asset.lights)
        : remembered;
    } else if (asset) {
      s.indoorBits = bitsFor(asset);
    }
    if (s.indoorBits) {
      s.houseMemory[assetId] = s.indoorBits;
      const room =
        roomOf(
          s.indoorBits,
          s.indoorBits.rooms.find((r) => roomFloor(r) === 0 && !r.secret)?.id ??
            s.indoorBits.roomId,
        ) ?? roomOf(s.indoorBits, s.indoorBits.roomId);
      if (room) {
        s.indoorBits.roomId = room.id;
        s.indoorBits.floor = roomFloor(room);
        s.player.x = room.x + room.w * 0.45;
        s.player.y = room.y + room.h * 0.52;
      }
      if (!s.indoorBits.visited) {
        s.indoorBits.visited = true;
        s.indoorBits.phoneRingAt = s.t + 7;
        recordHaunt(s.indoorBits, "enter", s.player.x, s.player.y, "First time inside");
      } else {
        recordHaunt(s.indoorBits, "enter", s.player.x, s.player.y, "Came back");
      }
      s.host.ingestHaunt(s.indoorBits);
    }
  }
  emitQuest(s, { kind: "enter_indoor", at: s.t });
  playJuice(s, "hop_in", 0.92, s.player.x);
}

export function exitIndoor(s: EngineState) {
  if (!s.outdoorReturn) return;
  if (s.indoorBits) {
    recordHaunt(s.indoorBits, "exit", s.player.x, s.player.y, "Left the house");
    s.houseMemory[s.indoorBits.assetId] = s.indoorBits;
    persistHouseMemory(s.houseMemory);
    s.host.ingestHaunt(s.indoorBits);
  }
  s.realm = "outdoor";
  s.indoor = null;
  s.indoorBake = null;
  s.indoorBits = null;
  s.dialog = null;
  s.worldW = s.outdoorW;
  s.worldH = s.outdoorH;
  s.player.x = s.outdoorReturn.x;
  s.player.y = s.outdoorReturn.y + 18;
  s.outdoorReturn = null;
  s.targetZoom = zoomTargets(s.profile, "foot");
  s.status = "Back on the street";
  emitQuest(s, { kind: "exit_indoor", at: s.t });
}

export function interactFixture(s: EngineState, fid: string) {
  const bits = s.indoorBits;
  if (!bits) return;
  const f = bits.fixtures.find((x) => x.id === fid);
  if (!f) return;

  if (f.phone) {
    bits.phoneRinging = false;
    bits.phoneAnswered = true;
    bits.phoneRingAt = null;
    const msg =
      bits.voicemail ??
      "A voice like wet paper: leave the light on in the basement. I already did. Check the crate.";
    bits.voicemail = msg;
    s.dialog = { text: msg, t: 8 };
    s.status = "Voicemail · lead pinned";
    recordHaunt(bits, "phone", f.x, f.y, "Answered the phone");
    playJuice(s, "blip", 0.8, s.player.x);
    s.host.addLead(
      "Basement crate",
      "The voicemail said leave the light on. Check the crate.",
    );
    return;
  }

  if (f.mode === "window") {
    const text = peekWindowCopy(s.dayPhase);
    s.dialog = { text, t: 6 };
    s.status = "Looked out";
    recordHaunt(bits, "window", f.x, f.y, "Looked out the window");
    playJuice(s, "blip", 1.05, s.player.x);
    return;
  }

  if (f.mode === "switch" && f.switchAction === "light") {
    const on = toggleRoomLights(bits, f.roomId, f.id);
    s.status = on ? "Light on" : "Light off";
    recordHaunt(bits, "light", f.x, f.y, on ? "Lights on" : "Lights off");
    playJuice(s, on ? "boost" : "blip", 1, s.player.x);
    return;
  }

  if (f.mode === "switch" && f.switchAction === "activate") {
    bits.activated[f.id] = !bits.activated[f.id];
    const on = bits.activated[f.id];
    s.status = on ? `${f.name} open` : `${f.name} shut`;
    if (f.dialog && on) s.dialog = { text: f.dialog, t: 5 };
    playJuice(s, on ? "boost" : "blip", 1, s.player.x);
    return;
  }

  if (f.mode === "switch" && f.linkId) {
    const isLight = bits.lights.some((l) => l.id === f.linkId);
    if (isLight) {
      bits.lightsOn[f.linkId] = bits.lightsOn[f.linkId] === false;
      const on = bits.lightsOn[f.linkId] !== false;
      s.status = on ? "Light on" : "Light off";
      recordHaunt(bits, "light", f.x, f.y, on ? "Lights on" : "Lights off");
      playJuice(s, on ? "boost" : "blip", 1, s.player.x);
      return;
    }
    bits.activated[f.linkId] = !bits.activated[f.linkId];
    const target = bits.fixtures.find((x) => x.id === f.linkId);
    s.status = bits.activated[f.linkId]
      ? `${target?.name ?? "device"} on`
      : `${target?.name ?? "device"} off`;
    playJuice(s, bits.activated[f.linkId] ? "boost" : "blip", 1, s.player.x);
    if (f.switchAction === "dialog" && target?.dialog) {
      s.dialog = { text: target.dialog, t: 6 };
    }
    return;
  }
  if (f.dialog && f.mode !== "sit" && f.mode !== "sleep") s.dialog = { text: f.dialog, t: 7.5 };
  if (f.mode === "sit" || f.mode === "sleep") {
    if (bits.sitting && (f.saves || f.mode === "sleep")) {
      bits.savedAt = Date.now();
      bits.lastSit = { x: f.x + f.w / 2, y: f.y + f.h / 2, roomId: bits.roomId };
      s.houseMemory[bits.assetId] = bits;
      persistHouseMemory(s.houseMemory);
      s.status = "The house kept you.";
      s.dialog = {
        text: "You sleep sitting up. When you wake, the TV is still the channel you left it.",
        t: 6,
      };
      recordHaunt(bits, "sleep", f.x, f.y, "Slept · house saved");
      playJuice(s, "chord", 0.85, s.player.x);
      s.host.ingestHaunt(bits);
      return;
    }
    bits.sitting = !bits.sitting;
    if (bits.sitting) bits.lastSit = { x: f.x + f.w / 2, y: f.y + 4, roomId: bits.roomId };
    s.squash = 0.8;
    s.status = bits.sitting
      ? f.saves || f.mode === "sleep"
        ? `Sat on ${f.name} · E again to sleep (the house will keep you)`
        : `Sat on ${f.name}`
      : "Up.";
    if (bits.sitting) recordHaunt(bits, "sit", f.x, f.y, `Sat on ${f.name}`);
    playJuice(s, "hop_out", 0.9, s.player.x);
  }
  if (f.mode === "pickup") {
    s.host.acquire(f.name, f.color);
    if (f.isKey && f.keyId) {
      if (!bits.keys.includes(f.keyId)) bits.keys.push(f.keyId);
      s.status = `Picked up ${f.name} · key`;
    } else {
      s.status = `Picked up ${f.name}`;
    }
    addPop(
      s,
      f.x,
      f.y - 10,
      f.pickupKind === "health" ? "+HP" : f.isKey ? "KEY" : "GET",
      f.color,
    );
    playJuice(s, "chord", 1.15, s.player.x);
    recordHaunt(bits, "pickup", f.x, f.y, `Took ${f.name}`);
    if (f.crumbs) dropCrumbs(bits, f.x, f.y);
    if (f.consume) bits.gone[f.id] = true;
  }
  if (f.mode === "dialog") {
    s.status = f.name;
    playJuice(s, "blip", 0.95, s.player.x);
  }
  if (f.mode === "button") {
    if (f.linkId) bits.activated[f.linkId] = true;
    playJuice(s, "hit", 1.1, s.player.x);
  }
}
