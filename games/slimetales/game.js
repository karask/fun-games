// ══════════════════════════════════════════════════════════════
// SLIME TALES — Main Game Engine
// ══════════════════════════════════════════════════════════════

import { levels, TILE } from './levels.js';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CANVAS_W = 800;
const CANVAS_H = 560;
const TILE_SIZE = 32;

const GRAVITY = 0.55;
const JUMP_FORCE = -10.5;
const MOVE_ACCEL = 0.9;
const FRICTION = 0.78;
const AIR_FRICTION = 0.84;
const MAX_FALL_SPEED = 14;
const MAX_H_SPEED = 6.5;
const DIAGONAL_BOOST = 1.0;

const SLIME_W = 36;
const SLIME_H = 38;
const SLIME_SHRINK_W = 24;
const SLIME_SHRINK_H = 18;

// ═══════════════════════════════════════════════════════════════
// CANVAS & DOM
// ═══════════════════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
canvas.setAttribute('tabindex', '0');

// Overlay elements
const menuOverlay = document.getElementById('menu-overlay');
const levelSelectOverlay = document.getElementById('level-select-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const levelCompleteOverlay = document.getElementById('level-complete-overlay');
const levelGrid = document.getElementById('level-grid');
const pauseHint = document.getElementById('pause-hint');

// ═══════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════

let state = 'MENU'; // MENU | LEVEL_SELECT | PLAYING | GAME_OVER | LEVEL_COMPLETE
let playerCount = 1;
let currentLevelIndex = -1;
let unlockedLevel = parseInt(localStorage.getItem('slimetales_unlocked') || '1');
let players = [];
let camera = { x: 0, y: 0 };
let tileMap = null;
let levelData = null;
let particles = [];
let frameCount = 0;
let screenShake = 0;
let shakeX = 0, shakeY = 0;
let gameOverTimer = 0;
let levelCompleteTimer = 0;

// ═══════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════

const keys = {};

window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

canvas.addEventListener('click', () => canvas.focus());

// ═══════════════════════════════════════════════════════════════
// TILE HELPERS
// ═══════════════════════════════════════════════════════════════

function getTile(col, row) {
    if (!tileMap || row < 0 || row >= tileMap.length || col < 0 || col >= tileMap[0].length) {
        return TILE.AIR;
    }
    return tileMap[row][col];
}

function isSolid(col, row) {
    return getTile(col, row) === TILE.SOLID;
}

// ═══════════════════════════════════════════════════════════════
// SLIME CLASS
// ═══════════════════════════════════════════════════════════════

class Slime {
    constructor(px, py, playerNum) {
        this.x = px;
        this.y = py;
        this.vx = 0;
        this.vy = 0;
        this.playerNum = playerNum;
        this.alive = true;

        this.width = SLIME_W;
        this.height = SLIME_H;
        this.shrunk = false;
        this.grounded = false;
        this.facing = 1;

        // Animation
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.squashX = 1;
        this.squashY = 1;
        this.moveAnim = 0;
        this.blinkTimer = 120 + Math.random() * 180;
        this.isBlinking = false;
        this.blinkDuration = 0;

        // Colors
        if (playerNum === 1) {
            this.colorBase = '#ff00ff';
            this.colorLight = '#ff88ff';
            this.colorDark = '#aa00aa';
            this.colorGlow = 'rgba(255, 0, 255, 0.35)';
            this.controls = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
        } else {
            this.colorBase = '#00bfff';
            this.colorLight = '#88ddff';
            this.colorDark = '#0088bb';
            this.colorGlow = 'rgba(0, 191, 255, 0.35)';
            this.controls = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
        }
    }

    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }
    get bottom() { return this.y + this.height; }

    // ── Update ───────────────────────────────────────────────

    update() {
        if (!this.alive) return;

        this.handleInput();
        this.applyPhysics();
        this.resolveCollisions();
        this.checkHazards();
        this.animate();
    }

    // ── Input ────────────────────────────────────────────────

    handleInput() {
        const wantLeft = keys[this.controls.left];
        const wantRight = keys[this.controls.right];
        const wantUp = keys[this.controls.up];
        const wantDown = keys[this.controls.down];

        // Horizontal movement
        if (wantLeft) {
            this.vx -= MOVE_ACCEL;
            this.facing = -1;
        }
        if (wantRight) {
            this.vx += MOVE_ACCEL;
            this.facing = 1;
        }

        // Jump
        if (wantUp && this.grounded) {
            this.vy = JUMP_FORCE;
            this.grounded = false;
            this.squashY = 1.35;
            this.squashX = 0.7;

            if (wantRight) this.vx += DIAGONAL_BOOST;
            if (wantLeft) this.vx -= DIAGONAL_BOOST;

            spawnLandParticles(this.centerX, this.bottom, this.colorBase);
        }

        // Shrink / Unshrink
        if (wantDown) {
            if (!this.shrunk) {
                this.shrunk = true;
                const oldBottom = this.bottom;
                this.x += (this.width - SLIME_SHRINK_W) / 2;
                this.width = SLIME_SHRINK_W;
                this.height = SLIME_SHRINK_H;
                this.y = oldBottom - this.height;
            }
        } else {
            if (this.shrunk && this.canUnshrink()) {
                const oldBottom = this.bottom;
                this.x -= (SLIME_W - this.width) / 2;
                this.width = SLIME_W;
                this.height = SLIME_H;
                this.y = oldBottom - this.height;
                this.shrunk = false;
            }
        }
    }

    canUnshrink() {
        const testX = this.centerX - SLIME_W / 2;
        const testY = this.bottom - SLIME_H;
        const c1 = Math.floor(testX / TILE_SIZE);
        const c2 = Math.floor((testX + SLIME_W - 0.01) / TILE_SIZE);
        const r1 = Math.floor(testY / TILE_SIZE);
        const r2 = Math.floor((testY + SLIME_H - 0.01) / TILE_SIZE);

        for (let r = r1; r <= r2; r++)
            for (let c = c1; c <= c2; c++)
                if (isSolid(c, r)) return false;
        return true;
    }

    // ── Physics ──────────────────────────────────────────────

    applyPhysics() {
        this.vy += GRAVITY;
        if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

        this.vx *= (this.grounded ? FRICTION : AIR_FRICTION);
        if (this.vx > MAX_H_SPEED) this.vx = MAX_H_SPEED;
        if (this.vx < -MAX_H_SPEED) this.vx = -MAX_H_SPEED;
        if (Math.abs(this.vx) < 0.08) this.vx = 0;
    }

    // ── Collision ────────────────────────────────────────────

    resolveCollisions() {
        // Move X then resolve
        this.x += this.vx;
        this._resolveX();

        // Move Y then resolve
        this.y += this.vy;
        this._resolveY();

        // Level bounds
        if (this.x < 0) { this.x = 0; this.vx = 0; }
        if (levelData && this.x + this.width > levelData.width * TILE_SIZE) {
            this.x = levelData.width * TILE_SIZE - this.width;
            this.vx = 0;
        }
        if (this.y < 0) { this.y = 0; this.vy = 0; }

        // Fall out of level
        if (levelData && this.y > levelData.height * TILE_SIZE + 96) {
            this.pop();
        }
    }

    _resolveX() {
        const c1 = Math.floor(this.x / TILE_SIZE);
        const c2 = Math.floor((this.x + this.width - 0.01) / TILE_SIZE);
        const r1 = Math.floor(this.y / TILE_SIZE);
        const r2 = Math.floor((this.y + this.height - 0.01) / TILE_SIZE);

        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                if (!isSolid(c, r)) continue;
                if (this.vx > 0) {
                    this.x = c * TILE_SIZE - this.width;
                } else if (this.vx < 0) {
                    this.x = (c + 1) * TILE_SIZE;
                }
                this.vx = 0;
            }
        }
    }

    _resolveY() {
        this.grounded = false;
        const c1 = Math.floor(this.x / TILE_SIZE);
        const c2 = Math.floor((this.x + this.width - 0.01) / TILE_SIZE);
        const r1 = Math.floor(this.y / TILE_SIZE);
        const r2 = Math.floor((this.y + this.height - 0.01) / TILE_SIZE);

        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const tile = getTile(c, r);

                if (tile === TILE.SOLID) {
                    if (this.vy > 0) {
                        // Landing: squash effect
                        if (this.vy > 3) {
                            this.squashY = Math.max(0.55, 1 - this.vy * 0.035);
                            this.squashX = Math.min(1.45, 1 + this.vy * 0.025);
                            spawnLandParticles(this.centerX, r * TILE_SIZE, this.colorBase);
                        }
                        this.y = r * TILE_SIZE - this.height;
                        this.vy = 0;
                        this.grounded = true;
                    } else if (this.vy < 0) {
                        this.y = (r + 1) * TILE_SIZE;
                        this.vy = 0;
                    }
                } else if (tile === TILE.PLATFORM) {
                    if (this.vy > 0) {
                        const prevBottom = (this.y - this.vy) + this.height;
                        const tileTop = r * TILE_SIZE;
                        if (prevBottom <= tileTop + 2) {
                            this.y = tileTop - this.height;
                            this.vy = 0;
                            this.grounded = true;
                        }
                    }
                }
            }
        }
    }

    // ── Hazard Check ─────────────────────────────────────────

    checkHazards() {
        if (!this.alive) return;
        const margin = 4;
        const c1 = Math.floor((this.x + margin) / TILE_SIZE);
        const c2 = Math.floor((this.x + this.width - margin - 0.01) / TILE_SIZE);
        const r1 = Math.floor((this.y + margin) / TILE_SIZE);
        const r2 = Math.floor((this.y + this.height - margin - 0.01) / TILE_SIZE);

        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const t = getTile(c, r);
                if (t === TILE.SPIKE_UP || t === TILE.SPIKE_DOWN || t === TILE.TOXIC) {
                    this.pop();
                    return;
                }
            }
        }
    }

    // ── Death ────────────────────────────────────────────────

    pop() {
        if (!this.alive) return;
        this.alive = false;
        spawnDeathParticles(this.centerX, this.centerY, this.colorBase);
        screenShake = 18;
    }

    respawn(px, py) {
        this.x = px;
        this.y = py;
        this.vx = 0;
        this.vy = 0;
        this.alive = true;
        this.shrunk = false;
        this.width = SLIME_W;
        this.height = SLIME_H;
        this.squashX = 1;
        this.squashY = 1;
        spawnReviveParticles(this.centerX, this.centerY);
    }

    // ── Animation ────────────────────────────────────────────

    animate() {
        this.wobblePhase += 0.07;

        // Crawling animation
        if (Math.abs(this.vx) > 0.5) {
            this.moveAnim += 0.18;
        }

        // Squash/stretch spring toward 1
        this.squashY += (1 - this.squashY) * 0.12;
        this.squashX += (1 - this.squashX) * 0.12;

        // Velocity-based stretch
        if (!this.grounded) {
            const vStretch = 1 - this.vy * 0.012;
            const hStretch = 1 + this.vy * 0.008;
            this.squashY += (vStretch - this.squashY) * 0.08;
            this.squashX += (hStretch - this.squashX) * 0.08;
        }

        // Blinking
        this.blinkTimer--;
        if (this.blinkTimer <= 0) {
            this.isBlinking = true;
            this.blinkDuration = 7;
            this.blinkTimer = 120 + Math.random() * 200;
        }
        if (this.isBlinking) {
            this.blinkDuration--;
            if (this.blinkDuration <= 0) this.isBlinking = false;
        }

        // Trail particles
        if ((Math.abs(this.vx) > 1.2 || Math.abs(this.vy) > 2) && frameCount % 3 === 0) {
            spawnTrailParticle(this.centerX, this.bottom - 2, this.colorBase);
        }
    }

    // ── Draw ─────────────────────────────────────────────────

    draw() {
        if (!this.alive) return;

        // Calculate visual (drawn) dimensions — slightly larger than collision box
        const scale = this.shrunk ? 0.65 : 1;
        const drawW = SLIME_W * 1.2 * scale;
        const drawH = SLIME_H * 1.2 * scale;
        const drawX = this.x + this.width / 2 - drawW / 2;
        const drawY = this.bottom - drawH;

        const sx = drawX - camera.x;
        const sy = drawY - camera.y;

        ctx.save();

        // Glow under slime
        const glowGrad = ctx.createRadialGradient(
            sx + drawW / 2, sy + drawH, 2,
            sx + drawW / 2, sy + drawH, drawW * 0.6
        );
        glowGrad.addColorStop(0, this.colorGlow);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(sx - drawW, sy, drawW * 3, drawH * 1.5);

        this.drawBody(ctx, sx, sy, drawW, drawH);
        this.drawEyes(ctx, sx, sy, drawW, drawH);

        ctx.restore();
    }

    drawBody(ctx, sx, sy, drawW, drawH) {
        const cx = sx + drawW / 2;
        const cy = sy + drawH * 0.45;
        const rx = drawW / 2;
        const ry = drawH / 2;

        const N = 10;
        const pts = [];

        for (let i = 0; i < N; i++) {
            const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
            let rad = 1;

            // Flatten bottom
            const sinA = Math.sin(angle);
            if (sinA > 0.2) rad -= (sinA - 0.2) * 0.12;

            // Wobble
            rad += Math.sin(this.wobblePhase + i * 1.2) * 0.035;

            // Crawl wave
            if (Math.abs(this.vx) > 0.5) {
                rad += Math.sin(this.moveAnim + i * 0.8) * 0.04;
            }

            // Idle breath
            rad += Math.sin(frameCount * 0.025 + i) * 0.015;

            pts.push({
                x: cx + Math.cos(angle) * rx * rad * this.squashX,
                y: cy + Math.sin(angle) * ry * rad * this.squashY
            });
        }

        // Draw smooth blob with quadratic bezier through midpoints
        ctx.beginPath();
        const last = pts[N - 1];
        ctx.moveTo((last.x + pts[0].x) / 2, (last.y + pts[0].y) / 2);
        for (let i = 0; i < N; i++) {
            const next = pts[(i + 1) % N];
            ctx.quadraticCurveTo(
                pts[i].x, pts[i].y,
                (pts[i].x + next.x) / 2,
                (pts[i].y + next.y) / 2
            );
        }
        ctx.closePath();

        // Gradient fill
        const grad = ctx.createRadialGradient(
            cx - rx * 0.2, cy - ry * 0.3, 2,
            cx, cy + ry * 0.15, Math.max(rx, ry) * 1.15
        );
        grad.addColorStop(0, this.colorLight);
        grad.addColorStop(0.55, this.colorBase);
        grad.addColorStop(1, this.colorDark);
        ctx.fillStyle = grad;
        ctx.fill();

        // Outer glow stroke
        ctx.save();
        ctx.shadowColor = this.colorGlow;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = this.colorBase;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // Glossy highlight
        ctx.beginPath();
        ctx.ellipse(
            cx - rx * 0.18, cy - ry * 0.3,
            rx * 0.3, ry * 0.14,
            -0.2, 0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fill();
    }

    drawEyes(ctx, sx, sy, drawW, drawH) {
        const cx = sx + drawW / 2;
        const cy = sy + drawH * 0.3;
        const spacing = drawW * 0.2 * this.squashX;
        const eyeW = drawW * 0.15;
        const eyeH = drawH * 0.2;
        const blinkY = this.isBlinking ? 0.08 : 1;

        for (const side of [-1, 1]) {
            const ex = cx + side * spacing;
            const ey = cy;

            // Sclera
            ctx.beginPath();
            ctx.ellipse(ex, ey, eyeW * this.squashX, eyeH * blinkY * this.squashY, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.12)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            if (!this.isBlinking) {
                // Pupil
                const lookX = this.facing * eyeW * 0.25 + this.vx * 0.3;
                const lookY = Math.max(-eyeH * 0.2, Math.min(eyeH * 0.15, this.vy * 0.3));
                const px = ex + Math.max(-eyeW * 0.35, Math.min(eyeW * 0.35, lookX));
                const py = ey + lookY;

                ctx.beginPath();
                ctx.ellipse(px, py, eyeW * 0.5, eyeH * 0.55, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#1a1a2e';
                ctx.fill();

                // Highlight
                ctx.beginPath();
                ctx.ellipse(
                    px - eyeW * 0.15, py - eyeH * 0.2,
                    eyeW * 0.16, eyeH * 0.16,
                    0, 0, Math.PI * 2
                );
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fill();
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════════════

function addParticle(x, y, vx, vy, radius, color, life, decay, grav) {
    particles.push({ x, y, vx, vy, r: radius, color, life, decay, gravity: grav || 0 });
}

function spawnDeathParticles(x, y, color) {
    for (let i = 0; i < 28; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 5.5;
        addParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 3,
            2.5 + Math.random() * 5,
            color, 1,
            0.01 + Math.random() * 0.015,
            0.18
        );
    }
}

function spawnTrailParticle(x, y, color) {
    addParticle(
        x + (Math.random() - 0.5) * 12, y,
        (Math.random() - 0.5) * 0.4,
        -Math.random() * 0.6,
        1.5 + Math.random() * 2,
        color, 0.6,
        0.02, 0
    );
}

function spawnLandParticles(x, y, color) {
    for (let i = 0; i < 6; i++) {
        const dir = (Math.random() - 0.5) * 2;
        addParticle(
            x + dir * 12, y,
            dir * 2, -0.5 - Math.random() * 1.5,
            1.5 + Math.random() * 2.5,
            color, 0.7,
            0.02, 0.08
        );
    }
}

function spawnReviveParticles(x, y) {
    for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        addParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 2,
            2 + Math.random() * 3.5,
            '#ff4444', 1,
            0.012, 0.06
        );
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (const p of particles) {
        const sx = p.x - camera.x;
        const sy = p.y - camera.y;
        if (sx < -20 || sx > CANVAS_W + 20 || sy < -20 || sy > CANVAS_H + 20) continue;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.5, p.r * p.life), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════
// RENDERING — BACKGROUND
// ═══════════════════════════════════════════════════════════════

function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#080818');
    grad.addColorStop(0.4, '#0c0c24');
    grad.addColorStop(1, '#140a28');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Distant stars / particles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (let i = 0; i < 35; i++) {
        const sx = ((i * 97 + 13) % CANVAS_W);
        const sy = ((i * 61 + 7) % (CANVAS_H * 0.7));
        const pulse = Math.sin(frameCount * 0.015 + i * 0.8) * 0.4 + 0.6;
        ctx.globalAlpha = 0.02 + pulse * 0.06;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5 + (i % 3) * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Parallax cave layer 1 (distant)
    drawParallaxLayer(0.06, 'rgba(18, 14, 38, 0.8)', 10, 180, 90);

    // Parallax cave layer 2 (mid)
    drawParallaxLayer(0.15, 'rgba(22, 16, 42, 0.5)', 7, 260, 55);
}

function drawParallaxLayer(factor, color, count, spacing, baseH) {
    const offset = camera.x * factor;
    ctx.fillStyle = color;

    for (let i = -1; i < count + 2; i++) {
        const bx = i * spacing - (offset % spacing);
        const h = baseH + Math.sin(i * 2.1 + 0.7) * baseH * 0.5;

        // Stalagmite from bottom
        ctx.beginPath();
        ctx.moveTo(bx, CANVAS_H);
        ctx.lineTo(bx + spacing * 0.15, CANVAS_H - h);
        ctx.lineTo(bx + spacing * 0.3, CANVAS_H);
        ctx.closePath();
        ctx.fill();

        // Stalactite from top
        const th = h * 0.4 + Math.sin(i * 3.2) * 15;
        ctx.beginPath();
        ctx.moveTo(bx + spacing * 0.5, 0);
        ctx.lineTo(bx + spacing * 0.55, th);
        ctx.lineTo(bx + spacing * 0.6, 0);
        ctx.closePath();
        ctx.fill();
    }
}

// ═══════════════════════════════════════════════════════════════
// RENDERING — TILES
// ═══════════════════════════════════════════════════════════════

function drawTiles() {
    const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
    const endCol = Math.min(tileMap[0].length - 1, Math.ceil((camera.x + CANVAS_W) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
    const endRow = Math.min(tileMap.length - 1, Math.ceil((camera.y + CANVAS_H) / TILE_SIZE) + 1);

    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const tile = tileMap[r][c];
            if (tile === TILE.AIR) continue;
            drawTile(c, r, tile);
        }
    }
}

function drawTile(c, r, type) {
    const x = c * TILE_SIZE - camera.x;
    const y = r * TILE_SIZE - camera.y;

    switch (type) {
        case TILE.SOLID: {
            const isTop = getTile(c, r - 1) !== TILE.SOLID;
            const isLeft = getTile(c - 1, r) !== TILE.SOLID;
            const isRight = getTile(c + 1, r) !== TILE.SOLID;

            // Base
            ctx.fillStyle = isTop ? '#353550' : '#282840';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Edges
            ctx.fillStyle = isTop ? '#454568' : '#323250';
            ctx.fillRect(x, y, TILE_SIZE, 2);
            if (isLeft) ctx.fillRect(x, y, 2, TILE_SIZE);

            ctx.fillStyle = '#1a1a30';
            ctx.fillRect(x, y + TILE_SIZE - 1, TILE_SIZE, 1);
            if (isRight) ctx.fillRect(x + TILE_SIZE - 1, y, 1, TILE_SIZE);

            // Surface moss / grass
            if (isTop) {
                ctx.fillStyle = '#2a7a2a';
                ctx.fillRect(x, y, TILE_SIZE, 3);
                ctx.fillStyle = '#3a9a3a';
                const seed = c * 7 + r * 13;
                if (seed % 5 < 2) ctx.fillRect(x + (seed % 7) * 4, y, 6, 2);
                if (seed % 3 < 1) ctx.fillRect(x + ((seed + 3) % 8) * 4, y + 1, 4, 2);
            }

            // Inner detail
            const detailSeed = c * 31 + r * 17;
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            if (detailSeed % 7 < 2) {
                ctx.fillRect(x + (detailSeed % 20) + 4, y + (detailSeed % 12) + 6, 3, 2);
            }
            break;
        }

        case TILE.SPIKE_UP: {
            // Metallic spike triangle
            ctx.beginPath();
            ctx.moveTo(x + TILE_SIZE / 2, y + 2);
            ctx.lineTo(x + 3, y + TILE_SIZE);
            ctx.lineTo(x + TILE_SIZE - 3, y + TILE_SIZE);
            ctx.closePath();

            const sGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
            sGrad.addColorStop(0, '#c0c0d8');
            sGrad.addColorStop(0.5, '#888898');
            sGrad.addColorStop(1, '#555568');
            ctx.fillStyle = sGrad;
            ctx.fill();

            // Highlight edge
            ctx.beginPath();
            ctx.moveTo(x + TILE_SIZE / 2, y + 2);
            ctx.lineTo(x + 3, y + TILE_SIZE);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Tip glow
            ctx.beginPath();
            ctx.arc(x + TILE_SIZE / 2, y + 5, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 100, 100, 0.25)';
            ctx.fill();
            break;
        }

        case TILE.TOXIC: {
            // Liquid body
            ctx.fillStyle = '#003916';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Animated surface
            ctx.beginPath();
            ctx.moveTo(x, y + 6);
            for (let px = 0; px <= TILE_SIZE; px += 2) {
                const wave = Math.sin(frameCount * 0.05 + (c * TILE_SIZE + px) * 0.08) * 3;
                ctx.lineTo(x + px, y + 3 + wave);
            }
            ctx.lineTo(x + TILE_SIZE, y);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.fillStyle = '#00cc44';
            ctx.fill();

            // Body glow
            const tGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
            tGrad.addColorStop(0, 'rgba(0, 200, 80, 0.25)');
            tGrad.addColorStop(1, 'rgba(0, 40, 15, 0.4)');
            ctx.fillStyle = tGrad;
            ctx.fillRect(x, y + 6, TILE_SIZE, TILE_SIZE - 6);

            // Glow above surface
            ctx.fillStyle = 'rgba(0, 255, 80, 0.04)';
            ctx.fillRect(x, y - 12, TILE_SIZE, 15);

            // Occasional bubble
            if ((frameCount + c * 13) % 50 < 4) {
                const bx = x + TILE_SIZE / 2 + Math.sin(frameCount * 0.1 + c) * 8;
                const by = y + Math.sin(frameCount * 0.15) * 4;
                ctx.beginPath();
                ctx.arc(bx, by, 1.5 + Math.sin(frameCount * 0.2) * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(100, 255, 150, 0.45)';
                ctx.fill();
            }
            break;
        }

        case TILE.PLATFORM: {
            // Semi-transparent platform
            ctx.fillStyle = 'rgba(120, 140, 200, 0.55)';
            ctx.fillRect(x, y, TILE_SIZE, 6);
            ctx.fillStyle = 'rgba(160, 180, 240, 0.75)';
            ctx.fillRect(x, y, TILE_SIZE, 3);

            // Edge glow
            ctx.fillStyle = 'rgba(180, 200, 255, 0.15)';
            ctx.fillRect(x, y + 6, TILE_SIZE, 2);

            // Dashed underline hint
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(120, 140, 200, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y + 7);
            ctx.lineTo(x + TILE_SIZE, y + 7);
            ctx.stroke();
            ctx.setLineDash([]);
            break;
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// RENDERING — FLAGS
// ═══════════════════════════════════════════════════════════════

function drawFlags() {
    if (!levelData) return;

    // Revival flags (red)
    for (const rf of levelData.revivalFlags) {
        drawFlag(rf.col * TILE_SIZE, rf.row * TILE_SIZE, '#ee3333', false);
    }

    // End flag (green)
    drawFlag(levelData.endFlag.col * TILE_SIZE, levelData.endFlag.row * TILE_SIZE, '#33cc33', true);
}

function drawFlag(pixelX, pixelY, color, isEnd) {
    const x = pixelX - camera.x + 12;
    const y = pixelY - camera.y;

    // Pole shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 2, y - 46, 5, 48);

    // Pole
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x, y - 48, 4, 50);

    // Pole top ball
    ctx.beginPath();
    ctx.arc(x + 2, y - 49, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();

    // Flag cloth (animated wave)
    const wave1 = Math.sin(frameCount * 0.07) * 4;
    const wave2 = Math.sin(frameCount * 0.07 + 1.2) * 3;

    ctx.beginPath();
    ctx.moveTo(x + 4, y - 48);
    ctx.quadraticCurveTo(x + 16 + wave1, y - 46, x + 28 + wave2, y - 42);
    ctx.lineTo(x + 26 + wave1 * 0.7, y - 32);
    ctx.quadraticCurveTo(x + 14 + wave2 * 0.5, y - 34, x + 4, y - 32);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Flag detail
    if (isEnd) {
        // Checkered pattern
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 10 + wave1 * 0.3, y - 46, 4, 4);
        ctx.fillRect(x + 18 + wave2 * 0.5, y - 42, 4, 4);
        ctx.fillRect(x + 10 + wave1 * 0.3, y - 38, 4, 4);

        // Glow effect for end flag
        ctx.save();
        ctx.shadowColor = '#33ff33';
        ctx.shadowBlur = 12 + Math.sin(frameCount * 0.06) * 5;
        ctx.beginPath();
        ctx.arc(x + 16, y - 40, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(50, 255, 50, 0.08)';
        ctx.fill();
        ctx.restore();
    } else {
        // White cross for revival
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 11 + wave1 * 0.4, y - 44, 8, 2);
        ctx.fillRect(x + 14 + wave1 * 0.4, y - 47, 2, 8);
    }
}

// ═══════════════════════════════════════════════════════════════
// RENDERING — TUTORIAL HINTS
// ═══════════════════════════════════════════════════════════════

function drawHints() {
    if (!levelData || !levelData.hints) return;

    for (const hint of levelData.hints) {
        const hintPixelX = hint.col * TILE_SIZE + TILE_SIZE / 2;
        const hintPixelY = 11 * TILE_SIZE;

        // Proximity check
        let nearestDist = Infinity;
        for (const p of players) {
            if (!p.alive) continue;
            const dist = Math.abs(p.centerX - hintPixelX);
            nearestDist = Math.min(nearestDist, dist);
        }

        const maxDist = 180;
        if (nearestDist > maxDist) continue;

        const alpha = Math.pow(1 - nearestDist / maxDist, 1.5);
        const sx = hintPixelX - camera.x;
        const sy = hintPixelY - camera.y;
        const bob = Math.sin(frameCount * 0.04 + hint.col) * 4;

        ctx.save();
        ctx.globalAlpha = alpha * 0.9;

        // Measure text
        ctx.font = '12px Orbitron, sans-serif';
        const tw = ctx.measureText(hint.text).width + 20;

        // Background pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        roundRect(ctx, sx - tw / 2, sy - 14 + bob, tw, 26, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.25)';
        ctx.lineWidth = 1;
        roundRect(ctx, sx - tw / 2, sy - 14 + bob, tw, 26, 8);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hint.text, sx, sy + bob);

        ctx.restore();
    }
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

// ═══════════════════════════════════════════════════════════════
// RENDERING — HUD
// ═══════════════════════════════════════════════════════════════

function drawHUD() {
    ctx.save();

    // Level name
    ctx.font = '13px Orbitron, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Level ${levelData.id}: ${levelData.name}`, 12, 10);

    // Player indicators
    const indicatorStartX = CANVAS_W - 30 - (playerCount - 1) * 55;
    for (let i = 0; i < playerCount; i++) {
        const p = players[i];
        const ix = indicatorStartX + i * 55;
        const iy = 16;

        // Mini slime blob
        ctx.beginPath();
        ctx.ellipse(ix, iy, 10, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = p.alive ? p.colorBase : 'rgba(80, 80, 80, 0.4)';
        ctx.fill();

        if (!p.alive) {
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ix - 5, iy - 5);
            ctx.lineTo(ix + 5, iy + 5);
            ctx.moveTo(ix + 5, iy - 5);
            ctx.lineTo(ix - 5, iy + 5);
            ctx.stroke();
        }

        // Label
        ctx.font = '9px Orbitron, sans-serif';
        ctx.fillStyle = p.alive ? '#ccc' : '#555';
        ctx.textAlign = 'center';
        ctx.fillText(`P${i + 1}`, ix, iy + 14);
    }

    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// TOXIC BUBBLE SPAWNER
// ═══════════════════════════════════════════════════════════════

function spawnToxicBubbles() {
    if (frameCount % 25 !== 0) return;
    const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
    const endCol = Math.min(tileMap[0].length, Math.ceil((camera.x + CANVAS_W) / TILE_SIZE));

    for (let c = startCol; c < endCol; c++) {
        for (let r = 0; r < tileMap.length; r++) {
            if (tileMap[r][c] === TILE.TOXIC && Math.random() < 0.12) {
                addParticle(
                    c * TILE_SIZE + Math.random() * TILE_SIZE,
                    r * TILE_SIZE,
                    0, -0.3 - Math.random() * 0.4,
                    1 + Math.random() * 2,
                    'rgba(80, 255, 120, 0.4)',
                    0.8, 0.012, 0
                );
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════════

function updateCamera() {
    const alivePlayers = players.filter(p => p.alive);
    if (alivePlayers.length === 0) return;

    let targetX, targetY;
    if (alivePlayers.length === 1) {
        targetX = alivePlayers[0].centerX - CANVAS_W / 2;
        targetY = alivePlayers[0].centerY - CANVAS_H / 2;
    } else {
        const midX = (alivePlayers[0].centerX + alivePlayers[1].centerX) / 2;
        const midY = (alivePlayers[0].centerY + alivePlayers[1].centerY) / 2;
        targetX = midX - CANVAS_W / 2;
        targetY = midY - CANVAS_H / 2;
    }

    // Clamp to level bounds
    const maxX = levelData.width * TILE_SIZE - CANVAS_W;
    const maxY = levelData.height * TILE_SIZE - CANVAS_H;
    targetX = Math.max(0, Math.min(targetX, maxX));
    targetY = Math.max(0, Math.min(targetY, maxY));

    camera.x += (targetX - camera.x) * 0.08;
    camera.y += (targetY - camera.y) * 0.08;
}

// ═══════════════════════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════════════════════

function checkWinCondition() {
    if (!levelData) return;
    const flagX = levelData.endFlag.col * TILE_SIZE;
    const flagY = levelData.endFlag.row * TILE_SIZE;

    for (const p of players) {
        if (!p.alive) continue;
        const dx = Math.abs(p.centerX - flagX - 16);
        const dy = Math.abs(p.bottom - flagY);
        if (dx < 28 && dy < 36) {
            levelComplete();
            return;
        }
    }
}

function checkRevivalFlags() {
    if (playerCount < 2 || !levelData) return;

    const deadPlayer = players.find(p => !p.alive);
    const alivePlayer = players.find(p => p.alive);
    if (!deadPlayer || !alivePlayer) return;

    for (const rf of levelData.revivalFlags) {
        const rfx = rf.col * TILE_SIZE;
        const rfy = rf.row * TILE_SIZE;
        const dx = Math.abs(alivePlayer.centerX - rfx - 16);
        const dy = Math.abs(alivePlayer.bottom - rfy);

        if (dx < 28 && dy < 36) {
            deadPlayer.respawn(rfx, rfy - deadPlayer.height);
            break;
        }
    }
}

function checkGameOver() {
    const anyAlive = players.some(p => p.alive);
    if (!anyAlive) {
        gameOverTimer++;
        if (gameOverTimer > 50) {
            setState('GAME_OVER');
        }
    }
}

function levelComplete() {
    const nextLevel = currentLevelIndex + 2;
    if (nextLevel > unlockedLevel) {
        unlockedLevel = nextLevel;
        localStorage.setItem('slimetales_unlocked', String(unlockedLevel));
    }
    setState('LEVEL_COMPLETE');
}

// ═══════════════════════════════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════════════════════════════

function update() {
    frameCount++;

    // Screen shake
    if (screenShake > 0) {
        screenShake--;
        shakeX = (Math.random() - 0.5) * screenShake * 0.8;
        shakeY = (Math.random() - 0.5) * screenShake * 0.8;
    } else {
        shakeX = 0;
        shakeY = 0;
    }

    // Update players
    for (const p of players) p.update();

    // Particles
    updateParticles();
    spawnToxicBubbles();

    // Camera
    updateCamera();

    // Game checks
    checkWinCondition();
    checkRevivalFlags();
    checkGameOver();
}

function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    ctx.translate(Math.round(shakeX), Math.round(shakeY));

    drawBackground();
    drawTiles();
    drawFlags();
    drawParticles();
    for (const p of players) p.draw();
    drawHints();
    drawHUD();

    ctx.restore();
}

function gameLoop() {
    if (state === 'PLAYING') {
        update();
        render();
    } else {
        // Animate background behind overlays
        frameCount++;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        drawBackground();

        // Animate a demo slime on the menu
        if (state === 'MENU') {
            drawMenuSlime();
        }
    }
    requestAnimationFrame(gameLoop);
}

// ── Demo slime for menu screen ──────────────────────────────

function drawMenuSlime() {
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2 + 30;
    const rx = 55;
    const ry = 45;
    const N = 10;
    const pts = [];

    for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
        let rad = 1;
        if (Math.sin(angle) > 0.2) rad -= (Math.sin(angle) - 0.2) * 0.1;
        rad += Math.sin(frameCount * 0.06 + i * 1.2) * 0.05;
        pts.push({
            x: cx + Math.cos(angle) * rx * rad,
            y: cy + Math.sin(angle) * ry * rad
        });
    }

    ctx.save();
    ctx.globalAlpha = 0.12;

    ctx.beginPath();
    const last = pts[N - 1];
    ctx.moveTo((last.x + pts[0].x) / 2, (last.y + pts[0].y) / 2);
    for (let i = 0; i < N; i++) {
        const next = pts[(i + 1) % N];
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + next.x) / 2, (pts[i].y + next.y) / 2);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx - 10, cy - 15, 3, cx, cy, 60);
    grad.addColorStop(0, '#ff88ff');
    grad.addColorStop(0.6, '#ff00ff');
    grad.addColorStop(1, '#880088');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'rgba(255,0,255,0.4)';
    ctx.shadowBlur = 25;
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function setState(newState) {
    state = newState;

    // Hide all overlays
    menuOverlay.classList.add('hidden');
    levelSelectOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    levelCompleteOverlay.classList.add('hidden');
    if (pauseHint) pauseHint.classList.add('hidden');

    switch (newState) {
        case 'MENU':
            menuOverlay.classList.remove('hidden');
            break;

        case 'LEVEL_SELECT':
            buildLevelSelect();
            levelSelectOverlay.classList.remove('hidden');
            break;

        case 'PLAYING':
            if (pauseHint) pauseHint.classList.remove('hidden');
            canvas.focus();
            break;

        case 'GAME_OVER':
            gameOverOverlay.classList.remove('hidden');
            break;

        case 'LEVEL_COMPLETE':
            levelCompleteOverlay.classList.remove('hidden');
            break;
    }
}

function buildLevelSelect() {
    levelGrid.innerHTML = '';

    for (let i = 0; i < 30; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';

        if (i < unlockedLevel) {
            btn.classList.add('unlocked');
            btn.textContent = i + 1;
            const idx = i;
            btn.onclick = () => window.selectLevel(idx);

            if (i === unlockedLevel - 1) {
                btn.classList.add('latest');
            }
        } else {
            btn.classList.add('locked');
            btn.innerHTML = `<span class="level-num">${i + 1}</span><span class="lock-icon">🔒</span>`;
        }

        levelGrid.appendChild(btn);
    }
}

function startLevel(index) {
    currentLevelIndex = index;
    levelData = levels[index];
    tileMap = levelData.map;

    if (!tileMap) {
        alert('This level is not available yet!');
        setState('LEVEL_SELECT');
        return;
    }

    particles = [];
    screenShake = 0;
    gameOverTimer = 0;
    levelCompleteTimer = 0;

    // Create players
    players = [];
    const p1x = levelData.spawnP1.col * TILE_SIZE;
    const p1y = levelData.spawnP1.row * TILE_SIZE - SLIME_H;
    players.push(new Slime(p1x, p1y, 1));

    if (playerCount >= 2) {
        const p2x = levelData.spawnP2.col * TILE_SIZE;
        const p2y = levelData.spawnP2.row * TILE_SIZE - SLIME_H;
        players.push(new Slime(p2x, p2y, 2));
    }

    // Initial camera position
    camera.x = Math.max(0, players[0].centerX - CANVAS_W / 2);
    camera.y = Math.max(0, players[0].centerY - CANVAS_H / 2);

    setState('PLAYING');
}

// ═══════════════════════════════════════════════════════════════
// WINDOW FUNCTIONS (called from HTML)
// ═══════════════════════════════════════════════════════════════

window.selectPlayers = (count) => {
    playerCount = count;
    setState('LEVEL_SELECT');
};

window.selectLevel = (index) => {
    startLevel(index);
};

window.restartLevel = () => {
    startLevel(currentLevelIndex);
};

window.nextLevel = () => {
    const next = currentLevelIndex + 1;
    if (next < 30 && levels[next].map) {
        startLevel(next);
    } else {
        setState('LEVEL_SELECT');
    }
};

window.goToMenu = () => {
    setState('MENU');
};

window.goToLevelSelect = () => {
    setState('LEVEL_SELECT');
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

function init() {
    setState('MENU');
    requestAnimationFrame(gameLoop);
}

init();
