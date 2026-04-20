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
    desc: 'Slows enemies on hit.',
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
    desc: 'Freezes enemies solid.',
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
  dragon: { name: 'Ancient Dragon', hp: 4500, speed: 55, reward: 200, armor: 15, dodge: 0, regen: 0, scale: 2.8, immune: { slow: true, freeze: true }, desc: 'Immune to Slow & Freeze' },
  lichking: { name: 'Lich King', hp: 4500, speed: 50, reward: 200, armor: 5, dodge: 0.1, regen: 5, scale: 2.6, immune: { burn: true }, desc: 'Immune to Burn — summons minions' },
  demonlord: { name: 'Demon Lord', hp: 4000, speed: 60, reward: 200, armor: 10, dodge: 0.05, regen: 0, scale: 2.7, immune: { freeze: true }, desc: 'Immune to Freeze — enrages when hurt' },
};

// ── Drawing helpers ────────────────────────────────────────────────────────
function _fill(ctx, color) { ctx.fillStyle = color; }
function _circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function _ellipse(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); ctx.fill(); }
// Tile scale factor relative to the base 48px tile width
function scaleT() { return (typeof DTW !== 'undefined' ? DTW : 48) / 48; }

// ── Isometric box (placed on tile whose bounding-box top-left is bx,by) ──
function drawIsoBox(ctx, bx, by, h, top, left, right) {
  // Use dynamic tile half-widths from renderer.js (DHW/DHH/DTW/DTH)
  const hw = typeof DHW !== 'undefined' ? DHW : HALF_W;
  const hh = typeof DHH !== 'undefined' ? DHH : HALF_H;
  const tw = typeof DTW !== 'undefined' ? DTW : TW;
  const th = typeof DTH !== 'undefined' ? DTH : TH;

  // left face
  ctx.fillStyle = left;
  ctx.beginPath();
  ctx.moveTo(bx, by + hh - h);
  ctx.lineTo(bx + hw, by + th - h);
  ctx.lineTo(bx + hw, by + th);
  ctx.lineTo(bx, by + hh);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.6; ctx.stroke();

  // right face
  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(bx + hw, by + th - h);
  ctx.lineTo(bx + tw, by + hh - h);
  ctx.lineTo(bx + tw, by + hh);
  ctx.lineTo(bx + hw, by + th);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // top face
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(bx + hw, by - h);
  ctx.lineTo(bx + tw, by + hh - h);
  ctx.lineTo(bx + hw, by + th - h);
  ctx.lineTo(bx, by + hh - h);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}


// ── Tower draw dispatcher ──────────────────────────────────────────────────
function drawTower(ctx, bx, by, type, lvl) {
  const sc = scaleT();
  const baseH = ([26, 32, 28, 34, 40][TOWER_ORDER.indexOf(type)] + lvl * 8) * sc;
  ctx.lineWidth = 0.6;
  switch (type) {
    case 'archer': _drawArcher(ctx, bx, by, baseH, lvl, sc); break;
    case 'magic': _drawMagic(ctx, bx, by, baseH, lvl, sc); break;
    case 'cannon': _drawCannon(ctx, bx, by, baseH, lvl, sc); break;
    case 'ice': _drawIce(ctx, bx, by, baseH, lvl, sc); break;
    case 'dragon': _drawDragon(ctx, bx, by, baseH, lvl, sc); break;
  }
}

function _drawArcher(ctx, bx, by, h, lvl, sc = 1) {
  const hw = typeof DHW !== 'undefined' ? DHW : HALF_W, tw = typeof DTW !== 'undefined' ? DTW : TW;
  drawIsoBox(ctx, bx, by, h, '#9e9e9e', '#6e6e6e', '#565656');
  const topY = by - h, cx = bx + hw;
  ctx.fillStyle = '#888';
  for (let i = 0; i < 3; i++) ctx.fillRect(bx + 5 * sc + i * 14 * sc, topY - 7 * sc, 9 * sc, 7 * sc);
  ctx.fillStyle = '#222'; ctx.fillRect(bx + hw + 4 * sc, by + (typeof DHH !== 'undefined' ? DHH : HALF_H) - h * 0.55, 5 * sc, 9 * sc);
  ctx.fillStyle = '#7a4a1a'; _circ(ctx, cx, topY - 5 * sc, 3.5 * sc);
  ctx.fillRect(cx - 1.5 * sc, topY - 2 * sc, 3 * sc, 7 * sc);
  if (lvl >= 1) { ctx.fillStyle = '#c0a060'; ctx.fillRect(bx + 2 * sc, topY, 4 * sc, 4 * sc); ctx.fillRect(bx + tw - 6 * sc, topY, 4 * sc, 4 * sc); }
}

function _drawMagic(ctx, bx, by, h, lvl, sc = 1) {
  const hw = typeof DHW !== 'undefined' ? DHW : HALF_W;
  drawIsoBox(ctx, bx, by, h, '#7b2d8b', '#5b1f6b', '#4a1660');
  const topY = by - h, cx = bx + hw;
  const r1 = 8 * sc, r2 = 4 * sc, pts = 5;
  ctx.fillStyle = lvl >= 1 ? '#e088ff' : '#cc44ff';
  ctx.shadowBlur = 12; ctx.shadowColor = '#cc44ff';
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2, a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    i === 0 ? ctx.moveTo(cx + r * Math.cos(a), topY - 2 * sc + r * Math.sin(a)) : ctx.lineTo(cx + r * Math.cos(a), topY - 2 * sc + r * Math.sin(a));
  }
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(204,68,255,0.4)'; ctx.fillRect(bx + hw + 4 * sc, by + (typeof DHH !== 'undefined' ? DHH : HALF_H) - h * 0.65, 8 * sc, 10 * sc);
}

function _drawCannon(ctx, bx, by, h, lvl, sc = 1) {
  const hw = typeof DHW !== 'undefined' ? DHW : HALF_W, hh = typeof DHH !== 'undefined' ? DHH : HALF_H;
  drawIsoBox(ctx, bx, by, h, '#555', '#333', '#282828');
  const topY = by - h, cx = bx + hw;
  ctx.fillStyle = '#777';[[-9, 0], [9, 0], [0, -9], [0, 9]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx + dx * sc, topY + dy * sc, 2.5 * sc, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#111'; ctx.fillRect(bx + hw + 2 * sc, by + hh - h * 0.52 - 2 * sc, (typeof DTW !== 'undefined' ? DTW : TW) / 2, 6 * sc);
  ctx.fillStyle = '#222'; _ellipse(ctx, bx + (typeof DTW !== 'undefined' ? DTW : TW) - 4 * sc, by + hh - h * 0.52 + 1 * sc, 6 * sc, 3 * sc, Math.PI / 8);
  if (lvl >= 2) { ctx.fillStyle = '#111'; ctx.fillRect(bx + hw + 2 * sc, by + hh - h * 0.52 + 6 * sc, (typeof DTW !== 'undefined' ? DTW : TW) / 2, 5 * sc); }
}

function _drawIce(ctx, bx, by, h, lvl, sc = 1) {
  const hw = typeof DHW !== 'undefined' ? DHW : HALF_W, hh = typeof DHH !== 'undefined' ? DHH : HALF_H;
  drawIsoBox(ctx, bx, by, h, '#a8d8ea', '#68a8c0', '#4e90b0');
  const topY = by - h, cx = bx + hw;
  const count = lvl >= 1 ? 4 : 3;
  for (let i = 0; i < count; i++) {
    const ix = cx - ((count - 1) * 4 * sc) + i * 8 * sc, len = (10 + i % 2 * 5) * sc;
    ctx.fillStyle = '#cceeff';
    ctx.beginPath(); ctx.moveTo(ix - 2 * sc, topY); ctx.lineTo(ix + 2 * sc, topY); ctx.lineTo(ix, topY - len); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.moveTo(ix - 1 * sc, topY); ctx.lineTo(ix, topY); ctx.lineTo(ix, topY - len + 3 * sc); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(136,221,255,0.4)'; ctx.fillRect(bx + hw + 4 * sc, by + hh - h * 0.6, 8 * sc, 12 * sc);
}

function _drawDragon(ctx, bx, by, h, lvl, sc = 1) {
  const hw = typeof DHW !== 'undefined' ? DHW : HALF_W;
  drawIsoBox(ctx, bx, by, h, '#6b1515', '#4a0e0e', '#3d0808');
  const topY = by - h, cx = bx + hw;
  ctx.strokeStyle = '#cc3300'; ctx.lineWidth = 3 * sc;
  ctx.beginPath(); ctx.moveTo(cx - 12 * sc, topY); ctx.lineTo(cx + 12 * sc, topY); ctx.stroke();
  ctx.lineWidth = 2 * sc;
  ctx.beginPath(); ctx.moveTo(cx - 7 * sc, topY); ctx.lineTo(cx - 7 * sc, topY - 10 * sc); ctx.moveTo(cx + 7 * sc, topY); ctx.lineTo(cx + 7 * sc, topY - 10 * sc); ctx.stroke();
  ctx.fillStyle = '#cc3300'; _circ(ctx, cx, topY - 13 * sc, 6 * sc);
  ctx.beginPath(); ctx.moveTo(cx, topY - 11 * sc); ctx.quadraticCurveTo(cx - 18 * sc, topY - 22 * sc, cx - 13 * sc, topY - 5 * sc); ctx.quadraticCurveTo(cx - 8 * sc, topY - 13 * sc, cx, topY - 11 * sc); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, topY - 11 * sc); ctx.quadraticCurveTo(cx + 18 * sc, topY - 22 * sc, cx + 13 * sc, topY - 5 * sc); ctx.quadraticCurveTo(cx + 8 * sc, topY - 13 * sc, cx, topY - 11 * sc); ctx.fill();
  if (lvl >= 1) { ctx.shadowBlur = 12; ctx.shadowColor = '#ff6600'; ctx.fillStyle = '#ff4400'; _circ(ctx, cx, topY - 13 * sc, 3.5 * sc); ctx.shadowBlur = 0; }
}


// ── Monster drawing ────────────────────────────────────────────────────────
function drawMonster(ctx, monster) {
  const { x, y, type, isBoss, bossType, frame, effects, hp, maxHp, scale: s } = monster;
  ctx.save(); ctx.translate(x, y);
  if (isBoss) _drawBoss(ctx, bossType, frame, effects, s);
  else {
    switch (type) {
      case 'goblin': _drawGoblin(ctx, frame, effects, s); break;
      case 'orc': _drawOrc(ctx, frame, effects, s); break;
      case 'darkelf': _drawDarkElf(ctx, frame, effects, s); break;
      case 'troll': _drawTroll(ctx, frame, effects, s); break;
    }
  }
  ctx.restore();
  _drawHPBar(ctx, x, y, hp, maxHp, s, isBoss);
}

function _frozeColor(base, freeze) { return freeze > 0 ? '#aaddff' : base; }
function _burnAura(ctx, freeze, burn, rx, ry) {
  if (freeze > 0 || burn <= 0) return;
  ctx.globalAlpha = 0.45 + 0.2 * Math.sin(Date.now() * 0.012);
  ctx.fillStyle = '#ff7700';
  _ellipse(ctx, 0, 0, rx, ry); ctx.globalAlpha = 1;
}
function _slowAura(ctx, slow) {
  if (slow <= 0) return;
  ctx.globalAlpha = 0.28; ctx.fillStyle = '#4488ff';
  _ellipse(ctx, 0, 0, 12, 15); ctx.globalAlpha = 1;
}

function _drawGoblin(ctx, fr, ef, s) {
  const ls = [0, 3, -3][fr] * s, bb = [0, -1, -1][fr] * s, frz = ef.freezeTimer > 0, brn = ef.burnTimer > 0;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; _ellipse(ctx, 0, 2 * s, 8 * s, 3 * s);
  // legs
  ctx.fillStyle = frz ? '#5588bb' : '#1a5c2a';
  ctx.fillRect(-6 * s + ls, (-2 + bb / s) * s, 4 * s, 7 * s); ctx.fillRect(2 * s - ls, (-2 + bb / s) * s, 4 * s, 7 * s);
  // boots
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-7 * s + ls, 5 * s, 5 * s, 3 * s); ctx.fillRect(1 * s - ls, 5 * s, 5 * s, 3 * s);
  // body
  _fill(ctx, frz ? '#7bb8e0' : brn ? '#bb4400' : '#2ea04d'); _ellipse(ctx, 0, -9 * s, 7 * s, 9 * s);
  // head
  _fill(ctx, frz ? '#9bd4f0' : '#3dba5a'); _circ(ctx, 0, -20 * s, 6 * s);
  // ears
  _fill(ctx, frz ? '#9bd4f0' : '#3dba5a');
  ctx.beginPath(); ctx.moveTo(-6 * s, -23 * s); ctx.lineTo(-10 * s, -18 * s); ctx.lineTo(-3 * s, -20 * s); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6 * s, -23 * s); ctx.lineTo(10 * s, -18 * s); ctx.lineTo(3 * s, -20 * s); ctx.closePath(); ctx.fill();
  // eyes
  _fill(ctx, frz ? '#aaccff' : '#ff2200'); ctx.fillRect(-4 * s, -22 * s, 2 * s, 2 * s); ctx.fillRect(2 * s, -22 * s, 2 * s, 2 * s);
  _burnAura(ctx, ef.freezeTimer, ef.burnTimer, 8 * s, 12 * s); _slowAura(ctx, ef.slowTimer);
}

function _drawOrc(ctx, fr, ef, s) {
  const ls = [0, 4, -4][fr] * s, bl = [0, -2, 2][fr] * s, frz = ef.freezeTimer > 0, brn = ef.burnTimer > 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; _ellipse(ctx, 0, 2 * s, 13 * s, 4 * s);
  ctx.fillStyle = frz ? '#3366aa' : '#3a5266';
  ctx.fillRect(-9 * s + ls, -2 * s, 7 * s, 9 * s); ctx.fillRect(2 * s - ls, -2 * s, 7 * s, 9 * s);
  ctx.fillStyle = '#555'; ctx.fillRect(-10 * s + ls, 7 * s, 8 * s, 4 * s); ctx.fillRect(1 * s - ls, 7 * s, 8 * s, 4 * s);
  _fill(ctx, frz ? '#6699bb' : brn ? '#aa4400' : '#557799'); _ellipse(ctx, bl, -13 * s, 11 * s, 12 * s);
  ctx.fillStyle = '#8899aa'; ctx.fillRect(-8 * s + bl, -16 * s, 16 * s, 5 * s); // armor
  ctx.fillStyle = '#4a6688'; ctx.fillRect(-16 * s + bl, -15 * s, 6 * s, 11 * s); ctx.fillRect(10 * s + bl, -15 * s, 6 * s, 11 * s); // arms
  _fill(ctx, frz ? '#7799cc' : '#4a6680'); _circ(ctx, bl, -26 * s, 9 * s); // head
  ctx.fillStyle = '#f0e8c0'; ctx.fillRect(-6 * s + bl, -20 * s, 3 * s, 6 * s); ctx.fillRect(3 * s + bl, -20 * s, 3 * s, 6 * s); // tusks
  _fill(ctx, '#ff2200'); ctx.fillRect(-4 * s + bl, -28 * s, 2 * s, 2 * s); ctx.fillRect(2 * s + bl, -28 * s, 2 * s, 2 * s);
  _burnAura(ctx, ef.freezeTimer, ef.burnTimer, 12 * s, 16 * s); _slowAura(ctx, ef.slowTimer);
}

function _drawDarkElf(ctx, fr, ef, s) {
  const sw = [0, 3, -3][fr] * s, gd = [0, -1, -1][fr] * s, frz = ef.freezeTimer > 0, brn = ef.burnTimer > 0;
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; _ellipse(ctx, 0, gd + 2 * s, 7 * s, 2.5 * s);
  // cloak
  _fill(ctx, frz ? '#334455' : '#2a0a4a');
  ctx.beginPath(); ctx.moveTo(-8 * s + sw, gd - 2 * s); ctx.lineTo(8 * s + sw, gd - 2 * s); ctx.lineTo(10 * s + sw, gd + 9 * s); ctx.lineTo(-10 * s + sw, gd + 9 * s); ctx.closePath(); ctx.fill();
  // robe body
  _fill(ctx, frz ? '#557788' : brn ? '#881122' : '#5a1a8a'); _ellipse(ctx, sw, gd - 10 * s, 6 * s, 11 * s);
  // hood
  _fill(ctx, frz ? '#334455' : '#1a0535');
  ctx.beginPath(); ctx.arc(sw, gd - 22 * s, 7 * s, -Math.PI, 0); ctx.fill();
  _fill(ctx, frz ? '#8899bb' : '#d0a0d8'); _circ(ctx, sw, gd - 22 * s, 5 * s); // face
  // hood tip
  ctx.fillStyle = frz ? '#334455' : '#1a0535';
  ctx.beginPath(); ctx.moveTo(sw - 5 * s, gd - 26 * s); ctx.lineTo(sw + 5 * s, gd - 26 * s); ctx.lineTo(sw, gd - 34 * s); ctx.closePath(); ctx.fill();
  // eyes
  ctx.fillStyle = frz ? '#aabbcc' : '#ffe000'; _circ(ctx, sw - 2.5 * s, gd - 23 * s, 1.8 * s); _circ(ctx, sw + 2.5 * s, gd - 23 * s, 1.8 * s);
  _burnAura(ctx, ef.freezeTimer, ef.burnTimer, 7 * s, 12 * s); _slowAura(ctx, ef.slowTimer);
}

function _drawTroll(ctx, fr, ef, s) {
  const ls = [0, 5, -5][fr] * s, sb = [0, -3, 3][fr] * s, frz = ef.freezeTimer > 0, brn = ef.burnTimer > 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; _ellipse(ctx, 0, 3 * s, 16 * s, 5 * s);
  ctx.fillStyle = frz ? '#336655' : '#3a5a20';
  ctx.fillRect(-13 * s + ls, -1 * s, 10 * s, 10 * s); ctx.fillRect(3 * s - ls, -1 * s, 10 * s, 10 * s);
  ctx.fillStyle = '#2a3f18'; ctx.fillRect(-14 * s + ls, 9 * s, 12 * s, 5 * s); ctx.fillRect(2 * s - ls, 9 * s, 12 * s, 5 * s);
  _fill(ctx, frz ? '#559977' : brn ? '#7a6520' : '#5a7a32'); _ellipse(ctx, 0, (-15 + sb / s) * s, 14 * s, 14 * s);
  ctx.fillStyle = '#4a6828'; _ellipse(ctx, -17 * s + sb * 0.5, -10 * s, 5 * s, 10 * s, Math.PI / 5); _ellipse(ctx, 17 * s - sb * 0.5, -10 * s, 5 * s, 10 * s, -Math.PI / 5);
  ctx.fillStyle = '#3d5820'; _ellipse(ctx, -18 * s, -3 * s, 5 * s, 4 * s); _ellipse(ctx, 18 * s, -3 * s, 5 * s, 4 * s);
  _fill(ctx, frz ? '#77aa88' : '#6a8a40'); _circ(ctx, 0, (-28 + sb / s) * s, 10 * s);
  ctx.fillStyle = frz ? '#559977' : '#5a7a32';
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 4 * s, (-36 + sb / s) * s, 3 * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#ffaa00'; _circ(ctx, -3 * s, (-29 + sb / s) * s, 2.5 * s); _circ(ctx, 3 * s, (-29 + sb / s) * s, 2.5 * s);
  if (ef.burnTimer > 0 && ef.freezeTimer <= 0) { ctx.globalAlpha = 0.4 + 0.2 * Math.sin(Date.now() * 0.01); ctx.fillStyle = '#ff8800'; _ellipse(ctx, 0, -16 * s, 16 * s, 18 * s); ctx.globalAlpha = 1; }
  _slowAura(ctx, ef.slowTimer);
}

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

// HP bar
function _drawHPBar(ctx, x, y, hp, maxHp, s, isBoss) {
  const bw = isBoss ? 64 : Math.max(24, 28 * s), bh = isBoss ? 7 : 4, above = isBoss ? 72 : 28 * s;
  const bx = x - bw / 2, by = y - above, pct = Math.max(0, hp / maxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = pct > 0.6 ? '#33ee55' : pct > 0.3 ? '#eeaa22' : '#ee3322';
  ctx.fillRect(bx, by, bw * pct, bh);
  if (isBoss) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh); }
}

// Projectile drawing
function drawProjectile(ctx, proj) {
  const def = TOWER_DEFS[proj.towerType];
  if (!def) return;
  ctx.save();
  ctx.shadowBlur = 6; ctx.shadowColor = def.projectileColor; ctx.fillStyle = def.projectileColor;
  _circ(ctx, proj.x, proj.y, def.projectileSize);
  if (proj.towerType === 'cannon') { ctx.fillStyle = '#ffcc00'; _circ(ctx, proj.x - 1, proj.y - 1, 2); }
  ctx.shadowBlur = 0; ctx.restore();
}

// Particle drawing
function drawParticle(ctx, p) {
  ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; _circ(ctx, p.x, p.y, p.r); ctx.globalAlpha = 1;
}
