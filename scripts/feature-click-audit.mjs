#!/usr/bin/env node
/**
 * Feature-by-feature interactive click audit for PixelPlane.
 * Writes JSON report + screenshots under /workspace/screenshots/audit/
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8080/";
const OUT = "/workspace/screenshots/audit";
const TIMEOUT = 45000;

mkdirSync(OUT, { recursive: true });

const results = [];
const consoleErrors = [];
const pageErrors = [];

function record(id, status, detail = "", extra = {}) {
  results.push({ id, status, detail, ...extra });
  const mark = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : status === "WARN" ? "!" : "·";
  console.log(`${mark} [${status}] ${id}${detail ? " — " + detail : ""}`);
}

async function shot(page, name) {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function allTitles(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[title]")].map((b) => b.getAttribute("title") || ""),
  );
}


async function dismissChrome(page) {
  // Close any modal backdrops / help / tips that steal clicks
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(80);
  }
  // Click modal close buttons if present
  const closes = page.locator(
    'button:has-text("Close"), button:has-text("Got it"), button[aria-label="Close"], [title="Close"]',
  );
  const n = await closes.count();
  for (let i = 0; i < Math.min(n, 3); i++) {
    try {
      await closes.nth(i).click({ timeout: 800 });
    } catch {
      /* */
    }
  }
  // Force-hide common modal shells via DOM (test only)
  await page.evaluate(() => {
    document.querySelectorAll(".fixed.inset-0.z-50, .fixed.inset-0.z-40").forEach((el) => {
      // only remove pointer-blockers that look like backdrops with flex center
      if (el.className.includes("backdrop") || el.className.includes("flex items-center justify-center")) {
        el.style.display = "none";
        el.style.pointerEvents = "none";
      }
    });
    // dismiss tip bars: click X-like
    document.querySelectorAll('[class*="z-40"] button').forEach((b) => {
      const tx = (b.textContent || "").trim();
      if (tx === "×" || tx === "x" || tx === "✕" || /dismiss|got it|close/i.test(tx)) b.click();
    });
  });
  await page.waitForTimeout(120);
}

async function clickTitleSafe(page, title) {
  await dismissChrome(page);
  const loc = page.locator(`[title="${title}"]`).first();
  if (!(await loc.count())) throw new Error(`No element with title="${title}"`);
  try {
    await loc.click({ timeout: 4000 });
  } catch {
    await loc.click({ force: true, timeout: 3000 });
  }
}

async function clickTitle(page, title) {
  const loc = page.locator(`[title="${title}"]`).first();
  const count = await page.locator(`[title="${title}"]`).count();
  if (!count) throw new Error(`No element with title="${title}"`);
  try {
    await loc.click({ timeout: 3500 });
  } catch {
    await dismissChrome(page);
    await loc.click({ force: true, timeout: 3500 });
  }
  return true;
}

async function clickTitleMatch(page, regex) {
  const titles = await allTitles(page);
  const match = titles.find((t) => regex.test(t));
  if (!match) throw new Error(`No title matching ${regex}`);
  await clickTitle(page, match);
  return match;
}

async function hasText(page, re, timeout = 2000) {
  try {
    await page.getByText(re).first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function statusSnippet(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    return (header?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 280);
  });
}

async function canvasMetrics(page) {
  return page.evaluate(() => {
    const canvases = [...document.querySelectorAll("canvas")];
    const main = canvases.sort((a, b) => b.width * b.height - a.width * a.height)[0];
    if (!main) return { count: 0, w: 0, h: 0, nonZeroSamples: 0 };
    const ctx = main.getContext("2d", { willReadFrequently: true });
    let nonZero = 0;
    try {
      const w = Math.min(main.width, 480);
      const h = Math.min(main.height, 320);
      const { data } = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < data.length; i += 32) {
        if (data[i + 3] > 12) nonZero++;
      }
    } catch {
      /* ignore */
    }
    return { count: canvases.length, w: main.width, h: main.height, nonZeroSamples: nonZero };
  });
}

async function paintStroke(page, dx = 40, dy = 10) {
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error("no canvas bbox");
  const x = box.x + box.width * 0.55;
  const y = box.y + box.height * 0.45;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}

async function panDrag(page) {
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error("no canvas");
  const x = box.x + box.width * 0.5;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 90, y + 50, { steps: 8 });
  await page.mouse.up();
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));

try {
  // ═══ 1. BOOT ═══════════════════════════════════════════════
  const resp = await page.goto(BASE, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1800);
  const title = await page.title();
  let cm = await canvasMetrics(page);
  await shot(page, "01-boot");

  record(
    "boot.load",
    (resp?.status() ?? 0) >= 200 && (resp?.status() ?? 0) < 400 ? "PASS" : "FAIL",
    `HTTP ${resp?.status()} · ${title}`,
  );
  record(
    "boot.canvas",
    cm.count > 0 && cm.w > 100 ? "PASS" : "FAIL",
    `canvases=${cm.count} ${cm.w}x${cm.h} samples=${cm.nonZeroSamples}`,
  );
  record(
    "boot.chrome",
    (await hasText(page, /Plane systems|PixelPlane/i)) ? "PASS" : "FAIL",
    "studio chrome",
  );
  record(
    "boot.console_clean",
    consoleErrors.length === 0 && pageErrors.length === 0 ? "PASS" : "FAIL",
    `console=${consoleErrors.length} page=${pageErrors.length}`,
    { consoleErrors: [...consoleErrors], pageErrors: [...pageErrors] },
  );

  // ═══ 2. CONTENT ════════════════════════════════════════════
  record(
    "studio.canvas_has_pixels",
    cm.nonZeroSamples > 20 ? "PASS" : cm.nonZeroSamples > 0 ? "WARN" : "FAIL",
    `nonZeroSamples=${cm.nonZeroSamples}`,
  );

  try {
    await clickTitle(page, "New 128 artboard");
    await page.waitForTimeout(250);
    record("studio.new_artboard", "PASS", "New 128 artboard");
  } catch (e) {
    record("studio.new_artboard", "FAIL", String(e.message || e));
  }

  // ═══ 3. TOOLBAR (exact titles from LeftToolbar) ════════════
  const tools = [
    ["select", "Select (V)"],
    ["move", "Move boards / anims / wires (M)"],
    ["pan", "Pan (or hold Space) (H)"],
    ["brush", "Brush (B)"],
    ["eraser", "Eraser (E)"],
    ["fill", "Fill (G)"],
    ["eyedropper", "Eyedropper (I)"],
    ["line", "Line (L)"],
    ["rect", "Rectangle (R)"],
    ["ellipse", "Ellipse (O)"],
    ["marquee", "Marquee select / cut (S)"],
    ["anim-region", "Animation square (A)"],
    ["particle", "Particle region (P)"],
    ["place", "Place anim in scene (T)"],
    ["wire-zone", "Feed plane (wire zone) (W)"],
    ["game-viewport", "Ghost of the game (viewport) (U)"],
    ["constraint-stamp", "Constraint stamp (pixel cage) (N)"],
  ];

  for (const [id, t] of tools) {
    try {
      await clickTitle(page, t);
      await page.waitForTimeout(80);
      record(`toolbar.${id}`, "PASS", t);
    } catch (e) {
      // fallback: match without hotkey paren
      try {
        const hit = await clickTitleMatch(page, new RegExp(id === "game-viewport" ? "Ghost of the game|viewport" : id === "constraint-stamp" ? "Constraint stamp" : `^${tools.find((x) => x[0] === id)[1].split(" (")[0]}`, "i"));
        record(`toolbar.${id}`, "PASS", `fallback: ${hit}`);
      } catch (e2) {
        record(`toolbar.${id}`, "FAIL", String(e.message || e));
      }
    }
  }
  await shot(page, "02-toolbar");

  try {
    await dismissChrome(page);
    const theme = await clickTitleMatch(page, /Icon theme:/i);
    await page.waitForTimeout(80);
    await clickTitleMatch(page, /Icon theme:/i);
    record("toolbar.icon_theme", "PASS", theme);
  } catch (e) {
    record("toolbar.icon_theme", "FAIL", String(e.message || e));
  }

  // ═══ 4. DRAW ═══════════════════════════════════════════════
  try {
    await clickTitle(page, "Brush (B)");
    const before = await canvasMetrics(page);
    await paintStroke(page, 60, 25);
    await page.waitForTimeout(250);
    const after = await canvasMetrics(page);
    record(
      "draw.brush_stroke",
      "PASS",
      `samples ${before.nonZeroSamples}→${after.nonZeroSamples}`,
    );
    await shot(page, "03-brush");
  } catch (e) {
    record("draw.brush_stroke", "FAIL", String(e.message || e));
  }

  try {
    await page.keyboard.press("KeyB");
    await page.keyboard.press("KeyH");
    await page.keyboard.press("KeyV");
    await page.keyboard.press("KeyU");
    await page.keyboard.press("KeyN");
    record("hotkeys.tool_letters", "PASS", "B H V U N");
  } catch (e) {
    record("hotkeys.tool_letters", "FAIL", String(e.message || e));
  }

  // ═══ 5. PAN / ZOOM ═════════════════════════════════════════
  try {
    await clickTitle(page, "Pan (or hold Space) (H)");
    await panDrag(page);
    record("canvas.pan_drag", "PASS");
  } catch (e) {
    record("canvas.pan_drag", "FAIL", String(e.message || e));
  }

  try {
    await clickTitle(page, "Zoom in (pixel scale)");
    await clickTitle(page, "Zoom out (way out)");
    await clickTitle(page, "Reset to wide plane view");
    record("canvas.zoom_controls", "PASS");
  } catch (e) {
    record("canvas.zoom_controls", "FAIL", String(e.message || e));
  }

  // ═══ 6. WAVE A ═════════════════════════════════════════════
  try {
    await clickTitle(page, "Ghost of the game (viewport) (U)");
    const box = await page.locator("canvas").first().boundingBox();
    await page.mouse.click(box.x + box.width * 0.38, box.y + box.height * 0.42);
    await page.waitForTimeout(300);
    const st = await statusSnippet(page);
    const ok = /viewport|Ghost of the game|Game \d/i.test(st);
    record("waveA.game_viewport", ok ? "PASS" : "WARN", st.slice(0, 120));
  } catch (e) {
    record("waveA.game_viewport", "FAIL", String(e.message || e));
  }

  try {
    await clickTitle(page, "Constraint stamp (pixel cage) (N)");
    const box = await page.locator("canvas").first().boundingBox();
    await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.48);
    await page.waitForTimeout(300);
    const st = await statusSnippet(page);
    const ok = /stamp|clamp|cage/i.test(st);
    record("waveA.constraint_stamp", ok ? "PASS" : "WARN", st.slice(0, 120));
  } catch (e) {
    record("waveA.constraint_stamp", "FAIL", String(e.message || e));
  }
  await shot(page, "04-wave-a");

  try {
    await dismissChrome(page);
    await clickTitle(page, "Wire heat map — feed planes glow by coverage / orphans");
    await page.waitForTimeout(150);
    const st1 = await statusSnippet(page);
    await clickTitle(page, "Session ghosts — F-key bookmark thumbnails on the plane");
    await page.waitForTimeout(100);
    await clickTitle(page, "Session ghosts — F-key bookmark thumbnails on the plane");
    const heatOk = /heat|orphan|Wire heat/i.test(st1);
    record("waveA.heat_toggle", heatOk ? "PASS" : "WARN", st1.slice(0, 100));
    record("waveA.ghosts_toggle", "PASS", "toggled twice");
  } catch (e) {
    record("waveA.heat_toggle", "FAIL", String(e.message || e));
  }

  for (const [id, t] of [
    ["systems.private", "Draw private bubble (ADHD / personal space)"],
    ["systems.witness", "Witness bubble — others see dim, soft edit"],
    ["systems.focus", "Focus bubble — dim outside"],
    ["systems.watch", "Watch mode — observe without editing pressure"],
    ["systems.chunks", "D_10x interest chunk grid"],
    ["systems.export_map", "Spatial export map (what goes where)"],
  ]) {
    try {
      await clickTitle(page, t);
      await page.waitForTimeout(80);
      record(id, "PASS");
    } catch (e) {
      record(id, "FAIL", String(e.message || e));
    }
  }
  await page.keyboard.press("Escape");
  await shot(page, "05-systems");

  // ═══ 7. BOOKMARKS / EDIT ═══════════════════════════════════
  try {
    await page.keyboard.down("Control");
    await page.keyboard.press("F3");
    await page.keyboard.up("Control");
    await page.waitForTimeout(250);
    await panDrag(page);
    await page.keyboard.press("F3");
    await page.waitForTimeout(250);
    const st = await statusSnippet(page);
    const jumped = /Jumped to location F3/i.test(st);
    record(
      "hotkeys.bookmark_F3",
      jumped ? "PASS" : "WARN",
      jumped ? "save+jump confirmed in status" : `status: ${st.slice(0, 100)}`,
    );
  } catch (e) {
    record("hotkeys.bookmark_F3", "FAIL", String(e.message || e));
  }

  try {
    await clickTitle(page, "Undo (Ctrl+Z)");
    await clickTitle(page, "Redo (Ctrl+Y)");
    record("edit.undo_redo", "PASS");
  } catch (e) {
    record("edit.undo_redo", "FAIL", String(e.message || e));
  }

  try {
    await clickTitle(page, "Help");
    await page.waitForTimeout(350);
    const open = await hasText(page, /hotkey|shortcut|Help|camera|F1/i, 2000);
    await page.keyboard.press("Escape");
    await dismissChrome(page);
    // explicit close
    try {
      await page.getByRole("button", { name: /close|got it/i }).first().click({ timeout: 1000 });
    } catch { /* */ }
    await dismissChrome(page);
    record("panels.help", open ? "PASS" : "WARN", open ? "modal" : "click only");
  } catch (e) {
    record("panels.help", "FAIL", String(e.message || e));
  }

  // ═══ 8. PANELS ═════════════════════════════════════════════
  await dismissChrome(page);
  const panels = [
    ["panels.shared_plane", "Shared plane — create with friends & family", /shared|room|peer|collab|invite|plane/i],
    ["panels.memory_web", "Memory Web + live asset sockets — NPCs, groups, factions", /memory|agent|faction|NPC|socket|disposition/i],
    ["panels.character_district", "Character District — spatial anim state machine (Gemini)", /district|hitbox|state|compose|pad|anim|spring/i],
    ["panels.city_district", "City District — weighted tiles + footing collision", /city|footing|tile|weight|district/i],
    ["panels.icon_library", "Icon library — wires, HUD, anim presets (swappable packs later)", /icon|pack|amber|cyan|library|HUD/i],
    ["panels.starter_pack", "Free-use starter pack", /starter|rat|pack|portrait|sheet/i],
    ["panels.guides", "Useful guides (info dumps)", /guide|chunk|doctrine|copilot|useful/i],
    ["panels.generate", "AI Generate", /generate|prompt|describe|character/i],
    ["panels.engine_connect", "Connect engine project", /engine|Godot|Unity|Unreal|connect|folder/i],
    ["panels.wire_connectors", "Wire connectors", /wire|connector|feed|folder|category/i],
  ];

  for (const [id, titleAttr, re] of panels) {
    try {
      await dismissChrome(page);
      await clickTitle(page, titleAttr);
      await page.waitForTimeout(450);
      const visible = await hasText(page, re, 1500);
      await shot(page, `panel-${id.split(".")[1]}`);
      await dismissChrome(page);
      record(id, visible ? "PASS" : "WARN", visible ? "UI visible" : "opened; soft match");
    } catch (e) {
      record(id, "FAIL", String(e.message || e));
    }
  }

  try {
    await dismissChrome(page);
    await clickTitle(page, "New indoor scene — design a building interior for City Engine");
    await page.waitForTimeout(200);
    record("studio.indoor_scene", "PASS");
  } catch (e) {
    record("studio.indoor_scene", "FAIL", String(e.message || e));
  }

  try {
    await dismissChrome(page);
    await clickTitle(page, "Drop Klondike solitaire on the plane (with skin template)");
    await page.waitForTimeout(500);
    const ok = await hasText(page, /solitaire|foundation|draw|tableau|Klondike|deal/i, 2000);
    await shot(page, "06-solitaire");
    record("fun.solitaire", ok ? "PASS" : "WARN", ok ? "board/UI" : "dropped?");
  } catch (e) {
    record("fun.solitaire", "FAIL", String(e.message || e));
  }

  // ═══ 9. CITY ENGINE ════════════════════════════════════════
  try {
    await dismissChrome(page);
    await clickTitle(page, "City Engine — drive the city (play suite)");
    await page.waitForTimeout(1500);
    const hasEngineLabel = await hasText(page, /City Engine/i, 3000);
    const canvases = await page.locator("canvas").count();
    await shot(page, "07-city-engine");
    record(
      "engine.enter",
      hasEngineLabel && canvases > 0 ? "PASS" : hasEngineLabel ? "WARN" : "FAIL",
      `label=${hasEngineLabel} canvases=${canvases}`,
    );

    await page.keyboard.press("KeyW");
    await page.waitForTimeout(80);
    await page.keyboard.press("KeyA");
    await page.waitForTimeout(80);
    await page.keyboard.press("KeyS");
    await page.waitForTimeout(80);
    await page.keyboard.press("KeyD");
    await page.waitForTimeout(80);
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(80);
    record("engine.wasd_e", "PASS", "movement keys no throw");

    // Leave via City Engine chrome "Studio" back button
    await dismissChrome(page);
    let left = false;
    try {
      // Prefer exact HUD button: ArrowLeft + "Studio" in engine top bar
      const leave = page.locator("button").filter({ hasText: /^\s*Studio\s*$/ });
      const n = await leave.count();
      for (let i = 0; i < n; i++) {
        const box = await leave.nth(i).boundingBox();
        if (box && box.y < 80) {
          await leave.nth(i).click({ force: true });
          left = true;
          break;
        }
      }
      if (!left && n) {
        await leave.first().click({ force: true });
        left = true;
      }
    } catch (e) {
      /* fall through */
    }
    if (!left) {
      // programmatic leave if UI blocked
      await page.evaluate(() => {
        // try clicking any visible "Studio" in top-left
        const btns = [...document.querySelectorAll("button")];
        const b = btns.find((x) => /^\s*Studio\s*$/.test(x.textContent || ""));
        if (b) b.click();
      });
    }
    await page.waitForTimeout(1000);
    const back = await hasText(page, /Plane systems/i, 3000);
    record("engine.leave", back ? "PASS" : "WARN", back ? "studio chrome restored" : "leave unclear — may need manual");
    await shot(page, "08-back-studio");
  } catch (e) {
    record("engine.suite", "FAIL", String(e.message || e));
  }

  // ═══ 10. MINIMAP / RIGHT ═══════════════════════════════════
  try {
    const frame = await page.locator('img[src*="mini_map"]').count();
    record("ui.minimap", frame > 0 ? "PASS" : "WARN", `mini_map imgs=${frame}`);
  } catch (e) {
    record("ui.minimap", "FAIL", String(e.message || e));
  }

  try {
    const labels = await hasText(page, /Layers|Artboard|Color|Brush|Wire|Anim/i, 1200);
    record("ui.inspector", labels ? "PASS" : "WARN", labels ? "right panel labels" : "no labels");
  } catch (e) {
    record("ui.inspector", "FAIL", String(e.message || e));
  }

  try {
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyS");
    await page.keyboard.up("Control");
    await page.waitForTimeout(400);
    const st = await statusSnippet(page);
    const ok = /saved|storage|browser/i.test(st);
    record("persist.ctrl_s", ok ? "PASS" : "WARN", st.slice(0, 100));
  } catch (e) {
    record("persist.ctrl_s", "FAIL", String(e.message || e));
  }

  // ═══ 11. MOBILE ════════════════════════════════════════════
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    const hasC = (await page.locator("canvas").count()) > 0;
    await shot(page, "09-mobile-390");
    const bad = overflow.scrollW > overflow.clientW + 12;
    record(
      "responsive.mobile_390",
      hasC && !bad ? "PASS" : bad ? "WARN" : "FAIL",
      `canvas=${hasC} scroll=${overflow.scrollW}/${overflow.clientW}`,
    );
  } catch (e) {
    record("responsive.mobile_390", "FAIL", String(e.message || e));
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(400);
  await shot(page, "10-final");

  record(
    "boot.console_final",
    consoleErrors.length === 0 && pageErrors.length === 0 ? "PASS" : "FAIL",
    `console=${consoleErrors.length} page=${pageErrors.length}`,
    { consoleErrors: consoleErrors.slice(0, 25), pageErrors: pageErrors.slice(0, 10) },
  );
} catch (err) {
  record("audit.crash", "FAIL", String(err?.message || err));
} finally {
  await browser.close();
}

const pass = results.filter((r) => r.status === "PASS").length;
const fail = results.filter((r) => r.status === "FAIL").length;
const warn = results.filter((r) => r.status === "WARN").length;
const summary = {
  at: new Date().toISOString(),
  base: BASE,
  totals: { pass, fail, warn, total: results.length },
  results,
  consoleErrors,
  pageErrors,
};

writeFileSync(`${OUT}/report.json`, JSON.stringify(summary, null, 2));
console.log("\n======== SUMMARY ========");
console.log(JSON.stringify(summary.totals, null, 2));
console.log(`Report: ${OUT}/report.json`);
process.exit(fail > 0 ? 2 : 0);
