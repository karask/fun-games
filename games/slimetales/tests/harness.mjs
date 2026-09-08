import { readFileSync } from 'node:fs';
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
