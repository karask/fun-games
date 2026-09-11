import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createClock, movePlayer, segmentHitsCircle } from '../physics.mjs';
const source = readFileSync(new URL('../game.js', import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function game(qualifies = false) {
    const elements = new Map(); const events = new Map();
    const context = vm.createContext({createClock,movePlayer,segmentHitsCircle,drawArena(){},
        generateLeaderboardHTML:()=>'',isHighScore:()=>qualifies,saveHighScore(){},
        performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
        window:{devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:(name,cb)=>events.set(name,cb)},
        document:{getElementById(id){
            if(!elements.has(id))elements.set(id,{style:{},hidden:false,textContent:'',value:0,
                focus(){},addEventListener(){},getContext:()=>({setTransform(){},fillRect(){}})});
            return elements.get(id);
        },querySelector:()=>({focus(){}}),addEventListener(){}}
    });
    vm.runInContext(source,context);
    const run = code=>vm.runInContext(code,context);
    run('startGame(); enemySpawnTimer=999');
    return {run,events,elements};
}
const enemy = `{x:400,y:300,size:18,speed:0,damage:15,health:60,maxHealth:60,scoreValue:10,color:'#f00',spawnTime:0,hitFlash:0,rotation:0,rotSpeed:0}`;
test('overlapping enemies cause only one hit during recovery',()=>{
    const {run}=game();run(`enemies=[${enemy},${enemy}];update(1/120)`);
    assert.equal(run('player.health'),85); assert.equal(run('enemies.length'),1);
    run('update(1/120)');assert.equal(run('player.health'),85);
});
test('dash avoids contact and cannot be retriggered during cooldown',()=>{
    const {run}=game();run(`enemies=[${enemy}];dash();update(1/120)`);
    assert.equal(run('player.health'),100);assert.ok(run('player.x')>400);
    const remaining=run('player.dashCooldown');run('dash()');assert.equal(run('player.dashCooldown'),remaining);
});
test('fast bullets crossing an enemy register a hit',()=>{
    const {run}=game();run(`enemies=[{...${enemy},x:500}];bullets=[{x:450,y:300,dx:1,dy:0,speed:12000,size:4,damage:25}];update(1/120)`);
    assert.equal(run('enemies[0].health'),35);assert.equal(run('bullets.length'),0);
});
test('pause and window blur freeze time and clear held keys',()=>{
    const {run,events}=game();run('keys.d=true;keys.Space=true');events.get('blur')();
    assert.equal(run('paused'),true);assert.equal(run('keys.Space'),false);
    run('gameLoop(5000)');assert.equal(run('elapsed'),0);assert.equal(run('player.x'),400);
    run('setPaused(false);gameLoop(16)');assert.ok(run('elapsed')<.02);
});
test('fatal hit stops the update before a pickup can revive the player',()=>{
    const {run}=game();run(`player.health=10;enemies=[${enemy}];powerups=[{x:400,y:300,size:10,type:'health',life:10}];update(1/120)`);
    assert.equal(run('gameOver'),true);assert.equal(run('player.health'),0);
});
test('new runs reset dash, protection, movement and held keys',()=>{
    const {run}=game();run('keys.d=true;dash();update(.01);startGame()');
    assert.equal(run('player.vx'),0);assert.equal(run('player.invulnerable'),0);
    assert.equal(run('player.dashCooldown'),0);assert.equal(run('keys.d'),false);
});
test('returning to menu clears game-over state for keyboard start',()=>{
    const {run}=game();run('triggerGameOver();showMenu()');
    assert.equal(run('gameOver'),false);assert.equal(run('gameStarted'),false);
});

test('qualifying scores can be skipped to reveal replay without saving',()=>{
    const {run,elements}=game(true);run('score=100;triggerGameOver()');
    assert.equal(elements.get('retry-btn').hidden,true);
    assert.equal(elements.get('hs-input-section').style.display,'flex');
    run('showPostGameLeaderboard()');
    assert.equal(elements.get('retry-btn').hidden,false);
    assert.equal(elements.get('hs-input-section').style.display,'none');
});
