// ══════════════════════════════════════════════════════════════
// SLIME TALES — Level Data
// ══════════════════════════════════════════════════════════════

import { TILE } from './tiles.js';

// Re-export TILE so game.js can still import from levels.js
export { TILE };

// ── Helpers ──────────────────────────────────────────────────

function createMap(w, h) {
    return Array.from({ length: h }, () => new Array(w).fill(TILE.AIR));
}

function fill(map, x1, y1, x2, y2, tile) {
    for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
            if (y >= 0 && y < map.length && x >= 0 && x < map[0].length)
                map[y][x] = tile;
}

function set(map, x, y, tile) {
    if (y >= 0 && y < map.length && x >= 0 && x < map[0].length)
        map[y][x] = tile;
}

// ── Level 1: "First Steps" ──────────────────────────────────

function buildLevel1() {
    const W = 100, H = 18;
    const m = createMap(W, H);

    fill(m, 0, 14, W - 1, 17, TILE.SOLID);
    fill(m, 15, 14, 17, 15, TILE.AIR);
    fill(m, 23, 11, 26, 11, TILE.PLATFORM);
    set(m, 32, 13, TILE.SPIKE_UP);
    set(m, 35, 13, TILE.SPIKE_UP);
    set(m, 37, 13, TILE.SPIKE_UP);
    fill(m, 31, 10, 36, 10, TILE.PLATFORM);
    fill(m, 41, 14, 45, 15, TILE.AIR);
    fill(m, 41, 16, 45, 16, TILE.TOXIC);
    fill(m, 55, 11, 58, 11, TILE.PLATFORM);
    fill(m, 64, 3, 70, 12, TILE.SOLID);
    fill(m, 75, 14, 76, 15, TILE.AIR);
    set(m, 79, 13, TILE.SPIKE_UP);
    fill(m, 82, 14, 83, 15, TILE.AIR);
    fill(m, 82, 16, 83, 16, TILE.TOXIC);
    fill(m, 88, 11, 90, 11, TILE.PLATFORM);

    return m;
}

// ── Import all level packs ──────────────────────────────────

import { earlyLevels } from './levels_2_8.js';
import { midLevels } from './levels_9_16.js';
import { lateLevels } from './levels_17_23.js';
import { finalLevels } from './levels_24_30.js';

// ── Combined Level Registry ─────────────────────────────────

export const levels = [
    {
        id: 1,
        name: "First Steps",
        width: 100,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 93, row: 14 },
        revivalFlags: [
            { col: 25, row: 14 },
            { col: 48, row: 14 },
            { col: 73, row: 14 }
        ],
        hints: [
            { col: 3,  text: "← → to Move" },
            { col: 12, text: "↑ to Jump!" },
            { col: 30, text: "Watch the Spikes!" },
            { col: 39, text: "Don't Fall In!" },
            { col: 62, text: "Hold ↓ to Shrink!" },
            { col: 90, text: "Reach the Flag!" }
        ],
        map: buildLevel1()
    },
    ...earlyLevels,
    ...midLevels,
    ...lateLevels,
    ...finalLevels
];
