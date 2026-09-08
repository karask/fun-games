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
    if(m.hitTimer>0&&!G.reducedMotion) {c.globalAlpha=m.hitTimer/300;artOval(c,0,-13,10,16,'#fff1c9');c.globalAlpha=1;}
    if(frozen) {artPoly(c,[[-12,5],[-13,-11],[-7,-24],[7,-26],[13,-9],[10,5]],'#aee4ee22','#b5e2e677');}
    if(m.effects.burnTimer>0){const time=G.visualTime;for(let k=0;k<3;k++){const yy=-4-((time/28+k*9)%23);artPoly(c,[[-7+k*6,yy],[-9+k*6,yy-6],[-6+k*6,yy-11],[-4+k*6,yy-3]],'#eda65b99');}}
    if(m.effects.slowTimer>0){c.strokeStyle='#bc99df99';c.lineWidth=1;c.beginPath();c.ellipse(0,3,13,5,0,0,Math.PI*2);c.stroke();}
  }
  c.restore();
}
function _drawHPBar(c,x,y,hp,maxHp,s,isBoss) {
  if(isBoss||hp>=maxHp)return;
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

// Boss silhouettes use the same faceted materials as the towers and scenery.
function _drawBoss(c,type,frame,effects,scale) {
  c.save();c.scale(scale*.78,scale*.78);
  const sway=[0,-1.5,1.5][frame];
  artOval(c,2,5,23,7,'#11281e66');
  if(type==='dragon') {
    // Tail and bat-like wings behind the body.
    artPoly(c,[[-8,-9],[-27,3],[-36,1],[-25,8],[-12,5],[1,-3]],'#687145','#9a9a60');
    for(const side of [-1,1]) {
      c.save();c.scale(side,1);
      artPoly(c,[[5,-23],[31,-40+sway],[40,-14],[30,-22],[25,-7],[16,-16],[9,-6]],'#62633e','#aca174');
      artPoly(c,[[5,-23],[31,-40+sway],[23,-20],[25,-7]],'#8e8950');
      artLine(c,[[5,-23],[31,-40+sway],[25,-7]],'#c4b280',1);
      c.restore();
    }
    artPoly(c,[[-12,-20],[-6,-33],[9,-29],[15,-13],[9,1],[-9,2],[-15,-8]],'#9e9756','#59623f');
    artPoly(c,[[0,-29],[9,-29],[15,-13],[9,1],[1,-3]],'#b6a76a');
    for(let j=0;j<4;j++)artLine(c,[[1,-22+j*5],[9,-21+j*5],[12,-23+j*5]],'#6d754755',1);
    for(const side of [-1,1]) {
      artPoly(c,[[side*9,-9],[side*16,-1],[side*18,7],[side*8,6],[side*5,-1]],'#7d824d');
      artPoly(c,[[side*12,5],[side*19,7],[side*15,3]],'#e0d3a0');
    }
    c.translate(0,sway);
    artPoly(c,[[2,-20],[-1,-37],[6,-44],[14,-32],[12,-18]],'#a9a063');
    artPoly(c,[[0,-39],[7,-50],[18,-47],[24,-37],[18,-30],[6,-32]],'#b1a66a','#667047');
    artPoly(c,[[14,-39],[28,-36],[29,-29],[19,-27],[10,-32]],'#a39860');
    artLine(c,[[19,-31],[28,-32]],'#4a5638',1.4);
    artPoly(c,[[20,-31],[22,-27],[23,-31]],'#ddd0a0');
    artPoly(c,[[3,-45],[-2,-56],[7,-48],[12,-48],[17,-57],[17,-44]],'#d5cba2');
    artPoly(c,[[12,-41],[19,-41],[16,-38]],'#f0d786');artOval(c,16,-40,1,1.5,'#343d25');
    for(let j=0;j<4;j++)artPoly(c,[[-7,-29+j*6],[-13,-28+j*6],[-8,-23+j*6]],'#d2bb7d');
  } else if(type==='lichking') {
    c.translate(0,sway-3);
    artPoly(c,[[-9,-30],[-18,-19],[-20,13],[-11,9],[-4,15],[3,9],[13,13],[17,3],[14,-24]],'#494764','#252f39');
    artPoly(c,[[-9,-30],[-15,-18],[-10,8],[-4,15],[0,-19]],'#70617a');
    artPoly(c,[[0,-22],[11,-27],[14,8],[3,9]],'#393e56');
    artLine(c,[[-9,-26],[-7,-9],[-10,7],[-4,10]],'#b5a178',1.2);
    artLine(c,[[7,-23],[9,-6],[11,9]],'#968665',1.2);
    for(let j=0;j<3;j++)artPoly(c,[[-4,-18+j*5],[4,-18+j*5],[5,-16+j*5],[0,-14+j*5],[-5,-16+j*5]],'#a69c9e');
    artPoly(c,[[-9,-31],[-9,-43],[-4,-49],[6,-47],[11,-40],[8,-30],[1,-27]],'#484d60');
    artPoly(c,[[-5,-41],[5,-42],[8,-36],[5,-28],[-3,-29],[-7,-36]],'#cbc4ae');
    artPoly(c,[[-6,-37],[-1,-37],[-2,-33],[-5,-34]],'#4f4462');
    artPoly(c,[[2,-37],[7,-38],[5,-34],[2,-33]],'#4f4462');
    artLine(c,[[-5,-36],[-2,-35]],'#c8a5e5',1.5);artLine(c,[[3,-36],[6,-36]],'#c8a5e5',1.5);
    artPoly(c,[[0,-33],[-2,-30],[2,-30]],'#665d69');
    for(let j=0;j<3;j++)artLine(c,[[-3+j*3,-29],[-3+j*3,-26]],'#aaa08e',1.4);
    artPoly(c,[[-10,-44],[-12,-52],[-5,-47],[-1,-56],[3,-47],[10,-53],[9,-43]],'#867c8b','#afa390');
    artPoly(c,[[-1,-51],[2,-47],[-1,-44],[-3,-47]],'#ba9acf');
    artLine(c,[[17,10],[17,-38],[22,-43]],'#b0a17c',2);
    artPoly(c,[[22,-51],[27,-43],[22,-37],[18,-43]],'#c5a4df','#9185aa');
    artOval(c,16,-14,3,2,'#c1bba5');
    artPoly(c,[[-15,-13],[-20,-10],[-17,-4],[-12,-7]],'#c6bca5');
    const glow=c.createRadialGradient(-20,-12,1,-20,-12,10);glow.addColorStop(0,'#c8a4ea88');glow.addColorStop(1,'#c8a4ea00');artOval(c,-20,-12,10,10,glow);
  } else {
    for(const side of [-1,1]) {
      c.save();c.scale(side,1);
      artPoly(c,[[9,-27],[31,-41+sway],[39,-16],[30,-23],[23,-11],[15,-19],[9,-10]],'#694b43','#a07559');
      artPoly(c,[[9,-27],[31,-41+sway],[24,-24],[23,-11]],'#8c5745');
      artLine(c,[[9,-27],[31,-41+sway],[23,-11]],'#bd8660',.8);
      c.restore();
    }
    artPoly(c,[[-11,-4],[-15,6],[-10,11],[-3,9],[-3,-5]],'#744b3c');
    artPoly(c,[[5,-6],[5,7],[14,10],[17,6],[12,-4]],'#935d44');
    artPoly(c,[[-15,6],[-10,5],[-3,9],[-15,10]],'#364338');artPoly(c,[[5,7],[14,5],[17,9],[7,10]],'#364338');
    artPoly(c,[[-13,-28],[0,-33],[14,-25],[11,-5],[1,1],[-12,-5]],'#995f47','#634a3b');
    artPoly(c,[[-12,-27],[-4,-29],[0,-20],[-7,-15],[-13,-20]],'#62675a','#9a9678');
    artPoly(c,[[2,-29],[13,-25],[12,-17],[5,-16],[0,-21]],'#7d7b62','#b2a280');
    for(let j=0;j<3;j++)artLine(c,[[-6,-12+j*4],[0,-10+j*4],[6,-13+j*4]],effects.enraged?'#ebb277':'#b98054',1.6);
    for(const side of [-1,1]) {
      artPoly(c,[[side*12,-25],[side*21,-19],[side*23,-5],[side*17,-2],[side*13,-12]],'#966149');
      artPoly(c,[[side*11,-27],[side*21,-25],[side*24,-19],[side*15,-19]],'#7c7961','#b6a584');
      artPoly(c,[[side*17,-5],[side*25,-6],[side*24,1],[side*19,3]],'#a57251');
    }
    c.translate(0,sway);
    artPoly(c,[[-8,-32],[-8,-43],[0,-48],[10,-42],[9,-33],[2,-27]],'#b27852','#80563f');
    artPoly(c,[[-8,-41],[-15,-51],[-17,-45],[-14,-54],[-8,-52],[-4,-44]],'#d4c19a');
    artPoly(c,[[6,-44],[13,-53],[20,-54],[15,-48],[13,-42],[9,-39]],'#b9ad8c');
    artPoly(c,[[-6,-38],[-1,-37],[-3,-34]],'#edd28a');artPoly(c,[[3,-37],[8,-38],[7,-34]],'#edd28a');
    artPoly(c,[[-1,-33],[6,-33],[4,-28],[1,-30]],'#674638');
    artPoly(c,[[0,-32],[2,-29],[3,-32]],'#d9c69c');
  }
  c.restore();
}
