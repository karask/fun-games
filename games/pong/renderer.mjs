import { COURT, STEP } from './engine.mjs?v=court-2';

const COLORS = ['#ff80b0', '#6be7dc'];

export class CourtRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.motion = matchMedia('(prefers-reduced-motion: reduce)');
        this.reset();
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(canvas);
        this.resize();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const scale = Math.min(devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(rect.width * scale);
        this.canvas.height = Math.round(rect.height * scale);
        this.ctx.setTransform(this.canvas.width / COURT.width, 0, 0, this.canvas.height / COURT.height, 0, 0);
    }

    reset() { this.trail = []; this.sparks = []; this.pulse = [0, 0]; }

    step(match) {
        this.pulse = this.pulse.map(value => Math.max(0, value - STEP * 4));
        if (match.phase === 'playing' && !this.motion.matches) {
            this.trail.push({ x: match.ball.x, y: match.ball.y });
            if (this.trail.length > 18) this.trail.shift();
        } else this.trail = [];
        for (const event of match.events) {
            if (event.type === 'point') { this.reset(); continue; }
            if (event.type === 'hit') this.pulse[event.side] = 1;
            if (this.motion.matches || !['hit', 'wall'].includes(event.type)) continue;
            for (let i = 0; i < (event.type === 'hit' ? 10 : 4); i++) {
                const angle = Math.random() * Math.PI * 2, speed = 35 + Math.random() * 130;
                this.sparks.push({ x: event.x, y: event.y, vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed, life: .35, color: COLORS[event.side] || '#9bb6cd' });
            }
        }
        this.sparks = this.sparks.filter(spark => spark.life > 0).slice(-60);
        for (const spark of this.sparks) { spark.x += spark.vx * STEP; spark.y += spark.vy * STEP; spark.life -= STEP; }
    }

    draw(match) {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a101a';
        ctx.fillRect(0, 0, COURT.width, COURT.height);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#152231';
        ctx.beginPath();
        for (let x = 40; x < COURT.width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, COURT.height); }
        for (let y = 30; y < COURT.height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(COURT.width, y); }
        ctx.stroke();
        ctx.strokeStyle = '#2b4054';
        ctx.setLineDash([5, 12]);
        ctx.beginPath(); ctx.moveTo(400, 0); ctx.lineTo(400, 500); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#203245';
        ctx.beginPath(); ctx.arc(400, 250, 62, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(400, 250, 4, 0, Math.PI * 2); ctx.stroke();
        // Subtle goal lanes and corner brackets keep the ball's bounds legible.
        for (let side = 0; side < 2; side++) {
            const x = side === 0 ? 0 : 778;
            ctx.fillStyle = COLORS[side] + '09'; ctx.fillRect(x, 0, 22, 500);
            ctx.strokeStyle = COLORS[side] + '80'; ctx.lineWidth = 2;
            for (const y of [1, 499]) {
                ctx.beginPath(); ctx.moveTo(side ? 770 : 30, y); ctx.lineTo(side ? 799 : 1, y);
                ctx.lineTo(side ? 799 : 1, y === 1 ? 24 : 476); ctx.stroke();
            }
        }
        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i], fraction = (i + 1) / this.trail.length;
            ctx.globalAlpha = fraction * .24;
            ctx.fillStyle = match.ball.vx > 0 ? COLORS[0] : COLORS[1];
            ctx.beginPath(); ctx.arc(point.x, point.y, COURT.radius * fraction, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (let side = 0; side < 2; side++) {
            const paddle = match.paddles[side];
            ctx.fillStyle = COLORS[side] + '12';
            ctx.fillRect(paddle.x - 6, paddle.y - 6, COURT.paddleWidth + 12, COURT.paddleHeight + 12);
            ctx.shadowColor = COLORS[side];
            ctx.shadowBlur = this.motion.matches ? 0 : 10 + this.pulse[side] * 16;
            ctx.fillStyle = COLORS[side];
            ctx.beginPath(); ctx.roundRect(paddle.x, paddle.y, COURT.paddleWidth, COURT.paddleHeight, 3); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffffb0';
            ctx.fillRect(paddle.x + (side === 0 ? 8 : 2), paddle.y + 4, 2, COURT.paddleHeight - 8);
            ctx.fillStyle = '#09202066';
            ctx.fillRect(paddle.x + 3, paddle.y + COURT.paddleHeight / 2 - 1, 6, 2);
        }
        for (const spark of this.sparks) {
            ctx.globalAlpha = Math.max(0, spark.life / .35);
            ctx.fillStyle = spark.color; ctx.fillRect(spark.x - 1.5, spark.y - 1.5, 3, 3);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f5fdff'; ctx.shadowColor = '#b7fff6';
        ctx.shadowBlur = this.motion.matches ? 0 : 14;
        ctx.beginPath(); ctx.arc(match.ball.x, match.ball.y, COURT.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }
}
