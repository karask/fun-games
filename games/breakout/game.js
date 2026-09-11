'use strict';
import { createClock, sweepCircleRect, paddleBounce, pointerPosition } from './physics.mjs';
import { getHighScores, isHighScore, saveHighScore, generateLeaderboardHTML } from '../../assets/highscore.js';

// ─────────────────────────────────────────────
//  CONSTANTS & CONFIG
// ─────────────────────────────────────────────
const W = 800, H = 560;
const PADDLE_H = 12;
const BALL_RADIUS = 7;
const BRICK_W = 70, BRICK_H = 22, BRICK_GAP = 5;
const COLS = 10;
const BRICK_START_X = (W - COLS * BRICK_W - (COLS - 1) * BRICK_GAP) / 2;
const BRICK_START_Y = 60;
const MAX_LIVES = 3;
const MAX_LEVELS = 20;
const HIGH_SCORE_KEY = 'neon_breakout_hs';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const clock = createClock();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ─────────────────────────────────────────────
//  COLOUR PALETTE
// ─────────────────────────────────────────────
const PALETTE = {
    bg: '#050508',
    paddle: { fill: '#51c9b7', glow: 'rgba(102,239,219,0.65)' },
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
            'uuuu..uuuu', // Gate keeps the castle reachable without a lucky power-up.
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
    highScore: Math.max(Number(localStorage.getItem(HIGH_SCORE_KEY) || 0), getHighScores('breakout')[0]?.score || 0),
    rally: 0, bestRally: 0,
};

let paddle, balls, bricks, particles, powerups, lasers, activePowerups;
let keys = {};
let mouseX = W / 2;
let usingKeyboard = false; // true while arrow keys are in use; prevents mouse snap
let animId = null;
let lastTime = 0;
let toastTime = 0;
let effectTime = 0;
let impactRings = [];
let pendingExplosions = [];
let launchDirection = 1;

// ─────────────────────────────────────────────
//  PARTICLE SYSTEM
// ─────────────────────────────────────────────
function spawnParticles(x, y, color, count = 12, speed = 3) {
    count = Math.min(count, Math.max(0, 350 - particles.length));
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
    count = Math.min(count, Math.max(0, 350 - particles.length));
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
        contacts: new Set(),
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
    clock.reset(); keys = {}; mouseX = W / 2; usingKeyboard = false;
    state.rally = 0; toastTime = 0; effectTime = 0;
    impactRings = []; pendingExplosions = []; launchDirection = 1;
    document.getElementById('powerup-toast').classList.remove('show');
    const lvl = LEVEL_DATA[levelIdx];

    paddle = {
        x: W / 2,
        y: H - 28,
        w: lvl.paddleW,
        h: PADDLE_H,
        speed: 13,
        laserCooldown: 0,
    };

    const speed = lvl.ballSpeed;
    state.ballSpeed = speed;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    balls = [makeBall(paddle.x, paddle.y - PADDLE_H - BALL_RADIUS - 2, angle, speed, true)];

    bricks = buildBricks(levelIdx);
    particles = [];
    powerups = [];
    lasers = [];
    activePowerups = {
        WIDE: 0, SLOW: 0, MULTI: 0, LASER: 0, THROUGH: 0, MAGNET: 0, SMALL: 0
    };
}

function startGame() {
    state.phase = 'playing';
    state.level = 1;
    state.score = 0;
    state.lives = MAX_LIVES;
    state.rally = 0; state.bestRally = 0;
    showOverlay(null);
    updateHUD();
    initLevel(0);
    updateLiveStatus(); lastTime=performance.now();
}
window.startGame = startGame;

function restartGame() { startGame(); }
window.restartGame = restartGame;

function showStartScreen() {
    state.phase = 'start'; keys = {}; clock.reset();
    pendingExplosions = []; toastTime = 0;
    document.getElementById('powerup-toast').classList.remove('show');
    document.getElementById('start-leaderboard').innerHTML = generateLeaderboardHTML('breakout');
    showOverlay('start-screen');
}
window.showStartScreen = showStartScreen;

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
    updateLiveStatus();
}
window.nextLevel = nextLevel;

function showVictory() {
    state.phase = 'victory';
    document.getElementById('win-score-val').textContent = state.score;
    
    const uiInputBtnContainerId = 'win-buttons';
    const uiInputSectionId = 'win-hs-input';
    const uiInitialsId = 'win-hs-initials';
    const uiSubmitId = 'win-hs-submit';
    const uiLeaderboardId = 'win-leaderboard';
    
    if (isHighScore('breakout', state.score)) {
        document.getElementById(uiInputBtnContainerId).style.display = 'none';
        document.getElementById(uiLeaderboardId).style.display = 'none';
        document.getElementById(uiInputSectionId).style.display = 'flex';
        document.getElementById(uiInitialsId).value = '';
        
        document.getElementById(uiSubmitId).onclick = () => {
            const initials = document.getElementById(uiInitialsId).value.trim().toUpperCase().substring(0, 3);
            if (initials.length > 0) {
                saveHighScore('breakout', initials, state.score);
                document.getElementById(uiInputSectionId).style.display = 'none';
                document.getElementById(uiInputBtnContainerId).style.display = 'flex';
                document.getElementById(uiLeaderboardId).style.display = 'block';
                document.getElementById(uiLeaderboardId).innerHTML = generateLeaderboardHTML('breakout');
            }
        };
    } else {
        document.getElementById(uiInputBtnContainerId).style.display = 'flex';
        document.getElementById(uiInputSectionId).style.display = 'none';
        document.getElementById(uiLeaderboardId).style.display = 'block';
        document.getElementById(uiLeaderboardId).innerHTML = generateLeaderboardHTML('breakout');
    }
    
    showOverlay('victory-screen');
    updateHUD();
}

function showGameOver() {
    state.phase = 'gameover';
    document.getElementById('go-score-val').textContent = state.score;
    document.getElementById('go-level-val').textContent = state.level;
    
    const uiInputBtnContainerId = 'go-buttons';
    const uiInputSectionId = 'go-hs-input';
    const uiInitialsId = 'go-hs-initials';
    const uiSubmitId = 'go-hs-submit';
    const uiLeaderboardId = 'go-leaderboard';
    
    if (isHighScore('breakout', state.score)) {
        document.getElementById(uiInputBtnContainerId).style.display = 'none';
        document.getElementById(uiLeaderboardId).style.display = 'none';
        document.getElementById(uiInputSectionId).style.display = 'flex';
        document.getElementById(uiInitialsId).value = '';
        
        document.getElementById(uiSubmitId).onclick = () => {
            const initials = document.getElementById(uiInitialsId).value.trim().toUpperCase().substring(0, 3);
            if (initials.length > 0) {
                saveHighScore('breakout', initials, state.score);
                document.getElementById(uiInputSectionId).style.display = 'none';
                document.getElementById(uiInputBtnContainerId).style.display = 'flex';
                document.getElementById(uiLeaderboardId).style.display = 'block';
                document.getElementById(uiLeaderboardId).innerHTML = generateLeaderboardHTML('breakout');
            }
        };
    } else {
        document.getElementById(uiInputBtnContainerId).style.display = 'flex';
        document.getElementById(uiInputSectionId).style.display = 'none';
        document.getElementById(uiLeaderboardId).style.display = 'block';
        document.getElementById(uiLeaderboardId).innerHTML = generateLeaderboardHTML('breakout');
    }
    
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
    if (state.phase !== 'playing' && state.phase !== 'paused') return;
    state.phase = state.phase === 'paused' ? 'playing' : 'paused';
    keys = {}; clock.reset(); lastTime = performance.now();
    showOverlay(state.phase === 'paused' ? 'pause-screen' : null);
}
window.togglePause = togglePause;

function showOverlay(id) {
    const ids = ['start-screen', 'level-clear-screen', 'gameover-screen', 'victory-screen', 'pause-screen'];
    document.getElementById('game-container').classList.toggle('is-menu', id === 'start-screen');
    ids.forEach(i => {
        const el = document.getElementById(i);
        if (i === id) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
    if (id) {
        const controls = document.getElementById(id).querySelectorAll('input, button');
        [...controls].find(control => control.getClientRects().length)?.focus();
    }
    else canvas.focus();
}

function updateHUD() {
    document.getElementById('score-val').textContent = state.score;
    document.getElementById('level-val').textContent = state.level;
    document.getElementById('highscore-val').textContent = Math.max(state.highScore, state.score);
    document.getElementById('lives-display').setAttribute('aria-label', state.lives + ' lives remaining');
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
            balls.forEach(b => setBallSpeed(b, currentBallSpeed()));
            break;
        case 'MULTI':
            const origBalls = [...balls];
            origBalls.forEach(b => {
                if (balls.length < 6) {
                    const nb = Object.assign({}, b, { trail: [], contacts: new Set() });
                    nb.vx = -b.vx + (Math.random() - 0.5) * 2;
                    nb.vy = b.vy;
                    setBallSpeed(nb, currentBallSpeed());
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
            activePowerups.SMALL = 500;
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
    toastTime = 108;
}

// ─────────────────────────────────────────────
//  COLLISION HELPERS
// ─────────────────────────────────────────────
function currentBallSpeed() { return state.ballSpeed * (activePowerups.SLOW > 0 ? .7 : 1); }
function setBallSpeed(ball, speed) {
    const magnitude = Math.hypot(ball.vx, ball.vy);
    if (magnitude > 0) { ball.vx *= speed / magnitude; ball.vy *= speed / magnitude; }
}
function launchBalls() {
    if (state.phase !== 'playing') return;
    for (const ball of balls) {
        if (!ball.sticky) continue;
        ball.sticky = false;
        const angle = -Math.PI / 2 + launchDirection * .22;
        ball.vx = Math.cos(angle) * currentBallSpeed();
        ball.vy = Math.sin(angle) * currentBallSpeed();
    }
    fireLaser();
}
function damageBrick(brick) {
    if (brick.type === 'unbreakable' || brick.hits <= 0) return;
    brick.hits--; brick.flash = 6;
    spawnParticles(brick.x + brick.w/2, brick.y + brick.h/2, getBrickColor(brick), 8, 2);
    if (brick.hits > 0) return;
    state.rally++; state.bestRally = Math.max(state.bestRally, state.rally);
    addScore(brick.score);
    impactRings.push({x:brick.x+brick.w/2,y:brick.y+brick.h/2,life:1,color:getBrickColor(brick)});
    if (brick.type === 'explosive') pendingExplosions.push(brick);
    if (Math.random() < LEVEL_DATA[state.level-1].powerupFreq) spawnPowerup(brick.x+brick.w/2,brick.y+brick.h/2);
}
function resolveExplosions() {
    while (pendingExplosions.length) {
        const source = pendingExplosions.pop();
        spawnRingParticles(source.x+source.w/2,source.y+source.h/2,PALETTE.explosive.glow,20);
        for (const brick of bricks) {
            if (brick.hits > 0 && Math.hypot(brick.x-source.x,brick.y-source.y)<110) damageBrick(brick);
        }
    }
    bricks = bricks.filter(brick => brick.hits > 0);
}
function advanceBall(ball, dt) {
    let remaining = dt;
    // Contacts persist until the ball exits a brick, preventing repeated through hits.
    for (const brick of ball.contacts) {
        if (ball.x+ball.r < brick.x || ball.x-ball.r > brick.x+brick.w ||
            ball.y+ball.r < brick.y || ball.y-ball.r > brick.y+brick.h || brick.hits<=0) ball.contacts.delete(brick);
    }
    for (let iteration=0; iteration<8 && remaining>1e-6; iteration++) {
        const dx=ball.vx*remaining, dy=ball.vy*remaining;
        let hit=null;
        const consider=(contact,kind,brick=null)=>{
            if(contact && contact.t>=0 && contact.t<=1 && (!hit||contact.t<hit.t)) hit={...contact,kind,brick};
        };
        if(dx<0)consider({t:(ball.r-ball.x)/dx,nx:1,ny:0},'wall');
        if(dx>0)consider({t:(W-ball.r-ball.x)/dx,nx:-1,ny:0},'wall');
        if(dy<0)consider({t:(ball.r-ball.y)/dy,nx:0,ny:1},'wall');
        if(dy>0) {
            const top=paddle.y-PADDLE_H/2-ball.r, t=(top-ball.y)/dy;
            const x=ball.x+dx*t;
            if(t>=0 && x>=paddle.x-paddle.w/2-ball.r && x<=paddle.x+paddle.w/2+ball.r)
                consider({t,nx:0,ny:-1},'paddle');
        }
        for(const brick of bricks) {
            if(brick.hits<=0 || ball.contacts.has(brick))continue;
            consider(sweepCircleRect(ball.x,ball.y,dx,dy,ball.r,brick),'brick',brick);
        }
        if(!hit){ball.x+=dx;ball.y+=dy;break;}
        ball.x+=dx*hit.t;ball.y+=dy*hit.t;
        remaining*=1-hit.t;
        if(hit.kind==='paddle') {
            Object.assign(ball,paddleBounce((ball.x-paddle.x)/(paddle.w/2),currentBallSpeed()));
            ball.y=paddle.y-PADDLE_H/2-ball.r-.01;
            state.rally=0; paddle.flash=8;
            spawnParticles(ball.x,paddle.y-PADDLE_H/2,'#9affed',8,2);
            if(activePowerups.MAGNET>0){ball.sticky=true;ball.trail=[];break;}
        } else {
            if(hit.brick) { ball.contacts.add(hit.brick);damageBrick(hit.brick); }
            if(!ball.through || !hit.brick || hit.brick.type==='unbreakable') {
                const dot=ball.vx*hit.nx+ball.vy*hit.ny;
                ball.vx-=2*dot*hit.nx;ball.vy-=2*dot*hit.ny;
                ball.x+=hit.nx*.01;ball.y+=hit.ny*.01;
                // Keep shallow bounces from becoming long horizontal stalemates.
                if(Math.abs(ball.vy)<currentBallSpeed()*.18) {
                    ball.vy=(Math.sign(ball.vy)||1)*currentBallSpeed()*.18;
                    setBallSpeed(ball,currentBallSpeed());
                }
            }
        }
    }
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
    state.highScore = Math.max(state.highScore, state.score);
    document.getElementById('score-val').textContent = state.score;
    if (state.score >= state.highScore) {
        document.getElementById('highscore-val').textContent = state.score;
    }
}

// ─────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────
function update(dt) {
    if (state.phase !== 'playing') return;

    const lvl = LEVEL_DATA[state.level - 1];

    effectTime += dt;
    if (toastTime > 0) { toastTime = Math.max(0, toastTime-dt); if (!toastTime) document.getElementById('powerup-toast').classList.remove('show'); }
    paddle.flash = Math.max(0,(paddle.flash||0)-dt);
    for(const brick of bricks) brick.flash = Math.max(0,(brick.flash||0)-dt);
    impactRings.forEach(r=>r.life-=dt*.045); impactRings=impactRings.filter(r=>r.life>0);
    const previousX = paddle.x;
    const direction = Number(!!(keys.ArrowRight || keys.d)) - Number(!!(keys.ArrowLeft || keys.a));
    if (direction) { usingKeyboard = true; paddle.x += direction*paddle.speed*dt; }
    else if (!usingKeyboard) {
        // Responsive pointer tracking with a finite speed, instead of teleportation.
        paddle.x += Math.max(-18*dt,Math.min(18*dt,mouseX-paddle.x));
    }
    paddle.x = Math.max(paddle.w/2,Math.min(W-paddle.w/2,paddle.x));
    if (Math.abs(paddle.x-previousX)>.1) launchDirection=Math.sign(paddle.x-previousX);
    paddle.laserCooldown = Math.max(0,paddle.laserCooldown-dt);
    if(keys[' '])fireLaser();
    for(const ball of balls) if(ball.sticky) {
        ball.x=paddle.x;ball.y=paddle.y-PADDLE_H/2-ball.r-.02;
    }
    for(const type of ['WIDE','SLOW','THROUGH','MAGNET','LASER','SMALL']) {
        if(activePowerups[type]<=0)continue;
        activePowerups[type]=Math.max(0,activePowerups[type]-dt);
        if(activePowerups[type]===0) {
            if(type==='WIDE')paddle.w=lvl.paddleW;
            if(type==='SLOW')balls.forEach(ball=>setBallSpeed(ball,state.ballSpeed));
            if(type==='THROUGH')balls.forEach(ball=>ball.through=false);
            if(type==='SMALL')balls.forEach(ball=>ball.r=BALL_RADIUS);
        }
    }
    for(const ball of balls) {
        if(ball.sticky)continue;
        ball.trail.unshift({x:ball.x,y:ball.y});if(ball.trail.length>16)ball.trail.pop();
        advanceBall(ball,dt);
    }
    resolveExplosions();

    if (!bricks.some(brick=>brick.type!=='unbreakable')) {
        updateLiveStatus(); showLevelClear(); return;
    }
    // Remove dead balls
    balls = balls.filter(b => b.sticky || b.y - b.r <= H);

    if (balls.length === 0) {
        // All balls lost
        state.lives--;
        state.rally = 0;
        updateHUD();
        if (state.lives <= 0) {
            showGameOver();
            return;
        }
        // Respawn
        for(const type of Object.keys(activePowerups))activePowerups[type]=0;
        paddle.w=lvl.paddleW; powerups=[];lasers=[];
        const speed = state.ballSpeed;
        const angle = -Math.PI / 2;
        balls = [makeBall(paddle.x, paddle.y - PADDLE_H / 2 - BALL_RADIUS - 2, angle, speed, true)];
        return;
    }

    // Lasers use the same swept collision and damage path as balls.
    for(const laser of lasers) {
        let nearest=null;
        for(const brick of bricks) {
            if(brick.hits<=0)continue;
            const hit=sweepCircleRect(laser.x,laser.y,0,laser.vy*dt,1,brick);
            if(hit && (!nearest||hit.t<nearest.t))nearest={...hit,brick};
        }
        if(nearest){damageBrick(nearest.brick);laser.y=-50;}
        else laser.y+=laser.vy*dt;
    }
    lasers=lasers.filter(laser=>laser.y>0);
    resolveExplosions();

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

    updateLiveStatus();

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
        ctx.shadowBlur = reducedMotion.matches ? 0 : 8;
        ctx.fill();
        ctx.restore();
    });

    if (!reducedMotion.matches) for (const ring of impactRings) {
        ctx.save();ctx.globalAlpha=ring.life*.5;ctx.strokeStyle=ring.color;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(ring.x,ring.y,8+(1-ring.life)*34,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    // Bricks
    bricks.forEach(brick => drawBrick(brick));

    // Powerups
    powerups.forEach(p => drawPowerup(p));

    // Lasers
    lasers.forEach(l => {
        ctx.save();
        ctx.strokeStyle = '#ff4757';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = reducedMotion.matches ? 0 : 15;
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
        (reducedMotion.matches ? [] : ball.trail).forEach((t, i) => {
            const alpha = (1 - i / ball.trail.length) * 0.4;
            const r = ball.r * (1 - i / ball.trail.length) * 0.8;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
            ctx.fillStyle = ball.through ? '#00d2d3' : '#ffffff';
            ctx.shadowColor = ball.through ? '#00d2d3' : PALETTE.ball.glow;
            ctx.shadowBlur = reducedMotion.matches ? 0 : 10;
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
        ctx.shadowBlur = reducedMotion.matches ? 0 : 20;
        ctx.fill();
        ctx.restore();
    });

    // Predictable serve preview, using the same angle as launchBalls.
    if (balls.some(ball=>ball.sticky)) {
        const ball=balls.find(ball=>ball.sticky);
        const angle=-Math.PI/2+launchDirection*.22;
        ctx.save();ctx.strokeStyle='#a4f8e480';ctx.lineWidth=1.5;ctx.setLineDash([4,6]);
        ctx.beginPath();ctx.moveTo(ball.x,ball.y-12);ctx.lineTo(ball.x+Math.cos(angle)*86,ball.y+Math.sin(angle)*86);ctx.stroke();ctx.restore();
    }
    // Paddle
    drawPaddle();
}

function drawGrid() {
    ctx.save();
    const glow=ctx.createRadialGradient(W/2,160,20,W/2,H/2,520);
    glow.addColorStop(0,'#162e42');glow.addColorStop(1,'#08121d');
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#73b1c110';ctx.lineWidth=1;
    ctx.beginPath();
    for(let x=0;x<W;x+=40){ctx.moveTo(x,0);ctx.lineTo(x,H)}
    for(let y=0;y<H;y+=40){ctx.moveTo(0,y);ctx.lineTo(W,y)}
    ctx.stroke();
    ctx.fillStyle='#779cad';ctx.font='600 10px system-ui, sans-serif';ctx.textAlign='left';
    ctx.fillText('SECTOR '+String(state.level).padStart(2,'0')+' / 20',BRICK_START_X,30);
    ctx.textAlign='right';ctx.fillStyle='#799ba7';ctx.fillText('FIND THE ANGLE',W-BRICK_START_X,30);
    ctx.strokeStyle='#4bc6b855';
    ctx.beginPath();ctx.moveTo(8,8);ctx.lineTo(8,H-8);ctx.moveTo(W-8,8);ctx.lineTo(W-8,H-8);ctx.stroke();
    ctx.strokeStyle='#dd709d55';ctx.setLineDash([3,8]);ctx.beginPath();ctx.moveTo(24,H-6);ctx.lineTo(W-24,H-6);ctx.stroke();
    ctx.restore();
}

function drawBrick(b) {
    ctx.save();
    let fill, glow, text = null;

    if (b.type === 'unbreakable') {
        fill = PALETTE.unbreakable.fill;
        glow = PALETTE.unbreakable.glow;
        text = '−';
    } else if (b.type === 'strong') {
        // darken if damaged
        const t = b.hits / b.maxHits;
        fill = t >= 1 ? PALETTE.strongBrick.fill : '#7a6bc9';
        glow = PALETTE.strongBrick.glow;
        text = b.hits > 1 ? 'Ⅱ' : 'Ⅰ';
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
    grad.addColorStop(0, '#263b4d');
    grad.addColorStop(1, '#13212f');
    ctx.fillStyle = b.flash > 0 && !reducedMotion.matches ? '#e9ffff' : grad;
    ctx.shadowColor = glow;
    ctx.shadowBlur = reducedMotion.matches ? 0 : 5;
    ctx.fill();

    // Border highlight
    ctx.strokeStyle = fill;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner shine
    ctx.beginPath();
    ctx.roundRect(b.x + 2, b.y + 2, b.w - 4, (b.h - 4) * 0.4, rx - 1);
    ctx.fillStyle = fill;
    ctx.globalAlpha = b.type === 'unbreakable' ? .25 : .65;
    ctx.shadowBlur = 0;
    ctx.fill();

    ctx.globalAlpha = 1;
    if (b.type === 'strong' && b.hits < b.maxHits) {
        ctx.strokeStyle='#c7c1ff';ctx.beginPath();ctx.moveTo(b.x+24,b.y+3);ctx.lineTo(b.x+30,b.y+10);ctx.lineTo(b.x+26,b.y+19);ctx.stroke();
    }
    // Text label
    if (text) {
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = reducedMotion.matches ? 0 : 8;
        ctx.font = '700 12px system-ui, sans-serif';
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
    ctx.shadowBlur = reducedMotion.matches ? 0 : 24;

    const grad = ctx.createLinearGradient(px, py, px, py + PADDLE_H);
    grad.addColorStop(0, paddle.flash > 0 ? '#ffffff' : '#cefff1');
    grad.addColorStop(0.4, PALETTE.paddle.fill);
    grad.addColorStop(1, '#267b82');

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

    // Contrasting end caps make the angled-hit zones easy to judge.
    ctx.fillStyle='#d5fff0';ctx.fillRect(px+3,py+2,5,PADDLE_H-4);ctx.fillRect(px+paddle.w-8,py+2,5,PADDLE_H-4);
    ctx.fillStyle='#173b44';ctx.fillRect(paddle.x-12,py+4,24,4);
    // Laser indicator
    if (activePowerups.LASER > 0) {
        ctx.strokeStyle = '#ff4757';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = reducedMotion.matches ? 0 : 10;
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
    ctx.rotate(reducedMotion.matches ? 0 : p.angle);

    ctx.shadowColor = cfg.glow;
    ctx.shadowBlur = reducedMotion.matches ? 0 : 20;

    // Hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = Math.cos(a) * p.r;
        const py = Math.sin(a) * p.r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#122534';
    ctx.fill();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Letter
    ctx.rotate(reducedMotion.matches ? 0 : -p.angle);
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.font = '750 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symbols={WIDE:'↔',SLOW:'S',MULTI:'×2',LASER:'Ⅱ',LIFE:'+',SMALL:'•',THROUGH:'↑',MAGNET:'M'};
    ctx.fillText(symbols[p.type], 0, 0);

    ctx.restore();
}

// ─────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────
function loop(ts) {
    const seconds=Math.max(0,(ts-lastTime)/1000);lastTime=ts;
    if(state.phase==='playing')clock.advance(seconds,update);
    if(state.phase!=='start' && paddle) draw();
    animId=requestAnimationFrame(loop);
}
function resizeCanvas() {
    const scale=Math.min(2,window.devicePixelRatio||1);
    canvas.width=W*scale;canvas.height=H*scale;ctx.setTransform(scale,0,0,scale,0,0);
}
resizeCanvas();window.addEventListener('resize',resizeCanvas);
function updateLiveStatus() {
    const remaining=bricks.filter(b=>b.type!=='unbreakable').length;
    document.getElementById('bricks-val').textContent=remaining+' bricks';
    document.getElementById('rally-val').textContent=state.rally>1?state.rally+' brick rally':'';
    document.getElementById('boost-status').textContent=Object.entries(activePowerups)
        .filter(([,time])=>time>0).map(([type,time])=>PALETTE.powerup[type].label+' '+Math.ceil(time/60)+'s').join(' · ');
    document.getElementById('launch-hint').hidden=!balls.some(ball=>ball.sticky);
}

// One input path for keyboard, mouse and touch; pointer coordinates use world units.
document.addEventListener('keydown',e=>{
    if(e.target.matches('input,textarea'))return;
    if(['p','P','Escape'].includes(e.key) && !e.repeat){togglePause();return;}
    if(state.phase!=='playing')return;
    if(e.target.tagName==='BUTTON' && (e.key===' ' || e.key==='Enter'))return;
    const key=e.key.length===1?e.key.toLowerCase():e.key;
    keys[key]=true;
    if(['ArrowLeft','ArrowRight','a','d',' '].includes(key))e.preventDefault();
    if(key===' '&&!e.repeat)launchBalls();
});
document.addEventListener('keyup',e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=false;});
function movePointer(e) {
    if(state.phase!=='playing')return;
    mouseX=pointerPosition(e.clientX,canvas.getBoundingClientRect(),W);
    usingKeyboard=false;
}
canvas.addEventListener('pointermove',movePointer);
canvas.addEventListener('pointerdown',e=>{
    if(state.phase!=='playing')return;
    e.preventDefault();canvas.focus();canvas.setPointerCapture(e.pointerId);movePointer(e);
    if (balls.some(ball=>ball.sticky)) {
        paddle.x=Math.max(paddle.w/2,Math.min(W-paddle.w/2,mouseX));
        for(const ball of balls) if(ball.sticky) {ball.x=paddle.x;ball.y=paddle.y-PADDLE_H/2-ball.r-.02;}
    }
    launchBalls();
});
window.addEventListener('blur',()=>{keys={};if(state.phase==='playing')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys={};if(state.phase==='playing')togglePause();}});
document.getElementById('pause-btn').addEventListener('click',togglePause);
document.getElementById('launch-btn').addEventListener('click',launchBalls);

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
updateHUD();

// Helper to enter submit from keyboard
document.getElementById('go-hs-initials').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') document.getElementById('go-hs-submit').click();
});
document.getElementById('win-hs-initials').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') document.getElementById('win-hs-submit').click();
});

const sl = document.getElementById('start-leaderboard');
if (sl) sl.innerHTML = generateLeaderboardHTML('breakout');

lastTime=performance.now();
animId=requestAnimationFrame(loop);

for (const prefix of ['go','win']) {
    document.getElementById(prefix+'-hs-skip').addEventListener('click',()=>{
        document.getElementById(prefix+'-hs-input').style.display='none';
        document.getElementById(prefix+'-buttons').style.display='flex';
        const scores=document.getElementById(prefix+'-leaderboard');
        scores.style.display='block';scores.innerHTML=generateLeaderboardHTML('breakout');
        document.getElementById(prefix+'-buttons').querySelector('button').focus();
    });
}
