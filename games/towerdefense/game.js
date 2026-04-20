// ── Global state ──────────────────────────────────────────────────────────
let canvas, ctx, G = null, lastTime = 0;
let carryScore = 0; // accumulated gold-kills across completed levels

// ── Bootstrap ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');

  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); });

  canvas.addEventListener('click',       onCanvasClick);
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); onRightClick(e); });
  canvas.addEventListener('mousemove',   onMouseMove);
  canvas.addEventListener('mouseleave',  () => { if(G) G.hoverCell=null; });

  initUI();
  showMenu();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
});

function resizeCanvas() {
  const hud  = document.getElementById('hud');
  const shop = document.getElementById('shop');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight - (hud?hud.offsetHeight:60) - (shop?shop.offsetHeight:110);
  updateOffsets();
}

// ── Game loop ─────────────────────────────────────────────────────────────
function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  let dt = now - lastTime; lastTime = now;
  dt = Math.min(dt, 100);
  if(G && G.phase==='wave') update(dt * G.speed);
  renderFrame();
}

// ── Level initialisation ──────────────────────────────────────────────────
function startLevel(idx) {
  const lvl = LEVELS[idx];

  const bossTypes = ['dragon','lichking','demonlord'];
  const bossType  = idx===2 ? bossTypes[Math.floor(Math.random()*3)] : null;

  G = {
    phase:             'build',
    levelIdx:          idx,
    waveIdx:           0,
    lives:             lvl.lives,
    gold:              lvl.startGold,
    speed:             1,
    towers:            [],
    monsters:          [],
    projectiles:       [],
    particles:         [],
    spawnGroups:       [],
    allSpawned:        false,
    waveComplete:      false,
    selectedTowerType: null,
    inspectedTower:    null,
    hoverCell:         null,
    bossType,
    idCount:           0,
    killScore:         0, // gold earned from kills in this level
    totalScore:        carryScore, // accumulated from previous levels
  };

  // Pre-convert waypoints to screen coords
  G.screenWPs = lvl.waypoints.map(([c,r]) => gridCenter(c,r));

  updateOffsets();
  hideOverlay();
  updateHUD();
}

// ── Update ────────────────────────────────────────────────────────────────
function update(dt) {
  updateSpawning(dt);
  updateMonsters(dt);
  updateTowers(dt);
  updateProjectiles(dt);
  updateParticles(dt);

  G.monsters    = G.monsters.filter(m=>!m.dead&&!m.reachedEnd);
  G.projectiles = G.projectiles.filter(p=>!p.dead);
  G.particles   = G.particles.filter(p=>p.alpha>0.02);

  if(G.lives<=0) { G.lives=0; G.phase='gameover'; showGameOver(); return; }
  if(G.allSpawned && G.monsters.length===0 && !G.waveComplete) { G.waveComplete=true; onWaveComplete(); }
}

// ── Spawning ──────────────────────────────────────────────────────────────
function updateSpawning(dt) {
  let anyActive=false;
  for(const grp of G.spawnGroups) {
    if(grp.done) continue;
    anyActive=true;
    grp.delayLeft-=dt;
    if(grp.delayLeft>0) continue;
    grp.cooldown-=dt;
    while(grp.cooldown<=0 && grp.remaining>0) {
      grp.cooldown+=grp.interval||1000;
      spawnMonster(grp.type);
      grp.remaining--;
      if(grp.remaining<=0) { grp.done=true; break; }
    }
    if(grp.interval===0 && !grp.done) { spawnMonster(grp.type); grp.done=true; }
  }
  if(!anyActive) G.allSpawned=true;
}

function spawnMonster(type) {
  let def, isBoss=false, bossType=null;
  if(type==='boss') { bossType=G.bossType; def=BOSS_DEFS[bossType]; isBoss=true; }
  else def=MONSTER_DEFS[type];

  if(!def) return;
  const start=G.screenWPs[0];

  const m = {
    id:        G.idCount++,
    type:      isBoss?bossType:type,
    isBoss, bossType,
    hp:        def.hp, maxHp:def.hp,
    speed:     def.speed, baseSpeed:def.speed,
    reward:    def.reward,
    armor:     def.armor||0,
    dodge:     def.dodge||0,
    regen:     def.regen||0,
    immune:    def.immune||{},
    scale:     def.scale||1,
    x:start.x, y:start.y,
    wpIdx:     1,
    distTraveled:0,
    frame:0, frameTimer:0,
    effects:{ slowTimer:0, freezeTimer:0, burnTimer:0, burnDps:0 },
    dead:false, reachedEnd:false,
    summonTimer: (isBoss&&bossType==='lichking')?10000:0,
    spCrossed:[false,false,false],
    enraged:false,
  };
  G.monsters.push(m);
  if(isBoss) showBossBanner(bossType);
}

// ── Monster update ────────────────────────────────────────────────────────
const FRAME_MS = 130;
function updateMonsters(dt) {
  for(const m of G.monsters) {
    if(m.dead||m.reachedEnd) continue;

    let speedMult=1;

    // Freeze
    if(m.effects.freezeTimer>0 && !m.immune.freeze) { m.effects.freezeTimer-=dt; speedMult=0; }

    // Slow (only if not frozen)
    if(speedMult>0 && m.effects.slowTimer>0 && !m.immune.slow) { m.effects.slowTimer-=dt; speedMult=0.5; }

    // Burn damage
    if(m.effects.burnTimer>0 && !m.immune.burn) {
      m.effects.burnTimer-=dt;
      m.hp -= m.effects.burnDps*(dt/1000);
      if(m.hp<=0){ killMonster(m); continue; }
    }

    // Regen
    if(m.regen>0) m.hp=Math.min(m.maxHp, m.hp+m.regen*(dt/1000));

    // Demon Lord: enrage breakpoints
    if(m.bossType==='demonlord') {
      const pct=m.hp/m.maxHp;
      [0.75,0.5,0.25].forEach((t,i)=>{ if(!m.spCrossed[i]&&pct<=t){ m.spCrossed[i]=true; m.speed+=BOSS_DEFS.demonlord.speedBonus; m.enraged=true; spawnParticles(m.x,m.y,'#ff4400',10); } });
    }

    // Lich King: summon
    if(m.bossType==='lichking' && m.hp>0) {
      m.summonTimer-=dt;
      if(m.summonTimer<=0) { m.summonTimer=10000; summonLichMinions(m); }
    }

    // Animation frame
    m.frameTimer+=dt;
    if(m.frameTimer>=FRAME_MS) { m.frameTimer-=FRAME_MS; m.frame=(m.frame+1)%3; }

    // Movement
    if(speedMult===0) continue;
    if(m.wpIdx>=G.screenWPs.length) { m.reachedEnd=true; G.lives--; updateHUD(); continue; }

    const wp=G.screenWPs[m.wpIdx];
    const dx=wp.x-m.x, dy=wp.y-m.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const move=m.speed*speedMult*(dt/1000);

    if(dist<=move+0.5) {
      m.x=wp.x; m.y=wp.y; m.distTraveled+=dist; m.wpIdx++;
    } else {
      const inv=move/dist;
      m.x+=dx*inv; m.y+=dy*inv; m.distTraveled+=move;
    }
  }
}

function killMonster(m) {
  m.dead=true;
  G.gold+=m.reward;
  G.killScore = (G.killScore || 0) + m.reward;
  spawnParticles(m.x, m.y, m.isBoss?'#ffd700':'#aaffaa', m.isBoss?20:6);
  updateHUD();
}

function summonLichMinions(lich) {
  const wps=G.screenWPs;
  for(let i=0;i<2;i++) {
    const def=MONSTER_DEFS.goblin;
    const m={
      id:G.idCount++, type:'goblin', isBoss:false, bossType:null,
      hp:def.hp/2, maxHp:def.hp, speed:def.speed*1.2, baseSpeed:def.speed*1.2,
      reward:0, armor:0, dodge:0, regen:0, immune:{}, scale:1,
      x:lich.x+(i-0.5)*20, y:lich.y,
      wpIdx:lich.wpIdx, distTraveled:lich.distTraveled,
      frame:0, frameTimer:0,
      effects:{slowTimer:0,freezeTimer:0,burnTimer:0,burnDps:0},
      dead:false, reachedEnd:false,
      summonTimer:0, spCrossed:[false,false,false], enraged:false,
    };
    G.monsters.push(m);
  }
}

// ── Tower update ──────────────────────────────────────────────────────────
function updateTowers(dt) {
  for(const tower of G.towers) {
    tower.cooldown=Math.max(0, tower.cooldown-dt);
    if(tower.cooldown>0) continue;

    const def   = TOWER_DEFS[tower.type];
    const stats = def.levels[tower.level];
    const pos   = gridCenter(tower.col, tower.row);

    // Target: furthest along path within range
    let best=null, bestDist=0;
    const scaledRange = stats.range * ((typeof DTW!=='undefined'?DTW:48)/48);
    for(const m of G.monsters) {
      if(m.dead||m.reachedEnd) continue;
      const dx=m.x-pos.x, dy=m.y-pos.y;
      if(dx*dx+dy*dy<=scaledRange*scaledRange && m.distTraveled>bestDist) { best=m; bestDist=m.distTraveled; }
    }
    if(!best) continue;

    tower.cooldown = 1000/stats.fireRate;
    G.projectiles.push({
      id:        G.idCount++,
      x:         pos.x, y:pos.y-18,
      targetId:  best.id,
      towerType: tower.type,
      damage:    stats.damage,
      splashR:   stats.splashR||0,
      effect:    def.effect,
      speed:     def.projectileSpeed||280,
      dead:      false,
    });
  }
}

// ── Projectile update ─────────────────────────────────────────────────────
function updateProjectiles(dt) {
  for(const proj of G.projectiles) {
    if(proj.dead) continue;
    const target=G.monsters.find(m=>m.id===proj.targetId&&!m.dead);
    if(!target) { proj.dead=true; continue; }

    const dx=target.x-proj.x, dy=target.y-proj.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const move=proj.speed*(dt/1000);

    if(dist<=move+1) {
      proj.dead=true;
      // splash
      if(proj.splashR>0) {
        for(const m of G.monsters) {
          if(m.dead) continue;
          const ex=m.x-target.x, ey=m.y-target.y;
          if(ex*ex+ey*ey<=proj.splashR*proj.splashR) applyDamage(m,proj);
        }
        spawnParticles(target.x,target.y,'#ffcc44',8);
      } else {
        applyDamage(target,proj);
      }
    } else {
      const inv=move/dist; proj.x+=dx*inv; proj.y+=dy*inv;
    }
  }
}

function applyDamage(m, proj) {
  if(m.dodge>0 && Math.random()<m.dodge) return;
  const dmg=Math.max(1, proj.damage-m.armor);
  m.hp-=dmg;

  const ef=proj.effect;
  if(ef) {
    if(ef.slow   && !m.immune.slow)   m.effects.slowTimer  =Math.max(m.effects.slowTimer,  ef.slow);
    if(ef.freeze && !m.immune.freeze) m.effects.freezeTimer=Math.max(m.effects.freezeTimer,ef.freeze);
    if(ef.burn   && !m.immune.burn)   { m.effects.burnTimer=Math.max(m.effects.burnTimer,ef.burn.duration); m.effects.burnDps=ef.burn.dps; }
  }
  if(m.hp<=0) killMonster(m);
}

// ── Particles ─────────────────────────────────────────────────────────────
function spawnParticles(x, y, color, count) {
  for(let i=0;i<count;i++) {
    const a=Math.random()*Math.PI*2, spd=30+Math.random()*60;
    G.particles.push({ x, y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd, r:2+Math.random()*3, alpha:1, color });
  }
}

function updateParticles(dt) {
  for(const p of G.particles) {
    p.x+=p.vx*(dt/1000); p.y+=p.vy*(dt/1000);
    p.vx*=0.92; p.vy*=0.92;
    p.alpha-=dt/800;
  }
}

// ── Wave / level flow ─────────────────────────────────────────────────────
function onStartWave() {
  if(!G || G.phase!=='build') return;
  const lvl=LEVELS[G.levelIdx];
  if(G.waveIdx>=lvl.waves.length) return;

  G.phase       = 'wave';
  G.allSpawned  = false;
  G.waveComplete= false;

  const waveDef=lvl.waves[G.waveIdx];
  G.spawnGroups=waveDef.map(g=>({
    type:      g.type,
    count:     g.count,
    remaining: g.count,
    interval:  g.interval||1000,
    delayLeft: g.delay||0,
    cooldown:  g.interval||1000,
    done:      false,
  }));

  updateHUD();
}

function onToggleSpeed() {
  if(!G) return;
  G.speed = G.speed===1 ? 2 : 1;
  updateHUD();
}

function onWaveComplete() {
  const lvl=LEVELS[G.levelIdx];
  G.waveIdx++;
  if(G.waveIdx>=lvl.waves.length) {
    // Level complete — bank this level's kill score
    carryScore = (G.totalScore || 0) + (G.killScore || 0);
    G.totalScore = carryScore;
    G.phase='levelcomplete';
    if(G.levelIdx===LEVELS.length-1) showVictory();
    else showLevelComplete();
  } else {
    G.phase='build';
    updateHUD();
  }
}

// ── Tower placement ───────────────────────────────────────────────────────
function placeTower(col, row) {
  const lvl=LEVELS[G.levelIdx];
  if(col<0||col>=COLS||row<0||row>=ROWS) return;
  if(lvl.map[row][col]!==T_GRASS) return;
  if(G.towers.find(t=>t.col===col&&t.row===row)) return;

  const def=TOWER_DEFS[G.selectedTowerType];
  const cost=def.levels[0].cost;
  if(G.gold<cost) return;

  G.gold-=cost;
  G.towers.push({ id:G.idCount++, type:G.selectedTowerType, col, row, level:0, cooldown:0 });
  updateHUD();
}

function upgradeTower() {
  const t=G.inspectedTower;
  if(!t||t.level>=2) return;
  const def=TOWER_DEFS[t.type];
  const cost=def.levels[t.level].upgradeCost;
  if(G.gold<cost) return;
  G.gold-=cost;
  t.level++;
  updateHUD();
}

function sellTower() {
  const t=G.inspectedTower;
  if(!t) return;
  const def=TOWER_DEFS[t.type];
  const totalPaid=[...def.levels].slice(0,t.level+1).reduce((s,l)=>s+(l.cost||0)+(l.upgradeCost&&t.level>=[...def.levels].indexOf(l)?l.upgradeCost:0),0);
  // Simple formula: give back 50% of base cost + upgrades paid
  let paid=def.levels[0].cost;
  for(let i=1;i<=t.level;i++) paid+=def.levels[i-1].upgradeCost||0;
  G.gold+=Math.floor(paid*0.5);
  G.towers=G.towers.filter(x=>x.id!==t.id);
  G.inspectedTower=null;
  updateHUD();
}

// ── Input handlers ────────────────────────────────────────────────────────
function onCanvasClick(e) {
  if(!G || G.phase==='gameover'||G.phase==='levelcomplete'||G.phase==='menu') return;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const {col,row}=screenToGrid(mx,my);

  if(G.selectedTowerType) {
    placeTower(col,row);
  } else {
    // Inspect tower
    const found=G.towers.find(t=>t.col===col&&t.row===row);
    G.inspectedTower=found||null;
    renderTowerInfo();
  }
}

function onRightClick(e) {
  if(!G) return;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const {col,row}=screenToGrid(mx,my);

  if(G.selectedTowerType) {
    G.selectedTowerType=null; updateShop();
  } else {
    const found=G.towers.find(t=>t.col===col&&t.row===row);
    if(found) { G.inspectedTower=found; renderTowerInfo(); }
    else { G.inspectedTower=null; renderTowerInfo(); }
  }
}

function onMouseMove(e) {
  if(!G) return;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const {col,row}=screenToGrid(mx,my);
  G.hoverCell=(col>=0&&col<COLS&&row>=0&&row<ROWS)?{col,row}:null;
}
