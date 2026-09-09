# Cyber Pong

## Play

Open `/games/pong/` or choose Cyber Pong in the Arcade Hub. Play a quick,
first-to-five match against the CPU or another player on the same device.

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

Press **Space** to start, **P / Escape** to pause or resume, or use the on-screen
buttons. Leaving the window pauses the match and clears held controls. Turn sound
on with the toolbar button; the preference is saved locally. Rally records are
shared across modes, following the existing leaderboard format.

## Implementation

Vanilla ES modules and Canvas 2D, without dependencies or a build step. Keep
simulation and timing in `engine.mjs`; `game.js` handles DOM, input and audio, and
`renderer.mjs` handles drawing and effects. Responsive styles live in `style.css`.
Use four-space indentation:

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

Test: `node games/pong/engine.test.mjs`

Use Node's built-in runner for collision, spin, clamping, scoring, countdown,
pause, CPU and timing regressions. Browser checks cover real keyboard and pointer
input, menu/start, pause and lost focus, complete match/rematch, optional initials,
solo and versus, small screens and the Arcade Hub iframe. Inspect screenshots,
console/network errors and keyboard focus before completing the change.

Verified on September 9, 2026:

- All 11 simulation regressions pass; JavaScript syntax and whitespace checks pass.
- Chrome completed solo and versus matches using real pointer/keyboard input.
  Record saving with Enter, persistence, skipping record entry, rematch and full
  reset passed. CPU defeat and Player 1 victory screens were inspected.
- Keyboard controls, pause/resume, focus loss, simultaneous touch on both halves,
  pointer release, reduced motion and keyboard focus after toggling sound passed.
- Menus were inspected at 320, 390, 768, 1024 and 1440 px widths, plus a short
  844×390 landscape viewport. The landscape playing court fits the viewport;
  tall menus scroll. Controls have accessible names and pause-dialog focus loops.
- Arcade Hub launch and controls passed. A local headless Chrome sample measured
  a 16.7 ms median and 33.4 ms 95th-percentile frame interval. The Pong page had no
  console errors; the Hub's existing `/favicon.ico` request returned 404.
