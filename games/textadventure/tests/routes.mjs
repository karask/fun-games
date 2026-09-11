import assert from "node:assert/strict";
import { createJourney, act, exits, snapshot, restore } from "../engine.mjs";
export function journey(
  order = ["shard_2", "shard_3", "shard_4", "shard_5"],
  options = {},
) {
  let s = createJourney();
  const actions = [];
  const run = (type, target, extra = {}) => {
    const a = { type, target, ...extra };
    actions.push(a);
    act(s, a);
    const restored = restore(snapshot(s));
    assert.ok(restored, "every intermediate state restores");
    s = restored;
  };
  function go(to) {
    const queue = [[s.room, []]],
      seen = new Set([s.room]);
    while (queue.length) {
      const [room, path] = queue.shift();
      if (room === to) {
        for (const direction of path) run("move", direction);
        return;
      }
      for (const e of exits(s, room))
        if (e.open && !seen.has(e.to)) {
          seen.add(e.to);
          queue.push([e.to, [...path, e.direction]]);
        }
    }
    throw Error("No route to " + to + " from " + s.room);
  }
  run("take", "lantern");
  run("examine", "star_charts");
  go("ruined_village");
  run("examine", "rune");
  run("examine", "burn_marks");
  go("whispering_woods");
  run("examine", "silver_bark");
  if (options.heal) run("take", "healing_herb");
  go("ancient_shrine");
  for (const symbol of ["root", "star", "flame"]) run("puzzle", symbol);
  run("take", "ancient_key");
  if (options.heal) {
    go("kings_road");
    run("use", "healing_herb", { on: "wounded_knight" });
  }
  go("dwarven_gate");
  run("use", "ancient_key", { on: "keyhole" });
  go("abandoned_mine");
  run("take", "pickaxe");
  run("use", "pickaxe", { on: "rubble" });
  if (options.dragon === "return_relic") {
    run("search", "dwarf_skeletons");
    run("take", "dragon_relic");
  }
  go("marsh_path");
  run("use", "lantern", { on: "wisps" });
  go("witchs_cabin");
  run("talk", "yarrow");
  run("reply", options.threaten ? "threaten" : "honest", { npc: "yarrow" });
  if (options.dragon === "demand" || options.shield) run("take", "shield");
  if (options.compass) run("take", "compass");
  if (options.rope) {
    go("crossroads_inn");
    run("take", "rope");
  }
  go("sunken_temple");
  if (options.rope) run("use", "rope", { on: "pillars" });
  else {
    run("search", "pillars");
    run("examine", "temple_carvings");
    for (const symbol of ["wave", "reed", "sun"]) run("puzzle", symbol);
  }
  run("read", "journal");
  go("witchs_cabin");
  if (!options.threaten) run("reply", "unbinding", { npc: "yarrow" });
  go("dragons_pass");
  if (options.shield) run("use", "shield", { on: "heat_shimmer" });
  else run("hearth");
  for (const shard of order) {
    go(
      {
        shard_2: "ancient_shrine",
        shard_3: "crystal_cavern",
        shard_4: "dragons_lair",
        shard_5: "sunken_temple",
      }[shard],
    );
    if (shard === "shard_4") {
      run("talk", "pyraxis");
      run("reply", options.dragon || "vow", { npc: "pyraxis" });
    }
    run("take", shard);
    assert.ok(s.shards.includes(shard));
  }
  go("shadow_vale");
  if (options.compass) run("use", "compass", { on: "dark_sky" });
  else run("examine", "memorial_stones");
  go("citadel_gate");
  if (!options.heal) run("ward");
  go("great_hall");
  run("examine", "banners");
  go("throne_room");
  run("take", "sword");
  return { state: s, actions };
}
