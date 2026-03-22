const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiElement = document.getElementById('ui');
const scoreP1Element = document.getElementById('score-p1-val');
const scoreP2Element = document.getElementById('score-p2-val');
const scoreP2Box = document.getElementById('ui-p2');
const gameOverElement = document.getElementById('game-over');
const winnerTextElement = document.getElementById('winner-text');
const startScreenElement = document.getElementById('start-screen');

const gridSize = 20;
const tileCountX = canvas.width / gridSize;
const tileCountY = canvas.height / gridSize;

// Food Types
const FOOD_TYPES = [
    { type: 'normal', color: '#ff4757', grow: 1, points: 10, shadow: '#ff4757', prob: 0.7 },
    { type: 'golden', color: '#fbc531', grow: 3, points: 50, shadow: '#fbc531', prob: 0.15 },
    { type: 'shrink', color: '#9c88ff', grow: -2, points: -20, shadow: '#9c88ff', prob: 0.15 }
];

let player1, player2;
let foods = [];
let gameOver = false;
let isPaused = false;
let gameLoop;
let gameMode = 1; // 1 = Single Player, 2 = Two Players

function createPlayer(id, startX, startY, headColor, bodyColor) {
    let segments = [];
    for(let i=0; i<3; i++) {
        segments.push({ x: startX - (id === 1 ? i : -i), y: startY });
    }
    return {
        id,
        segments,
        dx: id === 1 ? 1 : -1,
        dy: 0,
        lastDx: id === 1 ? 1 : -1,
        lastDy: 0,
        score: 0,
        growPending: 0,
        headColor,
        bodyColor,
        dead: false
    };
}

// Called from HTML buttons
function startGameMode(mode) {
    gameMode = mode;
    startScreenElement.style.display = 'none';
    uiElement.style.display = 'flex';
    
    if (mode === 1) {
        scoreP2Box.style.display = 'none';
    } else {
        scoreP2Box.style.display = 'flex';
    }
    
    initGame();
}

function showMenu() {
    if (gameLoop) clearInterval(gameLoop);
    gameOverElement.style.display = 'none';
    uiElement.style.display = 'none';
    startScreenElement.style.display = 'flex';
    
    // Clear canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function initGame() {
    // Player 1 starts on the left. Player 2 (if present) uses Arrows, starts on the right.
    player1 = createPlayer(1, 10, 20, '#7bed9f', '#2ed573');
    
    if (gameMode === 2) {
        player2 = createPlayer(2, tileCountX - 11, 20, '#70a1ff', '#1e90ff');
    } else {
        player2 = null;
    }
    
    foods = [];
    spawnFood();
    if (gameMode === 2) spawnFood(); // more food for 2 players
    
    gameOver = false;
    isPaused = false;
    
    scoreP1Element.textContent = player1.score;
    if (player2) scoreP2Element.textContent = player2.score;
    
    gameOverElement.style.display = 'none';
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 100);
}

function togglePause() {
    if (gameOver || startScreenElement.style.display !== 'none') return;
    isPaused = !isPaused;
    
    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

function update() {
    if (gameOver || isPaused) return;

    // Movement
    movePlayer(player1);
    if (player2) movePlayer(player2);

    // Collisions
    checkCollisions();

    let p1Dead = player1.dead;
    let p2Dead = player2 ? player2.dead : false;

    if (p1Dead || p2Dead) {
        endGame();
        return;
    }

    // Food
    checkFoodExpiration();
    checkFood(player1);
    if (player2) checkFood(player2);

    // Update tails
    updateTail(player1);
    if (player2) updateTail(player2);

    draw();
}

function movePlayer(p) {
    p.lastDx = p.dx;
    p.lastDy = p.dy;
    const headX = p.segments[0].x + p.dx;
    const headY = p.segments[0].y + p.dy;
    p.segments.unshift({ x: headX, y: headY });
}

function updateTail(p) {
    if (p.growPending > 0) {
        p.growPending--;
    } else if (p.growPending < 0) {
        // Shrink (ensure minimum length is 3)
        let shrinkAmt = Math.min(-p.growPending, p.segments.length - 3);
        // We pop 1 for the normal move, plus `shrinkAmt` extra to reduce length
        for(let i=0; i<shrinkAmt + 1; i++) { 
            p.segments.pop(); 
        }
        p.growPending = 0;
    } else {
        p.segments.pop(); // Normal move
    }
}

function checkCollisions() {
    // Check Wall Collisions
    checkWallCollision(player1);
    if (player2) checkWallCollision(player2);

    // Head-to-Head & Player vs Player
    if (player2) {
        if (player1.segments[0].x === player2.segments[0].x && player1.segments[0].y === player2.segments[0].y) {
            player1.dead = true;
            player2.dead = true;
        }

        const p1HitP2 = checkBodyCollision(player1.segments[0], player2.segments);
        const p2HitP1 = checkBodyCollision(player2.segments[0], player1.segments);

        if (p1HitP2) player1.dead = true;
        if (p2HitP1) player2.dead = true;
    }

    // Check Self Collision (skip head)
    if (checkBodyCollision(player1.segments[0], player1.segments.slice(1))) player1.dead = true;
    if (player2 && checkBodyCollision(player2.segments[0], player2.segments.slice(1))) player2.dead = true;
}

function checkWallCollision(p) {
    const head = p.segments[0];
    if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
        p.dead = true;
    }
}

function checkBodyCollision(head, body) {
    for (let i = 0; i < body.length; i++) {
        if (head.x === body[i].x && head.y === body[i].y) {
            return true;
        }
    }
    return false;
}

function checkFood(p) {
    const head = p.segments[0];
    for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        if (head.x === f.x && head.y === f.y) {
            p.score += f.points;
            if (p.score < 0) p.score = 0; // Prevent negative score
            
            if (p.id === 1) scoreP1Element.textContent = p.score;
            if (p.id === 2 && player2) scoreP2Element.textContent = p.score;
            
            p.growPending += f.grow;
            foods.splice(i, 1);
            spawnFood();
        }
    }
}

function spawnFood() {
    let valid = false;
    let newFood;
    while (!valid) {
        newFood = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY)
        };
        valid = true;
        // Check if on players
        for (let seg of player1.segments) if (seg.x === newFood.x && seg.y === newFood.y) valid = false;
        if (player2) {
            for (let seg of player2.segments) if (seg.x === newFood.x && seg.y === newFood.y) valid = false;
        }
        // Check if on other food
        for (let f of foods) if (f.x === newFood.x && f.y === newFood.y) valid = false;
    }

    // Determine type based on probability
    const rand = Math.random();
    let cumulative = 0;
    let selectedType = FOOD_TYPES[0];
    for (const ft of FOOD_TYPES) {
        cumulative += ft.prob;
        if (rand < cumulative) {
            selectedType = ft;
            break;
        }
    }

    foods.push({
        x: newFood.x,
        y: newFood.y,
        ...selectedType,
        spawnTime: Date.now()
    });
}

function checkFoodExpiration() {
    const now = Date.now();
    for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        if (f.type !== 'normal' && (now - f.spawnTime > 8000)) {
            foods.splice(i, 1);
            spawnFood();
        }
    }
}

function draw() {
    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for(let i=0; i<=tileCountX; i++) {
        ctx.beginPath(); ctx.moveTo(i*gridSize, 0); ctx.lineTo(i*gridSize, canvas.height); ctx.stroke();
    }
    for(let i=0; i<=tileCountY; i++) {
        ctx.beginPath(); ctx.moveTo(0, i*gridSize); ctx.lineTo(canvas.width, i*gridSize); ctx.stroke();
    }

    // Draw Foods
    for (const f of foods) {
        const pulse = 2 * Math.sin(Date.now() / 200);
        ctx.fillStyle = f.color;
        ctx.shadowBlur = 10 + pulse;
        ctx.shadowColor = f.shadow;
        // Draw Circle
        ctx.beginPath();
        ctx.arc(f.x * gridSize + gridSize/2, f.y * gridSize + gridSize/2, gridSize/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Draw Players
    drawPlayer(player1);
    if (player2) drawPlayer(player2);
}

function drawPlayer(p) {
    p.segments.forEach((seg, index) => {
        const isHead = index === 0;
        ctx.fillStyle = isHead ? p.headColor : p.bodyColor;
        ctx.shadowBlur = isHead ? 15 : 5;
        ctx.shadowColor = isHead ? p.headColor : p.bodyColor;
        
        ctx.beginPath();
        // Rounded rectangles for segments
        ctx.roundRect(seg.x * gridSize + 2, seg.y * gridSize + 2, gridSize - 4, gridSize - 4, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw little eyes on head
        if (isHead) {
            ctx.fillStyle = '#fff';
            let eye1, eye2;
            const size = 3;
            // Determine eye positions based on direction
            const cX = seg.x * gridSize + gridSize/2;
            const cY = seg.y * gridSize + gridSize/2;
            const offset = 4;
            
            if (p.dx === 1) { // Right
                eye1 = {x: cX + 2, y: cY - offset};
                eye2 = {x: cX + 2, y: cY + offset};
            } else if (p.dx === -1) { // Left
                eye1 = {x: cX - 2, y: cY - offset};
                eye2 = {x: cX - 2, y: cY + offset};
            } else if (p.dy === 1) { // Down
                eye1 = {x: cX - offset, y: cY + 2};
                eye2 = {x: cX + offset, y: cY + 2};
            } else { // Up
                eye1 = {x: cX - offset, y: cY - 2};
                eye2 = {x: cX + offset, y: cY - 2};
            }
            
            ctx.beginPath(); ctx.arc(eye1.x, eye1.y, size, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2.x, eye2.y, size, 0, Math.PI*2); ctx.fill();

            // Black pupils
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(eye1.x + p.dx * 1.5, eye1.y + p.dy * 1.5, 1.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2.x + p.dx * 1.5, eye2.y + p.dy * 1.5, 1.5, 0, Math.PI*2); ctx.fill();
        }
    });
}

function endGame() {
    gameOver = true;
    clearInterval(gameLoop);
    
    let winnerText = "GAME OVER";
    let color = '#ff4757';
    
    if (gameMode === 2) {
        if (player1.dead && player2.dead) {
            winnerText = "IT'S A TIE!";
            color = '#fbc531';
        } else if (player1.dead) {
            winnerText = "PLAYER 2 WINS!";
            color = '#00a8ff';
        } else if (player2.dead) {
            winnerText = "PLAYER 1 WINS!";
            color = '#4cd137';
        }
    } else {
        winnerText = "SCORE: " + player1.score;
    }
    
    winnerTextElement.textContent = winnerText;
    winnerTextElement.style.color = color;
    gameOverElement.style.display = 'flex';
}

function resetGame() {
    initGame();
}

// Input handling
document.addEventListener('keydown', (e) => {
    // Prevent scrolling
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight", "w", "s", "a", "d", "W", "S", "A", "D"].indexOf(e.key) > -1 || e.code === 'Space') {
        e.preventDefault();
    }

    if (e.code === 'Space') {
        if (startScreenElement.style.display !== 'none') {
            // Do nothing, need to click
            return;
        }
        if (gameOver) {
            resetGame();
            return;
        }
        togglePause();
        return;
    }

    if (gameOver || isPaused || startScreenElement.style.display !== 'none') return;

    // Player 1
    if (gameMode === 1) {
        // Allow arrows or WASD for P1 in single player mode
        switch (e.key) {
            case 'w': case 'W': case 'ArrowUp': if (player1.lastDy !== 1) { player1.dx = 0; player1.dy = -1; } break;
            case 's': case 'S': case 'ArrowDown': if (player1.lastDy !== -1) { player1.dx = 0; player1.dy = 1; } break;
            case 'a': case 'A': case 'ArrowLeft': if (player1.lastDx !== 1) { player1.dx = -1; player1.dy = 0; } break;
            case 'd': case 'D': case 'ArrowRight': if (player1.lastDx !== -1) { player1.dx = 1; player1.dy = 0; } break;
        }
    } else {
        // Player 1 (WASD)
        switch (e.key) {
            case 'w': case 'W': if (player1.lastDy !== 1) { player1.dx = 0; player1.dy = -1; } break;
            case 's': case 'S': if (player1.lastDy !== -1) { player1.dx = 0; player1.dy = 1; } break;
            case 'a': case 'A': if (player1.lastDx !== 1) { player1.dx = -1; player1.dy = 0; } break;
            case 'd': case 'D': if (player1.lastDx !== -1) { player1.dx = 1; player1.dy = 0; } break;
        }

        // Player 2 (Arrows)
        switch (e.key) {
            case 'ArrowUp': if (player2.lastDy !== 1) { player2.dx = 0; player2.dy = -1; } break;
            case 'ArrowDown': if (player2.lastDy !== -1) { player2.dx = 0; player2.dy = 1; } break;
            case 'ArrowLeft': if (player2.lastDx !== 1) { player2.dx = -1; player2.dy = 0; } break;
            case 'ArrowRight': if (player2.lastDx !== -1) { player2.dx = 1; player2.dy = 0; } break;
        }
    }
});

// Polyfill for roundRect missing in older contexts
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  }
}

// Draw initial grid
ctx.fillStyle = '#111';
ctx.fillRect(0, 0, canvas.width, canvas.height);
