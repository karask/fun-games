// ══════════════════════════════════════════════════════════════
// SLIME TALES — Levels 17–23 (Late Game · Hard)
// ══════════════════════════════════════════════════════════════

import { TILE } from './tiles.js';

// ── Local helpers (mirrors of levels.js helpers) ─────────────

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
// Level 17: "No Ground" (100×20)
// ═══════════════════════════════════════════════════════════════
// Almost no solid ground — the player must hop across floating
// platforms of varying sizes over a toxic sea. Platforms shrink
// in size and spacing as the level progresses.
//
// Layout overview (ground row = 16, rows 17-19 underground):
//   Cols  0- 6  : Start island (solid ground)
//   Cols  7-92  : Floating platforms over toxic, no ground
//   Cols 93-99  : End island (solid ground)

function buildLevel17() {
    const W = 100, H = 20;
    const m = createMap(W, H);

    // ─ Underground base: rows 17-19, full width ─
    fill(m, 0, 17, W - 1, 19, TILE.SOLID);

    // ─ Start island: cols 0-6, ground at row 16 ─
    fill(m, 0, 16, 6, 16, TILE.SOLID);

    // ─ End island: cols 93-99, ground at row 16 ─
    fill(m, 93, 16, 99, 16, TILE.SOLID);

    // ─ Carve out the middle: cols 7-92, rows 16 become AIR ─
    // (already AIR by default in row 16 between islands)

    // ─ Toxic sea: fill rows 17-18 with toxic in the gap area ─
    // Actually make a deeper pit: carve rows 16-17 to AIR, toxic at 18
    fill(m, 7, 16, 92, 17, TILE.AIR);
    fill(m, 7, 18, 92, 18, TILE.TOXIC);

    // ─ Section 1: Easy platforms (cols 8-25) — 4-tile wide, 3-tile gaps ─
    fill(m, 8,  13, 11, 13, TILE.PLATFORM);
    fill(m, 15, 14, 18, 14, TILE.PLATFORM);
    fill(m, 22, 13, 25, 13, TILE.PLATFORM);

    // ─ Section 2: Medium platforms (cols 26-48) — 3-tile wide, 4-tile gaps ─
    fill(m, 29, 12, 31, 12, TILE.PLATFORM);
    fill(m, 35, 14, 37, 14, TILE.PLATFORM);
    fill(m, 41, 11, 43, 11, TILE.PLATFORM);
    fill(m, 47, 13, 49, 13, TILE.PLATFORM);

    // ─ Section 3: Small platforms with spikes (cols 49-72) — 2-tile wide ─
    fill(m, 53, 12, 54, 12, TILE.PLATFORM);
    fill(m, 58, 14, 59, 14, TILE.PLATFORM);
    // Spike under platform at col 58 — on a small solid island
    fill(m, 61, 16, 62, 16, TILE.SOLID);
    set(m, 61, 15, TILE.SPIKE_UP);
    set(m, 62, 15, TILE.SPIKE_UP);

    fill(m, 64, 11, 65, 11, TILE.PLATFORM);
    fill(m, 69, 13, 70, 13, TILE.PLATFORM);

    // ─ Section 4: Tiny platforms (cols 73-92) — 1-2 tile, high precision ─
    fill(m, 73, 12, 74, 12, TILE.PLATFORM);
    fill(m, 77, 10, 77, 10, TILE.PLATFORM); // single tile!
    fill(m, 80, 13, 81, 13, TILE.PLATFORM);
    fill(m, 84, 11, 84, 11, TILE.PLATFORM); // single tile!
    fill(m, 87, 14, 88, 14, TILE.PLATFORM);
    fill(m, 91, 12, 92, 12, TILE.PLATFORM);

    // ─ Ceiling spikes for danger (hanging) ─
    for (let x = 30; x <= 45; x += 5) {
        set(m, x, 3, TILE.SOLID);
        set(m, x + 1, 3, TILE.SOLID);
        set(m, x, 4, TILE.SPIKE_DOWN);
        set(m, x + 1, 4, TILE.SPIKE_DOWN);
    }

    // ─ Decorative ceiling ─
    fill(m, 0, 0, W - 1, 1, TILE.SOLID);

    return m;
}


// ═══════════════════════════════════════════════════════════════
// Level 18: "Spike Cavern" (110×20)
// ═══════════════════════════════════════════════════════════════
// Dense ceiling and floor spikes line narrow corridors. The
// player weaves through thin safe paths, sometimes needing to
// time jumps between spike rows or shrink to fit through gaps.
//
// Layout: ground at row 16, rows 17-19 underground.
// Ceiling at rows 0-2. The playable band is rows 3-15.

function buildLevel18() {
    const W = 110, H = 20;
    const m = createMap(W, H);

    // ─ Base ground & ceiling ─
    fill(m, 0, 16, W - 1, 19, TILE.SOLID);
    fill(m, 0, 0, W - 1, 2, TILE.SOLID);

    // ─ Start area: cols 0-8, safe ─
    // (just ground and ceiling, no spikes)

    // ─ Section 1 (cols 9-30): Floor spikes with safe gaps ─
    for (let x = 9; x <= 30; x++) {
        if (x % 3 !== 0) { // spikes except every 3rd tile
            set(m, x, 15, TILE.SPIKE_UP);
        }
    }
    // Ceiling spikes sporadically
    for (let x = 12; x <= 28; x += 4) {
        set(m, x, 3, TILE.SPIKE_DOWN);
        set(m, x + 1, 3, TILE.SPIKE_DOWN);
    }

    // ─ Section 2 (cols 31-50): Spike corridor with platforms ─
    // Dense floor spikes
    for (let x = 31; x <= 50; x++) {
        set(m, x, 15, TILE.SPIKE_UP);
    }
    // Safe platforms above the spikes
    fill(m, 33, 12, 36, 12, TILE.PLATFORM);
    fill(m, 40, 10, 43, 10, TILE.PLATFORM);
    fill(m, 47, 12, 50, 12, TILE.PLATFORM);
    // Ceiling spikes above platforms — must time jumps
    for (let x = 33; x <= 49; x += 3) {
        set(m, x, 3, TILE.SPIKE_DOWN);
    }
    // Add some mid-height ceiling spikes (row 7) to limit jump height
    fill(m, 37, 6, 37, 6, TILE.SOLID);
    set(m, 37, 7, TILE.SPIKE_DOWN);
    fill(m, 44, 6, 44, 6, TILE.SOLID);
    set(m, 44, 7, TILE.SPIKE_DOWN);

    // ─ Section 3 (cols 51-70): Narrowing passage with shrink ─
    // Walls close in from top — ceiling drops to row 6
    fill(m, 51, 3, 70, 8, TILE.SOLID);
    // Floor spikes
    for (let x = 52; x <= 68; x += 3) {
        set(m, x, 15, TILE.SPIKE_UP);
    }
    // Ceiling spikes hanging from row 8
    for (let x = 53; x <= 67; x += 3) {
        set(m, x, 9, TILE.SPIKE_DOWN);
    }
    // Shrink passage at cols 60-63: wall drops to row 14, 1-tile gap at 15
    fill(m, 60, 9, 63, 14, TILE.SOLID);
    // Clear the spike at row 15 for these cols so player can pass
    for (let x = 60; x <= 63; x++) {
        set(m, x, 15, TILE.AIR);
    }

    // ─ Section 4 (cols 71-90): Double spike gauntlet ─
    // Alternating floor/ceiling spike clusters
    for (let x = 71; x <= 90; x++) {
        if (x % 6 < 3) {
            set(m, x, 15, TILE.SPIKE_UP); // floor spikes
        } else {
            set(m, x, 3, TILE.SPIKE_DOWN); // ceiling spikes
        }
    }
    // Platforms to navigate
    fill(m, 74, 11, 76, 11, TILE.PLATFORM);
    fill(m, 80, 9, 82, 9, TILE.PLATFORM);
    fill(m, 86, 12, 88, 12, TILE.PLATFORM);

    // ─ Section 5 (cols 91-109): Dense finale ─
    // Floor AND ceiling spikes
    for (let x = 91; x <= 104; x++) {
        set(m, x, 15, TILE.SPIKE_UP);
        set(m, x, 3, TILE.SPIKE_DOWN);
    }
    // Narrow safe band — platforms at row 9
    fill(m, 93, 9, 96, 9, TILE.PLATFORM);
    fill(m, 99, 11, 102, 11, TILE.PLATFORM);
    // Clear end area
    // cols 105-109 safe

    return m;
}


// ═══════════════════════════════════════════════════════════════
// Level 19: "Toxic Labyrinth" (80×24)
// ═══════════════════════════════════════════════════════════════
// A maze-like structure with toxic pools on multiple vertical
// levels. Player navigates through shrink passages, platforms,
// and narrow corridors. Toxic is placed at different heights.
//
// Layout: ground at row 20, rows 21-23 underground.
// Three major "floors": ground floor (rows 17-20),
// mid floor (rows 10-14), upper floor (rows 3-7).

function buildLevel19() {
    const W = 80, H = 24;
    const m = createMap(W, H);

    // ─ Underground base: rows 21-23 ─
    fill(m, 0, 21, W - 1, 23, TILE.SOLID);
    // ─ Ground floor: row 20 ─
    fill(m, 0, 20, W - 1, 20, TILE.SOLID);
    // ─ Ceiling: rows 0-1 ─
    fill(m, 0, 0, W - 1, 1, TILE.SOLID);

    // ══════ GROUND FLOOR (rows 15-20) ══════

    // Start area: cols 0-8
    // (safe, just ground)

    // Toxic pit 1: cols 10-14
    fill(m, 10, 20, 14, 20, TILE.AIR);
    fill(m, 10, 21, 14, 21, TILE.AIR);
    fill(m, 10, 22, 14, 22, TILE.TOXIC);

    // Ground continues: cols 15-24
    // Shrink passage wall: cols 20-24, rows 10-19
    fill(m, 20, 10, 24, 19, TILE.SOLID);

    // Toxic pit 2: cols 26-30
    fill(m, 26, 20, 30, 20, TILE.AIR);
    fill(m, 26, 21, 30, 21, TILE.AIR);
    fill(m, 26, 22, 30, 22, TILE.TOXIC);
    // Platform over toxic
    fill(m, 27, 18, 29, 18, TILE.PLATFORM);

    // Ground continues: cols 31-45
    // Major wall: cols 40-44, creates maze fork
    fill(m, 40, 5, 44, 19, TILE.SOLID);

    // Toxic pit 3: cols 46-50
    fill(m, 46, 20, 50, 20, TILE.AIR);
    fill(m, 46, 21, 50, 21, TILE.AIR);
    fill(m, 46, 22, 50, 22, TILE.TOXIC);

    // Ground continues: cols 51-79

    // ══════ MID FLOOR (rows 10-14) ══════

    // Solid floor for mid level: row 14, cols 0-39
    fill(m, 0, 14, 39, 14, TILE.SOLID);

    // Access up from ground: staircase platforms at cols 2-6
    fill(m, 2, 17, 4, 17, TILE.PLATFORM);
    fill(m, 5, 15, 7, 15, TILE.PLATFORM);

    // Mid-level toxic pool: cols 10-13, row 14 carved
    fill(m, 10, 14, 13, 14, TILE.AIR);
    fill(m, 10, 15, 13, 15, TILE.TOXIC);

    // Mid-level platforms and passages
    fill(m, 15, 12, 18, 12, TILE.PLATFORM);

    // Shrink passage through wall at cols 20-24: gap at row 13
    // Wall fills rows 10-19, leave row 13 open
    fill(m, 20, 13, 24, 13, TILE.AIR);

    // Mid floor continues cols 25-39
    fill(m, 25, 14, 39, 14, TILE.SOLID);
    // Spikes on mid floor
    set(m, 30, 13, TILE.SPIKE_UP);
    set(m, 33, 13, TILE.SPIKE_UP);
    set(m, 36, 13, TILE.SPIKE_UP);

    // ══════ UPPER FLOOR (rows 3-7) ══════

    // Upper floor: row 7, cols 25-79
    fill(m, 25, 7, 79, 7, TILE.SOLID);

    // Access up from mid floor: platforms
    fill(m, 27, 11, 29, 11, TILE.PLATFORM);
    fill(m, 30, 9, 32, 9, TILE.PLATFORM);

    // Upper toxic pool: cols 35-38
    fill(m, 35, 7, 38, 7, TILE.AIR);
    fill(m, 35, 8, 38, 8, TILE.TOXIC);

    // Upper platforms over toxic
    fill(m, 36, 5, 37, 5, TILE.PLATFORM);

    // Ceiling spikes: rows 2
    for (let x = 30; x <= 50; x += 4) {
        set(m, x, 2, TILE.SPIKE_DOWN);
    }

    // Upper shrink passage: cols 50-54, wall rows 2-6
    fill(m, 50, 2, 54, 6, TILE.SOLID);
    fill(m, 50, 6, 54, 6, TILE.AIR); // gap at row 6

    // Upper floor continues: cols 55-79
    // Spikes
    set(m, 60, 6, TILE.SPIKE_UP);
    set(m, 65, 6, TILE.SPIKE_UP);

    // ══════ DESCENT TO END (cols 70-79) ══════

    // Platforms descending from upper floor to ground level
    fill(m, 72, 10, 74, 10, TILE.PLATFORM);
    fill(m, 70, 13, 72, 13, TILE.PLATFORM);
    fill(m, 74, 16, 76, 16, TILE.PLATFORM);
    // End area ground
    fill(m, 70, 20, 79, 20, TILE.SOLID);

    // Final toxic moat before end flag
    fill(m, 55, 20, 58, 20, TILE.AIR);
    fill(m, 55, 21, 58, 21, TILE.AIR);
    fill(m, 55, 22, 58, 22, TILE.TOXIC);

    return m;
}


// ═══════════════════════════════════════════════════════════════
// Level 20: "The Ascent" (60×30)
// ═══════════════════════════════════════════════════════════════
// A very tall vertical level. The player starts at the bottom
// and must climb to the top using platforms, wall ledges, and
// shrink passages. Spikes guard many ledges. The camera scrolls
// vertically.
//
// Layout: ground at row 26, rows 27-29 underground.
// Goal is near the top (row 3).

function buildLevel20() {
    const W = 60, H = 30;
    const m = createMap(W, H);

    // ─ Underground base: rows 27-29 ─
    fill(m, 0, 27, W - 1, 29, TILE.SOLID);
    // ─ Ground floor: row 26 ─
    fill(m, 0, 26, W - 1, 26, TILE.SOLID);
    // ─ Left wall ─
    fill(m, 0, 0, 2, 29, TILE.SOLID);
    // ─ Right wall ─
    fill(m, W - 3, 0, W - 1, 29, TILE.SOLID);
    // ─ Ceiling ─
    fill(m, 0, 0, W - 1, 1, TILE.SOLID);

    // ─ Toxic floor hazard: cols 15-45, carve ground ─
    fill(m, 15, 26, 45, 27, TILE.AIR);
    fill(m, 15, 28, 45, 28, TILE.TOXIC);

    // Start island: cols 3-14, ground remains solid at row 26
    // End platform at top: cols 25-35, row 3 — solid
    fill(m, 25, 3, 35, 3, TILE.SOLID);

    // ══════ CLIMBING SECTIONS (bottom to top) ══════

    // ── Floor 1 (rows 23-26): Initial platforms ──
    fill(m, 5, 23, 9, 23, TILE.PLATFORM);
    fill(m, 18, 24, 22, 24, TILE.PLATFORM);
    fill(m, 30, 23, 34, 23, TILE.PLATFORM);
    // Spikes guarding
    set(m, 10, 25, TILE.SPIKE_UP);
    set(m, 12, 25, TILE.SPIKE_UP);

    // ── Floor 2 (rows 19-22): Ledges on walls ──
    fill(m, 3, 20, 10, 20, TILE.SOLID);    // left ledge
    fill(m, 45, 21, 56, 21, TILE.SOLID);    // right ledge
    // Spikes on ledge edges
    set(m, 10, 19, TILE.SPIKE_UP);
    set(m, 45, 20, TILE.SPIKE_UP);
    // Connecting platforms
    fill(m, 20, 21, 24, 21, TILE.PLATFORM);
    fill(m, 33, 19, 37, 19, TILE.PLATFORM);

    // ── Floor 3 (rows 15-18): Shrink section ──
    // Horizontal wall with shrink passage
    fill(m, 10, 15, 50, 17, TILE.SOLID);
    // Shrink gap at row 17 (bottom of wall) — carve opening
    fill(m, 28, 17, 33, 17, TILE.AIR); // passage through
    // Platforms to reach the wall top
    fill(m, 5, 18, 8, 18, TILE.PLATFORM);
    fill(m, 15, 14, 19, 14, TILE.PLATFORM);
    fill(m, 42, 14, 46, 14, TILE.PLATFORM);
    // Spikes on top of wall
    set(m, 22, 14, TILE.SPIKE_UP);
    set(m, 25, 14, TILE.SPIKE_UP);
    set(m, 37, 14, TILE.SPIKE_UP);

    // ── Floor 4 (rows 10-14): Spike gauntlet ──
    fill(m, 3, 11, 12, 11, TILE.SOLID);     // left platform
    fill(m, 45, 12, 56, 12, TILE.SOLID);     // right platform
    // Floor spikes
    set(m, 6, 10, TILE.SPIKE_UP);
    set(m, 10, 10, TILE.SPIKE_UP);
    set(m, 48, 11, TILE.SPIKE_UP);
    set(m, 51, 11, TILE.SPIKE_UP);
    // Connecting platforms with ceiling spikes
    fill(m, 22, 11, 26, 11, TILE.PLATFORM);
    fill(m, 34, 10, 38, 10, TILE.PLATFORM);
    // Ceiling spikes above
    fill(m, 22, 7, 26, 7, TILE.SOLID);
    set(m, 23, 8, TILE.SPIKE_DOWN);
    set(m, 25, 8, TILE.SPIKE_DOWN);

    // ── Floor 5 (rows 5-9): Final approach ──
    fill(m, 8, 7, 15, 7, TILE.PLATFORM);
    fill(m, 42, 6, 50, 6, TILE.PLATFORM);
    fill(m, 20, 5, 24, 5, TILE.PLATFORM);
    // Spikes flanking the end platform
    set(m, 24, 2, TILE.SPIKE_UP);
    set(m, 36, 2, TILE.SPIKE_UP);

    return m;
}


// ═══════════════════════════════════════════════════════════════
// Level 21: "Precision Jump" (120×18)
// ═══════════════════════════════════════════════════════════════
// Tiny 1-2 tile platforms suspended over a toxic abyss. Each
// jump must be pixel-perfect. Platforms are placed at varying
// heights to require different jump arcs. Some platforms have
// spikes on adjacent tiles.
//
// Layout: ground at row 14, rows 15-17 underground.

function buildLevel21() {
    const W = 120, H = 18;
    const m = createMap(W, H);

    // ─ Underground base: rows 15-17 ─
    fill(m, 0, 15, W - 1, 17, TILE.SOLID);

    // ─ Start island: cols 0-5, ground at row 14 ─
    fill(m, 0, 14, 5, 14, TILE.SOLID);

    // ─ End island: cols 114-119, ground at row 14 ─
    fill(m, 114, 14, 119, 14, TILE.SOLID);

    // ─ Toxic sea: carve ground, fill toxic ─
    fill(m, 6, 14, 113, 15, TILE.AIR);
    fill(m, 6, 16, 113, 16, TILE.TOXIC);

    // ─ Ceiling ─
    fill(m, 0, 0, W - 1, 1, TILE.SOLID);

    // ══════ PLATFORM GAUNTLET ══════
    // Heights alternate to force varied jump arcs.
    // Pattern: groups of increasing difficulty

    // ─ Group 1 (cols 8-25): 2-tile platforms, moderate spacing ─
    fill(m, 8,  12, 9,  12, TILE.PLATFORM);
    fill(m, 13, 11, 14, 11, TILE.PLATFORM);
    fill(m, 18, 12, 19, 12, TILE.PLATFORM);
    fill(m, 23, 10, 24, 10, TILE.PLATFORM);

    // ─ Group 2 (cols 27-45): 1-2 tile platforms, spike neighbors ─
    fill(m, 28, 12, 28, 12, TILE.PLATFORM); // single tile!
    fill(m, 32, 10, 33, 10, TILE.PLATFORM);
    set(m, 34, 10, TILE.SPIKE_UP); // spike next to platform!
    fill(m, 37, 12, 38, 12, TILE.PLATFORM);
    fill(m, 42, 9, 42, 9, TILE.PLATFORM);  // single tile, high
    fill(m, 45, 12, 46, 12, TILE.PLATFORM);

    // ─ Group 3 (cols 48-68): Single tile platforms, varied heights ─
    set(m, 49, 11, TILE.PLATFORM);
    set(m, 53, 9,  TILE.PLATFORM);
    set(m, 56, 12, TILE.PLATFORM);
    set(m, 59, 10, TILE.PLATFORM);
    set(m, 63, 8,  TILE.PLATFORM);
    set(m, 66, 11, TILE.PLATFORM);

    // ─ Rest platform (small safe zone) ─
    fill(m, 69, 14, 72, 14, TILE.SOLID);

    // ─ Group 4 (cols 74-95): Harder — ceiling spikes limit jump ─
    fill(m, 74, 12, 75, 12, TILE.PLATFORM);
    // Ceiling spike above
    fill(m, 74, 4, 76, 4, TILE.SOLID);
    set(m, 75, 5, TILE.SPIKE_DOWN);

    set(m, 79, 10, TILE.PLATFORM);
    fill(m, 83, 12, 84, 12, TILE.PLATFORM);
    set(m, 87, 9,  TILE.PLATFORM);
    fill(m, 90, 11, 91, 11, TILE.PLATFORM);
    set(m, 95, 10, TILE.PLATFORM);

    // ─ Group 5 (cols 98-113): Final push — single tiles, tight ─
    set(m, 98,  12, TILE.PLATFORM);
    set(m, 101, 10, TILE.PLATFORM);
    set(m, 104, 12, TILE.PLATFORM);
    set(m, 107, 9,  TILE.PLATFORM);
    set(m, 110, 11, TILE.PLATFORM);
    fill(m, 113, 13, 113, 13, TILE.PLATFORM);

    return m;
}


// ═══════════════════════════════════════════════════════════════
// Level 22: "Death Corridor" (130×18)
// ═══════════════════════════════════════════════════════════════
// An extremely long corridor with alternating ceiling and floor
// spikes. Toxic pits break the ground. Platforms provide the
// only safe path. Spikes alternate in dense patterns forcing
// the player to stay on platforms or weave carefully.
//
// Layout: ground at row 14, rows 15-17 underground.

function buildLevel22() {
    const W = 130, H = 18;
    const m = createMap(W, H);

    // ─ Base ground & ceiling ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);
    fill(m, 0, 0, W - 1, 1, TILE.SOLID);

    // ─ Start safe zone: cols 0-6 ─
    // (clean ground, no hazards)

    // ══════ CORRIDOR SEGMENTS ══════

    // ── Segment 1 (cols 7-30): Floor spikes + toxic pits ──
    // Floor spikes
    for (let x = 7; x <= 30; x++) {
        if (x % 3 === 0) set(m, x, 13, TILE.SPIKE_UP);
    }
    // Toxic pit: cols 15-18
    fill(m, 15, 14, 18, 15, TILE.AIR);
    fill(m, 15, 16, 18, 16, TILE.TOXIC);
    // Remove spikes over toxic (they'd float)
    for (let x = 15; x <= 18; x++) set(m, x, 13, TILE.AIR);
    // Safe platform over toxic
    fill(m, 16, 11, 18, 11, TILE.PLATFORM);
    // Toxic pit: cols 24-26
    fill(m, 24, 14, 26, 15, TILE.AIR);
    fill(m, 24, 16, 26, 16, TILE.TOXIC);
    for (let x = 24; x <= 26; x++) set(m, x, 13, TILE.AIR);
    fill(m, 24, 11, 26, 11, TILE.PLATFORM);

    // ── Segment 2 (cols 31-55): Alternating ceiling/floor ──
    for (let x = 31; x <= 55; x++) {
        if (x % 6 < 3) {
            set(m, x, 13, TILE.SPIKE_UP);   // floor spike
        } else {
            set(m, x, 2, TILE.SPIKE_DOWN);  // ceiling spike
        }
    }
    // Platforms to navigate
    fill(m, 34, 10, 37, 10, TILE.PLATFORM);
    fill(m, 42, 8, 44, 8, TILE.PLATFORM);
    fill(m, 49, 11, 52, 11, TILE.PLATFORM);
    // Toxic pit: cols 38-41
    fill(m, 38, 14, 41, 15, TILE.AIR);
    fill(m, 38, 16, 41, 16, TILE.TOXIC);
    for (let x = 38; x <= 41; x++) set(m, x, 13, TILE.AIR);

    // ── Segment 3 (cols 56-80): Dense spikes both sides ──
    for (let x = 56; x <= 80; x++) {
        set(m, x, 13, TILE.SPIKE_UP);
        if (x % 3 === 0) set(m, x, 2, TILE.SPIKE_DOWN);
    }
    // Must use platforms — no safe ground!
    fill(m, 58, 10, 61, 10, TILE.PLATFORM);
    fill(m, 65, 8, 67, 8, TILE.PLATFORM);
    fill(m, 71, 10, 73, 10, TILE.PLATFORM);
    fill(m, 77, 9, 79, 9, TILE.PLATFORM);
    // Toxic pits
    fill(m, 62, 14, 64, 15, TILE.AIR);
    fill(m, 62, 16, 64, 16, TILE.TOXIC);
    for (let x = 62; x <= 64; x++) set(m, x, 13, TILE.AIR);
    fill(m, 74, 14, 76, 15, TILE.AIR);
    fill(m, 74, 16, 76, 16, TILE.TOXIC);
    for (let x = 74; x <= 76; x++) set(m, x, 13, TILE.AIR);

    // ── Segment 4 (cols 81-110): Gauntlet — spikes everywhere ──
    for (let x = 81; x <= 110; x++) {
        // Alternating: every other pair
        if ((Math.floor(x / 2)) % 2 === 0) {
            set(m, x, 13, TILE.SPIKE_UP);
        } else {
            set(m, x, 2, TILE.SPIKE_DOWN);
        }
    }
    // Platforms (smaller, harder)
    fill(m, 83, 10, 85, 10, TILE.PLATFORM);
    fill(m, 89, 7, 91, 7, TILE.PLATFORM);
    fill(m, 95, 10, 97, 10, TILE.PLATFORM);
    fill(m, 101, 8, 103, 8, TILE.PLATFORM);
    fill(m, 107, 11, 109, 11, TILE.PLATFORM);
    // Toxic pits
    fill(m, 86, 14, 88, 15, TILE.AIR);
    fill(m, 86, 16, 88, 16, TILE.TOXIC);
    for (let x = 86; x <= 88; x++) set(m, x, 13, TILE.AIR);
    fill(m, 98, 14, 100, 15, TILE.AIR);
    fill(m, 98, 16, 100, 16, TILE.TOXIC);
    for (let x = 98; x <= 100; x++) set(m, x, 13, TILE.AIR);
    fill(m, 104, 14, 106, 15, TILE.AIR);
    fill(m, 104, 16, 106, 16, TILE.TOXIC);
    for (let x = 104; x <= 106; x++) set(m, x, 13, TILE.AIR);

    // ── End safe zone: cols 111-129 ──
    // Clear any spikes
    for (let x = 111; x <= 129; x++) {
        set(m, x, 13, TILE.AIR);
        set(m, x, 2, TILE.AIR);
    }

    return m;
}


// ═══════════════════════════════════════════════════════════════
// Level 23: "Upside Down" (100×22)
// ═══════════════════════════════════════════════════════════════
// The ceiling is covered in dense spikes, forcing the player to
// stay low and frequently shrink. Solid blocks hang from the
// ceiling creating low passages. High jumps are punished with
// instant death from ceiling spikes.
//
// Layout: ground at row 18, rows 19-21 underground.
// Ceiling at rows 0-3 (thick, with spikes at row 4).

function buildLevel23() {
    const W = 100, H = 22;
    const m = createMap(W, H);

    // ─ Underground base: rows 19-21 ─
    fill(m, 0, 19, W - 1, 21, TILE.SOLID);
    // ─ Ground floor: row 18 ─
    fill(m, 0, 18, W - 1, 18, TILE.SOLID);
    // ─ Thick ceiling: rows 0-3 ─
    fill(m, 0, 0, W - 1, 3, TILE.SOLID);

    // ─ Ceiling spikes everywhere (row 4) ─
    for (let x = 8; x <= 94; x++) {
        set(m, x, 4, TILE.SPIKE_DOWN);
    }

    // ─ Start safe zone: cols 0-7 ─
    // No ceiling spikes here (already excluded above)

    // ══════ SECTIONS ══════

    // ── Section 1 (cols 8-25): Low ceiling blocks ──
    // Hanging blocks force low movement
    fill(m, 12, 4, 16, 10, TILE.SOLID);  // block drops to row 10
    set(m, 12, 11, TILE.SPIKE_DOWN);     // spike tip
    set(m, 14, 11, TILE.SPIKE_DOWN);
    set(m, 16, 11, TILE.SPIKE_DOWN);

    fill(m, 20, 4, 24, 12, TILE.SOLID);  // deeper block
    set(m, 20, 13, TILE.SPIKE_DOWN);
    set(m, 22, 13, TILE.SPIKE_DOWN);
    set(m, 24, 13, TILE.SPIKE_DOWN);
    // Must shrink to pass under! Gap between row 13 spike and row 18 ground:
    // rows 14-17 open = 4 tiles, but spikes at 13 mean effective 3 tiles
    // Add extra wall to force shrink at cols 22-23
    fill(m, 22, 13, 23, 17, TILE.SOLID);
    // Leave row 17 open for shrink passage
    fill(m, 22, 17, 23, 17, TILE.AIR);

    // ── Section 2 (cols 26-45): Toxic pits + ceiling danger ──
    // Toxic pit: cols 28-32
    fill(m, 28, 18, 32, 19, TILE.AIR);
    fill(m, 28, 20, 32, 20, TILE.TOXIC);
    // Platform over toxic (low, can't jump high!)
    fill(m, 29, 15, 31, 15, TILE.PLATFORM);

    // Hanging block: cols 34-38
    fill(m, 34, 4, 38, 9, TILE.SOLID);
    set(m, 35, 10, TILE.SPIKE_DOWN);
    set(m, 37, 10, TILE.SPIKE_DOWN);

    // Toxic pit: cols 40-43
    fill(m, 40, 18, 43, 19, TILE.AIR);
    fill(m, 40, 20, 43, 20, TILE.TOXIC);
    fill(m, 40, 15, 43, 15, TILE.PLATFORM);

    // ── Section 3 (cols 46-65): Shrink gauntlet ──
    // Series of low passages requiring shrink
    // Block 1: cols 48-52, drops to row 14
    fill(m, 48, 4, 52, 16, TILE.SOLID);
    fill(m, 48, 17, 52, 17, TILE.AIR); // 1-tile gap at row 17

    // Block 2: cols 56-60, drops to row 15
    fill(m, 56, 4, 60, 16, TILE.SOLID);
    fill(m, 56, 17, 60, 17, TILE.AIR); // 1-tile gap at row 17

    // Between blocks: cols 53-55 open but with ceiling spikes
    // (already have ceiling spikes from the loop above)

    // Block 3: cols 63-66, drops to row 13 — tightest!
    fill(m, 63, 4, 66, 16, TILE.SOLID);
    fill(m, 63, 17, 66, 17, TILE.AIR); // 1-tile gap at row 17

    // ── Section 4 (cols 67-85): Low platforming over toxic ──
    // Multiple toxic pits with hanging blocks overhead

    // Toxic pit: cols 69-73
    fill(m, 69, 18, 73, 19, TILE.AIR);
    fill(m, 69, 20, 73, 20, TILE.TOXIC);
    // Low platform (row 16) — can't jump high!
    fill(m, 70, 16, 72, 16, TILE.PLATFORM);

    // Hanging block: cols 75-78
    fill(m, 75, 4, 78, 11, TILE.SOLID);
    set(m, 75, 12, TILE.SPIKE_DOWN);
    set(m, 77, 12, TILE.SPIKE_DOWN);

    // Toxic pit: cols 80-83
    fill(m, 80, 18, 83, 19, TILE.AIR);
    fill(m, 80, 20, 83, 20, TILE.TOXIC);
    fill(m, 80, 16, 83, 16, TILE.PLATFORM);

    // Floor spikes: scattered
    set(m, 74, 17, TILE.SPIKE_UP);
    set(m, 79, 17, TILE.SPIKE_UP);
    set(m, 84, 17, TILE.SPIKE_UP);

    // ── Section 5 (cols 86-94): Final gauntlet ──
    // Hanging block with spikes AND floor spikes
    fill(m, 88, 4, 92, 13, TILE.SOLID);
    set(m, 88, 14, TILE.SPIKE_DOWN);
    set(m, 90, 14, TILE.SPIKE_DOWN);
    set(m, 92, 14, TILE.SPIKE_DOWN);
    // Floor under passage is safe, timed run under ceiling spikes
    // Only row 15-16 is safe (2 tiles), must shrink and time carefully

    // ── End safe zone: cols 95-99 ──
    // No ceiling spikes (excluded from loop)

    return m;
}


// ═══════════════════════════════════════════════════════════════
// Level Registry
// ═══════════════════════════════════════════════════════════════

export const lateLevels = [
    {
        id: 17,
        name: "No Ground",
        width: 100,
        height: 20,
        spawnP1: { col: 2, row: 16 },
        spawnP2: { col: 4, row: 16 },
        endFlag: { col: 96, row: 16 },
        revivalFlags: [
            { col: 22, row: 13 },
            { col: 47, row: 13 },
            { col: 69, row: 13 },
            { col: 87, row: 14 }
        ],
        hints: [
            { col: 3,  text: "No ground ahead… jump!" },
            { col: 52, text: "Platforms get smaller!" }
        ],
        map: buildLevel17()
    },
    {
        id: 18,
        name: "Spike Cavern",
        width: 110,
        height: 20,
        spawnP1: { col: 2, row: 16 },
        spawnP2: { col: 4, row: 16 },
        endFlag: { col: 107, row: 16 },
        revivalFlags: [
            { col: 18, row: 16 },
            { col: 42, row: 10 },
            { col: 72, row: 16 },
            { col: 95, row: 9 }
        ],
        hints: [
            { col: 9,  text: "Watch above AND below!" },
            { col: 58, text: "Hold ↓ to Shrink through!" }
        ],
        map: buildLevel18()
    },
    {
        id: 19,
        name: "Toxic Labyrinth",
        width: 80,
        height: 24,
        spawnP1: { col: 2, row: 20 },
        spawnP2: { col: 4, row: 20 },
        endFlag: { col: 77, row: 20 },
        revivalFlags: [
            { col: 17, row: 14 },
            { col: 35, row: 20 },
            { col: 55, row: 7 },
            { col: 74, row: 20 }
        ],
        hints: [
            { col: 3,  text: "Find a way up!" },
            { col: 28, text: "Shrink to pass walls" }
        ],
        map: buildLevel19()
    },
    {
        id: 20,
        name: "The Ascent",
        width: 60,
        height: 30,
        spawnP1: { col: 5, row: 26 },
        spawnP2: { col: 8, row: 26 },
        endFlag: { col: 30, row: 3 },
        revivalFlags: [
            { col: 7, row: 20 },
            { col: 48, row: 21 },
            { col: 17, row: 14 }
        ],
        hints: [
            { col: 5,  text: "Climb to the top!" },
            { col: 30, text: "Shrink to pass through" }
        ],
        map: buildLevel20()
    },
    {
        id: 21,
        name: "Precision Jump",
        width: 120,
        height: 18,
        spawnP1: { col: 2, row: 14 },
        spawnP2: { col: 4, row: 14 },
        endFlag: { col: 117, row: 14 },
        revivalFlags: [
            { col: 23, row: 10 },
            { col: 69, row: 14 },
            { col: 95, row: 10 },
            { col: 110, row: 11 }
        ],
        hints: [
            { col: 3,  text: "Every jump counts!" },
            { col: 69, text: "Breathe… then go" }
        ],
        map: buildLevel21()
    },
    {
        id: 22,
        name: "Death Corridor",
        width: 130,
        height: 18,
        spawnP1: { col: 2, row: 14 },
        spawnP2: { col: 4, row: 14 },
        endFlag: { col: 125, row: 14 },
        revivalFlags: [
            { col: 28, row: 14 },
            { col: 54, row: 14 },
            { col: 80, row: 14 },
            { col: 110, row: 14 }
        ],
        hints: [
            { col: 5,  text: "Stay on the platforms!" },
            { col: 82, text: "Almost there… focus!" }
        ],
        map: buildLevel22()
    },
    {
        id: 23,
        name: "Upside Down",
        width: 100,
        height: 22,
        spawnP1: { col: 2, row: 18 },
        spawnP2: { col: 4, row: 18 },
        endFlag: { col: 97, row: 18 },
        revivalFlags: [
            { col: 26, row: 18 },
            { col: 46, row: 18 },
            { col: 67, row: 18 },
            { col: 95, row: 18 }
        ],
        hints: [
            { col: 3,  text: "Don't jump too high!" },
            { col: 47, text: "Hold ↓ to Shrink!" }
        ],
        map: buildLevel23()
    }
];
