// ── Global state ──────────────────────────────────────────────────────────
let canvas, ctx, G = null, lastTime = 0;
let carryScore = 0; // accumulated gold-kills across completed levels

// ── Bootstrap ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');

  canvas.addEventListener('click',       onCanvasClick);
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); onRightClick(e); });
  canvas.addEventListener('mousemove',   onMouseMove);
  canvas.addEventListener('mouseleave',  () => { if(G && !G.touchMode) G.hoverCell=null; });

  initUI();
  resizeCanvas();
  new ResizeObserver(resizeCanvas).observe(canvas);
  window.addEventListener('resize', resizeCanvas);
  showMenu();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
});

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  viewWidth = Math.max(1, rect.width);
  viewHeight = Math.max(1, rect.height);
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(viewWidth * pixelRatio);
  canvas.height = Math.round(viewHeight * pixelRatio);
  updateOffsets();
}

// ── Game loop ─────────────────────────────────────────────────────────────
function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  let dt = now - lastTime; lastTime = now;
  dt = Math.min(dt, 100);
  if(G && G.phase==='wave' && !G.paused) update(dt * G.speed);
  if(G && !G.paused) {
    G.visualTime = (G.visualTime || 0) + dt;
    if(G.phase === 'build') updateParticles(dt);
    G.remnants = (G.remnants || []).filter(m => { m.fade -= dt; return m.fade > 0; });
    G.effects = (G.effects || []).filter(f => { f.life -= dt; return f.life > 0; });
  }
  renderFrame();
}

// ── Level initialisation ──────────────────────────────────────────────────
function startLevel(idx) {
  const lvl = LEVELS[idx];
  const campaignStart = G ? G.campaignStart : idx;

  const bossTypes = ['dragon','lichking','demonlord'];
  const bossType  = idx===2 ? bossTypes[Math.floor(Math.random()*3)] : null;

  G = {
    phase:             'build',
    paused:            false,
    campaignStart,
    visualTime:        0,
    remnants:          [],
    effects:           [],
    touchMode:         Boolean(window.matchMedia?.('(pointer: coarse)').matches),
    reducedMotion:     Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
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
  resetCamera();
  hideOverlay();
  updateHUD();
  Sound.sync(true);
}

// ── Update ────────────────────────────────────────────────────────────────
function update(dt) {
  if(G.paused) return;
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
    effects:{ slowTimer:0, freezeTimer:0, freezeRecovery:0, burnTimer:0, burnDps:0 },
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
    m.hitTimer = Math.max(0, (m.hitTimer || 0) - dt);
    m.effects.freezeRecovery = Math.max(0, (m.effects.freezeRecovery || 0) - dt);

    // Freeze
    if(m.effects.freezeTimer>0 && !m.immune.freeze) {
      m.effects.freezeTimer-=dt; speedMult=0;
      if(m.effects.freezeTimer<=0) m.effects.freezeRecovery = 1200;
    }

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
    if(m.wpIdx>=G.screenWPs.length) {
      m.reachedEnd=true; G.lives = m.isBoss ? 0 : Math.max(0, G.lives - 1);
      if(m.isBoss) G.bossEscaped = true;
      G.crystalFlash = G.visualTime;
      Sound.play('leak'); updateHUD(); continue;
    }

    const wp=G.screenWPs[m.wpIdx];
    const dx=wp.x-m.x, dy=wp.y-m.y;
    m.facing = dx >= 0 ? 1 : -1;
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
  if(m.dead || m.reachedEnd) return;
  m.dead=true;
  G.remnants.push({...m, fade:350});
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
    tower.shot = Math.max(0, (tower.shot || 0) - dt);
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
      const rank = tower.priority === 'strongest' ? m.hp : tower.priority === 'fastest' ? m.speed : m.distTraveled;
      if(dx*dx+dy*dy<=scaledRange*scaledRange && (!best || rank>bestDist)) { best=m; bestDist=rank; }
    }
    if(!best) continue;

    tower.cooldown = 1000/stats.fireRate;
    tower.aim = Math.atan2(best.y-pos.y, best.x-pos.x);
    tower.shot = 180;
    Sound.play(tower.type);
    G.projectiles.push({
      id:        G.idCount++,
      x:         pos.x, y:pos.y-42,
      startX:    pos.x, startY:pos.y-42,
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
    const target=G.monsters.find(m=>m.id===proj.targetId&&!m.dead&&!m.reachedEnd);
    if(!target) { proj.dead=true; continue; }

    const dx=target.x-proj.x, dy=target.y-proj.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const move=proj.speed*(dt/1000);

    if(dist<=move+1) {
      proj.dead=true;
      G.effects.push({x:target.x,y:target.y-12,type:proj.towerType,life:250,maxLife:250,radius:proj.splashR || 16});
      // splash
      if(proj.splashR>0) {
        for(const m of G.monsters) {
          if(m.dead || m.reachedEnd) continue;
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
  if(m.dead || m.reachedEnd) return;
  if(m.dodge>0 && Math.random()<m.dodge) return;
  const dmg=Math.max(1, proj.damage-(proj.towerType === 'magic' ? 0 : m.armor));
  m.hp-=dmg;
  m.hitTimer = 100;
  Sound.play('hit');

  const ef=proj.effect;
  if(ef) {
    if(ef.slow   && !m.immune.slow)   m.effects.slowTimer  =Math.max(m.effects.slowTimer,  ef.slow);
    if(ef.freeze && !m.immune.freeze && !(m.effects.freezeRecovery>0) && !(m.effects.freezeTimer>0)) m.effects.freezeTimer=ef.freeze;
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
  if(!G || G.paused || G.phase!=='build') return;
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
  Sound.play('wave');
}

function onToggleSpeed() {
  if(!G || G.paused) return;
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
  if(!G || G.paused || !['build','wave'].includes(G.phase) || !G.selectedTowerType) return false;
  const error = placementError(col,row);
  if(error) { notifyPlayer(error); return false; }

  const def=TOWER_DEFS[G.selectedTowerType];
  const cost=def.levels[0].cost;
  if(G.gold<cost) return;

  G.gold-=cost;
  G.towers.push({ id:G.idCount++, type:G.selectedTowerType, col, row, level:0, cooldown:0, priority:'first', aim:-.5, shot:0, builtAt:G.visualTime });
  G.pendingTile = null;
  Sound.play('build');
  updateHUD();
  return true;
}

function placementError(col,row) {
  if(col<0 || col>=COLS || row<0 || row>=ROWS) return 'Choose a tile inside the realm.';
  const tile = LEVELS[G.levelIdx].map[row][col];
  if(tile === T_PATH) return 'Keep the enemy path clear.';
  if(tile !== T_GRASS) return 'Build on open meadow, away from trees, water and rocks.';
  if(G.towers.some(t => t.col === col && t.row === row)) return 'A tower already guards this tile.';
  if(G.selectedTowerType && G.gold < TOWER_DEFS[G.selectedTowerType].levels[0].cost) return `Need ${TOWER_DEFS[G.selectedTowerType].levels[0].cost-G.gold} more gold.`;
  return '';
}

function upgradeTower() {
  if(!G || G.paused || !['build','wave'].includes(G.phase)) return;
  const t=G.inspectedTower;
  if(!t||t.level>=2) return;
  const def=TOWER_DEFS[t.type];
  const cost=def.levels[t.level].upgradeCost;
  if(G.gold<cost) return;
  G.gold-=cost;
  t.level++;
  Sound.play('upgrade');
  updateHUD();
}

function sellTower() {
  if(!G || G.paused || !['build','wave'].includes(G.phase)) return;
  const t=G.inspectedTower;
  if(!t) return;
  G.gold+=towerSellValue(t);
  G.towers=G.towers.filter(x=>x.id!==t.id);
  G.inspectedTower=null;
  Sound.play('sell');
  updateHUD();
}

function towerSellValue(tower) {
  const levels = TOWER_DEFS[tower.type].levels;
  let paid = levels[0].cost;
  for (let i = 0; i < tower.level; i++) paid += levels[i].upgradeCost;
  return Math.floor(paid / 2);
}

// ── Input handlers ────────────────────────────────────────────────────────
function onCanvasClick(e) {
  if(suppressCanvasClick) { suppressCanvasClick = false; return; }
  if(!G || G.paused || !['build','wave'].includes(G.phase)) return;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const {col,row}=screenToGrid(mx,my);

  if(G.selectedTowerType) {
    G.hoverCell = {col,row};
    if(G.touchMode && (!G.pendingTile || G.pendingTile.col !== col || G.pendingTile.row !== row)) {
      G.pendingTile = {col,row}; renderTowerInfo();
    } else placeTower(col,row);
  } else {
    // Inspect tower
    const found=G.towers.find(t=>t.col===col&&t.row===row);
    G.inspectedTower=found||null;
    renderTowerInfo();
  }
}

function onRightClick(e) {
  if(!G || G.paused || !['build','wave'].includes(G.phase)) return;
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
  if(!G || G.paused || G.touchMode || cameraDrag?.dragging) return;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const {col,row}=screenToGrid(mx,my);
  const prev = G.hoverCell;
  G.hoverCell=(col>=0&&col<COLS&&row>=0&&row<ROWS)?{col,row}:null;
  if(G.selectedTowerType && (prev?.col !== G.hoverCell?.col || prev?.row !== G.hoverCell?.row)) renderTowerInfo();
}
