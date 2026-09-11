import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock, movePlayer, segmentHitsCircle } from '../physics.mjs';

test('physics advances equally at 30, 60 and 144 Hz', () => {
    for (const hz of [30, 60, 144]) {
        const clock = createClock(); let steps = 0;
        for (let i = 0; i < hz; i++) clock.advance(1 / hz, () => steps++);
        assert.equal(steps, 120);
    }
});
test('a long stall cannot teleport the simulation forward', () => {
    const clock = createClock(); let elapsed = 0;
    clock.advance(30, dt => elapsed += dt);
    assert.ok(elapsed <= .101);
    clock.reset(); let steps = 0;
    clock.advance(1 / 120, () => steps++);
    assert.equal(steps, 1);
});
test('bullets hit targets crossed between frames, including tangents', () => {
    assert.equal(segmentHitsCircle(0, 0, 100, 0, 50, 0, 10), true);
    assert.equal(segmentHitsCircle(0, 10, 100, 10, 50, 0, 10), true);
    assert.equal(segmentHitsCircle(0, 11, 100, 11, 50, 0, 10), false);
    assert.equal(segmentHitsCircle(0, 0, 0, 0, 0, 0, 10), true);
    assert.equal(segmentHitsCircle(0, 0, 0, 0, 20, 0, 10), false);
});
const player = () => ({x:400,y:300,vx:0,vy:0,size:15,speed:250,dashTime:0,aimX:1,aimY:0});
test('diagonal movement has the same speed and stops promptly', () => {
    const a=player(), b=player();
    for(let i=0;i<120;i++){movePlayer(a,1,0,1/120,800,600);movePlayer(b,1,1,1/120,800,600)}
    assert.ok(Math.abs(Math.hypot(b.x-400,b.y-300)-(a.x-400))<.001);
    for(let i=0;i<24;i++) movePlayer(a,0,0,1/120,800,600);
    assert.ok(Math.abs(a.vx)<1);
});
test('dash moves in its captured direction and respects arena bounds', () => {
    const p=player();p.dashTime=.16;p.dashX=1;p.dashY=0;
    movePlayer(p,-1,0,.1,800,600);
    assert.equal(p.x,470);
    p.x=780;movePlayer(p,1,0,.1,800,600);
    assert.equal(p.x,785);assert.equal(p.vx,0);
});
