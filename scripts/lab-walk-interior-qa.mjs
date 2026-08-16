import { chromium } from "playwright";

const b = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text());
});
await p.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
await p.waitForTimeout(1400);
await p.getByRole("button", { name: "City Engine — drive the city" }).click();
await p.waitForTimeout(2000);
const canvas = p.locator("canvas").first();
await canvas.click({ position: { x: 640, y: 400 } });
await p.waitForTimeout(200);
await p.keyboard.down("KeyW");
await p.waitForTimeout(280);
await p.screenshot({ path: "/workspace/screenshots/loco-walk-north.png" });
await p.keyboard.up("KeyW");
await p.keyboard.press("KeyE");
await p.waitForTimeout(800);
await p.screenshot({ path: "/workspace/screenshots/indoor-living-deep.png" });
await p.keyboard.down("KeyD");
await p.waitForTimeout(1100);
await p.keyboard.up("KeyD");
await p.keyboard.press("KeyE");
await p.waitForTimeout(500);
await p.screenshot({ path: "/workspace/screenshots/indoor-kitchen-deep.png" });
await p.keyboard.down("KeyS");
await p.waitForTimeout(1000);
await p.keyboard.up("KeyS");
await p.keyboard.press("KeyE");
await p.waitForTimeout(600);
await p.screenshot({ path: "/workspace/screenshots/indoor-bedroom-deep.png" });
const hud = await p.locator("body").innerText();
console.log(JSON.stringify({
  clip: /clip ·/.test(hud),
  indoor: /INDOORS/.test(hud),
  bedroom: /Bedroom/.test(hud),
  kitchen: /Kitchen/.test(hud),
  living: /Living/.test(hud),
  errs: errs.slice(0, 8),
}, null, 2));
await b.close();
process.exit(errs.some((e) => !e.includes("IndexSizeError")) ? 2 : 0);
