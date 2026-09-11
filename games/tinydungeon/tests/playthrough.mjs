// Deterministic tactical bot: no stat, map, HP or RNG modifications.
// Omniscient navigation makes these regression/balance probes, not human win-rate estimates.
import {
  createRun,
  act,
  choose,
  perkOptions,
  stats,
  distance,
  walkable,
  visibleFrom,
} from "../engine.mjs";
import { ITEMS, DIRS, CLASSES } from "../data.mjs";
import { pathToFileURL } from "node:url";
let cachedState, cachedTurn, routes;
function path(s, target) {
  if (cachedState !== s || cachedTurn !== s.turn) {
    cachedState = s;
    cachedTurn = s.turn;
    routes = new Map();
    const p = s.player,
      q = [{ x: p.x, y: p.y, length: 0, first: null }],
      occupied = new Set(s.enemies.map((e) => `${e.x},${e.y}`));
    routes.set(`${p.x},${p.y}`, { dx: 0, dy: 0, length: 0 });
    for (let i = 0; i < q.length; i++)
      for (const [dx, dy] of DIRS) {
        const n = { x: q[i].x + dx, y: q[i].y + dy },
          k = `${n.x},${n.y}`;
        if (!walkable(s, n) || routes.has(k)) continue;
        const first = q[i].first || { dx, dy },
          length = q[i].length + 1;
        routes.set(k, { ...first, length });
        if (!occupied.has(k)) q.push({ ...n, first, length });
      }
  }
  return routes.get(`${target.x},${target.y}`) || null;
}
const value = (id, c) => {
  const i = ITEMS[id];
  return (
    (i.attack || 0) * 2 +
    (i.defense || 0) * 3 +
    (i.maxHp || 0) * 0.4 +
    (i.leech || 0) * 3 +
    (c === "Mage" ? (i.bolt || 0) * 1.5 : 0) +
    (i.reach || 0)
  );
};
export function botAction(s, execute = act, select = choose) {
  const p = s.player,
    st = stats(s);
  if (s.choice || s.pendingPerks) {
    if (!s.choice) perkOptions(s);
    const options = s.choice.options;
    select(
      s,
      options.indexOf(
        [...options].sort((a, b) =>
          s.choice.type === "loot"
            ? value(b, p.class) - value(a, p.class)
            : ["vigor", "might", "resolve", "hunter"].indexOf(a) -
              ["vigor", "might", "resolve", "hunter"].indexOf(b),
        )[0],
      ),
    );
    return;
  }
  if (p.hp < st.maxHp * 0.5 && p.inventory.some((id) => ITEMS[id].heal)) {
    execute(s, { type: "potion" });
    return;
  }
  if (p.class === "Priest" && p.charges && p.hp <= st.maxHp - 10) {
    execute(s, { type: "ability" });
    return;
  }
  const threats = s.enemies.flatMap((e) => e.intent?.tiles || []),
    danger = threats.some((t) => distance(t, p) === 0);
  const enemies = [...s.enemies].sort(
    (a, b) => (path(s, a)?.length ?? 999) - (path(s, b)?.length ?? 999),
  );
  const lethal = enemies.find(
    (e) =>
      distance(e, p) === 1 &&
      e.hp <= Math.max(1, Math.round(st.attack * 0.9) - e.defense),
  );
  if (lethal) {
    execute(s, { type: "move", dx: lethal.x - p.x, dy: lethal.y - p.y });
    return;
  }
  const counter = enemies.find((e) => distance(e, p) === 1);
  if (counter && (p.empowered || (danger && p.hp > st.maxHp * 0.7))) {
    execute(s, { type: "move", dx: counter.x - p.x, dy: counter.y - p.y });
    return;
  }
  if (danger) {
    const safe = DIRS.filter(([dx, dy]) => {
      const t = { x: p.x + dx, y: p.y + dy };
      return (
        walkable(s, t) &&
        !s.enemies.some((e) => distance(e, t) === 0) &&
        !threats.some((e) => distance(e, t) === 0)
      );
    }).sort(
      (a, b) =>
        distance({ x: p.x + a[0], y: p.y + a[1] }, enemies[0]) -
        distance({ x: p.x + b[0], y: p.y + b[1] }, enemies[0]),
    );
    if (safe.length) {
      const [dx, dy] = safe[0];
      execute(s, {
        type: p.class === "Rogue" && !p.cooldown ? "ability" : "move",
        dx,
        dy,
      });
      return;
    }
    if (p.class === "Fighter") {
      execute(s, { type: "ability" });
      return;
    }
  }
  const e = enemies[0];
  if (e && distance(e, p) === 1) {
    if (
      p.class === "Fighter" &&
      !p.empowered &&
      e.kind === "melee" &&
      e.hp > st.attack &&
      e.attack > st.defense + 3
    ) {
      execute(s, { type: "ability" });
      return;
    }
    execute(s, { type: "move", dx: e.x - p.x, dy: e.y - p.y });
    return;
  }
  if (p.class === "Mage" && p.charges) {
    const e = enemies.find(
      (e) =>
        (e.x === p.x || e.y === p.y) &&
        distance(e, p) <= 6 &&
        visibleFrom(s, p, e),
    );
    if (e) {
      execute(s, {
        type: "ability",
        dx: Math.sign(e.x - p.x),
        dy: Math.sign(e.y - p.y),
      });
      return;
    }
  }
  const better = p.inventory.findIndex(
    (id) =>
      !ITEMS[id].heal &&
      value(id, p.class) >
        value(p.equipment[ITEMS[id].type] || "potion", p.class),
  );
  if (better >= 0) {
    execute(s, { type: "use", index: better });
    return;
  }
  const recovery = s.features.filter(
    (f) =>
      !f.used &&
      ["camp", "shrine"].includes(f.type) &&
      (p.hp < st.maxHp * 0.75 ||
        (["Mage", "Priest"].includes(p.class) && p.charges === 0)),
  );
  const loot = s.features.filter(
    (f) => !f.used && f.type === "armory" && p.inventory.length < 18,
  );
  const targets = [...recovery, ...loot].sort(
    (a, b) => (path(s, a)?.length ?? 999) - (path(s, b)?.length ?? 999),
  );
  if (targets[0]) {
    if (distance(targets[0], p) <= 1) {
      execute(s, { type: "interact" });
      return;
    }
    const step = path(s, targets[0]);
    if (step) {
      execute(s, { type: "move", ...step });
      return;
    }
  }
  const target = e || s.stairs;
  if (distance(target, p) === 0) {
    execute(s, { type: "interact" });
    return;
  }
  const step = path(s, target);
  execute(s, step ? { type: "move", ...step } : { type: "wait" });
}
export function play(className, seed, limit = 5000) {
  const s = createRun(className, seed);
  let actions = 0;
  while (s.status === "playing" && actions++ < limit) botAction(s);
  return s;
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = {};
  for (const c of Object.keys(CLASSES)) {
    const results = [];
    for (let i = 1; i <= 20; i++) {
      const s = play(c, `balance-${i}`);
      results.push({
        status: s.status,
        floor: s.floor,
        hp: s.player.hp,
        turns: s.turn,
        cause: s.cause,
      });
    }
    report[c] = {
      wins: results.filter((r) => r.status === "won").length,
      stalled: results.filter((r) => r.status === "playing").length,
      meanFloor: results.reduce((n, r) => n + r.floor, 0) / results.length,
      results,
    };
  }
  console.log(JSON.stringify(report, null, 2));
}
