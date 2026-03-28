const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const uiScore = document.getElementById('score-val');
const livesEls = [
    document.getElementById('life-0'),
    document.getElementById('life-1'),
    document.getElementById('life-2')
];
const screens = {
    start: document.getElementById('start-screen'),
    gameover: document.getElementById('gameover-screen'),
    victory: document.getElementById('victory-screen')
};

// Assets
const imgs = {
    bg: document.getElementById('bgImg'),
    dog: document.getElementById('dogSprite'),
    drone: document.getElementById('droneImg'),
    news: document.getElementById('newsImg'),
    tiles: document.getElementById('tilesImg')
};

// Game Constants
const TILE_SIZE = 50;
const GRAVITY = 1200; // px/s^2
const JUMP_VELOCITY = -500; // px/s
const RUN_SPEED = 300; // px/s
const CHUNK_WIDTH = TILE_SIZE;
const LEVEL_LENGTH = 150; // Total chunks
const FLOOR_Y = 450; // Starting floor height

// Input handling
const keys = {
    left: false, right: false, up: false, bark: false
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') keys.up = true;
    if (e.code === 'KeyE' || e.code === 'KeyB') keys.bark = true;
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') keys.up = false;
    if (e.code === 'KeyE' || e.code === 'KeyB') keys.bark = false;
});

// Game State
let gameState = 'start'; // start, playing, gameover, victory
let lastTime = 0;
let score = 0;
let lives = 3;
let cameraX = 0;

// World map: 0=empty, 1=ground, 2=toxic puddle, 3=wire, 4=drone start
let worldMap = [];
let entities = [];
let particles = [];

// Dog Entity
const dog = {
    x: 100,
    y: FLOOR_Y - TILE_SIZE * 2,
    vx: 0,
    vy: 0,
    width: 60,
    height: 48,
    isGrounded: false,
    facingRight: true,
    state: 'idle', // idle, run, jump, bark
    frame: 0,
    frameTimer: 0,
    barkCooldown: 0,
    barkActiveTimer: 0,
    invincibleTimer: 0,
    landingTimer: 0,
    wasGrounded: true
};

// Generators
function generateLevel() {
    worldMap = [];
    entities = [];
    
    // Starting safe zone
    for (let c = 0; c < 10; c++) worldMap[c] = 1;
    
    for (let c = 10; c < LEVEL_LENGTH - 5; c++) {
        // Randomly generate terrain
        if (Math.random() < 0.1 && c > 15 && worldMap[c-1] === 1) {
            worldMap[c] = 0; // Gap
        } else if (Math.random() < 0.15 && worldMap[c-1] === 1) {
            worldMap[c] = 2; // Toxic Puddle
        } else if (Math.random() < 0.1 && worldMap[c-1] === 1) {
            worldMap[c] = 3; // Broken Wire
        } else {
            worldMap[c] = 1; // Ground
            // Maybe spawn drone
            if (Math.random() < 0.1) {
                entities.push({
                    type: 'drone',
                    x: c * TILE_SIZE,
                    y: FLOOR_Y - TILE_SIZE * 2.0 - Math.random() * 30, // Lowered drones
                    vx: -100,
                    width: 50, height: 50,
                    stunned: 0
                });
            }
        }
    }
    
    // Ending safe zone
    for (let c = LEVEL_LENGTH - 5; c < LEVEL_LENGTH; c++) {
        worldMap[c] = 1;
    }
    
    // Goal
    entities.push({
        type: 'news',
        x: (LEVEL_LENGTH - 3) * TILE_SIZE,
        y: FLOOR_Y - TILE_SIZE - 20,
        width: 40, height: 40
    });
}

function initGame() {
    generateLevel();
    dog.x = 100;
    dog.y = 100;
    dog.vx = 0;
    dog.vy = 0;
    dog.state = 'idle';
    dog.barkActiveTimer = 0;
    dog.barkCooldown = 0;
    dog.invincibleTimer = 0;
    dog.landingTimer = 0;
    dog.wasGrounded = true;
    cameraX = 0;
    score = 0;
    lives = 3;
    uiScore.textContent = '0m';
    updateLivesUI();
    document.getElementById('news-hud').style.display = 'flex';
}

function updateLivesUI() {
    livesEls.forEach((el, index) => {
        if (index < lives) el.classList.remove('lost');
        else el.classList.add('lost');
    });
}

function hitDog() {
    if (dog.invincibleTimer > 0) return;
    lives--;
    updateLivesUI();
    dog.invincibleTimer = 1.5;
    dog.vy = -300; // Knockback
    dog.vx = -150;
    
    // Particles
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: dog.x + dog.width/2, y: dog.y + dog.height/2,
            vx: (Math.random()-0.5)*300, vy: (Math.random()-0.5)*300,
            life: 0.5 + Math.random(),
            color: '#ff4757', size: 4
        });
    }

    if (lives <= 0) {
        gameState = 'gameover';
        document.getElementById('go-score-val').textContent = Math.floor(dog.x / TILE_SIZE) + 'm';
        screens.gameover.classList.remove('hidden');
    }
}

// Update Loop
function update(dt) {
    if (gameState !== 'playing') return;
    
    // Dog States & Timers
    if (dog.invincibleTimer > 0) dog.invincibleTimer -= dt;
    if (dog.barkCooldown > 0) dog.barkCooldown -= dt;
    if (dog.barkActiveTimer > 0) dog.barkActiveTimer -= dt;
    if (dog.landingTimer > 0) {
        dog.landingTimer -= dt;
        dog.state = 'jump'; // Maintain jump state during landing
    }
    
    // Barking Action
    if (keys.bark && dog.barkCooldown <= 0 && dog.isGrounded) {
        dog.state = 'bark';
        dog.barkActiveTimer = 0.4;
        dog.barkCooldown = 1.0;
        dog.vx = 0; // Stop moving when barking
        
        // Bark hitbox
        let barkRect = {
            x: dog.facingRight ? dog.x + dog.width : dog.x - 120,
            y: dog.y - 60, // Raised hitbox reach
            width: 120, height: 140 // Taller hitbox
        };
        
        // Stun drones in range
        entities.forEach(ent => {
            if (ent.type === 'drone' && 
                ent.x < barkRect.x + barkRect.width && ent.x + ent.width > barkRect.x &&
                ent.y < barkRect.y + barkRect.height && ent.y + ent.height > barkRect.y) {
                ent.stunned = 3.0; // Stun for 3 seconds
                ent.vy = -100; // Little hop
                for(let i=0; i<5; i++) {
                    particles.push({
                        x: ent.x+25, y: ent.y+25,
                        vx: (Math.random()-0.5)*100, vy: (Math.random()-0.5)*100,
                        life: 0.5, color: '#00d2d3', size: 3
                    });
                }
            }
        });
    }
    
    // Movement if not barking
    if (dog.barkActiveTimer <= 0) {
        if (keys.left) {
            dog.vx = -RUN_SPEED;
            dog.facingRight = false;
            if (dog.isGrounded) dog.state = 'run';
        } else if (keys.right) {
            dog.vx = RUN_SPEED;
            dog.facingRight = true;
            if (dog.isGrounded) dog.state = 'run';
        } else {
            dog.vx = 0;
            if (dog.isGrounded) dog.state = 'idle';
        }

        // Jump
        if (keys.up && dog.isGrounded) {
            dog.vy = JUMP_VELOCITY;
            dog.isGrounded = false;
            dog.wasGrounded = false;
            dog.state = 'jump';
            dog.landingTimer = 0;
        }
    }
    
    // Flying State
    if (!dog.isGrounded && dog.barkActiveTimer <= 0) dog.state = 'jump';

    // Physics Update
    dog.vy += GRAVITY * dt;
    dog.x += dog.vx * dt;
    dog.y += dog.vy * dt;

    // Collision with World Map
    dog.isGrounded = false;
    
    // Prevent going back too far left
    if (dog.x < cameraX) dog.x = cameraX;

    // Basic tile collision
    let leftTile = Math.floor(dog.x / TILE_SIZE);
    let rightTile = Math.floor((dog.x + dog.width) / TILE_SIZE);
    let bottomTileY = FLOOR_Y;

    if (worldMap[leftTile] === 1 || worldMap[rightTile] === 1) {
        // Ground is here
        if (dog.y + dog.height >= bottomTileY && dog.vy >= 0) {
            if (!dog.wasGrounded) {
                dog.landingTimer = 0.15; // Show landing pose for 150ms
            }
            dog.y = bottomTileY - dog.height;
            dog.vy = 0;
            dog.isGrounded = true;
            dog.wasGrounded = true;
        }
    } else {
        // Fall into gap
        if (dog.y > canvas.height + 100) {
            dog.y = 0;
            dog.vy = 0;
            dog.x -= 200;
            dog.invincibleTimer = 0; // reset allowing hit
            hitDog();
        }
    }

    // Hazard collision
    if (dog.y + dog.height >= bottomTileY) {
        if (worldMap[leftTile] === 2 || worldMap[rightTile] === 2) {
            // Toxic puddle
            if (dog.y + dog.height >= bottomTileY) hitDog();
        }
        if (worldMap[leftTile] === 3 || worldMap[rightTile] === 3) {
            // Wire
            if (dog.y + dog.height >= bottomTileY - 10) hitDog();
        }
    }

    // Camera follow (keep player in middle-left)
    const targetCamX = dog.x - 200;
    if (targetCamX > cameraX) {
        cameraX += (targetCamX - cameraX) * 5 * dt; // Smooth follow
    }
    
    // Score update
    score = Math.max(score, Math.floor(dog.x / TILE_SIZE));
    uiScore.textContent = score + 'm';

    // Entities Logic
    for (let i = entities.length - 1; i >= 0; i--) {
        let e = entities[i];
        
        // Skip updating far away entities to save performance
        if (e.x > cameraX + 1000 || e.x < cameraX - 200) continue;

        if (e.type === 'drone') {
            if (e.stunned > 0) {
                e.stunned -= dt;
                e.vy += GRAVITY * dt; // Falls when stunned
                e.y += e.vy * dt;
                
                // Ground collision for stunned drone
                if (e.y + e.height > FLOOR_Y && worldMap[Math.floor(e.x/TILE_SIZE)] === 1) {
                    e.y = FLOOR_Y - e.height;
                    e.vy = 0;
                    e.vx = 0;
                }
                
                // Spark particles
                if (Math.random() < 0.2) {
                    particles.push({
                        x: e.x + e.width/2, y: e.y + e.height/2,
                        vx: (Math.random()-0.5)*50, vy: (Math.random()-0.5)*50,
                        life: 0.2, color: '#feca57', size: 2
                    });
                }
            } else {
                // Moving behavior
                e.vx = -120; // Fly left
                e.vy = Math.sin(Date.now()/300 + e.x) * 50; // Hover effect
                e.x += e.vx * dt;
                e.y += e.vy * dt;
            }

            // Player Collision (if drone not stunned)
            if (e.stunned <= 0) {
                if (dog.x < e.x + e.width - 10 && dog.x + dog.width - 10 > e.x &&
                    dog.y < e.y + e.height - 10 && dog.y + dog.height - 10 > e.y) {
                    hitDog();
                }
            }
        }
        
        if (e.type === 'news') {
            // Check Win
            if (dog.x < e.x + e.width && dog.x + dog.width > e.x &&
                dog.y < e.y + e.height && dog.y + dog.height > e.y) {
                gameState = 'victory';
                document.getElementById('win-score-val').textContent = score * 10;
                screens.victory.classList.remove('hidden');
            }
        }
    }
    
    // Particles update
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
    }
}

// Render Loop
function draw(dt) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw Parallax Background
    if (imgs.bg && imgs.bg.complete) {
        // bg scroll ratio
        const bgRatio = 0.2;
        let bgOffset = -(cameraX * bgRatio) % imgs.bg.width;
        // draw multiple wrapping bgs
        ctx.drawImage(imgs.bg, bgOffset, 0, imgs.bg.width, canvas.height);
        ctx.drawImage(imgs.bg, bgOffset + imgs.bg.width, 0, imgs.bg.width, canvas.height);
    } else {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.save();
    ctx.translate(-cameraX, 0);
    
    // 2. Map (Tiles)
    const startTile = Math.max(0, Math.floor(cameraX / TILE_SIZE));
    const endTile = Math.min(LEVEL_LENGTH, startTile + Math.ceil(canvas.width / TILE_SIZE) + 1);
    
    for (let c = startTile; c < endTile; c++) {
        let type = worldMap[c];
        let tx = c * TILE_SIZE;
        let ty = FLOOR_Y;
        
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        
        if (type === 1) { // Ground
            ctx.fillStyle = '#1e272e';
            ctx.fillRect(tx, ty, TILE_SIZE+1, canvas.height - ty);
            // Top highlight
            ctx.fillStyle = '#485460';
            ctx.fillRect(tx, ty, TILE_SIZE+1, 10);
            
            // Neon edge on some blocks
            if (c % 5 === 0) {
                ctx.fillStyle = '#00d2d3';
                ctx.fillRect(tx, ty+10, TILE_SIZE, 4);
                ctx.shadowColor = '#00d2d3';
                ctx.shadowBlur = 10;
                ctx.fillRect(tx, ty+10, TILE_SIZE, 4);
                ctx.shadowBlur = 0;
            }
        } else if (type === 2) { // Tox puddle
            // Ground below
            ctx.fillStyle = '#1e272e';
            ctx.fillRect(tx, ty+15, TILE_SIZE+1, canvas.height - ty - 15);
            // Puddle top
            ctx.fillStyle = '#10ac84';
            ctx.fillRect(tx, ty, TILE_SIZE+1, 15); // Liquid
            
            // Bubbles
            if(Math.random()<0.05) {
                particles.push({
                    x: tx + Math.random()*TILE_SIZE, y: ty+15,
                    vx: 0, vy: -50 - Math.random()*20,
                    life: 0.5, color: '#10ac84', size: Math.random()*4+2
                });
            }
            
            ctx.shadowColor = '#10ac84';
            ctx.shadowBlur = 15;
            ctx.fillRect(tx, ty, TILE_SIZE, 5);
            ctx.shadowBlur = 0;
            
        } else if (type === 3) { // Broken wire
            ctx.fillStyle = '#1e272e';
            ctx.fillRect(tx, ty, TILE_SIZE+1, canvas.height - ty);
            
            // Wire protruding
            ctx.strokeStyle = '#2f3542';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(tx + 20, ty);
            ctx.lineTo(tx + 25, ty - 20);
            ctx.lineTo(tx + 15, ty - 30);
            ctx.stroke();
            
            // Sparks
            if(Math.random()<0.1) {
                particles.push({
                    x: tx+15, y: ty-30,
                    vx: (Math.random()-0.5)*100, vy: (Math.random()-0.5)*100,
                    life: 0.15, color: '#ffd32a', size: 2
                });
            }
        }
    }

    // 3. Entities
    entities.forEach(e => {
        if (e.x > cameraX + 1000 || e.x < cameraX - 200) return;
        
        if (e.type === 'drone') {
            if (e.stunned > 0) {
                ctx.filter = 'grayscale(100%)';
            }
            if (imgs.drone && imgs.drone.complete) {
                ctx.drawImage(imgs.drone, e.x, e.y, e.width, e.height);
            } else {
                ctx.fillStyle = '#ff4757';
                ctx.fillRect(e.x, e.y, e.width, e.height);
            }
            ctx.filter = 'none';
        } else if (e.type === 'news') {
            if (imgs.news && imgs.news.complete) {
                ctx.drawImage(imgs.news, e.x, e.y, e.width, e.height);
            } else {
                ctx.fillStyle = '#fff';
                ctx.fillRect(e.x, e.y, e.width, e.height);
            }
            // Glow effect
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(e.x-5, e.y-5, e.width+10, e.height+10);
            ctx.shadowBlur = 0;
        }
    });
    
    // 4. Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.shadowBlur = 0;
    });

    // 5. Dog
    if (dog.invincibleTimer > 0 && Math.floor(Date.now()/100) % 2 === 0) {
        // Blink if invincible
    } else {
        // Draw Sprite
        let dw = dog.width;
        let dh = dog.height;
        let dx = dog.x;
        let dy = dog.y;
        
        ctx.save();
        if (!dog.facingRight) {
            ctx.translate(dx + dw, dy);
            ctx.scale(-1, 1);
            dx = 0; dy = 0; // Relative to new origin
        } else {
            ctx.translate(dx, dy);
            dx = 0; dy = 0;
        }
        
        // Very basic simple sprite rect fallback if sheet missing
        if (imgs.dog && imgs.dog.complete) {
            // Dog Sprite is complex, this isolates a portion based on state. 
            // Usually we'd map exactly to the grid size. Assuming 4 rows (Idle, Run, Jump, Bark)
            // Let's guess grid size roughly
            const cols = 5;
            const rows = 4;
            const sw = imgs.dog.width / cols;
            const sh = imgs.dog.height / rows;
            
            let row = 0;
            if (dog.state === 'run') row = 1;
            else if (dog.state === 'jump') row = 2;
            else if (dog.state === 'bark') row = 3;
            
            // Animate frame
            let framesInRow = 5; // New spritesheet is a clean 5x4 grid
            let frameIdx = 0;

            if (row === 1) { // Running
                dog.frameTimer += 1.2 * dt; // Sync with movement
                frameIdx = Math.floor(dog.frameTimer * 10) % framesInRow;
            } else if (row === 2) { // Jumping/Landing
                if (dog.landingTimer > 0) {
                    frameIdx = 4; // Landing pose
                } else if (dog.vy > 250) {
                    frameIdx = 3; // Falling
                } else if (dog.vy > -150) {
                    frameIdx = 2; // Apex
                } else {
                    frameIdx = 1; // Jumping up
                }
            } else if (row === 3) { // Barking
                dog.frameTimer += dt;
                frameIdx = Math.floor(dog.frameTimer * 10) % 4;
            } else { // Idle
                dog.frameTimer += dt;
                frameIdx = Math.floor(dog.frameTimer * 4) % 5;
            }
            
            // Adjust to draw fully covering the hit box
            let drawRatioX = dw / sw * 1.6; // Slightly larger for aesthetics
            let drawRatioY = dh / sh * 1.6;
            
            let offsetY = -15;
            if (row === 3) offsetY -= 12; // Fix sinking during bark
            
            ctx.drawImage(imgs.dog, frameIdx * sw, row * sh, sw, sh, -15, offsetY, sw*drawRatioX, sh*drawRatioY);
            
        } else {
            ctx.fillStyle = '#e1b12c';
            ctx.fillRect(dx, dy, dw, dh);
        }
        
        // Draw Bark Effect
        if (dog.barkActiveTimer > 0) {
            ctx.strokeStyle = `rgba(0, 210, 211, ${dog.barkActiveTimer*2.5})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(dx + dw, dy + dh/2, 60 + (0.4 - dog.barkActiveTimer)*200, -Math.PI/4, Math.PI/4);
            ctx.stroke();
            
            ctx.shadowColor = '#00d2d3';
            ctx.shadowBlur = 20;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }
    
    ctx.restore();
}

// Game Loop
function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    // Prevent huge dt jumps when returning to tab
    if (dt > 0.1) dt = 0.016; 
    
    update(dt);
    draw(dt);
    
    requestAnimationFrame(gameLoop);
}

// Controls
function startGame() {
    screens.start.classList.add('hidden');
    initGame();
    gameState = 'playing';
}

function restartGame() {
    screens.gameover.classList.add('hidden');
    screens.victory.classList.add('hidden');
    initGame();
    gameState = 'playing';
}

// Start Loop
requestAnimationFrame((timestamp) => {
    lastTime = timestamp;
    gameLoop(timestamp);
});
