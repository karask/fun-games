import assert from 'node:assert/strict';
import { test } from 'node:test';
import { levels, TILE } from '../levels.js';
import { createHarness } from './harness.mjs';
import { createLevel2Route } from './level-2-route.mjs';

const level = levels[1];

function at(col, row = level.spawnP1.row) {
    return createHarness({ map: level.map, x: col * 32, y: row * 32 - 38 });
}

test('both spawns, revival flags, and the finish have safe standing space', () => {
    for (const point of [level.spawnP1, level.spawnP2, ...level.revivalFlags, level.endFlag]) {
        const game = at(point.col, point.row);
        game.step(30);
        assert.equal(game.player.alive, true, `Hazard at flag/spawn ${point.col},${point.row}`);
        assert.equal(game.player.bottom, point.row * 32, `No safe floor at ${point.col},${point.row}`);
        assert.ok(game.player.shapeFits(36, 38), `Obstructed standing space at ${point.col},${point.row}`);
    }
});

test('the opening tunnel requires squeezing and allows recovery on the far side', () => {
    const game = at(10);
    game.key('ArrowRight', true);
    game.step(45);
    assert.ok(game.player.x < 12 * 32, 'Standing slime must stop at the tunnel');
    game.key('ArrowDown', true);
    game.step(100);
    assert.ok(game.player.x > 19 * 32, 'Squeezing must allow traversal of the tunnel');
    game.key('ArrowDown', false);
    game.step(30);
    assert.equal(game.player.height, 38);
    assert.equal(game.player.alive, true);
});

test('the wall-jump chamber is taller than a ground jump and safe to fall into', () => {
    const game = at(34);
    game.key('ArrowRight', true);
    game.key('ArrowUp', true);
    game.step(110);
    assert.ok(game.player.x < 36 * 32, 'A held ground jump alone must not bypass the chamber');
    assert.equal(game.player.alive, true, 'Learning to grip must not have a lethal floor');
    assert.ok(level.map[11][36] === TILE.SOLID, 'The raised landing must exist');
});

for (const playerNum of [1, 2]) {
    for (const offset of [-8, 0, 8]) {
        test(`player ${playerNum} can complete the route with takeoffs shifted by ${offset}px`, () => {
            const spawn = playerNum === 1 ? level.spawnP1 : level.spawnP2;
            const game = at(spawn.col, spawn.row);
            game.run(`levelData = ${JSON.stringify(level)}; currentLevelIndex = 1;
                players = [new Slime(${spawn.col * 32}, ${spawn.row * 32 - 38}, ${playerNum})];`);
            const route = createLevel2Route(offset), usedMoves = new Set();
            const controls = game.player.controls;
            for (let tick = 0; tick < 1500 && game.run('state') === 'PLAYING'; tick++) {
                const input = route(game.player, tick);
                if (input.jumpStarted) {
                    usedMoves.add(input.jumpStarted);
                    game.key(controls.up, false);
                }
                for (const direction of ['left', 'right', 'up', 'down']) game.key(controls[direction], input[direction]);
                game.step();
                assert.equal(game.player.alive, true, `Died at ${game.player.x.toFixed(1)},${game.player.y.toFixed(1)}`);
            }
            assert.equal(game.run('state'), 'LEVEL_COMPLETE');
            assert.ok(usedMoves.has('push left') && usedMoves.has('push right'), 'Route must use the wall chamber');
            assert.ok(usedMoves.has('stepping stone'), 'Route must land on the pool platforms');
        });
    }
}
