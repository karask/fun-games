// ============================================================
// THE SHATTERED CROWN — Game Engine
// SCUMM-style verb-based text adventure engine
// ============================================================

import {
    rooms, items, npcs, useCombinations,
    INTRO_TEXT, DARK_ENDING, TRUE_ENDING, DOMINATION_ENDING,
    CROWN_ASSEMBLED_TEXT,
    SHARD_IDS, TOTAL_SHARDS,
} from './data.js';

import { 
    isHighScore, saveHighScore, generateLeaderboardHTML 
} from '../../assets/highscore.js';

// ── Game State ────────────────────────────────────────────────

const state = {
    currentRoom: null,
    inventory: [],
    flags: {},
    visitedRooms: new Set(),
    shardCount: 0,
    gameStarted: false,
    gameEnded: false,
    introIndex: 0,
};

// ── Command Builder State ─────────────────────────────────────

const cmdBuilder = {
    verb: null,
    target1: null,
    awaitingTarget: false,
    awaitingTarget2: false,
    verbType: null, // 'immediate', 'single', 'double'
};

// Verb definitions
const VERB_TYPES = {
    north:   { type: 'immediate', label: 'North',   icon: '⬆' },
    south:   { type: 'immediate', label: 'South',   icon: '⬇' },
    east:    { type: 'immediate', label: 'East',    icon: '➡' },
    west:    { type: 'immediate', label: 'West',    icon: '⬅' },
    up:      { type: 'immediate', label: 'Up',      icon: '↗' },
    down:    { type: 'immediate', label: 'Down',    icon: '↙' },
    pickup:  { type: 'single',   label: 'Pick Up',  icon: '✋' },
    examine: { type: 'single',   label: 'Examine',  icon: '🔍' },
    read:    { type: 'single',   label: 'Read',     icon: '📖' },
    search:  { type: 'single',   label: 'Search',   icon: '🔎' },
    talk:    { type: 'single',   label: 'Talk to',  icon: '💬' },
    use:     { type: 'double',   label: 'Use',      icon: '⚡' },
};

// ── DOM References ────────────────────────────────────────────

let narrativeEl, locationTitleEl, commandLineEl, verbGridEl;
let inventoryEl, shardCountEl, targetPanelEl, shardGemsEl;

function cacheDom() {
    narrativeEl = document.getElementById('narrative');
    locationTitleEl = document.getElementById('location-title');
    commandLineEl = document.getElementById('command-line');
    verbGridEl = document.getElementById('verb-grid');
    inventoryEl = document.getElementById('inventory-items');
    shardCountEl = document.getElementById('shard-count');
    targetPanelEl = document.getElementById('target-panel');
    shardGemsEl = document.getElementById('shard-gems');
}

// ── Initialization ────────────────────────────────────────────

export function initGame() {
    cacheDom();
    buildVerbButtons();
    showIntro();
}

function showIntro() {
    const introScreen = document.getElementById('intro-screen');
    const introTextEl = document.getElementById('intro-text');
    const startBtn = document.getElementById('start-btn');
    const gameUI = document.getElementById('game-ui');

    introScreen.style.display = 'flex';
    gameUI.style.display = 'none';

    // Clear and typewrite intro
    introTextEl.innerHTML = '';
    typewriteLines(introTextEl, INTRO_TEXT, 0, () => {
        startBtn.style.display = 'inline-block';
        startBtn.classList.add('pulse-glow');
    });

    startBtn.addEventListener('click', () => {
        introScreen.style.display = 'none';
        gameUI.style.display = 'flex';
        startGame();
    }, { once: true });
}

function startGame() {
    state.gameStarted = true;
    state.currentRoom = 'elders_hut';
    state.inventory = ['shard_1']; // Aldric gives you shard 1
    state.shardCount = 1;
    state.flags = { intro_done: true };
    state.visitedRooms = new Set();

    updateShardDisplay();
    renderInventory();
    enterRoom('elders_hut');
}

// ── Room Navigation ───────────────────────────────────────────

function enterRoom(roomId) {
    const room = rooms[roomId];
    if (!room) {
        addNarrative("You can't go that way.");
        return;
    }

    state.currentRoom = roomId;
    const firstVisit = !state.visitedRooms.has(roomId);
    state.visitedRooms.add(roomId);

    // Update location title
    locationTitleEl.textContent = room.title;

    // Clear narrative for new room
    clearNarrative();

    // Determine which description to use based on flags
    let desc = getRoomDescription(room);
    addNarrative(desc, 'room-desc');

    // If first visit and room has special first-visit content
    if (firstVisit && room.firstVisitText) {
        addNarrative(room.firstVisitText, 'special');
    }

    // Auto-talk for key NPCs on first visit
    if (firstVisit && roomId === 'great_hall') {
        const npc = npcs.aldric_reveal;
        addNarrative('\n' + npc.talkDefault, 'npc-dialogue');
    }

    clearCommandBuilder();
}

function getRoomDescription(room) {
    const id = room.id;
    const has = (itemId) => roomHasItem(room, itemId);

    // ── King's Road ──
    if (id === 'kings_road') {
        if (state.flags.all_shards) {
            return state.flags.knight_healed
                ? (room.descriptionAllShardsKnightHealed || room.description)
                : (room.descriptionAllShards || room.description);
        }
        if (state.flags.knight_healed) return room.descriptionKnightHealed || room.description;
        return room.description;
    }

    // ── Ancient Shrine (shard_2 + ancient_key) ──
    if (id === 'ancient_shrine') {
        if (!has('shard_2') && !has('ancient_key')) return room.descriptionNoItems || room.description;
        if (!has('shard_2')) return room.descriptionNoShard || room.description;
        if (!has('ancient_key')) return room.descriptionNoKey || room.description;
        return room.description;
    }

    // ── Crossroads Inn (rope + wanted_poster) ──
    if (id === 'crossroads_inn') {
        if (!has('rope') && !has('wanted_poster')) return room.descriptionNoItems || room.description;
        if (!has('rope')) return room.descriptionNoRope || room.description;
        if (!has('wanted_poster')) return room.descriptionNoPoster || room.description;
        return room.description;
    }

    // ── Witch's Cabin (compass + shield) ──
    if (id === 'witchs_cabin') {
        if (!has('compass') && !has('shield')) return room.descriptionNoItems || room.description;
        if (!has('compass')) return room.descriptionNoCompass || room.description;
        if (!has('shield')) return room.descriptionNoShield || room.description;
        return room.description;
    }

    // ── Sunken Temple ──
    if (id === 'sunken_temple') {
        if (state.flags.chasm_crossed) {
            if (!has('shard_5') && !has('journal')) return room.descriptionCrossed || room.description;
            return room.descriptionCrossedWithItems || room.description;
        }
        return room.description;
    }

    // ── Whispering Woods ──
    if (id === 'whispering_woods' && !has('healing_herb')) {
        return room.descriptionNoHerb || room.description;
    }

    // ── Dwarven Gate ──
    if (id === 'dwarven_gate' && state.flags.gate_opened) {
        return room.descriptionOpen || room.description;
    }

    // ── Abandoned Mine ──
    if (id === 'abandoned_mine') {
        if (state.flags.rubble_cleared) return room.descriptionCleared || room.description;
        if (!has('pickaxe')) return room.descriptionNoPickaxe || room.description;
    }

    // ── Crystal Cavern ──
    if (id === 'crystal_cavern' && !has('shard_3')) {
        return room.descriptionNoShard || room.description;
    }

    // ── Dragon's Pass ──
    if (id === 'dragons_pass' && state.flags.heat_survived) {
        return room.descriptionPassable || room.description;
    }

    // ── Dragon's Lair ──
    if (id === 'dragons_lair' && !has('shard_4')) {
        return room.descriptionShardTaken || room.description;
    }

    // ── Marsh Path ──
    if (id === 'marsh_path' && state.flags.marsh_lit) {
        return room.descriptionLit || room.description;
    }

    // ── Throne Room ──
    if (id === 'throne_room') {
        if (state.flags.crown_assembled) return room.descriptionAssembled || room.description;
        if (!has('sword')) return room.descriptionNoSword || room.description;
    }

    return room.description;
}

function roomHasItem(room, itemId) {
    return room.items.includes(itemId);
}

// ── Verb Button Construction ──────────────────────────────────

function buildVerbButtons() {
    verbGridEl.innerHTML = '';

    // Main container: compass on left, actions on right
    const container = document.createElement('div');
    container.className = 'verb-container';

    // -- Compass grid (N/S/E/W + Up/Down) --
    const compassArea = document.createElement('div');
    compassArea.className = 'compass-area';

    const compassGrid = document.createElement('div');
    compassGrid.className = 'compass-grid';

    // Row 1: _  N  _
    compassGrid.appendChild(createEmptyCell());
    compassGrid.appendChild(createVerbBtn('north'));
    compassGrid.appendChild(createEmptyCell());
    // Row 2: W  _  E
    compassGrid.appendChild(createVerbBtn('west'));
    compassGrid.appendChild(createEmptyCell());
    compassGrid.appendChild(createVerbBtn('east'));
    // Row 3: _  S  _
    compassGrid.appendChild(createEmptyCell());
    compassGrid.appendChild(createVerbBtn('south'));
    compassGrid.appendChild(createEmptyCell());

    compassArea.appendChild(compassGrid);

    // Up/Down stack next to compass
    const udStack = document.createElement('div');
    udStack.className = 'ud-stack';
    udStack.appendChild(createVerbBtn('up'));
    udStack.appendChild(createVerbBtn('down'));
    compassArea.appendChild(udStack);

    // -- Action buttons grid --
    const actionsGrid = document.createElement('div');
    actionsGrid.className = 'actions-grid';
    ['pickup', 'examine', 'read', 'talk', 'use', 'search'].forEach(vid => {
        actionsGrid.appendChild(createVerbBtn(vid));
    });

    container.appendChild(compassArea);

    const separator = document.createElement('div');
    separator.className = 'verb-separator-v';
    container.appendChild(separator);

    container.appendChild(actionsGrid);
    verbGridEl.appendChild(container);
}

function createVerbBtn(vid) {
    const vdef = VERB_TYPES[vid];
    const btn = document.createElement('button');
    btn.className = 'verb-btn';
    btn.dataset.verb = vid;
    btn.innerHTML = `<span class="verb-icon">${vdef.icon}</span><span class="verb-label">${vdef.label}</span>`;
    btn.addEventListener('click', () => onVerbClick(vid));
    return btn;
}

function createEmptyCell() {
    const cell = document.createElement('div');
    cell.className = 'compass-empty';
    return cell;
}

// ── Command Builder Logic ─────────────────────────────────────

function onVerbClick(verbId) {
    if (state.gameEnded) return;

    const vdef = VERB_TYPES[verbId];

    // Clear previous highlight
    document.querySelectorAll('.verb-btn.active').forEach(b => b.classList.remove('active'));

    if (vdef.type === 'immediate') {
        // Direction commands execute immediately
        clearCommandBuilder();
        executeDirection(verbId);
        return;
    }

    // Highlight active verb
    const btn = document.querySelector(`.verb-btn[data-verb="${verbId}"]`);
    if (btn) btn.classList.add('active');

    cmdBuilder.verb = verbId;
    cmdBuilder.target1 = null;
    cmdBuilder.awaitingTarget = true;
    cmdBuilder.awaitingTarget2 = false;
    cmdBuilder.verbType = vdef.type;

    updateCommandLine(`${vdef.label} ___`);
    showTargets(verbId);
}

function onTargetClick(targetId, targetLabel) {
    if (state.gameEnded) return;

    const vdef = VERB_TYPES[cmdBuilder.verb];

    if (cmdBuilder.verbType === 'single' || (cmdBuilder.verbType === 'double' && cmdBuilder.awaitingTarget2)) {
        // Final target — execute
        if (cmdBuilder.awaitingTarget2) {
            updateCommandLine(`${vdef.label} ${cmdBuilder.target1.label} on ${targetLabel}`);
            executeCommand(cmdBuilder.verb, cmdBuilder.target1.id, targetId);
        } else {
            updateCommandLine(`${vdef.label} ${targetLabel}`);
            executeCommand(cmdBuilder.verb, targetId, null);
        }
        // Delayed clear to show completed command briefly
        setTimeout(() => clearCommandBuilder(), 600);
    } else if (cmdBuilder.verbType === 'double' && !cmdBuilder.awaitingTarget2) {
        // First target for double verb
        cmdBuilder.target1 = { id: targetId, label: targetLabel };
        cmdBuilder.awaitingTarget2 = true;
        updateCommandLine(`${vdef.label} ${targetLabel} on ___`);
        showTargets2(targetId);
    }
}

function clearCommandBuilder() {
    cmdBuilder.verb = null;
    cmdBuilder.target1 = null;
    cmdBuilder.awaitingTarget = false;
    cmdBuilder.awaitingTarget2 = false;
    cmdBuilder.verbType = null;
    updateCommandLine('');
    hideTargets();
    document.querySelectorAll('.verb-btn.active').forEach(b => b.classList.remove('active'));
}

function updateCommandLine(text) {
    if (text) {
        commandLineEl.textContent = `▸ ${text}`;
        commandLineEl.classList.add('active');
    } else {
        commandLineEl.textContent = 'Choose a command...';
        commandLineEl.classList.remove('active');
    }
}

// ── Target Panel ──────────────────────────────────────────────

function showTargets(verbId) {
    targetPanelEl.innerHTML = '';
    targetPanelEl.style.display = 'flex';

    const room = rooms[state.currentRoom];
    let targets = [];

    switch (verbId) {
        case 'pickup':
            targets = room.items
                .filter(iid => {
                    const item = items[iid];
                    if (item && item.requiresFlag && !state.flags[item.requiresFlag]) return false;
                    return true;
                })
                .map(iid => ({ id: iid, label: items[iid]?.name || iid }));
            break;
        case 'examine':
            // Room objects + room items only (inventory items clickable from Pack bar)
            targets = [
                ...Object.keys(room.examine || {}).map(oid => ({ id: oid, label: formatObjectName(oid) })),
                ...room.items.map(iid => ({ id: iid, label: items[iid]?.name || iid })),
            ];
            break;
        case 'read':
            // Room items with readText only (inventory items clickable from Pack bar)
            targets = [];
            room.items.forEach(iid => {
                if (items[iid]?.readText) {
                    targets.push({ id: iid, label: items[iid].name });
                }
            });
            // Also allow reading examinable room objects
            if (targets.length === 0) {
                targets = Object.keys(room.examine || {}).map(oid => ({ id: oid, label: formatObjectName(oid) }));
            }
            break;
        case 'search':
            targets = Object.keys(room.examine || {}).map(oid => ({ id: oid, label: formatObjectName(oid) }));
            break;
        case 'talk':
            targets = (room.npcs || []).map(nid => ({ id: nid, label: npcs[nid]?.name || nid }));
            break;
        case 'use':
            // All inventory items + room objects
            targets = [
                ...state.inventory.map(iid => ({ id: iid, label: getItemName(iid) })),
            ];
            break;
    }

    if (targets.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'target-empty';
        empty.textContent = 'Nothing to ' + (VERB_TYPES[verbId]?.label || verbId).toLowerCase() + ' here.';
        targetPanelEl.appendChild(empty);
        setTimeout(() => clearCommandBuilder(), 1500);
        return;
    }

    targets.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'target-btn';
        btn.textContent = t.label;
        btn.addEventListener('click', () => onTargetClick(t.id, t.label));
        targetPanelEl.appendChild(btn);
    });
}

function showTargets2(firstTargetId) {
    targetPanelEl.innerHTML = '';

    const room = rooms[state.currentRoom];

    // Second target: other inventory items + room objects + NPCs
    let targets = [
        ...state.inventory.filter(iid => iid !== firstTargetId).map(iid => ({ id: iid, label: getItemName(iid) })),
        ...Object.keys(room.examine || {}).map(oid => ({ id: oid, label: formatObjectName(oid) })),
        ...(room.npcs || []).map(nid => ({ id: nid, label: npcs[nid]?.name || nid })),
        ...room.items.map(iid => ({ id: iid, label: items[iid]?.name || iid })),
    ];

    // Remove duplicates
    const seen = new Set();
    targets = targets.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
    });

    if (targets.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'target-empty';
        empty.textContent = 'Nothing to use that on here.';
        targetPanelEl.appendChild(empty);
        setTimeout(() => clearCommandBuilder(), 1500);
        return;
    }

    targets.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'target-btn';
        btn.textContent = t.label;
        btn.addEventListener('click', () => onTargetClick(t.id, t.label));
        targetPanelEl.appendChild(btn);
    });
}

function hideTargets() {
    targetPanelEl.innerHTML = '';
    targetPanelEl.style.display = 'none';
}

// ── Command Execution ─────────────────────────────────────────

function executeDirection(dir) {
    const room = rooms[state.currentRoom];

    // Check for special shadow vale access — all shards collected, UP from King's Road
    if (dir === 'up' && state.currentRoom === 'kings_road' && state.flags.all_shards) {
        enterRoom('shadow_vale');
        addNarrative("\nYou step onto the shadow-wreathed trail. The five shards pulse in rhythm with your heartbeat as the path winds upward through twisted rock and dark mist. The air grows cold. The world grows quiet. And ahead, through the gloom, the citadel waits.", 'special');
        return;
    }

    const exits = room.exits;
    if (!exits[dir]) {
        // Check for blocked paths with messages
        if (dir === 'south' && state.currentRoom === 'marsh_path' && !state.flags.marsh_lit) {
            addNarrative("You try to push deeper into the marsh, but the will-o'-wisps swarm around you, their lights dizzying and disorienting. Without a reliable light source, you'll be led in circles — or worse, into the sucking mud.");
            return;
        }
        if (dir === 'east' && state.currentRoom === 'dwarven_gate' && !state.flags.gate_opened) {
            addNarrative("The massive dwarven doors are sealed shut. The keyhole stares at you expectantly. You'll need the right key to open them.");
            return;
        }
        if (dir === 'east' && state.currentRoom === 'abandoned_mine' && !state.flags.rubble_cleared) {
            addNarrative("Heavy rubble blocks the eastern passage. You'd need something to break through it — a pickaxe, perhaps.");
            return;
        }
        if (dir === 'up' && state.currentRoom === 'dragons_pass' && !state.flags.heat_survived) {
            addNarrative("The heat from the cavern above is utterly unbearable. You can barely breathe, let alone climb. You'd need some kind of protection — a shield with magical wards, perhaps — to survive the approach.");
            return;
        }
        addNarrative("You can't go that way.");
        return;
    }

    enterRoom(exits[dir]);
}

function executeCommand(verb, target1, target2) {
    switch (verb) {
        case 'pickup': executePickup(target1); break;
        case 'examine': executeExamine(target1); break;
        case 'read': executeRead(target1); break;
        case 'search': executeExamine(target1); break; // Search works like examine
        case 'talk': executeTalk(target1); break;
        case 'use': executeUse(target1, target2); break;
    }
}

function executePickup(itemId) {
    const room = rooms[state.currentRoom];
    const item = items[itemId];

    if (!item) {
        addNarrative("You can't pick that up.");
        return;
    }

    if (!room.items.includes(itemId)) {
        addNarrative("That isn't here.");
        return;
    }

    if (item.requiresFlag && !state.flags[item.requiresFlag]) {
        addNarrative("You can see it, but you can't reach it from here.");
        return;
    }

    // Remove from room, add to inventory
    room.items = room.items.filter(i => i !== itemId);
    state.inventory.push(itemId);

    addNarrative(item.pickupText || `You pick up the ${item.name}.`, 'pickup');

    // Track shards
    if (item.isShard) {
        state.shardCount++;
        updateShardDisplay();

        if (state.shardCount >= TOTAL_SHARDS) {
            addNarrative("\n✦ You now possess all five shards of the Crown of Aethermoor. The shards pulse as one, resonating with dark power. A voice in the back of your mind whispers: return to the King's Road. The shards will reveal the hidden path to the citadel.", 'special');
            // Enable path to shadow vale
            state.flags.all_shards = true;
            // Dynamically add the UP exit from King's Road
            rooms.kings_road.exits.up = 'shadow_vale';
        }
    }

    // Handle dragon shard special case
    if (itemId === 'shard_4' && npcs.pyraxis) {
        // Trigger pyraxis dialogue after pickup
    }

    renderInventory();
}

function executeExamine(targetId) {
    const room = rooms[state.currentRoom];

    // Check room objects
    if (room.examine && room.examine[targetId]) {
        addNarrative(room.examine[targetId], 'examine');
        return;
    }

    // Check inventory items
    const item = items[targetId];
    if (item && state.inventory.includes(targetId)) {
        if (item.examineText) {
            addNarrative(item.examineText, 'examine');
        } else {
            addNarrative(item.description, 'examine');
        }
        return;
    }

    // Check room items
    if (item && room.items.includes(targetId)) {
        addNarrative(item.description, 'examine');
        return;
    }

    addNarrative("You don't see anything special about that.");
}

function executeRead(targetId) {
    const item = items[targetId];

    if (item?.readText) {
        addNarrative(item.readText, 'read');
        return;
    }

    if (item?.examineText) {
        addNarrative(item.examineText, 'read');
        return;
    }

    // Fallback to examine
    executeExamine(targetId);
}

function executeTalk(npcId) {
    const npc = npcs[npcId];
    if (!npc) {
        addNarrative("There's no one here to talk to.");
        return;
    }

    // Knight special case
    if (npcId === 'wounded_knight') {
        if (state.flags.knight_healed) {
            addNarrative(npc.talkHealed, 'npc-dialogue');
        } else {
            addNarrative(npc.talkDefault, 'npc-dialogue');
        }
        return;
    }

    // Aldric in village
    if (npcId === 'aldric_village') {
        if (!state.flags.talked_aldric) {
            state.flags.talked_aldric = true;
            addNarrative(npc.talkResponses.initial, 'npc-dialogue');
        } else {
            addNarrative(npc.talkResponses.after_quest || npc.talkDefault, 'npc-dialogue');
        }
        return;
    }

    // Pyraxis
    if (npcId === 'pyraxis') {
        if (state.inventory.includes('shard_4') || !rooms.dragons_lair.items.includes('shard_4')) {
            addNarrative(npc.talkAfterShard || npc.talkDefault, 'npc-dialogue');
        } else {
            addNarrative(npc.talkDefault, 'npc-dialogue');
        }
        return;
    }

    // Yarrow
    if (npcId === 'yarrow') {
        if (state.flags.talked_yarrow) {
            addNarrative(npc.talkAfter || npc.talkDefault, 'npc-dialogue');
        } else {
            state.flags.talked_yarrow = true;
            addNarrative(npc.talkDefault, 'npc-dialogue');
        }
        // Set compass flag automatically since she gives it freely
        state.flags.has_compass = true;
        return;
    }

    // Aldric in throne room (after crown assembly) — triggers dark ending
    if (npcId === 'aldric_throne') {
        triggerEnding('dark');
        return;
    }

    addNarrative(npc.talkDefault, 'npc-dialogue');
}

function executeUse(item1Id, target2Id) {
    // Build combination keys to check
    const key1 = `${item1Id}+${target2Id}`;
    const key2 = `${target2Id}+${item1Id}`;

    const combo = useCombinations[key1] || useCombinations[key2];

    if (combo) {
        // Check for crown assembly
        if (combo.crownAssembly) {
            if (state.currentRoom !== 'throne_room') {
                addNarrative("The shard pulses with energy, but nothing happens. You feel it pulling toward something — toward the place where the Crown waits.");
                return;
            }
            if (state.flags.crown_assembled) {
                addNarrative("The Crown is already assembled. Its dark fire burns steadily in the frame.");
                return;
            }
            handleCrownAssembly();
            return;
        }

        // Check for final choice
        if (combo.finalChoice) {
            if (combo.finalChoice === 'true' && !state.flags.crown_assembled) {
                addNarrative("You swing the sword at the empty crown frame. The blade rings against cold metal, but nothing happens. The frame is just an empty shell without the shards.");
                return;
            }
            triggerEnding(combo.finalChoice);
            return;
        }

        addNarrative(combo.message, 'action');

        // Consume item
        if (combo.consumesItem) {
            state.inventory = state.inventory.filter(i => i !== combo.consumesItem);
            renderInventory();
        }

        // Set flag
        if (combo.setsFlag) {
            state.flags[combo.setsFlag] = true;
        }

        // Open exit
        if (combo.opensExit) {
            const { room: roomId, direction, target } = combo.opensExit;
            rooms[roomId].exits[direction] = target;
        }

        // Trigger talk
        if (combo.triggersTalk) {
            const npc = npcs[combo.triggersTalk];
            if (npc) {
                setTimeout(() => {
                    if (state.flags.knight_healed && combo.triggersTalk === 'wounded_knight') {
                        addNarrative('\n' + npc.talkHealed, 'npc-dialogue');
                    } else {
                        addNarrative('\n' + (npc.talkDefault || ''), 'npc-dialogue');
                    }
                }, 500);
            }
        }

        // Pickup compass from witch automatically
        if (combo.setsFlag === 'marsh_lit' || item1Id === 'compass') {
            state.flags.has_compass = true;
        }

        return;
    }

    // No valid combination
    addNarrative(`You try to use the ${getItemName(item1Id)} on the ${formatObjectName(target2Id)}, but nothing happens.`);
}

// ── Crown Assembly ────────────────────────────────────────────

function handleCrownAssembly() {
    // Remove all shards from inventory
    state.inventory = state.inventory.filter(iid => !SHARD_IDS.includes(iid));
    state.flags.crown_assembled = true;

    // Update room: remove sword if still there (player should already have it, but just in case)
    const throneRoom = rooms.throne_room;

    // Add Aldric to the throne room as an NPC
    if (!throneRoom.npcs) throneRoom.npcs = [];
    if (!throneRoom.npcs.includes('aldric_throne')) {
        throneRoom.npcs.push('aldric_throne');
    }

    // Show the assembly narrative
    clearNarrative();
    locationTitleEl.textContent = 'Throne Room';
    addNarrative(CROWN_ASSEMBLED_TEXT, 'special');

    // Update inventory display
    renderInventory();
    updateShardDisplay();
    clearCommandBuilder();
}

// ── Endings ───────────────────────────────────────────────────

export function triggerEnding(type) {
    state.gameEnded = true;
    clearNarrative();

    let lines;
    let title;
    switch (type) {
        case 'dark':
            lines = DARK_ENDING;
            title = 'The Shadow Falls';
            break;
        case 'true':
            lines = TRUE_ENDING;
            title = 'The Dawn Breaks';
            break;
        case 'domination':
            lines = DOMINATION_ENDING;
            title = 'The Shadow Endures';
            break;
        default:
            lines = DARK_ENDING;
            title = 'The Shadow Falls';
    }

    locationTitleEl.textContent = title;

    // Disable verbs
    document.querySelectorAll('.verb-btn').forEach(b => {
        b.disabled = true;
        b.classList.add('disabled');
    });

    hideTargets();
    commandLineEl.textContent = '';
    commandLineEl.classList.remove('active');

    typewriteLines(narrativeEl, lines, 0, () => {
        // Calculate score
        let score = 0;
        if (type === 'true') score = 3;
        if (type === 'domination') score = 2;
        if (type === 'dark') score = 1;

        // Show Score
        addNarrative(`\nFINAL SCORE: ${score} points`, 'special');

        // High Score Logic
        if (isHighScore('textadventure', score)) {
            showHighScoreInput(score);
        } else {
            showLeaderboard();
        }
    });
}

function showHighScoreInput(score) {
    const section = document.createElement('div');
    section.className = 'hs-section';
    section.innerHTML = `
        <div class="hs-title">A Legendary Achievement!</div>
        <p style="margin-bottom: 1rem; color: var(--text-secondary);">Your journey has been recorded in the annals of Aethermoor.</p>
        <div class="hs-input-group">
            <input type="text" class="hs-input" id="hs-initials" maxlength="3" placeholder="---">
            <button class="hs-btn" id="hs-submit">Save Score</button>
        </div>
    `;
    narrativeEl.appendChild(section);
    narrativeEl.scrollTop = narrativeEl.scrollHeight;

    const input = document.getElementById('hs-initials');
    const submit = document.getElementById('hs-submit');

    input.focus();

    const onSubmit = () => {
        const initials = input.value.trim().toUpperCase() || '???';
        saveHighScore('textadventure', initials, score);
        section.remove();
        showLeaderboard();
    };

    submit.addEventListener('click', onSubmit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') onSubmit();
    });
}

function showLeaderboard() {
    const container = document.createElement('div');
    container.className = 'hs-section';
    container.innerHTML = `
        <div class="hs-title">Hall of Heroes</div>
        <div class="leaderboard-container">
            ${generateLeaderboardHTML('textadventure')}
        </div>
        <button class="replay-btn pulse-glow" style="margin-top: 1.5rem;">↻ Play Again</button>
    `;
    narrativeEl.appendChild(container);
    narrativeEl.scrollTop = narrativeEl.scrollHeight;

    const replayBtn = container.querySelector('.replay-btn');
    replayBtn.addEventListener('click', () => {
        location.reload();
    });
}

// ── Narrative Display ─────────────────────────────────────────

function clearNarrative() {
    narrativeEl.innerHTML = '';
}

function addNarrative(text, className) {
    const p = document.createElement('div');
    p.className = `narrative-line ${className || ''}`;

    // Handle multi-line text
    const lines = text.split('\n');
    lines.forEach((line, i) => {
        if (i > 0) p.appendChild(document.createElement('br'));
        const span = document.createElement('span');
        span.textContent = line;
        p.appendChild(span);
    });

    narrativeEl.appendChild(p);

    // Animate in
    requestAnimationFrame(() => {
        p.classList.add('visible');
    });

    // Scroll to bottom
    narrativeEl.scrollTop = narrativeEl.scrollHeight;
}

function typewriteLines(container, lines, index, callback) {
    if (index >= lines.length) {
        if (callback) callback();
        return;
    }

    const line = lines[index];
    const p = document.createElement('div');
    p.className = 'narrative-line intro-line';
    container.appendChild(p);

    let charIndex = 0;
    const speed = line.length > 80 ? 15 : 25;

    function typeChar() {
        if (charIndex < line.length) {
            p.textContent += line[charIndex];
            charIndex++;
            container.scrollTop = container.scrollHeight;
            setTimeout(typeChar, speed);
        } else {
            p.classList.add('visible');
            setTimeout(() => typewriteLines(container, lines, index + 1, callback), 300);
        }
    }

    if (line === '') {
        p.innerHTML = '&nbsp;';
        p.classList.add('visible');
        setTimeout(() => typewriteLines(container, lines, index + 1, callback), 200);
    } else {
        typeChar();
    }
}

// ── Inventory Display ─────────────────────────────────────────

function renderInventory() {
    inventoryEl.innerHTML = '';

    state.inventory.forEach(iid => {
        const item = items[iid];
        const chip = document.createElement('button');
        chip.className = 'inventory-chip';
        if (item?.isShard || iid === 'shard_1') chip.classList.add('shard-chip');

        chip.textContent = getItemName(iid);
        chip.title = item?.description || '';

        // Clickable for command builder
        chip.addEventListener('click', () => {
            if (cmdBuilder.awaitingTarget || cmdBuilder.awaitingTarget2) {
                onTargetClick(iid, getItemName(iid));
            }
        });

        inventoryEl.appendChild(chip);
    });
}

function updateShardDisplay() {
    shardCountEl.textContent = `${state.shardCount} / ${TOTAL_SHARDS}`;
    // Update gem indicators
    if (shardGemsEl) {
        shardGemsEl.innerHTML = '';
        for (let i = 0; i < TOTAL_SHARDS; i++) {
            const gem = document.createElement('span');
            gem.className = 'shard-gem' + (i < state.shardCount ? ' collected' : '');
            gem.textContent = i < state.shardCount ? '◆' : '◇';
            shardGemsEl.appendChild(gem);
        }
    }
}

// ── Utility ───────────────────────────────────────────────────

function getItemName(itemId) {
    if (itemId === 'shard_1') return 'Crown Shard';
    return items[itemId]?.name || itemId;
}

function formatObjectName(objectId) {
    return objectId
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

// ── Boot ──────────────────────────────────────────────────────

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    // DOM already loaded (e.g. script loaded dynamically after DOMContentLoaded)
    initGame();
}
