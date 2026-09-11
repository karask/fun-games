import test from "node:test";
import assert from "node:assert/strict";
import {
  createRun,
  generateFloor,
  visibleFrom,
  grantXP,
  act,
  stats,
  snapshot,
  restore,
} from "../engine.mjs";
import { WIDTH, HEIGHT, CLASSES } from "../data.mjs";

test("connected floors and unique initial allocations across all depths", () => {
  for (let seed = 1; seed <= 500; seed++)
    for (let floor = 1; floor <= 10; floor++) {
      const s = createRun("Fighter", String(seed));
      s.floor = floor;
      generateFloor(s);
      assert.equal(s.rooms.length, 6);
      const points = [
        s.player,
        s.stairs,
        ...s.enemies,
        ...s.items,
        ...s.features,
      ];
      assert.equal(
        new Set(points.map((p) => `${p.x},${p.y}`)).size,
        points.length,
      );
      const seen = new Set(),
        q = [s.player];
      for (const p of q) {
        const k = `${p.x},${p.y}`;
        if (seen.has(k)) continue;
        seen.add(k);
        for (const [dx, dy] of [
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0],
        ])
          if (s.map[p.y + dy]?.[p.x + dx] === 0)
            q.push({ x: p.x + dx, y: p.y + dy });
      }
      assert.equal(seen.size, s.map.flat().filter((v) => v === 0).length);
    }
});
test("new runs reset state and equip every class", () => {
  for (const c of Object.keys(CLASSES)) {
    const s = createRun(c, "fresh");
    assert.equal(s.floor, 1);
    assert.equal(s.totalXp, 0);
    assert.equal(s.turn, 0);
    assert.ok(s.player.equipment.weapon);
  }
});
test("walls block visibility and large XP awards process every level", () => {
  const s = createRun("Mage", "fov");
  s.map = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
  s.map[5][6] = 1;
  assert.equal(visibleFrom(s, { x: 5, y: 5 }, { x: 7, y: 5 }), false);
  grantXP(s, 500);
  assert.ok(s.player.level > 4);
  assert.ok(s.player.xp < s.player.nextXp);
  assert.ok(s.pendingPerks > 1);
});
test("save roundtrip preserves RNG and rejects damaged saves", () => {
  const s = createRun("Rogue", "roundtrip");
  assert.deepEqual(snapshot(restore(snapshot(s))), snapshot(s));
  assert.equal(restore("{}"), null);
  assert.equal(restore("{"), null);
  const bad = JSON.parse(snapshot(s));
  bad.version = 99;
  assert.equal(restore(JSON.stringify(bad)), null);
});
test("terminal turns stop at zero HP and stay terminal", () => {
  const s = createRun("Mage", "death");
  s.map = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
  s.player.x = 5;
  s.player.y = 5;
  s.player.hp = 1;
  s.rooms[0] = { x: 25, y: 15, w: 2, h: 2 };
  s.enemies = [
    {
      id: 1,
      name: "First",
      x: 6,
      y: 5,
      hp: 10,
      maxHp: 10,
      attack: 100,
      defense: 0,
      kind: "melee",
      xp: 1,
    },
    {
      id: 2,
      name: "Second",
      x: 5,
      y: 6,
      hp: 10,
      maxHp: 10,
      attack: 100,
      defense: 0,
      kind: "melee",
      xp: 1,
    },
  ];
  act(s, { type: "wait" });
  assert.equal(s.status, "dead");
  assert.equal(s.player.hp, 0);
  assert.equal(s.cause, "First");
  const turn = s.turn;
  act(s, { type: "wait" });
  assert.equal(s.turn, turn);
});

function arena(className = "Fighter") {
  const s = createRun(className, "arena");
  s.map = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
  s.player.x = 15;
  s.player.y = 12;
  s.enemies = [];
  s.items = [];
  s.features = [];
  return s;
}
function foe(x = 16, y = 12, kind = "melee") {
  return {
    id: 1,
    name: "Target",
    x,
    y,
    kind,
    hp: 50,
    maxHp: 50,
    attack: 10,
    defense: 0,
    xp: 4,
    intent: null,
  };
}
test("Fighter guards then cleaves; enemy attacks never use diagonals", () => {
  const s = arena();
  s.enemies = [foe()];
  act(s, { type: "ability" });
  assert.ok(s.player.empowered);
  assert.ok(s.player.hp >= 34);
  s.enemies.push({ ...foe(15, 13), id: 2 });
  act(s, { type: "move", dx: 1, dy: 0 });
  assert.ok(s.enemies.every((e) => e.hp < 50));
  const other = arena();
  other.enemies = [foe(16, 13)];
  act(other, { type: "wait" });
  assert.equal(other.player.hp, 36);
});
test("Mage bolt respects walls and resources", () => {
  const s = arena("Mage");
  s.enemies = [foe(18, 12)];
  s.map[12][17] = 1;
  act(s, { type: "ability", dx: 1, dy: 0 });
  assert.equal(s.enemies[0].hp, 50);
  assert.equal(s.player.charges, 5);
  s.map[12][17] = 0;
  s.enemies[0].x = 18;
  s.enemies[0].y = 12;
  act(s, { type: "ability", dx: 1, dy: 0 });
  assert.ok(s.enemies[0].hp < 50);
});
test("Priest healing is finite; Rogue step and heavy-armor restrictions work", () => {
  const s = arena("Priest");
  s.player.hp = 1;
  for (let i = 0; i < 4; i++) act(s, { type: "ability" });
  assert.equal(s.player.charges, 0);
  assert.equal(s.turn, 3);
  const r = arena("Rogue");
  act(r, { type: "ability", dx: 1, dy: 0 });
  assert.equal(r.player.x, 17);
  assert.equal(r.player.cooldown, 3);
  assert.equal(act(r, { type: "ability", dx: 1, dy: 0 }), false);
  const h = arena("Rogue");
  h.player.equipment.armor = "plate";
  act(h, { type: "ability", dx: 1, dy: 0 });
  assert.equal(h.player.x, 16);
  assert.equal(h.player.cooldown, 4);
});
test("heavy attack marks a tile, allowing a safe sidestep", () => {
  const s = arena();
  s.enemies = [foe(16, 12, "heavy")];
  act(s, { type: "wait" });
  assert.equal(s.player.hp, 36);
  assert.deepEqual(s.enemies[0].intent.tiles, [{ x: 15, y: 12 }]);
  act(s, { type: "move", dx: 0, dy: 1 });
  assert.equal(s.player.hp, 36);
});
test("potions and equipment cost turns; drop creates collectible ground loot", () => {
  const s = arena();
  s.player.hp = 5;
  act(s, { type: "potion" });
  assert.equal(s.turn, 1);
  assert.equal(s.player.hp, 23);
  s.player.inventory = ["spear"];
  act(s, { type: "use", index: 0 });
  assert.equal(s.turn, 2);
  assert.equal(stats(s).reach, 2);
  act(s, { type: "drop", index: 0 });
  assert.equal(s.items[0].item, "sword");
  assert.equal(s.player.inventory.length, 0);
  act(s, { type: "interact" });
  assert.deepEqual(s.player.inventory, ["sword"]);
});
test("guardians seal stairs and terminal victory cannot take enemy damage", () => {
  const s = arena();
  s.floor = 4;
  s.stairs = { x: 15, y: 12 };
  s.enemies = [{ ...foe(), boss: true }];
  assert.equal(act(s, { type: "interact" }), false);
  assert.equal(s.floor, 4);
  s.floor = 10;
  s.enemies[0].hp = 1;
  s.enemies.push({ ...foe(15, 13), id: 2, attack: 999 });
  act(s, { type: "move", dx: 1, dy: 0 });
  assert.equal(s.status, "won");
  assert.equal(s.player.hp, 36);
});
test("all boss signatures telegraph, resolve and transition to phase two", () => {
  for (const kind of ["slam", "drain", "breath", "charge", "summoner"]) {
    const s = arena();
    const e = { ...foe(16, 12, kind), boss: true, phase: 1 };
    s.enemies = [e];
    act(s, { type: "wait" });
    assert.ok(e.intent, kind);
    assert.equal(s.player.hp, 36);
    e.hp = 20;
    act(s, { type: "move", dx: -1, dy: 0 });
    assert.equal(e.phase, 2);
    assert.equal(e.intent, null);
    if (kind === "summoner") {
      assert.ok(s.enemies.some((e) => e.summoned));
      assert.ok(e.exposed > 0);
    }
  }
});
test("Rogue dodges a pursuer after repositioning and earns an empowered hit", () => {
  const s = arena("Rogue");
  s.enemies = [foe(18, 12)];
  act(s, { type: "ability", dx: 1, dy: 0 });
  assert.equal(s.player.hp, 28);
  assert.equal(s.player.empowered, true);
  act(s, { type: "move", dx: 1, dy: 0 });
  assert.ok(s.enemies[0].hp <= 39);
});
test("seeded actions continue identically after save and resume", () => {
  const a = arena("Mage");
  a.enemies = [foe(18, 12)];
  act(a, { type: "ability", dx: 1, dy: 0 });
  const b = restore(snapshot(a));
  assert.ok(b);
  for (const action of [
    { type: "wait" },
    { type: "ability", dx: 1, dy: 0 },
    { type: "move", dx: 0, dy: 1 },
  ]) {
    act(a, action);
    act(b, action);
    assert.equal(snapshot(a), snapshot(b));
  }
});
test("malformed snapshot fields and unknown item identifiers are rejected", () => {
  const s = createRun("Fighter", "validation");
  for (const change of [
    (s) => s.player.inventory.push("__proto__"),
    (s) => (s.player.class = "constructor"),
    (s) => (s.player.charges = null),
    (s) => (s.rooms[0].w = 1000),
    (s) => (s.pendingPerks = 100000),
    (s) => (s.enemies[0].hp = NaN),
  ]) {
    const bad = JSON.parse(snapshot(s));
    change(bad);
    assert.equal(restore(JSON.stringify(bad)), null);
  }
});
test("committed attacks provide a recovery turn for a counterattack", () => {
  const s = arena();
  s.enemies = [foe(16, 12, "heavy")];
  act(s, { type: "wait" });
  act(s, { type: "move", dx: -1, dy: 0 });
  assert.equal(s.enemies[0].recovery, 1);
  act(s, { type: "move", dx: 1, dy: 0 });
  assert.equal(s.enemies[0].intent, null);
  assert.equal(s.player.hp, 36);
  act(s, { type: "move", dx: 1, dy: 0 });
  assert.ok(s.enemies[0].hp < 50);
});
test("Priest blesses finite potion healing; Rogue gains opportunity by escaping a marked strike", () => {
  const priest = arena("Priest");
  priest.player.hp = 1;
  act(priest, { type: "potion" });
  assert.equal(priest.player.hp, 23);
  const rogue = arena("Rogue");
  rogue.enemies = [foe(16, 12, "heavy")];
  act(rogue, { type: "wait" });
  act(rogue, { type: "ability", dx: 0, dy: 1 });
  assert.equal(rogue.player.empowered, true);
  assert.equal(rogue.player.hp, 28);
});
