// ══════════════════════════════════════════════════════════════
// SLIME TALES — Level Data
// ══════════════════════════════════════════════════════════════

export const TILE = {
    AIR: 0,
    SOLID: 1,
    SPIKE_UP: 2,
    SPIKE_DOWN: 3,
    TOXIC: 4,
    PLATFORM: 5
};

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
// A tutorial level introducing basic controls and hazards.
// 100 tiles wide × 18 tiles tall. Ground level at row 14.
//
// Layout:
//   Cols  0-14  : Flat start area
//   Cols 15-17  : Small gap (jump practice)
//   Cols 18-29  : Ground + optional platform above
//   Cols 30-38  : Spike section (3 spikes on ground)
//   Cols 39-47  : Toxic pool (cols 41-45)
//   Cols 48-63  : Ground approach to tight passage
//   Cols 64-70  : Tall wall with passage at row 13 (shrink required)
//   Cols 71-77  : Recovery area + small gap
//   Cols 78-84  : Spike + small toxic pit
//   Cols 85-99  : Final approach + end flag

function buildLevel1() {
    const W = 100, H = 18;
    const m = createMap(W, H);

    // ─ Base ground: rows 14-17, full width ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Section 2: Gap at cols 15-17 (2 tiles deep) ─
    fill(m, 15, 14, 17, 15, TILE.AIR);

    // ─ Section 3: Optional platform above ground (row 11, cols 23-26) ─
    fill(m, 23, 11, 26, 11, TILE.PLATFORM);

    // ─ Section 4: Spikes on ground ─
    set(m, 32, 13, TILE.SPIKE_UP);
    set(m, 35, 13, TILE.SPIKE_UP);
    set(m, 37, 13, TILE.SPIKE_UP);

    // ─ Section 5: Platform above spikes (row 11, cols 31-36) ─
    fill(m, 31, 10, 36, 10, TILE.PLATFORM);

    // ─ Section 6: Toxic pool (cols 41-45) ─
    fill(m, 41, 14, 45, 15, TILE.AIR);
    fill(m, 41, 16, 45, 16, TILE.TOXIC);

    // ─ Section 7: Stepping platform before wall (row 11, cols 55-58) ─
    fill(m, 55, 11, 58, 11, TILE.PLATFORM);

    // ─ Section 8: Tight passage wall (rows 3-12, cols 64-70) ─
    // Player must shrink (Hold ↓) to fit through 1-tile gap at row 13
    fill(m, 64, 3, 70, 12, TILE.SOLID);

    // ─ Section 9: Gap at cols 75-76 ─
    fill(m, 75, 14, 76, 15, TILE.AIR);

    // ─ Section 10: Spike at 79 ─
    set(m, 79, 13, TILE.SPIKE_UP);

    // ─ Section 11: Small toxic pit (cols 82-83) ─
    fill(m, 82, 14, 83, 15, TILE.AIR);
    fill(m, 82, 16, 83, 16, TILE.TOXIC);

    // ─ Section 12: Decorative platforms near end ─
    fill(m, 88, 11, 90, 11, TILE.PLATFORM);

    return m;
}

// ── Level Registry ──────────────────────────────────────────

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
    // Levels 2-30: locked placeholders
    ...Array.from({ length: 29 }, (_, i) => ({
        id: i + 2,
        name: `Level ${i + 2}`,
        width: 0,
        height: 0,
        spawnP1: { col: 0, row: 0 },
        spawnP2: { col: 0, row: 0 },
        endFlag: { col: 0, row: 0 },
        revivalFlags: [],
        hints: [],
        map: null
    }))
];
