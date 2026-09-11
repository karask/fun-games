# The Shattered Crown: improvement review

Reviewed on 2026-09-11. **Historical review of the previous game. The recommended upgrade has now been implemented.** See [README.md](README.md) for the current architecture, features and verification. Findings below describe the pre-upgrade version.

The strongest direction is an **illustrated investigation adventure**: atmospheric places, evidence worth remembering, characters who react to what you discover, and deliberate moral choices. The existing 18-room world is enough for a substantial improvement without first expanding its size.

## Current foundation

The game contains 18 rooms, 14 item definitions plus the introductory shard, six NPC definitions, and three endings. It uses six movement verbs, six action verbs, and a two-target item command builder. There are 14 configured use pairings, including five equivalent crown-assembly pairings and two ending triggers. Most progression puzzles use a single expected item on a clearly signposted obstacle. Search currently executes the same logic as Examine.

The dark palette, fantasy typography, branching geography and recurring clues already support its mood. However, there are no illustrated room scenes, no audio, no saved adventure, no journal or map, and little mechanical consequence for investigating clues or helping characters. The current high score is determined solely by ending: 1, 2 or 3 points.

## 1. Repair reliability and player control first

| Finding | Evidence | Change |
|---|---|---|
| First entry to the Great Hall throws an exception | `enterRoom()` dereferences `npcs.aldric_reveal`, which is not defined. The audit reproduced the error; the room changes before it throws, so a subsequent South command still reaches the throne room. | Remove the obsolete trigger or supply a deliberately written scene. Validate all room/NPC references. |
| Earlier commands cancel newer ones | Completion schedules an unconditional clear after 600ms; empty target lists do so after 1,500ms. Browser reproduction: Examine Scrolls → immediately Use → the new Use selection disappears. | Cancel old timers or associate callbacks with the command that created them. Add an explicit cancel action. |
| Mobile navigation extends off-screen | At emulated 390px, the West button started around x=-38. At 320px it was entirely off-screen, around x=-72 to -12. The rightmost verbs also overflowed. | Reflow the compass/actions into rows or tabs, with accessible touch targets and room for narrative text. |
| The journal bypasses its reachability gate | Pick Up hides it until `chasm_crossed`; Read offers and reveals its complete text without crossing. Reproduced through normal browser controls. | Apply reachability consistently to reading, using and picking up items. |
| Talking can silently commit the final ending | Talking to the post-assembly Aldric directly calls `triggerEnding('dark')`. | Keep conversation safe. Present explicit final decisions with player-authored intent, such as agreeing to the ritual. |
| The introductory text delays every new game | Start appears only after the typewriter finishes. Configured minimum is about 22.7 seconds, before scheduling overhead. No skip or instant-text setting exists. | Show Begin/Continue immediately; let readers reveal or skip text, and save their text-speed preference. |
| Exploration progress cannot be resumed | Only ending scores are stored. Room items and exits mutate the imported content objects. | Add versioned autosaves, a fresh-world factory, and validated restoration of room state, inventory, flags and visited locations. Keep story definitions separate from mutable run state. |

Also standardize the initial shard as a real item definition, prevent late dialogue callbacks appearing in the wrong room, provide a high-score skip button, and refresh descriptions so removed items and opened paths remain consistent.

## 2. Give the world an illustrated identity

- Redesign the splash around the broken crown, a distant citadel and the promise of a mystery. Include **New journey**, **Continue**, and reading/audio settings.
- Add landscape illustrations for all 18 rooms, produced in coherent regional groups: ruined village, forest, mountains, marshes and citadel. Start with a shared visual direction and five regional scenes, then give important rooms distinct compositions.
- Add portraits for the major speaking characters, with subtle expression changes when their knowledge or trust changes.
- Use restrained embers, drifting mist, lantern light and shard glows. Respect reduced motion and retain instant scene changes as an option.
- Use a centered reading column, stronger dialogue attribution, consistent vector icons and a clearer distinction between a room description, dialogue, discoveries and action results.
- Add quiet regional ambience and short cues for discoveries, doors, item use, shard collection and endings. Audio starts after interaction and has saved mute/volume controls.

Artwork should reinforce place and story. Interactive hotspots can supplement text links and accessible buttons; essential clues should never depend on finding a tiny pixel.

## 3. Make discovery change what the player can do

The current story contains clues, but the engine mostly prints them and forgets that the player read them. Introduce an **evidence journal** that records discoveries, their sources and unresolved questions.

For example, examining the wrist rune and comparing it with the village’s burn marks could unlock a question for Aldric. Later testimony or written evidence could strengthen or contradict his answer. This turns existing descriptive material into a chain of investigation.

Use three small evidence groups: **your identity**, **the Crown’s purpose**, and **Aldric’s intentions**. Discoveries unlock conversation topics, interpretations or alternative solutions. Avoid a mandatory numerical “evidence score” that blocks players from making a reasoned final choice.

Let each shard restore a different fragment of memory. Stage revelations across the journey: Yarrow’s current early speech and the journal disclose much of the central mystery outright. Preserve the facts while letting the player connect them progressively.

## 4. Add consequential dialogue and choices

Give conversations topic choices, follow-up questions and responses to previously discovered evidence. Character trust can be represented with a few explicit story flags rather than a large relationship-stat system.

Examples:

- Healing the knight earns testimony and later assistance or changes his epilogue.
- Being honest with Yarrow earns a ritual clue; intimidation offers another route but damages the relationship.
- Pyraxis offers a bargain, a question about a recovered memory, or a choice involving an old relic before relinquishing the shard.
- Confronting Aldric with contradictions changes his tactics and the final conversation.

Keep the three existing ending themes, but reflect earlier decisions in their scenes and character outcomes. The final action should conclude a journey the player shaped.

**Narrative consistency needs attention:** characters and the journal warn against reassembling the Crown, yet the current redemption path requires assembling it before it can be destroyed. Either establish clearly why temporary assembly is necessary to break its magic, or provide an evidence-based alternative ritual.

## 5. Make puzzles more satisfying and fair

Build a few richer puzzles before adding rooms:

- A shrine mechanism solved by connecting inscriptions found in two places.
- A temple crossing solved with rope, or by restoring a drainage mechanism.
- A dragon encounter resolved through a bargain, knowledge or protection.
- A citadel ward that responds to what the player has learned about their identity.

Retain simple introductory puzzles to teach verbs. Later puzzles should build on those rules, support sensible alternative combinations, and give specific feedback when an attempted solution almost works.

Add optional hints in three stages: **where to investigate → what connection matters → explicit solution**. Make Search reveal concealed details where appropriate, or remove it as a separate verb; presently it duplicates Examine.

The compass needs a real function. The audit reached all endings without collecting it, despite descriptions repeatedly assuming it is being carried. It could locate unresolved shard leads or stabilize a shifting route, with an alternate solution for players who miss it. Otherwise, describe its role as optional and stop assuming possession.

## 6. Remove friction and support replay

- Show available exits and discovered blocked routes, with concise reasons for blockage.
- Add an explored map, region labels and shortcuts between resolved areas. Clearly signal the citadel’s current point of no return.
- Let players click a named object to inspect it, then choose relevant actions. Retain the classic verb builder as an option.
- Show nearby objects and items explicitly. Inventory items should have a useful default inspection action and readable descriptions.
- Move the five visually identical shard entries into a crown display with individual origins/memories. Keep tools and documents easy to find.
- Preserve dialogue and discoveries in a journal/history view instead of losing them whenever rooms change.
- Add keyboard shortcuts, focus handling, adjustable font size, instant text and reduced motion.
- Add autosave and a checkpoint before the finale, with deliberate replay of the final chapter.
- Replace or supplement the 1/2/3-point leaderboard with an ending collection and journey record: clues found, people helped, decisions made and mysteries unresolved. Keep unreached ending details hidden.

## Suggested delivery order

1. **Reliable and comfortable:** repair the confirmed errors, mobile controls, command cancellation and interaction gates; add immediate start, autosave and explicit final choices.
2. **Presentation:** new splash, scene illustrations, portraits, readable layout and sound settings.
3. **Investigation:** evidence journal, map, contextual interactions, progressive memories and richer conversations.
4. **Depth and replay:** alternative puzzle solutions, consequences across regions, revised finale logic and ending collection.

For every stage, test all three endings, different shard collection orders, optional-item omissions, repeated/rapid commands, save/reload during partially solved puzzles, and keyboard/mobile navigation. A content validator should catch missing references before the browser runs the scene.

## Verification limits

Browser review covered intro pacing, the starting room, desktop/390px/320px layouts, command cancellation, and the temple journal gate. A separate simulated-DOM audit reproduced the Great Hall exception and followed a complete legal route to each ending trigger, recording the exception and continuing as a player can. It did not browser-play all three ending sequences or assess their pacing with human testers.

The original simulated-DOM probe has been replaced with the current passing regression audit: `node games/textadventure/review/audit.mjs`. The acceptance tests and browser verification are documented in README.md.
