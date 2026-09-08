// ══════════════════════════════════════════════════════════════
// SLIME TALES — Endgame Levels 24–30 (Expert Difficulty)
// ══════════════════════════════════════════════════════════════

import { TILE } from './tiles.js';

// ── Local Helpers ────────────────────────────────────────────

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

// ══════════════════════════════════════════════════════════════
// Level 24: "Hell's Kitchen"
// W=110, H=20. Toxic everywhere, tiny safe platforms, dense spikes.
// Ground at row 16, underground rows 17-19.
// The entire floor is toxic with small safe islands and spike traps.
// ══════════════════════════════════════════════════════════════

function buildLevel24() {
    const W = 110, H = 20;
    const m = createMap(W, H);

    // Base ground: rows 16-19
    fill(m, 0, 16, W - 1, 19, TILE.SOLID);

    // ── Massive toxic flood: carve out most of the floor ──
    // Carve rows 16-17 to AIR across most of map, then place toxic at row 18
    fill(m, 6, 16, 105, 17, TILE.AIR);
    fill(m, 6, 18, 105, 18, TILE.TOXIC);

    // ── Safe spawn island (cols 0-7) ──
    // Keep ground intact at cols 0-5
    // Spikes guarding the edge
    set(m, 6, 15, TILE.SPIKE_UP);
    set(m, 7, 15, TILE.SPIKE_UP);

    // ── Island 1 (cols 11-14): small safe platform above toxic ──
    fill(m, 11, 14, 14, 14, TILE.PLATFORM);
    set(m, 11, 13, TILE.SPIKE_UP);
    set(m, 14, 13, TILE.SPIKE_UP);

    // ── Island 2 (cols 19-21): tiny 3-tile solid pillar ──
    fill(m, 19, 12, 21, 15, TILE.SOLID);
    set(m, 19, 11, TILE.SPIKE_UP);
    set(m, 21, 11, TILE.SPIKE_UP);

    // ── Ceiling spikes above island 2 ──
    fill(m, 18, 0, 22, 2, TILE.SOLID);
    set(m, 19, 3, TILE.SPIKE_DOWN);
    set(m, 20, 3, TILE.SPIKE_DOWN);
    set(m, 21, 3, TILE.SPIKE_DOWN);

    // ── Island 3 (cols 26-27): 2-tile platform, very tight ──
    fill(m, 26, 13, 27, 13, TILE.PLATFORM);

    // ── Island 4 (cols 32-34): solid pillar with spikes around ──
    fill(m, 32, 11, 34, 15, TILE.SOLID);
    set(m, 31, 15, TILE.SPIKE_UP);
    set(m, 35, 15, TILE.SPIKE_UP);
    set(m, 32, 10, TILE.SPIKE_DOWN);
    set(m, 34, 10, TILE.SPIKE_DOWN);

    // ── Spike gauntlet section (cols 38-50) ──
    // Narrow platforms with spikes between them
    fill(m, 38, 14, 40, 14, TILE.PLATFORM);
    set(m, 41, 14, TILE.SPIKE_UP);
    fill(m, 42, 12, 44, 12, TILE.PLATFORM);
    set(m, 45, 12, TILE.SPIKE_UP);
    fill(m, 46, 14, 48, 14, TILE.PLATFORM);
    set(m, 49, 14, TILE.SPIKE_UP);
    set(m, 50, 14, TILE.SPIKE_UP);

    // ── Revival checkpoint: solid island at col 52 ──
    fill(m, 51, 13, 55, 15, TILE.SOLID);

    // ── Hellfire corridor (cols 58-75) ──
    // Ceiling + floor spikes with narrow passage
    fill(m, 58, 0, 75, 3, TILE.SOLID);
    for (let x = 58; x <= 75; x += 2) {
        set(m, x, 4, TILE.SPIKE_DOWN);
    }

    // Stepping stones through the corridor
    fill(m, 58, 10, 60, 10, TILE.PLATFORM);
    fill(m, 63, 12, 65, 12, TILE.PLATFORM);
    set(m, 62, 12, TILE.SPIKE_UP);
    fill(m, 68, 10, 70, 10, TILE.PLATFORM);
    set(m, 67, 10, TILE.SPIKE_UP);
    set(m, 71, 10, TILE.SPIKE_UP);
    fill(m, 73, 13, 75, 13, TILE.PLATFORM);

    // ── Island chain (cols 78-90): tiny platforms, alternating heights ──
    fill(m, 78, 14, 79, 14, TILE.PLATFORM);
    set(m, 80, 14, TILE.SPIKE_UP);
    fill(m, 82, 11, 83, 11, TILE.PLATFORM);
    fill(m, 86, 13, 87, 13, TILE.PLATFORM);
    set(m, 85, 13, TILE.SPIKE_UP);
    set(m, 88, 13, TILE.SPIKE_UP);
    fill(m, 90, 10, 91, 10, TILE.PLATFORM);

    // ── Final approach: solid ground restored (cols 95-109) ──
    fill(m, 95, 14, 105, 15, TILE.SOLID);
    // Spike run to the flag
    set(m, 96, 13, TILE.SPIKE_UP);
    set(m, 99, 13, TILE.SPIKE_UP);
    set(m, 102, 13, TILE.SPIKE_UP);

    return m;
}

// ══════════════════════════════════════════════════════════════
// Level 25: "Vertical Nightmare"
// W=70, H=34. Extremely tall climb with spikes, toxic, shrink
// passages, and tiny platforms. Ground at row 30, underground 31-33.
// Player climbs from bottom to top.
// ══════════════════════════════════════════════════════════════

function buildLevel25() {
    const W = 70, H = 34;
    const m = createMap(W, H);

    // Base ground: rows 30-33
    fill(m, 0, 30, W - 1, 33, TILE.SOLID);

    // ── Left and right walls for vertical shaft ──
    fill(m, 0, 0, 3, 29, TILE.SOLID);
    fill(m, W - 4, 0, W - 1, 29, TILE.SOLID);

    // ── Toxic floor in the shaft ──
    fill(m, 4, 30, W - 5, 31, TILE.AIR);
    fill(m, 4, 32, W - 5, 32, TILE.TOXIC);

    // Safe spawn area: solid ground at cols 4-14, row 30
    fill(m, 4, 30, 14, 31, TILE.SOLID);

    // ══ FLOOR 1 (rows 26-29): Basic climb ══
    // Platform staircase
    fill(m, 10, 27, 14, 27, TILE.PLATFORM);
    fill(m, 20, 25, 24, 25, TILE.PLATFORM);
    set(m, 19, 25, TILE.SPIKE_UP);
    set(m, 25, 25, TILE.SPIKE_UP);

    // Toxic pool blocking direct path
    fill(m, 30, 30, 45, 31, TILE.AIR);
    fill(m, 30, 32, 45, 32, TILE.TOXIC);

    fill(m, 35, 24, 39, 24, TILE.PLATFORM);
    fill(m, 45, 26, 49, 26, TILE.PLATFORM);
    set(m, 44, 26, TILE.SPIKE_UP);
    set(m, 50, 26, TILE.SPIKE_UP);

    // ══ FLOOR 2 (rows 20-24): Shrink passage ══
    // Solid ceiling blocking upward jump at cols 50-60
    fill(m, 50, 22, 62, 23, TILE.SOLID);
    // 1-tile shrink gap at row 24
    // (row 24 is AIR, player must shrink to pass under solid at rows 22-23)

    fill(m, 55, 21, 59, 21, TILE.PLATFORM);

    // Left side platforms to climb higher
    fill(m, 8, 21, 12, 21, TILE.PLATFORM);
    fill(m, 16, 19, 20, 19, TILE.PLATFORM);
    set(m, 15, 19, TILE.SPIKE_UP);

    // ══ FLOOR 3 (rows 14-18): Spike corridor ══
    // Walls narrowing the passage
    fill(m, 4, 14, 8, 17, TILE.SOLID);
    fill(m, W - 8, 14, W - 5, 17, TILE.SOLID);

    // Spike-lined platforms
    fill(m, 25, 17, 29, 17, TILE.PLATFORM);
    set(m, 24, 17, TILE.SPIKE_UP);
    set(m, 30, 17, TILE.SPIKE_UP);

    fill(m, 35, 15, 39, 15, TILE.PLATFORM);
    set(m, 34, 15, TILE.SPIKE_UP);
    set(m, 40, 15, TILE.SPIKE_UP);

    fill(m, 50, 17, 54, 17, TILE.PLATFORM);

    // Ceiling spikes
    fill(m, 25, 10, 40, 11, TILE.SOLID);
    for (let x = 26; x <= 39; x += 2) {
        set(m, x, 12, TILE.SPIKE_DOWN);
    }

    // ══ FLOOR 4 (rows 8-12): Shrink maze ══
    // Solid block with shrink passage
    fill(m, 12, 8, 30, 11, TILE.SOLID);
    // Gap at row 12: player shrinks to pass (rows 8-11 solid, row 12 air)

    fill(m, 8, 13, 11, 13, TILE.PLATFORM);
    fill(m, 45, 12, 49, 12, TILE.PLATFORM);

    // ══ FLOOR 5 (rows 3-6): Final ascent ══
    fill(m, 35, 9, 39, 9, TILE.PLATFORM);
    set(m, 34, 9, TILE.SPIKE_UP);
    set(m, 40, 9, TILE.SPIKE_UP);

    fill(m, 50, 7, 54, 7, TILE.PLATFORM);
    set(m, 49, 7, TILE.SPIKE_UP);
    set(m, 55, 7, TILE.SPIKE_UP);

    fill(m, 40, 5, 44, 5, TILE.PLATFORM);

    // ── End platform at top ──
    fill(m, 55, 3, 62, 5, TILE.SOLID);
    set(m, 54, 5, TILE.SPIKE_UP);

    return m;
}

// ══════════════════════════════════════════════════════════════
// Level 26: "The Impossible Gap"
// W=140, H=18. Maximum-length jumps (4-5 tile gaps) in sequence
// over toxic pits. Ground at row 14, underground 15-17.
// ══════════════════════════════════════════════════════════════

function buildLevel26() {
    const W = 140, H = 18;
    const m = createMap(W, H);

    // Base ground: rows 14-17
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ── Toxic flood under the entire level ──
    fill(m, 8, 14, 130, 15, TILE.AIR);
    fill(m, 8, 16, 130, 16, TILE.TOXIC);

    // ── Safe spawn area (cols 0-8) ──
    // Ground is intact

    // ══ Section 1: Warm-up 4-tile gaps (cols 8-35) ══
    // Island 1: cols 12-15 (4-tile gap from col 8)
    fill(m, 12, 14, 15, 15, TILE.SOLID);

    // Island 2: cols 20-23 (5-tile gap!)
    fill(m, 20, 14, 23, 15, TILE.SOLID);

    // Island 3: cols 28-30 (5-tile gap, only 3 tiles wide!)
    fill(m, 28, 14, 30, 15, TILE.SOLID);

    // ══ Section 2: Shrinking platforms (cols 35-60) ══
    // Each platform gets smaller

    // 3-tile platform
    fill(m, 35, 14, 37, 15, TILE.SOLID);

    // 2-tile platform (5-tile gap)
    fill(m, 42, 14, 43, 15, TILE.SOLID);
    set(m, 41, 14, TILE.SPIKE_UP);

    // 2-tile platform (5-tile gap)
    fill(m, 48, 13, 49, 15, TILE.SOLID);

    // 2-tile platform at different height
    fill(m, 54, 12, 55, 15, TILE.SOLID);

    // Back to ground level, 2-tile
    fill(m, 60, 14, 61, 15, TILE.SOLID);

    // ══ Section 3: Gap + spike combos (cols 65-95) ══
    // Landing platforms have spikes next to them

    // 3-tile platform with spike on landing side
    fill(m, 66, 14, 68, 15, TILE.SOLID);
    set(m, 65, 14, TILE.SPIKE_UP);

    // 4-tile gap, 2-tile platform
    fill(m, 73, 14, 74, 15, TILE.SOLID);
    set(m, 72, 14, TILE.SPIKE_UP);
    set(m, 75, 14, TILE.SPIKE_UP);

    // 4-tile gap, elevated 2-tile platform
    fill(m, 79, 12, 80, 15, TILE.SOLID);
    set(m, 78, 12, TILE.SPIKE_UP);
    set(m, 81, 12, TILE.SPIKE_UP);

    // Descend: 4-tile gap, 2-tile platform
    fill(m, 85, 14, 86, 15, TILE.SOLID);
    set(m, 84, 14, TILE.SPIKE_UP);
    set(m, 87, 14, TILE.SPIKE_UP);

    // 5-tile gap — the hardest one yet, 3-tile platform
    fill(m, 92, 14, 94, 15, TILE.SOLID);

    // ══ Section 4: The Final Gauntlet (cols 98-130) ══
    // Alternating heights with max gaps

    // High platform
    fill(m, 99, 11, 101, 15, TILE.SOLID);
    set(m, 98, 11, TILE.SPIKE_UP);
    set(m, 102, 11, TILE.SPIKE_UP);

    // Low platform, 5-tile gap
    fill(m, 107, 14, 108, 15, TILE.SOLID);

    // Mid platform, 5-tile gap
    fill(m, 113, 12, 114, 15, TILE.SOLID);

    // Low, 5-tile gap — only 2 tiles!
    fill(m, 119, 14, 120, 15, TILE.SOLID);
    set(m, 118, 14, TILE.SPIKE_UP);

    // Final approach: slightly wider
    fill(m, 125, 14, 130, 15, TILE.SOLID);
    set(m, 124, 14, TILE.SPIKE_UP);
    set(m, 126, 13, TILE.SPIKE_UP);
    set(m, 128, 13, TILE.SPIKE_UP);

    return m;
}

// ══════════════════════════════════════════════════════════════
// Level 27: "Razor's Edge"
// W=120, H=20. Single-tile-wide paths between spike walls.
// Ground at row 16, underground 17-19.
// ══════════════════════════════════════════════════════════════

function buildLevel27() {
    const W = 120, H = 20;
    const m = createMap(W, H);

    // Base ground: rows 16-19
    fill(m, 0, 16, W - 1, 19, TILE.SOLID);

    // ── Safe spawn area (cols 0-8) ──

    // ══ Section 1: Spike corridor on ground (cols 10-35) ══
    // Spikes every 3 tiles to leave 2 safe tiles between spikes
    for (let x = 10; x <= 35; x++) {
        if (x % 3 !== 0) {
            // Safe tile — leave ground clear
            continue;
        }
        set(m, x, 15, TILE.SPIKE_UP);
    }

    // Ceiling spikes to prevent jumping high
    fill(m, 10, 8, 35, 10, TILE.SOLID);
    for (let x = 10; x <= 35; x += 2) {
        set(m, x, 11, TILE.SPIKE_DOWN);
    }

    // ══ Section 2: Zigzag spike walls (cols 38-60) ══
    // Vertical spike walls with 1-tile gaps to pass through

    // Wall 1 at col 40
    fill(m, 40, 6, 40, 15, TILE.SOLID);
    fill(m, 40, 13, 40, 13, TILE.AIR); // 1-tile gap at row 13 (must shrink)
    fill(m, 39, 6, 39, 12, TILE.SPIKE_UP); // Not actually good for spike_up; use as wall decoration
    // Place spikes on top of the wall approach
    set(m, 39, 15, TILE.SPIKE_UP);
    set(m, 41, 15, TILE.SPIKE_UP);

    // Wall 2 at col 46
    fill(m, 46, 6, 46, 15, TILE.SOLID);
    fill(m, 46, 13, 46, 13, TILE.AIR); // shrink gap
    set(m, 45, 15, TILE.SPIKE_UP);
    set(m, 47, 15, TILE.SPIKE_UP);

    // Wall 3 at col 52
    fill(m, 52, 6, 52, 15, TILE.SOLID);
    fill(m, 52, 14, 52, 14, TILE.AIR); // gap at row 14
    set(m, 51, 15, TILE.SPIKE_UP);
    set(m, 53, 15, TILE.SPIKE_UP);

    // Wall 4 at col 58
    fill(m, 58, 6, 58, 15, TILE.SOLID);
    fill(m, 58, 13, 58, 13, TILE.AIR); // shrink gap
    set(m, 57, 15, TILE.SPIKE_UP);
    set(m, 59, 15, TILE.SPIKE_UP);

    // ══ Section 3: Narrow pillar walk (cols 63-85) ══
    // 1-tile-wide pillars over toxic, with spikes between them
    fill(m, 62, 16, 86, 17, TILE.AIR);
    fill(m, 62, 18, 86, 18, TILE.TOXIC);

    // Pillars (1-tile wide solid columns rising from toxic)
    for (let x = 64; x <= 84; x += 4) {
        fill(m, x, 13, x, 15, TILE.SOLID);
        // Spikes on adjacent columns
        if (x + 1 <= 84) set(m, x + 1, 15, TILE.SPIKE_UP);
        if (x - 1 >= 62) set(m, x - 1, 15, TILE.SPIKE_UP);
    }

    // Ceiling pressure: spikes from above
    fill(m, 63, 5, 85, 7, TILE.SOLID);
    for (let x = 64; x <= 84; x += 3) {
        set(m, x, 8, TILE.SPIKE_DOWN);
    }

    // ══ Section 4: The Razor Blade (cols 90-110) ══
    // Single-tile ground path with spikes immediately left and right
    // Toxic below

    fill(m, 88, 16, 112, 17, TILE.AIR);
    fill(m, 88, 18, 112, 18, TILE.TOXIC);

    // Create a winding 1-tile-wide path
    // Row 14 path, snaking left and right
    const pathCols = [90, 91, 92, 92, 93, 94, 95, 95, 96, 97, 98, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108];
    const pathRows = [14, 13, 12, 14, 14, 13, 12, 14, 14, 14, 13, 14, 14, 12, 13, 14, 14, 13, 12, 13, 14, 14];

    for (let i = 0; i < pathCols.length; i++) {
        fill(m, pathCols[i], pathRows[i], pathCols[i], 15, TILE.SOLID);
    }

    // Spikes flanking the path
    for (let x = 90; x <= 108; x++) {
        if (!pathCols.includes(x)) {
            set(m, x, 15, TILE.SPIKE_UP);
        }
    }

    // ── End area (cols 112-119) ──
    fill(m, 112, 14, 119, 15, TILE.SOLID);
    set(m, 113, 13, TILE.SPIKE_UP);
    set(m, 115, 13, TILE.SPIKE_UP);

    return m;
}

// ══════════════════════════════════════════════════════════════
// Level 28: "Toxic Waterfall"
// W=90, H=28. Descending level, toxic on many rows.
// Player starts at top and descends. Ground at row 24, underground 25-27.
// ══════════════════════════════════════════════════════════════

function buildLevel28() {
    const W = 90, H = 28;
    const m = createMap(W, H);

    // Base ground: rows 24-27
    fill(m, 0, 24, W - 1, 27, TILE.SOLID);

    // ── Spawn platform at top-left ──
    fill(m, 0, 3, 10, 5, TILE.SOLID);

    // ══ Toxic "waterfalls" — vertical columns of toxic ══
    // These create toxic walls the player must navigate around

    // Toxic fall 1: cols 15-17, rows 0-22
    fill(m, 15, 0, 17, 22, TILE.TOXIC);

    // Toxic fall 2: cols 30-32, rows 0-22
    fill(m, 30, 0, 32, 22, TILE.TOXIC);

    // Toxic fall 3: cols 48-50, rows 0-22
    fill(m, 48, 0, 50, 22, TILE.TOXIC);

    // Toxic fall 4: cols 65-67, rows 0-22
    fill(m, 65, 0, 67, 22, TILE.TOXIC);

    // Toxic pool at bottom spanning most of the level
    fill(m, 12, 24, 80, 25, TILE.AIR);
    fill(m, 12, 26, 80, 26, TILE.TOXIC);

    // ══ Descent platforms between toxic waterfalls ══

    // ── Section 1: Between spawn and fall 1 (cols 0-14) ──
    fill(m, 6, 8, 10, 8, TILE.PLATFORM);
    set(m, 5, 8, TILE.SPIKE_UP);
    fill(m, 2, 12, 6, 12, TILE.PLATFORM);
    fill(m, 9, 15, 13, 15, TILE.PLATFORM);
    set(m, 14, 15, TILE.SPIKE_UP);

    // ── Section 2: Between fall 1 and fall 2 (cols 18-29) ──
    fill(m, 19, 6, 23, 6, TILE.PLATFORM);
    set(m, 18, 6, TILE.SPIKE_UP);
    fill(m, 24, 10, 28, 10, TILE.PLATFORM);
    set(m, 29, 10, TILE.SPIKE_UP);
    fill(m, 19, 14, 22, 14, TILE.PLATFORM);
    fill(m, 25, 17, 28, 17, TILE.PLATFORM);
    set(m, 24, 17, TILE.SPIKE_UP);

    // Shrink passage: solid block with 1-tile gap
    fill(m, 19, 19, 28, 20, TILE.SOLID);
    // Gap at row 21 to pass through

    fill(m, 22, 22, 26, 22, TILE.PLATFORM);

    // ── Section 3: Between fall 2 and fall 3 (cols 33-47) ──
    fill(m, 34, 4, 38, 4, TILE.PLATFORM);
    fill(m, 40, 8, 44, 8, TILE.PLATFORM);
    set(m, 39, 8, TILE.SPIKE_UP);
    set(m, 45, 8, TILE.SPIKE_UP);

    fill(m, 35, 12, 38, 12, TILE.PLATFORM);
    fill(m, 41, 15, 45, 15, TILE.PLATFORM);
    set(m, 40, 15, TILE.SPIKE_UP);
    set(m, 46, 15, TILE.SPIKE_UP);

    fill(m, 36, 19, 40, 19, TILE.PLATFORM);
    fill(m, 43, 22, 46, 22, TILE.PLATFORM);

    // ── Section 4: Between fall 3 and fall 4 (cols 51-64) ──
    fill(m, 52, 5, 56, 5, TILE.PLATFORM);
    set(m, 51, 5, TILE.SPIKE_UP);
    set(m, 57, 5, TILE.SPIKE_UP);

    fill(m, 57, 9, 61, 9, TILE.PLATFORM);
    fill(m, 52, 13, 55, 13, TILE.PLATFORM);
    set(m, 56, 13, TILE.SPIKE_UP);

    // Shrink passage
    fill(m, 52, 16, 63, 17, TILE.SOLID);
    // Row 18 is the gap

    fill(m, 55, 20, 58, 20, TILE.PLATFORM);
    fill(m, 60, 22, 63, 22, TILE.PLATFORM);

    // ── Section 5: After fall 4 — final descent (cols 68-89) ──
    fill(m, 69, 6, 73, 6, TILE.PLATFORM);
    fill(m, 75, 10, 79, 10, TILE.PLATFORM);
    set(m, 74, 10, TILE.SPIKE_UP);
    set(m, 80, 10, TILE.SPIKE_UP);

    fill(m, 70, 14, 74, 14, TILE.PLATFORM);
    fill(m, 77, 17, 80, 17, TILE.PLATFORM);

    fill(m, 72, 20, 76, 20, TILE.PLATFORM);

    // ── End platform at bottom-right ──
    fill(m, 82, 22, 89, 24, TILE.SOLID);
    set(m, 81, 22, TILE.SPIKE_UP);

    return m;
}

// ══════════════════════════════════════════════════════════════
// Level 29: "Final Trial"
// W=150, H=22. Epic-length combination of ALL mechanics.
// Ground at row 18, underground 19-21.
// ══════════════════════════════════════════════════════════════

function buildLevel29() {
    const W = 150, H = 22;
    const m = createMap(W, H);

    // Base ground: rows 18-21
    fill(m, 0, 18, W - 1, 21, TILE.SOLID);

    // ── Safe spawn area (cols 0-6) ──

    // ══ PHASE 1: Spike Gauntlet (cols 8-30) ══
    // Spikes every 3 tiles
    for (let x = 8; x <= 28; x += 3) {
        set(m, x, 17, TILE.SPIKE_UP);
    }

    // Ceiling spikes for pressure
    fill(m, 8, 6, 28, 8, TILE.SOLID);
    for (let x = 9; x <= 27; x += 2) {
        set(m, x, 9, TILE.SPIKE_DOWN);
    }

    // Platforms to help navigate over ground spikes
    fill(m, 12, 14, 14, 14, TILE.PLATFORM);
    fill(m, 18, 12, 20, 12, TILE.PLATFORM);
    fill(m, 24, 14, 26, 14, TILE.PLATFORM);

    // ══ PHASE 2: Toxic Crossing (cols 32-55) ══
    fill(m, 32, 18, 54, 19, TILE.AIR);
    fill(m, 32, 20, 54, 20, TILE.TOXIC);

    // Small platforms over toxic with gaps
    fill(m, 33, 16, 35, 16, TILE.PLATFORM);
    set(m, 36, 16, TILE.SPIKE_UP);
    fill(m, 38, 14, 40, 14, TILE.PLATFORM);
    fill(m, 44, 16, 46, 16, TILE.PLATFORM);
    set(m, 43, 16, TILE.SPIKE_UP);
    set(m, 47, 16, TILE.SPIKE_UP);
    fill(m, 50, 14, 52, 14, TILE.PLATFORM);

    // ══ PHASE 3: Shrink Maze (cols 56-75) ══
    // Multiple shrink passages stacked

    // Solid block 1
    fill(m, 56, 8, 68, 13, TILE.SOLID);
    // Shrink passage at row 14 (1-tile gap under block)

    // Solid block 2 (above)
    fill(m, 60, 2, 72, 6, TILE.SOLID);
    // Shrink passage at row 7

    // Platforms to reach passages
    fill(m, 56, 16, 59, 16, TILE.PLATFORM);
    fill(m, 70, 16, 73, 16, TILE.PLATFORM);
    fill(m, 63, 15, 66, 15, TILE.PLATFORM);

    // Spikes inside passages removed to allow sliding

    // Upper platforms
    fill(m, 56, 7, 59, 7, TILE.PLATFORM);
    fill(m, 65, 7, 68, 7, TILE.PLATFORM);

    // ══ PHASE 4: Vertical Section (cols 76-90) ══
    // Must climb up and over a tall wall

    fill(m, 80, 4, 85, 17, TILE.SOLID);

    // Platforms on the left side to climb
    fill(m, 76, 15, 79, 15, TILE.PLATFORM);
    fill(m, 76, 11, 79, 11, TILE.PLATFORM);
    set(m, 75, 11, TILE.SPIKE_UP);
    fill(m, 76, 7, 79, 7, TILE.PLATFORM);

    // Top platform to get over wall
    fill(m, 78, 3, 87, 3, TILE.PLATFORM);
    set(m, 77, 3, TILE.SPIKE_UP);

    // Platforms on right side to descend
    fill(m, 86, 7, 89, 7, TILE.PLATFORM);
    set(m, 90, 7, TILE.SPIKE_UP);
    fill(m, 86, 11, 89, 11, TILE.PLATFORM);
    fill(m, 86, 15, 89, 15, TILE.PLATFORM);

    // ══ PHASE 5: Maximum Gap Sequence (cols 92-120) ══
    fill(m, 92, 18, 118, 19, TILE.AIR);
    fill(m, 92, 20, 118, 20, TILE.TOXIC);

    // 5-tile gaps, 2-tile platforms
    fill(m, 93, 16, 94, 17, TILE.SOLID);
    fill(m, 100, 16, 101, 17, TILE.SOLID);
    set(m, 99, 16, TILE.SPIKE_UP);
    set(m, 102, 16, TILE.SPIKE_UP);
    fill(m, 107, 14, 108, 17, TILE.SOLID);
    set(m, 106, 14, TILE.SPIKE_UP);
    set(m, 109, 14, TILE.SPIKE_UP);
    fill(m, 114, 16, 115, 17, TILE.SOLID);
    set(m, 113, 16, TILE.SPIKE_UP);

    // ══ PHASE 6: Final Sprint (cols 122-145) ══
    // Combination of everything

    // Ground restored with spike patterns
    for (let x = 122; x <= 140; x += 3) {
        set(m, x, 17, TILE.SPIKE_UP);
    }

    // Tiny toxic pools
    fill(m, 128, 18, 130, 19, TILE.AIR);
    fill(m, 128, 20, 130, 20, TILE.TOXIC);

    fill(m, 136, 18, 138, 19, TILE.AIR);
    fill(m, 136, 20, 138, 20, TILE.TOXIC);

    // Overhead spikes
    fill(m, 130, 10, 140, 11, TILE.SOLID);
    for (let x = 131; x <= 139; x += 2) {
        set(m, x, 12, TILE.SPIKE_DOWN);
    }

    // Platforms to navigate
    fill(m, 125, 14, 127, 14, TILE.PLATFORM);
    fill(m, 133, 14, 135, 14, TILE.PLATFORM);
    fill(m, 141, 15, 143, 15, TILE.PLATFORM);

    return m;
}

// ══════════════════════════════════════════════════════════════
// Level 30: "Slime Master"
// W=160, H=24. The ULTIMATE level. Everything at once.
// Ground at row 20, underground 21-23.
// ══════════════════════════════════════════════════════════════

function buildLevel30() {
    const W = 160, H = 24;
    const m = createMap(W, H);

    // Base ground: rows 20-23
    fill(m, 0, 20, W - 1, 23, TILE.SOLID);

    // ── Safe spawn area (cols 0-5) ──

    // ══ ZONE 1: "The Meat Grinder" (cols 7-30) ══
    // Dense alternating spikes on ground and ceiling

    fill(m, 7, 2, 30, 4, TILE.SOLID);
    for (let x = 7; x <= 30; x++) {
        if (x % 3 === 0) {
            set(m, x, 19, TILE.SPIKE_UP);
            set(m, x, 5, TILE.SPIKE_DOWN);
        }
    }

    // Narrow safe platforms between spike rows
    fill(m, 10, 14, 12, 14, TILE.PLATFORM);
    fill(m, 16, 11, 18, 11, TILE.PLATFORM);
    fill(m, 22, 14, 24, 14, TILE.PLATFORM);
    fill(m, 27, 11, 29, 11, TILE.PLATFORM);

    // ══ ZONE 2: "Acid Ocean" (cols 32-55) ══
    // Massive toxic pool with tiny stepping platforms

    fill(m, 32, 20, 54, 21, TILE.AIR);
    fill(m, 32, 22, 54, 22, TILE.TOXIC);

    // 1-2 tile platforms over toxic (brutal precision)
    fill(m, 34, 17, 35, 19, TILE.SOLID);
    set(m, 33, 17, TILE.SPIKE_UP);
    set(m, 36, 17, TILE.SPIKE_UP);

    fill(m, 39, 15, 40, 19, TILE.SOLID);
    set(m, 38, 15, TILE.SPIKE_UP);
    set(m, 41, 15, TILE.SPIKE_UP);

    fill(m, 44, 17, 44, 19, TILE.SOLID);  // Single tile wide!

    fill(m, 48, 14, 49, 19, TILE.SOLID);
    set(m, 47, 14, TILE.SPIKE_UP);
    set(m, 50, 14, TILE.SPIKE_UP);

    fill(m, 53, 17, 54, 19, TILE.SOLID);

    // ══ ZONE 3: "The Squeeze" (cols 57-80) ══
    // Multiple shrink passages with spikes inside

    // Passage 1: horizontal shrink tunnel
    fill(m, 57, 10, 70, 18, TILE.SOLID);
    // Carve 1-tile-high passage at row 19
    fill(m, 57, 19, 70, 19, TILE.AIR);
    // Spikes inside the passage removed to allow sliding
    // Restore floor under passage
    // (row 20 is still solid ground)

    // Exit platforms above the block
    fill(m, 57, 9, 60, 9, TILE.PLATFORM);
    fill(m, 65, 9, 68, 9, TILE.PLATFORM);

    // Passage 2: must go up through platforms
    fill(m, 72, 6, 79, 9, TILE.SOLID);
    // 1-tile gap at row 10
    fill(m, 72, 10, 79, 10, TILE.AIR);
    // Spikes inside passage removed to allow sliding

    // Platforms to reach passage 2
    fill(m, 71, 14, 74, 14, TILE.PLATFORM);
    fill(m, 76, 12, 79, 12, TILE.PLATFORM);
    set(m, 75, 12, TILE.SPIKE_UP);
    set(m, 80, 12, TILE.SPIKE_UP);

    // ══ ZONE 4: "Vertical Mayhem" (cols 82-100) ══
    // Tall climb section, must ascend and descend

    // Giant wall to climb over
    fill(m, 88, 2, 93, 19, TILE.SOLID);

    // Left side: ascending platforms
    fill(m, 82, 17, 85, 17, TILE.PLATFORM);
    set(m, 81, 17, TILE.SPIKE_UP);
    fill(m, 83, 13, 86, 13, TILE.PLATFORM);
    set(m, 82, 13, TILE.SPIKE_UP);
    set(m, 87, 13, TILE.SPIKE_UP);
    fill(m, 83, 9, 86, 9, TILE.PLATFORM);
    fill(m, 84, 5, 87, 5, TILE.PLATFORM);

    // Top: cross over wall
    fill(m, 86, 1, 95, 1, TILE.PLATFORM);
    set(m, 85, 1, TILE.SPIKE_UP);

    // Right side: descending platforms
    fill(m, 94, 5, 97, 5, TILE.PLATFORM);
    set(m, 98, 5, TILE.SPIKE_UP);
    fill(m, 95, 9, 98, 9, TILE.PLATFORM);
    fill(m, 94, 13, 97, 13, TILE.PLATFORM);
    set(m, 93, 13, TILE.SPIKE_UP);
    fill(m, 95, 17, 98, 17, TILE.PLATFORM);

    // ══ ZONE 5: "The Crucible" (cols 102-135) ══
    // EVERYTHING combined: toxic, spikes, gaps, platforms

    // Toxic flooding
    fill(m, 102, 20, 134, 21, TILE.AIR);
    fill(m, 102, 22, 134, 22, TILE.TOXIC);

    // Spike ceiling
    fill(m, 102, 2, 134, 4, TILE.SOLID);
    for (let x = 103; x <= 133; x += 2) {
        set(m, x, 5, TILE.SPIKE_DOWN);
    }

    // Platforms with spikes (5-tile gaps, 2-tile platforms)
    fill(m, 103, 17, 104, 19, TILE.SOLID);
    set(m, 102, 17, TILE.SPIKE_UP);
    set(m, 105, 17, TILE.SPIKE_UP);

    fill(m, 110, 15, 111, 19, TILE.SOLID);
    set(m, 109, 15, TILE.SPIKE_UP);
    set(m, 112, 15, TILE.SPIKE_UP);

    // Mid-air platforms
    fill(m, 115, 12, 117, 12, TILE.PLATFORM);
    set(m, 114, 12, TILE.SPIKE_UP);

    fill(m, 120, 17, 121, 19, TILE.SOLID);
    set(m, 119, 17, TILE.SPIKE_UP);
    set(m, 122, 17, TILE.SPIKE_UP);

    // Shrink passage mid-crucible
    fill(m, 124, 10, 130, 16, TILE.SOLID);
    fill(m, 124, 17, 130, 17, TILE.AIR);  // shrink gap
    set(m, 126, 17, TILE.SPIKE_UP);
    set(m, 129, 17, TILE.SPIKE_UP);

    fill(m, 132, 17, 133, 19, TILE.SOLID);

    // ══ ZONE 6: "The Finale" (cols 137-155) ══
    // Victory run — still dangerous!

    // Ground restored but heavily spiked
    for (let x = 137; x <= 152; x += 3) {
        set(m, x, 19, TILE.SPIKE_UP);
    }

    // Small toxic pits
    fill(m, 142, 20, 144, 21, TILE.AIR);
    fill(m, 142, 22, 144, 22, TILE.TOXIC);

    fill(m, 149, 20, 151, 21, TILE.AIR);
    fill(m, 149, 22, 151, 22, TILE.TOXIC);

    // Platforms to navigate
    fill(m, 140, 16, 142, 16, TILE.PLATFORM);
    fill(m, 146, 14, 148, 14, TILE.PLATFORM);
    fill(m, 152, 16, 154, 16, TILE.PLATFORM);

    // Ceiling spikes on approach to flag
    fill(m, 145, 6, 155, 8, TILE.SOLID);
    for (let x = 146; x <= 154; x += 2) {
        set(m, x, 9, TILE.SPIKE_DOWN);
    }

    return m;
}

// ══════════════════════════════════════════════════════════════
// Level Registry — Exported
// ══════════════════════════════════════════════════════════════

export const finalLevels = [
    // ── Level 24: Hell's Kitchen ──
    {
        id: 24,
        name: "Hell's Kitchen",
        width: 110,
        height: 20,
        spawnP1: { col: 2, row: 16 },
        spawnP2: { col: 4, row: 16 },
        endFlag: { col: 104, row: 14 },
        revivalFlags: [
            { col: 20, row: 12 },
            { col: 53, row: 13 },
            { col: 74, row: 13 },
            { col: 91, row: 10 },
            { col: 98, row: 14 }
        ],
        hints: [
            { col: 3, text: "Welcome to Hell." },
            { col: 55, text: "The floor is literally lava... well, toxic." }
        ],
        map: buildLevel24()
    },

    // ── Level 25: Vertical Nightmare ──
    {
        id: 25,
        name: "Vertical Nightmare",
        width: 70,
        height: 34,
        spawnP1: { col: 6, row: 30 },
        spawnP2: { col: 8, row: 30 },
        endFlag: { col: 58, row: 3 },
        revivalFlags: [
            { col: 22, row: 25 },
            { col: 47, row: 26 },
            { col: 17, row: 19 },
            { col: 37, row: 15 },
            { col: 51, row: 7 }
        ],
        hints: [
            { col: 7, text: "Look up. Way up." },
            { col: 40, text: "Shrink to survive." }
        ],
        map: buildLevel25()
    },

    // ── Level 26: The Impossible Gap ──
    {
        id: 26,
        name: "The Impossible Gap",
        width: 140,
        height: 18,
        spawnP1: { col: 2, row: 14 },
        spawnP2: { col: 4, row: 14 },
        endFlag: { col: 129, row: 14 },
        revivalFlags: [
            { col: 21, row: 14 },
            { col: 43, row: 14 },
            { col: 67, row: 14 },
            { col: 93, row: 14 },
            { col: 126, row: 14 }
        ],
        hints: [
            { col: 3, text: "Run. Then jump. Then pray." },
            { col: 92, text: "Almost there... probably." }
        ],
        map: buildLevel26()
    },

    // ── Level 27: Razor's Edge ──
    {
        id: 27,
        name: "Razor's Edge",
        width: 120,
        height: 20,
        spawnP1: { col: 2, row: 16 },
        spawnP2: { col: 4, row: 16 },
        endFlag: { col: 116, row: 14 },
        revivalFlags: [
            { col: 15, row: 16 },
            { col: 36, row: 16 },
            { col: 64, row: 13 },
            { col: 84, row: 13 },
            { col: 112, row: 14 }
        ],
        hints: [
            { col: 3, text: "One pixel off and you're done." },
            { col: 63, text: "Balance is key. Also luck." }
        ],
        map: buildLevel27()
    },

    // ── Level 28: Toxic Waterfall ──
    {
        id: 28,
        name: "Toxic Waterfall",
        width: 90,
        height: 28,
        spawnP1: { col: 2, row: 3 },
        spawnP2: { col: 4, row: 3 },
        endFlag: { col: 86, row: 22 },
        revivalFlags: [
            { col: 10, row: 15 },
            { col: 26, row: 17 },
            { col: 42, row: 15 },
            { col: 57, row: 9 },
            { col: 77, row: 17 }
        ],
        hints: [
            { col: 3, text: "Down, down, down you go..." },
            { col: 52, text: "Don't touch the green stuff." }
        ],
        map: buildLevel28()
    },

    // ── Level 29: Final Trial ──
    {
        id: 29,
        name: "Final Trial",
        width: 150,
        height: 22,
        spawnP1: { col: 2, row: 18 },
        spawnP2: { col: 4, row: 18 },
        endFlag: { col: 144, row: 18 },
        revivalFlags: [
            { col: 30, row: 18 },
            { col: 55, row: 18 },
            { col: 78, row: 15 },
            { col: 90, row: 18 },
            { col: 120, row: 18 }
        ],
        hints: [
            { col: 3, text: "Everything you've learned. Right now." },
            { col: 100, text: "One more level after this. You can do it." }
        ],
        map: buildLevel29()
    },

    // ── Level 30: Slime Master ──
    {
        id: 30,
        name: "Slime Master",
        width: 160,
        height: 24,
        spawnP1: { col: 2, row: 20 },
        spawnP2: { col: 4, row: 20 },
        endFlag: { col: 155, row: 20 },
        revivalFlags: [
            { col: 29, row: 14 },
            { col: 55, row: 20 },
            { col: 80, row: 12 },
            { col: 100, row: 20 },
            { col: 135, row: 20 }
        ],
        hints: [
            { col: 3, text: "This is it. The final test. Good luck, Slime Master." }
        ],
        map: buildLevel30()
    }
];
