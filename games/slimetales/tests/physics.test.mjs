import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { TILE } from '../levels.js';
export { TILE };

// Run the shipped controller and tile definitions. Only browser rendering and
// startup are replaced; fixtures supply small, deterministic test levels.
const gameURL = new URL('../game.js', import.meta.url);
const rawSource = readFileSync(gameURL, 'utf8');
const bindings = {};
for (const match of rawSource.matchAll(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+\.mjs)['"];?$/gm)) {
    const imported = await import(new URL(match[2], gameURL));
    for (const name of match[1].split(',').map(value => value.trim())) bindings[name] = imported[name];
}
const source = rawSource.replace(/^import .*;\s*$/gm, '').replace(/^init\(\);\s*$/m, '');

export function makeMap(width = 80, height = 20, floorRow = 14) {
    return Array.from({ length: height }, (_, row) =>
        Array(width).fill(row >= floorRow ? TILE.SOLID : TILE.AIR));
}

export function createHarness({ map = makeMap(), x = 96, y = 14 * 32 - 38, grounded = true } = {}) {
    const listeners = new Map();
    const noop = () => {};
    const drawContext = new Proxy({}, { get: () => noop, set: () => true });
    const element = () => ({
        width: 800, height: 560, style: {}, classList: { add: noop, remove: noop, toggle: noop },
        addEventListener: noop, setAttribute: noop, focus: noop, appendChild: noop,
        getContext: () => drawContext, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 560 }),
    });
    const document = {
        getElementById: element, createElement: element, querySelectorAll: () => [],
        addEventListener: noop, hidden: false,
    };
    const window = {
        addEventListener(type, callback) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(callback);
        },
        matchMedia: () => ({ matches: false, addEventListener: noop }),
    };
    const context = vm.createContext({
        ...bindings, document, window, TILE, levels: [], console,
        localStorage: { getItem: () => null, setItem: noop },
        requestAnimationFrame: noop, performance: { now: () => 0 },
        setTimeout: noop, clearTimeout: noop,
    });
    vm.runInContext(source, context, { filename: gameURL.pathname });
    const run = code => vm.runInContext(code, context);
    context.fixtureMap = map;
    context.fixtureX = x;
    context.fixtureY = y;
    context.fixtureGrounded = grounded;
    run(`
        tileMap = fixtureMap;
        levelData = { width: tileMap[0].length, height: tileMap.length, map: tileMap,
            endFlag: { col: tileMap[0].length - 2, row: 1 }, revivalFlags: [] };
        players = [new Slime(fixtureX, fixtureY, 1)];
        players[0].grounded = fixtureGrounded;
        state = 'PLAYING';
        render = () => {};
    `);
    return {
        run,
        get player() { return run('players[0]'); },
        key(code, down, repeat = false) {
            for (const callback of listeners.get(down ? 'keydown' : 'keyup') || []) {
                callback({ code, key: code, repeat, preventDefault: noop, target: document });
            }
        },
        step(count = 1) { for (let i = 0; i < count; i++) run('update()'); },
        frame(timestamp) { context.fixtureTimestamp = timestamp; run('gameLoop(fixtureTimestamp)'); },
    };
}

test('one second of movement covers the same distance at 30, 60 and 120 Hz', () => {
    const positions = [30, 60, 120].map(rate => {
        const game = createHarness();
        game.key('ArrowRight', true);
        game.frame(0);
        for (let frame = 1; frame <= rate; frame++) game.frame(frame * 1000 / rate);
        return game.player.x;
    });
    assert.ok(positions.every(x => x > 146), 'The controller must actually advance during the elapsed second');
    assert.ok(Math.max(...positions) - Math.min(...positions) < 0.01,
        `Equal elapsed time produced different positions: ${positions.join(', ')}`);
});

test('holding jump through landing launches once until the key is released', () => {
    const game = createHarness();
    game.key('ArrowUp', true);
    let launches = 0;
    for (let step = 0; step < 180; step++) {
        const wasGrounded = game.player.grounded;
        game.step();
        if (wasGrounded && !game.player.grounded && game.player.vy < 0) launches++;
    }
    assert.equal(launches, 1);
    assert.equal(game.player.grounded, true);
    game.key('ArrowUp', false);
    game.step();
    game.key('ArrowUp', true);
    game.step();
    assert.ok(game.player.vy < 0, 'A fresh press after release should jump again');
});

test('a fresh jump just after leaving a ledge still launches', () => {
    const map = makeMap();
    for (let row = 14; row < map.length; row++) {
        for (let col = 5; col < map[row].length; col++) map[row][col] = TILE.AIR;
    }
    const game = createHarness({ map, x: 115 });
    game.key('ArrowRight', true);
    let steps = 0;
    while (game.player.grounded && steps++ < 60) game.step();
    assert.equal(game.player.grounded, false, 'Fixture must walk off the ledge');
    game.step(2);
    game.key('ArrowUp', true);
    game.step();
    assert.ok(game.player.vy < 0, 'A jump within the coyote window should launch');
});

test('a brief jump press just before landing is remembered', () => {
    const game = createHarness({ y: 14 * 32 - 38 - 3, grounded: false });
    game.player.vy = 3;
    game.key('ArrowUp', true);
    game.step();
    game.key('ArrowUp', false);
    game.step(2);
    assert.ok(game.player.vy < 0, 'A buffered press should launch on landing even after release');
});

test('releasing crouch under a one-tile ceiling stays compressed until clear', () => {
    const map = makeMap();
    const game = createHarness({ map });
    game.key('ArrowDown', true);
    game.step(30);
    assert.ok(game.player.height <= 32, 'Crouch must fit a one-tile passage');
    const beforeBottom = game.player.bottom;
    // Close the roof after compressing, as though the player has entered a tunnel.
    for (let col = 0; col < 10; col++) map[12][col] = TILE.SOLID;
    game.key('ArrowDown', false);
    game.step(30);
    assert.ok(game.player.height <= 32, 'Releasing crouch must not force the body into the roof');
    assert.ok(game.player.y >= 13 * 32, 'The body must remain below the roof');
    assert.equal(game.player.bottom, beforeBottom, 'Resizing should preserve floor contact');
    game.player.x = 12 * 32;
    game.step(30);
    assert.equal(game.player.height, game.run('SLIME_H'), 'The body should recover after clearing the tunnel');
});

test('air steering keeps the current responsive release and reverse controls', () => {
    const sample = key => {
        const game = createHarness({ y: 100, grounded: false });
        game.player.vx = 5;
        if (key) game.key(key, true);
        game.step();
        return game.player.vx;
    };
    const coast = sample();
    const forward = sample('ArrowRight');
    const reverse = sample('ArrowLeft');
    assert.ok(coast > 0 && coast < 4.1, `Release should brake promptly; vx=${coast}`);
    assert.ok(forward > coast, 'Holding the direction should preserve more momentum');
    assert.ok(reverse >= 0 && reverse < coast, 'Counter-steering should brake harder than release');
});

test('one-way platforms allow upward passage and catch a falling slime', () => {
    const map = makeMap();
    for (let col = 2; col < 9; col++) map[10][col] = TILE.PLATFORM;
    const rising = createHarness({ map, y: 10 * 32 + 8, grounded: false });
    rising.player.vy = -8;
    rising.step();
    assert.ok(rising.player.y < 10 * 32 + 8 && rising.player.vy < 0,
        'A platform underside must not stop upward movement');

    const falling = createHarness({ map, y: 10 * 32 - 38 - 4, grounded: false });
    falling.player.vy = 5;
    falling.step();
    assert.equal(falling.player.bottom, 10 * 32);
    assert.equal(falling.player.grounded, true);
});

for (const [name, hazard] of [['upward spikes', TILE.SPIKE_UP], ['downward spikes', TILE.SPIKE_DOWN], ['toxic liquid', TILE.TOXIC]]) {
    test(`touching ${name} still pops the slime`, () => {
        const map = makeMap();
        map[13][3] = hazard;
        const game = createHarness({ map });
        game.step();
        assert.equal(game.player.alive, false);
    });
}

test('squeezing flattens and spreads the body gradually while keeping its feet planted', () => {
    const game = createHarness();
    const bottom = game.player.bottom;
    game.key('ArrowDown', true);
    game.step();
    assert.ok(game.player.height > 22 && game.player.height < 38, 'Compression must have a transition');
    game.step(30);
    assert.ok(game.player.width > 36, 'A squeezed slime should spread, not become a miniature');
    assert.equal(game.player.bottom, bottom);
});

function wallFixture() {
    const map = makeMap();
    for (let row = 2; row < 14; row++) map[row][8] = TILE.SOLID;
    return createHarness({ map, x: 8 * 32 - 36, y: 200, grounded: false });
}

test('pressing into a wall slows the fall and Down releases the grip', () => {
    const game = wallFixture();
    game.player.vy = 8;
    game.key('ArrowRight', true);
    game.step(4);
    assert.ok(game.player.vy <= 1.2, 'Wall contact should grip instead of free-falling');
    game.key('ArrowDown', true);
    game.step(8);
    assert.ok(game.player.vy > 2, 'Down must release the wall');
});

test('a fresh jump from a gripped wall launches away and holding does not repeat', () => {
    const game = wallFixture();
    game.key('ArrowRight', true);
    game.step(2);
    game.key('ArrowUp', true);
    game.step();
    assert.ok(game.player.vx < -3 && game.player.vy < -6, 'Wall jump needs outward and upward momentum');
    game.step(3);
    assert.ok(game.player.x < 8 * 32 - 38, 'Pressing toward the wall must not cancel the launch immediately');
});

test('the soft outline deforms on impact and settles with no points inside the floor', () => {
    const game = createHarness({ y: 350, grounded: false });
    game.player.vy = 12;
    game.step(8);
    assert.ok(game.player.body?.points.length >= 12, 'Use a persistent deformable outline');
    const initialWidth = Math.max(...game.player.body.points.map(p => p.x)) - Math.min(...game.player.body.points.map(p => p.x));
    game.step(180);
    const points = game.player.body.points;
    const restingWidth = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
    assert.ok(initialWidth > restingWidth + 1, 'Landing should spread before recovering');
    assert.ok(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && p.y <= 0.01), 'Outline is foot-relative and must stay above the floor');
});

test('squeezing also fits an existing one-tile vertical shaft', () => {
    const map = makeMap();
    for (let row = 14; row < 18; row++) map[row][4] = TILE.AIR;
    const game = createHarness({ map, x: 4 * 32 + 16 - 18 });
    game.key('ArrowDown', true);
    game.step(45);
    assert.ok(game.player.y >= 15 * 32, 'A slime centered on a narrow shaft must be able to squeeze down it');
    assert.ok(game.player.width <= 32);
});

test('reviving a compressed slime resets its body and jump state above the flag floor', () => {
    const game = createHarness();
    game.key('ArrowDown', true);game.step(30);
    game.player.pop();
    game.player.respawn(96, 14 * 32 - 38);
    assert.equal(game.player.bottom, 14 * 32);
    assert.equal(game.player.width, 36);
    assert.equal(game.player.height, 38);
    assert.equal(game.player.jumpBuffer, 0);
    assert.ok(game.player.body.points.every(p => Math.abs(p.x) <= 18.01 && p.y <= 0));
});

test('a jump tap between physics steps is retained until the next step', () => {
    const game = createHarness();
    game.frame(0);
    game.key('ArrowUp', true);
    game.key('ArrowUp', false);
    game.frame(1000 / 60);
    assert.ok(game.player.vy < 0,
        'An input event must survive until the next fixed update even if released before it');
});

test('recovering from compression beside a wall still returns to normal height', () => {
    const game = wallFixture();
    game.key('ArrowDown', true);
    game.step(30);
    game.key('ArrowDown', false);
    game.step(60);
    assert.equal(game.player.width, 36);
    assert.equal(game.player.height, 38);
});

test('browser key repeat cannot queue another jump after landing', () => {
    const game = createHarness();
    game.key('ArrowUp', true);
    game.step(90);
    assert.equal(game.player.grounded, true);
    game.key('ArrowUp', true, true);
    game.step();
    assert.equal(game.player.grounded, true);
});

test('a compressed body never enters the floor, ceiling or wall while recovering', () => {
    const map = makeMap();
    for (let row = 7; row < 14; row++) map[row][8] = TILE.SOLID;
    const game = createHarness({ map, x: 8 * 32 - 36 });
    game.key('ArrowDown', true);
    game.step(25);
    for (let col = 3; col < 8; col++) map[12][col] = TILE.SOLID;
    game.key('ArrowDown', false);
    for (let tick = 0; tick < 90; tick++) {
        game.step();
        assert.ok(game.player.y >= 13 * 32);
        assert.ok(game.player.x + game.player.width <= 8 * 32);
        for (const point of game.player.body.points) {
            const col = Math.floor((game.player.centerX + point.x) / 32);
            const row = Math.floor((game.player.bottom + point.y) / 32);
            assert.notEqual(map[row]?.[col], TILE.SOLID,
                `An outline point penetrated solid tile ${col},${row} on tick ${tick}`);
        }
    }
});

test('returning after a suspended tab does not fast-forward the slime', () => {
    const game = createHarness({ y: 100, grounded: false });
    game.key('ArrowRight', true);
    game.frame(0);
    game.frame(1000 / 60);
    const before = { x: game.player.x, y: game.player.y };
    game.frame(5000);
    assert.equal(game.player.x, before.x);
    assert.equal(game.player.y, before.y);
    game.frame(5000 + 1000 / 60);
    assert.ok(game.player.x > before.x && game.player.y > before.y,
        'The next ordinary frame must resume simulation');
});

test('a brief jump tap has a lower apex than holding jump, even between updates', () => {
    const apex = held => {
        const game = createHarness();
        game.key('ArrowUp', true);
        if (!held) game.key('ArrowUp', false);
        let top = game.player.y;
        for (let i = 0; i < 45; i++) { game.step(); top = Math.min(top, game.player.y); }
        return top;
    };
    assert.ok(apex(false) > apex(true) + 20, 'Holding should give substantially more height than a quick tap');
});

test('a revival flag restores a compressed teammate above the floor', () => {
    const game = createHarness();
    game.key('ArrowDown', true);game.step(25);
    game.player.pop();
    game.run(`
        playerCount = 2;
        levelData.revivalFlags = [{ col: 3, row: 14 }];
        players.push(new Slime(96, 14 * 32 - SLIME_H, 2));
        checkRevivalFlags();
    `);
    assert.equal(game.player.alive, true);
    assert.equal(game.player.bottom, 14 * 32, 'Recovery must use the restored height, not the previous squeezed height');
    assert.equal(game.player.grounded, false, 'The next collision step should establish the new floor contact');
});

test('gripping flattens several skin points against the wall', () => {
    const game = wallFixture();
    game.key('ArrowRight', true);
    game.step(25);
    const contactPoints = game.player.body.points.filter(p => p.x > game.player.width / 2 - 0.2);
    assert.ok(contactPoints.length >= 3, 'The gripped side should visibly flatten against the wall');
});
