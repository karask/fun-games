# The Shattered Crown

An illustrated investigation adventure with 18 locations, five recovered memories, three ending themes and an alternative unbinding route.

## What changed

- Immediate illustrated splash; original SVG scenery for all 18 rooms in five regional palettes; character portraits, restrained motion and state-aware scenes.
- Evidence journal organized around identity, the Crown and Aldric; source attribution, memory collection and conversation history (the most recent 600 entries).
- Topic-based dialogue. Healing the knight opens the citadel; Yarrow’s trust unlocks an unbinding vow; Pyraxis accepts memories, a recovered seal, a promise or a shield-backed demand. These choices change character epilogues and journey records.
- Shrine inscription sequence, rope or sluice crossing, shield or spoken heat ward, compass or memorial route, and identity or knight assistance at the citadel. Search reveals temple controls and the dragon’s lost seal. Three-stage hints explain solutions without consuming resources.
- Explored map with travel over open, visited paths; contextual objects, a separate shard tracker, optional classic commands, keyboard shortcuts and mobile navigation between reading and actions.
- Versioned autosaves, validated restoration, a separate final-chapter checkpoint, an ending collection and the last 12 journey records. No ending is committed by talking or ordinary item use.
- Adjustable text size, instant or cancellable revealed text, reduced-motion support, saved audio controls, regional ambience and short synthesized cues. No external art, font or audio downloads.

The original Great Hall exception, command-clear race, remote journal reading and shared mutable-world problems are removed. The journal now explains temporary containment in the empty frame; a trusted Yarrow also supports release without reassembly. No combat or time pressure has been added to this reading-focused game.

## Structure

`data.js` retains the original content. `story.mjs` layers the revised descriptions, evidence, memories and mechanisms onto independent content definitions. `engine.mjs` owns serializable journey state and legal actions, without DOM, timers or storage dependencies. `game.js` handles rendering, native controls, saves and cancellable text. `art.mjs`, `audio.mjs` and `style.css` provide presentation.

Saved state tracks collected and consumed items separately, discovered evidence, visits, dialogue flags, partial mechanisms, hints and history. Content definitions are never modified by a journey. Storage keys use the `shattered_crown_` prefix and `v1` suffix. Invalid run data is rejected; unavailable storage leaves the game playable for the current session. Starting a new journey replaces the active run and its checkpoint but retains the chronicle and settings. The old ending-only leaderboard is left untouched.

## Run and verify

Serve the repository using its normal static server and open `/games/textadventure/`. There is no game-specific build step or dependency installation.

From the repository root:

```sh
node games/textadventure/tests/engine.test.mjs
node games/textadventure/tests/audio.test.mjs
node games/textadventure/review/audit.mjs
```

Engine coverage includes all 24 orders of collecting shards 2–5, each of the three endings, the unbound release, four dragon branches, both temple solutions, optional tool omissions, knight assistance, save restoration after every action in the route fixture, partial mechanisms, reachability, safe dialogue, terminal guards, hint limits and content references. Audio tests check gesture creation, repeated-cue limits, regional transition cleanup, mute and unsupported browsers.

Browser verification on 2026-09-11 used an isolated Chromium session and native mouse/keyboard inputs. An 81-action journey reached the throne; explicit choices and checkpoint replay reached all three endings and the unbound variant. Reload restored the journey exactly. Checks covered persisted audio settings, rapid command selection, the explored map, 22 px reading text, cancellation of text reveal on movement, explicit Escape dismissal, reduced motion, keyboard shortcuts, and desktop/390 px/320 px layouts. The full route produced no JavaScript exceptions or failed resource requests. The screenshots were inspected for scene composition and usable mobile actions.

The historical findings are in `GAMEPLAY_REVIEW.md`. Automated route coverage does not replace human evaluation of puzzle difficulty, prose pacing or speaker balance. Saves and the chronicle remain local to this browser; there is no cloud synchronization.
