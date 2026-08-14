#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
const consoleErrors = [];
const pageErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);

const spawned = await page.evaluate(async () => {
  const studio = (await import("/src/store/studio.ts")).useStudio.getState();
  const sigMod = await import("/src/store/signature.ts");
  const sig = sigMod.useSignature.getState();
  const boards = studio.artboards.filter(
    (b) => b.width <= 220 && b.height <= 220 && b.kind !== "variant",
  );
  const board =
    boards.find((b) => /hero|rat|ninja|night/i.test(b.name)) ??
    boards[0] ??
    studio.artboards[0];
  if (!board) return { ok: false, reason: "no board" };
  studio.selectArtboard(board.id);
  studio.setCamera({
    x: -board.x * 0.9 + 80,
    y: -board.y * 0.9 + 80,
    zoom: 0.9,
  });
  sig.spawnMutationRails({ full: true });
  const after = sigMod.useSignature.getState();
  const st = (await import("/src/store/studio.ts")).useStudio.getState();
  return {
    ok: true,
    parent: board.name,
    parentId: board.id,
    links: after.links.length,
    rails: after.links.map((l) => l.railId),
    variants: st.artboards.filter((b) => b.kind === "variant").length,
    showPanel: after.showRailsPanel,
    status: st.status,
  };
});

await page.waitForTimeout(600);
await page.screenshot({ path: "/workspace/screenshots/rails-spawn.png" });

const panelText = await page.locator("body").innerText();
const hasInspector = /Mutation rails/i.test(panelText);

// amount slider + library panel
const tweaked = await page.evaluate(async () => {
  const sig = (await import("/src/store/signature.ts")).useSignature.getState();
  const neon = sig.links.find((l) => l.railId === "neon");
  if (neon) sig.setLinkAmount(neon.id, 0.55);
  const cat = (await import("/src/store/category-planes.ts")).useCategoryPlanes.getState();
  cat.setShowPanel(true);
  const counts = cat.counts();
  return {
    neonAmt: sig.links.find((l) => l.railId === "neon")?.amount ?? null,
    counts,
    panel: cat.showPanel,
  };
});

await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/rails-library.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/rails-mobile.png" });

console.log(
  JSON.stringify(
    {
      spawned,
      hasInspector,
      tweaked,
      consoleErrors,
      pageErrors,
    },
    null,
    2,
  ),
);

await browser.close();
process.exit(pageErrors.length ? 2 : 0);
