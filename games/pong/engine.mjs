export const STEP = 1 / 120;
export const COURT = Object.freeze({
    width: 800, height: 500, paddleWidth: 12, paddleHeight: 88,
    paddleSpeed: 510, radius: 7, ballSpeed: 360, maxBallSpeed: 850, winningScore: 5,
});
const CPU = {
    easy: { speed: 270, reaction: 0.24, error: 64 },
    normal: { speed: 365, reaction: 0.15, error: 34 },
    hard: { speed: 455, reaction: 0.095, error: 14 },
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class FrameClock {
    constructor() { this.reset(); }
    reset() { this.last = null; this.remainder = 0; }
    advance(timestamp, step) {
        if (this.last === null) { this.last = timestamp; return; }
        const elapsed = (timestamp - this.last) / 1000;
        this.last = timestamp;
        if (elapsed < 0 || elapsed > 0.25) { this.remainder = 0; return; }
        this.remainder += Math.min(elapsed, 0.1);
        while (this.remainder + 1e-9 >= STEP) {
            step();
            this.remainder = Math.max(0, this.remainder - STEP);
        }
    }
}

export class PongMatch {
    constructor(random = Math.random) {
        this.random = random;
        this.start();
        this.phase = 'menu';
    }

    start({ mode = 'solo', difficulty = 'normal' } = {}) {
        this.mode = mode;
        this.difficulty = difficulty;
        this.scores = [0, 0];
        this.rally = 0;
        this.bestRally = 0;
        this.winner = null;
        this.lastScorer = null;
        this.events = [];
        this.paddles = [26, COURT.width - 38].map(x => ({
            x, y: (COURT.height - COURT.paddleHeight) / 2, vy: 0,
        }));
        this.cpuTimer = 0;
        this.cpuTarget = COURT.height / 2;
        this.serve(this.random() < 0.5 ? -1 : 1);
    }

    serve(direction) {
        const angle = (this.random() * 0.6 + 0.2) * (this.random() < 0.5 ? -1 : 1);
        this.ball = {
            x: COURT.width / 2, y: COURT.height / 2, speed: COURT.ballSpeed,
            vx: direction * Math.cos(angle) * COURT.ballSpeed,
            vy: Math.sin(angle) * COURT.ballSpeed,
        };
        this.serveTime = 1.4;
        this.phase = 'serving';
    }

    pause() {
        if (this.phase !== 'playing' && this.phase !== 'serving') return;
        this.beforePause = this.phase;
        this.phase = 'paused';
    }

    resume() {
        if (this.phase === 'paused') this.phase = this.beforePause;
    }

    step(input = []) {
        this.events = [];
        if (this.phase !== 'playing' && this.phase !== 'serving') return;
        for (let side = 0; side < 2; side++) {
            const cpu = side === 1 && this.mode === 'solo';
            const control = cpu ? { target: this.aimCPU() } : (input[side] || {});
            const speed = cpu ? CPU[this.difficulty].speed : COURT.paddleSpeed;
            const paddle = this.paddles[side], previous = paddle.y;
            const distance = Number.isFinite(control.target)
                ? control.target - (paddle.y + COURT.paddleHeight / 2)
                : clamp(control.axis || 0, -1, 1) * speed * STEP;
            paddle.y = clamp(paddle.y + clamp(distance, -speed * STEP, speed * STEP),
                0, COURT.height - COURT.paddleHeight);
            paddle.vy = (paddle.y - previous) / STEP;
        }
        if (this.phase === 'serving') {
            this.serveTime = Math.max(0, this.serveTime - STEP);
            if (this.serveTime <= 1e-9) {
                this.phase = 'playing';
                this.events.push({ type: 'serve' });
            }
            return;
        }
        this.moveBall();
        if (this.ball.x < -COURT.radius) this.score(1);
        else if (this.ball.x > COURT.width + COURT.radius) this.score(0);
    }

    aimCPU() {
        this.cpuTimer -= STEP;
        if (this.cpuTimer > 0) return this.cpuTarget;
        const tuning = CPU[this.difficulty], ball = this.ball;
        this.cpuTimer = tuning.reaction;
        this.cpuTarget = COURT.height / 2;
        if (this.phase === 'playing' && ball.vx > 0) {
            const flight = Math.max(0, (this.paddles[1].x - COURT.radius - ball.x) / ball.vx);
            // Fold the projected path at both walls, including multiple bounces.
            const span = COURT.height - 2 * COURT.radius;
            const projected = ball.y - COURT.radius + ball.vy * flight;
            const wrapped = ((projected % (2 * span)) + 2 * span) % (2 * span);
            this.cpuTarget = COURT.radius + (wrapped > span ? 2 * span - wrapped : wrapped)
                + (this.random() * 2 - 1) * tuning.error;
        }
        return this.cpuTarget;
    }

    moveBall() {
        const ball = this.ball;
        let remaining = STEP;
        // Resolve the earliest contact so fast shots cannot skip a paddle or
        // bounce through it when a wall contact happens in the same step.
        for (let contacts = 0; contacts < 4 && remaining > 1e-9; contacts++) {
            let time = remaining, hit = null;
            const wallTime = ball.vy < 0
                ? (COURT.radius - ball.y) / ball.vy
                : (COURT.height - COURT.radius - ball.y) / ball.vy;
            if (wallTime >= 0 && wallTime <= time) { time = wallTime; hit = 'wall'; }
            const side = ball.vx < 0 ? 0 : 1, paddle = this.paddles[side];
            const face = side === 0 ? paddle.x + COURT.paddleWidth + COURT.radius : paddle.x - COURT.radius;
            const paddleTime = (face - ball.x) / ball.vx;
            const contactY = ball.y + ball.vy * paddleTime;
            if (paddleTime >= 0 && paddleTime <= time &&
                contactY >= paddle.y - COURT.radius &&
                contactY <= paddle.y + COURT.paddleHeight + COURT.radius) {
                time = paddleTime;
                hit = side;
            }
            ball.x += ball.vx * time;
            ball.y += ball.vy * time;
            remaining -= time;
            if (hit === null) break;
            if (hit === 'wall') {
                ball.vy *= -1;
                this.events.push({ type: 'wall', x: ball.x, y: ball.y });
            } else {
                this.returnShot(hit);
            }
        }
    }

    returnShot(side) {
        const ball = this.ball, paddle = this.paddles[side];
        const offset = clamp((ball.y - paddle.y - COURT.paddleHeight / 2) / (COURT.paddleHeight / 2), -1, 1);
        ball.speed = Math.min(ball.speed + 28, COURT.maxBallSpeed);
        const aimedY = Math.sin(offset * 1.02) * ball.speed + paddle.vy * 0.24;
        // Keep enough horizontal velocity to cross the court even on edge hits.
        ball.vy = clamp(aimedY, -ball.speed * 0.88, ball.speed * 0.88);
        ball.vx = (side === 0 ? 1 : -1) * Math.sqrt(ball.speed ** 2 - ball.vy ** 2);
        this.rally++;
        this.bestRally = Math.max(this.bestRally, this.rally);
        this.events.push({ type: 'hit', side, x: ball.x, y: ball.y });
    }

    score(side) {
        this.scores[side]++;
        this.lastScorer = side;
        this.rally = 0;
        this.events.push({ type: 'point', side });
        if (this.scores[side] === COURT.winningScore) {
            this.winner = side;
            this.phase = 'over';
        } else {
            // The player who conceded receives the next serve.
            this.serve(side === 0 ? 1 : -1);
        }
    }
}
