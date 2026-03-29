import { getHighScores, isHighScore, saveHighScore, generateLeaderboardHTML } from '../../assets/highscore.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreP1Element = document.getElementById('score-p1');
const scoreP2Element = document.getElementById('score-p2');

const startScreenElement = document.getElementById('start-screen');
const gameOverElement = document.getElementById('game-over');
const winnerTextElement = document.getElementById('winner-text');
const rallyTextElement = document.getElementById('rally-text');
const startLeaderboardElement = document.getElementById('start-leaderboard');
const gameOverLeaderboardElement = document.getElementById('game-over-leaderboard');
const hsInputSection = document.getElementById('hs-input-section');
const hsInitials = document.getElementById('hs-initials');
const hsSubmitBtn = document.getElementById('hs-submit-btn');
const mainMenuBtn = document.getElementById('main-menu-btn');

// Paddle constants
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const PADDLE_SPEED = 6;
const BALL_SIZE = 10;

// Game state
let score1 = 0;
let score2 = 0;
let rallyCount = 0;
let maxRally = 0;
let gameStarted = false;
let gameOver = false;
let lastTime = 0;
let animFrame;


let p1 = { x: 20, y: canvas.height/2 - PADDLE_HEIGHT/2, dy: 0 };
let p2 = { x: canvas.width - 30, y: canvas.height/2 - PADDLE_HEIGHT/2, dy: 0 };

let ball = {
    x: canvas.width/2,
    y: canvas.height/2,
    dx: 5,
    dy: 3,
    speed: 6
};

// Input state
const keys = { w: false, s: false, ArrowUp: false, ArrowDown: false };

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    // Reverse direction and randomize angle slightly
    ball.dx = -ball.dx;
    ball.dy = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 2 + 2);
    ball.speed = 6;
    
    normalizeBallVelocity();
}

function normalizeBallVelocity() {
    const magnitude = Math.sqrt(ball.dx*ball.dx + ball.dy*ball.dy);
    ball.dx = (ball.dx / magnitude) * ball.speed;
    ball.dy = (ball.dy / magnitude) * ball.speed;
}

function update(dt) {
    // Move paddles
    if (keys.w && p1.y > 0) p1.y -= PADDLE_SPEED * dt;
    if (keys.s && p1.y < canvas.height - PADDLE_HEIGHT) p1.y += PADDLE_SPEED * dt;
    
    if (keys.ArrowUp && p2.y > 0) p2.y -= PADDLE_SPEED * dt;
    if (keys.ArrowDown && p2.y < canvas.height - PADDLE_HEIGHT) p2.y += PADDLE_SPEED * dt;

    // Move ball
    ball.x += ball.dx * dt;
    ball.y += ball.dy * dt;

    // Wall collision (top/bottom)
    if (ball.y < 0 || ball.y + BALL_SIZE > canvas.height) {
        ball.dy = -ball.dy;
        // Keep in bounds to prevent getting stuck
        if (ball.y < 0) ball.y = 0;
        if (ball.y + BALL_SIZE > canvas.height) ball.y = canvas.height - BALL_SIZE;
    }

    // Paddle collision
    // P1 Hit
    if (ball.dx < 0 && 
        ball.x < p1.x + PADDLE_WIDTH && 
        ball.x + BALL_SIZE > p1.x && 
        ball.y + BALL_SIZE > p1.y && 
        ball.y < p1.y + PADDLE_HEIGHT) {
            
        ball.dx = -ball.dx;
        // Adjust angle based on where it hit the paddle
        let hitPoint = (ball.y + BALL_SIZE/2) - (p1.y + PADDLE_HEIGHT/2);
        ball.dy = hitPoint * 0.15;
        
        rallyCount++;
        maxRally = Math.max(maxRally, rallyCount);
        
        // Increase speed slightly
        ball.speed = Math.min(ball.speed + 0.5, 12);
        normalizeBallVelocity();
        ball.x = p1.x + PADDLE_WIDTH; // Prevent sticking
    }

    // P2 Hit
    if (ball.dx > 0 && 
        ball.x + BALL_SIZE > p2.x && 
        ball.x < p2.x + PADDLE_WIDTH && 
        ball.y + BALL_SIZE > p2.y && 
        ball.y < p2.y + PADDLE_HEIGHT) {
            
        ball.dx = -ball.dx;
        let hitPoint = (ball.y + BALL_SIZE/2) - (p2.y + PADDLE_HEIGHT/2);
        ball.dy = hitPoint * 0.15;
        
        rallyCount++;
        maxRally = Math.max(maxRally, rallyCount);
        
        ball.speed = Math.min(ball.speed + 0.5, 12);
        normalizeBallVelocity();
        ball.x = p2.x - BALL_SIZE; // Prevent sticking
    }

    // Scoring
    if (ball.x < 0) {
        score2++;
        scoreP2Element.textContent = score2;
        rallyCount = 0;
        checkWin();
        if (!gameOver) resetBall();
    } else if (ball.x > canvas.width) {
        score1++;
        scoreP1Element.textContent = score1;
        rallyCount = 0;
        checkWin();
        if (!gameOver) resetBall();
    }
}

function checkWin() {
    if (score1 >= 5 || score2 >= 5) {
        gameOver = true;
        gameStarted = false;
        showGameOver();
    }
}

function showGameOver() {
    winnerTextElement.textContent = score1 >= 5 ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
    winnerTextElement.style.color = score1 >= 5 ? '#ff9ff3' : '#48dbfb';
    rallyTextElement.textContent = `Longest Rally: ${maxRally}`;
    
    if (isHighScore('pong', maxRally)) {
        mainMenuBtn.style.display = 'none';
        gameOverLeaderboardElement.style.display = 'none';
        hsInputSection.style.display = 'flex';
        hsInitials.value = '';
        
        hsSubmitBtn.onclick = () => {
            const initials = hsInitials.value.trim().toUpperCase().substring(0, 3);
            if (initials.length > 0) {
                saveHighScore('pong', initials, maxRally);
                showPostGameLeaderboard();
            }
        };
    } else {
        showPostGameLeaderboard();
    }
    
    gameOverElement.style.display = 'flex';
}

function showPostGameLeaderboard() {
    hsInputSection.style.display = 'none';
    mainMenuBtn.style.display = 'block';
    gameOverLeaderboardElement.style.display = 'block';
    gameOverLeaderboardElement.innerHTML = generateLeaderboardHTML('pong');
}

window.startGame = function() {
    score1 = 0;
    score2 = 0;
    maxRally = 0;
    rallyCount = 0;
    scoreP1Element.textContent = 0;
    scoreP2Element.textContent = 0;
    gameOver = false;
    gameStarted = true;
    startScreenElement.style.display = 'none';
    gameOverElement.style.display = 'none';
    resetBall();
};

window.showMenu = function() {
    startScreenElement.style.display = 'flex';
    gameOverElement.style.display = 'none';
    startLeaderboardElement.innerHTML = generateLeaderboardHTML('pong');
};

function drawDashLine() {
    ctx.beginPath();
    ctx.setLineDash([10, 15]);
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]); // Reset
}

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawDashLine();

    // Draw P1 (Neon Pink)
    ctx.fillStyle = '#ff9ff3';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff9ff3';
    ctx.fillRect(p1.x, p1.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw P2 (Neon Blue)
    ctx.fillStyle = '#48dbfb';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#48dbfb';
    ctx.fillRect(p2.x, p2.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw Ball (White/Cyan glow)
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00d2d3';
    ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);
    
    // Reset shadow
    ctx.shadowBlur = 0;
}

function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ff9ff3';
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff9ff3';
    ctx.fillText('PRESS SPACE TO START', canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp || performance.now();
    let dt = (timestamp - lastTime) / 16.67;
    if (dt > 3) dt = 3;
    lastTime = timestamp;

    if (gameStarted && !gameOver) {
        update(dt);
    }
    draw();
    animFrame = requestAnimationFrame(gameLoop);
}

// Input Handlers
document.addEventListener('keydown', (e) => {
    // Prevent scrolling
    if(["Space","ArrowUp","ArrowDown"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    
    if (e.code === 'Space' && !gameStarted) {
        gameStarted = true;
        resetBall();
    }
    
    if (e.key === 'ArrowUp') keys.ArrowUp = true;
    if (e.key === 'ArrowDown') keys.ArrowDown = true;
    if (e.key.toLowerCase() === 'w') keys.w = true;
    if (e.key.toLowerCase() === 's') keys.s = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') keys.ArrowUp = false;
    if (e.key === 'ArrowDown') keys.ArrowDown = false;
    if (e.key.toLowerCase() === 'w') keys.w = false;
    if (e.key.toLowerCase() === 's') keys.s = false;
});

// Start initially paused
startLeaderboardElement.innerHTML = generateLeaderboardHTML('pong');
animFrame = requestAnimationFrame(gameLoop);

// Setup Initials input handler
hsInitials.addEventListener('keydown', (e) => {
    e.stopPropagation(); 
    if (e.key === 'Enter') {
        hsSubmitBtn.click();
    }
});
