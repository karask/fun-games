// ── UI helpers ────────────────────────────────────────────────────────────

// ── Inline highscore helpers (no ES-module import needed in iframe) ────
const HS_KEY = 'fun_games_towerdefense_highscores';
const HS_MAX = 5;
function _hsGet() {
  try { return JSON.parse(localStorage.getItem(HS_KEY)) || []; } catch(e) { return []; }
}
function _hsSave(name, score) {
  const scores = _hsGet();
  scores.push({ name: name.toUpperCase().substring(0,3), score });
  scores.sort((a,b)=>b.score-a.score);
  localStorage.setItem(HS_KEY, JSON.stringify(scores.slice(0, HS_MAX)));
}
function _hsIsTop(score) {
  if(score<=0) return false;
  const s=_hsGet();
  return s.length < HS_MAX || score > s[s.length-1].score;
}
function _hsHTML() {
  const scores = _hsGet();
  if(!scores.length) return '<div class="hs-empty">No scores yet — be the first!</div>';
  return scores.map((e,i)=>`
    <div class="hs-row ${i===0?'gold':''}">
      <span class="hs-rank">#${i+1}</span>
      <span class="hs-name">${e.name}</span>
      <span class="hs-score">${e.score.toLocaleString()}</span>
    </div>`).join('');
}

function initUI() {
  buildShop();
  document.getElementById('btn-wave').addEventListener('click', onStartWave);
  document.getElementById('btn-speed').addEventListener('click', onToggleSpeed);
}

function buildShop() {
  const container = document.getElementById('tower-buttons');
  container.innerHTML = '';
  TOWER_ORDER.forEach(type => {
    const def = TOWER_DEFS[type];
    const btn = document.createElement('button');
    btn.className = 'shop-btn';
    btn.id = 'shop-' + type;
    btn.dataset.type = type;
    btn.innerHTML = `<span class="shop-icon">${def.icon}</span><span class="shop-name">${def.name}</span><span class="shop-cost">💰${def.levels[0].cost}</span>`;
    btn.title = def.desc;
    btn.addEventListener('click', () => selectTowerType(type));
    container.appendChild(btn);
  });
}

function updateHUD() {
  if(!G) return;
  const lvl = LEVELS[G.levelIdx];
  document.getElementById('hud-lives').textContent  = G.lives;
  document.getElementById('hud-gold').textContent   = G.gold;
  document.getElementById('hud-wave').textContent   = `${G.waveIdx+1}/${lvl.waves.length}`;
  document.getElementById('hud-level').textContent  = `Lv ${G.levelIdx+1}: ${lvl.name}`;
  document.getElementById('btn-wave').disabled = (G.phase !== 'build') || G.waveIdx >= lvl.waves.length;
  document.getElementById('btn-wave').textContent   = G.waveIdx===0 ? '▶ Start' : '▶ Next Wave';
  document.getElementById('btn-speed').textContent  = G.speed===1 ? '⏩ 2×' : '⏩ 1×';
  updateShop();
}

function updateShop() {
  if(!G) return;
  TOWER_ORDER.forEach(type => {
    const def  = TOWER_DEFS[type];
    const cost = def.levels[0].cost;
    const btn  = document.getElementById('shop-'+type);
    if(!btn) return;
    btn.classList.toggle('active',   G.selectedTowerType===type);
    btn.classList.toggle('disabled', G.gold < cost);
    btn.querySelector('.shop-cost').textContent = '💰'+cost;
  });
  renderTowerInfo();
}

function renderTowerInfo() {
  const panel = document.getElementById('tower-info');
  if(!panel) return;

  if(G && G.inspectedTower) {
    const t   = G.inspectedTower;
    const def = TOWER_DEFS[t.type];
    const stats = def.levels[t.level];
    const sellV = Math.floor(([...def.levels].slice(0,t.level+1).reduce((s,l)=>s+(l.cost||0)+(l.upgradeCost||0),0))*0.5);
    const canUp  = t.level < 2;
    const upCost = canUp ? def.levels[t.level].upgradeCost : 0;
    panel.innerHTML = `
      <div class="ti-name">${def.icon} ${def.name} <span class="ti-lvl">Lv${t.level+1}</span></div>
      <div class="ti-stats">⚔️${def.levels[t.level].damage} 🎯${def.levels[t.level].range}px ⚡${def.levels[t.level].fireRate}/s</div>
      <div class="ti-btns">
        ${canUp ? `<button class="ti-btn upgrade" onclick="upgradeTower()" ${G.gold<upCost?'disabled':''}>⬆ Upgrade 💰${upCost}</button>` : '<span class="ti-max">MAX</span>'}
        <button class="ti-btn sell" onclick="sellTower()">💰 Sell ${sellV}g</button>
        <button class="ti-btn close" onclick="clearInspect()">✕</button>
      </div>`;
  } else if(G && G.selectedTowerType) {
    const def = TOWER_DEFS[G.selectedTowerType];
    panel.innerHTML = `<div class="ti-name">${def.icon} ${def.name}</div><div class="ti-desc">${def.desc}</div><div class="ti-hint">Click a 🟩 tile to place • Right-click to cancel</div>`;
  } else {
    panel.innerHTML = `<div class="ti-hint">Click a tower to inspect &amp; upgrade</div>`;
  }
}

function selectTowerType(type) {
  if(!G || G.phase==='wave'&&false) return; // allow placement during build
  G.inspectedTower = null;
  G.selectedTowerType = (G.selectedTowerType===type) ? null : type;
  updateShop();
}

function clearInspect() {
  if(G) { G.inspectedTower=null; updateShop(); }
}

// ── Overlay screens ───────────────────────────────────────────────────────
function showMenu() {
  carryScore = 0; // reset accumulated score when returning to menu
  const ov = document.getElementById('overlay');
  ov.classList.remove('hidden');
  ov.innerHTML = `
  <div class="ov-box">
    <div class="ov-title">⚔️ Fantasy Kingdom Defense</div>
    <div class="ov-sub">Protect the Elven Crystal from waves of fantasy monsters</div>
    <div class="level-cards" id="level-cards"></div>
  </div>`;
  const container = document.getElementById('level-cards');
  LEVELS.forEach((lvl, i) => {
    const locked = i > 0; // allow all in standalone, but start with all unlocked
    const card = document.createElement('div');
    card.className = 'level-card';
    card.innerHTML = `
      <div class="lc-num">Level ${i+1}</div>
      <div class="lc-name">${lvl.name}</div>
      <div class="lc-desc">${lvl.desc}</div>
      <div class="lc-meta">💰${lvl.startGold} start • ❤️${lvl.lives} lives • ${lvl.waves.length} waves</div>
      <button class="lc-btn" onclick="carryScore=0;startLevel(${i})">Play</button>`;
    container.appendChild(card);
  });

  // Show leaderboard under the level cards
  const hsPanel = document.createElement('div');
  hsPanel.className = 'hs-panel';
  hsPanel.innerHTML = `<div class="hs-title">🏆 High Scores</div>${_hsHTML()}`;
  document.querySelector('.ov-box').appendChild(hsPanel);
}

function showGameOver() {
  const ov = document.getElementById('overlay');
  ov.classList.remove('hidden');
  ov.innerHTML = `
  <div class="ov-box">
    <div class="ov-title ov-red">☠ Defeat</div>
    <div class="ov-sub">The Elven Crystal was destroyed on Level ${G.levelIdx+1}, Wave ${G.waveIdx+1}</div>
    <div class="ov-btns">
      <button class="ov-btn" onclick="startLevel(${G.levelIdx})">Retry Level</button>
      <button class="ov-btn sec" onclick="showMenu()">Main Menu</button>
    </div>
  </div>`;
}

function showLevelComplete() {
  const ov = document.getElementById('overlay');
  ov.classList.remove('hidden');
  const hasNext = G.levelIdx < LEVELS.length - 1;
  ov.innerHTML = `
  <div class="ov-box">
    <div class="ov-title ov-gold">🏆 Victory!</div>
    <div class="ov-sub">Level ${G.levelIdx+1}: ${LEVELS[G.levelIdx].name} cleared!</div>
    <div class="ov-stats">💰 ${G.gold}g remaining • ❤️ ${G.lives} lives left</div>
    <div class="ov-btns">
      ${hasNext ? `<button class="ov-btn" onclick="startLevel(${G.levelIdx+1})">Next Level ▶</button>` : ''}
      <button class="ov-btn sec" onclick="showMenu()">Main Menu</button>
    </div>
  </div>`;
}

function showVictory() {
  // Final score = all kill gold + lives bonus
  const killGold  = (G.totalScore || 0);
  const livesBonus= G.lives * 100;
  const finalScore= killGold + livesBonus;

  const ov = document.getElementById('overlay');
  ov.classList.remove('hidden');

  const isTop = _hsIsTop(finalScore);

  ov.innerHTML = `
  <div class="ov-box">
    <div class="ov-title ov-gold">👑 Grand Victory!</div>
    <div class="ov-sub">You have defended the Kingdom across all three realms!</div>
    <div class="ov-sub">The ${BOSS_DEFS[G.bossType].name} has been vanquished! ✨</div>
    <div class="ov-stats">
      ⚔️ Kill gold: <strong>${killGold}</strong> &nbsp;❤️ Lives bonus: <strong>${livesBonus}</strong>
      &nbsp;→ <strong class="final-score">${finalScore.toLocaleString()}</strong> pts
    </div>
    ${isTop ? `
    <div class="hs-entry">
      <div class="hs-entry-label">🏆 New High Score! Enter your initials:</div>
      <input id="hs-initials" class="hs-input" maxlength="3" placeholder="AAA" autofocus />
      <button class="ov-btn hs-save-btn" id="hs-save-btn">Save Score</button>
    </div>` : ''}
    <div class="hs-panel" id="hs-panel-victory">${_hsHTML()}</div>
    <div class="ov-btns" style="margin-top:14px">
      <button class="ov-btn" onclick="showMenu()">&#127968; Main Menu</button>
    </div>
  </div>`;

  if(isTop) {
    const inp = document.getElementById('hs-initials');
    const btn = document.getElementById('hs-save-btn');
    if(inp) inp.focus();
    if(btn) btn.addEventListener('click', () => {
      const name = (inp.value||'???').trim().padEnd(3,'?');
      _hsSave(name, finalScore);
      btn.disabled = true;
      btn.textContent = '✔ Saved!';
      document.getElementById('hs-panel-victory').innerHTML = _hsHTML();
    });
    if(inp) inp.addEventListener('keydown', e => {
      if(e.key==='Enter') btn.click();
    });
  }
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

// ── Boss announcement banner ───────────────────────────────────────────────
function showBossBanner(bossType) {
  const def = BOSS_DEFS[bossType];
  const el = document.createElement('div');
  el.className = 'boss-banner';
  el.innerHTML = `<span class="bb-warn">⚠ BOSS INCOMING</span><span class="bb-name">${def.name}</span><span class="bb-note">${def.desc}</span>`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 4000);
}
