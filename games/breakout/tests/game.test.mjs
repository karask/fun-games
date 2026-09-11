import test from 'node:test';
import {createSound} from '../audio.mjs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createClock,sweepCircleRect,paddleBounce,pointerPosition} from '../physics.mjs';
const source=readFileSync(new URL('../game.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function game(audioEvents){
 const elements=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){},querySelector(){return this},querySelectorAll(){return [this]},getClientRects(){return [{}]},addEventListener(){},getContext:()=>({setTransform(){}})});return elements.get(id)};
 const c=vm.createContext({createSound:()=>({...createSound({}),play:cue=>audioEvents?.push(cue)}),createClock,sweepCircleRect,paddleBounce,pointerPosition,
  getHighScores:()=>[],isHighScore:()=>false,saveHighScore(){},generateLeaderboardHTML:()=>'',localStorage:{getItem:()=>null},
  performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  window:{devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener(){}},
  document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){}}});
 vm.runInContext(source,c);const run=code=>vm.runInContext(code,c);run('startGame()');return run;
}
test('all 20 layouts contain destructible bricks inside the arena',()=>{
 const run=game();assert.equal(run('LEVEL_DATA.length'),20);
 assert.equal(run('LEVEL_DATA.every((_,i)=>{const b=buildBricks(i);return b.some(x=>x.type!=="unbreakable")&&b.every(x=>x.x>=0&&x.x+x.w<=W&&x.y+x.h<paddle.y)})'),true);
});
test('launch and repeated slow pickups preserve the configured speed',()=>{
 const run=game();run('state.level=12;initLevel(11);applyPowerup("SLOW");applyPowerup("SLOW");launchBalls()');
 assert.ok(Math.abs(run('Math.hypot(balls[0].vx,balls[0].vy)-state.ballSpeed*.7'))<1e-8);
});
test('a fast ball bounces off the first brick on its path',()=>{
 const run=game();run('bricks=[{x:100,y:100,w:70,h:22,type:"strong",hits:2,maxHits:2,score:80}];balls=[makeBall(135,200,-Math.PI/2,200)];advanceBall(balls[0],1)');
 assert.equal(run('bricks[0].hits'),1);assert.ok(run('balls[0].vy')>0);
});
test('through balls damage a strong brick once per crossing',()=>{
 const run=game();run('bricks=[{x:100,y:100,w:70,h:22,type:"strong",hits:2,maxHits:2,score:80}];balls=[makeBall(135,135,-Math.PI/2,6)];balls[0].through=true;for(let i=0;i<12;i++)advanceBall(balls[0],.5)');
 assert.equal(run('bricks[0].hits'),1);
});
test('explosion chains score each brick once and protect steel',()=>{
 const run=game();run('bricks=[{x:100,y:100,w:70,h:22,type:"explosive",hits:1,score:60},{x:175,y:100,w:70,h:22,type:"explosive",hits:1,score:60},{x:250,y:100,w:70,h:22,type:"unbreakable",hits:Infinity,score:0}];damageBrick(bricks[0]);resolveExplosions()');
 assert.equal(run('state.score'),120);assert.equal(run('bricks.length'),1);assert.equal(run('pendingExplosions.length'),0);
});
test('pause freezes timers and clears input without starting another animation loop',()=>{
 const run=game();run('keys.ArrowRight=true;applyPowerup("WIDE");togglePause();update(60)');
 assert.equal(run('activePowerups.WIDE'),600);assert.equal(run('Object.keys(keys).length'),0);assert.equal(run('state.phase'),'paused');
});
test('magnet releases every attached multiball together',()=>{
 const run=game();run('applyPowerup("MULTI");launchBalls()');assert.equal(run('balls.length'),2);assert.equal(run('balls.every(b=>!b.sticky)'),true);
});
test('a new level discards pending explosions and held input',()=>{
 const run=game();run('pendingExplosions.push(bricks[0]);keys.ArrowLeft=true;initLevel(1)');assert.equal(run('pendingExplosions.length'),0);assert.equal(run('Object.keys(keys).length'),0);
});
test('steel walls do not seal destructible bricks away from a normal ball',()=>{
 const run=game();
 for(let level=0;level<20;level++){
  const bricks=JSON.parse(run(`JSON.stringify(buildBricks(${level}))`));
  const steel=bricks.filter(b=>b.type==='unbreakable');
  const step=4,cols=201,rows=141,visited=new Uint8Array(cols*rows),queue=[];
  const free=(x,y)=>x>=7&&x<=793&&y>=7&&y<=553&&!steel.some(b=>{
   const dx=x-Math.max(b.x,Math.min(b.x+b.w,x)),dy=y-Math.max(b.y,Math.min(b.y+b.h,y));return dx*dx+dy*dy<49;
  });
  const start=130*cols+100;visited[start]=1;queue.push(start);
  for(let i=0;i<queue.length;i++){
   const index=queue[i],cx=index%cols,cy=Math.floor(index/cols);
   for(const [nx,ny] of [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]]){
    if(nx<0||nx>=cols||ny<0||ny>=rows)continue;const next=ny*cols+nx;
    if(!visited[next]&&free(nx*step,ny*step)){visited[next]=1;queue.push(next)}
   }
  }
  for(const b of bricks.filter(b=>b.type!=='unbreakable')){
   const reachable=queue.some(i=>{const x=i%cols*step,y=Math.floor(i/cols)*step;
    return x>=b.x-7&&x<=b.x+b.w+7&&y>=b.y-7&&y<=b.y+b.h+7});
   assert.ok(reachable,`Level ${level+1} has a sealed brick at ${b.x},${b.y}`);
  }
 }
});

test('timed boosts expire identically at different display refresh rates',()=>{
 for(const hz of [30,60,144]){
  const run=game();run('applyPowerup("SLOW");applyPowerup("SMALL")');
  run(`for(let i=0;i<${hz*9};i++)clock.advance(1/${hz},update)`);
  assert.equal(run('activePowerups.SLOW'),0);assert.equal(run('activePowerups.SMALL'),0);
  assert.equal(run('balls[0].r'),7);
  assert.ok(Math.abs(run('Math.hypot(balls[0].vx,balls[0].vy)-state.ballSpeed'))<1e-8);
 }
});
test('losing the last ball costs one life and resets boosts for a clean serve',()=>{
 const run=game();run('applyPowerup("THROUGH");applyPowerup("WIDE");balls[0].sticky=false;balls[0].y=600;balls[0].vy=6;update(.5)');
 assert.equal(run('state.lives'),2);assert.equal(run('balls[0].sticky'),true);
 assert.equal(run('activePowerups.THROUGH'),0);assert.equal(run('paddle.w'),110);
});
test('the final brick completes a level before a simultaneous lost ball',()=>{
 const run=game();run('bricks=[];balls[0].sticky=false;balls[0].y=600;update(.5)');
 assert.equal(run('state.phase'),'levelclear');assert.equal(run('state.lives'),3);
});

test('launches, brick destruction and lost lives trigger the corresponding sounds',()=>{
 const events=[],run=game(events);
 run('launchBalls();damageBrick(bricks[bricks.length-1]);balls[0].y=600;balls[0].vy=6;update(.5)');
 assert.ok(events.includes('launch'));assert.ok(events.includes('brick'));assert.ok(events.includes('lost'));
});
