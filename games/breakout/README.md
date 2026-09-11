# Neon Breakout

A 20-level arcade game with mouse, touch and keyboard controls. Serve through the repository's local HTTP server and open `games/breakout/`.

## Controls

- Mouse or drag: move the paddle. Pointer positions map to the logical arena at any display size.
- Left/right arrows or A/D: keyboard movement.
- Space, click, tap, or **Launch / Fire**: release attached balls or fire an active laser. Hold Space for continuous laser fire.
- P, Escape, or **Pause**: pause/resume. Losing window focus automatically pauses and clears held input.

The dotted guide shows the serve direction. Paddle edges send sharper shots; paddle returns preserve the current ball speed. All balls must be lost before one life is deducted. Each new life resets boosts and provides an attached ball. Break every non-steel brick to advance.

## Bricks and boosts

Colored bricks break in one hit; violet armored bricks require two and display damage. Gold blast bricks damage nearby bricks and can trigger chain reactions. Steel reflects balls and blocks lasers without taking damage. Level 17's castle has an entrance so its interior is reachable without a power-up.

There are eight pickups: wide paddle (10 seconds), slow ball (8⅓ seconds), multiball (up to six balls), laser (8⅓ seconds), extra life (up to three), small ball (8⅓ seconds), through ball (6⅔ seconds), and magnet (5 seconds). Repeated timed pickups refresh their effect rather than compound it. Through balls damage each brick once per crossing but still bounce off steel. Magnet catches remain attached until released. The footer shows remaining boost time and the current brick rally; rallies do not multiply score.

## Implementation and verification

`physics.mjs` runs gameplay at 120 Hz with half-frame updates in the level data's original 60 Hz units. It sweeps the ball against rectangle faces and rounded corners, resolves earliest collisions, and caps stall catch-up at 100 ms. Launch, paddle returns and slow expiration use a single level-speed source. Explosions run inside the simulation, avoiding delayed callbacks affecting a new level. One animation loop serves every screen.

The canvas retains an 800 × 560 logical arena and renders at up to 2× pixel density. Layouts adapt to narrow screens; reduced-motion preferences remove ball trails, glow, pickup rotation and expanding impact rings.

Run tests:

```sh
node --test games/breakout/tests/*.test.mjs
```

Coverage includes frame-rate independence, high-speed and corner collisions, paddle angles, scaled pointer coordinates, power-up duration and refresh behavior, explosions, life loss, multiball release, transitions, and reachable destructible bricks across all 20 levels. Reachability checks verify geometry, not a full campaign playthrough.
