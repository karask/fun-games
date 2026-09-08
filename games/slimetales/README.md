# Slime Tales

Serve the repository (for example, `python3 -m http.server 8000`) and open
`/games/slimetales/`, or launch Slime Tales in the Arcade Hub.

Level 2, **The Squeeze Works**, unlocks after clearing Level 1. Its route teaches
squeezing and wall jumps over safe ground, then combines them with a toxic-pool
crossing and a final tunnel. See [the level design](LEVEL_2.md) for the layout.

## Controls

- Player 1 uses the arrow keys; player 2 uses WASD.
- Press up to jump. Hold for a full jump, or release early for a shorter hop.
  Each jump requires a new press. A short grace period at ledges and a landing
  input buffer make closely timed jumps forgiving.
- Hold down to squeeze. The slime flattens and spreads in open space, compresses
  sideways for narrow shafts, and recovers when there is room. Releasing down
  inside a tunnel cannot force the slime into its ceiling.
- Press toward a solid wall while airborne to grip and slide slowly. Press jump
  to push away, or down to let go. Spikes and toxic tiles remain hazardous.

## How it works

`game.js` keeps a responsive platform controller with collision dimensions that
change smoothly while squeezing. Movement retains the existing 60 Hz tuning;
`physics-clock.mjs` advances it at a fixed timestep regardless of display refresh
rate. Long suspended-tab gaps are discarded, and losing focus clears held input.

`slime-body.mjs` maintains a ring of 20 points, linked by damped springs and pulled
toward the controller's changing shape. Landing impulses spread the body; jumps
stretch it; acceleration and the face lag behind movement. Each point is projected
out of solid terrain, so contact flattens the outline locally. The renderer clips
the face and highlights inside that outline. Reduced-motion preferences suppress
the additional stretch and crawling ripples.

This is a hybrid controller and deformable skin, not a fluid simulation or a copy
of Slime Laboratory's engine. The controller provides predictable platforming;
the springs provide softness. Both players share the same physics.

## Verification

```sh
node games/slimetales/tests/physics.test.mjs
node games/slimetales/tests/level-2.test.mjs
```

The tests run the shipped controller with small tile fixtures. They cover fixed
timing, jump input and repeat, ledge grace, buffered and variable-height jumps,
floor/platform collisions, horizontal and vertical squeezing, safe recovery,
wall grip/release/jumps, elastic settling, terrain contact, hazards, and revival.
The Level 2 tests check safe spawn and flag positions, required squeeze and wall
jump encounters, and complete routes from both spawns with varied takeoffs.

For browser checks, exercise full and short jumps, squeeze through the first
level's tunnel, release down beneath its ceiling, grip and jump from a wall, and
verify the arrow/WASD controls independently in two-player mode. Check the game
both directly and inside the Arcade Hub iframe.

This update passed 24 regression tests and browser checks for a complete first
level, its squeeze tunnel, wall grip and jumping, independent two-player controls,
and Arcade Hub launch. The two-player browser sample had a 16.7 ms median and
95th-percentile frame interval; this is a local headless Chrome measurement.

Level 2 passed all 33 controller and level tests, full keyboard playthroughs in
solo and co-op modes, and launch through the Arcade Hub with no browser errors.
