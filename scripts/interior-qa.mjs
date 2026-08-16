import { chromium } from "playwright";

const b = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const errs = [];
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text());
});

await p.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
await p.waitForTimeout(1200);

// Interior district via command palette
await p.keyboard.down("Control");
await p.keyboard.press("KeyK");
await p.keyboard.up("Control");
await p.waitForTimeout(300);
await p.keyboard.type("interior district");
await p.waitForTimeout(200);
await p.keyboard.press("Enter");
await p.waitForTimeout(800);
await p.screenshot({ path: "/workspace/screenshots/interior-district.png" });
const studioBody = await p.locator("body").innerText();

// City Engine
await p.getByRole("button", { name: "City Engine — drive the city" }).click();
await p.waitForTimeout(1500);
await p.screenshot({ path: "/workspace/screenshots/interior-engine-street.png" });

const canvas = p.locator("canvas").first();
await canvas.click({ position: { x: 720, y: 450 } });
await p.waitForTimeout(200);
await p.keyboard.press("KeyE");
await p.waitForTimeout(800);
await p.screenshot({ path: "/workspace/screenshots/interior-engine-inside.png" });

const hud = await p.locator("body").innerText();
const indoor = /INDOORS|Inside|Living room|Shithole|Walkup|Neon Corner/i.test(hud);

// walk around, try sit / pickup
await p.keyboard.down("KeyA");
await p.waitForTimeout(400);
await p.keyboard.up("KeyA");
await p.keyboard.down("KeyS");
await p.waitForTimeout(350);
await p.keyboard.up("KeyS");
await p.keyboard.press("KeyE");
await p.waitForTimeout(400);
await p.screenshot({ path: "/workspace/screenshots/interior-engine-interact.png" });

// mobile
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
m.on("pageerror", (e) => errs.push("mobile: " + e));
await m.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
await m.waitForTimeout(1000);
await m.screenshot({ path: "/workspace/screenshots/interior-mobile.png" });
const overflow = await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);

console.log(
  JSON.stringify(
    {
      studioHasInterior: /Interior District|Floor plan|Shithole/i.test(studioBody),
      enteredIndoor: indoor,
      hudSnippet: hud.replace(/\s+/g, " ").slice(0, 280),
      mobileOverflow: overflow,
      errs: errs.slice(0, 10),
    },
    null,
    2,
  ),
);
await b.close();
process.exit(errs.length ? 2 : 0);
