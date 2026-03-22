// Tiny Dungeon Game Logic

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 32;
const MAP_WIDTH = Math.floor(canvas.width / TILE_SIZE); // 25
const MAP_HEIGHT = Math.floor(canvas.height / TILE_SIZE); // 18

// UI Elements
const startScreen = document.getElementById('start-screen');
const uiOverlay = document.getElementById('ui-overlay');
const inventoryScreen = document.getElementById('inventory-screen');
const msgLog = document.getElementById('msg-log');
const playerStatsEl = document.getElementById('player-stats');
const deathMsg = document.getElementById('death-msg');
const backpackList = document.getElementById('backpack-list');
const invStatsPanel = document.getElementById('inv-stats-panel');

let gameState = 'START'; // START, PLAYING, INVENTORY, DEATH, WIN
let currentFloor = 1;
let messages = [];

let map = []; // 0 = floor, 1 = wall, 2 = stairs
let explored = [];
let rooms = [];
let player = null;
let entities = []; // monsters
let items = []; // items on floor

// Camera shake / FX
let screenShake = 0;

// Mouse Tracking for Tooltips
let mouseX = -1;
let mouseY = -1;

canvas.addEventListener('mousemove', (e) => {
    let rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});
canvas.addEventListener('mouseout', () => {
    mouseX = -1; mouseY = -1;
});

// Load Assets
const imgs = {
    Fighter: new Image(),
    Mage: new Image(),
    Priest: new Image(),
    Rogue: new Image(),
    Stairs: new Image()
};
imgs.Fighter.src = '../../assets/fighter.png';
imgs.Mage.src = '../../assets/mage.png';
imgs.Priest.src = '../../assets/priest.png';
imgs.Rogue.src = '../../assets/rogue.png';
imgs.Stairs.src = '../../assets/stairs.png';

// Data
const ITEM_TYPES = [
    { name: 'Health Potion', char: '🧪', type: 'consumable', heal: 20, color: '#e84118' },
    { name: 'Greater Potion', char: '🍷', type: 'consumable', heal: 50, color: '#c23616' },
    { name: 'Dagger', char: '🗡️', type: 'weapon', attack: 2, color: '#7f8fa6' },
    { name: 'Short Sword', char: '⚔️', type: 'weapon', attack: 5, color: '#fbc531' },
    { name: 'Battle Axe', char: '🪓', type: 'weapon', attack: 8, color: '#e1b12c' },
    { name: 'Magic Staff', char: '🪄', type: 'weapon', attack: 10, color: '#00a8ff' },
    { name: 'Leather Armor', char: '🦺', type: 'armor', defense: 3, color: '#e1b12c' },
    { name: 'Chainmail', char: '⛓️', type: 'armor', defense: 6, color: '#718093' },
    { name: 'Plate Armor', char: '🛡️', type: 'armor', defense: 12, color: '#f5f6fa' },
    { name: 'Ring of Power', char: '💍', type: 'accessory', attack: 3, defense: 3, color: '#9c88ff' },
    { name: 'Amulet of Life', char: '📿', type: 'accessory', maxHp: 20, color: '#4cd137' }
];

const MONSTER_TYPES = [
    { name: 'Slime', char: '🟢', color: '#4cd137', hp: 5, attack: 2, defense: 0, xp: 2 },
    { name: 'Rat', char: '🐀', color: '#7f8fa6', hp: 6, attack: 3, defense: 0, xp: 3 },
    { name: 'Bat', char: '🦇', color: '#353b48', hp: 4, attack: 4, defense: 0, xp: 3 },
    { name: 'Goblin', char: '👺', color: '#e1b12c', hp: 10, attack: 4, defense: 1, xp: 5 },
    { name: 'Skeleton', char: '💀', color: '#f5f6fa', hp: 12, attack: 5, defense: 2, xp: 6 },
    { name: 'Zombie', char: '🧟', color: '#44bd32', hp: 15, attack: 4, defense: 1, xp: 7 },
    { name: 'Spider', char: '🕷️', color: '#2f3640', hp: 8, attack: 6, defense: 0, xp: 6 },
    { name: 'Orc', char: '👹', color: '#4cd137', hp: 20, attack: 6, defense: 2, xp: 10 },
    { name: 'Wolf', char: '🐺', color: '#7f8fa6', hp: 14, attack: 7, defense: 1, xp: 9 },
    { name: 'Ghost', char: '👻', color: '#f5f6fa', hp: 10, attack: 8, defense: 4, xp: 12 },
    { name: 'Troll', char: '🧌', color: '#4cd137', hp: 30, attack: 8, defense: 3, xp: 15 },
    { name: 'Ogre', char: '🧟‍♂️', color: '#e84118', hp: 35, attack: 10, defense: 2, xp: 18 },
    { name: 'Vampire', char: '🧛', color: '#8c7ae6', hp: 25, attack: 9, defense: 4, xp: 20 },
    { name: 'Demon', char: '👿', color: '#c23616', hp: 40, attack: 12, defense: 3, xp: 25 },
    { name: 'Golem', char: '🗿', color: '#718093', hp: 50, attack: 8, defense: 8, xp: 30 },
    { name: 'Wraith', char: '🌫️', color: '#dcdde1', hp: 20, attack: 15, defense: 5, xp: 28 },
    { name: 'Minotaur', char: '🐂', color: '#8c7ae6', hp: 45, attack: 14, defense: 4, xp: 35 },
    { name: 'Giant', char: '🦶', color: '#e1b12c', hp: 60, attack: 15, defense: 5, xp: 40 },
    { name: 'Lich', char: '🧙‍♂️', color: '#9c88ff', hp: 40, attack: 20, defense: 5, xp: 50 },
    { name: 'Dragon Whelp', char: '🦎', color: '#e84118', hp: 55, attack: 16, defense: 6, xp: 45 }
];

const MINI_BOSSES = [
    { name: 'Orc Chieftain', char: '🦹', color: '#e84118', hp: 80, attack: 15, defense: 5, xp: 100 },
    { name: 'Vampire Lord', char: '🧛‍♂️', color: '#8c7ae6', hp: 100, attack: 18, defense: 6, xp: 150 }
];

const FINAL_BOSSES = [
    { name: 'Ancient Red Dragon', char: '🐉', color: '#e84118', hp: 250, attack: 25, defense: 10, xp: 500 },
    { name: 'The Demon King', char: '👹', color: '#c23616', hp: 300, attack: 20, defense: 12, xp: 500 },
    { name: 'Archlich', char: '💀', color: '#9c88ff', hp: 200, attack: 30, defense: 8, xp: 500 }
];

function getPlayerTotalStats() {
    let totals = { attack: player.baseAttack, defense: player.baseDefense, maxHp: player.baseMaxHp };
    for(let slot in player.equipment) {
        let eq = player.equipment[slot];
        if(eq) {
            if(eq.attack) totals.attack += eq.attack;
            if(eq.defense) totals.defense += eq.defense;
            if(eq.maxHp) totals.maxHp += eq.maxHp;
        }
    }
    return totals;
}

// System Helpers
function logMsg(text, type = 'default') {
    messages.push({ text, type });
    if (messages.length > 5) messages.shift();
    renderMessages();
}

function renderMessages() {
    msgLog.innerHTML = '';
    messages.forEach(m => {
        const p = document.createElement('p');
        p.textContent = m.text;
        if (m.type === 'good') p.className = 'msg-good';
        else if (m.type === 'bad') p.className = 'msg-bad';
        else if (m.type === 'info') p.className = 'msg-info';
        msgLog.appendChild(p);
    });
}

function updateHUD() {
    if (!player) return;
    let stats = getPlayerTotalStats();
    playerStatsEl.textContent = `HP: ${player.hp}/${stats.maxHp} | Lvl: ${player.level} | XP: ${player.xp}/${player.nextXp} | Floor: ${currentFloor}`;
}

window.startGame = function(className) {
    if(gameState === 'DEATH' || gameState === 'WIN') {
        currentFloor = 1; messages = [];
    }
    
    startScreen.style.display = 'none';
    uiOverlay.style.display = 'flex';
    inventoryScreen.style.display = 'none';
    deathMsg.style.display = 'none';
    gameState = 'PLAYING';
    
    initPlayer(className);
    generateFloor();
}

function initPlayer(className) {
    player = {
        x: 0, y: 0, renderX: 0, renderY: 0,
        animOffsetX: 0, animOffsetY: 0, damageFlash: 0,
        className,
        baseMaxHp: 20, hp: 20, baseAttack: 5, baseDefense: 2,
        level: 1, xp: 0, nextXp: 10,
        inventory: [],
        equipment: { weapon: null, armor: null, accessory: null },
        color: '#fff', char: '@', dead: false
    };

    switch(className) {
        case 'Fighter':
            player.baseMaxHp = 30; player.hp = 30; player.baseAttack = 6; player.baseDefense = 4;
            player.inventory.push({...ITEM_TYPES[3]});
            break;
        case 'Mage':
            player.baseMaxHp = 15; player.hp = 15; player.baseAttack = 8; player.baseDefense = 1;
            player.inventory.push({...ITEM_TYPES[5]});
            break;
        case 'Priest':
            player.baseMaxHp = 20; player.hp = 20; player.baseAttack = 4; player.baseDefense = 3;
            player.inventory.push({...ITEM_TYPES[0]});
            break;
        case 'Rogue':
            player.baseMaxHp = 18; player.hp = 18; player.baseAttack = 5; player.baseDefense = 2;
            player.inventory.push({...ITEM_TYPES[2]});
            break;
    }
}

function generateFloor() {
    map = []; explored = []; rooms = []; entities = []; items = [];
    for(let y = 0; y < MAP_HEIGHT; y++) {
        let row = []; let expRow = [];
        for(let x = 0; x < MAP_WIDTH; x++) { row.push(1); expRow.push(false); }
        map.push(row); explored.push(expRow);
    }
    
    const MAX_ROOMS = 8 + Math.floor(currentFloor / 2);
    const MIN_SIZE = 4; const MAX_SIZE = 8;
    
    for(let i=0; i<MAX_ROOMS; i++) {
        let w = Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE + 1)) + MIN_SIZE;
        let h = Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE + 1)) + MIN_SIZE;
        let x = Math.floor(Math.random() * (MAP_WIDTH - w - 1)) + 1;
        let y = Math.floor(Math.random() * (MAP_HEIGHT - h - 1)) + 1;
        
        let newRoom = { x, y, w, h };
        let failed = false;
        
        for(let other of rooms) {
            if(x < other.x + other.w + 1 && x + w + 1 > other.x &&
               y < other.y + other.h + 1 && y + h + 1 > other.y) {
                failed = true; break;
            }
        }
        
        if(!failed) {
            createRoom(newRoom);
            let centerLocation = {x: Math.floor(x + w/2), y: Math.floor(y + h/2)};
            if(rooms.length === 0) {
                player.x = centerLocation.x; player.y = centerLocation.y;
                player.renderX = player.x; player.renderY = player.y;
            } else {
                let prevCenter = {
                    x: Math.floor(rooms[rooms.length-1].x + rooms[rooms.length-1].w/2),
                    y: Math.floor(rooms[rooms.length-1].y + rooms[rooms.length-1].h/2)
                };
                createCorridor(prevCenter, centerLocation);
            }
            rooms.push(newRoom);
        }
    }
    
    let lastRoom = rooms[rooms.length - 1];
    if (currentFloor === 10) {
        spawnFinalBoss(lastRoom);
    } else {
        map[Math.floor(lastRoom.y + lastRoom.h/2)][Math.floor(lastRoom.x + lastRoom.w/2)] = 2; // Stairs
        if (currentFloor === 4 || currentFloor === 8) spawnMiniBoss(lastRoom);
        spawnMonsters();
    }
    
    // Rare floor drops (50% chance for just 1 per floor)
    let floorDrops = Math.random() < 0.5 ? 1 : 0;
    for(let i=0; i<floorDrops; i++) {
        let r = rooms[Math.floor(Math.random() * rooms.length)];
        dropItem(r.x + Math.floor(Math.random()*r.w), r.y + Math.floor(Math.random()*r.h));
    }
    
    logMsg(`Entered floor ${currentFloor}...`, 'info');
    updateFOV(); updateHUD();
}

function createRoom(room) {
    for(let y = room.y; y < room.y + room.h; y++) {
        for(let x = room.x; x < room.x + room.w; x++) map[y][x] = 0;
    }
}

function createCorridor(c1, c2) {
    let x = c1.x; let y = c1.y;
    while(x !== c2.x) { map[y][x] = 0; x += (x < c2.x) ? 1 : -1; }
    while(y !== c2.y) { map[y][x] = 0; y += (y < c2.y) ? 1 : -1; }
}

function spawnMonsters() {
    let maxIndex = Math.min(MONSTER_TYPES.length - 1, currentFloor * 2 + 1);
    let minIndex = Math.max(0, currentFloor * 2 - 4);
    let numMonsters = Math.floor(Math.random() * 3) + 3 + Math.floor(currentFloor / 2);
    
    for(let i=0; i<numMonsters; i++) {
        let room = rooms[Math.floor(Math.random()*(rooms.length-1)) + 1];
        let typeInfo = MONSTER_TYPES[Math.floor(Math.random()*(maxIndex-minIndex+1))+minIndex];
        let mx = Math.floor(Math.random() * (room.w-2)) + room.x + 1;
        let my = Math.floor(Math.random() * (room.h-2)) + room.y + 1;
        entities.push({
            ...typeInfo, x: mx, y: my, renderX: mx, renderY: my,
            animOffsetX: 0, animOffsetY: 0, damageFlash: 0,
            maxHp: typeInfo.hp
        });
    }
}

function spawnMiniBoss(room) {
    let typeInfo = MINI_BOSSES[currentFloor === 4 ? 0 : 1];
    let mx = room.x + Math.floor(room.w/2); let my = room.y + Math.floor(room.h/2);
    entities.push({
        ...typeInfo, x: mx, y: my, renderX: mx, renderY: my,
        animOffsetX: 0, animOffsetY: 0, damageFlash: 0,
        maxHp: typeInfo.hp, isBoss: true
    });
    logMsg("You feel a dangerous presence...", 'bad');
}

function spawnFinalBoss(room) {
    let boss = FINAL_BOSSES[Math.floor(Math.random() * FINAL_BOSSES.length)];
    let mx = room.x + Math.floor(room.w/2); let my = room.y + Math.floor(room.h/2);
    entities.push({
        ...boss, x: mx, y: my, renderX: mx, renderY: my,
        animOffsetX: 0, animOffsetY: 0, damageFlash: 0,
        maxHp: boss.hp, isBoss: true, isFinal: true
    });
    logMsg(`The ${boss.name} awaits you!`, 'bad');
}

function dropItem(x, y) {
    let itemTemplate = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    items.push({ ...itemTemplate, x, y, renderYOffset: 0, bounceDir: 1 });
}

function updateFOV() {
    const RADIUS = 6;
    for(let y = 0; y < MAP_HEIGHT; y++) {
        for(let x = 0; x < MAP_WIDTH; x++) {
            if(Math.hypot(player.x - x, player.y - y) <= RADIUS) explored[y][x] = true;
        }
    }
}

function pickupItems(x, y) {
    for(let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        if(item.x === x && item.y === y) {
            if(player.inventory.length < 20) {
                player.inventory.push({...item});
                logMsg(`Picked up ${item.name}.`, 'good');
                items.splice(i, 1);
            } else {
                logMsg(`Inventory full! Drop an item to pick up ${item.name}.`, 'bad');
            }
        }
    }
}

function movePlayer(dx, dy) {
    if(player.dead) return;
    
    let newX = player.x + dx;
    let newY = player.y + dy;
    
    if(newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return;
    if(map[newY][newX] === 1) {
        player.animOffsetX = dx * 0.3;
        player.animOffsetY = dy * 0.3;
        return;
    }
    
    let enemy = entities.find(e => e.x === newX && e.y === newY);
    if(enemy) {
        attackEntity(player, enemy, dx, dy);
    } else {
        player.x = newX; player.y = newY;
        pickupItems(newX, newY);
        if(map[player.y][player.x] === 2) {
            descendStairs(); return;
        }
    }
    tickGame();
}

function attackEntity(attacker, defender, dx, dy) {
    let attTotal = attacker === player ? getPlayerTotalStats().attack : attacker.attack;
    let defTotal = defender === player ? getPlayerTotalStats().defense : defender.defense;
    
    let damage = Math.max(1, attTotal - defTotal);
    damage = Math.floor(damage * (0.8 + Math.random() * 0.4));
    if(damage < 1 && Math.random() < 0.2) damage = 1; 
    
    defender.hp -= damage;
    defender.damageFlash = 15;
    
    if (dx !== undefined && dy !== undefined) {
        attacker.animOffsetX = dx * 0.5;
        attacker.animOffsetY = dy * 0.5;
    } else {
        attacker.animOffsetX = (defender.x - attacker.x) * 0.5;
        attacker.animOffsetY = (defender.y - attacker.y) * 0.5;
    }
    
    if(attacker === player) {
        screenShake = damage * 0.5; 
        logMsg(`You hit ${defender.name} for ${damage} dmg.`);
        if(defender.hp <= 0) killEnemy(defender);
    } else {
        screenShake = damage; 
        logMsg(`${attacker.name} hits you for ${damage} dmg!`, 'bad');
        if(player.hp <= 0) killPlayer();
    }
}

function killEnemy(enemy) {
    logMsg(`You killed ${enemy.name}!`, 'good');
    entities = entities.filter(e => e !== enemy);
    
    player.xp += enemy.xp;
    if(player.xp >= player.nextXp) levelUp();
    
    // Extremely rare drops! 3% chance for normal enemies, 100% for bosses
    if(Math.random() < 0.03 || enemy.isBoss) dropItem(enemy.x, enemy.y);
    if(enemy.isFinal) winGame();
}

function levelUp() {
    player.level++; player.xp -= player.nextXp; player.nextXp = Math.floor(player.nextXp * 1.5);
    player.baseMaxHp += 5; player.hp = getPlayerTotalStats().maxHp;
    player.baseAttack += 2; player.baseDefense += 1;
    logMsg(`Level Up! You are now level ${player.level}.`, 'good');
}

function killPlayer() {
    player.dead = true; gameState = 'DEATH';
    setTimeout(() => {
        uiOverlay.style.display = 'none'; startScreen.style.display = 'flex';
        document.getElementById('class-select').style.display = 'none';
        deathMsg.style.display = 'block';
        setTimeout(() => {
            document.getElementById('class-select').style.display = 'block';
            deathMsg.innerHTML = 'You have died!<br><span style="font-size:18px; color:#fff;">Select a class to try again.</span>';
        }, 1500);
    }, 500);
}

function winGame() {
    gameState = 'WIN';
    setTimeout(() => {
        uiOverlay.style.display = 'none'; startScreen.style.display = 'flex';
        document.getElementById('class-select').style.display = 'block';
        deathMsg.style.display = 'block'; deathMsg.style.color = '#fbc531';
        deathMsg.innerHTML = 'VICTORY!<br><span style="font-size:18px; color:#fff;">You have conquered the Tiny Dungeon!</span>';
    }, 500);
}

function descendStairs() {
    player.renderX = player.x; player.renderY = player.y;
    currentFloor++; generateFloor();
}

function skipTurn() { tickGame(); }

// Inventory System
window.toggleInventory = function() {
    if(gameState === 'PLAYING') {
        gameState = 'INVENTORY';
        uiOverlay.style.display = 'none';
        inventoryScreen.style.display = 'flex';
        renderInventory();
    } else if (gameState === 'INVENTORY') {
        gameState = 'PLAYING';
        uiOverlay.style.display = 'flex';
        inventoryScreen.style.display = 'none';
        updateHUD();
    }
}

window.deleteItem = function(index) {
    if(gameState !== 'INVENTORY') return;
    let item = player.inventory[index];
    player.inventory.splice(index, 1);
    logMsg(`Dropped ${item.name}.`, 'bad');
    renderInventory();
};

function renderInventory() {
    let stats = getPlayerTotalStats();
    invStatsPanel.innerHTML = `
        <strong>Stats:</strong><br>
        HP: ${player.hp} / ${stats.maxHp}<br>
        Attack: ${stats.attack}<br>
        Defense: ${stats.defense}<br>
    `;
    
    document.getElementById('eq-weapon').innerHTML = player.equipment.weapon ? 
        `<span style="color:${player.equipment.weapon.color}">${player.equipment.weapon.char} ${player.equipment.weapon.name}</span>` : 'None';
    document.getElementById('eq-armor').innerHTML = player.equipment.armor ? 
        `<span style="color:${player.equipment.armor.color}">${player.equipment.armor.char} ${player.equipment.armor.name}</span>` : 'None';
    document.getElementById('eq-accessory').innerHTML = player.equipment.accessory ? 
        `<span style="color:${player.equipment.accessory.color}">${player.equipment.accessory.char} ${player.equipment.accessory.name}</span>` : 'None';

    backpackList.innerHTML = '';
    player.inventory.forEach((item, index) => {
        let div = document.createElement('div');
        div.className = 'item-row';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        
        let label = `<span style="flex:1; cursor:pointer;" onclick="useItem(${index})">${item.char} ${item.name}`;
        if(item.type === 'consumable') label += ` <span style="font-size:12px;color:#4cd137;">Heal ${item.heal}</span>`;
        else if(item.type === 'weapon') label += ` <span style="font-size:12px;color:#fbc531;">+${item.attack} Atk</span>`;
        else if(item.type === 'armor') label += ` <span style="font-size:12px;color:#fbc531;">+${item.defense} Def</span>`;
        else if(item.type === 'accessory') label += ` <span style="font-size:12px;color:#fbc531;">Stat+</span>`;
        label += `</span>`;
        
        let delBtn = `<button onclick="deleteItem(${index})" style="padding: 4px 8px; font-size: 10px; background: #e84118; margin-left: 10px; border-radius: 4px;">DROP</button>`;
        
        div.innerHTML = label + delBtn;
        backpackList.appendChild(div);
    });
}

window.useItem = function(index) {
    let item = player.inventory[index];
    if(item.type === 'consumable') {
        player.hp += item.heal;
        let stats = getPlayerTotalStats();
        if(player.hp > stats.maxHp) player.hp = stats.maxHp;
        logMsg(`You used ${item.name} and healed.`, 'good');
        player.inventory.splice(index, 1);
    } else {
        let eqSlot = item.type; let oldItem = player.equipment[eqSlot];
        player.inventory.splice(index, 1);
        if(oldItem) player.inventory.push(oldItem);
        player.equipment[eqSlot] = item;
        logMsg(`Equipped ${item.name}.`, 'info');
    }
    
    let stats = getPlayerTotalStats();
    if(player.hp > stats.maxHp) player.hp = stats.maxHp;
    renderInventory();
}

function tickGame() {
    if(player.dead) return;
    
    for(let enemy of entities) {
        if(enemy.hp <= 0) continue;
        let dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        let acted = false;
        
        if(dist <= 1.5) {
            attackEntity(enemy, player); acted = true;
        } else if(dist < 5) {
            let dx = player.x > enemy.x ? 1 : (player.x < enemy.x ? -1 : 0);
            let dy = player.y > enemy.y ? 1 : (player.y < enemy.y ? -1 : 0);
            
            if(dx !== 0 && dy !== 0) {
                if(map[enemy.y + dy][enemy.x + dx] === 0 && !getEnemyAt(enemy.x + dx, enemy.y + dy)) {
                    enemy.x += dx; enemy.y += dy; acted = true;
                }
            }
            if(!acted && dx !== 0 && map[enemy.y][enemy.x + dx] === 0 && !getEnemyAt(enemy.x + dx, enemy.y)) {
                enemy.x += dx; acted = true;
            } else if(!acted && dy !== 0 && map[enemy.y + dy][enemy.x] === 0 && !getEnemyAt(enemy.x, enemy.y + dy)) {
                enemy.y += dy; acted = true;
            }
        }
    }
    updateFOV(); updateHUD();
}

function getEnemyAt(x, y) { return entities.find(e => e.x === x && e.y === y); }

// Rendering Loop
function renderLoop() {
    requestAnimationFrame(renderLoop);
    
    if (gameState === 'START' && !player) {
         ctx.fillStyle = '#111';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
         return;
    }
    
    // Interpolation for smooth movements
    if(player) {
        player.renderX += (player.x - player.renderX) * 0.3;
        player.renderY += (player.y - player.renderY) * 0.3;
        player.animOffsetX *= 0.6;
        player.animOffsetY *= 0.6;
        if(player.damageFlash > 0) player.damageFlash--;
    }
    
    entities.forEach(e => {
        e.renderX += (e.x - e.renderX) * 0.3;
        e.renderY += (e.y - e.renderY) * 0.3;
        e.animOffsetX *= 0.6;
        e.animOffsetY *= 0.6;
        if(e.damageFlash > 0) e.damageFlash--;
    });
    
    if(screenShake > 0.5) screenShake *= 0.8;
    else screenShake = 0;
    
    let shakeX = (Math.random() - 0.5) * screenShake * 5;
    let shakeY = (Math.random() - 0.5) * screenShake * 5;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if(map.length === 0) { ctx.restore(); return; }
    
    for(let y = 0; y < MAP_HEIGHT; y++) {
        for(let x = 0; x < MAP_WIDTH; x++) {
            if(!explored[y]?.[x]) continue;
            
            let isVisible = Math.hypot(player.x - x, player.y - y) <= 6;
            let drawX = x * TILE_SIZE; let drawY = y * TILE_SIZE;
            
            if (map[y][x] === 1) {
                ctx.fillStyle = isVisible ? '#2f3640' : '#1e272e';
                ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
                
                // Draw black line on boundaries with floors
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                if (y > 0 && map[y-1][x] === 0) { ctx.beginPath(); ctx.moveTo(drawX, drawY); ctx.lineTo(drawX + TILE_SIZE, drawY); ctx.stroke(); }
                if (y < MAP_HEIGHT-1 && map[y+1][x] === 0) { ctx.beginPath(); ctx.moveTo(drawX, drawY + TILE_SIZE); ctx.lineTo(drawX + TILE_SIZE, drawY + TILE_SIZE); ctx.stroke(); }
                if (x > 0 && map[y][x-1] === 0) { ctx.beginPath(); ctx.moveTo(drawX, drawY); ctx.lineTo(drawX, drawY + TILE_SIZE); ctx.stroke(); }
                if (x < MAP_WIDTH-1 && map[y][x+1] === 0) { ctx.beginPath(); ctx.moveTo(drawX + TILE_SIZE, drawY); ctx.lineTo(drawX + TILE_SIZE, drawY + TILE_SIZE); ctx.stroke(); }
                
            } else if (map[y][x] === 0) {
                ctx.fillStyle = isVisible ? '#353b48' : '#2f3640';
                ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
                if(isVisible && (x+y)%2===0) {
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
                }
            } else if (map[y][x] === 2) {
                ctx.fillStyle = '#1e272e';
                ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE); 
                if(isVisible) {
                    if (imgs.Stairs.complete && imgs.Stairs.naturalHeight !== 0) {
                        ctx.drawImage(imgs.Stairs, drawX, drawY, TILE_SIZE, TILE_SIZE);
                    } else {
                        // fallback
                        ctx.fillStyle = '#0a0a0a';
                        ctx.font = '24px Inter, sans-serif';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('🕳️', drawX + TILE_SIZE/2, drawY + TILE_SIZE/2);
                    }
                }
            }
        }
    }
    
    // Draw Items
    let time = Date.now() / 200;
    for(let item of items) {
        if(explored[item.y]?.[item.x]) {
            let isVisible = Math.hypot(player.x - item.x, player.y - item.y) <= 6;
            if(isVisible) {
                let bounce = Math.sin(time + item.x) * 4;
                ctx.fillStyle = item.color;
                ctx.font = '20px Arial';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(item.char, item.x * TILE_SIZE + TILE_SIZE/2, item.y * TILE_SIZE + 4 + TILE_SIZE/2 + bounce);
            }
        }
    }
    
    // Draw Entities
    for(let e of entities) {
        if(explored[Math.floor(e.renderY)]?.[Math.floor(e.renderX)]) {
            let isVisible = Math.hypot(player.x - e.x, player.y - e.y) <= 6;
            if(isVisible) {
                let rx = (e.renderX + e.animOffsetX) * TILE_SIZE;
                let ry = (e.renderY + e.animOffsetY) * TILE_SIZE;
                
                ctx.fillStyle = e.damageFlash > 0 ? '#fff' : e.color;
                ctx.font = e.isBoss ? '30px Arial' : '24px Arial';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(e.char, rx + TILE_SIZE/2, ry + TILE_SIZE/2);
                
                // HP Bar
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(rx + 4, ry + 2, TILE_SIZE - 8, 4);
                ctx.fillStyle = '#e84118';
                ctx.fillRect(rx + 4, ry + 2, (TILE_SIZE - 8) * (Math.max(0, e.hp) / e.maxHp), 4);
            }
        }
    }
    
    // Draw Player
    if (player && !player.dead) {
        let rx = (player.renderX + player.animOffsetX) * TILE_SIZE;
        let ry = (player.renderY + player.animOffsetY) * TILE_SIZE;
        
        if (player.damageFlash > 0) {
             // draw red overlay logic if we are using an image
             ctx.globalAlpha = 0.5;
             ctx.fillStyle = '#ff4757';
             ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
             ctx.globalAlpha = 1.0;
        }
        
        let pImg = imgs[player.className];
        if(pImg && pImg.complete && pImg.naturalHeight !== 0) {
             ctx.drawImage(pImg, rx, ry, TILE_SIZE, TILE_SIZE);
        } else {
             ctx.fillStyle = player.color;
             ctx.font = '24px Arial';
             ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
             ctx.fillText(player.char, rx + TILE_SIZE/2, ry + TILE_SIZE/2);
        }
    }
    
    // Draw Tooltip if hovering over valid coordinates
    if (mouseX >= 0 && mouseY >= 0 && gameState === 'PLAYING' && map.length > 0) {
        let gridX = Math.floor(mouseX / TILE_SIZE);
        let gridY = Math.floor(mouseY / TILE_SIZE);
        if (explored[gridY]?.[gridX]) {
            let tooltipText = "";
            let enemyHover = entities.find(e => e.x === gridX && e.y === gridY);
            if (enemyHover) {
                tooltipText = `${enemyHover.name} (HP: ${Math.max(0, enemyHover.hp)}/${enemyHover.maxHp}) | Atk: ${enemyHover.attack} | Def: ${enemyHover.defense}`;
            } else {
                let itemHover = items.find(i => i.x === gridX && i.y === gridY);
                if (itemHover) {
                    tooltipText = `${itemHover.name} `;
                    if(itemHover.type === 'consumable') tooltipText += `(Heal ${itemHover.heal})`;
                    else if(itemHover.type === 'weapon') tooltipText += `(+${itemHover.attack} Atk)`;
                    else if(itemHover.type === 'armor') tooltipText += `(+${itemHover.defense} Def)`;
                    else tooltipText += `(Stat+)`;
                }
            }
            
            if (tooltipText !== "") {
                ctx.fillStyle = 'rgba(0,0,0,0.85)';
                let tw = ctx.measureText(tooltipText).width + 20;
                let th = 30;
                
                // Keep tooltip on screen
                let drawTx = mouseX + 15;
                let drawTy = mouseY + 15;
                if (drawTx + tw > canvas.width) drawTx = canvas.width - tw - 5;
                if (drawTy + th > canvas.height) drawTy = canvas.height - th - 5;
                
                ctx.fillRoundedRect(drawTx, drawTy, tw, th, 5); // polyfill below
                ctx.fillStyle = '#fbc531';
                ctx.font = '14px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(tooltipText, drawTx + 10, drawTy + 15);
            }
        }
    }
    
    ctx.restore();
}

// Helper polyfill for round rect if missing
CanvasRenderingContext2D.prototype.fillRoundedRect = function(x, y, w, h, r) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    this.fill();
};

requestAnimationFrame(renderLoop);

// Input handling
document.addEventListener('keydown', (e) => {
    if(e.code === 'KeyI' || e.key === 'i') {
        if(gameState === 'PLAYING' || gameState === 'INVENTORY') toggleInventory();
        return;
    }
    if (gameState !== 'PLAYING') return;
    let acted = false;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') { movePlayer(0, -1); acted = true; }
    else if (e.code === 'KeyS' || e.code === 'ArrowDown') { movePlayer(0, 1); acted = true; }
    else if (e.code === 'KeyA' || e.code === 'ArrowLeft') { movePlayer(-1, 0); acted = true; }
    else if (e.code === 'KeyD' || e.code === 'ArrowRight') { movePlayer(1, 0); acted = true; }
    else if (e.code === 'Space') { skipTurn(); acted = true; }
    
    if (acted) e.preventDefault();
});
