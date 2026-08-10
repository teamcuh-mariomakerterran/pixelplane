import { chromium } from "playwright";
const b = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await p.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
await p.waitForTimeout(1500);
// open palette
await p.keyboard.down("Control");
await p.keyboard.press("KeyK");
await p.keyboard.up("Control");
await p.waitForTimeout(400);
const open = await p.getByText(/Summon Night District|command surface|Summon anything/i).count();
await p.screenshot({ path: "/workspace/screenshots/ascension-palette.png" });
// summon night district
await p.keyboard.type("night");
await p.waitForTimeout(200);
await p.keyboard.press("Enter");
await p.waitForTimeout(2500);
await p.screenshot({ path: "/workspace/screenshots/ascension-night.png" });
const body = await p.locator("body").innerText();
const night = /Night District/i.test(body);
console.log(JSON.stringify({ paletteOpen: open > 0, night, errs: errs.slice(0, 8) }));
await b.close();
process.exit(errs.length ? 2 : 0);
