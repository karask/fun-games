# Tiny Dungeon: gameplay and presentation review

Historical review of the pre-upgrade game on 2026-09-11. **The recommendations have now been implemented**; see [the current game guide](README.md) and [verification results](VERIFICATION.md). The findings below describe the old gameplay, and their line references are historical. Optional ambience and permanent stat bonuses were intentionally excluded, as discussed in the review.

The strongest direction is a compact tactical dungeon crawler: short floors, readable enemy intentions, four genuinely different classes, and a few meaningful build choices. Fix run integrity first, then make each turn more interesting before expanding the content pool.

## What exists today

- Ten procedurally generated floors on a 25 × 18 tile map.
- Four classes with different starting stats and inventory, but identical combat actions.
- Twenty regular monster definitions, two mini-boss definitions, and three possible final bosses. All use the same chase/adjacent-attack logic.
- Eleven item templates, three equipment slots, potions, automatic leveling, and XP-based local high scores.
- Keyboard movement, bump attacks, waiting, an inventory, exploration memory, hover inspection, and movement/hit animation.

Browser checks covered all four class starts, inventory contents, equipping the Fighter's sword, movement/exploration, Rogue combat through death and the shared high-score screen, and the new splash at desktop, 768px, 390px, and 320px widths. This was not a complete ten-floor balance playthrough.

## Fix these before adding more content

| Priority | Finding and evidence | Recommended change |
|---|---|---|
| Critical | **Starting another run can retain the previous floor and XP.** `backToMenu()` sets state to `START`; `startGame()` resets the run only from `DEATH` or `WIN`. The audit reproduced a level-1, 30-HP Fighter beginning on floor 7 with 123 old XP still counted toward the score. [Source](game.js#L167) | Reset floor, score, messages, inventory state, and pending end-of-run work unconditionally in one new-run function. Test death → menu → every class, and victory → menu → new run. |
| Critical | **Floor generation can crash.** A one-room layout is allowed, but `spawnMonsters()` indexes a room after the first. In 5,000 seeded floor-1 trials, **113 crashed** (2.26% of this sample). Example seeds: 35, 46, 108. [Generator](game.js#L235), [spawning](game.js#L311) | Guarantee a minimum viable connected layout, use bounded retries with a safe fallback, and validate spawn locations before committing a floor. |
| High | **Monsters can spawn on the same tile.** 1,461 of the 4,887 successful generated floors had overlapping monster coordinates. Spawning does not check occupied cells. [Source](game.js#L311) | Allocate enemies, bosses, loot, player start, and stairs from validated free cells. Explicitly decide which object types may share a tile. |
| High | **Enemy actions continue after death.** Two adjacent enemies produced two end-screen callbacks and negative HP in a controlled probe. The dead-player check occurs before the enemy loop, not after each attack. [Turn loop](game.js#L611), [end handling](game.js#L456) | Stop the turn immediately on death/victory; make the end transition idempotent. Keep visual delays separate from the authoritative game state. |
| Medium | **Walls do not block sight.** FOV and rendering use distance alone; a tile behind a wall was revealed in the audit. Hover inspection also uses exploration memory rather than current visibility. [FOV](game.js#L356), [rendering](game.js#L685) | Separate currently visible tiles from explored tiles, implement wall-aware line of sight, and hide current enemy information outside sight. |
| Medium | **Large XP awards grant only one level.** A probe with 500 XP left the player at level 2 with 490 XP toward a 15-XP threshold. [Source](game.js#L436) | Process all earned levels, then present upgrade choices in a clear sequence. |
| Medium | **Combat movement rules are asymmetric.** Enemies attack diagonally and can move through diagonal corners; players only move/attack in four directions. [Source](game.js#L611) | Use the same four-direction movement and adjacency rules initially. Introduce exceptions only as explicit, telegraphed enemy abilities. |

The seeded sample is a reproducible local stress test, **not production telemetry or an estimated player crash rate**. The original audit used the old game in a simulated DOM. `node games/tinydungeon/review/audit.mjs` now audits the replacement engine; the historical numbers above are retained for comparison.

## Give each class a different way to solve a fight

Current starting values, confirmed in code and inventory UI:

| Class | HP | Base attack / defense | Starting item | Attack after equipping |
|---|---:|---:|---|---:|
| Fighter | 30 | 6 / 4 | Short Sword | 11 |
| Mage | 15 | 8 / 1 | Magic Staff | 18 |
| Priest | 20 | 4 / 3 | Health Potion (+20 HP) | 4 |
| Rogue | 18 | 5 / 2 | Dagger | 7 |

Starting weapons are in the backpack, not equipped. The new splash explains this; the better future default is to equip starting weapons automatically. The Rogue currently has less HP, attack, and defense than the Fighter, with no compensating mechanic. The Mage's staff still performs the same adjacent bump attack as a sword. [Class setup](game.js#L203), [combat](game.js#L406)

Begin with one active ability and one small passive per class:

- **Fighter:** guard against the next attack; gain a cleave opportunity when blocking. Makes positioning between enemies useful.
- **Mage:** a limited-charge, wall-blocked ranged bolt; choose between spending a charge safely and conserving it through melee. Avoid unlimited ranged kiting.
- **Priest:** a protective ward and limited healing charges replenished at designated shrines. Avoid infinite healing by waiting.
- **Rogue:** a short repositioning step and a bonus against an enemy whose attack was just dodged. Makes low durability a tradeoff for tactical control.

These are proposed designs, not descriptions of the current classes. Prototype two classes first and test that the same encounter rewards different decisions. Add a choice of three perks at selected levels after the base abilities work; do not begin with a large skill tree.

## Make combat readable and fair

Every monster currently follows essentially the same routine: attack within 1.5 tiles, otherwise chase within five tiles. Bosses mostly increase stats. More monster names will not fix this. [Enemy data](game.js#L95), [AI](game.js#L611)

Build three behavior patterns first: a melee pursuer, a ranged attacker that needs line of sight, and a heavy enemy that marks a tile before a delayed strike. Use a short path search so enemies can navigate corridors, rather than the current greedy movement that gets stuck against walls. Show an intention icon or affected tiles before dangerous attacks resolve.

Give floor-4 and floor-8 bosses one signature move each, then give final bosses distinct two-phase encounters. For example, the dragon marks a breath lane, the demon king charges a visible path, and the archlich summons support while exposing itself. Keep the rules legible and make movement the answer to some threats.

Define turn costs consistently. At present, opening inventory freezes enemies and using potions or swapping gear never advances their turn. Opening an interface should remain free; consuming a combat item should be an explicit action with a clear cost. Decide separately whether equipment changes are restricted to safe moments. [Inventory](game.js#L531)

Also clarify damage: the random roll occurs after the minimum-damage clamp, so nominal one-damage attacks can produce zero damage. Either guarantee one point after rolling, or deliberately represent blocks/misses with the corresponding feedback. Do not report a confusing zero-damage “hit.” [Source](game.js#L406)

## Add depth through loot and room choices

The current system offers mostly bigger attack/defense numbers. Any class can use the strongest staff and armor. Normal enemies have a 3% drop chance; each floor independently has a 50% chance of one item, chosen uniformly from all eleven templates. That makes useful upgrades and recovery unreliable. [Items](game.js#L81), [floor loot](game.js#L286), [kill drops](game.js#L436)

- Guarantee a useful early recovery opportunity and a meaningful gear choice by floor 2. Use floor-appropriate loot pools and prevent repeated unusable rewards.
- Add sidegrades: a spear with reach but weaker adjacent damage; armor that protects against heavy hits but restricts a mobility ability; a ring that rewards a particular play style. Keep comparisons visible in inventory.
- Mix combat rooms with a small set of distinctive rooms: a shrine, a treasure room with a cost, an optional elite, and a safe recovery room. Offer a risky route and a safer route where the map allows it.
- Treat mini-bosses consistently: either defeating them opens the stairs, or bypassing them is an explicit risk/reward choice. Currently they can move away from the stairs and be bypassed.
- Make “Drop” put the item on a legal floor tile, or rename it “Discard.” The current action deletes it. [Source](game.js#L544)

In the generation sample, most successful floors contained only two or three rooms. The immediate goal should be more purposeful rooms and choices within that compact footprint, rather than a larger empty map.

## Graphics and sound: match the promise of the splash

The new splash uses the existing torch-lit dungeon artwork, warm stone/gold colors, class-specific weapon icons, readable starting kits, and a separate records panel. Gameplay still uses plain gray tiles, small character images, and emoji for many enemies/items.

The character assets are mostly **640 × 640 transparent images rendered into 32px tiles**, with inconsistent padding. For example, the Fighter's visible bounds occupy 449 × 437 source pixels, resulting in roughly a 22px character; the Priest is only about 15px wide at that scale. They already have transparency—normalizing the crop and scale is more useful than removing a background. Only six of the twenty regular monster types have mapped sprite images; all three final-boss names fall back to emoji. [Asset loading](game.js#L50), [drawing](game.js#L739)

Recommended graphics sequence:

1. Normalize character silhouettes, baselines, and visible size. Produce coherent 32px or 48px gameplay sprites for the missing enemies and items; keep image smoothing and display scaling deliberate.
2. Add a small reusable stone tileset: floor variants, wall edges, corners, doors, stairs, rubble, and a few props. Keep walkability more obvious than decoration.
3. Add torch light and proper fog of war using the visibility model. Different floor groups can use restrained palette/prop changes: entrance, crypt, ruined halls, final sanctum.
4. Prioritize hit readability: a short directional attack, visible damage/block indicators, enemy intention markers, and a clearly framed boss health display. The current damage flash is not applied to enemies drawn with images.
5. Reduce camera shake and make animation timing independent of display refresh rate. Respect reduced-motion settings. Separate the HUD/log from the playable area so they do not obscure tiles.
6. Add short sound cues for movement, attacks, blocks, loot, potions, stairs, danger, and victory, plus a saved sound toggle. Start audio after a gesture. A quiet dungeon ambience is optional after the core effects work.

## Quality of life and replayability

- A responsive game viewport and correct pointer-coordinate scaling; the new splash is responsive, but the existing fixed-size gameplay canvas is not.
- Keyboard-operable inventory items and real buttons for close/use, sensible focus handling, readable stat comparisons, and a quick potion action.
- Touch movement and action buttons if mobile play is a goal; resizing alone will not make the current keyboard game playable on a phone.
- A saved in-progress run with a versioned snapshot and RNG seed. Turn-based play particularly benefits from a reliable suspend/resume option.
- An end-of-run recap showing class, deepest floor, XP, turns, build, and cause of death. Allow skipping high-score entry.
- Seeded challenge runs and unlockable class/perk choices for replayability. Add permanent stat bonuses only if that progression is an explicit design goal; they can obscure whether the tactical balance works.

## Suggested implementation order

| Phase | Deliverable | Completion evidence |
|---|---|---|
| 1 — Run integrity | Restart reset, generation fallback, unique spawn allocation, terminal-state guards, XP overflow, consistent turn rules | Deterministic tests; thousands of generated floors across all depths; death/restart and victory/restart browser checks |
| 2 — Tactical prototype | Two class abilities, wall-aware visibility, shared movement rules, three enemy behaviors, one telegraphed boss | The same encounter supports visibly different class strategies; threats are understandable before damage |
| 3 — Build and exploration choices | Perk selection, reliable early loot/recovery, item sidegrades, a few room types | Each early run offers at least one meaningful build and route choice; track recovery availability and unused loot |
| 4 — Presentation and usability | Normalized sprites, tiles, lighting, combat effects/sound, responsive HUD and accessible inventory | Visual/browser checks at target sizes, reduced-motion/audio tests, complete keyboard inventory flow |
| 5 — Replay and balancing | Saved runs, seeds, run summaries, class/enemy/loot tuning | Full ten-floor playtests across all classes; compare death floors, choices, and win rates before adding more content |

My recommendation is to implement **phase 1 first, then a two-class tactical prototype alongside the sprite-scale cleanup**. That is the smallest coherent upgrade that improves both trust in the game and the reasons to play another run. Schedule estimates should follow the chosen scope and artwork approach; the audit does not justify a reliable calendar estimate yet.
