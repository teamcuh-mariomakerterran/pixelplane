import { chromium } from "playwright";
import fs from "node:fs";

fs.mkdirSync("/workspace/screenshots", { recursive: true });

const b = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text());
});

await p.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
await p.waitForTimeout(2800);
await p.screenshot({ path: "/workspace/screenshots/cat-split-plane.png" });

try {
  await p.keyboard.press("Control+KeyK");
  await p.waitForTimeout(300);
  const pal = p.getByRole("dialog", { name: "Command palette" });
  if (await pal.count()) {
    await pal.locator("input").fill("split the cat");
    await p.waitForTimeout(200);
    await p.keyboard.press("Enter");
    await p.waitForTimeout(900);
    await p.screenshot({ path: "/workspace/screenshots/cat-split-after-cmd.png" });
  }
} catch (e) {
  errs.push("palette: " + String(e).slice(0, 180));
}

const studioText = await p.locator("body").innerText();

try {
  await p.keyboard.press("Escape");
} catch {
  /* */
}
await p.waitForTimeout(200);

const engineBtn = p.getByRole("button", { name: "City Engine — drive the city" });
if (await engineBtn.count()) {
  await engineBtn.click();
}
await p.waitForTimeout(1800);

const canvas = p.locator("canvas").first();
await canvas.click({ position: { x: 700, y: 450 } });
await p.waitForTimeout(150);
await p.keyboard.down("KeyS");
await p.waitForTimeout(450);
await p.screenshot({ path: "/workspace/screenshots/cat-walk-down.png" });
await p.keyboard.up("KeyS");
await p.keyboard.down("KeyA");
await p.waitForTimeout(450);
await p.screenshot({ path: "/workspace/screenshots/cat-walk-left.png" });
await p.keyboard.up("KeyA");
await p.keyboard.down("KeyD");
await p.waitForTimeout(450);
await p.screenshot({ path: "/workspace/screenshots/cat-walk-right.png" });
await p.keyboard.up("KeyD");
await p.keyboard.down("KeyW");
await p.waitForTimeout(450);
await p.screenshot({ path: "/workspace/screenshots/cat-walk-up.png" });
await p.keyboard.up("KeyW");

const hud = await p.locator("body").innerText();
const realErrs = errs.filter(
  (e) =>
    !e.includes("IndexSizeError") &&
    !e.includes("ResizeObserver") &&
    !String(e).includes("Failed to load"),
);

const report = {
  hasIdle: /Cat · idle|cat · idle/i.test(studioText),
  hasWalkDown: /walk-down/i.test(studioText),
  hasWalkLeft: /walk-left/i.test(studioText),
  hasWalkRight: /walk-right/i.test(studioText),
  hasWalkUp: /walk-up/i.test(studioText),
  slicerMentions: /Split into clips/i.test(studioText),
  makeChar: /Make character/i.test(studioText),
  clipHud: /clip ·|walk-down|Cat ·/i.test(hud),
  statusBits: studioText
    .split("\n")
    .filter((l) => /split|clip|walk|idle|Cat|detect|3×4|rpg/i.test(l))
    .slice(0, 16),
  hudBits: hud
    .split("\n")
    .filter((l) => /clip|walk|idle|Cat|Hero|loco/i.test(l))
    .slice(0, 16),
  errs: realErrs.slice(0, 8),
};
console.log(JSON.stringify(report, null, 2));
await b.close();
process.exit(0);
