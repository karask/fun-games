import { createClock, movePlayer, segmentHitsCircle } from './physics.mjs';
import { drawArena } from './renderer.mjs';
import { isHighScore, saveHighScore, generateLeaderboardHTML } from '../../assets/highscore.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WORLD_W = 800, WORLD_H = 600;
const clock = createClock();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scoreElement = document.getElementById('score-val');
const levelElement = document.getElementById('level-val');
const healthElement = document.getElementById('health-val');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const startScreenElement = document.getElementById('start-screen');
const startLeaderboardElement = document.getElementById('start-leaderboard');
const gameOverLeaderboardElement = document.getElementById('game-over-leaderboard');
const hsInputSection = document.getElementById('hs-input-section');
const hsInitials = document.getElementById('hs-initials');
const hsSubmitBtn = document.getElementById('hs-submit-btn');
const mainMenuBtn = document.getElementById('main-menu-btn');

// Game State
let gameStarted = false;
let gameOver = false;
let score = 0;
let level = 1;
let lastTime = 0;
let animationId;
let paused = false;
let elapsed = 0;
let effectTime = 0;
let damageFlash = 0;
let announcement = '';
let announcementTime = 0;
let trailTimer = 0;
let labels = [];
const pauseOverlay = document.getElementById('pause-screen');
const pauseButton = document.getElementById('pause-btn');
function clearKeys() { for (const key of Object.keys(keys)) keys[key] = false; }
function announce(text) { announcement = text; announcementTime = 2; }
function setPaused(value) {
    if (!gameStarted || gameOver) return;
    paused = value;
    clearKeys(); clock.reset(); lastTime = performance.now();
    pauseOverlay.hidden = !paused;
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    if (paused) document.getElementById('resume-btn').focus();
    else canvas.focus();
}
function dash() {
    if (!gameStarted || gameOver || paused || player.dashCooldown > 0) return;
    let dx = Number(keys.d || keys.ArrowRight) - Number(keys.a || keys.ArrowLeft);
    let dy = Number(keys.s || keys.ArrowDown) - Number(keys.w || keys.ArrowUp);
    const length = Math.hypot(dx, dy);
    player.dashX = length ? dx / length : player.aimX;
    player.dashY = length ? dy / length : player.aimY;
    player.dashTime = .16;
    player.dashCooldown = 2;
    player.invulnerable = Math.max(player.invulnerable, .22);
    createParticles(player.x, player.y, '#69fff1', 12);
}

// Input Handling
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    Space: false
};

// Entities
let player = {
    x: WORLD_W / 2,
    y: WORLD_H / 2,
    size: 15,
    vx: 0, vy: 0, aimX: 1, aimY: 0,
    dashTime: 0, dashCooldown: 0, invulnerable: 0,
    speed: 250, // pixels per second
    color: '#00d2d3',
    health: 100,
    maxHealth: 100,
    cooldown: 0,
    fireRate: 0.2, // seconds between shots
    powerups: {
        rapidFireTimer: 0,
        multiShotTimer: 0
    }
};

let enemies = [];
let bullets = [];
let particles = [];
let powerups = [];

let enemySpawnTimer = 0;
let baseEnemySpawnRate = 1.0; // seconds

function initGame() {
    gameStarted = false;
    gameOver = false;
    score = 0;
    level = 1;
    paused = false; elapsed = 0; effectTime = 0; damageFlash = 0;
    labels = []; trailTimer = 0;
    clearKeys(); clock.reset();
    pauseOverlay.hidden = true;
    pauseButton.textContent = 'Pause';
    announce('ARENA ONLINE');
    player.vx = 0; player.vy = 0; player.aimX = 1; player.aimY = 0;
    player.dashTime = 0; player.dashCooldown = 0; player.invulnerable = 0;

    player.x = WORLD_W / 2;
    player.y = WORLD_H / 2;
    player.health = 100;
    player.cooldown = 0;
    player.powerups = { rapidFireTimer: 0, multiShotTimer: 0 };

    enemies = [];
    bullets = [];
    particles = [];
    powerups = [];

    enemySpawnTimer = 1;

    updateUI();
    gameOverElement.style.display = 'none';

    // Focus canvas to catch key events
    canvas.focus();

    if (animationId) cancelAnimationFrame(animationId);
    lastTime = performance.now();
    gameLoop(lastTime);
}

function startGame() {
    startScreenElement.style.display = 'none';
    initGame();
    gameStarted = true;
}
window.startGame = startGame;

function showMenu() {
    gameStarted = false;
    gameOver = false;
    gameOverElement.style.display = 'none';
    paused = false; pauseOverlay.hidden = true; clearKeys();
    startScreenElement.style.display = 'flex';
    startLeaderboardElement.innerHTML = generateLeaderboardHTML('survival');

    // Clear canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    document.querySelector('.start-button').focus();
}
window.showMenu = showMenu;

function updateUI() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
    healthElement.textContent = Math.max(0, Math.floor(player.health));
    document.getElementById('health-meter').value = player.health;
    document.getElementById('time-val').textContent = Math.floor(elapsed / 60) + ':' + String(Math.floor(elapsed % 60)).padStart(2, '0');
    document.getElementById('dash-status').textContent = player.dashCooldown > 0 ? 'DASH ' + player.dashCooldown.toFixed(1) + 's' : 'DASH READY';
    document.getElementById('dash-meter').value = 2 - player.dashCooldown;
    document.getElementById('level-meter').value = score % 200;
    document.getElementById('powerup-status').textContent = [
        player.powerups.rapidFireTimer > 0 ? 'RAPID ' + Math.ceil(player.powerups.rapidFireTimer) + 's' : '',
        player.powerups.multiShotTimer > 0 ? 'TRIPLE ' + Math.ceil(player.powerups.multiShotTimer) + 's' : ''
    ].filter(Boolean).join(' · ');
}

// ---------------------------
// Game Loop & Update Logic
// ---------------------------

function gameLoop(timestamp) {
    const dt = Math.max(0, (timestamp - lastTime) / 1000);
    lastTime = timestamp;
    if (gameStarted && !gameOver && !paused) {
        clock.advance(dt, step => {
            if (!gameOver) update(step);
        });
        updateUI();
    }
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function update(dt) {
    elapsed += dt;
    effectTime += dt;
    announcementTime = Math.max(0, announcementTime - dt);
    damageFlash = Math.max(0, damageFlash - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    const dx = Number(keys.d || keys.ArrowRight) - Number(keys.a || keys.ArrowLeft);
    const dy = Number(keys.s || keys.ArrowDown) - Number(keys.w || keys.ArrowUp);
    movePlayer(player, dx, dy, dt, WORLD_W, WORLD_H);
    player.dashTime = Math.max(0, player.dashTime - dt);
    trailTimer -= dt;
    if (trailTimer <= 0 && Math.hypot(player.vx, player.vy) > 30) {
        trailTimer = .025;
        particles.push({x:player.x, y:player.y, dx:0, dy:0, speed:0,
            life:.25, maxLife:.25, color:'#65ede5', size:player.dashTime > 0 ? 10 : 3});
    }
    for (const label of labels) { label.y -= 22 * dt; label.life -= dt; }
    labels = labels.filter(label => label.life > 0);

    // Powerup Timers
    if (player.powerups.rapidFireTimer > 0) player.powerups.rapidFireTimer -= dt;
    if (player.powerups.multiShotTimer > 0) player.powerups.multiShotTimer -= dt;

    // Player Shooting
    if (player.cooldown > 0) player.cooldown -= dt;

    if (keys.Space && player.cooldown <= 0) {
        shoot();
        const fireRateMod = player.powerups.rapidFireTimer > 0 ? 0.4 : 1;
        player.cooldown = player.fireRate * fireRateMod;
    }

    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.previousX = b.x; b.previousY = b.y;
        b.x += b.dx * b.speed * dt;
        b.y += b.dy * b.speed * dt;

        // Keep a margin so an edge collision is resolved before removal.
        if (b.x < -60 || b.x > WORLD_W + 60 || b.y < -60 || b.y > WORLD_H + 60) {
            bullets.splice(i, 1);
        }
    }

    // Spawn Enemies
    enemySpawnTimer -= dt;
    let currentSpawnRate = Math.max(0.2, baseEnemySpawnRate - (level * 0.05));
    if (enemySpawnTimer <= 0) {
        spawnEnemy();
        enemySpawnTimer = currentSpawnRate;
    }

    // Update Enemies & Check Collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];

        e.hitFlash = Math.max(0, e.hitFlash - dt);
        e.rotation += e.rotSpeed * dt;
        if (e.spawnTime > 0) { e.spawnTime -= dt; continue; }
        // Move towards player
        let edx = player.x - e.x;
        let edy = player.y - e.y;
        let dist = Math.sqrt(edx * edx + edy * edy);

        if (dist > 0) {
            e.x += (edx / dist) * e.speed * dt;
            e.y += (edy / dist) * e.speed * dt;
        }

        // Use positions after movement and allow a brief recovery after a hit.
        dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < player.size + e.size && player.invulnerable <= 0) {
            player.health = Math.max(0, player.health - e.damage);
            player.invulnerable = .85;
            damageFlash = .25;
            labels.push({x:player.x,y:player.y-28,text:'−'+e.damage,color:'#ff91a4',life:.8});
            updateUI();
            createParticles(e.x, e.y, e.color, 20); // asteroid explosion
            enemies.splice(i, 1); // asteroid destroyed on impact
            if (player.health <= 0) {
                triggerGameOver();
                return;
            }
            continue; // skip other updates for this enemy
        }

        // Check collision with bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (segmentHitsCircle(b.previousX, b.previousY, b.x, b.y, e.x, e.y, e.size + b.size)) {
                // Hit!
                e.health -= b.damage;
                e.hitFlash = .09;
                bullets.splice(j, 1);
                createParticles(e.x, e.y, e.color, 5);

                if (e.health <= 0) {
                    // Enemy dies
                    createParticles(e.x, e.y, e.color, 20);
                    score += e.scoreValue;
                    labels.push({x:e.x,y:e.y,text:'+'+e.scoreValue,color:'#a4eee3',life:.7});
                    checkLevelUp();
                    updateUI();

                    // Drop chance - increases with difficulty (level)
                    let dropChance = 0.1 + (level * 0.03); // Base 13% at lvl 1, +3% per level
                    if (Math.random() < Math.min(0.5, dropChance)) spawnPowerup(e.x, e.y);

                    enemies.splice(i, 1);
                    break;
                }
            }
        }
    }

    // Update Powerups & Check Collisions
    for (let i = powerups.length - 1; i >= 0; i--) {
        let p = powerups[i];
        p.life -= dt;

        if (p.life <= 0) {
            powerups.splice(i, 1);
            continue;
        }

        let pdx = player.x - p.x;
        let pdy = player.y - p.y;
        let pDist = Math.sqrt(pdx * pdx + pdy * pdy);

        if (pDist < 90 && pDist > 0) {
            const pull = Math.min(pDist, 180 * dt);
            p.x += pdx / pDist * pull; p.y += pdy / pDist * pull;
        }
        if (pDist < player.size + p.size) {
            // Apply powerup
            if (p.type === 'health') {
                player.health = Math.min(player.maxHealth, player.health + 30);
            } else if (p.type === 'rapidFire') {
                player.powerups.rapidFireTimer = 10;
            } else if (p.type === 'multiShot') {
                player.powerups.multiShotTimer = 10;
            }
            labels.push({x:p.x,y:p.y-20,text:p.type === 'health' ? '+30 HP' : p.type === 'rapidFire' ? 'RAPID FIRE' : 'TRIPLE SHOT',color:p.color,life:1});
            createParticles(p.x, p.y, p.color, 15);
            powerups.splice(i, 1);
            updateUI();
        }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.dx * p.speed * dt;
        p.y += p.dy * p.speed * dt;
        p.life -= dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function shoot() {
    let targetX, targetY;

    // Find closest enemy
    if (enemies.length > 0) {
        let closest = enemies[0];
        let minDist = Infinity;

        for (let e of enemies) {
            let dist = Math.hypot(e.x - player.x, e.y - player.y);
            if (dist < minDist) {
                minDist = dist;
                closest = e;
            }
        }

        targetX = closest.x;
        targetY = closest.y;
    } else {
        // Default shoot straight right if no enemies
        targetX = player.x + player.aimX;
        targetY = player.y + player.aimY;
    }

    let dx = targetX - player.x;
    let dy = targetY - player.y;
    let dist = Math.hypot(dx, dy);

    if (dist > 0) {
        dx /= dist;
        dy /= dist;
    }

    const isMulti = player.powerups.multiShotTimer > 0;
    const bulletCount = isMulti ? 3 : 1;
    const spreadAngle = 0.2; // roughly 11 degrees

    let baseAngle = Math.atan2(dy, dx);

    for (let i = 0; i < bulletCount; i++) {
        let angle = baseAngle;
        if (isMulti) {
            angle = baseAngle - spreadAngle + (i * spreadAngle);
        }

        bullets.push({
            x: player.x,
            y: player.y,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            speed: 600,
            size: 4,
            damage: 25,
            color: '#fff'
        });
    }
}

function spawnEnemy() {
    // Determine spawn location outside canvas
    let edge = Math.floor(Math.random() * 4);
    let ex, ey;

    if (edge === 0) { ex = Math.random() * WORLD_W; ey = -30; } // top
    else if (edge === 1) { ex = WORLD_W + 30; ey = Math.random() * WORLD_H; } // right
    else if (edge === 2) { ex = Math.random() * WORLD_W; ey = WORLD_H + 30; } // bottom
    else { ex = -30; ey = Math.random() * WORLD_H; } // left

    // Randomize enemy type slightly based on level
    let isFast = Math.random() < Math.min(.45, level * 0.05);

    enemies.push({
        x: ex,
        y: ey,
        size: isFast ? 12 : 18,
        speed: isFast ? 220 : Math.min(190, 120 + (level * 7)),
        health: isFast ? 40 : Math.min(240, 60 + (level * 12)),
        maxHealth: isFast ? 40 : Math.min(240, 60 + (level * 12)),
        isFast, spawnTime: .65, rotation: 0, hitFlash: 0,
        damage: 15,
        scoreValue: isFast ? 20 : 10,
        color: isFast ? '#ffc875' : '#ff607f',
        rotSpeed: (Math.random() - 0.5) * 5
    });
}

function spawnPowerup(x, y) {
    const types = [
        { type: 'health', color: '#7bed9f' },
        { type: 'rapidFire', color: '#ffea00' },
        { type: 'multiShot', color: '#a29bfe' }
    ];
    let pick = types[Math.floor(Math.random() * types.length)];

    powerups.push({
        x: x,
        y: y,
        type: pick.type,
        color: pick.color,
        size: 10,
        life: 10 // disappears after 10 seconds
    });
}

function createParticles(x, y, color, count) {
    count = Math.min(count, Math.max(0, 400 - particles.length));
    for (let i = 0; i < count; i++) {
        let angle = Math.random() * Math.PI * 2;
        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            speed: Math.random() * 150 + 50,
            life: Math.random() * 0.3 + 0.1,
            maxLife: 0.4,
            color: color
        });
    }
}

function checkLevelUp() {
    let nextLevelScore = level * 200;
    if (score >= nextLevelScore) {
        level++;
        announce('LEVEL ' + level + ' · THREAT RISING');
        updateUI();
    }
}

function triggerGameOver() {
    gameOver = true;
    clearKeys();
    finalScoreElement.textContent = score + ' points · Level ' + level + ' · ' + Math.floor(elapsed) + 's survived';

    // High Score logic
    if (isHighScore('survival', score)) {
        mainMenuBtn.style.display = 'none';
        document.getElementById('retry-btn').hidden = true;
        gameOverLeaderboardElement.style.display = 'none';
        hsInputSection.style.display = 'flex';
        hsInitials.value = '';

        hsSubmitBtn.onclick = () => {
            const initials = hsInitials.value.trim().toUpperCase().substring(0, 3);
            if (initials.length > 0) {
                saveHighScore('survival', initials, score);
                showPostGameLeaderboard();
            }
        };
    } else {
        showPostGameLeaderboard();
    }

    gameOverElement.style.display = 'flex';
    if (hsInputSection.style.display !== 'none') hsInitials.focus();
    else mainMenuBtn.focus();
}

function showPostGameLeaderboard() {
    hsInputSection.style.display = 'none';
    mainMenuBtn.style.display = 'block';
    document.getElementById('retry-btn').hidden = false;
    gameOverLeaderboardElement.style.display = 'block';
    gameOverLeaderboardElement.innerHTML = generateLeaderboardHTML('survival');
    document.getElementById('retry-btn').focus();
}

// ---------------------------
// Drawing Logic
// ---------------------------

function draw() {
    drawArena(ctx, { player, enemies, bullets, particles, powerups, labels,
        time: effectTime, damageFlash, announcement, announcementTime,
        reducedMotion: reducedMotion.matches });
}

function resizeCanvas() {
    const scale = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = WORLD_W * scale;
    canvas.height = WORLD_H * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ---------------------------
// Input Listeners
// ---------------------------

window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (gameStarted && !gameOver && ['KeyP', 'Escape'].includes(e.code)) {
        e.preventDefault(); if (!e.repeat) setPaused(!paused); return;
    }
    if (gameStarted && !gameOver && !paused && ['ShiftLeft', 'ShiftRight'].includes(e.code)) {
        e.preventDefault(); if (!e.repeat) dash(); return;
    }
    if (paused || gameOver) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (gameStarted || e.target === canvas) {
            e.preventDefault(); // Keep gameplay keys from scrolling the page.
        }
    }

    if (!gameStarted && e.code === 'Space' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        if (!gameOver) {
            startGame();
        }
        return;
    }

    if (e.key === 'w' || e.key === 'W') keys.w = true;
    if (e.key === 'a' || e.key === 'A') keys.a = true;
    if (e.key === 's' || e.key === 'S') keys.s = true;
    if (e.key === 'd' || e.key === 'D') keys.d = true;
    if (e.code === 'ArrowUp') keys.ArrowUp = true;
    if (e.code === 'ArrowDown') keys.ArrowDown = true;
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') keys.Space = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') keys.w = false;
    if (e.key === 'a' || e.key === 'A') keys.a = false;
    if (e.key === 's' || e.key === 'S') keys.s = false;
    if (e.key === 'd' || e.key === 'D') keys.d = false;
    if (e.code === 'ArrowUp') keys.ArrowUp = false;
    if (e.code === 'ArrowDown') keys.ArrowDown = false;
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

pauseButton.addEventListener('click', () => setPaused(!paused));
document.getElementById('retry-btn').addEventListener('click', startGame);
document.getElementById('skip-score-btn').addEventListener('click', showPostGameLeaderboard);
document.getElementById('resume-btn').addEventListener('click', () => setPaused(false));
document.getElementById('pause-menu-btn').addEventListener('click', showMenu);
window.addEventListener('blur', () => { clearKeys(); setPaused(true); });
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearKeys(); setPaused(true); }
});

// Setup Initial Screen
startLeaderboardElement.innerHTML = generateLeaderboardHTML('survival');

// Setup Initials input handler
hsInitials.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
        hsSubmitBtn.click();
    }
});

// Start loop but don't play
if (animationId) cancelAnimationFrame(animationId);
lastTime = performance.now();
gameLoop(lastTime);
