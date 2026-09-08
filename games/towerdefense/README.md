# Kingdom Defense — The Crystal Watch

A standalone Canvas 2D tower defense game. Open it through the Arcade Hub, or serve the repository and visit `/games/towerdefense/`:

```sh
python3 -m http.server 8000
```

## Playing

Choose one of three realms. Starting in Misty Valley and continuing through the other two realms counts as a full campaign. Each realm resets towers, lives, and the treasury; campaign kill score carries forward. Individual realms remain available for practice.

- Select a tower, then choose open ground. Its ghost and range show before purchase; covered path tiles light up. Invalid placements explain why they cannot be built.
- On touch, tap a tile to preview it, then tap **Build here** or tap the same tile again. Drag to pan; use the camera buttons to zoom or reset.
- Click an existing tower to compare its next upgrade, sell it for half the gold actually invested, or select first / strongest / fastest targeting.
- Click the wave report to inspect health, enemy traits, suggested counters, and the final boss. Reading the report pauses the game.
- `1–5` selects a tower. With the battlefield focused, arrows choose a tile and Enter builds or inspects. Escape cancels a selection or pauses; P pauses; Space starts a wave or pauses an active wave. Scrolling zooms around the pointer.
- The game pauses when the window loses focus or the document is hidden. Resume explicitly. Restart and realm selection are available in the pause menu.

Three stars require all 20 lives; two require at least 15; surviving earns one. Best medals and lives are stored locally. Full campaign victories can enter the existing Arcade Hub leaderboard. Existing records are retained. Sound starts after a player gesture; the mute preference persists locally.

An escaped boss destroys the crystal. Magic ignores armor and slows enemies. Ice freezes for 1.5 seconds; hits cannot extend an active freeze, and enemies receive 1.2 seconds of recovery before they can freeze again.

## Implementation

- `levels.js`: map layouts and waves.
- `entities.js`: tower/enemy statistics, enemy and projectile artwork.
- `art.js`: shared drawing primitives, tower families, scenery, and stronghold.
- `renderer.js`: fixed world geometry, camera transforms, terrain cache, depth sorting, and combat overlays.
- `game.js`: simulation and transactions. The historical `screenWPs` field contains **world coordinates**, not viewport pixels.
- `ui.js`: reports, inspector, dialogs, medals, and leaderboard.
- `controls.js`: keyboard, touch, camera, and pause behavior.
- `audio.js`: bounded synthesized effects and quiet filtered ambience, without sound downloads.

The world uses fixed 72×36 isometric tiles. Resizing changes only the camera and DPR-aware backing canvas; monster movement, targeting, splash radius, and projectiles stay in world coordinates. Static terrain is cached once per realm; upright objects share a depth sort, with range highlights above the ground and health bars above units. Ambient animation and hit flashes respect reduced-motion preferences.

No build step or external JavaScript dependencies are required. The HTML uses a shared asset query version; bump it when publishing another coordinated script/style update to prevent mixed cached versions.

## Verification

Run the dependency-free regression suite from the repository root:

```sh
node games/towerdefense/tests/game.test.mjs
```

The suite covers tile hit testing, zoom/pan, viewport-independent wave outcomes, resize stability, refunds at each upgrade tier, boss escapes, duplicate and splash rewards, pause guards, freeze recovery, armor penetration, targeting, and medal validation/preservation.

Open `tests/art.html` through the same local server to inspect all tower tiers, enemy families, and bosses together.

Browser checks for this upgrade covered 320, 390, 768, 1024, and 1440px widths; keyboard and mouse placement; upgrade/sell; scouting and pause/resume; resizing and camera controls; touch preview/confirmation; mute persistence; a full five-wave Misty Valley clear; and medal persistence after reload. Visual and gameplay checks should also be run through the Arcade Hub iframe when making future changes.
