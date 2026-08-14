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
await page.waitForTimeout(1800);

const boot = await page.evaluate(async () => {
  const studio = (await import("/src/store/studio.ts")).useStudio.getState();
  const sg = (await import("/src/store/shader-graph.ts")).useShaderGraph.getState();
  if (!sg.graphs.length) sg.seedLab(true);
  else sg.seedLab(true);
  const g = (await import("/src/store/shader-graph.ts")).useShaderGraph.getState().graphs[0];
  const particles = studio.particles.map((p) => p.name);
  return {
    boards: studio.artboards.length,
    particles: particles.length,
    particleNames: particles,
    graphs: (await import("/src/store/shader-graph.ts")).useShaderGraph.getState().graphs.length,
    graphName: g?.name ?? null,
    nodes: g?.nodes.length ?? 0,
    enabled: g?.nodes.filter((n) => n.enabled).map((n) => n.kind) ?? [],
    status: studio.status,
  };
});

await page.waitForTimeout(700);
await page.screenshot({ path: "/workspace/screenshots/wave-v-shader-lab.png" });

// toggle a node
const toggled = await page.evaluate(async () => {
  const sg = (await import("/src/store/shader-graph.ts")).useShaderGraph.getState();
  const g = sg.graphs[0];
  const n = g?.nodes.find((x) => x.kind === "pixelate");
  if (g && n) sg.toggleNode(g.id, n.id);
  const g2 = (await import("/src/store/shader-graph.ts")).useShaderGraph.getState().graphs[0];
  return g2?.nodes.find((x) => x.kind === "pixelate")?.enabled ?? null;
});
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/wave-v-shader-pixelate.png" });

// engine juice
await page.evaluate(async () => {
  (await import("/src/store/studio.ts")).useStudio.getState().setAppMode("engine");
});
await page.waitForTimeout(2500);
await page.screenshot({ path: "/workspace/screenshots/wave-v-engine.png" });

const juice = await page.evaluate(async () => {
  // smash a few times if we can find the engine state via window? we don't have it.
  // send F key
  return document.querySelector("canvas") ? true : false;
});
await page.keyboard.press("KeyF");
await page.waitForTimeout(80);
await page.keyboard.press("KeyF");
await page.waitForTimeout(80);
await page.keyboard.press("KeyF");
await page.waitForTimeout(250);
await page.screenshot({ path: "/workspace/screenshots/wave-v-engine-smash.png" });

// mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(async () => {
  (await import("/src/store/studio.ts")).useStudio.getState().setAppMode("studio");
});
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/wave-v-mobile.png" });

const bodyText = (await page.locator("body").innerText().catch(() => "")).slice(0, 400);

console.log(
  JSON.stringify(
    {
      boot,
      toggled,
      juice,
      bodyText,
      consoleErrors,
      pageErrors,
    },
    null,
    2,
  ),
);

await browser.close();
process.exit(pageErrors.length ? 2 : 0);
