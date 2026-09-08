// ── Tower definitions ──────────────────────────────────────────────────────
// levels: [{cost, upgradeCost, damage, range, fireRate(shots/s), splashR}]
const TOWER_ORDER = ['archer', 'magic', 'cannon', 'ice', 'dragon'];

const TOWER_DEFS = {
  archer: {
    name: 'Archer Tower', icon: '🏹', color: '#a08060',
    desc: 'Fast single-target. Cheap and reliable.',
    projectileColor: '#c8a050', projectileSize: 3, projectileSpeed: 320,
    effect: null,
    levels: [
      { cost: 75, upgradeCost: 100, damage: 20, range: 120, fireRate: 1.5, splashR: 0 },
      { cost: 0, upgradeCost: 125, damage: 32, range: 135, fireRate: 2.0, splashR: 0 },
      { cost: 0, upgradeCost: 0, damage: 50, range: 150, fireRate: 2.5, splashR: 0 },
    ],
  },
  magic: {
    name: 'Magic Tower', icon: '🔮', color: '#9b44cc',
    desc: 'Pierces armor and slows enemies for 2 seconds.',
    projectileColor: '#cc44ff', projectileSize: 5, projectileSpeed: 260,
    effect: { slow: 2000 },
    levels: [
      { cost: 150, upgradeCost: 175, damage: 40, range: 110, fireRate: 0.9, splashR: 0 },
      { cost: 0, upgradeCost: 200, damage: 65, range: 125, fireRate: 1.1, splashR: 0 },
      { cost: 0, upgradeCost: 0, damage: 90, range: 140, fireRate: 1.3, splashR: 0 },
    ],
  },
  cannon: {
    name: 'Cannon Tower', icon: '💣', color: '#555555',
    desc: 'Area-of-effect blast. Great vs crowds.',
    projectileColor: '#999999', projectileSize: 6, projectileSpeed: 220,
    effect: null,
    levels: [
      { cost: 200, upgradeCost: 225, damage: 75, range: 95, fireRate: 0.5, splashR: 55 },
      { cost: 0, upgradeCost: 250, damage: 115, range: 105, fireRate: 0.6, splashR: 65 },
      { cost: 0, upgradeCost: 0, damage: 165, range: 115, fireRate: 0.7, splashR: 75 },
    ],
  },
  ice: {
    name: 'Ice Tower', icon: '❄️', color: '#60a8c0',
    desc: 'Freezes enemies for 1.5 seconds. They briefly resist freezing afterward.',
    projectileColor: '#88ddff', projectileSize: 4, projectileSpeed: 270,
    effect: { freeze: 1500 },
    levels: [
      { cost: 175, upgradeCost: 200, damage: 18, range: 115, fireRate: 0.9, splashR: 0 },
      { cost: 0, upgradeCost: 225, damage: 30, range: 130, fireRate: 1.1, splashR: 30 },
      { cost: 0, upgradeCost: 0, damage: 45, range: 145, fireRate: 1.3, splashR: 45 },
    ],
  },
  dragon: {
    name: 'Dragon Roost', icon: '🐉', color: '#8b2020',
    desc: 'Burns enemies over time. Devastating damage.',
    projectileColor: '#ff6600', projectileSize: 5, projectileSpeed: 280,
    effect: { burn: { dps: 25, duration: 3000 } },
    levels: [
      { cost: 350, upgradeCost: 375, damage: 110, range: 140, fireRate: 0.6, splashR: 0 },
      { cost: 0, upgradeCost: 400, damage: 175, range: 160, fireRate: 0.75, splashR: 0 },
      { cost: 0, upgradeCost: 0, damage: 250, range: 180, fireRate: 0.9, splashR: 0 },
    ],
  },
};

// ── Monster definitions ────────────────────────────────────────────────────
const MONSTER_DEFS = {
  goblin: { name: 'Goblin', hp: 60, speed: 72, reward: 10, armor: 0, dodge: 0, regen: 0, scale: 1.0 },
  orc: { name: 'Orc Warrior', hp: 200, speed: 48, reward: 25, armor: 8, dodge: 0, regen: 0, scale: 1.4 },
  darkelf: { name: 'Dark Elf', hp: 120, speed: 90, reward: 20, armor: 0, dodge: 0.18, regen: 0, scale: 1.1 },
  troll: { name: 'Troll', hp: 500, speed: 36, reward: 50, armor: 5, dodge: 0, regen: 10, scale: 1.8 },
};

const BOSS_DEFS = {
  dragon: { name: 'Ancient Dragon', hp: 7500, speed: 55, reward: 600, armor: 15, dodge: 0, regen: 0, scale: 2.8, immune: { slow: true, freeze: true }, desc: 'Immune to Slow & Freeze' },
  lichking: { name: 'Lich King', hp: 7500, speed: 50, reward: 500, armor: 5, dodge: 0.1, regen: 5, scale: 2.6, immune: { burn: true }, desc: 'Immune to Burn — summons minions' },
  demonlord: { name: 'Demon Lord', hp: 7000, speed: 60, reward: 500, armor: 10, dodge: 0.05, regen: 0, scale: 2.7, immune: { freeze: true }, speedBonus: 15, desc: 'Immune to Freeze — grows faster as HP drops' },
};

// Small canvas helpers used by the boss artwork.
function _fill(ctx,color){ctx.fillStyle=color;}
function _circ(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function _ellipse(ctx,x,y,rx,ry,rot=0){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx.fill();}
function _drawBoss(ctx, type, fr, ef, s) {
  if (type === 'dragon') _drawDragonBoss(ctx, fr, ef, s);
  if (type === 'lichking') _drawLichBoss(ctx, fr, ef, s);
  if (type === 'demonlord') _drawDemonBoss(ctx, fr, ef, s);
}

function _drawDragonBoss(ctx, fr, ef, s) {
  const wf = [0, 10, -5][fr] * s, hb = [0, -3, -3][fr] * s;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; _ellipse(ctx, 0, 5 * s, 24 * s, 8 * s);
  _fill(ctx, '#8b7320'); _ellipse(ctx, 0, -18 * s, 16 * s, 14 * s); // body
  ctx.fillStyle = '#c8a020';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { ctx.beginPath(); ctx.arc(-8 * s + c * 4 * s, (-20 + r * 5) * s, 2.5 * s, -Math.PI / 2, Math.PI / 2); ctx.fill(); }
  // wings
  _fill(ctx, '#6b5a10');
  ctx.beginPath(); ctx.moveTo(-8 * s, -22 * s); ctx.quadraticCurveTo(-35 * s, (-32 + wf / s) * s, -28 * s, -8 * s); ctx.quadraticCurveTo(-22 * s, -16 * s, -8 * s, -22 * s); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8 * s, -22 * s); ctx.quadraticCurveTo(35 * s, (-32 + wf / s) * s, 28 * s, -8 * s); ctx.quadraticCurveTo(22 * s, -16 * s, 8 * s, -22 * s); ctx.fill();
  // wing veins
  ctx.strokeStyle = '#aa8820'; ctx.lineWidth = s * 0.8;
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(-8 * s, -22 * s); ctx.lineTo((-8 - i * 6) * s, (-22 + wf / s * (i / 3) + i * 5) * s); ctx.stroke(); }
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(8 * s, -22 * s); ctx.lineTo((8 + i * 6) * s, (-22 + wf / s * (i / 3) + i * 5) * s); ctx.stroke(); }
  _fill(ctx, '#8b7320'); _ellipse(ctx, 0, (-30 + hb / s) * s, 8 * s, 10 * s); // neck
  _fill(ctx, '#a08828'); _ellipse(ctx, 6 * s, (-42 + hb / s) * s, 13 * s, 10 * s, Math.PI / 8); // head
  ctx.fillStyle = '#5a4810';
  ctx.beginPath(); ctx.moveTo(8 * s, (-50 + hb / s) * s); ctx.lineTo(5 * s, (-62 + hb / s) * s); ctx.lineTo(13 * s, (-53 + hb / s) * s); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14 * s, (-50 + hb / s) * s); ctx.lineTo(14 * s, (-63 + hb / s) * s); ctx.lineTo(20 * s, (-52 + hb / s) * s); ctx.fill();
  ctx.fillStyle = '#ffcc00'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffaa00';
  _circ(ctx, 12 * s, (-44 + hb / s) * s, 3.5 * s); ctx.shadowBlur = 0;
  ctx.fillStyle = '#331100'; _circ(ctx, 13 * s, (-44 + hb / s) * s, 1.5 * s);
}

function _drawLichBoss(ctx, fr, ef, s) {
  const fl = [0, -4, -4][fr] * s, rw = [0, 5, -5][fr] * s;
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; _ellipse(ctx, 0, 6 * s, 15 * s, 4.5 * s);
  // robe body
  _fill(ctx, '#1a0535');
  ctx.beginPath(); ctx.moveTo(-12 * s, (fl - 5) * s); ctx.lineTo(-12 * s + rw, (fl + 18) * s); ctx.lineTo(12 * s - rw, (fl + 18) * s); ctx.lineTo(12 * s, (fl - 5) * s); ctx.closePath(); ctx.fill();
  // robe fringe
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#1a0535' : '#3a0870'; const rx = -10 * s + i * 5 * s + rw * (i - 2) * 0.3; ctx.beginPath(); ctx.moveTo(rx, (fl + 18) * s); ctx.lineTo(rx - 3 * s, (fl + 25) * s); ctx.lineTo(rx + 4 * s, (fl + 25) * s); ctx.closePath(); ctx.fill(); }
  // phylactery orb
  ctx.fillStyle = '#8833cc'; ctx.shadowBlur = 15; ctx.shadowColor = '#aa44ff';
  _circ(ctx, -14 * s, (fl - 5) * s, 7 * s); ctx.shadowBlur = 0;
  ctx.fillStyle = '#cc88ff'; _circ(ctx, -14 * s, (fl - 7) * s, 3.5 * s);
  // ribcage stripes
  ctx.strokeStyle = '#9955cc'; ctx.lineWidth = 1.5 * s;
  for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.ellipse(0, (fl - 12 + r * 5) * s, 8 * s, 3 * s, 0, 0, Math.PI * 2); ctx.stroke(); }
  // crown
  ctx.fillStyle = '#220044'; ctx.fillRect(-10 * s, (fl - 37) * s, 20 * s, 9 * s);
  ctx.fillStyle = '#9933cc'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-8 * s + i * 4 * s, (fl - 37) * s); ctx.lineTo(-6 * s + i * 4 * s, (fl - 46) * s); ctx.lineTo(-4 * s + i * 4 * s, (fl - 37) * s); ctx.fill(); }
  // skull
  ctx.fillStyle = '#ddd8cc'; _circ(ctx, 0, (fl - 31) * s, 11 * s);
  ctx.fillStyle = '#110022'; _ellipse(ctx, -4 * s, (fl - 32) * s, 3.5 * s, 4.5 * s); _ellipse(ctx, 4 * s, (fl - 32) * s, 3.5 * s, 4.5 * s);
  ctx.fillStyle = '#cc44ff'; ctx.shadowBlur = 8; ctx.shadowColor = '#aa22ff';
  _circ(ctx, -4 * s, (fl - 32) * s, 2 * s); _circ(ctx, 4 * s, (fl - 32) * s, 2 * s); ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; for (let t = 0; t < 4; t++) ctx.fillRect(-5 * s + t * 3 * s, (fl - 22) * s, 2.2 * s, 3.5 * s);
}

function _drawDemonBoss(ctx, fr, ef, s) {
  const wf = [0, 10, -5][fr] * s, sw = [0, 4, -4][fr] * s, tw = [0, 6, -6][fr] * s;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; _ellipse(ctx, 0, 5 * s, 20 * s, 7 * s);
  // tail
  ctx.strokeStyle = '#880000'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5 * s, -8 * s); ctx.quadraticCurveTo((-20 - tw / s) * s, 5 * s, (-15 - tw / s) * s, 13 * s); ctx.stroke();
  // legs
  ctx.fillStyle = '#880000'; ctx.fillRect(-11 * s + sw, -2 * s, 9 * s, 12 * s); ctx.fillRect(2 * s - sw, -2 * s, 9 * s, 12 * s);
  ctx.fillStyle = '#220000'; ctx.fillRect(-12 * s + sw, 10 * s, 10 * s, 4 * s); ctx.fillRect(1 * s - sw, 10 * s, 10 * s, 4 * s);
  _fill(ctx, '#aa1111'); _ellipse(ctx, sw, -16 * s, 14 * s, 16 * s); // body
  ctx.fillStyle = '#cc2222'; _ellipse(ctx, -5 * s + sw, -18 * s, 5 * s, 6 * s, -0.2); _ellipse(ctx, 5 * s + sw, -18 * s, 5 * s, 6 * s, 0.2);
  ctx.fillStyle = '#991111'; _ellipse(ctx, -18 * s + sw, -14 * s, 5.5 * s, 11 * s, Math.PI / 6); _ellipse(ctx, 18 * s + sw, -14 * s, 5.5 * s, 11 * s, -Math.PI / 6);
  // bat wings
  _fill(ctx, '#660000');
  ctx.beginPath(); ctx.moveTo(-10 * s, -25 * s); ctx.quadraticCurveTo(-40 * s, (-35 + wf / s) * s, -32 * s, -10 * s); ctx.quadraticCurveTo(-25 * s, -20 * s, -10 * s, -25 * s); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10 * s, -25 * s); ctx.quadraticCurveTo(40 * s, (-35 + wf / s) * s, 32 * s, -10 * s); ctx.quadraticCurveTo(25 * s, -20 * s, 10 * s, -25 * s); ctx.fill();
  ctx.strokeStyle = '#440000'; ctx.lineWidth = s * 0.8;
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(-10 * s, -25 * s); ctx.lineTo((-10 - i * 7) * s, (-25 + wf / s * (i / 3) + i * 5) * s); ctx.stroke(); }
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(10 * s, -25 * s); ctx.lineTo((10 + i * 7) * s, (-25 + wf / s * (i / 3) + i * 5) * s); ctx.stroke(); }
  _fill(ctx, '#aa1111'); _ellipse(ctx, sw, -30 * s, 7 * s, 8 * s); // neck
  ctx.fillStyle = '#cc1515'; _circ(ctx, sw, -40 * s, 12 * s); // head
  // horns
  ctx.strokeStyle = '#660000'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8 * s + sw, -48 * s); ctx.quadraticCurveTo(-22 * s + sw, -57 * s, -18 * s + sw, -46 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8 * s + sw, -48 * s); ctx.quadraticCurveTo(22 * s + sw, -57 * s, 18 * s + sw, -46 * s); ctx.stroke();
  // eyes
  ctx.fillStyle = '#ff4400'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff2200';
  _circ(ctx, -4 * s + sw, -41 * s, 3.5 * s); _circ(ctx, 4 * s + sw, -41 * s, 3.5 * s); ctx.shadowBlur = 0;
  ctx.fillStyle = '#110000'; ctx.fillRect(-4.5 * s + sw, -44 * s, 1.5 * s, 6 * s); ctx.fillRect(3.5 * s + sw, -44 * s, 1.5 * s, 6 * s);
  if (ef.enraged) { ctx.globalAlpha = 0.4 + 0.3 * Math.sin(Date.now() * 0.015); ctx.fillStyle = '#ff4400'; _ellipse(ctx, 0, -20 * s, 18 * s, 25 * s); ctx.globalAlpha = 1; }
}


function drawMonster(c,m) {
  c.save();c.translate(m.x,m.y);
  if(m.isBoss) {
    _drawBoss(c,m.bossType,m.frame,{...m.effects,enraged:m.enraged},m.scale);
  } else {
    const s=m.scale,step=Math.sin(m.distTraveled*.16)*3,skin=m.type==='orc'?'#8f9970':m.type==='troll'?'#7f9161':'#9aa66e';
    const frozen=m.effects.freezeTimer>0;
    c.scale((m.facing||1)*s,s);
    artOval(c,1,3,11,4,'#152b274f');
    c.translate(0,-Math.abs(step)*.25);
    artLine(c,[[-4,-2],[-5+step,6],[-2+step,7]],'#453f2d',3);
    artLine(c,[[4,-2],[5-step,6],[8-step,7]],'#393c2e',3);
    if(m.type==='darkelf') {
      artPoly(c,[[-5,-22],[5,-22],[9,-2],[12,6],[0,3],[-10,6],[-7,-4]],frozen?'#709baf':'#675779','#293e3d');
      artPoly(c,[[-5,-22],[-8,-11],[0,-8],[7,-13],[5,-23],[0,-29]],frozen?'#88b7c9':'#514a6a');
      artPoly(c,[[-3,-20],[4,-20],[3,-14],[-2,-14]],'#c8b08c');
      artLine(c,[[-1,-18],[2,-18]],'#f0d189',1.3);
      artLine(c,[[0,-10],[1,2]],'#aa967c',1);
      c.strokeStyle='#bba477';c.lineWidth=1.4;c.beginPath();c.arc(9,-9,10,-1.3,1.3);c.stroke();artLine(c,[[12,-18],[8,-8],[12,0]],'#d5c9a4',.6);
    } else if(m.type==='troll') {
      artOval(c,0,-13,11,13,frozen?'#83acb6':skin);
      artOval(c,-8,-17,6,7,frozen?'#6094a5':'#698259');artOval(c,8,-18,6,8,frozen?'#659daa':'#829661');
      artPoly(c,[[-8,-6],[7,-6],[6,4],[-7,2]],'#756447');artLine(c,[[-7,-5],[7,-4]],'#cab58b',2);
      artOval(c,2,-27,8,8,frozen?'#9bc0c8':'#a0aa71');
      artPoly(c,[[-4,-22],[-3,-28],[1,-22],[5,-22],[8,-29],[8,-20]],'#d3c79e');
      artLine(c,[[-2,-28],[0,-28],[4,-28],[6,-28]],'#383c26',1.5);
      for(let k=0;k<4;k++)artOval(c,-7+k*4,-32,3,3,'#647c58');
      artLine(c,[[11,-13],[17,-3],[19,5]],'#806548',4);artPoly(c,[[15,-2],[20,-7],[25,4],[20,10]],'#715d41','#b09461');
    } else {
      const armored=m.type==='orc';
      artPoly(c,[[-7,-18],[6,-18],[8,-2],[-7,-2]],frozen?'#689eb1':armored?'#768b88':'#87704a','#394d38');
      if(armored) {
        artPoly(c,[[-7,-19],[1,-21],[8,-17],[6,-8],[0,-5],[-6,-10]],'#aab2a0','#5e7672');
        artOval(c,-9,-18,5,4,'#889a8c');artOval(c,8,-18,5,4,'#677e78');
        artPoly(c,[[-12,-12],[-6,-10],[-7,0],[-12,3],[-16,-2],[-16,-11]],'#876e49','#c3b17c');
        artLine(c,[[-12,-10],[-12,0]],'#d4bd7e',1.4);
      } else {artLine(c,[[-5,-17],[5,-6]],'#baa273',2);c.fillStyle='#c0a477';c.fillRect(-6,-5,13,2);}
      artOval(c,0,-25,6,7,frozen?'#9fc9d2':skin);
      if(armored) {
        artPoly(c,[[-7,-27],[-6,-32],[0,-35],[7,-30],[7,-26]],'#929f8b','#4c6560');
        artPoly(c,[[-3,-21],[-4,-25],[0,-21],[3,-21],[5,-25],[5,-20]],'#e1d6ad');
      } else {
        artPoly(c,[[-4,-27],[-12,-29],[-7,-22]],frozen?'#8ebbc6':'#9aaa74');
        artPoly(c,[[4,-27],[10,-30],[7,-23]],frozen?'#83abba':'#7e9667');
        artPoly(c,[[-7,-29],[0,-35],[7,-30]],'#6a7444');
      }
      artLine(c,[[-3,-26],[-1,-26],[2,-26],[4,-26]],'#303d2b',1.4);
      artLine(c,[[7,-15],[11,-9]],frozen?'#9ac2c7':skin,3);
      if(armored){artLine(c,[[12,-17],[14,3]],'#806747',2);artPoly(c,[[11,-19],[20,-23],[22,-15],[13,-12]],'#aeb9a7','#5b7067');}
      else{artPoly(c,[[10,-12],[13,-23],[15,-12],[12,-8]],'#b3bba1');artLine(c,[[10,-10],[15,-10]],'#b09962',2);}
    }
    if(m.hitTimer>0) {c.globalAlpha=m.hitTimer/300;artOval(c,0,-13,10,16,'#fff1c9');c.globalAlpha=1;}
    if(frozen) {artPoly(c,[[-12,5],[-13,-11],[-7,-24],[7,-26],[13,-9],[10,5]],'#aee4ee22','#b5e2e677');}
    if(m.effects.burnTimer>0){const time=G.visualTime;for(let k=0;k<3;k++){const yy=-4-((time/28+k*9)%23);artPoly(c,[[-7+k*6,yy],[-9+k*6,yy-6],[-6+k*6,yy-11],[-4+k*6,yy-3]],'#eda65b99');}}
    if(m.effects.slowTimer>0){c.strokeStyle='#bc99df99';c.lineWidth=1;c.beginPath();c.ellipse(0,3,13,5,0,0,Math.PI*2);c.stroke();}
  }
  c.restore();
}
function _drawHPBar(c,x,y,hp,maxHp,s,isBoss) {
  if(!isBoss&&hp>=maxHp)return;
  const w=isBoss?80:24*s,h=isBoss?5:3,above=isBoss?70*s:38*s;
  c.fillStyle='#11291ecc';c.fillRect(x-w/2-1,y-above-1,w+2,h+2);
  c.fillStyle=hp/maxHp>.35?'#b5c58c':'#e89c70';c.fillRect(x-w/2,y-above,w*Math.max(0,hp/maxHp),h);
}
function drawProjectile(c,p) {
  const def=TOWER_DEFS[p.towerType];if(!def)return;
  const target=G.monsters.find(m=>m.id===p.targetId),a=target?Math.atan2(target.y-p.y,target.x-p.x):0;
  c.save();c.translate(p.x,p.y-9);c.rotate(a);
  if(p.towerType==='archer') {
    artLine(c,[[-11,0],[3,0]],'#c6b58c',1.3);artPoly(c,[[3,-2],[8,0],[3,2]],'#e7ddbd');artLine(c,[[-9,-3],[-6,0],[-9,3]],'#e8d8ae',1);
  } else if(p.towerType==='cannon') {
    artOval(c,0,0,4.5,4.5,'#34423d');artOval(c,-1,-2,2,1.5,'#93a397');
  } else if(p.towerType==='ice') {
    artPoly(c,[[-8,-2],[1,-3],[8,0],[1,3],[-8,2]],'#c4e2dc');artLine(c,[[-16,0],[-8,0]],'#adddd277',2);
  } else {
    const color=p.towerType==='dragon'?'#eea763':'#c6aaee';
    const g=c.createRadialGradient(0,0,0,0,0,11);g.addColorStop(0,color);g.addColorStop(.3,color+'bb');g.addColorStop(1,color+'00');artOval(c,0,0,11,11,g);
    artPoly(c,[[-19,-2],[-5,-4],[2,0],[-5,4],[-14,2]],color+'66');
  }
  c.restore();
}
function drawParticle(c,p) {c.save();c.globalAlpha=Math.max(0,p.alpha);artOval(c,p.x,p.y,p.r,p.r*.7,p.color);c.restore();}
