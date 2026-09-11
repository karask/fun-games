import test from "node:test";
import assert from "node:assert/strict";
import {
  createJourney,
  act,
  availableItems,
  exits,
  snapshot,
  restore,
  dialogueTopics,
  travel,
} from "../engine.mjs";
import { rooms, SHARDS } from "../story.mjs";
const doAct = (s, type, target, extra = {}) =>
  act(s, { type, target, ...extra });
test("fresh worlds reset independently and entering the Great Hall is safe", () => {
  const a = createJourney();
  doAct(a, "take", "lantern");
  const b = createJourney();
  assert.ok(availableItems(b).includes("lantern"));
  assert.ok(!availableItems(a).includes("lantern"));
  a.room = "citadel_gate";
  a.flags.citadel_open = true;
  doAct(a, "move", "south");
  assert.equal(a.room, "great_hall");
  assert.ok(a.history.length);
});
test("reading the journal obeys the same reachability rule as pickup", () => {
  const s = createJourney();
  s.room = "sunken_temple";
  doAct(s, "read", "journal");
  assert.equal(s.evidence.includes("ritual"), false);
  doAct(s, "take", "journal");
  assert.equal(s.inventory.includes("journal"), false);
  s.flags.chasm_crossed = true;
  doAct(s, "read", "journal");
  assert.ok(s.evidence.includes("ritual"));
});
test("saves restore mutable room state and reject malformed data", () => {
  const s = createJourney();
  doAct(s, "take", "lantern");
  assert.deepEqual(restore(snapshot(s)), s);
  assert.equal(restore("{}"), null);
  assert.equal(restore("{"), null);
  const bad = JSON.parse(snapshot(s));
  bad.inventory.push("__proto__");
  assert.equal(restore(JSON.stringify(bad)), null);
});
test("talking is safe; final actions are explicit and require the assembled Crown", () => {
  const s = createJourney();
  s.room = "throne_room";
  s.flags.crown_assembled = true;
  doAct(s, "talk", "aldric_throne");
  assert.equal(s.ending, null);
  assert.ok(dialogueTopics(s, "aldric_throne").length);
  doAct(s, "finish", "true");
  assert.equal(s.ending, null);
  s.inventory.push("sword");
  doAct(s, "finish", "true");
  assert.equal(s.ending, "true");
  const history = s.history.length;
  doAct(s, "move", "north");
  assert.equal(s.history.length, history);
});
test("temple supports rope and hidden sluices; shrine uses learned symbols", () => {
  for (const method of ["rope", "sluices"]) {
    const s = createJourney();
    s.room = "sunken_temple";
    if (method === "rope") {
      s.inventory.push("rope");
      doAct(s, "use", "rope", { on: "chasm" });
    } else {
      doAct(s, "search", "pillars");
      for (const symbol of ["wave", "reed", "sun"]) doAct(s, "puzzle", symbol);
    }
    assert.ok(s.flags.chasm_crossed);
  }
  const s = createJourney();
  s.room = "ancient_shrine";
  assert.ok(!availableItems(s).includes("shard_2"));
  for (const symbol of ["root", "star", "flame"]) doAct(s, "puzzle", symbol);
  assert.ok(availableItems(s).includes("shard_2"));
  assert.ok(s.evidence.includes("shrine"));
});
import { journey } from "./routes.mjs";
import { validateContent, epilogue } from "../engine.mjs";
const permutations = (a) =>
  a.length
    ? a.flatMap((v, i) =>
        permutations(a.filter((_, j) => j !== i)).map((rest) => [v, ...rest]),
      )
    : [[]];
test("every shard order supports all three endings and an unbound release", () => {
  for (const order of permutations(SHARDS.slice(1))) {
    const { state } = journey(order);
    assert.equal(state.shards.length, 5);
    for (const ending of ["dark", "true", "domination"]) {
      const s = restore(snapshot(state));
      doAct(s, "assemble");
      doAct(s, "talk", "aldric_throne");
      assert.equal(s.ending, null);
      doAct(s, "finish", ending);
      assert.equal(s.ending, ending);
      assert.equal(epilogue(s).length, 4);
    }
    const s = restore(snapshot(state));
    doAct(s, "unmake");
    assert.equal(s.ending, "true");
    assert.ok(s.flags.unbound);
    assert.ok(!s.flags.crown_assembled);
  }
});
test("optional tools and relationship branches remain viable", () => {
  for (const dragon of ["return_relic", "memory", "vow", "demand"]) {
    const { state: s } = journey(undefined, {
      dragon,
      heal: true,
      rope: true,
      shield: true,
      compass: true,
      threaten: dragon === "demand",
    });
    assert.ok(s.flags.knight_helped);
    assert.ok(s.flags.chasm_crossed);
    assert.ok(s.flags.dragon_permission);
    if (dragon === "demand") {
      assert.ok(s.flags.yarrow_intimidated);
      assert.ok(!s.flags.unbinding_known);
    }
    if (dragon === "return_relic")
      assert.ok(!s.inventory.includes("dragon_relic"));
  }
});
test("content references, partial puzzles, hints and travel locks are valid", () => {
  assert.deepEqual(validateContent(), []);
  const s = createJourney();
  s.room = "ancient_shrine";
  s.visited.push(s.room);
  doAct(s, "puzzle", "root");
  const loaded = restore(snapshot(s));
  doAct(loaded, "puzzle", "star");
  doAct(loaded, "puzzle", "flame");
  assert.ok(loaded.flags.shrine_awake);
  for (let i = 0; i < 5; i++) doAct(loaded, "hint");
  assert.equal(loaded.hints.ancient_shrine, 3);
  assert.equal(travel(loaded, "throne_room"), false);
  assert.equal(travel(loaded, "elders_hut"), false);
});
test("inspections reflect solved obstacles and collected scenes remove shards", async () => {
  const s = createJourney();
  s.room = "ancient_shrine";
  for (const symbol of ["root", "star", "flame"]) doAct(s, "puzzle", symbol);
  doAct(s, "examine", "altar_runes");
  assert.match(s.history.at(-1).text, /open altar/);
  const { scene } = await import("../art.mjs");
  for (const room of Object.keys(rooms)) {
    const art = scene(room);
    assert.ok(art.includes("<svg"));
    assert.ok(!art.includes("undefined"));
    assert.ok(!art.includes("NaN"));
  }
  assert.ok(scene("ancient_shrine").includes('class="shard-light"'));
  assert.ok(
    !scene("ancient_shrine", { taken: ["shard_2"] }).includes(
      'class="shard-light"',
    ),
  );
});
