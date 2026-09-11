// Run only against the isolated local test browser on port 9223 and static server on 8765.
// Uses native browser input; reads only Tiny Dungeon’s own save for navigation.
import { restore } from "../engine.mjs";
import { botAction } from "./playthrough.mjs";
import fs from "node:fs/promises";
const tabs = await (await fetch("http://127.0.0.1:9223/json")).json();
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map(),
  errors = [],
  failed = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    pending.get(m.id)?.(m);
    pending.delete(m.id);
  }
  if (m.method === "Runtime.exceptionThrown")
    errors.push(m.params.exceptionDetails);
  if (
    m.method === "Network.responseReceived" &&
    m.params.response.status >= 400
  )
    failed.push(m.params.response.url);
};
const call = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
const read = async (expression) =>
  (await call("Runtime.evaluate", { expression, returnByValue: true })).result
    .result.value;
const key = (code, key, type = "keyDown") =>
  call("Input.dispatchKeyEvent", { type, code, key });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = async (selector) => {
  const doc = await call("DOM.getDocument");
  const node = await call("DOM.querySelector", {
    nodeId: doc.result.root.nodeId,
    selector,
  });
  if (!node.result.nodeId) throw Error("Missing " + selector);
  await call("DOM.scrollIntoViewIfNeeded", { nodeId: node.result.nodeId });
  const p = JSON.parse(
    await read(
      `JSON.stringify((()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})())`,
    ),
  );
  for (const type of ["mousePressed", "mouseReleased"])
    await call("Input.dispatchMouseEvent", {
      type,
      button: "left",
      clickCount: 1,
      ...p,
    });
};
const shot = async (name) => {
  const r = await call("Page.captureScreenshot");
  await fs.writeFile(`/tmp/${name}.png`, Buffer.from(r.result.data, "base64"));
};
await call("Runtime.enable");
await call("Page.enable");
await call("Network.enable");

await call("Emulation.setDeviceMetricsOverride", {
  width: 1200,
  height: 1050,
  deviceScaleFactor: 1,
  mobile: false,
});
await call("Page.navigate", {
  url: "http://127.0.0.1:8765/games/tinydungeon/",
});
await sleep(400);
const press = async (k) => {
  const code = k.startsWith("Arrow")
    ? k
    : k === " "
      ? "Space"
      : "Key" + k.toUpperCase();
  await key(code, k);
  await key(code, k, "keyUp");
};
for (const c of ["Mage", "Priest", "Rogue"]) {
  await click(".class-btn." + c);
  await press("q");
  if (c !== "Priest") await press("ArrowRight");
  console.log(
    c,
    await read(
      "document.querySelector('#player-stats').textContent+' / '+document.querySelector('#ability-btn').textContent",
    ),
  );
  await press("i");
  console.log(
    "inventory open",
    await read("document.querySelector('#inventory-screen').open"),
  );
  await press("i");
  await click("#suspend-run");
}
await click("#run-seed");
await call("Input.insertText", { text: "balance-1" });
await click(".class-btn.Fighter");
let floor = 0,
  battle = false,
  actions = 0;
for (; actions < 2000; actions++) {
  const raw = await read("localStorage.getItem('tinydungeon_run_v1')");
  if (!raw) break;
  const s = restore(raw);
  if (!s) throw Error("Saved run failed validation");
  if (s.floor !== floor) {
    floor = s.floor;
    console.log("floor", floor, "turn", s.turn, "hp", s.player.hp);
  }
  if (!battle && s.enemies.some((e) => e.boss && s.visible[e.y * 30 + e.x])) {
    await sleep(180);
    await shot("tiny-boss-combat");
    battle = true;
  }
  let a, choice;
  botAction(
    s,
    (_s, action) => (a = action),
    (_s, i) => (choice = i),
  );
  if (choice !== undefined) {
    await click("#choice-options button:nth-child(" + (choice + 1) + ")");
    continue;
  }
  if (!a) throw Error("No bot action");
  const dir = () =>
    a.dx === 1
      ? "ArrowRight"
      : a.dx === -1
        ? "ArrowLeft"
        : a.dy === 1
          ? "ArrowDown"
          : "ArrowUp";
  if (a.type === "move") await press(dir());
  else if (a.type === "ability") {
    await press("q");
    if (a.dx || a.dy) await press(dir());
  } else if (a.type === "reach") {
    await press("f");
    await press(dir());
  } else if (a.type === "use" || a.type === "drop") {
    await press("i");
    await click(
      "#backpack-list .item-row:nth-child(" +
        (a.index + 1) +
        ") button:" +
        (a.type === "use" ? "first-child" : "last-child"),
    );
  } else await press({ potion: "h", wait: " ", interact: "e" }[a.type]);
}
if (actions === 2000) throw Error("Browser playthrough did not finish");
await sleep(200);
await shot("tiny-full-run-result");
console.log(
  "result",
  actions,
  await read("document.querySelector('#run-recap').textContent"),
);
await click("#end-button-container button");
await click(".class-btn.Rogue");
console.log(
  "restart",
  await read(
    "document.querySelector('#floor-name').textContent+' / '+document.querySelector('#turn-count').textContent",
  ),
);
await call("Emulation.setDeviceMetricsOverride", {
  width: 320,
  height: 740,
  deviceScaleFactor: 1,
  mobile: true,
});
await call("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await sleep(100);
await click('[data-dir="1,0"]');
await shot("tiny-mobile-320-final");
console.log(
  "320 overflow",
  await read("document.documentElement.scrollWidth>innerWidth"),
);
await click("#sound-toggle");
const label = await read("document.querySelector('#sound-toggle').textContent");
await click("#suspend-run");
await call("Page.reload");
await sleep(300);
await click("#resume-run");
console.log(
  "sound persists",
  label === (await read("document.querySelector('#sound-toggle').textContent")),
);
console.log("errors", errors, "failed", failed);
ws.close();
if (errors.length || failed.length) process.exitCode = 1;
