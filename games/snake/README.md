# Neon Snake

Serve the repository with `python3 -m http.server 8000`, then open
`http://localhost:8000/games/snake/` or select Neon Snake in the Arcade Hub.
There is no build step or additional dependency.

## Playing

- Solo: arrow keys or WASD. On touchscreens, swipe on the board or use the direction pad.
- Two players: P1 uses WASD, P2 uses arrows. First to three round wins takes the match; tied rounds are replayed. Rematch resets the tally.
- Space or Escape pauses; the visible Pause button works on touchscreens. Resume includes a one-second countdown. Switching tabs or leaving the game window automatically pauses play. Use Resume after returning.
- After a run, use Play again or Space. A qualifying solo score can be saved with one to three letters/numbers, or skipped.

Relaxed runs at 150 ms per move, Fast at 70 ms. Classic starts at 110 ms,
speeds up by 6 ms every five apples, and caps at 60 ms. In two-player Classic,
both players' apples contribute to the shared pace.

Normal apples always remain available: one in solo, two in multiplayer when
space permits. They give 10 points and one segment. Optional gold diamonds give
50 points and three segments; purple minus signs cost 20 points and shorten
the snake by up to two segments. Length never falls below three and scores
never fall below zero. Shrink first cancels any pending growth.

The first optional bonus appears after six seconds of active play. Each bonus
lasts eight seconds, indicated by its ring; later spawn opportunities are 14
seconds apart. Pauses and countdowns freeze the simulation and food timers.

Two turns can be buffered. Collisions are resolved simultaneously after
accounting for moving tails and growth. Entering a vacating tail is legal;
head-on collisions and head swaps eliminate both players. Filling the board
completes the run instead of retrying food placement forever.

## Records and preferences

New solo scores use separate `snake_solo_relaxed`, `snake_solo_classic`, and
`snake_solo_fast` IDs in the existing high-score storage helper. Multiplayer
uses a match tally and does not enter solo leaderboards. Old mixed-mode
`snake` scores are preserved under Previous version scores, including in the
Hub's Trophy Room. All records are local to the current browser/device.

Sound starts off. Sound, difficulty and reduced-effects choices are remembered
when browser storage is available. Reduced effects initially follows the OS
reduced-motion preference and disables particles, floating scores and glow.
Sound uses short synthesized tones and requires no media downloads.

## Verification

Run the deterministic rule regressions with Node 22 or newer:

```sh
node games/snake/engine.test.mjs
```

The suite covers buffered input, vacating/growing tails, simultaneous
collisions, growth/shrink limits, scoring, permanent apples, bonus expiry,
board completion and speed limits.

Browser checks should cover:

- Menu and board at 320, 768, 1024 and 1440 px, plus the Hub iframe.
- Start countdown, pause/resume, automatic pause and frozen bonus rings.
- Eat an apple, end the run, save initials with Enter, skip, and play again.
- Difficulty-specific records and the Hub's leaderboard selector.
- A multiplayer tie, three round wins, and a rematch with zeroed counters.
- Touch swipes, direction buttons, pointer cancellation and visible Pause.
- Keyboard focus in dialogs, persistent mute/reduced effects, and no runtime errors.

`engine.js` contains the simulation; `game.js` controls screens and input;
`renderer.js` owns canvas effects and sound; `records.js` renders safe score
tables using the shared storage helper.
