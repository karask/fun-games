import {
  WIDTH,
  HEIGHT,
  SAVE_VERSION,
  DIRS,
  CLASSES,
  ITEMS,
  PERKS,
  MONSTERS,
  lootPool,
} from "./data.mjs";
const key = (p) => p.y * WIDTH + p.x;
const same = (a, b) => a.x === b.x && a.y === b.y;
export const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const walkable = (s, p) => s.map[p.y]?.[p.x] === 0;
export function random(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
const integer = (s, n) => Math.floor(random(s) * n);
const pick = (s, list) => list[integer(s, list.length)];
export function message(s, text, tone = "info") {
  s.messages.push({ text, tone });
  s.messages = s.messages.slice(-4);
}
function event(s, type, p, text = "") {
  s.events.push({
    type,
    x: p.x,
    y: p.y,
    text,
    ...(p.dx !== undefined ? { dx: p.dx, dy: p.dy } : {}),
  });
}
export function stats(s) {
  const p = s.player,
    result = {
      attack: p.attack,
      defense: p.defense,
      maxHp: p.maxHp,
      bolt: 0,
      leech: 0,
      reach: 1,
      opportunity: 0,
      heavy: false,
    };
  for (const id of Object.values(p.equipment))
    if (id) {
      const item = ITEMS[id];
      for (const name of [
        "attack",
        "defense",
        "maxHp",
        "bolt",
        "leech",
        "opportunity",
      ])
        result[name] += item[name] || 0;
      result.reach = Math.max(result.reach, item.reach || 1);
      result.heavy ||= !!item.heavy;
    }
  for (const id of p.perks) {
    const perk = PERKS[id];
    for (const name of ["attack", "defense", "maxHp", "leech"])
      result[name] += perk[name] || 0;
  }
  return result;
}
export function capacity(s) {
  return (
    CLASSES[s.player.class].charges +
    s.player.perks.filter((p) => p === "scholar").length * 2
  );
}
export function createRun(className, seed = String(Date.now()), unlocks = 0) {
  if (!Object.hasOwn(CLASSES, className)) throw new Error("Unknown adventurer");
  seed = String(seed).slice(0, 40);
  let rng = 2166136261;
  for (const c of seed) rng = Math.imul(rng ^ c.charCodeAt(0), 16777619) >>> 0;
  const c = CLASSES[className];
  const s = {
    version: SAVE_VERSION,
    seed,
    rng,
    unlocks,
    status: "playing",
    floor: 1,
    turn: 0,
    totalXp: 0,
    kills: 0,
    guardians: 0,
    messages: [],
    events: [],
    pendingPerks: 0,
    choice: null,
    nextId: 1,
    cause: "",
    player: {
      class: className,
      x: 0,
      y: 0,
      hp: c.hp,
      maxHp: c.hp,
      attack: c.attack,
      defense: c.defense,
      level: 1,
      xp: 0,
      nextXp: 12,
      equipment: { weapon: c.weapon, armor: null, accessory: null },
      inventory: ["potion"],
      perks: [],
      charges: c.charges,
      cooldown: 0,
      guard: false,
      evade: false,
      empowered: false,
      secondWind: false,
    },
  };
  generateFloor(s);
  message(s, CLASSES[className].help);
  return s;
}
export function generateFloor(s) {
  s.map = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(1));
  s.explored = Array(WIDTH * HEIGHT).fill(false);
  s.visible = Array(WIDTH * HEIGHT).fill(false);
  s.rooms = [];
  s.enemies = [];
  s.items = [];
  s.features = [];
  s.choice = null;
  s.events = [];
  // Partitioned rooms guarantee six non-overlapping rooms without retries or a failure case.
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 3; col++) {
      const w = 6 + integer(s, 3),
        h = 6 + integer(s, 2),
        x = col * 10 + 1 + integer(s, 9 - w),
        y = row * 10 + 1 + integer(s, 9 - h);
      const r = {
        x,
        y,
        w,
        h,
        cx: x + Math.floor(w / 2),
        cy: y + Math.floor(h / 2),
        type: ["camp", "shrine", "treasure", "elite", "armory", "gate"][
          row * 3 + col
        ],
      };
      s.rooms.push(r);
      for (let yy = y; yy < y + h; yy++)
        for (let xx = x; xx < x + w; xx++) s.map[yy][xx] = 0;
    }
  for (const [a, b] of [
    [0, 1],
    [1, 2],
    [2, 5],
    [0, 3],
    [3, 4],
    [4, 5],
  ]) {
    let { cx: x, cy: y } = s.rooms[a],
      end = s.rooms[b];
    while (x !== end.cx) {
      s.map[y][x] = 0;
      x += Math.sign(end.cx - x);
    }
    while (y !== end.cy) {
      s.map[y][x] = 0;
      y += Math.sign(end.cy - y);
    }
    s.map[y][x] = 0;
  }
  const start = s.rooms[0],
    end = s.rooms[5];
  s.player.x = start.cx;
  s.player.y = start.cy;
  s.stairs = { x: end.cx, y: end.cy };
  const occupied = new Set([key(s.player), key(s.stairs)]);
  function free(room) {
    const cells = [];
    for (let y = room.y; y < room.y + room.h; y++)
      for (let x = room.x; x < room.x + room.w; x++)
        if (!occupied.has(key({ x, y }))) cells.push({ x, y });
    const p = pick(s, cells);
    if (!p) throw new Error("Room allocation exhausted");
    occupied.add(key(p));
    return p;
  }
  for (const [index, type] of [
    [0, "camp"],
    [1, "shrine"],
    [2, "treasure"],
    [4, "armory"],
  ])
    s.features.push({ ...free(s.rooms[index]), type, used: false });
  s.items.push({ ...free(start), item: "potion" });
  for (const roomIndex of [1, 2, 3, 4, 5]) {
    const count = roomIndex === 3 ? 1 : 1 + (s.floor > 4 ? 1 : 0);
    for (let n = 0; n < count; n++) {
      const tier = Math.min(
        19,
        Math.max(0, (s.floor - 1) * 2 + integer(s, 4) - 1),
      );
      const [name, kind, color] = MONSTERS[tier];
      const elite = roomIndex === 3,
        hp = 8 + s.floor * 3 + (elite ? 12 : 0);
      s.enemies.push({
        id: s.nextId++,
        ...free(s.rooms[roomIndex]),
        name: elite ? `Elite ${name}` : name,
        sprite: name,
        kind,
        color,
        hp,
        maxHp: hp,
        attack: 3 + Math.floor(s.floor * 0.8) + (elite ? 2 : 0),
        defense: Math.floor(s.floor / 3),
        xp: 4 + s.floor * 2 + (elite ? 10 : 0),
        elite,
        intent: null,
      });
    }
  }
  if ([4, 8, 10].includes(s.floor)) {
    const name =
      s.floor === 4
        ? "Orc Chieftain"
        : s.floor === 8
          ? "Vampire Lord"
          : pick(s, ["Ancient Dragon", "Demon King", "Archlich"]);
    const kind =
      name === "Archlich"
        ? "summoner"
        : name.includes("Dragon")
          ? "breath"
          : name.includes("Demon")
            ? "charge"
            : s.floor === 4
              ? "slam"
              : "drain";
    const hp = s.floor === 10 ? 150 : s.floor === 8 ? 100 : 65;
    s.enemies.push({
      id: s.nextId++,
      ...free(end),
      name,
      sprite: name,
      kind,
      color: "#df9378",
      hp,
      maxHp: hp,
      attack: 5 + s.floor,
      defense: Math.floor(s.floor / 3),
      xp: s.floor === 10 ? 180 : s.floor * 15,
      boss: true,
      phase: 1,
      intent: null,
    });
  }
  s.player.guard = false;
  s.player.evade = false;
  s.player.cooldown = 0;
  s.player.secondWind = false;
  s.player.charges = capacity(s);
  message(
    s,
    `Floor ${s.floor}: upper route has a shrine; lower route holds an optional elite.`,
  );
  updateVisibility(s);
}
export function visibleFrom(s, a, b) {
  let x = a.x,
    y = a.y,
    dx = Math.abs(b.x - x),
    dy = -Math.abs(b.y - y),
    sx = x < b.x ? 1 : -1,
    sy = y < b.y ? 1 : -1,
    err = dx + dy;
  while (x !== b.x || y !== b.y) {
    const e = 2 * err,
      ox = x,
      oy = y;
    if (e >= dy) {
      err += dy;
      x += sx;
    }
    if (e <= dx) {
      err += dx;
      y += sy;
    }
    if (x !== ox && y !== oy && s.map[oy]?.[x] === 1 && s.map[y]?.[ox] === 1)
      return false;
    if (x === b.x && y === b.y) return true;
    if (s.map[y]?.[x] !== 0) return false;
  }
  return true;
}
export function updateVisibility(s) {
  s.visible.fill(false);
  const p = s.player;
  for (let y = Math.max(0, p.y - 7); y <= Math.min(HEIGHT - 1, p.y + 7); y++)
    for (let x = Math.max(0, p.x - 7); x <= Math.min(WIDTH - 1, p.x + 7); x++)
      if (Math.hypot(x - p.x, y - p.y) <= 7 && visibleFrom(s, p, { x, y })) {
        s.visible[y * WIDTH + x] = true;
        s.explored[y * WIDTH + x] = true;
      }
}
export function grantXP(s, xp) {
  const p = s.player;
  p.xp += xp;
  s.totalXp += xp;
  while (p.xp >= p.nextXp) {
    p.xp -= p.nextXp;
    p.level++;
    p.nextXp = Math.ceil(p.nextXp * 1.38);
    p.maxHp += 4;
    p.attack++;
    if (p.level % 3 === 0) p.defense++;
    p.hp = Math.min(stats(s).maxHp, p.hp + 8);
    if (p.level % 2 === 0) s.pendingPerks++;
    message(s, `Level ${p.level}! +4 maximum HP, +1 attack.`, "good");
    event(s, "level", p);
  }
}
export function perkOptions(s) {
  if (s.choice?.type === "perk") return s.choice.options;
  const pool = Object.keys(PERKS).filter(
      (id) =>
        (!PERKS[id].unlock || s.unlocks >= PERKS[id].unlock) &&
        (!["veteran", "execution"].includes(id) ||
          !s.player.perks.includes(id)),
    ),
    options = [];
  // Always offer offense, survival and a build option; seeded third slot includes unlocked alternatives.
  options.push("might", "vigor");
  options.push(
    pick(
      s,
      pool.filter((id) => !options.includes(id)),
    ),
  );
  s.choice = { type: "perk", options };
  return options;
}
export function choose(s, index) {
  if (
    s.status !== "playing" ||
    !s.choice ||
    !Number.isInteger(index) ||
    !s.choice.options[index]
  )
    return false;
  const id = s.choice.options[index];
  if (s.choice.type === "perk") {
    s.player.perks.push(id);
    if (id === "vigor") s.player.hp += 8;
    if (id === "scholar")
      s.player.charges = Math.min(capacity(s), s.player.charges + 2);
    s.pendingPerks--;
    message(s, `Learned ${PERKS[id].name}.`, "good");
  } else {
    if (s.player.inventory.length >= 20) {
      message(s, "Backpack full. Make room before claiming this reward.");
      return false;
    }
    s.player.inventory.push(id);
    message(s, `Claimed ${ITEMS[id].name}.`, "good");
    event(s, "loot", s.player);
  }
  s.choice = null;
  return true;
}
function damageEnemy(s, e, amount) {
  if (s.status !== "playing" || e.hp <= 0) return;
  if (s.player.perks.includes("execution") && e.hp < e.maxHp / 2) amount += 4;
  if (e.kind === "summoner" && e.exposed) amount += 4;
  const damage = Math.max(
    1,
    Math.round(amount * (0.9 + random(s) * 0.2)) - e.defense,
  );
  e.hp = Math.max(0, e.hp - damage);
  event(s, "hit", e, String(damage));
  if (e.hp > 0) return;
  s.enemies = s.enemies.filter((other) => other !== e);
  s.kills++;
  grantXP(s, e.xp);
  s.player.hp = Math.min(stats(s).maxHp, s.player.hp + stats(s).leech);
  if (s.player.class === "Mage" && s.kills % 3 === 0)
    s.player.charges = Math.min(capacity(s), s.player.charges + 1);
  if (e.elite || e.boss) {
    const item = pick(s, lootPool(s.floor));
    s.items.push({ x: e.x, y: e.y, item });
    message(s, `${e.name} defeated. A relic remains.`, "good");
  } else if (!e.summoned && random(s) < 0.15)
    s.items.push({ x: e.x, y: e.y, item: s.floor > 5 ? "greater" : "potion" });
  if (e.boss) {
    s.guardians++;
    message(s, "The guardian seal is broken.", "good");
    if (s.floor === 10) {
      s.status = "won";
      s.cause = `Defeated ${e.name}`;
      s.choice = null;
      event(s, "victory", s.player);
    }
  }
}
function hurtPlayer(s, amount, source) {
  const p = s.player;
  if (s.status !== "playing") return;
  if (p.evade) {
    p.evade = false;
    p.empowered = true;
    event(s, "block", p, "DODGE");
    return;
  }
  let damage = Math.max(1, amount - stats(s).defense);
  if (p.guard) {
    damage = Math.max(0, Math.floor(damage * 0.25));
    p.empowered = p.class === "Fighter";
    event(s, "block", p, "GUARD");
  }
  p.hp = Math.max(0, p.hp - damage);
  event(s, "hurt", p, String(damage));
  if (!p.hp && p.perks.includes("veteran") && !p.secondWind) {
    p.hp = 1;
    p.secondWind = true;
    message(s, "Second wind saved you. Reach a shrine!", "good");
  }
  if (!p.hp) {
    s.status = "dead";
    s.cause = source;
    s.choice = null;
    event(s, "death", p);
    message(s, `Felled by ${source}.`, "bad");
  }
}
function pickup(s) {
  for (const item of [...s.items])
    if (same(item, s.player) && s.player.inventory.length < 20) {
      s.player.inventory.push(item.item);
      s.items.splice(s.items.indexOf(item), 1);
      message(s, `Found ${ITEMS[item.item].name}.`, "good");
      event(s, "loot", s.player);
    }
  if (s.items.some((i) => same(i, s.player)))
    message(s, "Backpack full (20). Drop or use an item, then E to collect.");
}
export function nextStep(s, from, to) {
  const blocked = new Set(s.enemies.filter((e) => e !== from).map(key));
  const seen = new Set([key(from)]),
    queue = [{ x: from.x, y: from.y, first: null }];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const [dx, dy] of DIRS) {
      const n = { x: p.x + dx, y: p.y + dy };
      if (!walkable(s, n) || seen.has(key(n)) || blocked.has(key(n))) continue;
      const first = p.first || n;
      if (same(n, to)) return first;
      seen.add(key(n));
      queue.push({ ...n, first });
    }
  }
  return null;
}
function threat(s, e) {
  const p = s.player,
    dx = Math.sign(p.x - e.x),
    dy = Math.sign(p.y - e.y);
  if (["breath", "charge", "ranged"].includes(e.kind)) {
    if (e.kind === "ranged") return [{ x: p.x, y: p.y }];
    const horizontal = Math.abs(p.x - e.x) >= Math.abs(p.y - e.y),
      tiles = [];
    for (let n = 1; n <= 7; n++) {
      const tile = {
        x: e.x + (horizontal ? dx * n : 0),
        y: e.y + (horizontal ? 0 : dy * n),
      };
      if (!walkable(s, tile)) break;
      tiles.push(tile);
      if (e.phase === 2 && e.kind === "breath")
        for (const offset of [-1, 1]) {
          const side = {
            x: tile.x + (horizontal ? 0 : offset),
            y: tile.y + (horizontal ? offset : 0),
          };
          if (walkable(s, side)) tiles.push(side);
        }
    }
    return tiles;
  }
  if (e.kind === "summoner") return [];
  if (e.kind === "heavy") return [{ x: p.x, y: p.y }];
  const tiles = [];
  for (let y = e.y - 2; y <= e.y + 2; y++)
    for (let x = e.x - 2; x <= e.x + 2; x++)
      if (
        distance(e, { x, y }) <= (e.phase === 2 ? 2 : 1) &&
        walkable(s, { x, y })
      )
        tiles.push({ x, y });
  return tiles;
}
function enemyTurn(s) {
  for (const e of [...s.enemies]) {
    if (s.status !== "playing") break;
    if (!s.enemies.includes(e)) continue;
    if (e.boss && e.hp <= e.maxHp / 2 && e.phase === 1) {
      e.phase = 2;
      message(
        s,
        e.kind === "charge"
          ? `${e.name}: phase II! Charges are faster, with no recovery turn.`
          : `${e.name}: phase II! Larger threats, stronger attacks.`,
        "bad",
      );
      event(s, "danger", e);
    }
    if (e.intent) {
      const intent = e.intent;
      e.intent = null;
      e.recovery = e.kind === "charge" && e.phase === 2 ? 0 : 1;
      if (e.kind === "summoner") {
        for (const [dx, dy] of DIRS) {
          const tile = { x: e.x + dx, y: e.y + dy };
          if (
            !walkable(s, tile) ||
            same(tile, s.player) ||
            s.enemies.some((other) => same(tile, other))
          )
            continue;
          if (
            s.enemies.filter((other) => other.summoned).length >=
            (e.phase === 2 ? 4 : 2)
          )
            break;
          s.enemies.push({
            ...tile,
            id: s.nextId++,
            name: "Bone thrall",
            sprite: "Skeleton",
            kind: "melee",
            color: "#d6caac",
            hp: 16,
            maxHp: 16,
            attack: 7,
            defense: 1,
            xp: 0,
            summoned: true,
            intent: null,
          });
        }
        e.exposed = 3;
        message(s, "The Archlich is exposed: strikes deal +4 damage!");
      } else {
        event(s, "strike", e);
        if (intent.tiles.some((t) => same(t, s.player))) {
          hurtPlayer(s, e.attack + (e.phase === 2 ? 2 : 0), e.name);
          if (e.kind === "drain") e.hp = Math.min(e.maxHp, e.hp + 6);
        }
        if (e.kind === "charge" && s.status === "playing")
          for (const t of intent.tiles) {
            if (
              same(t, s.player) ||
              s.enemies.some((o) => o !== e && same(o, t))
            )
              break;
            e.x = t.x;
            e.y = t.y;
          }
      }
      continue;
    }
    if (e.exposed) {
      e.exposed--;
      continue;
    }
    if (e.recovery) {
      e.recovery--;
      continue;
    }
    // The arrival chamber is a true sanctuary; enemies never pursue inside it.
    const camp = s.rooms[0],
      inCamp = (p) =>
        p.x >= camp.x &&
        p.x < camp.x + camp.w &&
        p.y >= camp.y &&
        p.y < camp.y + camp.h;
    if (inCamp(s.player)) continue;
    const d = distance(e, s.player);
    if (d > 10) continue;
    const sight = visibleFrom(s, e, s.player);
    const canThreat =
      e.kind === "melee"
        ? false
        : e.kind === "heavy"
          ? d === 1
          : e.kind === "ranged"
            ? d <= 5 && sight
            : ["slam", "drain"].includes(e.kind)
              ? d <= 2
              : d <= 7 && sight;
    if (canThreat) {
      e.intent = { tiles: threat(s, e) };
      event(s, "danger", e);
      continue;
    }
    if (d === 1) {
      hurtPlayer(s, e.attack, e.name);
      continue;
    }
    const next = nextStep(s, e, s.player);
    if (next && !inCamp(next)) {
      e.x = next.x;
      e.y = next.y;
    }
  }
  s.player.guard = false;
  s.player.evade = false;
}
function melee(s, e) {
  const p = s.player,
    st = stats(s),
    empowered = p.empowered;
  p.empowered = false;
  const bonus = empowered
    ? 4 + st.opportunity + p.perks.filter((id) => id === "scholar").length * 3
    : 0;
  event(s, "lunge", { ...p, dx: e.x - p.x, dy: e.y - p.y });
  damageEnemy(s, e, st.attack + bonus);
  if (empowered && p.class === "Fighter")
    for (const other of [...s.enemies])
      if (distance(p, other) === 1) damageEnemy(s, other, st.attack);
}
export function act(s, action) {
  if (s.status !== "playing" || s.choice || s.pendingPerks) return false;
  const p = s.player;
  s.events = [];
  let spent = false;
  const { type, dx = 0, dy = 0 } = action;
  if (
    ["move", "ability", "reach"].includes(type) &&
    (dx || dy) &&
    !DIRS.some((d) => d[0] === dx && d[1] === dy)
  )
    return false;
  if (type === "move") {
    if (!dx && !dy) return false;
    const dest = { x: p.x + dx, y: p.y + dy };
    if (!walkable(s, dest)) return false;
    const enemy = s.enemies.find((e) => same(e, dest));
    if (enemy) melee(s, enemy);
    else {
      p.x = dest.x;
      p.y = dest.y;
      pickup(s);
      event(s, "step", p);
    }
    spent = true;
  } else if (type === "wait") {
    spent = true;
    event(s, "wait", p);
  } else if (type === "reach") {
    if (!dx && !dy) return false;
    const st = stats(s);
    for (let n = 1; n <= st.reach; n++) {
      const tile = { x: p.x + dx * n, y: p.y + dy * n };
      if (!walkable(s, tile)) break;
      const e = s.enemies.find((e) => same(e, tile));
      if (e) {
        melee(s, e);
        spent = true;
        break;
      }
    }
    if (!spent) message(s, "No enemy in weapon range.");
  } else if (type === "ability") {
    if (p.class === "Fighter") {
      p.guard = true;
      spent = true;
      event(s, "block", p, "GUARD");
    }
    if (p.class === "Priest") {
      if (p.charges) {
        p.charges--;
        p.hp = Math.min(stats(s).maxHp, p.hp + 10);
        p.guard = true;
        spent = true;
        event(s, "heal", p, "WARD");
      } else message(s, "No sanctuary charges. Find a shrine.");
    }
    if (p.class === "Mage") {
      if (!p.charges) {
        message(
          s,
          "No arc charges. Shrines, new floors and every third kill restore them.",
        );
        return false;
      }
      if (!dx && !dy) return false;
      for (let n = 1; n <= 6; n++) {
        const tile = { x: p.x + dx * n, y: p.y + dy * n };
        if (!walkable(s, tile)) break;
        event(s, "bolt", tile);
        const e = s.enemies.find((e) => same(e, tile));
        if (e) {
          damageEnemy(s, e, stats(s).attack + stats(s).bolt + 4);
          break;
        }
      }
      p.charges--;
      spent = true;
    }
    if (p.class === "Rogue") {
      if (p.cooldown) {
        message(s, `Shadowstep ready in ${p.cooldown} turns.`);
        return false;
      }
      if (!dx && !dy) return false;
      const threatened = s.enemies.some((e) =>
        e.intent?.tiles.some((tile) => same(tile, p)),
      );
      for (let n = 0; n < (stats(s).heavy ? 1 : 2); n++) {
        const tile = { x: p.x + dx, y: p.y + dy };
        if (!walkable(s, tile) || s.enemies.some((e) => same(e, tile))) break;
        p.x = tile.x;
        p.y = tile.y;
        spent = true;
      }
      if (spent) {
        p.evade = true;
        if (threatened) p.empowered = true;
        p.cooldown = stats(s).heavy ? 5 : 4;
        pickup(s);
        event(s, "dodge", p);
      }
    }
  } else if (type === "potion" || type === "use") {
    const index =
        type === "potion"
          ? p.inventory.findIndex((id) => ITEMS[id].heal)
          : action.index,
      item = ITEMS[p.inventory[index]];
    if (!item) return false;
    if (item.heal) {
      if (p.hp >= stats(s).maxHp) {
        message(s, "Already at full health.");
        return false;
      }
      const healing = item.heal + (p.class === "Priest" ? 4 : 0);
      p.hp = Math.min(stats(s).maxHp, p.hp + healing);
      p.inventory.splice(index, 1);
      event(s, "heal", p, `+${healing}`);
      spent = true;
    } else {
      const previous = p.equipment[item.type];
      p.equipment[item.type] = p.inventory[index];
      p.inventory.splice(index, 1);
      if (previous) p.inventory.push(previous);
      p.hp = Math.min(p.hp, stats(s).maxHp);
      message(s, `Equipped ${item.name}. One turn passes.`);
      spent = true;
    }
  } else if (type === "drop") {
    if (!p.inventory[action.index]) return false;
    s.items.push({
      x: p.x,
      y: p.y,
      item: p.inventory.splice(action.index, 1)[0],
    });
    message(s, "Item placed at your feet. E picks it up.");
    spent = true;
  } else if (type === "interact") {
    if (same(p, s.stairs)) {
      if (s.enemies.some((e) => e.boss)) {
        message(s, "The guardian seals the descent. Defeat it first.", "bad");
        return false;
      }
      if (s.floor === 10) return false;
      s.floor++;
      s.turn++;
      p.hp = Math.min(stats(s).maxHp, p.hp + 6);
      generateFloor(s);
      event(s, "stairs", p);
      return true;
    }
    const f = s.features.find((f) => distance(f, p) <= 1 && !f.used);
    if (f) {
      if (f.type === "camp" || f.type === "shrine") {
        p.hp = Math.min(stats(s).maxHp, p.hp + (f.type === "camp" ? 12 : 20));
        p.charges = capacity(s);
        event(s, "heal", p, "RESTORED");
        message(
          s,
          `${f.type === "camp" ? "Camp" : "Shrine"} restored health and ability charges. One use per floor.`,
          "good",
        );
      } else {
        if (p.inventory.length >= 20) {
          message(s, "Make room in your backpack before claiming a reward.");
          return false;
        }
        if (f.type === "treasure") {
          if (p.hp <= 6) {
            message(s, "The blood chest demands 6 HP. Recover first.");
            return false;
          }
          p.hp -= 6;
          message(s, "Paid 6 HP to open the blood chest.");
        }
        const pool = lootPool(s.floor),
          options = [];
        while (options.length < 3) {
          const id = pick(s, pool);
          if (!options.includes(id)) options.push(id);
        }
        s.choice = { type: "loot", options };
      }
      f.used = true;
      spent = true;
    } else if (s.items.some((i) => same(i, p))) {
      pickup(s);
      spent = true;
    } else {
      message(
        s,
        "Stand beside a shrine, chest or camp; stand on stairs to descend.",
      );
      return false;
    }
  }
  if (spent) {
    s.turn++;
    if (p.cooldown > 0) p.cooldown--;
    if (s.status === "playing") enemyTurn(s);
    updateVisibility(s);
  }
  return spent;
}
export function snapshot(s) {
  const copy = { ...s, events: [] };
  return JSON.stringify(copy);
}
export function restore(text) {
  try {
    if (typeof text !== "string" || text.length > 200000) return null;
    const s = JSON.parse(text),
      p = s.player;
    if (
      s.version !== SAVE_VERSION ||
      s.status !== "playing" ||
      !Object.hasOwn(CLASSES, p?.class) ||
      !Number.isInteger(s.floor) ||
      s.floor < 1 ||
      s.floor > 10 ||
      !Number.isInteger(s.rng) ||
      !Number.isInteger(s.turn) ||
      s.turn < 0
    )
      return null;
    if (
      !Array.isArray(s.map) ||
      s.map.length !== HEIGHT ||
      s.map.some(
        (row) =>
          !Array.isArray(row) ||
          row.length !== WIDTH ||
          row.some((t) => t !== 0 && t !== 1),
      )
    )
      return null;
    const point = (p) =>
      p && Number.isInteger(p.x) && Number.isInteger(p.y) && walkable(s, p);
    if (
      !point(p) ||
      !point(s.stairs) ||
      !Array.isArray(s.rooms) ||
      s.rooms.length !== 6 ||
      !Array.isArray(s.enemies) ||
      !Array.isArray(s.items) ||
      !Array.isArray(s.features)
    )
      return null;
    if (
      !Array.isArray(p.inventory) ||
      p.inventory.length > 20 ||
      p.inventory.some((id) => !Object.hasOwn(ITEMS, id)) ||
      !p.equipment ||
      Object.entries(p.equipment).some(
        ([slot, id]) =>
          !["weapon", "armor", "accessory"].includes(slot) ||
          (id && ITEMS[id]?.type !== slot),
      ) ||
      !Array.isArray(p.perks) ||
      p.perks.some((id) => !Object.hasOwn(PERKS, id))
    )
      return null;
    if (
      !Number.isFinite(p.hp) ||
      p.hp <= 0 ||
      !Number.isFinite(p.maxHp) ||
      !Number.isFinite(p.attack) ||
      !Number.isFinite(p.defense) ||
      !Number.isFinite(p.xp) ||
      !Number.isFinite(p.nextXp) ||
      p.nextXp <= 0
    )
      return null;
    if (
      s.enemies.some(
        (e) =>
          !point(e) ||
          !Number.isFinite(e.hp) ||
          e.hp <= 0 ||
          !Number.isFinite(e.attack) ||
          !Number.isFinite(e.defense) ||
          !Number.isFinite(e.xp) ||
          ![
            "melee",
            "heavy",
            "ranged",
            "slam",
            "drain",
            "breath",
            "charge",
            "summoner",
          ].includes(e.kind) ||
          (e.intent &&
            (!Array.isArray(e.intent.tiles) ||
              e.intent.tiles.some((t) => !point(t)))),
      )
    )
      return null;
    if (
      s.items.some((i) => !point(i) || !Object.hasOwn(ITEMS, i.item)) ||
      s.features.some(
        (f) =>
          !point(f) ||
          !["camp", "shrine", "treasure", "armory"].includes(f.type),
      )
    )
      return null;
    if (
      !Array.isArray(s.explored) ||
      s.explored.length !== WIDTH * HEIGHT ||
      !Array.isArray(s.messages) ||
      !Number.isInteger(s.pendingPerks) ||
      s.pendingPerks < 0
    )
      return null;
    const finite = (value, min = 0, max = 1e9) =>
      Number.isFinite(value) && value >= min && value <= max;
    if (
      typeof s.seed !== "string" ||
      s.seed.length > 40 ||
      !finite(s.totalXp) ||
      !finite(s.kills) ||
      !finite(s.guardians) ||
      !finite(s.nextId, 1) ||
      !finite(s.unlocks) ||
      s.pendingPerks > 100
    )
      return null;
    if (
      [
        "level",
        "xp",
        "nextXp",
        "maxHp",
        "attack",
        "defense",
        "charges",
        "cooldown",
      ].some((k) => !finite(p[k])) ||
      p.level < 1 ||
      p.hp > stats(s).maxHp
    )
      return null;
    if (
      ["weapon", "armor", "accessory"].some(
        (slot) => !Object.hasOwn(p.equipment, slot),
      )
    )
      return null;
    if (
      s.rooms.some(
        (r) =>
          !Number.isInteger(r.x) ||
          !Number.isInteger(r.y) ||
          !Number.isInteger(r.w) ||
          !Number.isInteger(r.h) ||
          r.x < 1 ||
          r.y < 1 ||
          r.w < 1 ||
          r.h < 1 ||
          r.x + r.w >= WIDTH ||
          r.y + r.h >= HEIGHT,
      )
    )
      return null;
    if (
      s.enemies.length > 100 ||
      s.enemies.some(
        (e) =>
          !finite(e.maxHp, 1) ||
          e.hp > e.maxHp ||
          typeof e.name !== "string" ||
          !finite(e.id, 1),
      ) ||
      new Set(s.enemies.map(key)).size !== s.enemies.length
    )
      return null;
    if (
      s.messages.length > 4 ||
      s.messages.some(
        (m) => !m || typeof m.text !== "string" || typeof m.tone !== "string",
      ) ||
      s.explored.some((v) => typeof v !== "boolean")
    )
      return null;
    if (
      s.choice &&
      (!["perk", "loot"].includes(s.choice.type) ||
        !Array.isArray(s.choice.options) ||
        s.choice.options.length !== 3 ||
        s.choice.options.some(
          (id) => !Object.hasOwn(s.choice.type === "perk" ? PERKS : ITEMS, id),
        ))
    )
      return null;
    s.visible = Array(WIDTH * HEIGHT).fill(false);
    s.events = [];
    updateVisibility(s);
    return s;
  } catch {
    return null;
  }
}
