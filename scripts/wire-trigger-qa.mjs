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
await page.waitForTimeout(2200);

// Select first feed plane in the inspector
const planeBtn = page.locator("button").filter({ hasText: /plane|Characters|Neon|Alley|Quest/i }).first();
await planeBtn.click().catch(() => {});
await page.waitForTimeout(200);

await page.getByRole("button", { name: "BOIL", exact: true }).first().click({ force: true });
await page.waitForTimeout(250);
await page.getByRole("button", { name: /^Fire$/i }).click().catch(() => {});
await page.waitForTimeout(400);

const text = await page.locator("body").innerText();
const hasTriggers = /Triggers/i.test(text);
const hasBoil = /BOIL/i.test(text);
const status = text.match(/WIRE ·[^\n]+|Trigger armed[^\n]+|boil on[^\n]+/i)?.[0] ?? "";

await page.screenshot({ path: "/workspace/screenshots/wire-trigger-boil.png" });

await page.keyboard.press("t");
await page.waitForTimeout(200);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(250);
await page.screenshot({ path: "/workspace/screenshots/wire-trigger-mobile.png" });

console.log(
  JSON.stringify({ hasTriggers, hasBoil, status, consoleErrors, pageErrors }, null, 2),
);
await browser.close();
process.exit(pageErrors.length ? 2 : 0);
