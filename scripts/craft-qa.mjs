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
  const boards = studio.artboards.filter((b) => b.width <= 180 && b.height <= 180);
  const board = boards.find((b) => /rat|ninja/i.test(b.name)) ?? boards[0];
  if (!board) return { ok: false };
  studio.selectArtboard(board.id);
  studio.setCamera({
    x: -board.x * 1.15 + 50,
    y: -board.y * 1.15 + 70,
    zoom: 1.15,
  });
  return { ok: true, name: board.name, boards: studio.artboards.length };
});

await page.getByTitle(/Craft lab/i).click();
await page.waitForTimeout(250);
await page.getByRole("button", { name: /Boil off/i }).click().catch(() => {});
await page.waitForTimeout(250);
const afterClick = await page.locator("body").innerText();
const hasCraft = /Craft lab/i.test(afterClick);
const hasBoil = /Boil on/i.test(afterClick);

await page.screenshot({ path: "/workspace/screenshots/craft-boil-qa.png" });

await page.getByRole("button", { name: /^tiles$/i }).click().catch(() => {});
await page.waitForTimeout(150);
await page.getByRole("button", { name: /Grow tile kit/i }).click().catch(() => {});
await page.waitForTimeout(700);
await page.screenshot({ path: "/workspace/screenshots/craft-tiles.png" });

await page.getByRole("button", { name: /^qa$/i }).click().catch(() => {});
await page.waitForTimeout(100);
await page.getByRole("button", { name: /Run QA/i }).click().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/craft-qa.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(250);
await page.screenshot({ path: "/workspace/screenshots/craft-mobile.png" });

console.log(
  JSON.stringify({ boot, hasCraft, hasBoil, consoleErrors, pageErrors }, null, 2),
);
await browser.close();
process.exit(pageErrors.length ? 2 : 0);
