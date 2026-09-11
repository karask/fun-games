// Run gameplay at 120 Hz regardless of display refresh rate. Discard long stalls.
export function createClock() {
    const step = 1 / 120;
    let accumulator = 0;
    return {
        reset() { accumulator = 0; },
        advance(elapsed, update) {
            accumulator += Math.max(0, Math.min(.1, elapsed));
            while (accumulator + 1e-10 >= step) {
                update(step);
                accumulator -= step;
            }
        }
    };
}

export function movePlayer(player, dx, dy, dt, width, height) {
    const length = Math.hypot(dx, dy);
    if (length) { dx /= length; dy /= length; player.aimX = dx; player.aimY = dy; }
    if (player.dashTime > 0) {
        player.vx = player.dashX * 700;
        player.vy = player.dashY * 700;
    } else {
        const response = 1 - Math.exp(-(length ? 22 : 30) * dt);
        player.vx += (dx * player.speed - player.vx) * response;
        player.vy += (dy * player.speed - player.vy) * response;
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    const x = Math.max(player.size, Math.min(width - player.size, player.x));
    const y = Math.max(player.size, Math.min(height - player.size, player.y));
    if (x !== player.x) player.vx = 0;
    if (y !== player.y) player.vy = 0;
    player.x = x; player.y = y;
}

export function segmentHitsCircle(x1, y1, x2, y2, cx, cy, radius) {
    const dx = x2 - x1, dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((cx-x1)*dx + (cy-y1)*dy) / lengthSquared)) : 0;
    return (x1 + t*dx - cx) ** 2 + (y1 + t*dy - cy) ** 2 <= radius ** 2;
}
