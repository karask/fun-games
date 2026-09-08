import { TILE } from './tiles.js';

// ── Local Helpers (mirrors levels.js) ───────────────────────

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

// ═══════════════════════════════════════════════════════════════
// Level 2: "Hop Along" — W=80, H=18
// Simple gaps and 1-2 spikes. A gentle second step.
//
// Layout:
//   Cols  0-14 : Flat start area
//   Cols 15-17 : 3-tile gap (easy jump)
//   Cols 18-33 : Ground with single spike at 26
//   Cols 34-36 : 3-tile gap
//   Cols 37-50 : Ground, revival flag at 44
//   Cols 51-54 : 4-tile gap (slight challenge)
//   Cols 55-64 : Ground with spike at 60
//   Cols 65-67 : 3-tile gap
//   Cols 68-79 : Final approach + end flag
// ═══════════════════════════════════════════════════════════════

function buildLevel2() {
    const W = 80, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Gap 1: cols 15-17 (3 tiles) ─
    fill(m, 15, 14, 17, 15, TILE.AIR);

    // ─ Single spike warning ─
    set(m, 26, 13, TILE.SPIKE_UP);

    // ─ Gap 2: cols 34-36 (3 tiles) ─
    fill(m, 34, 14, 36, 15, TILE.AIR);

    // ─ Gap 3: cols 51-54 (4 tiles, needs running start) ─
    fill(m, 51, 14, 54, 15, TILE.AIR);

    // ─ Spike near the end ─
    set(m, 60, 13, TILE.SPIKE_UP);

    // ─ Gap 4: cols 65-67 (3 tiles) ─
    fill(m, 65, 14, 67, 15, TILE.AIR);

    // ─ Decorative platform (optional shortcut) ─
    fill(m, 42, 11, 45, 11, TILE.PLATFORM);

    return m;
}

// ═══════════════════════════════════════════════════════════════
// Level 3: "Slippery Slope" — W=90, H=18
// More gaps, a toxic pool, platforms to cross wider gaps.
//
// Layout:
//   Cols  0-11 : Start area
//   Cols 12-14 : 3-tile gap
//   Cols 15-27 : Ground, spike at 22
//   Cols 28-34 : Toxic pool (cols 29-33 carved, toxic at 16)
//   Cols 35-48 : Ground, revival flag at 40
//   Cols 49-55 : Wide gap (7 tiles), platforms at cols 51 & 54 row 12
//   Cols 56-68 : Ground, two spikes at 62, 64
//   Cols 69-73 : Toxic pool (cols 70-72)
//   Cols 74-89 : Final run + end flag
// ═══════════════════════════════════════════════════════════════

function buildLevel3() {
    const W = 90, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Gap 1: cols 12-14 ─
    fill(m, 12, 14, 14, 15, TILE.AIR);

    // ─ Spike at 22 ─
    set(m, 22, 13, TILE.SPIKE_UP);

    // ─ Toxic pool 1: cols 29-33 ─
    fill(m, 29, 14, 33, 15, TILE.AIR);
    fill(m, 29, 16, 33, 16, TILE.TOXIC);

    // ─ Stepping platform over toxic pool ─
    fill(m, 30, 12, 32, 12, TILE.PLATFORM);

    // ─ Wide gap with platforms: cols 49-55 ─
    fill(m, 49, 14, 55, 15, TILE.AIR);
    // Stepping stone platforms
    fill(m, 50, 12, 51, 12, TILE.PLATFORM);
    fill(m, 53, 12, 54, 12, TILE.PLATFORM);

    // ─ Spikes near cols 61, 64 ─
    set(m, 61, 13, TILE.SPIKE_UP);
    set(m, 64, 13, TILE.SPIKE_UP);

    // ─ Toxic pool 2: cols 70-72 ─
    fill(m, 70, 14, 72, 15, TILE.AIR);
    fill(m, 70, 16, 72, 16, TILE.TOXIC);

    // ─ High platform near end ─
    fill(m, 80, 10, 83, 10, TILE.PLATFORM);

    return m;
}

// ═══════════════════════════════════════════════════════════════
// Level 4: "Tight Squeeze" — W=85, H=18
// First real shrink passage plus a few spikes.
//
// Layout:
//   Cols  0-12 : Start area
//   Cols 13-15 : Gap (3 tiles)
//   Cols 16-28 : Ground, spike at 20, spike at 24
//   Cols 29-39 : Shrink passage (wall rows 3-12, cols 29-39,
//                1-tile gap at row 13)
//   Cols 40-52 : Recovery, revival flag at 45
//   Cols 53-55 : Gap (3 tiles)
//   Cols 56-63 : Spikes at 58, 60, 62
//   Cols 64-72 : Second short shrink passage (cols 66-70)
//   Cols 73-84 : Final run + end flag
// ═══════════════════════════════════════════════════════════════

function buildLevel4() {
    const W = 85, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Gap: cols 13-15 ─
    fill(m, 13, 14, 15, 15, TILE.AIR);

    // ─ Spikes at 20, 24 ─
    set(m, 20, 13, TILE.SPIKE_UP);
    set(m, 24, 13, TILE.SPIKE_UP);

    // ─ Shrink passage 1: wall at cols 29-39, rows 3-12 ─
    // Leaves row 13 open (1 tile high) — must shrink to pass
    fill(m, 29, 3, 39, 12, TILE.SOLID);

    // ─ Gap: cols 53-55 ─
    fill(m, 53, 14, 55, 15, TILE.AIR);

    // ─ Spike gauntlet: 58, 61, 64 — spaced 3 apart for safe landing ─
    set(m, 58, 13, TILE.SPIKE_UP);
    set(m, 61, 13, TILE.SPIKE_UP);
    set(m, 64, 13, TILE.SPIKE_UP);

    // ─ Shrink passage 2: shorter wall at cols 66-70, rows 5-12 ─
    fill(m, 66, 5, 70, 12, TILE.SOLID);

    // ─ Platform above passage entry (to see the path) ─
    fill(m, 27, 8, 28, 8, TILE.PLATFORM);

    return m;
}

// ═══════════════════════════════════════════════════════════════
// Level 5: "Twin Peaks" — W=100, H=18
// Two elevated plateaus connected by platforms, gaps between.
//
// Layout:
//   Cols  0-14 : Start area (ground level)
//   Cols 15-17 : Gap
//   Cols 18-38 : PEAK 1 — elevated plateau (ground at row 10,
//                solid 10-17, cols 18-38)
//   Cols 39-44 : Chasm (6 tiles), stepping platforms
//   Cols 45-49 : Bridge (ground level with platforms above)
//   Cols 50-55 : Chasm (6 tiles), stepping platforms
//   Cols 56-76 : PEAK 2 — elevated plateau (solid 10-17)
//   Cols 77-79 : Gap / descent back to ground
//   Cols 80-99 : Final ground stretch + end flag
// ═══════════════════════════════════════════════════════════════

function buildLevel5() {
    const W = 100, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Gap before Peak 1: cols 15-17 ─
    fill(m, 15, 14, 17, 15, TILE.AIR);

    // ─ Peak 1: elevated ground rows 10-17, cols 18-38 ─
    fill(m, 18, 10, 38, 13, TILE.SOLID);

    // ─ Spikes on top of Peak 1 ─
    set(m, 25, 9, TILE.SPIKE_UP);
    set(m, 30, 9, TILE.SPIKE_UP);

    // ─ Chasm 1: cols 39-44 — remove ground ─
    fill(m, 39, 14, 44, 15, TILE.AIR);
    // Toxic at bottom
    fill(m, 39, 16, 44, 16, TILE.TOXIC);
    // Stepping platforms (descending from peak)
    fill(m, 39, 10, 40, 10, TILE.PLATFORM);
    fill(m, 42, 12, 43, 12, TILE.PLATFORM);

    // ─ Valley: cols 45-49 remain ground level ─
    // Platform above for agile players
    fill(m, 46, 10, 48, 10, TILE.PLATFORM);

    // ─ Chasm 2: cols 50-55 — remove ground ─
    fill(m, 50, 14, 55, 15, TILE.AIR);
    fill(m, 50, 16, 55, 16, TILE.TOXIC);
    // Stepping platforms (ascending to peak)
    fill(m, 51, 12, 52, 12, TILE.PLATFORM);
    fill(m, 54, 10, 55, 10, TILE.PLATFORM);

    // ─ Peak 2: elevated ground rows 10-17, cols 56-76 ─
    fill(m, 56, 10, 76, 13, TILE.SOLID);

    // ─ Spikes on top of Peak 2 ─
    set(m, 62, 9, TILE.SPIKE_UP);
    set(m, 68, 9, TILE.SPIKE_UP);
    set(m, 73, 9, TILE.SPIKE_UP);

    // ─ Descent gap: cols 77-79 ─
    fill(m, 77, 14, 79, 15, TILE.AIR);
    // Platform to help land safely
    fill(m, 77, 12, 78, 12, TILE.PLATFORM);

    return m;
}

// ═══════════════════════════════════════════════════════════════
// Level 6: "Toxic River" — W=110, H=18
// A long toxic section that must be crossed via platforms.
//
// Layout:
//   Cols  0-18 : Start area with gentle intro
//   Cols 19-21 : Gap with spike below
//   Cols 22-34 : Ground approach, revival flag at 28
//   Cols 35-85 : THE TOXIC RIVER — ground carved out,
//                toxic at row 16, platforms spanning the river
//   Cols 86-109: Safe landing + end flag
// ═══════════════════════════════════════════════════════════════

function buildLevel6() {
    const W = 110, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Intro gap: cols 19-21 ─
    fill(m, 19, 14, 21, 15, TILE.AIR);

    // ─ Spikes before the river ─
    set(m, 30, 13, TILE.SPIKE_UP);
    set(m, 33, 13, TILE.SPIKE_UP);

    // ─ THE TOXIC RIVER: cols 35-85 ─
    // Carve out ground
    fill(m, 35, 14, 85, 15, TILE.AIR);
    // Fill toxic liquid
    fill(m, 35, 16, 85, 16, TILE.TOXIC);

    // ─ Platforms across the river (spaced 3-4 tiles apart) ─
    // Row varies between 12 and 13 for rhythm
    fill(m, 36, 12, 38, 12, TILE.PLATFORM);   // island 1
    fill(m, 42, 13, 43, 13, TILE.PLATFORM);   // island 2
    fill(m, 47, 12, 49, 12, TILE.PLATFORM);   // island 3
    fill(m, 53, 13, 54, 13, TILE.PLATFORM);   // island 4
    fill(m, 58, 12, 60, 12, TILE.PLATFORM);   // island 5

    // ─ Mid-river safe island: solid ground cols 62-66 ─
    fill(m, 62, 14, 66, 15, TILE.SOLID);
    // Revival flag goes here at col 64

    fill(m, 70, 12, 72, 12, TILE.PLATFORM);   // island 6
    fill(m, 76, 13, 77, 13, TILE.PLATFORM);   // island 7
    fill(m, 81, 12, 83, 12, TILE.PLATFORM);   // island 8

    // ─ Ceiling spikes over some platforms for pressure ─
    set(m, 48, 8, TILE.SPIKE_DOWN);
    set(m, 59, 8, TILE.SPIKE_DOWN);
    set(m, 71, 8, TILE.SPIKE_DOWN);

    // ─ Decorative platforms near exit ─
    fill(m, 90, 11, 93, 11, TILE.PLATFORM);

    return m;
}

// ═══════════════════════════════════════════════════════════════
// Level 7: "Spike Alley" — W=100, H=18
// Dense spike sections requiring careful jumping.
//
// Layout:
//   Cols  0-12 : Start area
//   Cols 13-28 : Spike field 1 — alternating spikes every 2 tiles
//   Cols 29-38 : Breather + revival flag at 34
//   Cols 39-58 : Spike field 2 — tighter spacing, ceiling spikes
//   Cols 59-68 : Breather + revival flag at 63
//   Cols 69-88 : Spike field 3 — ground + ceiling spikes, gap
//   Cols 89-99 : Final approach + end flag
// ═══════════════════════════════════════════════════════════════

function buildLevel7() {
    const W = 100, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Spike field 1: ground spikes every 3 tiles, cols 13-28 ─
    for (let x = 14; x <= 27; x += 3) {
        set(m, x, 13, TILE.SPIKE_UP);
    }

    // ─ Spike field 2: denser, cols 39-58 ─
    // Ground spikes every 3 tiles
    for (let x = 40; x <= 57; x += 3) {
        set(m, x, 13, TILE.SPIKE_UP);
    }
    // Ceiling spikes above the path
    set(m, 43, 8, TILE.SPIKE_DOWN);
    set(m, 48, 8, TILE.SPIKE_DOWN);
    set(m, 53, 8, TILE.SPIKE_DOWN);

    // ─ Platforms to navigate ceiling spikes ─
    fill(m, 41, 11, 43, 11, TILE.PLATFORM);
    fill(m, 47, 11, 49, 11, TILE.PLATFORM);
    fill(m, 53, 11, 55, 11, TILE.PLATFORM);

    // ─ Spike field 3: ground + ceiling, cols 69-88 ─
    // Ground spikes every 3 tiles
    for (let x = 70; x <= 87; x += 3) {
        set(m, x, 13, TILE.SPIKE_UP);
    }
    // Ceiling spikes (lower, more threatening)
    for (let x = 72; x <= 85; x += 4) {
        set(m, x, 7, TILE.SPIKE_DOWN);
    }

    // ─ Gap in spike field 3 (cols 78-80) with toxic ─
    fill(m, 78, 14, 80, 15, TILE.AIR);
    fill(m, 78, 16, 80, 16, TILE.TOXIC);

    // ─ Safety platform over the toxic gap ─
    fill(m, 78, 12, 80, 12, TILE.PLATFORM);

    // ─ Elevated platform for observing field 3 ─
    fill(m, 67, 10, 69, 10, TILE.PLATFORM);

    return m;
}

// ═══════════════════════════════════════════════════════════════
// Level 8: "The Crawl" — W=95, H=18
// Multiple shrink passages with spikes between them.
//
// Layout:
//   Cols  0-10 : Start area
//   Cols 11-20 : Shrink passage 1 (wall rows 3-12)
//   Cols 21-28 : Open area, spikes at 23, 25, 27
//   Cols 29-42 : Shrink passage 2 (wall rows 4-12), longer
//   Cols 43-50 : Recovery area, revival flag at 46
//   Cols 51-54 : Gap (4 tiles)
//   Cols 55-67 : Shrink passage 3 (wall rows 3-12) with
//                ceiling spikes inside at row 3
//   Cols 68-78 : Spike gauntlet + toxic pit
//   Cols 79-94 : Final approach + end flag
// ═══════════════════════════════════════════════════════════════

function buildLevel8() {
    const W = 95, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Shrink passage 1: cols 11-20, wall rows 3-12 ─
    fill(m, 11, 3, 20, 12, TILE.SOLID);

    // ─ Spikes between passages: 23, 26 — spaced for safe landing ─
    set(m, 23, 13, TILE.SPIKE_UP);
    set(m, 26, 13, TILE.SPIKE_UP);

    // ─ Shrink passage 2: cols 29-42, wall rows 4-12 ─
    // Slightly higher ceiling gives a tiny bit more room
    fill(m, 29, 4, 42, 12, TILE.SOLID);

    // ─ Spike inside passage 2 ceiling (row 3, deadly if you stand) ─
    set(m, 34, 3, TILE.SPIKE_DOWN);
    set(m, 38, 3, TILE.SPIKE_DOWN);

    // ─ Gap: cols 51-54 ─
    fill(m, 51, 14, 54, 15, TILE.AIR);

    // ─ Shrink passage 3: cols 55-67, wall rows 3-12 ─
    fill(m, 55, 3, 67, 12, TILE.SOLID);

    // ─ Ceiling spikes inside passage 3 ─
    set(m, 58, 3, TILE.SPIKE_DOWN);
    set(m, 62, 3, TILE.SPIKE_DOWN);
    set(m, 65, 3, TILE.SPIKE_DOWN);

    // ─ Spike gauntlet after final passage: 70, 73 — spaced for safe landing ─
    set(m, 70, 13, TILE.SPIKE_UP);
    set(m, 73, 13, TILE.SPIKE_UP);

    // ─ Toxic pit: cols 76-78 ─
    fill(m, 76, 14, 78, 15, TILE.AIR);
    fill(m, 76, 16, 78, 16, TILE.TOXIC);

    // ─ Platform over toxic pit ─
    fill(m, 76, 12, 78, 12, TILE.PLATFORM);

    return m;
}

// ═══════════════════════════════════════════════════════════════
// Level Registry — Early Game (Levels 2-8)
// ═══════════════════════════════════════════════════════════════

export const earlyLevels = [
    // ── Level 2 ──
    {
        id: 2,
        name: "Hop Along",
        width: 80,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 75, row: 14 },
        revivalFlags: [
            { col: 25, row: 14 },
            { col: 44, row: 14 }
        ],
        hints: [
            { col: 12, text: "Jump the gaps!" },
            { col: 49, text: "Get a running start!" }
        ],
        map: buildLevel2()
    },
    // ── Level 3 ──
    {
        id: 3,
        name: "Slippery Slope",
        width: 90,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 85, row: 14 },
        revivalFlags: [
            { col: 20, row: 14 },
            { col: 40, row: 14 },
            { col: 68, row: 14 }
        ],
        hints: [
            { col: 27, text: "Toxic goo is deadly!" },
            { col: 47, text: "Use the platforms!" }
        ],
        map: buildLevel3()
    },
    // ── Level 4 ──
    {
        id: 4,
        name: "Tight Squeeze",
        width: 85,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 80, row: 14 },
        revivalFlags: [
            { col: 18, row: 14 },
            { col: 45, row: 14 },
            { col: 73, row: 14 }
        ],
        hints: [
            { col: 27, text: "Hold ↓ to Shrink!" },
            { col: 56, text: "Watch the spikes!" },
            { col: 64, text: "Shrink again!" }
        ],
        map: buildLevel4()
    },
    // ── Level 5 ──
    {
        id: 5,
        name: "Twin Peaks",
        width: 100,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 95, row: 14 },
        revivalFlags: [
            { col: 28, row: 10 },
            { col: 48, row: 14 },
            { col: 66, row: 10 }
        ],
        hints: [
            { col: 16, text: "Climb the peak!" },
            { col: 42, text: "Use platforms to cross!" },
            { col: 82, text: "Almost there!" }
        ],
        map: buildLevel5()
    },
    // ── Level 6 ──
    {
        id: 6,
        name: "Toxic River",
        width: 110,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 105, row: 14 },
        revivalFlags: [
            { col: 28, row: 14 },
            { col: 64, row: 14 },
            { col: 92, row: 14 }
        ],
        hints: [
            { col: 33, text: "Don't fall in the river!" },
            { col: 60, text: "Watch the ceiling!" },
            { col: 88, text: "Safe ground ahead!" }
        ],
        map: buildLevel6()
    },
    // ── Level 7 ──
    {
        id: 7,
        name: "Spike Alley",
        width: 100,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 95, row: 14 },
        revivalFlags: [
            { col: 34, row: 14 },
            { col: 63, row: 14 }
        ],
        hints: [
            { col: 11, text: "Time your jumps!" },
            { col: 37, text: "Ceiling spikes above!" },
            { col: 67, text: "Stay focused!" }
        ],
        map: buildLevel7()
    },
    // ── Level 8 ──
    {
        id: 8,
        name: "The Crawl",
        width: 95,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 90, row: 14 },
        revivalFlags: [
            { col: 22, row: 14 },
            { col: 46, row: 14 },
            { col: 79, row: 14 }
        ],
        hints: [
            { col: 9,  text: "Shrink to crawl through!" },
            { col: 43, text: "Watch for ceiling spikes!" },
            { col: 68, text: "One more crawl to go!" }
        ],
        map: buildLevel8()
    }
];
