const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// A damped ring around a responsive controller. Points are relative to the
// controller's bottom-center, and neighboring springs transmit local impacts.
export class SlimeBody {
    constructor(width, height) {
        this.stretch = 1;
        this.stretchVelocity = 0;
        this.lastVX = 0;
        this.faceX = 0;
        this.points = Array.from({ length: 20 }, (_, i) => {
            const angle = i / 20 * Math.PI * 2 - Math.PI / 2;
            return { x: Math.cos(angle) * width / 2, y: (Math.sin(angle) - 1) * height / 2, vx: 0, vy: 0 };
        });
    }

    impact(speed) { this.stretchVelocity -= Math.min(0.32, Math.abs(speed) * 0.025); }
    jump() { this.stretchVelocity += 0.14; }

    step({ width, height, vx, vy, grounded, wall = 0, time = 0, reducedMotion = false }, project = p => p) {
        const stretchTarget = grounded ? 1 : 1 + Math.min(0.16, Math.abs(vy) * 0.014);
        this.stretchVelocity = (this.stretchVelocity + (stretchTarget - this.stretch) * 0.16) * 0.7;
        this.stretch = clamp(this.stretch + this.stretchVelocity, 0.65, 1.3);
        const stretch = reducedMotion ? 1 : this.stretch;
        const acceleration = clamp(vx - this.lastVX, -4, 4);
        this.lastVX = vx;
        const targets = this.points.map((p, i) => {
            const angle = i / this.points.length * Math.PI * 2 - Math.PI / 2;
            const cosine = Math.cos(angle), sine = Math.sin(angle);
            const ripple = reducedMotion ? 0 : Math.sin(time * 0.12 + i * 0.9) * Math.min(0.65, Math.abs(vx) * 0.12);
            const x = Math.sign(cosine) * Math.abs(cosine) ** 0.85 * width / (2 * stretch);
            let y = (sine * 0.55 - 0.5) * height * stretch;
            if (grounded) y = Math.min(0, y + Math.max(0, sine - 0.5) * height * 0.12);
            return { x: x + ripple - vx * 0.3 * (1 - sine), y };
        });
        const offsets = this.points.map((p, i) => ({ x: p.x - targets[i].x, y: p.y - targets[i].y }));
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i], target = targets[i];
            const a = offsets[(i + this.points.length - 1) % this.points.length];
            const b = offsets[(i + 1) % this.points.length];
            p.vx = (p.vx + (target.x - p.x) * 0.24 + ((a.x + b.x) / 2 - offsets[i].x) * 0.1 - acceleration * 0.28) * 0.68;
            p.vy = (p.vy + (target.y - p.y) * 0.24 + ((a.y + b.y) / 2 - offsets[i].y) * 0.1) * 0.68;
            p.x += p.vx;
            p.y += p.vy;
            const freeX = p.x, freeY = p.y;
            const contact = project({ x: p.x, y: p.y });
            p.x = contact.x;
            p.y = grounded ? Math.min(0, contact.y) : contact.y;
            if (p.x !== freeX) p.vx = 0;
            if (p.y !== freeY) p.vy = 0;
        }
        this.faceX += ((wall ? wall * 2 : -vx * 0.55) - this.faceX) * 0.15;
    }

    trace(ctx) {
        const points = this.points, last = points[points.length - 1];
        ctx.beginPath();
        ctx.moveTo((last.x + points[0].x) / 2, (last.y + points[0].y) / 2);
        points.forEach((p, i) => {
            const next = points[(i + 1) % points.length];
            ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
        });
        ctx.closePath();
    }
}
