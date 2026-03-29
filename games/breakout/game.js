'use strict';

// ─────────────────────────────────────────────
//  CONSTANTS & CONFIG
// ─────────────────────────────────────────────
const W = 800, H = 560;
const PADDLE_H = 12;
const BALL_RADIUS = 7;
const BRICK_W = 70, BRICK_H = 22, BRICK_GAP = 5;
const COLS = 10;
const BRICK_START_X = 15;
const BRICK_START_Y = 60;
const MAX_LIVES = 3;
const MAX_LEVELS = 20;
const HIGH_SCORE_KEY = 'neon_breakout_hs';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ─────────────────────────────────────────────
//  COLOUR PALETTE
// ─────────────────────────────────────────────
const PALETTE = {
    bg: '#050508',
    paddle: { fill: '#6c5ce7', glow: 'rgba(108,92,231,0.8)' },
    ball: { fill: '#ffffff', glow: 'rgba(0,210,211,0.9)' },
    brickColors: [
        { fill: '#00d2d3', glow: 'rgba(0,210,211,0.8)', score: 10 },   // cyan
        { fill: '#6c5ce7', glow: 'rgba(108,92,231,0.8)', score: 20 },  // purple
        { fill: '#fd79a8', glow: 'rgba(253,121,168,0.8)', score: 30 }, // pink
        { fill: '#ffd32a', glow: 'rgba(255,211,42,0.8)', score: 50 },  // gold
        { fill: '#ff4757', glow: 'rgba(255,71,87,0.8)', score: 40 },   // red
        { fill: '#2ed573', glow: 'rgba(46,213,115,0.8)', score: 25 },  // green
        { fill: '#ff6b81', glow: 'rgba(255,107,129,0.8)', score: 35 }, // rose
    ],
    strongBrick: { fill: '#a29bfe', glow: 'rgba(162,155,254,0.8)', score: 80 },
    unbreakable: { fill: '#2d3436', glow: 'rgba(100,100,120,0.3)', score: 0 },
    explosive: { fill: '#fdcb6e', glow: 'rgba(253,203,110,0.9)', score: 60 },
    powerup: {
        WIDE: { color: '#6c5ce7', glow: 'rgba(108,92,231,0.9)', label: 'WIDE PADDLE' },
        SLOW: { color: '#2ed573', glow: 'rgba(46,213,115,0.9)', label: 'SLOW BALL' },
        MULTI: { color: '#fd79a8', glow: 'rgba(253,121,168,0.9)', label: 'MULTI BALL' },
        LASER: { color: '#ff4757', glow: 'rgba(255,71,87,0.9)', label: 'LASER' },
        LIFE: { color: '#ffd32a', glow: 'rgba(255,211,42,0.9)', label: '+ LIFE' },
        SMALL: { color: '#ff6b81', glow: 'rgba(255,107,129,0.9)', label: 'SMALL BALL' },
        THROUGH: { color: '#00d2d3', glow: 'rgba(0,210,211,0.9)', label: 'THROUGH BALL' },
        MAGNET: { color: '#a29bfe', glow: 'rgba(162,155,254,0.9)', label: 'MAGNET' },
    }
};

// ─────────────────────────────────────────────
//  LEVEL DEFINITIONS  (20 levels)
//  Each row is a string of chars:
//    '.' = empty, 'b' = basic, 's' = strong (2 hits), 'u' = unbreakable, 'x' = explosive
//    digit 1-7 = basic with colour index
// ─────────────────────────────────────────────
const LEVEL_DATA = [
    // Level 1 – simple rows
    {
        rows: [
            '1111111111',
            '2222222222',
            '3333333333',
        ],
        ballSpeed: 6, paddleW: 110, powerupFreq: 0.2
    },
    // Level 2
    {
        rows: [
            '1.1.1.1.1.',
            '2222222222',
            '.3.3.3.3.3',
            '1111111111',
        ],
        ballSpeed: 6.2, paddleW: 108, powerupFreq: 0.22
    },
    // Level 3 – checkerboard
    {
        rows: [
            '1.2.3.2.1.',
            '.4.5.4.5.4',
            '1.2.3.2.1.',
            '.4.5.4.5.4',
        ],
        ballSpeed: 6.6, paddleW: 106, powerupFreq: 0.22
    },
    // Level 4 – diamond with strong center
    {
        rows: [
            '...sbbs...',
            '..s1111s..',
            '.s111111s.',
            'ss111111ss',
            '.s111111s.',
            '..s1111s..',
        ],
        ballSpeed: 6.9, paddleW: 104, powerupFreq: 0.23
    },
    // Level 5 – fortress
    {
        rows: [
            'uuuuuuuuuu',
            'u123456765',
            'u........u',
            'u.ss..ss.u',
            'u........u',
            'ssssssssss',
        ],
        ballSpeed: 7.2, paddleW: 102, powerupFreq: 0.25
    },
    // Level 6 – cross
    {
        rows: [
            '...11111..',
            '...11116..',
            '1111161111',
            '1111171111',
            '...11116..',
            '...11111..',
        ],
        ballSpeed: 7.5, paddleW: 100, powerupFreq: 0.25
    },
    // Level 7 – wave
    {
        rows: [
            '1...2...3.',
            '.1.2.3.4.5',
            '.123456712',
            '1111111111',
            '2222222222',
        ],
        ballSpeed: 6, paddleW: 98, powerupFreq: 0.26
    },
    // Level 8 – star of strong bricks
    {
        rows: [
            '..s....s..',
            '.sssssss..',
            '..sssss...',
            '.sssssss..',
            '..s....s..',
            '1111111111',
            '3333333333',
        ],
        ballSpeed: 6.2, paddleW: 96, powerupFreq: 0.27
    },
    // Level 9 – explosive mayhem
    {
        rows: [
            '1x1x1x1x1x',
            'x2x2x2x2x2',
            '1x1x1x1x1x',
            '3333333333',
            '4444444444',
        ],
        ballSpeed: 6.4, paddleW: 95, powerupFreq: 0.28
    },
    // Level 10 – mid-boss level (lots of strong bricks)
    {
        rows: [
            'uussussuuu',
            'sss1111sss',
            'ss111111ss',
            's11111111s',
            'ss111111ss',
            'sss1111sss',
            'uussussuuu',
        ],
        ballSpeed: 6.6, paddleW: 94, powerupFreq: 0.3
    },
    // Level 11
    {
        rows: [
            '1234567654',
            '7654321234',
            '1234567654',
            '7654321234',
            'ssssssssss',
        ],
        ballSpeed: 6.8, paddleW: 92, powerupFreq: 0.3
    },
    // Level 12 – spiral effect
    {
        rows: [
            '1111111111',
            '1........1',
            '1.222222.1',
            '1.2....2.1',
            '1.233332.1',
            '1.2....2.1',
            '1.222222.1',
            '1........1',
            '1111111111',
        ],
        ballSpeed: 7, paddleW: 90, powerupFreq: 0.3
    },
    // Level 13
    {
        rows: [
            'x.x.x.x.x.',
            '.x.x.x.x.x',
            'ss.ss.ss.s',
            'sss.ssssss',
            '1111111111',
            '3333333333',
            '5555555555',
        ],
        ballSpeed: 7.2, paddleW: 90, powerupFreq: 0.3
    },
    // Level 14 – alternating thick layers
    {
        rows: [
            'uuuuu.uuuu',
            's5s5s5s5s5',
            '6666666666',
            's3s3s3s3s3',
            'uuuuu.uuuu',
            '1111111111',
            '4444444444',
        ],
        ballSpeed: 7.4, paddleW: 88, powerupFreq: 0.3
    },
    // Level 15
    {
        rows: [
            'ssssssssss',
            's12345678s',
            's23456781s',
            's34567812s',
            's45678123s',
            'ssssssssss',
        ],
        ballSpeed: 7.6, paddleW: 87, powerupFreq: 0.3
    },
    // Level 16 – explosive grid
    {
        rows: [
            'x1x1x1x1x1',
            '1x1x1x1x1x',
            'x2x2x2x2x2',
            '2x2x2x2x2x',
            'ssssssssss',
            '..uuuuuu..',
        ],
        ballSpeed: 7.8, paddleW: 86, powerupFreq: 0.32
    },
    // Level 17 – castle
    {
        rows: [
            'u.u.u.u.u.',
            'uuuuuuuuuu',
            'ussssssssu',
            'us444444su',
            'ussssssssu',
            'uuuuuuuuuu',
            'u.u.u.u.u.',
        ],
        ballSpeed: 8, paddleW: 85, powerupFreq: 0.33
    },
    // Level 18 – chaos
    {
        rows: [
            'sxsxsxsxsx',
            'xs.xs.xs.x',
            '1s3s5s7s1s',
            's2s4s6s1s3',
            'ssssssssss',
            'ususususus',
        ],
        ballSpeed: 8.3, paddleW: 84, powerupFreq: 0.33
    },
    // Level 19 – near-final
    {
        rows: [
            'uuuuuuuuuu',
            'ussssssssu',
            'us1s1s1ssu',
            'uss1s1s1su',
            'us1s1s1ssu',
            'ussssssssu',
            'ssuu..uuss',
        ],
        ballSpeed: 8.6, paddleW: 82, powerupFreq: 0.35
    },
    // Level 20 – FINAL BOSS
    {
        rows: [
            'uuuuuuuuuu',
            'u.ssxss.su',
            'ussxsxsssu',
            'uxsssssxsu',
            'ssxsxsxsxs',
            'ssssssssss',
            'uuuuu.uuuu',
            '7654321234',
            '1234567654',
        ],
        ballSpeed: 9, paddleW: 80, powerupFreq: 0.35
    },
];

// ─────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────
let state = {
    phase: 'start',   // start | playing | paused | levelclear | gameover | victory
    level: 1,
    score: 0,
    lives: MAX_LIVES,
    highScore: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
};

let paddle, balls, bricks, particles, powerups, lasers, activePowerups;
let keys = {};
let mouseX = W / 2;
let usingKeyboard = false; // true while arrow keys are in use; prevents mouse snap
let animId = null;
let lastTime = 0;

// ─────────────────────────────────────────────
//  PARTICLE SYSTEM
// ─────────────────────────────────────────────
function spawnParticles(x, y, color, count = 12, speed = 3) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.8);
        particles.push({
            x, y,
            vx: Math.cos(angle) * v,
            vy: Math.sin(angle) * v,
            r: 2 + Math.random() * 3,
            life: 1,
            decay: 0.025 + Math.random() * 0.03,
            color,
        });
    }
}

function spawnRingParticles(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const v = 2 + Math.random() * 4;
        particles.push({
            x, y,
            vx: Math.cos(angle) * v,
            vy: Math.sin(angle) * v,
            r: 2 + Math.random() * 2,
            life: 1,
            decay: 0.02 + Math.random() * 0.02,
            color,
        });
    }
}

// ─────────────────────────────────────────────
//  LEVEL BUILDER
// ─────────────────────────────────────────────
function buildBricks(levelIdx) {
    const lvl = LEVEL_DATA[levelIdx];
    const rows = lvl.rows;
    const result = [];

    rows.forEach((row, ri) => {
        // Trim to COLS chars
        const rowStr = row.padEnd(COLS, '.').substring(0, COLS);
        rowStr.split('').forEach((ch, ci) => {
            if (ch === '.') return;
            const x = BRICK_START_X + ci * (BRICK_W + BRICK_GAP);
            const y = BRICK_START_Y + ri * (BRICK_H + BRICK_GAP);

            let type = 'basic', hits = 1, colIdx = 0, score = 10;

            if (ch === 'u') {
                type = 'unbreakable'; hits = Infinity; score = 0;
                result.push({ x, y, w: BRICK_W, h: BRICK_H, type, hits, score, maxHits: hits });
                return;
            } else if (ch === 's') {
                type = 'strong'; hits = 2; colIdx = -1; score = 80;
            } else if (ch === 'x') {
                type = 'explosive'; hits = 1; colIdx = -2; score = 60;
            } else if (ch >= '1' && ch <= '9') {
                colIdx = (parseInt(ch) - 1) % PALETTE.brickColors.length;
                score = PALETTE.brickColors[colIdx].score;
            }

            result.push({ x, y, w: BRICK_W, h: BRICK_H, type, hits, maxHits: hits, colIdx, score });
        });
    });

    return result;
}

// ─────────────────────────────────────────────
//  BALL FACTORY
// ─────────────────────────────────────────────
function makeBall(x, y, angle, speed, sticky = false) {
    return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: BALL_RADIUS,
        sticky,
        trail: [],
        through: false,
    };
}

// ─────────────────────────────────────────────
//  POWERUP FACTORY
// ─────────────────────────────────────────────
const POWERUP_TYPES = Object.keys(PALETTE.powerup);

function spawnPowerup(x, y) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerups.push({
        x, y,
        type,
        vy: 1.6,
        r: 10,
        life: 1,
        angle: 0,
    });
}

// ─────────────────────────────────────────────
//  GAME INITIALISATION
// ─────────────────────────────────────────────
function initLevel(levelIdx) {
    const lvl = LEVEL_DATA[levelIdx];

    paddle = {
        x: W / 2,
        y: H - 28,
        w: lvl.paddleW,
        h: PADDLE_H,
        speed: 13,
        laserCooldown: 0,
    };

    // Ball speed formula: 6.0 at level 1, +0.3 per level
    const speed = 6 + levelIdx * 0.3;
    state.ballSpeed = speed;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    balls = [makeBall(paddle.x, paddle.y - PADDLE_H - BALL_RADIUS - 2, angle, speed, true)];

    bricks = buildBricks(levelIdx);
    particles = [];
    powerups = [];
    lasers = [];
    activePowerups = {
        WIDE: 0, SLOW: 0, MULTI: 0, LASER: 0, THROUGH: 0, MAGNET: 0
    };
}

function startGame() {
    state.phase = 'playing';
    state.level = 1;
    state.score = 0;
    state.lives = MAX_LIVES;
    showOverlay(null);
    updateHUD();
    initLevel(0);
    // Loop is started by idleLoop transition or already running
}

function restartGame() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    state.phase = 'playing';
    state.level = 1;
    state.score = 0;
    state.lives = MAX_LIVES;
    showOverlay(null);
    updateHUD();
    initLevel(0);
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
}

function showStartScreen() {
    state.phase = 'start';
    showOverlay('start-screen');
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    // Restart idle loop
    (function idleLoopReturn(ts) {
        if (state.phase === 'start') {
            ctx.clearRect(0, 0, W, H);
            drawGrid();
            const t = ts / 1000;
            PALETTE.brickColors.forEach((c, i) => {
                ctx.save();
                ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t + i);
                ctx.beginPath();
                const bx = BRICK_START_X + (i % COLS) * (BRICK_W + BRICK_GAP);
                const by = BRICK_START_Y + Math.floor(i / COLS) * (BRICK_H + BRICK_GAP) + Math.sin(t * 0.5 + i * 0.5) * 5;
                ctx.roundRect(bx, by, BRICK_W, BRICK_H, 4);
                ctx.fillStyle = c.fill;
                ctx.shadowColor = c.glow;
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.restore();
            });
            requestAnimationFrame(idleLoopReturn);
        } else {
            lastTime = performance.now();
            animId = requestAnimationFrame(loop);
        }
    })(0);
}

function nextLevel() {
    if (state.level >= MAX_LEVELS) {
        showVictory();
        return;
    }
    state.level++;
    showOverlay(null);
    state.phase = 'playing';
    updateHUD();
    initLevel(state.level - 1);
}

function showVictory() {
    state.phase = 'victory';
    const isNewHS = state.score > state.highScore;
    if (isNewHS) { state.highScore = state.score; localStorage.setItem(HIGH_SCORE_KEY, state.highScore); }
    document.getElementById('win-score-val').textContent = state.score;
    document.getElementById('win-hs-tag').style.display = isNewHS ? 'block' : 'none';
    showOverlay('victory-screen');
    updateHUD();
}

function showGameOver() {
    state.phase = 'gameover';
    const isNewHS = state.score > state.highScore;
    if (isNewHS) { state.highScore = state.score; localStorage.setItem(HIGH_SCORE_KEY, state.highScore); }
    document.getElementById('go-score-val').textContent = state.score;
    document.getElementById('go-level-val').textContent = state.level;
    document.getElementById('new-hs-tag').style.display = isNewHS ? 'block' : 'none';
    showOverlay('gameover-screen');
    updateHUD();
}

function showLevelClear() {
    state.phase = 'levelclear';
    document.getElementById('clear-score-val').textContent = state.score;
    document.getElementById('level-clear-info').textContent =
        state.level >= MAX_LEVELS ? 'FINAL LEVEL CLEARED!' : `PREPARE FOR LEVEL ${state.level + 1}`;
    showOverlay('level-clear-screen');
}

function togglePause() {
    if (state.phase === 'paused') {
        state.phase = 'playing';
        showOverlay(null);
        lastTime = performance.now();
        animId = requestAnimationFrame(loop);
    } else if (state.phase === 'playing') {
        state.phase = 'paused';
        showOverlay('pause-screen');
        cancelAnimationFrame(animId);
        animId = null;
    }
}

function showOverlay(id) {
    const ids = ['start-screen', 'level-clear-screen', 'gameover-screen', 'victory-screen', 'pause-screen'];
    ids.forEach(i => {
        const el = document.getElementById(i);
        if (i === id) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
}

function updateHUD() {
    document.getElementById('score-val').textContent = state.score;
    document.getElementById('level-val').textContent = state.level;
    document.getElementById('highscore-val').textContent = Math.max(state.highScore, state.score);
    // lives
    for (let i = 0; i < MAX_LIVES; i++) {
        const el = document.getElementById('life-' + i);
        if (el) el.classList.toggle('lost', i >= state.lives);
    }
}

// ─────────────────────────────────────────────
//  POWERUP EFFECTS
// ─────────────────────────────────────────────
function applyPowerup(type) {
    const toast = document.getElementById('powerup-toast');
    const cfg = PALETTE.powerup[type];

    switch (type) {
        case 'WIDE':
            activePowerups.WIDE = 600;
            paddle.w = Math.min(160, LEVEL_DATA[state.level - 1].paddleW * 1.6);
            break;
        case 'SLOW':
            activePowerups.SLOW = 500;
            balls.forEach(b => { b.vx *= 0.7; b.vy *= 0.7; });
            break;
        case 'MULTI':
            const origBalls = [...balls];
            origBalls.forEach(b => {
                if (balls.length < 6) {
                    const nb = Object.assign({}, b, { trail: [] });
                    nb.vx = -b.vx + (Math.random() - 0.5) * 2;
                    nb.vy = b.vy;
                    balls.push(nb);
                }
            });
            break;
        case 'LASER':
            activePowerups.LASER = 500;
            break;
        case 'LIFE':
            if (state.lives < MAX_LIVES) { state.lives++; updateHUD(); }
            break;
        case 'SMALL':
            balls.forEach(b => b.r = Math.max(4, BALL_RADIUS - 3));
            break;
        case 'THROUGH':
            activePowerups.THROUGH = 400;
            balls.forEach(b => b.through = true);
            break;
        case 'MAGNET':
            activePowerups.MAGNET = 300;
            break;
    }

    toast.textContent = cfg.label;
    toast.style.color = cfg.color;
    toast.style.borderColor = cfg.color;
    toast.style.boxShadow = `0 0 12px ${cfg.glow}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
}

// ─────────────────────────────────────────────
//  COLLISION HELPERS
// ─────────────────────────────────────────────
function ballHitsPaddle(ball) {
    return (
        ball.x + ball.r > paddle.x - paddle.w / 2 &&
        ball.x - ball.r < paddle.x + paddle.w / 2 &&
        ball.y + ball.r > paddle.y - PADDLE_H / 2 &&
        ball.y - ball.r < paddle.y + PADDLE_H / 2 &&
        ball.vy > 0
    );
}

function reflectBallOnPaddle(ball) {
    const relX = (ball.x - paddle.x) / (paddle.w / 2); // -1 to 1
    const angle = relX * (Math.PI * 0.35) - Math.PI / 2;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.y = paddle.y - PADDLE_H / 2 - ball.r - 1;
}

function ballHitsBrick(ball, brick) {
    return (
        ball.x + ball.r > brick.x &&
        ball.x - ball.r < brick.x + brick.w &&
        ball.y + ball.r > brick.y &&
        ball.y - ball.r < brick.y + brick.h
    );
}

function reflectBallOnBrick(ball, brick) {
    const bCenterX = brick.x + brick.w / 2;
    const bCenterY = brick.y + brick.h / 2;
    const dx = ball.x - bCenterX;
    const dy = ball.y - bCenterY;
    // determine which face was hit
    const overlapX = (brick.w / 2 + ball.r) - Math.abs(dx);
    const overlapY = (brick.h / 2 + ball.r) - Math.abs(dy);

    if (overlapX < overlapY) {
        ball.vx = -ball.vx;
        ball.x += ball.vx > 0 ? overlapX : -overlapX;
    } else {
        ball.vy = -ball.vy;
        ball.y += ball.vy > 0 ? overlapY : -overlapY;
    }
}

// ─────────────────────────────────────────────
//  EXPLOSION (explosive bricks)
// ─────────────────────────────────────────────
function explodeBrick(brickRef) {
    if (!brickRef) return;
    spawnRingParticles(brickRef.x + brickRef.w / 2, brickRef.y + brickRef.h / 2, PALETTE.explosive.glow, 30);
    // damage neighbours
    const cx = brickRef.x + brickRef.w / 2, cy = brickRef.y + brickRef.h / 2;
    bricks.forEach(nb => {
        if (nb === brickRef) return;
        const dist = Math.hypot((nb.x + nb.w / 2) - cx, (nb.y + nb.h / 2) - cy);
        if (dist < 110 && nb.type !== 'unbreakable') {
            nb.hits--;
            if (nb.hits <= 0) {
                addScore(nb.score);
                spawnParticles(nb.x + nb.w / 2, nb.y + nb.h / 2, getBrickColor(nb), 8);
                if (Math.random() < LEVEL_DATA[state.level - 1].powerupFreq) spawnPowerup(nb.x + nb.w / 2, nb.y + nb.h / 2);
            }
        }
    });
    // Remove the exploding brick and any zero-hit bricks
    bricks = bricks.filter(b => b !== brickRef && (b.hits > 0 || b.type === 'unbreakable'));
}

function getBrickColor(brick) {
    if (brick.type === 'explosive') return PALETTE.explosive.glow;
    if (brick.type === 'strong') return PALETTE.strongBrick.glow;
    if (brick.type === 'unbreakable') return PALETTE.unbreakable.glow;
    return PALETTE.brickColors[brick.colIdx].glow;
}

// ─────────────────────────────────────────────
//  LASER
// ─────────────────────────────────────────────
function fireLaser() {
    if (activePowerups.LASER > 0 && paddle.laserCooldown <= 0) {
        lasers.push({ x: paddle.x - paddle.w / 4, y: paddle.y - PADDLE_H, vy: -14, life: 1 });
        lasers.push({ x: paddle.x + paddle.w / 4, y: paddle.y - PADDLE_H, vy: -14, life: 1 });
        paddle.laserCooldown = 20;
    }
}

// ─────────────────────────────────────────────
//  SCORE
// ─────────────────────────────────────────────
function addScore(pts) {
    state.score += pts;
    document.getElementById('score-val').textContent = state.score;
    if (state.score > state.highScore) {
        document.getElementById('highscore-val').textContent = state.score;
    }
}

// ─────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────
function update(dt) {
    if (state.phase !== 'playing') return;

    const lvl = LEVEL_DATA[state.level - 1];

    // ── Paddle movement ──
    if (keys['ArrowLeft']) {
        usingKeyboard = true;
        paddle.x = Math.max(paddle.w / 2, paddle.x - paddle.speed * dt);
    } else if (keys['ArrowRight']) {
        usingKeyboard = true;
        paddle.x = Math.min(W - paddle.w / 2, paddle.x + paddle.speed * dt);
    } else if (!usingKeyboard) {
        // Only follow mouse when not in keyboard mode
        paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, mouseX));
    }

    if (paddle.laserCooldown > 0) paddle.laserCooldown--;

    // ── Ball launch / sticky ──
    balls.forEach(ball => {
        if (ball.sticky) {
            if (activePowerups.MAGNET > 0) {
                ball.x = paddle.x;
                ball.y = paddle.y - PADDLE_H / 2 - ball.r;
            } else {
                ball.x = paddle.x;
                ball.y = paddle.y - PADDLE_H / 2 - ball.r;
            }
        }
    });

    // ── Powerup timers ──
    ['WIDE', 'SLOW', 'THROUGH', 'MAGNET', 'LASER'].forEach(k => {
        if (activePowerups[k] > 0) {
            activePowerups[k]--;
            if (activePowerups[k] === 0) {
                if (k === 'WIDE') paddle.w = lvl.paddleW;
                if (k === 'SLOW') { const s = state.ballSpeed; balls.forEach(b => { const cur = Math.sqrt(b.vx * b.vx + b.vy * b.vy); if (cur > 0) { b.vx = b.vx / cur * s; b.vy = b.vy / cur * s; } }); }
                if (k === 'THROUGH') balls.forEach(b => b.through = false);
            }
        }
    });

    // ── Move balls ──
    balls.forEach(ball => {
        if (ball.sticky) return;

        // trail
        ball.trail.unshift({ x: ball.x, y: ball.y });
        if (ball.trail.length > 10) ball.trail.pop();

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // wall collisions
        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
        if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); spawnParticles(ball.x, 0, '#ffffff', 5, 2); }

        // paddle hit
        if (ballHitsPaddle(ball)) {
            reflectBallOnPaddle(ball);
            spawnParticles(ball.x, paddle.y - PADDLE_H / 2, PALETTE.paddle.glow, 8, 2);
            if (activePowerups.MAGNET > 0) ball.sticky = true;
        }

        // brick collisions
        let hitAny = false;
        for (let i = bricks.length - 1; i >= 0; i--) {
            const brick = bricks[i];
            if (!ballHitsBrick(ball, brick)) continue;
            if (brick.type === 'unbreakable') {
                if (!ball.through) reflectBallOnBrick(ball, brick);
                continue;
            }

            if (!ball.through) {
                reflectBallOnBrick(ball, brick);
                hitAny = true;
            }

            brick.hits--;
            spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, getBrickColor(brick), 10, 3);

            if (brick.hits <= 0) {
                addScore(brick.score);
                if (brick.type === 'explosive') {
                    const brickRef = brick;
                    setTimeout(() => explodeBrick(brickRef), 50);
                }
                if (Math.random() < lvl.powerupFreq) spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
                bricks.splice(i, 1);
            }

            if (!ball.through && hitAny) break; // only hit one brick per frame unless through
        }

        // fell off bottom
    });

    // Remove dead balls
    const deadBalls = balls.filter(b => !b.sticky && b.y - b.r > H);
    balls = balls.filter(b => b.sticky || b.y - b.r <= H);

    if (balls.length === 0) {
        // All balls lost
        state.lives--;
        updateHUD();
        if (state.lives <= 0) {
            showGameOver();
            return;
        }
        // Respawn
        const speed = state.ballSpeed;
        const angle = -Math.PI / 2;
        balls = [makeBall(paddle.x, paddle.y - PADDLE_H / 2 - BALL_RADIUS - 2, angle, speed, true)];
        return;
    }

    // Lasers
    lasers.forEach(l => { l.y += l.vy * dt; });
    lasers = lasers.filter(l => l.y > 0);
    lasers.forEach(laser => {
        for (let i = bricks.length - 1; i >= 0; i--) {
            const b = bricks[i];
            if (laser.x > b.x && laser.x < b.x + b.w && laser.y > b.y && laser.y < b.y + b.h) {
                if (b.type === 'unbreakable') { laser.y = -1; break; }
                spawnParticles(b.x + b.w / 2, b.y + b.h / 2, getBrickColor(b), 6, 2);
                b.hits--;
                if (b.hits <= 0) { addScore(b.score); bricks.splice(i, 1); }
                laser.y = -1;
                break;
            }
        }
    });

    // Powerups fall
    powerups.forEach(p => { p.y += p.vy * dt; p.angle += 0.05 * dt; });
    powerups = powerups.filter(p => p.y < H + 20);
    // collect
    powerups = powerups.filter(p => {
        const caught = Math.abs(p.x - paddle.x) < paddle.w / 2 + p.r &&
            Math.abs(p.y - (paddle.y - PADDLE_H / 2)) < PADDLE_H / 2 + p.r;
        if (caught) { applyPowerup(p.type); spawnRingParticles(p.x, p.y, PALETTE.powerup[p.type].glow, 16); }
        return !caught;
    });

    // Particles
    particles.forEach(p => {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 0.06 * dt; // gravity
        p.life -= p.decay * dt;
    });
    particles = particles.filter(p => p.life > 0);

    // Check level clear – count destructible bricks
    const remaining = bricks.filter(b => b.type !== 'unbreakable').length;
    if (remaining === 0) {
        showLevelClear();
    }
}

// ─────────────────────────────────────────────
//  DRAW
// ─────────────────────────────────────────────
function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background grid
    drawGrid();

    // Particles
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
    });

    // Bricks
    bricks.forEach(brick => drawBrick(brick));

    // Powerups
    powerups.forEach(p => drawPowerup(p));

    // Lasers
    lasers.forEach(l => {
        ctx.save();
        ctx.strokeStyle = '#ff4757';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x, l.y + 20);
        ctx.stroke();
        ctx.restore();
    });

    // Balls
    balls.forEach(ball => {
        // Trail
        ball.trail.forEach((t, i) => {
            const alpha = (1 - i / ball.trail.length) * 0.4;
            const r = ball.r * (1 - i / ball.trail.length) * 0.8;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
            ctx.fillStyle = ball.through ? '#00d2d3' : '#ffffff';
            ctx.shadowColor = ball.through ? '#00d2d3' : PALETTE.ball.glow;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.restore();
        });

        // Ball
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        const ballGrad = ctx.createRadialGradient(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, 1, ball.x, ball.y, ball.r);
        ballGrad.addColorStop(0, '#fff');
        ballGrad.addColorStop(1, ball.through ? '#00d2d3' : '#aaddff');
        ctx.fillStyle = ballGrad;
        ctx.shadowColor = ball.through ? '#00d2d3' : PALETTE.ball.glow;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.restore();
    });

    // Paddle
    drawPaddle();
}

function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(108,92,231,0.06)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
}

function drawBrick(b) {
    ctx.save();
    let fill, glow, text = null;

    if (b.type === 'unbreakable') {
        fill = PALETTE.unbreakable.fill;
        glow = PALETTE.unbreakable.glow;
    } else if (b.type === 'strong') {
        // darken if damaged
        const t = b.hits / b.maxHits;
        fill = t >= 1 ? PALETTE.strongBrick.fill : '#7a6bc9';
        glow = PALETTE.strongBrick.glow;
        text = b.hits > 1 ? '2' : '1';
    } else if (b.type === 'explosive') {
        fill = PALETTE.explosive.fill;
        glow = PALETTE.explosive.glow;
        text = '✸';
    } else {
        fill = PALETTE.brickColors[b.colIdx].fill;
        glow = PALETTE.brickColors[b.colIdx].glow;
    }

    const rx = 4;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, rx);

    // Gradient fill
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, lightenColor(fill, 40));
    grad.addColorStop(1, fill);
    ctx.fillStyle = grad;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.fill();

    // Border highlight
    ctx.strokeStyle = lightenColor(fill, 70);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner shine
    ctx.beginPath();
    ctx.roundRect(b.x + 2, b.y + 2, b.w - 4, (b.h - 4) * 0.4, rx - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.shadowBlur = 0;
    ctx.fill();

    // Text label
    if (text) {
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8;
        ctx.font = 'bold 12px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, b.x + b.w / 2, b.y + b.h / 2);
    }

    ctx.restore();
}

function drawPaddle() {
    ctx.save();
    const px = paddle.x - paddle.w / 2, py = paddle.y - PADDLE_H / 2;
    const rx = 6;

    // Outer glow
    ctx.shadowColor = PALETTE.paddle.glow;
    ctx.shadowBlur = 24;

    const grad = ctx.createLinearGradient(px, py, px, py + PADDLE_H);
    grad.addColorStop(0, '#a29bfe');
    grad.addColorStop(0.4, PALETTE.paddle.fill);
    grad.addColorStop(1, '#4834d4');

    ctx.beginPath();
    ctx.roundRect(px, py, paddle.w, PADDLE_H, rx);
    ctx.fillStyle = grad;
    ctx.fill();

    // Shine
    ctx.beginPath();
    ctx.roundRect(px + 4, py + 2, paddle.w - 8, PADDLE_H * 0.35, rx - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 0;
    ctx.fill();

    // Laser indicator
    if (activePowerups.LASER > 0) {
        ctx.strokeStyle = '#ff4757';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(paddle.x - paddle.w / 4, py);
        ctx.lineTo(paddle.x - paddle.w / 4, 0);
        ctx.moveTo(paddle.x + paddle.w / 4, py);
        ctx.lineTo(paddle.x + paddle.w / 4, 0);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.restore();
}

function drawPowerup(p) {
    const cfg = PALETTE.powerup[p.type];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    ctx.shadowColor = cfg.glow;
    ctx.shadowBlur = 20;

    // Hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = Math.cos(a) * p.r;
        const py = Math.sin(a) * p.r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = cfg.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Letter
    ctx.rotate(-p.angle);
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 8px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.type[0], 0, 0);

    ctx.restore();
}

// ─────────────────────────────────────────────
//  UTILITY
// ─────────────────────────────────────────────
function lightenColor(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    return `rgb(${r},${g},${b})`;
}

// ─────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────
function loop(ts) {
    const dt = Math.min((ts - lastTime) / 16.67, 3); // cap dt
    lastTime = ts;
    update(dt);
    draw();
    animId = requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────
//  INPUT
// ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
    keys[e.key] = true;

    // Arrow keys → keyboard mode
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        usingKeyboard = true;
        e.preventDefault();
    }

    // SPACE: launch ball, release magnet, or fire laser
    if ((e.key === ' ' || e.code === 'Space') && state.phase === 'playing') {
        e.preventDefault();
        const sticky = balls ? balls.find(b => b.sticky) : null;
        if (sticky) {
            // Launch the sticky ball
            sticky.sticky = false;
            const sp = LEVEL_DATA[state.level - 1].ballSpeed;
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
            sticky.vx = Math.cos(a) * sp;
            sticky.vy = Math.sin(a) * sp;
        } else if (activePowerups && activePowerups.LASER > 0) {
            // Fire laser when active
            fireLaser();
        }
    }

    // P: pause / resume only
    if ((e.key === 'p' || e.key === 'P') && (state.phase === 'playing' || state.phase === 'paused')) {
        togglePause();
    }

    // Prevent scroll for arrow + space keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
});

document.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const newX = e.clientX - rect.left;
    // Moving the mouse exits keyboard mode so the paddle follows the cursor again
    if (Math.abs(newX - mouseX) > 2) usingKeyboard = false;
    mouseX = newX;
});

canvas.addEventListener('click', e => {
    if (state.phase !== 'playing') return;
    const sticky = balls.find(b => b.sticky);
    if (sticky) {
        sticky.sticky = false;
        const sp = LEVEL_DATA[state.level - 1].ballSpeed;
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        sticky.vx = Math.cos(a) * sp;
        sticky.vy = Math.sin(a) * sp;
    } else if (activePowerups.LASER > 0) {
        fireLaser();
    }
});

// Touch support
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    mouseX = e.touches[0].clientX - rect.left;
}, { passive: false });

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (state.phase !== 'playing') return;
    const sticky = balls.find(b => b.sticky);
    if (sticky) {
        sticky.sticky = false;
        const sp = LEVEL_DATA[state.level - 1].ballSpeed;
        sticky.vx = 0;
        sticky.vy = -sp;
    }
}, { passive: false });

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
updateHUD();
// Start the render loop even on start screen (show animated background)
(function idleLoop(ts) {
    if (state.phase === 'start') {
        ctx.clearRect(0, 0, W, H);
        drawGrid();
        // Animated demo bricks
        const t = ts / 1000;
        PALETTE.brickColors.forEach((c, i) => {
            ctx.save();
            ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t + i);
            ctx.beginPath();
            const bx = BRICK_START_X + (i % COLS) * (BRICK_W + BRICK_GAP);
            const by = BRICK_START_Y + Math.floor(i / COLS) * (BRICK_H + BRICK_GAP) + Math.sin(t * 0.5 + i * 0.5) * 5;
            ctx.roundRect(bx, by, BRICK_W, BRICK_H, 4);
            ctx.fillStyle = c.fill;
            ctx.shadowColor = c.glow;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.restore();
        });
        requestAnimationFrame(idleLoop);
    } else {
        animId = requestAnimationFrame(loop);
    }
})(0);
