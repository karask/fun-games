import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock, sweepCircleRect, paddleBounce, pointerPosition } from '../physics.mjs';
test('simulation and timers are independent of refresh rate',()=>{
 for(const hz of [30,60,144]){const c=createClock();let time=0;for(let i=0;i<hz;i++)c.advance(1/hz,dt=>time+=dt);assert.ok(Math.abs(time-60)<1e-6)}
});
test('long stalls have bounded catch-up',()=>{let time=0;const c=createClock();c.advance(30,dt=>time+=dt);assert.ok(time<=6);c.reset();});
const box={x:100,y:100,w:70,h:22};
test('fast balls cannot tunnel through a brick',()=>{
 const hit=sweepCircleRect(135,160,0,-100,7,box);assert.ok(hit);assert.ok(Math.abs(hit.t-.31)<1e-8);assert.equal(hit.ny,1);
});
test('corner collisions use the circle rather than an inflated square',()=>{
 assert.equal(sweepCircleRect(92,92,2,0,7,box),null);
 assert.ok(sweepCircleRect(80,80,30,30,7,box));
});
test('moving away from a touching surface does not bounce again',()=>{
 assert.equal(sweepCircleRect(135,129,0,10,7,box),null);
});
test('paddle edges steer outward with controlled speed and upward travel',()=>{
 for(const offset of [-1,-.5,0,.5,1]){const v=paddleBounce(offset,9);assert.ok(v.vy< -3);assert.ok(Math.abs(Math.hypot(v.vx,v.vy)-9)<1e-8);if(offset!==0)assert.equal(Math.sign(v.vx),Math.sign(offset))}
});
test('pointer coordinates map a scaled canvas into world coordinates',()=>{
 assert.equal(pointerPosition(210,{left:10,width:400},800),400);
 assert.equal(pointerPosition(-20,{left:10,width:400},800),0);
});
