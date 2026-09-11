export const WIDTH = 30,
  HEIGHT = 20,
  SAVE_VERSION = 1;
export const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export const CLASSES = {
  Fighter: {
    hp: 36,
    attack: 5,
    defense: 2,
    weapon: "sword",
    charges: 0,
    ability: "Guard",
    help: "Q: guard for one enemy turn. Blocking empowers your next attack to cleave adjacent enemies.",
  },
  Mage: {
    hp: 26,
    attack: 4,
    defense: 0,
    weapon: "staff",
    charges: 6,
    ability: "Arc bolt",
    help: "Q, then a direction: fire up to 6 tiles. Walls block bolts. Every third kill restores a charge.",
  },
  Priest: {
    hp: 32,
    attack: 4,
    defense: 1,
    weapon: "mace",
    charges: 3,
    ability: "Sanctuary",
    help: "Q: heal 10 HP and ward one turn. Shrines and new floors restore charges. Passive: potions heal +4 HP.",
  },
  Rogue: {
    hp: 28,
    attack: 4,
    defense: 1,
    weapon: "dagger",
    charges: 0,
    ability: "Shadowstep",
    help: "Q, then a direction: step up to 2 tiles and evade the next attack. A successful dodge empowers your next hit. 3-turn cooldown.",
  },
};
export const ITEMS = {
  potion: {
    name: "Crimson vial",
    type: "consumable",
    heal: 18,
    description: "Restore 18 HP. Costs one turn.",
  },
  greater: {
    name: "Royal elixir",
    type: "consumable",
    heal: 36,
    description: "Restore 36 HP. Costs one turn.",
  },
  sword: {
    name: "Iron sword",
    type: "weapon",
    attack: 3,
    description: "Reliable close combat.",
  },
  staff: {
    name: "Ash staff",
    type: "weapon",
    attack: 3,
    bolt: 3,
    description: "+3 arc bolt damage.",
  },
  mace: {
    name: "Pilgrim mace",
    type: "weapon",
    attack: 3,
    description: "A dependable shrine keeper’s weapon.",
  },
  dagger: {
    name: "Balanced dagger",
    type: "weapon",
    attack: 3,
    opportunity: 3,
    description: "+3 damage on an empowered Rogue strike.",
  },
  spear: {
    name: "Watchman spear",
    type: "weapon",
    attack: 2,
    reach: 2,
    description: "F + direction attacks through an empty tile at range 2.",
  },
  axe: {
    name: "Executioner axe",
    type: "weapon",
    attack: 6,
    description: "Powerful adjacent strikes.",
  },
  runestaff: {
    name: "Runic staff",
    type: "weapon",
    attack: 4,
    bolt: 6,
    description: "+6 arc bolt damage.",
  },
  glaive: {
    name: "Moon glaive",
    type: "weapon",
    attack: 5,
    reach: 2,
    description: "F + direction attacks at range 2.",
  },
  leather: {
    name: "Scout leathers",
    type: "armor",
    defense: 2,
    description: "Protection without restricting movement.",
  },
  plate: {
    name: "Warden plate",
    type: "armor",
    defense: 4,
    heavy: true,
    description: "Shadowstep travels only 1 tile; cooldown increases to 4.",
  },
  mail: {
    name: "Sanctum mail",
    type: "armor",
    defense: 3,
    maxHp: 6,
    description: "Balanced protection and +6 maximum HP.",
  },
  ember: {
    name: "Ember ring",
    type: "accessory",
    attack: 2,
    description: "+2 attack; favors aggressive play.",
  },
  blood: {
    name: "Sanguine ring",
    type: "accessory",
    leech: 2,
    description: "Recover 2 HP on a kill.",
  },
  focus: {
    name: "Focus ring",
    type: "accessory",
    bolt: 4,
    description: "+4 arc bolt damage.",
  },
  life: {
    name: "Root amulet",
    type: "accessory",
    maxHp: 12,
    description: "+12 maximum HP.",
  },
};
export const PERKS = {
  might: { name: "Tempered edge", description: "+2 attack.", attack: 2 },
  vigor: {
    name: "Deep roots",
    description: "+8 maximum HP and heal 8.",
    maxHp: 8,
  },
  resolve: { name: "Stone skin", description: "+1 defense.", defense: 1 },
  hunter: { name: "Reaper", description: "Heal 2 HP on every kill.", leech: 2 },
  scholar: {
    name: "Arcane reserve",
    description:
      "+2 ability capacity (Mage / Priest); +3 empowered damage (Fighter / Rogue).",
    reserve: 2,
  },
  veteran: {
    name: "Second wind",
    description:
      "Once per floor, a fatal hit leaves you at 1 HP. Unlocked by reaching floor 4.",
    unlock: 4,
  },
  execution: {
    name: "Finisher",
    description:
      "+4 damage against enemies below half HP. Unlocked by defeating a guardian.",
    unlock: 5,
  },
};
export const BIOMES = [
  {
    name: "Mosslight Keep",
    floor: "#28352f",
    wall: "#46534a",
    edge: "#70816b",
    light: "#d4ae59",
  },
  {
    name: "The Sunken Crypt",
    floor: "#292f40",
    wall: "#454761",
    edge: "#727b98",
    light: "#84b9d3",
  },
  {
    name: "Ember Halls",
    floor: "#3b2b2b",
    wall: "#60443f",
    edge: "#9b6d59",
    light: "#ed965b",
  },
  {
    name: "The Hollow Sanctum",
    floor: "#302a41",
    wall: "#534461",
    edge: "#9280a6",
    light: "#c08be8",
  },
];
export const MONSTERS = [
  ["Slime", "melee", "#95c76c"],
  ["Rat", "melee", "#b5a491"],
  ["Bat", "ranged", "#bc89d3"],
  ["Goblin", "melee", "#78ac69"],
  ["Skeleton", "ranged", "#ddd2ad"],
  ["Zombie", "heavy", "#8e9875"],
  ["Spider", "ranged", "#b49b71"],
  ["Orc", "heavy", "#96a773"],
  ["Wolf", "melee", "#9bafbb"],
  ["Ghost", "ranged", "#9fcad4"],
  ["Troll", "heavy", "#7ea585"],
  ["Ogre", "heavy", "#ba9b74"],
  ["Vampire", "melee", "#c27c98"],
  ["Demon", "heavy", "#d36c55"],
  ["Golem", "heavy", "#9a9487"],
  ["Wraith", "ranged", "#9d8ace"],
  ["Minotaur", "heavy", "#b48e6b"],
  ["Giant", "heavy", "#baad92"],
  ["Lich", "ranged", "#ac94d9"],
  ["Dragon Whelp", "ranged", "#c99458"],
];
export function lootPool(floor) {
  return floor < 4
    ? ["spear", "leather", "ember", "blood", "life"]
    : floor < 7
      ? ["axe", "plate", "focus", "blood", "mail"]
      : ["glaive", "runestaff", "mail", "life", "focus"];
}
