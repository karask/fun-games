// The simulation uses active play time only; rendering, pauses and countdowns live in game.js.
export const DIRECTIONS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
export const FOOD_TYPES = {
    normal: { grow: 1, points: 10, color: '#ff6b78' },
    golden: { grow: 3, points: 50, color: '#fbc95e' },
    shrink: { grow: -2, points: -20, color: '#c1a2ff' },
};
const sameCell = (a, b) => a.x === b.x && a.y === b.y;

export function createGame({ mode = 1, difficulty = 'classic', random = Math.random, width = 40, height = 30 } = {}) {
    const players = Array.from({ length: mode }, (_, index) => {
        const x = index === 0 ? Math.floor(width / 4) : width - 1 - Math.floor(width / 4);
        return {
            id: index + 1,
            segments: Array.from({ length: 3 }, (_, i) => ({ x: x + (index === 0 ? -i : i), y: Math.floor(height / 2) })),
            direction: index === 0 ? 'right' : 'left', turns: [],
            growPending: 0, score: 0, dead: false, cause: '',
        };
    });
    const game = { players, foods: [], elapsed: 0, apples: 0, over: false, cleared: false, random, width, height, mode, difficulty, nextBonusAt: 6000 };
    replenishApples(game);
    return game;
}

export function queueTurn(player, direction) {
    if (!Object.hasOwn(DIRECTIONS, direction) || player.dead || player.turns.length >= 2) return false;
    const previous = DIRECTIONS[player.turns.at(-1) || player.direction];
    const next = DIRECTIONS[direction];
    // Only perpendicular turns are useful; repeated keys cannot fill the buffer.
    if (previous.x * next.x + previous.y * next.y !== 0) return false;
    player.turns.push(direction);
    return true;
}

export function getStepMs(game) {
    if (game.difficulty === 'relaxed') return 150;
    if (game.difficulty === 'fast') return 70;
    return Math.max(60, 110 - Math.floor(game.apples / 5) * 6);
}

function spawnFood(game, type) {
    const occupied = new Set([...game.players.flatMap(p => p.segments), ...game.foods].map(p => `${p.x},${p.y}`));
    const empty = [];
    for (let y = 0; y < game.height; y++) {
        for (let x = 0; x < game.width; x++) {
            if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
        }
    }
    if (empty.length === 0) return false;
    const position = empty[Math.floor(game.random() * empty.length)];
    game.foods.push({ ...position, type, expiresAt: type === 'normal' ? null : game.elapsed + 8000 });
    return true;
}

function replenishApples(game) {
    let count = game.foods.filter(f => f.type === 'normal').length;
    while (count < game.mode) {
        if (!spawnFood(game, 'normal')) {
            // A bonus must never occupy the only available apple cell.
            const bonus = game.foods.findIndex(f => f.type !== 'normal');
            if (bonus >= 0) { game.foods.splice(bonus, 1); continue; }
            const occupied = new Set(game.players.flatMap(p => p.segments).map(p => `${p.x},${p.y}`));
            game.cleared = occupied.size === game.width * game.height;
            game.over = game.cleared;
            break;
        }
        count++;
    }
}

export function stepGame(game) {
    if (game.over) return [];
    game.elapsed += getStepMs(game);
    game.foods = game.foods.filter(f => f.expiresAt === null || f.expiresAt > game.elapsed);
    const oldHeads = game.players.map(p => p.segments[0]);
    const meals = [];

    // Compute both new bodies (including growth) before judging either player's collision.
    for (const player of game.players) {
        player.direction = player.turns.shift() || player.direction;
        const direction = DIRECTIONS[player.direction];
        const head = { x: player.segments[0].x + direction.x, y: player.segments[0].y + direction.y };
        const food = game.foods.find(f => sameCell(head, f));
        meals.push(food);
        player.growPending += food ? FOOD_TYPES[food.type].grow : 0;
        player.segments.unshift(head);
        if (player.growPending > 0) {
            player.growPending--;
        } else {
            const remove = Math.min(1 - player.growPending, player.segments.length - 3);
            player.segments.splice(player.segments.length - remove, remove);
            player.growPending = 0;
        }
    }

    const [p1, p2] = game.players;
    const headCollision = p2 && (sameCell(p1.segments[0], p2.segments[0]) ||
        (sameCell(p1.segments[0], oldHeads[1]) && sameCell(p2.segments[0], oldHeads[0])));
    for (const player of game.players) {
        const head = player.segments[0];
        if (headCollision) player.cause = 'Head-on collision';
        else if (head.x < 0 || head.x >= game.width || head.y < 0 || head.y >= game.height) player.cause = 'Hit the wall';
        else if (player.segments.slice(1).some(s => sameCell(head, s))) player.cause = 'Ran into your own snake';
        else if (game.players.some(other => other !== player && other.segments.some(s => sameCell(head, s)))) player.cause = 'Hit the other snake';
        player.dead = Boolean(player.cause);
    }
    if (game.players.some(p => p.dead)) {
        game.over = true;
        return game.players.filter(p => p.dead).map(p => ({ type: 'death', player: p.id, ...p.segments[0], cause: p.cause }));
    }

    const events = [];
    game.players.forEach((player, index) => {
        const food = meals[index];
        if (!food) return;
        const points = FOOD_TYPES[food.type].points;
        player.score = Math.max(0, player.score + points);
        if (food.type === 'normal') game.apples++;
        game.foods.splice(game.foods.indexOf(food), 1);
        events.push({ type: 'food', player: player.id, food: food.type, points, x: food.x, y: food.y });
    });
    replenishApples(game);
    if (!game.over && game.elapsed >= game.nextBonusAt && !game.foods.some(f => f.type !== 'normal')) {
        spawnFood(game, game.random() < .5 ? 'golden' : 'shrink');
        game.nextBonusAt = game.elapsed + 14000;
    }
    return events;
}
