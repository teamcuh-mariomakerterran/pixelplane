import { chromium } from "playwright";
const url = "http://127.0.0.1:8080/";
const shot = "/workspace/screenshots/bones-engine.png";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(800);
const play = page.getByTitle(/play city engine/i).or(page.locator('button[title*="City Engine"]'));
if (await play.count()) {
  await play.first().click();
} else {
  await page.keyboard.press("Control+K");
  await page.waitForTimeout(200);
}
await page.waitForTimeout(2500);
await page.screenshot({ path: shot, fullPage: false });
const text = await page.locator("body").innerText();
console.log(JSON.stringify({
  title: await page.title(),
  hasCanvas: await page.locator("canvas").count(),
  bodySnippet: text.slice(0, 400),
  errors,
  shot,
}, null, 2));
await browser.close();
