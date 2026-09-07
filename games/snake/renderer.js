import { DIRECTIONS, FOOD_TYPES } from './engine.js';

export function createRenderer(canvas) {
    const ctx = canvas.getContext('2d');
    const cell = 20;
    let effects = [];

    function feedback(events, reduced) {
        for (const event of events) {
            if (event.type === 'food') {
                const color = FOOD_TYPES[event.food].color;
                if (!reduced) {
                    for (let i = 0; i < 8; i++) {
                        const angle = i * Math.PI / 4;
                        effects.push({ x: event.x * cell + 10, y: event.y * cell + 10, vx: Math.cos(angle) * 50, vy: Math.sin(angle) * 50, life: .45, duration: .45, color });
                    }
                    effects.push({ x: event.x * cell + 10, y: event.y * cell, vx: 0, vy: -28, life: .85, duration: .85, color, text: `${event.points > 0 ? '+' : ''}${event.points}` });
                }
            }
        }
        effects = effects.slice(-100);
    }

    function draw(game, delta, reduced) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0c110e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#172119';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += cell) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for (let y = 0; y <= canvas.height; y += cell) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        for (const food of game.foods) {
            const x = food.x * cell + 10;
            const y = food.y * cell + 10;
            ctx.fillStyle = FOOD_TYPES[food.type].color;
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = reduced ? 0 : 10;
            ctx.beginPath();
            if (food.type === 'golden') {
                ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y); ctx.closePath();
            } else if (food.type === 'shrink') {
                ctx.rect(x - 7, y - 3, 14, 6);
            } else {
                ctx.arc(x, y, 6, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.shadowBlur = 0;
            if (food.expiresAt !== null) {
                const remaining = Math.max(0, (food.expiresAt - game.elapsed) / 8000);
                ctx.strokeStyle = '#354135'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = FOOD_TYPES[food.type].color;
                ctx.beginPath(); ctx.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining); ctx.stroke();
            }
        }

        for (const player of game.players) {
            const direction = DIRECTIONS[player.direction];
            player.segments.forEach((segment, index) => {
                const x = segment.x * cell + 10;
                const y = segment.y * cell + 10;
                ctx.fillStyle = player.id === 1 ? (index === 0 ? '#b9f36b' : '#72b44c') : (index === 0 ? '#a3ceff' : '#558fe5');
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = reduced ? 0 : (index === 0 ? 10 : 3);
                ctx.beginPath(); ctx.roundRect(x - 8, y - 8, 16, 16, 4); ctx.fill();
                ctx.shadowBlur = 0;
                if (index === 0) {
                    ctx.fillStyle = '#101611';
                    for (const side of [-1, 1]) {
                        ctx.beginPath();
                        ctx.arc(x + direction.x * 3 + direction.y * side * 4, y + direction.y * 3 + direction.x * side * 4, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });
            if (player.dead) {
                // Clamp wall impacts to the edge so the final collision is always visible.
                const x = Math.max(10, Math.min(canvas.width - 10, player.segments[0].x * cell + 10));
                const y = Math.max(10, Math.min(canvas.height - 10, player.segments[0].y * cell + 10));
                ctx.strokeStyle = '#ff6b78'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
            }
        }

        if (reduced) effects = [];
        effects = effects.filter(effect => effect.life > 0);
        for (const effect of effects) {
            effect.life -= delta / 1000;
            effect.x += effect.vx * delta / 1000;
            effect.y += effect.vy * delta / 1000;
            ctx.globalAlpha = Math.max(0, effect.life / effect.duration);
            ctx.fillStyle = effect.color;
            if (effect.text) {
                ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
                ctx.fillText(effect.text, Math.max(22, Math.min(canvas.width - 22, effect.x)), Math.max(20, effect.y));
            } else ctx.fillRect(effect.x - 2, effect.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
    }
    return { draw, feedback, clear: () => { effects = []; } };
}

export function createSound() {
    let context;
    function unlock() {
        try {
            context ||= new (window.AudioContext || window.webkitAudioContext)();
            if (context.state === 'suspended') context.resume().catch(() => {});
        } catch { /* Audio is optional; gameplay works without it. */ }
    }
    function play(kind) {
        if (!context || context.state !== 'running') return;
        const start = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const frequency = { normal: 600, golden: 950, shrink: 350, death: 130, count: 440, go: 880 }[kind];
        oscillator.type = kind === 'death' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(kind === 'death' ? 40 : frequency * 1.4, start + .12);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.07, start + .008);
        gain.gain.exponentialRampToValueAtTime(.001, start + .16);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(start); oscillator.stop(start + .18);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
    return { unlock, play };
}
