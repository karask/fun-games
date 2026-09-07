import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, queueTurn, stepGame, getStepMs, FOOD_TYPES } from './engine.js';

const cells = (...points) => points.map(([x, y]) => ({ x, y }));

function fixture(options = {}) {
    const game = createGame({ random: () => 0, ...options });
    Object.assign(game.players[0], {
        segments: cells([5, 5], [4, 5], [3, 5]),
        direction: 'right', turns: [], growPending: 0,
    });
    game.foods = [{ x: 30, y: 20, type: 'normal', expiresAt: null }];
    return game;
}

test('two quick turns are consumed on separate ticks', () => {
    const game = fixture();
    const player = game.players[0];
    assert.equal(queueTurn(player, 'up'), true);
    assert.equal(queueTurn(player, 'left'), true);
    stepGame(game);
    assert.deepEqual(player.segments[0], { x: 5, y: 4 });
    stepGame(game);
    assert.deepEqual(player.segments[0], { x: 4, y: 4 });
    assert.equal(player.dead, false);
});

test('turn buffering rejects reversals, duplicates, invalid input, and a third turn', () => {
    const player = fixture().players[0];
    assert.equal(queueTurn(player, 'left'), false);
    assert.equal(queueTurn(player, 'right'), false);
    assert.equal(queueTurn(player, 'diagonal'), false);
    assert.equal(queueTurn(player, 'up'), true);
    assert.equal(queueTurn(player, 'up'), false);
    assert.equal(queueTurn(player, 'down'), false);
    assert.equal(queueTurn(player, 'left'), true);
    assert.equal(queueTurn(player, 'down'), false);
    assert.deepEqual(player.turns, ['up', 'left']);
});

test('entering your own vacating tail cell is safe', () => {
    const game = fixture();
    const player = game.players[0];
    player.segments = cells([2, 2], [2, 3], [1, 3], [1, 2]);
    player.direction = 'left';
    stepGame(game);
    assert.equal(player.dead, false);
    assert.deepEqual(player.segments[0], { x: 1, y: 2 });
    assert.equal(player.segments.length, 4);
});

test('a growing tail remains occupied', () => {
    const game = fixture();
    const player = game.players[0];
    player.segments = cells([2, 2], [2, 3], [1, 3], [1, 2]);
    player.direction = 'left';
    player.growPending = 1;
    stepGame(game);
    assert.equal(player.dead, true);
    assert.equal(game.over, true);
});

for (const growing of [false, true]) {
    test(`an opponent's tail ${growing ? 'stays occupied when eating' : 'can be entered when vacating'}`, () => {
        const game = fixture({ mode: 2 });
        Object.assign(game.players[1], {
            segments: cells([6, 3], [6, 4], [6, 5]),
            direction: 'up', turns: [], growPending: 0,
        });
        if (growing) game.foods = [{ x: 6, y: 2, type: 'normal', expiresAt: null }];
        stepGame(game);
        assert.equal(game.players[0].dead, growing);
        assert.equal(game.players[1].dead, false);
    });
}

test('a body collision ends the run and reports the collision', () => {
    const game = fixture();
    game.players[0].segments = cells([3, 3], [3, 4], [4, 4], [4, 3], [5, 3], [5, 2]);
    const events = stepGame(game);
    assert.equal(game.players[0].dead, true);
    assert.ok(game.players[0].cause);
    assert.equal(game.over, true);
    assert.ok(events.some(event => event.type === 'death'));
});

test('hitting a wall ends the run', () => {
    const game = fixture();
    game.players[0].segments = cells([39, 5], [38, 5], [37, 5]);
    stepGame(game);
    assert.equal(game.players[0].dead, true);
    assert.ok(game.players[0].cause);
    assert.equal(game.over, true);
});

for (const secondHead of [6, 7]) {
    test(secondHead === 6 ? 'head swaps kill both players' : 'simultaneous head-on collisions kill both players', () => {
        const game = fixture({ mode: 2 });
        Object.assign(game.players[1], {
            segments: cells([secondHead, 5], [secondHead + 1, 5], [secondHead + 2, 5]),
            direction: 'left', turns: [], growPending: 0,
        });
        stepGame(game);
        assert.deepEqual(game.players.map(player => player.dead), [true, true]);
        assert.equal(game.over, true);
    });
}

test('eating a normal apple scores, grows, and keeps an apple available', () => {
    const game = fixture();
    game.foods = [{ x: 6, y: 5, type: 'normal', expiresAt: null }];
    const events = stepGame(game);
    assert.equal(game.players[0].score, FOOD_TYPES.normal.points);
    assert.equal(game.players[0].segments.length, 4);
    assert.equal(game.apples, 1);
    assert.ok(events.some(event => event.type === 'food'));
    assert.ok(game.foods.some(food => food.type === 'normal'));
    assert.ok(game.foods.every(food => !game.players[0].segments.some(segment => segment.x === food.x && segment.y === food.y)));
});

test('golden food adds three segments across movement ticks', () => {
    const game = fixture();
    game.foods.push({ x: 6, y: 5, type: 'golden', expiresAt: 8000 });
    stepGame(game);
    assert.equal(game.players[0].score, FOOD_TYPES.golden.points);
    stepGame(game);
    stepGame(game);
    assert.equal(game.players[0].segments.length, 6);
    assert.equal(game.players[0].growPending, 0);
    assert.ok(game.foods.some(food => food.type === 'normal'));
});

for (const length of [3, 4, 5, 6]) {
    test(`purple food respects the minimum length when starting at ${length}`, () => {
        const game = fixture();
        const player = game.players[0];
        player.segments = Array.from({ length }, (_, index) => ({ x: 10 - index, y: 5 }));
        player.score = 10;
        game.foods.push({ x: 11, y: 5, type: 'shrink', expiresAt: 8000 });
        stepGame(game);
        assert.equal(player.segments.length, Math.max(3, length + FOOD_TYPES.shrink.grow));
        assert.equal(player.score, 0);
        assert.equal(player.growPending, 0);
    });
}

test('bonus food appears alongside permanent apples and expires after eight active seconds', () => {
    const game = fixture();
    game.elapsed = game.nextBonusAt - getStepMs(game);
    stepGame(game);
    const bonus = game.foods.find(food => food.type !== 'normal');
    assert.ok(bonus);
    assert.equal(bonus.expiresAt, game.elapsed + 8000);
    assert.ok(game.foods.some(food => food.type === 'normal' && food.expiresAt === null));
});

test('food expires on simulation time without expiring the permanent apple', () => {
    const game = fixture({ difficulty: 'relaxed' });
    game.foods.push({ x: 20, y: 20, type: 'golden', expiresAt: 150 });
    stepGame(game);
    assert.equal(game.elapsed, 150);
    assert.equal(game.foods.some(food => food.type === 'golden'), false);
    assert.ok(game.foods.some(food => food.type === 'normal'));
});

test('filling the board completes the run without a food placement loop', { timeout: 1000 }, () => {
    const game = fixture();
    game.width = 4;
    game.height = 3;
    game.players[0].segments = cells([2, 0], [1, 0], [0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2], [2, 2], [1, 2], [0, 2]);
    game.foods = [{ x: 3, y: 0, type: 'normal', expiresAt: null }];
    stepGame(game);
    assert.equal(game.players[0].segments.length, 12);
    assert.equal(game.players[0].dead, false);
    assert.equal(game.cleared, true);
    assert.equal(game.over, true);
});

test('classic accelerates every five apples with a safe speed cap', () => {
    const game = fixture();
    assert.equal(getStepMs(game), 110);
    game.apples = 4;
    assert.equal(getStepMs(game), 110);
    game.apples = 5;
    assert.equal(getStepMs(game), 104);
    game.apples = 1000;
    assert.equal(getStepMs(game), 60);
});

test('relaxed and fast keep their selected pace', () => {
    for (const [difficulty, interval] of [['relaxed', 150], ['fast', 70]]) {
        const game = fixture({ difficulty });
        assert.equal(getStepMs(game), interval);
        game.apples = 1000;
        assert.equal(getStepMs(game), interval);
    }
});

test('an ended game remains frozen', () => {
    const game = fixture();
    game.over = true;
    const before = JSON.stringify(game);
    stepGame(game);
    assert.equal(JSON.stringify(game), before);
});
