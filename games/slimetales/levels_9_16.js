// ══════════════════════════════════════════════════════════════
// SLIME TALES — Mid-Game Levels (9–16)
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

// ── Level 9: "Vertical Climb" ───────────────────────────────
// Taller map (H=22). Player must ascend using stacked platforms
// to reach a high exit. Ground at row 18, underground rows 19-21.
//
// Layout:
//   Cols  0-10 : Start area (ground level)
//   Cols 11-25 : First vertical climb section (platforms zigzag up)
//   Cols 26-40 : Intermediate platform area with spikes
//   Cols 41-55 : Second climb with toxic pits below
//   Cols 56-69 : Final ascent to elevated end flag

function buildLevel9() {
    const W = 70, H = 22;
    const m = createMap(W, H);

    // ─ Base ground: rows 18-21, full width ─
    fill(m, 0, 18, W - 1, 21, TILE.SOLID);

    // ─ Start area: flat ground cols 0-10 ─
    // (already covered by base ground)

    // ─ First climb (cols 11-25): zigzag platforms ─
    // Carve a tall open shaft above ground
    fill(m, 14, 15, 17, 15, TILE.PLATFORM);  // Step 1: low platform
    fill(m, 19, 12, 22, 12, TILE.PLATFORM);  // Step 2: mid platform
    fill(m, 14, 9, 17, 9, TILE.PLATFORM);    // Step 3: higher
    fill(m, 20, 6, 23, 6, TILE.PLATFORM);    // Step 4: near top

    // Spikes on ground below climb to punish falls
    for (let x = 14; x <= 23; x += 3) {
        set(m, x, 17, TILE.SPIKE_UP);
    }

    // ─ Upper walkway (cols 24-40): solid floor at row 6 ─
    fill(m, 24, 7, 40, 8, TILE.SOLID);

    // Spikes on upper walkway
    set(m, 28, 6, TILE.SPIKE_UP);
    set(m, 31, 6, TILE.SPIKE_UP);
    set(m, 34, 6, TILE.SPIKE_UP);

    // Gap in upper walkway (cols 36-38)
    fill(m, 36, 7, 38, 8, TILE.AIR);
    // Platform to cross gap
    fill(m, 36, 7, 37, 7, TILE.PLATFORM);

    // ─ Descent section (cols 41-55): drop down with platforms ─
    fill(m, 41, 10, 44, 10, TILE.PLATFORM);
    fill(m, 47, 13, 50, 13, TILE.PLATFORM);
    fill(m, 43, 16, 46, 16, TILE.PLATFORM);

    // Toxic pit below descent area
    fill(m, 41, 18, 55, 19, TILE.AIR);
    fill(m, 41, 20, 55, 20, TILE.TOXIC);

    // Small landing platform over toxic
    fill(m, 51, 15, 54, 15, TILE.PLATFORM);

    // ─ Final section (cols 56-69): staircase up to end ─
    fill(m, 56, 18, 69, 21, TILE.SOLID); // restore ground
    fill(m, 57, 15, 60, 15, TILE.PLATFORM);
    fill(m, 61, 12, 64, 12, TILE.PLATFORM);
    fill(m, 64, 9, 67, 9, TILE.PLATFORM);

    // End platform (solid) at top
    fill(m, 64, 5, 69, 6, TILE.SOLID);

    return m;
}

// ── Level 10: "Acid Rain" ───────────────────────────────────
// Ceiling spikes (SPIKE_DOWN) at rows 3-4 combined with ground
// hazards. Player must manage jump height carefully — jump too
// high and hit ceiling spikes, too low and hit ground spikes.
// W=110, H=18. Ground at row 14.

function buildLevel10() {
    const W = 110, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Start area (cols 0-15): safe, no ceiling spikes ─

    // ─ Section 1 (cols 16-35): ceiling spikes with gaps ─
    // Ceiling spike rows
    for (let x = 16; x <= 35; x++) {
        if (x % 3 !== 0) { // leave periodic gaps
            set(m, x, 4, TILE.SPIKE_DOWN);
        }
    }
    // Ground spikes to avoid
    set(m, 20, 13, TILE.SPIKE_UP);
    set(m, 24, 13, TILE.SPIKE_UP);
    set(m, 28, 13, TILE.SPIKE_UP);
    set(m, 32, 13, TILE.SPIKE_UP);

    // Platforms at safe mid-height (can stand without hitting ceiling)
    fill(m, 22, 10, 25, 10, TILE.PLATFORM);
    fill(m, 30, 10, 33, 10, TILE.PLATFORM);

    // ─ Section 2 (cols 36-55): dense ceiling + toxic pits ─
    for (let x = 36; x <= 55; x++) {
        if (x % 2 === 0) {
            set(m, x, 3, TILE.SPIKE_DOWN);
        }
    }
    // Toxic pit (cols 40-44)
    fill(m, 40, 14, 44, 15, TILE.AIR);
    fill(m, 40, 16, 44, 16, TILE.TOXIC);
    // Small platform over toxic
    fill(m, 41, 12, 43, 12, TILE.PLATFORM);

    // Toxic pit (cols 49-52)
    fill(m, 49, 14, 52, 15, TILE.AIR);
    fill(m, 49, 16, 52, 16, TILE.TOXIC);
    fill(m, 50, 12, 51, 12, TILE.PLATFORM);

    // ─ Section 3 (cols 56-80): alternating high/low threats ─
    // Low ceiling section (solid ceiling at row 7, spikes at row 8)
    fill(m, 60, 5, 75, 6, TILE.SOLID);
    for (let x = 60; x <= 75; x += 3) {
        set(m, x, 7, TILE.SPIKE_DOWN);
    }
    // Ground spikes scattered below
    for (let x = 62; x <= 73; x += 3) {
        set(m, x, 13, TILE.SPIKE_UP);
    }
    // Mid-height platforms for navigation
    fill(m, 63, 11, 66, 11, TILE.PLATFORM);
    fill(m, 70, 11, 73, 11, TILE.PLATFORM);

    // ─ Section 4 (cols 81-100): gauntlet with narrow safe zone ─
    // Ceiling spikes very low
    for (let x = 81; x <= 100; x++) {
        set(m, x, 5, TILE.SPIKE_DOWN);
    }
    // Ground spikes with safe gaps
    for (let x = 83; x <= 98; x += 3) {
        set(m, x, 13, TILE.SPIKE_UP);
    }

    // ─ Section 5 (cols 101-109): safe end area ─
    // No ceiling spikes, just flat ground

    return m;
}

// ── Level 11: "Bridge Out" ──────────────────────────────────
// Very long level (W=120). Many gaps with only small platforms
// to land on. Tests precise jumping skills.

function buildLevel11() {
    const W = 120, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Start area (cols 0-8): solid ground ─

    // ─ Gap 1 (cols 9-14): 5-tile gap with mid platform ─
    fill(m, 9, 14, 14, 17, TILE.AIR);
    fill(m, 11, 13, 12, 13, TILE.PLATFORM);

    // ─ Solid landing (cols 15-19) ─

    // ─ Gap 2 (cols 20-27): long gap, two stepping platforms ─
    fill(m, 20, 14, 27, 17, TILE.AIR);
    fill(m, 22, 13, 23, 13, TILE.PLATFORM);
    fill(m, 26, 12, 27, 12, TILE.PLATFORM);

    // ─ Small island (cols 28-30) ─

    // ─ Gap 3 (cols 31-39): long gap with toxic, platforms ─
    fill(m, 31, 14, 39, 15, TILE.AIR);
    fill(m, 31, 16, 39, 16, TILE.TOXIC);
    fill(m, 33, 12, 34, 12, TILE.PLATFORM);
    fill(m, 37, 11, 38, 11, TILE.PLATFORM);

    // ─ Landing (cols 40-44) ─
    // Spikes on landing to be careful
    set(m, 42, 13, TILE.SPIKE_UP);

    // ─ Gap 4 (cols 45-53): very long, 3 tiny platforms ─
    fill(m, 45, 14, 53, 15, TILE.AIR);
    fill(m, 45, 16, 53, 16, TILE.TOXIC);
    fill(m, 47, 12, 47, 12, TILE.PLATFORM); // 1-tile platform!
    fill(m, 50, 11, 50, 11, TILE.PLATFORM);
    fill(m, 53, 12, 53, 12, TILE.PLATFORM);

    // ─ Landing (cols 54-58) ─

    // ─ Gap 5 (cols 59-64): gap with spike on platform ─
    fill(m, 59, 14, 64, 17, TILE.AIR);
    fill(m, 61, 13, 62, 13, TILE.PLATFORM);
    set(m, 62, 12, TILE.SPIKE_UP); // spike right next to platform

    // ─ Landing (cols 65-69) ─

    // ─ Gap 6 (cols 70-80): massive gap, staircase platforms ─
    fill(m, 70, 14, 80, 15, TILE.AIR);
    fill(m, 70, 16, 80, 16, TILE.TOXIC);
    fill(m, 72, 13, 73, 13, TILE.PLATFORM);
    fill(m, 75, 12, 76, 12, TILE.PLATFORM);
    fill(m, 78, 11, 79, 11, TILE.PLATFORM);

    // ─ Landing (cols 81-85) ─

    // ─ Gap 7 (cols 86-94): wide toxic with high platforms ─
    fill(m, 86, 14, 94, 15, TILE.AIR);
    fill(m, 86, 16, 94, 16, TILE.TOXIC);
    fill(m, 88, 10, 89, 10, TILE.PLATFORM);
    fill(m, 92, 10, 93, 10, TILE.PLATFORM);

    // ─ Landing (cols 95-99) ─
    set(m, 97, 13, TILE.SPIKE_UP);

    // ─ Gap 8 (cols 100-108): final challenge ─
    fill(m, 100, 14, 108, 15, TILE.AIR);
    fill(m, 100, 16, 108, 16, TILE.TOXIC);
    fill(m, 102, 12, 103, 12, TILE.PLATFORM);
    fill(m, 105, 11, 105, 11, TILE.PLATFORM); // single-tile!
    fill(m, 108, 12, 108, 12, TILE.PLATFORM);

    // ─ End area (cols 109-119): solid ground ─

    return m;
}

// ── Level 12: "Underground" ─────────────────────────────────
// Tall map (H=22). A solid ceiling at row 8 creates a lower
// cave section. Player navigates through the cave below,
// then climbs back up near the end.
// Ground at row 18, underground rows 19-21.

function buildLevel12() {
    const W = 90, H = 22;
    const m = createMap(W, H);

    // ─ Surface ground (rows 18-21) ─
    fill(m, 0, 18, W - 1, 21, TILE.SOLID);

    // ─ Surface area (cols 0-12): start on surface ─

    // ─ Cave ceiling (rows 7-8, cols 13-72) ─
    fill(m, 13, 7, 72, 8, TILE.SOLID);

    // ─ Entrance shaft (cols 13-16): hole down into cave ─
    fill(m, 13, 9, 16, 17, TILE.AIR); // open shaft
    // Platforms to descend safely
    fill(m, 13, 12, 15, 12, TILE.PLATFORM);
    fill(m, 14, 15, 16, 15, TILE.PLATFORM);

    // ─ Cave floor: rows 18-21 remain solid ─
    // Cave plays at rows 9-17, ground at row 18

    // ─ Cave section 1 (cols 17-30): basic cave with spikes ─
    set(m, 20, 17, TILE.SPIKE_UP);
    set(m, 23, 17, TILE.SPIKE_UP);
    set(m, 26, 17, TILE.SPIKE_UP);
    // Ceiling stalactite spikes
    set(m, 21, 9, TILE.SPIKE_DOWN);
    set(m, 25, 9, TILE.SPIKE_DOWN);
    set(m, 29, 9, TILE.SPIKE_DOWN);

    // ─ Cave section 2 (cols 31-45): toxic pools ─
    fill(m, 33, 18, 38, 19, TILE.AIR);
    fill(m, 33, 20, 38, 20, TILE.TOXIC);
    // Platform over toxic
    fill(m, 34, 16, 37, 16, TILE.PLATFORM);

    // Narrow passage (shrink section)
    fill(m, 40, 9, 45, 16, TILE.SOLID); // wall block
    fill(m, 40, 17, 45, 17, TILE.AIR);  // 1-tile passage at row 17
    fill(m, 40, 17, 45, 17, TILE.AIR);

    // ─ Cave section 3 (cols 46-60): platforming in cave ─
    // Toxic floor section
    fill(m, 46, 18, 55, 19, TILE.AIR);
    fill(m, 46, 20, 55, 20, TILE.TOXIC);
    // Platforms over toxic
    fill(m, 47, 15, 49, 15, TILE.PLATFORM);
    fill(m, 52, 14, 54, 14, TILE.PLATFORM);
    fill(m, 48, 11, 50, 11, TILE.PLATFORM);

    // Spikes on cave ceiling
    for (let x = 48; x <= 54; x += 3) {
        set(m, x, 9, TILE.SPIKE_DOWN);
    }

    // ─ Cave section 4 (cols 61-72): exit climb ─
    // Restore ground
    fill(m, 56, 18, 89, 21, TILE.SOLID);

    // Platforms to climb back up through ceiling
    fill(m, 62, 15, 64, 15, TILE.PLATFORM);
    fill(m, 66, 12, 68, 12, TILE.PLATFORM);
    // Opening in cave ceiling for exit
    fill(m, 69, 7, 72, 8, TILE.AIR);
    fill(m, 69, 10, 71, 10, TILE.PLATFORM);

    // Spikes guarding the exit
    set(m, 68, 9, TILE.SPIKE_DOWN);
    set(m, 73, 9, TILE.SPIKE_DOWN);

    // ─ Surface end area (cols 73-89) ─
    // Player emerges from cave to surface for end flag
    // Some surface spikes for final challenge
    set(m, 78, 17, TILE.SPIKE_UP);
    set(m, 81, 17, TILE.SPIKE_UP);

    return m;
}

// ── Level 13: "Needle Point" ────────────────────────────────
// Spike mazes — narrow paths between spikes on both top and
// bottom. Player must navigate precisely without touching
// any spikes. W=100, H=18. Ground at row 14.

function buildLevel13() {
    const W = 100, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Start area (cols 0-10): safe ─

    // ─ Maze 1 (cols 11-30): floor spikes with narrow paths ─
    // Lines of spikes with gaps to walk through
    for (let x = 11; x <= 30; x++) {
        set(m, x, 13, TILE.SPIKE_UP); // ground spikes everywhere
    }
    // Clear paths (remove some spikes for safe walking)
    set(m, 14, 13, TILE.AIR); // gap
    set(m, 15, 13, TILE.AIR);
    set(m, 19, 13, TILE.AIR);
    set(m, 20, 13, TILE.AIR);
    set(m, 24, 13, TILE.AIR);
    set(m, 25, 13, TILE.AIR);
    set(m, 29, 13, TILE.AIR);
    set(m, 30, 13, TILE.AIR);

    // Platforms above with spikes below them (jump onto platform, not ground)
    fill(m, 14, 11, 15, 11, TILE.PLATFORM);
    fill(m, 19, 11, 20, 11, TILE.PLATFORM);
    fill(m, 24, 11, 25, 11, TILE.PLATFORM);
    fill(m, 29, 11, 30, 11, TILE.PLATFORM);

    // ─ Maze 2 (cols 31-50): spike corridor — spikes above AND below ─
    // Ground spikes
    for (let x = 33; x <= 48; x += 3) {
        set(m, x, 13, TILE.SPIKE_UP);
    }
    // Ceiling spikes (from solid ceiling)
    fill(m, 31, 5, 50, 6, TILE.SOLID);
    for (let x = 33; x <= 48; x += 3) {
        set(m, x, 7, TILE.SPIKE_DOWN);
    }
    // Safe mid-height platform corridor
    fill(m, 33, 10, 36, 10, TILE.PLATFORM);
    fill(m, 39, 10, 42, 10, TILE.PLATFORM);
    fill(m, 45, 10, 48, 10, TILE.PLATFORM);

    // ─ Safe zone (cols 51-55) ─

    // ─ Maze 3 (cols 56-75): dense spike field ─
    // Alternating spike rows creating a zigzag path
    for (let x = 56; x <= 75; x++) {
        if (x % 4 < 2) {
            set(m, x, 13, TILE.SPIKE_UP); // bottom spikes on even pairs
        }
    }
    // Ceiling block with spikes on alternating pattern
    fill(m, 56, 4, 75, 5, TILE.SOLID);
    for (let x = 56; x <= 75; x++) {
        if (x % 4 >= 2) {
            set(m, x, 6, TILE.SPIKE_DOWN); // top spikes on odd pairs
        }
    }
    // Platforms for zigzag navigation
    fill(m, 58, 10, 59, 10, TILE.PLATFORM);
    fill(m, 62, 8, 63, 8, TILE.PLATFORM);
    fill(m, 66, 10, 67, 10, TILE.PLATFORM);
    fill(m, 70, 8, 71, 8, TILE.PLATFORM);
    fill(m, 74, 10, 75, 10, TILE.PLATFORM);

    // ─ Maze 4 (cols 76-92): final gauntlet — walls of spikes ─
    // Narrow ground path with spike walls on both sides
    // Left wall of spikes
    for (let y = 9; y <= 13; y++) {
        set(m, 78, y, TILE.SPIKE_UP);
        set(m, 83, y, TILE.SPIKE_UP);
        set(m, 88, y, TILE.SPIKE_UP);
    }
    // Platforms between spike columns
    fill(m, 79, 12, 82, 12, TILE.PLATFORM);
    fill(m, 84, 10, 87, 10, TILE.PLATFORM);
    fill(m, 89, 12, 92, 12, TILE.PLATFORM);

    // ─ End area (cols 93-99): safe ─

    return m;
}

// ── Level 14: "Toxic Falls" ─────────────────────────────────
// Tall vertical level (H=24). Player descends through platforms
// with toxic pools at various levels. Ground at row 20,
// underground rows 21-23.

function buildLevel14() {
    const W = 80, H = 24;
    const m = createMap(W, H);

    // ─ Base ground (rows 20-23) ─
    fill(m, 0, 20, W - 1, 23, TILE.SOLID);

    // ─ Start area (cols 0-10): elevated starting platform ─
    fill(m, 0, 4, 12, 5, TILE.SOLID);

    // ─ Descent section 1 (cols 5-25): platforms going down ─
    fill(m, 8, 8, 12, 8, TILE.PLATFORM);
    fill(m, 3, 11, 7, 11, TILE.PLATFORM);
    fill(m, 9, 14, 13, 14, TILE.PLATFORM);

    // Toxic pool at mid level
    fill(m, 2, 17, 8, 17, TILE.SOLID);   // shelf
    fill(m, 2, 18, 8, 19, TILE.AIR);
    fill(m, 2, 18, 8, 18, TILE.TOXIC);

    // ─ Main area (cols 14-35): multi-tier with toxic ─
    fill(m, 16, 7, 20, 7, TILE.PLATFORM);
    fill(m, 22, 10, 26, 10, TILE.PLATFORM);
    fill(m, 18, 13, 22, 13, TILE.PLATFORM);
    fill(m, 25, 16, 29, 16, TILE.PLATFORM);

    // Toxic pool under platforms
    fill(m, 14, 20, 25, 21, TILE.AIR);
    fill(m, 14, 22, 25, 22, TILE.TOXIC);

    // Spikes to make platform landing harder
    set(m, 20, 6, TILE.SPIKE_UP);
    set(m, 26, 9, TILE.SPIKE_UP);
    set(m, 22, 12, TILE.SPIKE_UP);

    // ─ Middle section (cols 30-50): crossing with toxic below ─
    fill(m, 32, 12, 36, 12, TILE.PLATFORM);
    fill(m, 38, 14, 42, 14, TILE.PLATFORM);
    fill(m, 44, 11, 48, 11, TILE.PLATFORM);
    fill(m, 35, 17, 39, 17, TILE.PLATFORM);
    fill(m, 42, 17, 46, 17, TILE.PLATFORM);

    // Large toxic pool
    fill(m, 30, 20, 50, 21, TILE.AIR);
    fill(m, 30, 22, 50, 22, TILE.TOXIC);

    // Spike hazards on platforms
    set(m, 36, 11, TILE.SPIKE_UP);
    set(m, 42, 13, TILE.SPIKE_UP);

    // ─ Ascent section (cols 51-65): climb back up ─
    fill(m, 52, 17, 55, 17, TILE.PLATFORM);
    fill(m, 56, 14, 59, 14, TILE.PLATFORM);
    fill(m, 52, 11, 55, 11, TILE.PLATFORM);
    fill(m, 58, 8, 61, 8, TILE.PLATFORM);

    // Toxic below
    fill(m, 51, 20, 62, 21, TILE.AIR);
    fill(m, 51, 22, 62, 22, TILE.TOXIC);

    // ─ End area (cols 66-79): ground level exit ─
    fill(m, 63, 20, 79, 23, TILE.SOLID); // restore ground
    // Some spikes on approach
    set(m, 68, 19, TILE.SPIKE_UP);
    set(m, 72, 19, TILE.SPIKE_UP);

    // Final platform to help reach ground
    fill(m, 63, 11, 66, 11, TILE.PLATFORM);
    fill(m, 66, 16, 69, 16, TILE.PLATFORM);

    return m;
}

// ── Level 15: "The Gauntlet" ────────────────────────────────
// Long combination level (W=130) mixing ALL hazard types.
// Ground at row 14, underground rows 15-17.

function buildLevel15() {
    const W = 130, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Zone A (cols 0-10): safe start ─

    // ─ Zone B (cols 11-30): spike alley ─
    // Alternating ground spikes with small safe zones
    for (let x = 12; x <= 28; x += 3) {
        set(m, x, 13, TILE.SPIKE_UP);
    }
    // Ceiling section with downward spikes
    fill(m, 16, 5, 26, 6, TILE.SOLID);
    for (let x = 17; x <= 25; x += 3) {
        set(m, x, 7, TILE.SPIKE_DOWN);
    }
    // Mid platform for safe traverse
    fill(m, 15, 10, 18, 10, TILE.PLATFORM);
    fill(m, 23, 10, 26, 10, TILE.PLATFORM);

    // ─ Zone C (cols 31-50): toxic river crossing ─
    fill(m, 33, 14, 48, 15, TILE.AIR);
    fill(m, 33, 16, 48, 16, TILE.TOXIC);
    // Stepping platforms
    fill(m, 34, 12, 36, 12, TILE.PLATFORM);
    fill(m, 39, 11, 41, 11, TILE.PLATFORM);
    fill(m, 44, 12, 46, 12, TILE.PLATFORM);
    // Ceiling spikes over toxic
    fill(m, 33, 4, 48, 5, TILE.SOLID);
    set(m, 37, 6, TILE.SPIKE_DOWN);
    set(m, 42, 6, TILE.SPIKE_DOWN);

    // ─ Zone D (cols 51-65): shrink maze ─
    // Wall requiring shrink
    fill(m, 54, 3, 58, 12, TILE.SOLID);
    // 1-tile passage at row 13
    // Spike after the passage
    set(m, 60, 13, TILE.SPIKE_UP);

    // Second shrink wall
    fill(m, 63, 3, 67, 12, TILE.SOLID);
    // Passage at row 13

    // ─ Zone E (cols 68-85): gap gauntlet ─
    // Gap 1
    fill(m, 70, 14, 74, 15, TILE.AIR);
    fill(m, 70, 16, 74, 16, TILE.TOXIC);
    fill(m, 71, 12, 72, 12, TILE.PLATFORM);

    // Gap 2
    fill(m, 78, 14, 83, 15, TILE.AIR);
    fill(m, 78, 16, 83, 16, TILE.TOXIC);
    fill(m, 80, 11, 81, 11, TILE.PLATFORM);

    // Ceiling spikes over gaps
    fill(m, 70, 4, 83, 5, TILE.SOLID);
    for (let x = 72; x <= 82; x += 3) {
        set(m, x, 6, TILE.SPIKE_DOWN);
    }

    // ─ Zone F (cols 86-105): vertical platforming ─
    // Raised platforms with spikes below
    fill(m, 88, 13, 91, 13, TILE.SPIKE_UP);
    fill(m, 94, 13, 97, 13, TILE.SPIKE_UP);
    fill(m, 100, 13, 103, 13, TILE.SPIKE_UP);
    // Platforms above spikes
    fill(m, 87, 10, 90, 10, TILE.PLATFORM);
    fill(m, 93, 8, 96, 8, TILE.PLATFORM);
    fill(m, 99, 10, 102, 10, TILE.PLATFORM);

    // ─ Zone G (cols 106-120): toxic gauntlet ─
    fill(m, 108, 14, 118, 15, TILE.AIR);
    fill(m, 108, 16, 118, 16, TILE.TOXIC);
    fill(m, 109, 12, 110, 12, TILE.PLATFORM);
    fill(m, 113, 11, 114, 11, TILE.PLATFORM);
    fill(m, 117, 12, 118, 12, TILE.PLATFORM);
    // Spikes on some platforms
    set(m, 110, 11, TILE.SPIKE_UP);
    set(m, 114, 10, TILE.SPIKE_UP);

    // ─ Zone H (cols 121-129): safe end ─

    return m;
}

// ── Level 16: "Cramped Quarters" ────────────────────────────
// Many tight shrink passages with spikes and toxic in between.
// Tests mastery of the shrink mechanic. W=90, H=18.
// Ground at row 14.

function buildLevel16() {
    const W = 90, H = 18;
    const m = createMap(W, H);

    // ─ Base ground ─
    fill(m, 0, 14, W - 1, 17, TILE.SOLID);

    // ─ Start area (cols 0-8) ─

    // ─ Passage 1 (cols 9-14): basic shrink intro ─
    fill(m, 9, 3, 14, 12, TILE.SOLID);  // wall
    // 1-tile passage at row 13

    // ─ Spike field after passage (cols 15-20) ─
    set(m, 17, 13, TILE.SPIKE_UP);

    // ─ Passage 2 (cols 21-27): shrink with spike on exit ─
    fill(m, 21, 3, 27, 12, TILE.SOLID);
    // Passage at row 13
    // Spike right at exit
    set(m, 28, 13, TILE.SPIKE_UP);

    // ─ Platform section (cols 28-35): recover area ─
    fill(m, 30, 11, 33, 11, TILE.PLATFORM);

    // ─ Passage 3 (cols 36-42): shrink over toxic ─
    fill(m, 36, 3, 42, 12, TILE.SOLID);  // wall
    // Passage at row 13
    // Toxic pit right after passage
    fill(m, 43, 14, 47, 15, TILE.AIR);
    fill(m, 43, 16, 47, 16, TILE.TOXIC);
    // Must jump immediately after unshrinking
    fill(m, 45, 12, 47, 12, TILE.PLATFORM);

    // ─ Passage 4 (cols 48-55): double wall ─
    fill(m, 48, 3, 52, 12, TILE.SOLID);  // first wall
    // Small gap (cols 53-54) with spike
    set(m, 53, 13, TILE.SPIKE_UP);
    fill(m, 55, 3, 59, 12, TILE.SOLID);  // second wall
    // Both have passages at row 13

    // ─ Section with elevated shrink (cols 60-70) ─
    // Platform at row 8 with shrink passage above
    fill(m, 60, 8, 70, 8, TILE.SOLID);   // platform floor
    fill(m, 60, 3, 64, 7, TILE.SOLID);   // wall on platform
    // Passage at row 8 level (tiles at row 7 are clear, row 8 is solid)
    // Actually: wall goes rows 3-7, floor at row 8, passage is on ground level
    // Player walks on row 8 surface, passage at row 7
    // Let's fix: wall rows 3-6, clear row 7 for passage, floor at row 8
    fill(m, 60, 3, 64, 6, TILE.SOLID);  // upper wall (overwrite previous)
    // Row 7 is passage (AIR)

    // Spikes below elevated section
    for (let x = 61; x <= 69; x += 3) {
        set(m, x, 13, TILE.SPIKE_UP);
    }

    // ─ Passage 5 (cols 71-77): shrink with spikes above AND below ─
    fill(m, 71, 3, 77, 12, TILE.SOLID);
    // Passage at row 13
    // Spikes in front
    set(m, 70, 13, TILE.SPIKE_UP);
    // Toxic after
    fill(m, 78, 14, 80, 15, TILE.AIR);
    fill(m, 78, 16, 80, 16, TILE.TOXIC);

    // ─ End area (cols 81-89): safe landing ─
    // Platform to help cross toxic
    fill(m, 79, 12, 81, 12, TILE.PLATFORM);

    return m;
}

// ── Level Registry ──────────────────────────────────────────

export const midLevels = [
    {
        id: 9,
        name: "Vertical Climb",
        width: 70,
        height: 22,
        spawnP1: { col: 3, row: 18 },
        spawnP2: { col: 5, row: 18 },
        endFlag: { col: 67, row: 5 },
        revivalFlags: [
            { col: 25, row: 6 },
            { col: 48, row: 13 },
            { col: 60, row: 18 }
        ],
        hints: [
            { col: 3,  text: "Look up! Climb the platforms." },
            { col: 42, text: "Watch your landing!" }
        ],
        map: buildLevel9()
    },
    {
        id: 10,
        name: "Acid Rain",
        width: 110,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 105, row: 14 },
        revivalFlags: [
            { col: 18, row: 14 },
            { col: 38, row: 14 },
            { col: 58, row: 14 },
            { col: 82, row: 14 }
        ],
        hints: [
            { col: 14, text: "Don't jump too high!" },
            { col: 60, text: "Low ceiling ahead..." }
        ],
        map: buildLevel10()
    },
    {
        id: 11,
        name: "Bridge Out",
        width: 120,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 115, row: 14 },
        revivalFlags: [
            { col: 28, row: 14 },
            { col: 55, row: 14 },
            { col: 82, row: 14 },
            { col: 96, row: 14 }
        ],
        hints: [
            { col: 8,  text: "Mind the gaps!" },
            { col: 70, text: "Precision jumps required." }
        ],
        map: buildLevel11()
    },
    {
        id: 12,
        name: "Underground",
        width: 90,
        height: 22,
        spawnP1: { col: 3, row: 18 },
        spawnP2: { col: 5, row: 18 },
        endFlag: { col: 85, row: 18 },
        revivalFlags: [
            { col: 15, row: 18 },
            { col: 40, row: 18 },
            { col: 60, row: 18 }
        ],
        hints: [
            { col: 11, text: "Head underground!" },
            { col: 62, text: "Find the way back up." }
        ],
        map: buildLevel12()
    },
    {
        id: 13,
        name: "Needle Point",
        width: 100,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 96, row: 14 },
        revivalFlags: [
            { col: 31, row: 14 },
            { col: 53, row: 14 },
            { col: 76, row: 14 }
        ],
        hints: [
            { col: 9,  text: "Watch your step..." },
            { col: 56, text: "Spikes above AND below!" }
        ],
        map: buildLevel13()
    },
    {
        id: 14,
        name: "Toxic Falls",
        width: 80,
        height: 24,
        spawnP1: { col: 3, row: 4 },
        spawnP2: { col: 5, row: 4 },
        endFlag: { col: 76, row: 20 },
        revivalFlags: [
            { col: 20, row: 13 },
            { col: 44, row: 11 },
            { col: 56, row: 14 },
            { col: 66, row: 20 }
        ],
        hints: [
            { col: 3,  text: "Descend carefully!" },
            { col: 52, text: "Climb back up." }
        ],
        map: buildLevel14()
    },
    {
        id: 15,
        name: "The Gauntlet",
        width: 130,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 126, row: 14 },
        revivalFlags: [
            { col: 30, row: 14 },
            { col: 52, row: 14 },
            { col: 85, row: 14 },
            { col: 106, row: 14 }
        ],
        hints: [
            { col: 10, text: "Everything at once!" },
            { col: 68, text: "Almost there..." }
        ],
        map: buildLevel15()
    },
    {
        id: 16,
        name: "Cramped Quarters",
        width: 90,
        height: 18,
        spawnP1: { col: 3, row: 14 },
        spawnP2: { col: 5, row: 14 },
        endFlag: { col: 86, row: 14 },
        revivalFlags: [
            { col: 15, row: 14 },
            { col: 35, row: 14 },
            { col: 60, row: 14 },
            { col: 82, row: 14 }
        ],
        hints: [
            { col: 7,  text: "Hold ↓ to squeeze through!" },
            { col: 48, text: "Double walls ahead." }
        ],
        map: buildLevel16()
    }
];
