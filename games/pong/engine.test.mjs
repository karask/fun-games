import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PongMatch, FrameClock, COURT, STEP } from './engine.mjs';

function playing(options = {}) {
    const game = new PongMatch(() => 0.5);
    game.start({ mode: 'versus', ...options });
    for (let i = 0; i < 180; i++) game.step([]);
    assert.equal(game.phase, 'playing');
    return game;
}

test('start resets the whole match and gives players a stationary serve countdown', () => {
    const game = playing();
    game.scores[0] = 4;
    game.paddles[0].y = 0;
    game.start({ mode: 'solo', difficulty: 'easy' });
    assert.deepEqual(game.scores, [0, 0]);
    assert.equal(game.rally, 0);
    assert.equal(game.paddles[0].y, (COURT.height - COURT.paddleHeight) / 2);
    for (let i = 0; i < 60; i++) game.step([]);
    assert.equal(game.phase, 'serving');
    assert.equal(game.ball.x, COURT.width / 2);
});

test('paddles clamp at both boundaries and pointer movement has a speed limit', () => {
    const game = playing();
    for (let i = 0; i < 300; i++) game.step([{ axis: -1 }, { axis: 1 }]);
    assert.equal(game.paddles[0].y, 0);
    assert.equal(game.paddles[1].y, COURT.height - COURT.paddleHeight);
    game.step([{ target: COURT.height }]);
    assert.ok(game.paddles[0].y > 0 && game.paddles[0].y < 6);
});

test('a fast ball crossing the paddle face bounces exactly once', () => {
    const game = playing();
    Object.assign(game.ball, { x: 68, y: 250, vx: -6000, vy: 0, speed: 800 });
    game.step([]);
    assert.ok(game.ball.vx > 0);
    assert.equal(game.rally, 1);
    assert.equal(game.bestRally, 1);
    game.step([]);
    assert.equal(game.rally, 1);
});

test('balls behind a paddle score instead of bouncing off its back', () => {
    const game = playing();
    Object.assign(game.ball, { x: 10, y: 250, vx: -800, vy: 0 });
    for (let i = 0; i < 5; i++) game.step([]);
    assert.deepEqual(game.scores, [0, 1]);
    assert.equal(game.phase, 'serving');
});

test('edge hits aim the return and a moving paddle adds spin without vertical stalls', () => {
    const bounce = (offset, axis = 0) => {
        const game = playing();
        Object.assign(game.ball, { x: 45, y: 250 + offset, vx: -800, vy: 0, speed: 800 });
        game.step([{ axis }]);
        return game.ball;
    };
    assert.ok(bounce(-30).vy < -300);
    assert.ok(bounce(30).vy > 300);
    assert.ok(bounce(0, 1).vy > bounce(0).vy);
    assert.ok(bounce(43).vx > 300);
    assert.ok(bounce(43).speed <= COURT.maxBallSpeed);
});

test('wall bounces keep the ball inside the court and facing inward', () => {
    const game = playing();
    Object.assign(game.ball, { x: 400, y: 7, vx: 100, vy: -800 });
    game.step([]);
    assert.ok(game.ball.y >= COURT.radius);
    assert.ok(game.ball.vy > 0);
});

test('first to five ends once and does not launch another serve', () => {
    const game = playing();
    game.scores[0] = 4;
    game.rally = 7;
    game.bestRally = 7;
    Object.assign(game.ball, { x: 805, y: 20, vx: 800, vy: 0 });
    game.step([]);
    assert.equal(game.phase, 'over');
    assert.equal(game.winner, 0);
    assert.deepEqual(game.scores, [5, 0]);
    for (let i = 0; i < 300; i++) game.step([]);
    assert.deepEqual(game.scores, [5, 0]);
    assert.equal(game.bestRally, 7);
});

test('pause freezes the ball, paddles and serve timer, then resumes the same phase', () => {
    const game = new PongMatch(() => 0.5);
    game.start();
    game.pause();
    const frozen = JSON.stringify([game.ball, game.paddles, game.serveTime]);
    for (let i = 0; i < 120; i++) game.step([{ axis: 1 }]);
    assert.equal(JSON.stringify([game.ball, game.paddles, game.serveTime]), frozen);
    game.resume();
    assert.equal(game.phase, 'serving');
    for (let i = 0; i < 180; i++) game.step([]);
    game.pause();
    game.resume();
    assert.equal(game.phase, 'playing');
});

test('CPU reacts with bounded movement and can miss difficult shots', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
        const game = playing({ mode: 'solo', difficulty });
        game.paddles[1].y = 0;
        Object.assign(game.ball, { x: 720, y: 470, vx: 800, vy: 0 });
        game.step([]);
        assert.ok(game.paddles[1].y < 5, difficulty);
        for (let i = 0; i < 25; i++) game.step([]);
        assert.equal(game.scores[0], 1, difficulty);
    }
});

test('fixed clock gives equal simulated time across display refresh rates', () => {
    for (const fps of [30, 60, 120, 144]) {
        const clock = new FrameClock();
        let steps = 0;
        for (let i = 0; i <= fps * 2; i++) clock.advance(i * 1000 / fps, () => steps++);
        assert.equal(steps, Math.round(2 / STEP), `${fps} Hz`);
    }
});

test('a suspended tab does not fast-forward the match', () => {
    const clock = new FrameClock();
    let steps = 0;
    clock.advance(0, () => steps++);
    clock.advance(10000, () => steps++);
    assert.equal(steps, 0);
    clock.advance(10000 + 1000 / 60, () => steps++);
    assert.equal(steps, 2);
    clock.reset();
    clock.advance(20000, () => steps++);
    assert.equal(steps, 2);
});
