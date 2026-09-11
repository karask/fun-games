# Neon Survival

An endless keyboard arena game. Open `index.html` through the repository's local HTTP server.

- **WASD / arrows:** move with quick acceleration and braking.
- **Hold Space:** fire at the closest enemy.
- **Shift:** dash in the movement direction (or last movement direction while stationary). The dash lasts 0.16 seconds, protects for 0.22 seconds, and recharges in 2 seconds.
- **P / Escape:** pause or resume. Losing focus automatically pauses and clears held keys.

Pink hexagons are slower enemies; amber triangles are faster enemies. Edge markers warn of incoming enemies. Hits grant 0.85 seconds of recovery protection. Each 200 points raises the threat level; enemy speed and health have upper limits so movement remains useful late in a run.

Green `+` pickups restore up to 30 hull. Yellow lightning grants rapid fire; violet `Ⅲ` grants triple shot. Weapon boosts last 10 seconds. Pickups expire after 10 seconds and drift toward the player within 90 world units. The HUD and rings around the player show remaining boost time.

`physics.mjs` runs simulation at 120 Hz, caps catch-up after stalls at 100 ms, normalizes diagonal movement, and checks the full bullet segment for collisions. `renderer.mjs` draws the 800 × 600 logical arena at up to 2× pixel density. Reduced-motion preferences disable pulsing, hit-border flashes, and glow effects.

Run regression checks:

```sh
node --test games/survival/tests/*.test.mjs
```

Tests cover refresh-rate independence, stalled frames, movement and dash bounds, bullet tunneling, damage recovery, pause/input clearing, fatal-hit ordering, and restarting/menu transitions. Browser checks should also cover start → move/fire/dash → pause/resume → game over → replay/menu, including a narrow viewport.
