const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score-val');
const levelElement = document.getElementById('level-val');
const healthElement = document.getElementById('health-val');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');

// Game State
let gameStarted = false;
let gameOver = false;
let score = 0;
let level = 1;
let lastTime = 0;
let animationId;

// Input Handling
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    Space: false
};

// Entities
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 15,
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

    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.health = 100;
    player.cooldown = 0;
    player.powerups = { rapidFireTimer: 0, multiShotTimer: 0 };

    enemies = [];
    bullets = [];
    particles = [];
    powerups = [];

    enemySpawnTimer = 0;

    updateUI();
    gameOverElement.style.display = 'none';

    // Focus canvas to catch key events
    canvas.focus();

    if (animationId) cancelAnimationFrame(animationId);
    lastTime = performance.now();
    gameLoop(lastTime);
}

function startGame() {
    gameStarted = true;
}

window.resetGame = initGame; // Make globally accessible for HTML button

function updateUI() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
    healthElement.textContent = Math.max(0, Math.floor(player.health));
}

// ---------------------------
// Game Loop & Update Logic
// ---------------------------

function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000; // Delta time in seconds
    lastTime = timestamp;

    if (gameStarted && !gameOver) {
        update(dt);
    }

    draw();

    if (!gameStarted) {
        drawStartScreen();
    }

    animationId = requestAnimationFrame(gameLoop);
}

function update(dt) {
    // Player Movement
    let dx = 0;
    let dy = 0;
    if (keys.w || keys.ArrowUp) dy -= 1;
    if (keys.s || keys.ArrowDown) dy += 1;
    if (keys.a || keys.ArrowLeft) dx -= 1;
    if (keys.d || keys.ArrowRight) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
    }

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    // Clamp to bounds
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

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
        b.x += b.dx * b.speed * dt;
        b.y += b.dy * b.speed * dt;

        // Remove offscreen
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
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

        // Move towards player
        let edx = player.x - e.x;
        let edy = player.y - e.y;
        let dist = Math.sqrt(edx * edx + edy * edy);

        if (dist > 0) {
            e.x += (edx / dist) * e.speed * dt;
            e.y += (edy / dist) * e.speed * dt;
        }

        // Check collision with player
        if (dist < player.size + e.size) {
            player.health -= e.damage; // take instant damage
            updateUI();
            createParticles(e.x, e.y, e.color, 20); // asteroid explosion
            enemies.splice(i, 1); // asteroid destroyed on impact
            if (player.health <= 0) {
                triggerGameOver();
            }
            continue; // skip other updates for this enemy
        }

        // Check collision with bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            let bdx = b.x - e.x;
            let bdy = b.y - e.y;
            let bDist = Math.sqrt(bdx * bdx + bdy * bdy);

            if (bDist < e.size + b.size) {
                // Hit!
                e.health -= b.damage;
                bullets.splice(j, 1);
                createParticles(e.x, e.y, e.color, 5);

                if (e.health <= 0) {
                    // Enemy dies
                    createParticles(e.x, e.y, e.color, 20);
                    score += e.scoreValue;
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

        if (pDist < player.size + p.size) {
            // Apply powerup
            if (p.type === 'health') {
                player.health = Math.min(player.maxHealth, player.health + 30);
            } else if (p.type === 'rapidFire') {
                player.powerups.rapidFireTimer = 10;
            } else if (p.type === 'multiShot') {
                player.powerups.multiShotTimer = 10;
            }
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
        targetX = player.x + 1;
        targetY = player.y;
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

    if (edge === 0) { ex = Math.random() * canvas.width; ey = -30; } // top
    else if (edge === 1) { ex = canvas.width + 30; ey = Math.random() * canvas.height; } // right
    else if (edge === 2) { ex = Math.random() * canvas.width; ey = canvas.height + 30; } // bottom
    else { ex = -30; ey = Math.random() * canvas.height; } // left

    // Randomize enemy type slightly based on level
    let isFast = Math.random() < (level * 0.05);

    let offsets = [];
    let numPoints = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numPoints; i++) {
        offsets.push(0.7 + Math.random() * 0.6);
    }

    enemies.push({
        x: ex,
        y: ey,
        size: isFast ? 12 : 18,
        speed: isFast ? 220 : 130 + (level * 10),
        health: isFast ? 40 : 60 + (level * 15),
        damage: 15,
        scoreValue: isFast ? 20 : 10,
        color: isFast ? '#ff6b81' : '#ff4757',
        offsets: offsets,
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
        updateUI();
    }
}

function triggerGameOver() {
    gameOver = true;
    finalScoreElement.textContent = 'Score: ' + score;
    gameOverElement.style.display = 'flex';
}

// ---------------------------
// Drawing Logic
// ---------------------------

function draw() {
    // Clear & Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid (Retro feel)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw Powerups
    powerups.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        // Pulse effect
        let scale = 1 + Math.sin(performance.now() * 0.01) * 0.2;
        ctx.scale(scale, scale);
        // Rotate slowly
        ctx.rotate(performance.now() * 0.002);

        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;

        // Draw diamond
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });

    // Draw Particles
    particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.globalAlpha = 1;
    });

    // Draw Bullets
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Draw Enemies (Asteroids)
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(performance.now() * 0.001 * (e.rotSpeed || 1));

        ctx.fillStyle = '#222';
        ctx.shadowBlur = 10;
        ctx.shadowColor = e.color;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        if (e.offsets) {
            for (let i = 0; i < e.offsets.length; i++) {
                let angle = (i / e.offsets.length) * Math.PI * 2;
                let r = e.size * e.offsets[i];
                if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
        } else {
            ctx.arc(0, 0, e.size, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });

    // Draw Player (Round Spaceship)
    ctx.save();
    ctx.translate(player.x, player.y);

    // Find angle to closest enemy to rotate ship towards it
    if (enemies.length > 0) {
        let closest = enemies[0];
        let minDist = Infinity;
        for (let e of enemies) {
            let d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d < minDist) { minDist = d; closest = e; }
        }
        let angle = Math.atan2(closest.y - player.y, closest.x - player.x);
        ctx.rotate(angle);
    } else {
        // Rotate towards movement if moving, else default
        let mx = 0, my = 0;
        if (keys.w || keys.ArrowUp) my -= 1;
        if (keys.s || keys.ArrowDown) my += 1;
        if (keys.a || keys.ArrowLeft) mx -= 1;
        if (keys.d || keys.ArrowRight) mx += 1;

        if (mx !== 0 || my !== 0) {
            ctx.rotate(Math.atan2(my, mx));
        } else {
            // default facing right
        }
    }

    // Weapon barrel extending forward (Smaller, Black)
    ctx.fillStyle = '#050505';
    ctx.shadowBlur = 5;
    ctx.shadowColor = player.color;
    ctx.fillRect(player.size * 1.0, -player.size * 0.25, player.size * 0.8, player.size * 0.5);
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(player.size * 1.0, -player.size * 0.25, player.size * 0.8, player.size * 0.5);

    // Glowing Neon Rings Spaceship
    let pColor = player.color;
    
    // Outer glow base
    ctx.shadowBlur = 20;
    ctx.shadowColor = pColor;
    
    // Outer thick ring
    ctx.lineWidth = 3;
    ctx.strokeStyle = pColor;
    ctx.beginPath();
    ctx.arc(0, 0, player.size * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Middle ring with dots
    ctx.fillStyle = pColor;
    ctx.shadowBlur = 10;
    let numDots = 12;
    let dotRadius = player.size * 1.15;
    for (let i = 0; i < numDots; i++) {
        let a = (i / numDots) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * dotRadius, Math.sin(a) * dotRadius, player.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Inner thin solid ring
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, player.size * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    
    // Dark Core
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#020612';
    ctx.beginPath();
    ctx.arc(0, 0, player.size * 0.65, 0, Math.PI * 2);
    ctx.fill();
    
    // Sphere highlight on the dark core
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, player.size * 0.45, Math.PI + Math.PI/4, Math.PI + Math.PI/1.8);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(0, 0, player.size * 0.45, Math.PI + Math.PI/1.5, Math.PI + Math.PI/1.5 + 0.2);
    ctx.stroke();

    // Draw active powerup indicators
    if (player.powerups.rapidFireTimer > 0) {
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, player.size * 2, 0, Math.PI * 2); ctx.stroke();
    }
    if (player.powerups.multiShotTimer > 0) {
        ctx.strokeStyle = '#a29bfe';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, player.size * 2 + 4, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.restore();
}

function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00d2d3';
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00d2d3';
    ctx.fillText('PRESS SPACE TO START', canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.shadowBlur = 0;
    ctx.fillText('WASD / Arrows to Move | Space to shoot (Auto-targets!)', canvas.width / 2, canvas.height / 2 + 30);
}

// ---------------------------
// Input Listeners
// ---------------------------

window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (e.target === canvas) {
            e.preventDefault(); // only prevent default if we are focused on canvas
        }
    }

    if (!gameStarted && e.code === 'Space') {
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

// Start initially
initGame();
