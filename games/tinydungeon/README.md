# Tiny Dungeon

A ten-floor, turn-based dungeon crawler. Open `index.html` through the repository’s static server. No build step or dependencies are required.

## Controls and turn rules

| Action | Keyboard | Touch |
|---|---|---|
| Move / bump attack | WASD or arrows | Direction pad |
| Class ability | Q; Mage/Rogue then choose direction | Ability, then direction |
| Aim weapon (including spear reach) | F, then direction | Aim, then direction |
| Interact / collect / descend | E | Interact |
| Quick potion | H | Potion |
| Inventory | I; Escape closes | Pack / Close |
| Wait | Space | Wait |
| Cancel targeting | Escape or repeat Q/F | Repeat Ability/Aim |

Opening inventory and choosing a perk are free. Moving, attacking, guarding, drinking, equipping, dropping and using a room feature spend a turn. Invalid actions do not. Held keys do not repeat turns. Walk beside room features and press E; stand **on** stairs to descend. Items are collected by walking over them; dropped items stay at your feet until E or a later visit.

Marked tiles resolve on the next enemy turn. Committed attacks have a recovery turn, creating a counterattack opportunity (the phase-two Demon King is explicitly faster). Enemies use four-direction movement and pathfinding. Walls block sight and bolts. The arrival chamber is a sanctuary that enemies do not enter.

## Classes and builds

- **Fighter:** guard reduces damage for one enemy turn. A block empowers the next attack, which cleaves adjacent enemies.
- **Mage:** six arc bolts per floor; every third kill restores one charge. Staffs and Focus rings improve bolts.
- **Priest:** three charges of healing plus a one-turn ward; shrines and entering a floor refill charges. Potions restore an extra 4 HP. Waiting never heals.
- **Rogue:** two-tile Shadowstep, a three-turn cooldown, and one-attack evasion. A successful dodge empowers the next hit. Heavy plate shortens the step and increases the cooldown.

Starting weapons are equipped. Even levels offer three perk choices. Reaching floor 4 unlocks Second wind for future runs; defeating a guardian unlocks Finisher. All classes remain available. Unlocks add build options, not permanent stat bonuses.

## Exploration

Each floor has six connected rooms and two routes. The upper route leads through a shrine and a blood chest (6 HP for one of three relics); the lower route includes an optional elite and a free armory choice. Every floor includes a potion and a single-use camp recovery. Loot pools change with depth. Floors 4 and 8 require defeating their guardians before descending. Floor 10 selects the Ancient Dragon, Demon King, or Archlich; all final bosses gain a second phase below half health. The Dragon widens its breath lane, the Demon King removes its charge recovery turn, and the Archlich summons more support.

## Saves and replay

Actions automatically save to this browser. **Save & menu** suspends the adventure; **Continue** restores it after reload. Starting another class replaces the suspended run. A completed run clears its snapshot and shows class, floor, level, turns, kills, XP, equipment, perks, seed and outcome. Initials are optional.

Custom seeds reproduce the same run when class, unlocks and decisions match. Daily seed uses the UTC date. Saves contain the RNG state, current threats, exploration and pending choices. Snapshot version 1 is validated before use; incompatible or malformed saves are ignored. Storage denial leaves gameplay available but prevents persistence. Sound is synthesized only after a gesture; its toggle is saved separately.

## Implementation decisions

`engine.mjs` owns serializable state and deterministic turn rules, independent of the DOM. `data.mjs` owns content and balancing values. `renderer.mjs` owns camera, tiles, code-drawn fallback sprites, cropped existing art and time-based effects. `game.js` owns DOM, keyboard/touch controls and persistence. `audio.mjs` bounds and throttles synthesized voices.

Constructive partitioning replaces rejection-based room placement: six rooms and connected alternate routes are guaranteed without retries. A free-cell allocator prevents initial overlaps. Loose items dropped during play intentionally may share a floor cell. Shared visibility drives both drawing and inspection. Rendering never advances game rules, and terminal states transition synchronously without stale callbacks.

The closer camera keeps sprites legible on phones; a small map preserves exploration context. Torches, four biome palettes, readable threat tiles, damage flashes and short lunges improve feedback without external assets. Reduced motion disables camera interpolation, lunges, shake and flicker. The HUD, boss bar and event log sit outside playable tiles.

## Verification

```sh
node games/tinydungeon/tests/engine.test.mjs
node games/tinydungeon/tests/audio.test.mjs
node games/tinydungeon/review/audit.mjs
node games/tinydungeon/tests/playthrough.mjs
# With isolated Chrome CDP on 9223 and the local static server on 8765:
node games/tinydungeon/tests/browser.mjs
```

The engine suite checks 5,000 generated layouts across all ten floors, spawn uniqueness, connectivity, restart state, FOV, XP overflow, saving, terminal turns, four class mechanics, inventory costs, guardian gates and five boss patterns. Audio tests check gesture unlock, mute persistence, throttling, lifecycle and unavailable devices.

The playthrough probe runs 20 deterministic seeds per class with no HP/stat/map cheats. Its navigation is omniscient, so its outcomes are regression evidence, **not human win-rate estimates**. See `VERIFICATION.md` for this implementation’s results and browser checks. Long-term difficulty and replay value still benefit from human playtesting.
