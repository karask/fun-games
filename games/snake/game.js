const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score-val');
const gameOverElement = document.getElementById('game-over');

// Game constants
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game state
let snake = [];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let lastDx = 0;
let lastDy = 0;
let score = 0;
let gameOver = false;
let gameStarted = false;
let gameLoop;

function initGame() {
    snake = [{ x: 10, y: 10 }];
    dx = 1;
    dy = 0;
    lastDx = 1;
    lastDy = 0;
    score = 0;
    gameOver = false;
    gameStarted = false;
    scoreElement.textContent = score;
    gameOverElement.style.display = 'none';
    spawnFood();
    
    if (gameLoop) clearInterval(gameLoop);
    drawStartScreen();
}

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 100);
}

function drawStartScreen() {
    draw();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#4cd137';
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#4cd137';
    ctx.fillText('PRESS SPACE TO START', canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
}

function update() {
    if (gameOver) return;

    // Record actual movement direction
    lastDx = dx;
    lastDy = dy;

    // Calculate new head position
    const headX = snake[0].x + dx;
    const headY = snake[0].y + dy;

    // Check collisions
    if (headX < 0 || headX >= tileCount || headY < 0 || headY >= tileCount) {
        endGame();
        return;
    }

    // Check self collision (skip the last tail piece which will move)
    for (let i = 0; i < snake.length - 1; i++) {
        if (headX === snake[i].x && headY === snake[i].y) {
            endGame();
            return;
        }
    }

    // Move snake
    snake.unshift({ x: headX, y: headY });

    // Check food collision
    if (headX === food.x && headY === food.y) {
        score += 10;
        scoreElement.textContent = score;
        spawnFood();
    } else {
        snake.pop(); // Remove tail if no food eaten
    }

    draw();
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines (optional, for retro feel)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for(let i=0; i<tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i*gridSize, 0);
        ctx.lineTo(i*gridSize, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i*gridSize);
        ctx.lineTo(canvas.width, i*gridSize);
        ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = '#ff4757';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff4757';
    ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);
    ctx.shadowBlur = 0;

    // Draw snake
    snake.forEach((segment, index) => {
        // Head is brighter
        if (index === 0) {
            ctx.fillStyle = '#7bed9f';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#2ed573';
        } else {
            ctx.fillStyle = '#2ed573';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#2ed573';
        }
        
        ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
    });
    ctx.shadowBlur = 0;
}

function spawnFood() {
    let valid = false;
    while (!valid) {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        // Ensure food doesn't spawn on snake
        valid = true;
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                valid = false;
                break;
            }
        }
    }
}

function endGame() {
    gameOver = true;
    clearInterval(gameLoop);
    gameOverElement.style.display = 'flex';
}

function resetGame() {
    initGame();
}

// Input handling
document.addEventListener('keydown', (e) => {
    // Prevent default scrolling for arrow keys
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    if (gameOver) {
        if (e.code === 'Space' || e.code === 'Enter') resetGame();
        return;
    }

    if (!gameStarted) {
        if (e.code === 'Space') startGame();
        return;
    }

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (lastDy !== 1) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (lastDy !== -1) { dx = 0; dy = 1; }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (lastDx !== 1) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (lastDx !== -1) { dx = 1; dy = 0; }
            break;
    }
});

// Start the game initially
initGame();
