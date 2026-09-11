// Current-engine integrity audit. The review preserves the historical baseline findings.
import {
  createRun,
  generateFloor,
  grantXP,
  snapshot,
  restore,
} from "../engine.mjs";
const results = {
  floors: 0,
  generationErrors: 0,
  overlaps: 0,
  roomCounts: {},
  saveRoundTrips: 0,
};
for (let seed = 1; seed <= 500; seed++)
  for (let floor = 1; floor <= 10; floor++) {
    try {
      const s = createRun("Fighter", String(seed));
      s.floor = floor;
      generateFloor(s);
      results.floors++;
      results.roomCounts[s.rooms.length] =
        (results.roomCounts[s.rooms.length] || 0) + 1;
      const points = [
        s.player,
        s.stairs,
        ...s.enemies,
        ...s.items,
        ...s.features,
      ];
      if (new Set(points.map((p) => `${p.x},${p.y}`)).size !== points.length)
        results.overlaps++;
      if (restore(snapshot(s))) results.saveRoundTrips++;
    } catch {
      results.generationErrors++;
    }
  }
const s = createRun("Mage", "xp-overflow");
grantXP(s, 500);
results.xpOverflow = {
  level: s.player.level,
  xp: s.player.xp,
  nextXp: s.player.nextXp,
  pendingPerks: s.pendingPerks,
};
console.log(JSON.stringify(results, null, 2));
if (
  results.generationErrors ||
  results.overlaps ||
  results.saveRoundTrips !== results.floors
)
  process.exitCode = 1;
