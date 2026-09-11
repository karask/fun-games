# Tiny Dungeon upgrade verification

Verified locally on 2026-09-11.

## Scope completed

| Area | Implemented |
|---|---|
| Reliability | Fresh-run reset, synchronous terminal transitions, six connected rooms, checked spawn allocation, four-direction pathfinding, wall-aware sight/inspection, XP overflow |
| Classes | Equipped kits; Fighter guard/cleave, Mage bolt/charge recovery, Priest ward/healing/potion blessing, Rogue Shadowstep/evasion/opportunity; even-level perk choices |
| Enemies | Pursuers, aimed ranged attacks, delayed heavy strikes, recovery openings, floor-4/floor-8 seals, three final bosses with second-phase changes |
| Exploration | Two routes, sanctuary camp, shrines, blood chests, optional elites, armory choices, guaranteed recovery, tiered loot, spear reach, heavy-armor mobility tradeoff, build rings, real dropped items |
| Presentation | Closer responsive camera, minimap, stonework/doorways/props/torches, four biomes, normalized existing sprites, native fallback creatures/items, hit/lunge/block feedback, threat markers, separate HUD/log/boss bar, reduced motion |
| Usability/replay | Keyboard inventory and comparisons, quick potion, touch controls, saved sound toggle, validated versioned run snapshots/RNG state, custom/daily seeds, perk unlocks, recap and optional initials |

Optional ambience was not added; the review explicitly treated it as optional. Permanent stat bonuses were also excluded in favor of unlockable choices. No unrelated games were changed.

## Automated checks

- **17 engine tests passed**, including 5,000 connected layouts across all ten depths, run resets, wall-blocked sight, overflow leveling, save validation/determinism, class abilities/passives, turn costs, terminal guards, guardian gates and all five boss patterns.
- **5 audio tests passed**: gesture-only creation, persisted mute, inactive-state suppression, throttling/voice release and unavailable audio.
- The current audit generated **5,000 floors**, with **zero generation errors**, **zero initial overlaps**, six rooms per floor and **5,000 successful save round trips**. A 500-XP grant reached level 9 with correctly retained overflow and four queued choices.
- `git diff --check` and JavaScript syntax checks passed. A temporary pinned formatter was used; no application dependency was added.

The seeded playthrough probe and its per-class outcomes are recorded in `review/balance-results.json`. The bot uses legal actions and never changes HP, stats, maps or RNG, but knows the whole map. This verifies reachability and run completion; it is **not evidence of human win rates or long-term balance**. Bot navigation was corrected to compare actual route lengths for enemies and recovery rooms, avoiding oscillation around walls.


| Class | Completed wins / 20 | Action-budget limits |
|---|---:|---:|
| Fighter | 20 | 0 |
| Mage | 18 | 2 |
| Priest | 20 | 0 |
| Rogue | 20 | 0 |

Two Mage simulations hit the 5,000-action cap while still alive, on floors 4 and 10; they are not counted as completed runs. These conservative-bot encounter loops remain a limit of the balance evidence and warrant human playtesting.

## Real browser checks

Used an isolated headless Chrome session against the local static server, with native mouse/keyboard input. The reproducible script is `tests/browser.mjs`; it expects the local server on port 8765 and isolated Chrome CDP on port 9223. Screenshots are written to `/tmp`.

- Started all four classes; checked equipped inventories, ability charges/cooldown, and keyboard-open/close behavior.
- Completed a ten-floor Fighter adventure, including loot/equipment/perk choices, both guardians and the final Ancient Dragon: **1,017 turns, 75 foes, level 12**. An earlier complete run defeated the Demon King.
- Victory → menu → Rogue correctly restarted on **floor 1, turn 0**.
- Separately let a Mage die to an elite, verified its recap, and restarted a Priest on **floor 1, turn 0**.
- Saved, reloaded and continued a run with turn count preserved. Sound preference survived reload.
- Viewed desktop and 390px/320px layouts, including reduced motion. All action buttons fit inside the 320px viewport; no horizontal overflow. Inventory items are focusable native buttons, and long packs scroll.
- Final browser script reported **zero JavaScript exceptions and zero failed resource requests**.
- A local 1.2-second idle gameplay sample used about **0.16 seconds of browser task time**. This is a headless desktop observation, not a mobile hardware benchmark.

## Practical limits

This is a complete implementation of the requested feature set, with deterministic regression and real-browser coverage. Difficulty, class preference and repeated-run variety still need human playtesting. The constructive six-room layout intentionally favors reliability and readable choices over a large procedural map. Graphics combine cropped existing raster art with code-drawn fallback sprites, rather than introducing a new external art pipeline.
