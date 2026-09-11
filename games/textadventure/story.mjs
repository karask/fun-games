import {
  rooms as originalRooms,
  items as originalItems,
  npcs as originalNPCs,
  INTRO_TEXT,
  DARK_ENDING,
  TRUE_ENDING,
  DOMINATION_ENDING,
} from "./data.js";
export { INTRO_TEXT };
export const VERSION = 1;
export const SHARDS = ["shard_1", "shard_2", "shard_3", "shard_4", "shard_5"];
export const rooms = structuredClone(originalRooms);
export const items = {
  ...structuredClone(originalItems),
  shard_1: {
    id: "shard_1",
    name: "The Oath Shard",
    description:
      "The first fragment, entrusted to you by Aldric. A memory of an oath sleeps inside it.",
    isShard: true,
  },
  dragon_relic: {
    id: "dragon_relic",
    name: "Dragon seal",
    description:
      "A bronze scale-shaped seal bearing Pyraxis’s mark. Someone carried it away from his mountain.",
    room: "abandoned_mine",
  },
};
export const npcs = structuredClone(originalNPCs);
export const REGIONS = {
  "The Ruined Village": { name: "Ash & aftermath", color: "#d79d70", index: 0 },
  "The Enchanted Forest": {
    name: "The listening wood",
    color: "#a7bf97",
    index: 1,
  },
  "The King's Road": {
    name: "Roads of the old kingdom",
    color: "#d1b67d",
    index: 0,
  },
  "The Mountains": { name: "Stone & ancient fire", color: "#a7bad0", index: 2 },
  "The Cursed Marshes": {
    name: "Beneath the still water",
    color: "#88bcb6",
    index: 3,
  },
  "The Dark Citadel": {
    name: "The returning shadow",
    color: "#baa0cf",
    index: 4,
  },
};
export const MEMORIES = {
  shard_1: {
    title: "An oath in the dark",
    text: "A ring of candles. A younger Aldric takes your hand. “Together,” he says, “we can end their fear.” You cannot see what waits beyond the candlelight.",
  },
  shard_2: {
    title: "The first command",
    text: "You stand before a forest shrine. Soldiers await your order. You hear yourself say “Open the road,” and ancient trees fall silent. Were you protecting these people—or conquering them?",
  },
  shard_3: {
    title: "The broken gate",
    text: "Iron doors shake beneath your palm. Behind them, dwarven voices sing a ward against a name you almost remember. Your hand carries the same rune as it does now.",
  },
  shard_4: {
    title: "A promise to Pyraxis",
    text: "An unbroken dragon seal lies between you and Pyraxis. “No more villages,” you promise. He believes you. The shame that follows this memory is entirely your own.",
  },
  shard_5: {
    title: "The night of forgetting",
    text: "Aldric draws a circle around your throne. “Let me carry the burden,” he whispers. Your memories begin to burn away. The crown breaks, and his expression is relief—not surprise.",
  },
};
for (const [i, id] of SHARDS.entries())
  if (items[id])
    items[id].name = [
      "Oath Shard",
      "Root Shard",
      "Stone Shard",
      "Ember Shard",
      "Tide Shard",
    ][i];
items.journal.readText =
  "Elara’s journal records a dangerous discovery. The Crown amplifies the will of its wearer; its protection was always obedience. Aldric helped design both the binding and the ritual of forgetting.\n\n“To break the Crown safely, gather its scattered power into the EMPTY frame. Do not wear it. While the current is bound to the pedestal, its maker’s blade can sever it. Assembly is a brief containment—not the restoration Aldric promises.\n\nThere may be a gentler way. The forest’s waking words, joined to a willing witness’s unbinding vow, could release the fragments without rejoining them.”";
items.journal.description =
  "Elara’s waterlogged ritual journal is protected by an old enchantment. Read its surviving pages to learn what the Crown binds.";
rooms.ancient_shrine.objects.push("shrine_dials");
rooms.ancient_shrine.examine.shrine_dials =
  "Three rings bear a root, a star and a flame. An inscription reads: “Begin with what holds us. Follow what guides us. End with what wakes us.” The forest bark and Aldric’s star charts may clarify the order.";
rooms.ancient_shrine.description =
  "Silver stones enclose a quiet clearing. A shard floats above a sealed altar. Three engraved rings—root, star and flame—wait beneath it. An ancient key hangs from a chain beside the altar.\n\nThe Whispering Woods lie NORTH.";
rooms.ancient_shrine.examine.altar_runes =
  "The sealed altar is built to awaken, not to be forced. Its three rings echo symbols carved in the forest. When awakened, it may reveal more than the shard.";
rooms.whispering_woods.examine.silver_bark =
  "Under the silver bark, an old inscription reads: “The ROOT remembers first. The STAR watches second.” Its final line has been scraped away. These symbols recur at the southern shrine.";
rooms.elders_hut.examine.star_charts =
  "Beside a chart of the waking constellation, a note reads: “After root and star, the FLAME opens the eye.” Another annotation lists dates long before the village burned. Aldric’s preparations began years ago.";
rooms.sunken_temple.objects.push("drain_mechanism");
rooms.sunken_temple.examine.temple_carvings =
  "A carved sequence shows a receding WAVE, a REED lifting from mud, and the rising SUN. Beneath it: “Let water depart, let earth breathe, let day return.” A seam in the nearby pillar may hide the old drainage controls.";
rooms.sunken_temple.examine.drain_mechanism =
  "Three stone switches control the sluices: wave, reed and sun. The temple carvings describe the order. Search the pillars to uncover the mechanism.";
rooms.sunken_temple.description =
  "Half-submerged columns surround an island of dry stone. A crown shard and a waterlogged journal rest across a flooded chasm. Both are too far away to handle or read.\n\nSturdy PILLARS could anchor a rope. Carvings beside them may offer another way across. The witch’s cabin lies WEST.";
rooms.dragons_pass.examine.heat_shimmer =
  "Ancient protective magic holds the heat here, as much as the dragon’s breath. A warded shield could turn it aside. Someone who has awakened the forest shrine might know its calming word.";
rooms.dragons_lair.description =
  "Gold and ancient offerings lie beneath vaulted stone. Pyraxis watches you from a bed of bronze shields. One claw rests beside the Ember Shard. He is neither asleep nor hostile.\n\nYou will need his permission to take the fragment. The mountain pass lies DOWN.";
rooms.shadow_vale.exits.down = "kings_road";
rooms.shadow_vale.description =
  "Mist folds the valley into uncertain paths. Memorial stones emerge and vanish between leaning cypresses. A citadel waits somewhere to the SOUTH.\n\nA compass attuned to darkness could guide you. Without one, the memorial inscriptions may preserve the old route. You can return DOWN to the King’s Road.";
rooms.shadow_vale.examine.memorial_stones =
  "Names of ruined villages cover the stones. Their sequence follows your journey: village, forest, mountains, marsh. Small arrows beneath the names point toward the next memorial. Read together, they chart a safe path through the valley. The destruction recorded here follows your own route.";
rooms.citadel_gate.objects.push("citadel_ward");
rooms.citadel_gate.examine.citadel_ward =
  "The gate is bound by a ward that recognizes its maker’s rune. You could acknowledge the mark on your wrist. A royal witness could also command the gate to admit you.";
rooms.citadel_gate.description =
  "Black iron gates stand beneath watchful gargoyles. A pale ward bars the entrance. It stirs as you approach, almost in recognition.\n\nThe Shadow Vale lies NORTH. The Great Hall is SOUTH, beyond the ward.";
rooms.great_hall.examine.banners =
  "The banners bear the rune on your wrist. Beneath one, a dedication reads: “To Malachar, who promised us peace.” Your memories finally have a name. What that name will mean next is still your choice.";
rooms.witchs_cabin.description =
  "A crooked house rests above the marsh on timber stilts. Yarrow tends a copper cauldron, then falls silent when she sees your face. A compass and a warded shield wait on a shelf.\n\nShe seems to recognize something you have forgotten. The temple lies EAST; the marsh path lies NORTH.";
rooms.throne_room.description =
  "An empty crown frame stands before an obsidian throne. Five sockets wait to contain the fragments’ power. A dark-steel sword hangs beside it.\n\nNothing here requires obedience. You can gather the power into the empty frame, investigate further, or leave through the Great Hall to the NORTH.";
export const EVIDENCE = {
  wrist: {
    group: "identity",
    title: "The mark on your wrist",
    source: "Your wrist · Ruined Village",
    text: "The rune on your skin is warm despite the cold. It predates your lost memories.",
  },
  burns: {
    group: "identity",
    title: "A familiar pattern",
    source: "Burn marks · Ruined Village",
    text: "The village’s scorch marks radiate in the shape of your wrist rune. This was directed magic.",
  },
  charts: {
    group: "aldric",
    title: "Years of preparation",
    source: "Star charts · Aldric’s Hut",
    text: "Aldric’s notes predate the attack. A marginal clue places flame after root and star.",
  },
  forest: {
    group: "crown",
    title: "The waking sequence",
    source: "Silver bark · Whispering Woods",
    text: "Root comes first; star follows. A missing final symbol may be recorded elsewhere.",
  },
  shrine: {
    group: "crown",
    title: "The waking words",
    source: "Awakened shrine",
    text: "Root, star, flame. The shrine teaches the word “Hearth”, which calms old wards. It also describes releasing power with a willing witness.",
  },
  knight: {
    group: "identity",
    title: "A survivor’s testimony",
    source: "The healed knight",
    text: "The knight remembers the rune of the force that struck him. His account corroborates the village’s burn marks.",
  },
  portrait: {
    group: "identity",
    title: "Eyes in a wanted portrait",
    source: "Wanted poster",
    text: "The poster’s face is torn away. The remaining eyes resemble your own.",
  },
  yarrow: {
    group: "aldric",
    title: "Yarrow’s warning",
    source: "Yarrow · Witch’s Cabin",
    text: "Yarrow recognizes you, but believes forgetting may offer a chance to choose differently. She distrusts Aldric’s promised restoration.",
  },
  ritual: {
    group: "crown",
    title: "Elara’s containment ritual",
    source: "Elara’s journal · Sunken Temple",
    text: "The empty frame can briefly contain the fragments. While unworn, the reunited power can be severed with its maker’s blade. An unbinding vow may offer another way.",
  },
  drain: {
    group: "crown",
    title: "The old sluices",
    source: "Temple carvings",
    text: "Wave, reed, sun: water departs, earth breathes, then day returns.",
  },
  memorial: {
    group: "identity",
    title: "A road of names",
    source: "Memorial stones · Shadow Vale",
    text: "The memorials chart a safe route. Their destroyed villages follow the same path as your journey.",
  },
  recognition: {
    group: "identity",
    title: "The gates know you",
    source: "Gate iron · Citadel Gate",
    text: "The ward answers the mark on your wrist. This power was made to admit you.",
  },
  banners: {
    group: "identity",
    title: "A name remembered",
    source: "Banners · Great Hall",
    text: "The banners identify the rune as Malachar’s. The name belongs to you; your next choice need not belong to your past.",
  },
  aldric: {
    group: "aldric",
    title: "A contradiction exposed",
    source: "Confronting Aldric",
    text: "Aldric admits planning the forgetting ritual. His concern is the Crown’s power, not simply your recovery.",
  },
};
export const OBJECT_EVIDENCE = {
  rune: "wrist",
  burn_marks: "burns",
  star_charts: "charts",
  silver_bark: "forest",
  temple_carvings: "drain",
  memorial_stones: "memorial",
  gate_iron: "recognition",
  banners: "banners",
};
export const QUESTIONS = {
  identity: "Who were you before the village burned?",
  crown: "What does the Crown really bind?",
  aldric: "Why was Aldric ready for your awakening?",
};
export const PUZZLES = {
  ancient_shrine: {
    name: "Awaken the altar",
    options: ["root", "star", "flame"],
    answer: ["root", "star", "flame"],
    flag: "shrine_awake",
  },
  sunken_temple: {
    name: "Open the sluices",
    options: ["sun", "wave", "reed"],
    answer: ["wave", "reed", "sun"],
    flag: "chasm_crossed",
  },
};
export const ENDINGS = {
  dark: {
    title: "The Shadow Falls",
    subtitle: "You entrusted the ritual to Aldric.",
    lines: DARK_ENDING,
  },
  true: {
    title: "The Dawn Breaks",
    subtitle: "You released the realm from the Crown.",
    lines: TRUE_ENDING,
  },
  domination: {
    title: "The Shadow Endures",
    subtitle: "You chose to claim the Crown’s power.",
    lines: DOMINATION_ENDING,
  },
};
export const MAP_POS = {
  elders_hut: [0, 1],
  ruined_village: [1, 1],
  kings_road: [2, 1],
  crossroads_inn: [2, 0],
  whispering_woods: [1, 0],
  ancient_shrine: [0, 0],
  dwarven_gate: [3, 1],
  abandoned_mine: [4, 1],
  crystal_cavern: [5, 1],
  dragons_pass: [3, 0],
  dragons_lair: [4, 0],
  marsh_path: [1, 2],
  witchs_cabin: [1, 3],
  sunken_temple: [2, 3],
  shadow_vale: [3, 2],
  citadel_gate: [4, 2],
  great_hall: [4, 3],
  throne_room: [5, 3],
};
