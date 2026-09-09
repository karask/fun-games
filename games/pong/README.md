# Cyber Pong

## Upgrade plan

Keep the quick, first-to-five neon Pong match. Make it enjoyable alone and on
touch screens, give players control over their shots, and make every state clear.

- Solo versus a speed-limited, fallible CPU (easy / normal / hard), plus local
  two-player play. Solo accepts W/S, arrows, mouse, or touch; versus uses W/S on
  the left and arrows on the right, or one touch on each half of the court.
- Fixed 120 Hz simulation with bounded frame catch-up and swept paddle contacts.
  Paddle position aims the shot; paddle movement adds a little spin. Rally speed
  increases to a cap, with a minimum horizontal speed to avoid vertical stalls.
- A short serve countdown, first to five, pause/resume, automatic pause on lost
  focus, full match reset, immediate rematch, and optional record entry.
- Responsive court, distinct pink/cyan sides, visible rally and speed indicators,
  restrained hit/trail effects, optional synthesized sound, and reduced motion.
- Preserve the existing `pong` longest-rally leaderboard and Arcade Hub launch.
  Do not require a record submission to leave the results screen.

## Implementation

Vanilla ES modules and Canvas 2D, without dependencies or a build step. Keep
simulation and timing in `engine.mjs`; `game.js` handles DOM, input, drawing and
audio. Keep responsive styles in `style.css` and use four-space indentation:

```js
if (match.phase === 'playing') {
    match.step(input);
}
```

Build incrementally: prove the simulation and scoring first, connect the complete
menu/match flow next, then verify and tune presentation in Chrome. Changes stay
inside `games/pong`. Run tests before commits; ask before adding dependencies or
changing shared storage formats; never overwrite unrelated edits.

## Verification

Serve: `python3 -m http.server 8021 --bind 127.0.0.1`

Test: `node --test games/pong/engine.test.mjs`

Use Node's built-in runner for collision, spin, clamping, scoring, countdown,
pause, CPU and timing regressions. Browser checks cover real keyboard and pointer
input, menu/start, pause and lost focus, complete match/rematch, optional initials,
solo and versus, small screens and the Arcade Hub iframe. Inspect screenshots,
console/network errors and keyboard focus before completing the change.
