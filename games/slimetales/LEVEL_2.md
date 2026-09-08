# Level 2: The Squeeze Works

Build a second stage around the slime's new body and movement. Teach one action
at a time, give safe space to recover, then combine jumping and squeezing.

## Route

An 84×20 tile map, with the main floor at row 16:

| Columns | Encounter | Purpose |
| --- | --- | --- |
| 0–11 | Safe start and a shallow two-tile gap | Warm up; a missed jump is recoverable |
| 12–18 | One-tile-high tunnel | Require squeezing, with a clear exit |
| 19–27 | Rest area and revival flag | Release squeeze before the next action |
| 28–44 | Wall-jump chamber and raised landing | Teach gripping and jumping away over a safe floor |
| 45–53 | Descent and a clear approach | Give room to stop and line up the pool jump |
| 54–61 | Toxic pool with two broad platforms | Combine controlled jumps and landings |
| 62–74 | Rest flag and a final low tunnel | Combine the learned actions |
| 75–83 | Small recoverable gap and finish | A clear, safe end to the stage |

Both player spawns and all revival flags must have clear standing space. Hints
appear before each action and at the height of that encounter. The existing
unlock flow exposes Level 2 after completing Level 1.

## Implementation and verification

Keep the map and metadata in `levels_2_8.js`, following its existing `fill(map,
x1, y1, x2, y2, TILE.SOLID)` style. Add optional hint rows to `game.js`; existing
levels retain their default placement. Keep movement tuning and other levels
unchanged. No dependencies or build step are needed.

Run `node games/slimetales/tests/physics.test.mjs` and
`node games/slimetales/tests/level-2.test.mjs`. The level tests use the real
controller to complete the stage from each player's spawn, verify safe spawn
and revival locations, and prove the tunnel and wall-jump requirements.

Serve with `python3 -m http.server 8021 --bind 127.0.0.1`. In Chrome, enter Level 2
through level selection, play the entire route with keyboard input, inspect the
encounters and hints, and verify the completion screen and Arcade Hub launch.

Verified: all 24 physics regressions and nine Level 2 checks pass, including
complete routes from both spawns with takeoffs shifted by −8, 0, and +8 pixels.
Chrome keyboard playthroughs completed the entire stage in solo and co-op modes.
The tunnels, wall chamber, pool, hints, and completion screen were inspected;
Arcade Hub launch and squeeze controls also passed, with no browser errors.
