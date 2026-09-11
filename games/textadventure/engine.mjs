import {
  VERSION,
  rooms,
  items,
  npcs,
  SHARDS,
  MEMORIES,
  EVIDENCE,
  OBJECT_EVIDENCE,
  PUZZLES,
  ENDINGS,
} from "./story.mjs";
const own = (o, k) => Object.hasOwn(o, k);
export const nameOf = (id) =>
  items[id]?.name ||
  npcs[id]?.name ||
  id.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
export function record(s, text, kind = "action", speaker = "") {
  s.history.push({ id: ++s.serial, room: s.room, text, kind, speaker });
  if (s.history.length > 600) s.history.shift();
}
export function discover(s, id) {
  if (!own(EVIDENCE, id) || s.evidence.includes(id)) return false;
  s.evidence.push(id);
  record(s, `Evidence recorded: ${EVIDENCE[id].title}.`, "discovery");
  return true;
}
export function createJourney() {
  const s = {
    version: VERSION,
    room: "elders_hut",
    inventory: ["shard_1"],
    taken: [],
    shards: ["shard_1"],
    flags: {},
    visited: ["elders_hut"],
    evidence: [],
    history: [],
    serial: 0,
    actions: 0,
    puzzles: { ancient_shrine: [], sunken_temple: [] },
    hints: {},
    conversation: null,
    ending: null,
  };
  record(
    s,
    "Aldric has placed the first shard in your hand. His lantern still hangs beside the door. Your journey begins with what you choose to notice.",
    "arrival",
  );
  record(s, MEMORIES.shard_1.text, "memory");
  return s;
}
export function reachable(s, id) {
  if (s.inventory.includes(id)) return true;
  if (
    !(
      rooms[s.room].items.includes(id) ||
      (id === "dragon_relic" &&
        s.room === "abandoned_mine" &&
        s.flags.relic_found)
    ) ||
    s.taken.includes(id)
  )
    return false;
  if (["journal", "shard_5"].includes(id) && !s.flags.chasm_crossed)
    return false;
  if (id === "shard_2" && !s.flags.shrine_awake) return false;
  if (id === "shard_4" && !s.flags.dragon_permission) return false;
  return true;
}
export function availableItems(s) {
  return [
    ...rooms[s.room].items,
    ...(s.room === "abandoned_mine" && s.flags.relic_found
      ? ["dragon_relic"]
      : []),
  ].filter((id) => !s.taken.includes(id) && reachable(s, id));
}
export function roomNPCs(s) {
  return s.room === "throne_room" && s.flags.crown_assembled
    ? ["aldric_throne"]
    : rooms[s.room].npcs;
}
export function objects(s) {
  return Object.keys(rooms[s.room].examine).filter(
    (id) => id !== "drain_mechanism" || s.flags.drain_found,
  );
}
const GATES = {
  dwarven_gate: {
    east: [
      "abandoned_mine",
      "gate_opened",
      "An ancient key could open the dwarven lock.",
    ],
  },
  abandoned_mine: {
    east: [
      "crystal_cavern",
      "rubble_cleared",
      "The mine’s rubble needs a strong tool.",
    ],
  },
  marsh_path: {
    south: [
      "witchs_cabin",
      "marsh_lit",
      "A steady lantern can turn the wisps aside.",
    ],
  },
  dragons_pass: {
    up: [
      "dragons_lair",
      "heat_survived",
      "Use a warded shield, or a word learned from the awakened shrine.",
    ],
  },
  kings_road: {
    up: [
      "shadow_vale",
      "all_shards",
      "The trail appears when all five shards resonate.",
    ],
  },
  shadow_vale: {
    south: [
      "citadel_gate",
      "vale_charted",
      "Use the compass, or read the memorial stones to find the path.",
    ],
  },
  citadel_gate: {
    south: [
      "great_hall",
      "citadel_open",
      "The ward recognizes its maker—or a royal witness.",
    ],
  },
};
export function exits(s, roomId = s.room) {
  const result = Object.entries(rooms[roomId].exits).map(([direction, to]) => ({
    direction,
    to,
    open: true,
    reason: "",
  }));
  for (const [direction, [to, flag, reason]] of Object.entries(
    GATES[roomId] || {},
  )) {
    const index = result.findIndex((e) => e.direction === direction);
    const e = { direction, to, open: !!s.flags[flag], reason };
    if (index >= 0) result[index] = e;
    else result.push(e);
  }
  return result;
}
function enter(s, id) {
  s.room = id;
  s.conversation = null;
  if (!s.visited.includes(id)) {
    s.visited.push(id);
    record(s, `You arrive at ${rooms[id].title}.`, "arrival");
  } else record(s, `You return to ${rooms[id].title}.`, "arrival");
  if (id === "citadel_gate" && s.flags.knight_healed && !s.flags.citadel_open) {
    s.flags.citadel_open = true;
    s.flags.knight_helped = true;
    record(
      s,
      "The knight waits beneath the gate. “You saved my life. Let me open the road for yours.” His royal seal stills the ward.",
      "dialogue",
      "The knight",
    );
  }
  if (id === "throne_room" && !s.flags.finale_seen) {
    s.flags.finale_seen = true;
    record(
      s,
      "This is the final chamber. You can still leave, investigate, and return. Binding the fragments will summon Aldric; speaking to him will never make a decision for you.",
      "special",
    );
  }
}
export function travel(s, to) {
  if (s.ending || !s.visited.includes(to) || to === s.room) return false;
  const queue = [s.room],
    seen = new Set(queue);
  let found = false;
  for (let i = 0; i < queue.length; i++) {
    if (queue[i] === to) {
      found = true;
      break;
    }
    for (const e of exits(s, queue[i]))
      if (e.open && s.visited.includes(e.to) && !seen.has(e.to)) {
        seen.add(e.to);
        queue.push(e.to);
      }
  }
  if (!found) return false;
  s.actions++;
  enter(s, to);
  return true;
}
export function describe(s) {
  const r = rooms[s.room],
    has = (id) => !s.taken.includes(id);
  switch (s.room) {
    case "ancient_shrine":
      return `${s.flags.shrine_awake ? "The awakened altar glows with warm starlight. The waking word “Hearth” remains on its rim." : "Three silent rings guard the altar. Their root, star and flame symbols await a sequence."}\n\n${has("shard_2") ? "The Root Shard waits above the altar." : "The shard’s resting place is empty."} ${has("ancient_key") ? "An ancient key hangs beside it." : ""}\n\nThe Whispering Woods lie NORTH.`;
    case "sunken_temple":
      return `${s.flags.chasm_crossed ? (s.flags.temple_drained ? "The sluices stand open. A stone causeway crosses the drained chasm." : "Your rope bridge links the columns to the central island.") : "Dark water separates you from the central island. Pillars could anchor a rope; carvings hint at another crossing."}\n\n${has("shard_5") ? "The Tide Shard rests on the pedestal." : ""} ${has("journal") ? "Elara’s journal lies beside it." : ""}\n\nThe witch’s cabin lies WEST.`;
    case "dragons_lair":
      return `${s.flags.dragon_permission ? "Pyraxis has agreed to release his charge." : "Pyraxis rests one claw beside the Ember Shard. Talk to him before attempting to take it."} ${has("shard_4") ? "The shard glows among the offerings." : "Its place among the offerings is empty."}\n\nThe mountain pass lies DOWN.`;
    case "witchs_cabin":
      return `Yarrow tends a copper cauldron in the crooked house above the marsh. ${s.flags.yarrow_intimidated ? "She keeps her distance." : s.flags.yarrow_trust ? "She looks up with cautious hope." : "Her eyes linger on your face."}\n\n${has("shield") ? "A warded shield rests against the wall." : ""} ${has("compass") ? "A brass compass waits on a shelf." : ""}\n\nThe temple lies EAST. The marsh lies NORTH.`;
    case "shadow_vale":
      return `${s.flags.vale_charted ? "You have charted a safe path between the memorial stones." : "The valley’s shifting paths turn around memorial stones. A compass or the memorial inscriptions may guide you."}\n\nThe citadel lies SOUTH. The King’s Road lies DOWN; you can still return to the realm.`;
    case "citadel_gate":
      return `${s.flags.citadel_open ? "The ward is quiet and the black gates stand open." : "A pale ward seals the black iron gates. It watches the rune on your wrist."}\n\nThe Great Hall lies SOUTH. The valley lies NORTH.`;
    case "throne_room":
      return `${s.flags.crown_assembled ? "The assembled Crown burns in its EMPTY frame. Aldric waits nearby; he has not touched it. Its power remains contained until you decide." : "Five sockets wait in the empty crown frame. Gathering the fragments here will briefly contain their power. It will also summon Aldric."}\n\n${has("sword") ? "Your old blade hangs beside the throne." : "The sword’s mount is empty."} You can leave NORTH to the Great Hall.`;
    case "kings_road":
      return `${s.flags.knight_healed ? r.descriptionKnightHealed : r.description}${s.flags.all_shards ? "\n\nThe five fragments reveal a hidden trail UP to Shadow Vale." : ""}`;
    case "elders_hut":
      return `${r.description}\n\n${has("lantern") ? "A brass LANTERN hangs beside the door." : "The lantern’s hook is empty."}`;
    case "crossroads_inn":
      return !has("rope") && !has("wanted_poster")
        ? r.descriptionNoItems
        : !has("rope")
          ? r.descriptionNoRope
          : !has("wanted_poster")
            ? r.descriptionNoPoster
            : r.description;
    case "whispering_woods":
      return has("healing_herb") ? r.description : r.descriptionNoHerb;
    case "dwarven_gate":
      return s.flags.gate_opened ? r.descriptionOpen : r.description;
    case "abandoned_mine":
      return s.flags.rubble_cleared
        ? r.descriptionCleared
        : has("pickaxe")
          ? r.description
          : r.descriptionNoPickaxe;
    case "crystal_cavern":
      return has("shard_3") ? r.description : r.descriptionNoShard;
    case "dragons_pass":
      return s.flags.heat_survived ? r.descriptionPassable : r.description;
    case "marsh_path":
      return s.flags.marsh_lit ? r.descriptionLit : r.description;
    default:
      return r.description;
  }
}
function inspect(s, id, read = false) {
  const r = rooms[s.room];
  if (objects(s).includes(id)) {
    const resolved = {
      altar_runes:
        s.flags.shrine_awake &&
        "The open altar remembers ROOT, STAR, FLAME. The waking word HEARTH glows below the emptying sockets.",
      shrine_dials:
        s.flags.shrine_awake &&
        "The rings rest at root, star and flame. The altar is awake.",
      keyhole:
        s.flags.gate_opened &&
        "The dwarven lock stands open. Its key has completed its purpose.",
      rubble:
        s.flags.rubble_cleared &&
        "Broken stones have been cleared from the eastern passage.",
      heat_shimmer:
        s.flags.heat_survived &&
        "The ward has quieted. You can pass safely into the lair.",
      pillars:
        s.flags.chasm_crossed &&
        (s.flags.temple_drained
          ? "The old pillars overlook a drained stone causeway."
          : "Your rope is secured between the pillars, forming a safe crossing."),
      crown_frame:
        s.flags.crown_assembled &&
        "The whole Crown rests in the EMPTY frame. Its current is contained; no wearer has claimed it.",
    };
    record(s, resolved[id] || r.examine[id], read ? "reading" : "observation");
    if (OBJECT_EVIDENCE[id]) discover(s, OBJECT_EVIDENCE[id]);
    if (id === "memorial_stones") s.flags.vale_charted = true;
    return;
  }
  if (!own(items, id) || !reachable(s, id)) {
    record(
      s,
      "You cannot reach or inspect that from here. Find a safe way closer.",
      "notice",
    );
    return;
  }
  const item = items[id];
  record(
    s,
    read
      ? item.readText || item.examineText || item.description
      : item.examineText || item.description,
    read ? "reading" : "observation",
  );
  if (id === "wanted_poster") discover(s, "portrait");
  if (id === "journal" && read) discover(s, "ritual");
}
function take(s, id) {
  if (!own(items, id) || !availableItems(s).includes(id)) {
    record(
      s,
      "That is not available to take. Look for what guards it or how to reach it.",
      "notice",
    );
    return;
  }
  s.inventory.push(id);
  s.taken.push(id);
  record(s, items[id].pickupText || `You take the ${nameOf(id)}.`, "pickup");
  if (SHARDS.includes(id)) {
    s.shards.push(id);
    record(s, MEMORIES[id].text, "memory");
    if (s.shards.length === 5) {
      s.flags.all_shards = true;
      record(
        s,
        "Five memories resonate together. A new trail has appeared UP from the King’s Road. You may investigate further before entering the citadel.",
        "special",
      );
    }
  }
}
function search(s, id) {
  if (!objects(s).includes(id)) {
    record(s, "Search something within this room.", "notice");
    return;
  }
  if (
    s.room === "sunken_temple" &&
    ["pillars", "drain_mechanism"].includes(id)
  ) {
    if (!s.flags.drain_found) {
      s.flags.drain_found = true;
      record(
        s,
        "Behind a loose facing stone you uncover three sluice switches: wave, reed and sun. The nearby carvings explain their order.",
        "discovery",
      );
    } else
      record(s, "The three sluice switches are already exposed.", "notice");
    return;
  }
  if (s.room === "abandoned_mine" && id === "dwarf_skeletons") {
    if (!s.flags.relic_found) {
      s.flags.relic_found = true;
      record(
        s,
        "Beneath a fallen breastplate, you uncover a bronze dragon seal. Pyraxis’s mark is engraved on its back.",
        "discovery",
      );
    } else
      record(
        s,
        s.taken.includes("dragon_relic")
          ? "You have already recovered the dragon seal."
          : "The dragon seal remains among the bones.",
        "notice",
      );
    return;
  }
  inspect(s, id);
  record(
    s,
    "You find no concealed object. Any inscription you noticed has been recorded in your journal.",
    "notice",
  );
}
function solve(s, symbol) {
  const p = PUZZLES[s.room];
  if (
    !p ||
    (s.room === "sunken_temple" && !s.flags.drain_found) ||
    s.flags[p.flag]
  ) {
    record(s, "There is no active mechanism to adjust here.", "notice");
    return;
  }
  if (!p.options.includes(symbol)) return;
  const sequence = s.puzzles[s.room];
  sequence.push(symbol);
  if (sequence.some((v, i) => v !== p.answer[i])) {
    s.puzzles[s.room] = [];
    record(
      s,
      "The mechanism settles back. Nothing is lost. Its inscriptions describe a sequence, not a test of strength.",
      "notice",
    );
    return;
  }
  if (sequence.length === p.answer.length) {
    s.flags[p.flag] = true;
    if (s.room === "ancient_shrine") {
      discover(s, "shrine");
      record(
        s,
        "Root, star, flame: the altar opens. Beneath the fragment, the word HEARTH glows. Old wards can be calmed by speaking it. A second inscription describes unbinding power in the presence of a willing witness.",
        "discovery",
      );
    } else {
      s.flags.temple_drained = true;
      record(
        s,
        "The sluices open in sequence. Water drains away, revealing a stone crossing to the shard and journal.",
        "discovery",
      );
    }
  } else
    record(
      s,
      `The ${symbol} symbol settles into place. ${sequence.length} of 3 rings answer.`,
      "action",
    );
}
function consume(s, id) {
  s.inventory = s.inventory.filter((i) => i !== id);
}
function use(s, id, on) {
  if (id === "crown_shards" && on === "crown_frame") {
    assemble(s);
    return;
  }
  if (!s.inventory.includes(id)) {
    record(s, "Use something you are carrying.", "notice");
    return;
  }
  if (
    !objects(s).includes(on) &&
    !roomNPCs(s).includes(on) &&
    !reachable(s, on)
  ) {
    record(s, "That target is not within reach here.", "notice");
    return;
  }
  if (id === "healing_herb" && on === "wounded_knight") {
    if (s.flags.knight_healed) {
      record(s, "The knight is already recovering.", "notice");
      return;
    }
    consume(s, id);
    s.flags.knight_healed = true;
    discover(s, "knight");
    record(
      s,
      "The herb dissolves into blue light. The knight breathes freely again. “Your mark… I saw it in the attack. But you chose to save me. I will remember that.”",
      "dialogue",
      "The knight",
    );
    return;
  }
  const combinations = {
    "ancient_key:keyhole": [
      "gate_opened",
      "The ancient key turns. The dwarven doors open; the mine lies EAST.",
      true,
    ],
    "pickaxe:rubble": [
      "rubble_cleared",
      "Stone gives way. A luminous cavern opens to the EAST.",
      true,
    ],
    "lantern:wisps": [
      "marsh_lit",
      "The lantern’s steady flame drives the wisps aside. The southern path is clear.",
      false,
    ],
    "shield:heat_shimmer": [
      "heat_survived",
      "The shield’s runes take the heat. You can now climb UP to Pyraxis.",
      false,
    ],
    "shield:cavern_mouth": [
      "heat_survived",
      "The shield’s runes turn the heat aside. The lair lies UP.",
      false,
    ],
    "rope:pillars": [
      "chasm_crossed",
      "You tie a rope crossing between the pillars. The shard and journal are now within reach.",
      true,
    ],
    "rope:chasm": [
      "chasm_crossed",
      "You anchor the rope to the pillars and cross the chasm safely.",
      true,
    ],
    "compass:dark_sky": [
      "vale_charted",
      "The needle holds steady through the shifting mist. You chart the southern route.",
      false,
    ],
  };
  const combo = combinations[`${id}:${on}`];
  if (combo) {
    if (s.flags[combo[0]]) {
      record(
        s,
        "That obstacle is already resolved. You keep your item.",
        "notice",
      );
      return;
    }
    s.flags[combo[0]] = true;
    if (combo[2]) consume(s, id);
    record(s, combo[1], "action");
    return;
  }
  if (id === "dragon_relic" && on === "pyraxis") {
    respond(s, "pyraxis", "return_relic");
    return;
  }
  if (id === "sword" && ["crown_frame", "aldric_throne"].includes(on)) {
    record(
      s,
      "This would decide the realm’s fate. Use the explicit final choices beside the Crown; ordinary item use does not commit an ending.",
      "notice",
    );
    return;
  }
  const feedback =
    on === "chasm" || on === "pillars"
      ? "The crossing needs an anchorable rope—or a way to drain the water."
      : on === "rubble"
        ? "The rubble needs a tool that can break stone."
        : on === "keyhole"
          ? "The dwarven lock needs a matching key."
          : on === "heat_shimmer"
            ? "The heat needs a protective ward, not force."
            : on === "crown_frame"
              ? "Gather all five fragments. The empty frame can contain them until you choose what follows."
              : "Those objects share no useful connection yet. Inspect the target for a clue, or consult a hint.";
  record(s, feedback, "notice");
}
function assemble(s) {
  if (
    s.room !== "throne_room" ||
    s.flags.crown_assembled ||
    !SHARDS.every((id) => s.inventory.includes(id))
  ) {
    record(
      s,
      "All five fragments must be present at the empty throne-room frame.",
      "notice",
    );
    return;
  }
  s.inventory = s.inventory.filter((id) => !SHARDS.includes(id));
  s.flags.crown_assembled = true;
  s.conversation = null;
  record(
    s,
    "The fragments settle into the EMPTY frame. Black light rises, bound to the pedestal instead of a wearer. This is containment: you can still sever the current.\n\nAldric enters. “Let me complete what we began,” he says. He waits for your answer. You may question him, release the power, or choose to claim it.",
    "special",
  );
}
export function dialogueTopics(s, id) {
  if (!roomNPCs(s).includes(id)) return [];
  const topic = (id, label, allowed = true) => (allowed ? { id, label } : null),
    ev = (id) => s.evidence.includes(id);
  const topics = {
    aldric_village: [
      topic("quest", "Ask about the scattered fragments"),
      topic(
        "mark",
        "Compare your rune with the burn marks",
        ev("wrist") && ev("burns"),
      ),
      topic("plans", "Question his years of preparation", ev("charts")),
      topic("ritual", "Confront him with Elara’s record", ev("ritual")),
    ],
    wounded_knight: [
      topic("help", "Ask what he needs", !s.flags.knight_healed),
      topic("testimony", "Ask what he remembers", !!s.flags.knight_healed),
      topic("pledge", "Ask for help at the citadel", !!s.flags.knight_healed),
    ],
    innkeeper: [
      topic("roads", "Ask about roads and supplies"),
      topic("face", "Show him the wanted portrait", ev("portrait")),
      topic("rumors", "Ask about the dragon’s missing seal"),
    ],
    yarrow: [
      topic("warning", "Ask why she recognizes you"),
      topic(
        "honest",
        "Admit your fear and ask for help",
        !s.flags.yarrow_trust && !s.flags.yarrow_intimidated,
      ),
      topic(
        "threaten",
        "Demand her knowledge by force",
        !s.flags.yarrow_trust && !s.flags.yarrow_intimidated,
      ),
      topic(
        "unbinding",
        "Ask her to witness an unbinding",
        !!s.flags.yarrow_trust && ev("shrine") && ev("ritual"),
      ),
      topic("directions", "Ask about the shield, compass and temple"),
    ],
    pyraxis: [
      topic("burden", "Ask why he guards the shard"),
      topic(
        "memory",
        "Tell him what you remember",
        !s.flags.dragon_permission && s.shards.length >= 2,
      ),
      topic(
        "return_relic",
        "Return the stolen dragon seal",
        !s.flags.dragon_permission && s.inventory.includes("dragon_relic"),
      ),
      topic("vow", "Promise to protect the realm", !s.flags.dragon_permission),
      topic(
        "demand",
        "Demand the shard behind your shield",
        !s.flags.dragon_permission && s.inventory.includes("shield"),
      ),
      topic(
        "farewell",
        "Ask what he hopes you will choose",
        !!s.flags.dragon_permission,
      ),
    ],
    aldric_throne: [
      topic("ritual", "Ask what completing the ritual means"),
      topic(
        "confront",
        "Lay out the evidence against him",
        ev("ritual") || ev("aldric") || (ev("charts") && ev("yarrow")),
      ),
      topic(
        "remember",
        "Tell him you remember your old name",
        ev("banners") || s.shards.length === 5,
      ),
      topic("time", "Tell him you need time to decide"),
    ],
  };
  return (topics[id] || []).filter(Boolean);
}
const GREETINGS = {
  aldric_village:
    "“The realm is waiting,” Aldric says. “But perhaps you have questions before you go.” His eyes flick to the shard in your hand.",
  wounded_knight:
    "The knight lifts his head. His armour bears the royal crest, stained with ash and blood.",
  innkeeper:
    "“A traveller,” the innkeeper says. “Or a familiar face in unfamiliar times. What do you need?”",
  yarrow:
    "Yarrow stills her spoon. “I know that face. But I do not yet know the person standing here.”",
  pyraxis:
    "“A memory can be a burden or a promise,” Pyraxis rumbles. “Tell me which you have brought.”",
  aldric_throne:
    "“We are so close,” Aldric says. He keeps his hands away from the Crown. He must wait for your decision.",
};
function talk(s, id) {
  if (!roomNPCs(s).includes(id)) {
    record(s, "That person is not here.", "notice");
    return;
  }
  s.conversation = id;
  record(s, GREETINGS[id], "dialogue", nameOf(id));
}
function respond(s, id, topic) {
  if (!dialogueTopics(s, id).some((t) => t.id === topic)) {
    record(
      s,
      "That question is not available with what you know here.",
      "notice",
    );
    return;
  }
  const say = (text) => record(s, text, "dialogue", nameOf(id));
  if (id === "aldric_village") {
    if (topic === "quest")
      say(
        "“One fragment sleeps beneath the forest stones. Another in the dwarven mountain. Seek the dragon and the sunken temple for the others. When all five answer, return to the King’s Road.”",
      );
    if (topic === "mark") {
      s.flags.aldric_questioned = true;
      say(
        "Aldric looks away. “Magic leaves echoes. You may have stood too close to the destruction.” He answers quickly—too quickly—and will not meet your eyes.",
      );
    }
    if (topic === "plans") {
      s.flags.aldric_questioned = true;
      say(
        "“I was a scholar before I was your guide. Preparation is not guilt.” He folds the oldest chart so that you cannot see its date.",
      );
    }
    if (topic === "ritual") {
      s.flags.aldric_confronted = true;
      discover(s, "aldric");
      say(
        "“Elara saw only part of the design. Yes, I prepared the forgetting. You were dangerous. Would you have preferred to remain what you were?” His warmth has become calculation.",
      );
    }
  } else if (id === "wounded_knight") {
    if (topic === "help")
      say(
        "“Blue leaves… in the forest. Healing herbs. I cannot go far without them.”",
      );
    if (topic === "testimony") {
      discover(s, "knight");
      say(
        "“I saw that rune in the fire. I cannot explain why its bearer has now saved me. Perhaps what we do next matters more than a name.”",
      );
    }
    if (topic === "pledge") {
      s.flags.knight_pledged = true;
      say(
        "“My royal seal can pass the citadel ward. I will meet you there. Whatever you once were, I owe you this chance.”",
      );
    }
  } else if (id === "innkeeper") {
    if (topic === "roads")
      say(
        "“The forest is west of the road. The mine is east; the marsh is south. Take the rope and the poster if they help. Keep anything you learn—people repeat only half the truth.”",
      );
    if (topic === "face") {
      discover(s, "portrait");
      say(
        "His fingers tighten around the tankard. “The eyes are alike. But that drawing was made in terror. I will judge the person who leaves this room by what they do.”",
      );
    }
    if (topic === "rumors")
      say(
        "“Dwarven scavengers once carried a bronze seal from the dragon’s mountain. Their expedition never came back. Search the abandoned mine, if you go there.”",
      );
  } else if (id === "yarrow") {
    if (topic === "warning") {
      discover(s, "yarrow");
      say(
        "“I saw your face when my village burned. That is a fact. I see you searching for answers now; that is another. The Crown magnifies its wearer’s will. Ask yourself whose will Aldric hopes to restore.”",
      );
    }
    if (topic === "honest") {
      s.flags.yarrow_trust = true;
      discover(s, "yarrow");
      say(
        "“Then begin with honesty. I will help you find a way to release the power. Elara left a journal in the temple; the forest shrine remembers words older than the Crown. Bring those discoveries back to me.”",
      );
    }
    if (topic === "threaten") {
      s.flags.yarrow_intimidated = true;
      discover(s, "yarrow");
      say(
        "She draws back. “Take the tools. Elara’s journal is in the temple. But I will not put my life in your hands. Fear was the old kingdom’s language, too.”",
      );
    }
    if (topic === "unbinding") {
      s.flags.unbinding_known = true;
      s.flags.yarrow_witness = true;
      say(
        "“Root to remember, star to witness, flame to release. At the empty frame, speak those words with my vow. I will lend my voice from here. You can free the fragments without making the Crown whole.”",
      );
    }
    if (topic === "directions")
      say(
        "“My shield will turn the dragon’s heat. The compass points toward dark power; use it in Shadow Vale. A rope can cross the temple, but its old sluices may still work.”",
      );
  } else if (id === "pyraxis") {
    if (topic === "burden")
      say(
        "“I guarded the fragment because someone once promised there would be no more burning villages. I do not ask for gold. I ask whether a promise can mean something again.”",
      );
    if (topic === "memory") {
      s.flags.dragon_permission = true;
      s.flags.dragon_truth = true;
      say(
        "“You admit what you do not yet understand. That is more than your former self offered. Take the shard. Let the memory it carries trouble you honestly.”",
      );
    }
    if (topic === "return_relic") {
      consume(s, "dragon_relic");
      s.flags.dragon_permission = true;
      s.flags.dragon_repaid = true;
      say(
        "“My seal. Returned, not stolen again.” He removes his claw from the fragment. “A small act of repair can precede a greater one. Take your charge.”",
      );
    }
    if (topic === "vow") {
      s.flags.dragon_permission = true;
      s.flags.dragon_vow = true;
      say(
        "“Then I accept your promise freely given. Take the shard. I will watch the roads beneath this mountain, and remember what follows.”",
      );
    }
    if (topic === "demand") {
      s.flags.dragon_permission = true;
      s.flags.dragon_intimidated = true;
      say(
        "The dragon’s eyes narrow. “I could end you. But another struggle over this power would only repeat the past. Take it. Do not mistake restraint for trust.”",
      );
    }
    if (topic === "farewell")
      say(
        "“A memory is not an order. You have already learned that. Now prove it to the world.”",
      );
  } else if (id === "aldric_throne") {
    if (topic === "ritual")
      say(
        "“The frame holds the current. A wearer would command it. I offer to take that burden from you.” For the first time, he says plainly what he wants.",
      );
    if (topic === "confront") {
      s.flags.aldric_confronted = true;
      discover(s, "aldric");
      say(
        "“Yes. I designed the ritual. I stripped away your memories. You would not surrender power willingly.” His hands shake. “But the realm still needs someone strong enough to rule it.”",
      );
    }
    if (topic === "remember") {
      s.flags.identity_accepted = true;
      say(
        "“Then you know why I feared you.” He glances at the blade. “Memory does not oblige you to repeat yourself. But neither does it make you innocent.”",
      );
    }
    if (topic === "time")
      say(
        "“I have waited years. I can wait another moment.” You are free to leave the chamber and return.",
      );
  }
}
export function epilogue(s) {
  return [
    s.flags.knight_healed
      ? s.ending === "true"
        ? "The knight survives to help rebuild the roads. He tells the story of the stranger who chose mercy."
        : s.ending === "domination"
          ? "The knight hides his royal seal. His gratitude cannot make him serve another tyrant."
          : "The knight leads survivors away from Aldric’s growing shadow."
      : "No aid reaches the wounded knight. His empty milestone becomes another name in the realm’s memory.",
    s.flags.yarrow_trust
      ? s.ending === "true"
        ? "Yarrow plants herbs in the village ashes. Trust, once offered, has been answered."
        : "Yarrow closes her door. She trusted the possibility of change; she will now protect others from what you chose."
      : s.flags.yarrow_intimidated
        ? "Yarrow remembers your threat. She leaves the marsh to shelter those who fear the Crown."
        : "Yarrow watches from the marsh, unsure how much of her warning reached you.",
    s.flags.dragon_repaid
      ? "Pyraxis keeps his returned seal where the dawn can touch it. One old theft has been repaired."
      : s.flags.dragon_vow
        ? s.ending === "true"
          ? "Pyraxis watches peaceful roads. Your promise has been kept."
          : "Pyraxis watches the roads with sorrow. Your freely given promise has been broken."
        : s.flags.dragon_intimidated
          ? "Pyraxis withdraws from the affairs of kings. He has heard enough demands for one age."
          : "Pyraxis waits to learn whether remembered truth can become a different future.",
    s.flags.aldric_confronted
      ? "You faced Aldric with evidence. Whatever followed, his design did not remain hidden."
      : "Some of Aldric’s preparations remain unexplained in your account.",
  ];
}
export function endingLines(s) {
  if (s.flags.unbound && s.ending === "true")
    return [
      "You place the fragments around the empty frame. Root to remember. Star to witness. Flame to release.",
      "Yarrow’s distant voice joins yours. The pieces lift, shining separately, and their power loosens like a knot. There is no whole Crown for anyone to claim.",
      "Aldric arrives too late. The magic sustaining his design dissolves into the morning air. The frame is only metal again.",
      "Your memories return without becoming commands. You name the harm you caused, and release the power that made you fear accountability.",
      "Dawn reaches the ruined village. There is work to do—and, at last, a world free to choose its own future.",
    ];
  return ENDINGS[s.ending]?.lines || [];
}
function finish(s, type) {
  if (
    s.room !== "throne_room" ||
    !own(ENDINGS, type) ||
    !s.flags.crown_assembled
  ) {
    record(
      s,
      "A final decision requires the bound Crown in its empty frame.",
      "notice",
    );
    return;
  }
  if (type !== "dark" && !s.inventory.includes("sword")) {
    record(
      s,
      "Take the dark-steel blade from the wall before choosing that path.",
      "notice",
    );
    return;
  }
  s.ending = type;
  s.conversation = null;
  record(s, ENDINGS[type].subtitle, "ending");
}
const HINTS = {
  elders_hut: [
    "Notice what Aldric studied before you arrived.",
    "His charts connect to symbols in the forest shrine. Take the lantern.",
    "Read the star charts: flame follows root and star. The lantern is used on the marsh wisps.",
  ],
  ancient_shrine: [
    "The altar’s symbols recur elsewhere.",
    "Read the forest bark and Aldric’s star charts.",
    "Set ROOT, then STAR, then FLAME. Take the shard and key.",
  ],
  sunken_temple: [
    "There are two ways across the water.",
    "A rope from the inn can anchor to the pillars. Alternatively, search the pillars and read the carvings.",
    "Use ROPE on PILLARS, or search PILLARS and press WAVE, REED, SUN. Then read Elara’s journal.",
  ],
  dragons_pass: [
    "The heat is held by an old ward.",
    "Yarrow has a shield. The awakened shrine also teaches a calming word.",
    "Use SHIELD on HEAT SHIMMER, or choose SPEAK HEARTH after awakening the shrine.",
  ],
  dragons_lair: [
    "Pyraxis wants a reason to trust you.",
    "Talk about memories, return his lost seal, or offer a promise.",
    "Talk to Pyraxis and choose a bargain. Then take the Ember Shard. The seal is hidden among the mine’s skeletons.",
  ],
  shadow_vale: [
    "These shifting paths have landmarks.",
    "The compass finds darkness. The memorials record a route.",
    "Use COMPASS on DARK SKY, or examine MEMORIAL STONES. Then travel SOUTH.",
  ],
  citadel_gate: [
    "The gate recognizes authority.",
    "Your wrist rune or the healed knight can answer it.",
    "Examine your RUNE in the ruined village, then choose ACKNOWLEDGE THE MARK here. Healing the knight opens this gate automatically.",
  ],
  throne_room: [
    "You can contain power without giving it to anyone.",
    "Elara’s journal explains the empty frame and the maker’s blade. Yarrow may know an alternative.",
    "Take the SWORD. Bind all five fragments, then explicitly choose an ending. For an unbound release, learn the shrine words, read the JOURNAL and ask a trusted Yarrow for her vow.",
  ],
};
export function hint(s) {
  const level = Math.min(2, s.hints[s.room] || 0);
  s.hints[s.room] = level + 1;
  const fallback = [
    "Inspect what blocks the nearby exits. Your journal records clues you have found.",
    "Connect a carried tool to the obstacle it can physically solve. Use the map to revisit explored places.",
    "Key opens the dwarven lock; pickaxe clears rubble; lantern disperses wisps. Search the mine’s skeletons for an optional gift to the dragon.",
  ];
  record(s, (HINTS[s.room] || fallback)[level], "hint");
  return level + 1;
}
export function act(s, a) {
  if (s.ending || !a || typeof a.type !== "string") return false;
  const { type, target, on, npc } = a;
  s.actions++;
  switch (type) {
    case "move": {
      const e = exits(s).find((e) => e.direction === target);
      if (!e?.open) {
        record(s, e?.reason || "There is no path in that direction.", "notice");
        return false;
      }
      enter(s, e.to);
      break;
    }
    case "examine":
      inspect(s, target);
      break;
    case "read":
      inspect(s, target, true);
      break;
    case "take":
      take(s, target);
      break;
    case "search":
      search(s, target);
      break;
    case "use":
      use(s, target, on);
      break;
    case "puzzle":
      solve(s, target);
      break;
    case "talk":
      talk(s, target);
      break;
    case "reply":
      respond(s, npc, target);
      break;
    case "assemble":
      assemble(s);
      break;
    case "finish":
      finish(s, target);
      break;
    case "hearth":
      if (s.room === "dragons_pass" && s.evidence.includes("shrine")) {
        s.flags.heat_survived = true;
        record(
          s,
          "“Hearth.” The old ward quiets, and the heat folds away from the ascending path.",
          "action",
        );
      } else
        record(
          s,
          "You have not learned a word that can change this place.",
          "notice",
        );
      break;
    case "ward":
      if (s.room === "citadel_gate" && s.evidence.includes("wrist")) {
        s.flags.citadel_open = true;
        discover(s, "recognition");
        record(
          s,
          "You acknowledge the mark instead of hiding it. The ward recognizes its maker and opens. What you do beyond it remains your choice.",
          "action",
        );
      } else
        record(
          s,
          "Investigate the rune on your wrist, or seek a royal witness.",
          "notice",
        );
      break;
    case "unmake":
      if (
        s.room === "throne_room" &&
        !s.flags.crown_assembled &&
        s.flags.unbinding_known &&
        SHARDS.every((id) => s.inventory.includes(id))
      ) {
        s.flags.unbound = true;
        s.inventory = s.inventory.filter((id) => !SHARDS.includes(id));
        s.ending = "true";
        s.conversation = null;
        record(
          s,
          "You release the fragments through the unbinding vow, without restoring the Crown.",
          "ending",
        );
      } else
        record(
          s,
          "An unbound release needs all five fragments, the shrine’s words, Elara’s record, and Yarrow’s willing vow.",
          "notice",
        );
      break;
    case "hint":
      hint(s);
      break;
    default:
      s.actions--;
      return false;
  }
  return true;
}
export function snapshot(s) {
  return JSON.stringify(s);
}
export function restore(text) {
  try {
    if (typeof text !== "string" || text.length > 1000000) return null;
    const s = JSON.parse(text);
    if (
      s.version !== VERSION ||
      !own(rooms, s.room) ||
      (s.ending !== null && !own(ENDINGS, s.ending)) ||
      !Number.isSafeInteger(s.actions) ||
      s.actions < 0 ||
      !Number.isSafeInteger(s.serial) ||
      s.serial < 0
    )
      return null;
    const ids = (a, table, max) =>
      Array.isArray(a) &&
      a.length <= max &&
      new Set(a).size === a.length &&
      a.every((id) => typeof id === "string" && own(table, id));
    if (
      !ids(s.inventory, items, 30) ||
      !ids(s.taken, items, 30) ||
      !ids(s.shards, MEMORIES, 5) ||
      !s.shards.includes("shard_1") ||
      !ids(s.visited, rooms, 18) ||
      !s.visited.includes(s.room) ||
      !ids(s.evidence, EVIDENCE, 30)
    )
      return null;
    if (
      !s.flags ||
      Object.getPrototypeOf(s.flags) !== Object.prototype ||
      Object.keys(s.flags).length > 60 ||
      Object.entries(s.flags).some(
        ([key, v]) => !/^\w{1,40}$/.test(key) || typeof v !== "boolean",
      )
    )
      return null;
    if (
      !s.puzzles ||
      Object.keys(s.puzzles).length !== 2 ||
      Object.entries(PUZZLES).some(
        ([id, p]) =>
          !Array.isArray(s.puzzles[id]) ||
          s.puzzles[id].length > 3 ||
          s.puzzles[id].some((v) => !p.options.includes(v)),
      )
    )
      return null;
    if (
      !s.hints ||
      Object.entries(s.hints).some(
        ([id, v]) => !own(rooms, id) || !Number.isInteger(v) || v < 1 || v > 3,
      )
    )
      return null;
    if (
      !Array.isArray(s.history) ||
      s.history.length > 600 ||
      s.history.some(
        (h) =>
          !h ||
          !Number.isSafeInteger(h.id) ||
          h.id < 1 ||
          h.id > s.serial ||
          !own(rooms, h.room) ||
          typeof h.text !== "string" ||
          h.text.length > 15000 ||
          typeof h.kind !== "string" ||
          typeof h.speaker !== "string",
      )
    )
      return null;
    if (
      s.conversation !== null &&
      (!own(npcs, s.conversation) || !roomNPCs(s).includes(s.conversation))
    )
      return null;
    return s;
  } catch {
    return null;
  }
}
export function validateContent() {
  const errors = [];
  for (const [id, r] of Object.entries(rooms)) {
    if (id !== r.id) errors.push(`Room id ${id}`);
    for (const to of Object.values(r.exits))
      if (!own(rooms, to)) errors.push(`Exit ${id} → ${to}`);
    for (const item of r.items)
      if (!own(items, item)) errors.push(`Item ${item}`);
    for (const npc of r.npcs) if (!own(npcs, npc)) errors.push(`NPC ${npc}`);
  }
  for (const id of SHARDS)
    if (!own(items, id) || !own(MEMORIES, id)) errors.push(`Shard ${id}`);
  for (const id of Object.values(OBJECT_EVIDENCE))
    if (!own(EVIDENCE, id)) errors.push(`Evidence ${id}`);
  return errors;
}
