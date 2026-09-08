// Player-facing reports, tower information, and local records.
const HS_KEY = 'fun_games_towerdefense_highscores';
const PROGRESS_KEY = 'kingdom_defense_progress_v1';
const HS_MAX = 5;
const ENEMY_GUIDE = {
  goblin: { trait: 'Quick, lightly armored raiders.', counter: 'Archer towers handle individuals. Cannons punish packed groups.' },
  orc: { trait: 'Heavy armor absorbs 8 damage from each hit.', counter: 'Magic pierces armor. Upgrade damage before adding more weak shots.' },
  darkelf: { trait: 'Fast runners with an 18% chance to dodge.', counter: 'Slow them with magic and cover the final bend with archers.' },
  troll: { trait: 'Regenerates 10 health every second.', counter: 'Concentrate upgraded firepower. Dragon fire keeps dealing damage between hits.' },
};
function readRecords(key, fallback) {
  try { const data = JSON.parse(localStorage.getItem(key)); return data && typeof data === 'object' ? data : fallback; } catch { return fallback; }
}
function saveRecords(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch { return false; }
}
function _hsGet() {
  const scores = readRecords(HS_KEY, []);
  return Array.isArray(scores) ? scores.filter(s => s && typeof s.name === 'string' && Number.isFinite(s.score)).slice(0, HS_MAX) : [];
}
function _hsSave(name, score) {
  const scores = [..._hsGet(), { name: name.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 3) || 'AAA', score }];
  scores.sort((a,b) => b.score - a.score);
  return saveRecords(HS_KEY, scores.slice(0, HS_MAX));
}
function _hsIsTop(score) { const s = _hsGet(); return score > 0 && (s.length < HS_MAX || score > s[s.length - 1].score); }
function _hsHTML() {
  const scores = _hsGet();
  return scores.length ? scores.map((s,i) => `<div class="hs-row ${i === 0 ? 'gold' : ''}"><span class="hs-rank">${i+1}.</span><span class="hs-name">${s.name.replace(/[^a-z0-9]/gi, '').slice(0,3)}</span><span>${s.score.toLocaleString()}</span></div>`).join('') : '<div class="hs-empty">Complete all three realms to set a campaign record.</div>';
}
function progressFor(idx) {
  const p = readRecords(PROGRESS_KEY, {});
  const record = p[idx];
  return record && Number.isInteger(record.stars) && record.stars >= 0 && record.stars <= 3 && Number.isInteger(record.lives) && record.lives >= 0 && record.lives <= 20 ? record : { stars: 0, lives: 0 };
}
function bankMedal() {
  const stars = G.lives === LEVELS[G.levelIdx].lives ? 3 : G.lives >= 15 ? 2 : 1;
  const p = readRecords(PROGRESS_KEY, {});
  const old = progressFor(G.levelIdx);
  p[G.levelIdx] = { stars: Math.max(stars, old.stars), lives: Math.max(G.lives, old.lives) };
  G.recordSaved = saveRecords(PROGRESS_KEY, p);
  return stars;
}
function initUI() {
  buildShop();
  document.getElementById('btn-wave').addEventListener('click', onStartWave);
  document.getElementById('btn-speed').addEventListener('click', onToggleSpeed);
  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-scout').addEventListener('click', showScout);
  document.getElementById('btn-sound').addEventListener('click', () => { Sound.toggle(); updateSoundButton(); });
  document.getElementById('btn-zoom-in').addEventListener('click', () => zoomCamera(0.25));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoomCamera(-0.25));
  document.getElementById('btn-camera-reset').addEventListener('click', resetCamera);
  initControls();
  updateSoundButton();
}
function updateSoundButton() {
  const b = document.getElementById('btn-sound');
  b.textContent = Sound.enabled ? 'Sound on' : 'Sound off';
  b.setAttribute('aria-label', Sound.enabled ? 'Mute sound' : 'Enable sound');
  b.setAttribute('aria-pressed', String(!Sound.enabled));
}
function buildShop() {
  const container = document.getElementById('tower-buttons');
  container.innerHTML = '';
  TOWER_ORDER.forEach((type,i) => {
    const def = TOWER_DEFS[type], btn = document.createElement('button');
    btn.className = 'shop-btn'; btn.id = 'shop-' + type;
    btn.setAttribute('aria-label', `${def.name}, ${def.levels[0].cost} gold. ${def.desc}`);
    btn.innerHTML = `<span class="shop-key">${i+1}</span><canvas class="shop-art" width="116" height="108" aria-hidden="true"></canvas><span class="shop-name">${def.name.replace(' Tower','').replace(' Roost','')}</span><span class="shop-cost">◈ ${def.levels[0].cost}</span>`;
    btn.addEventListener('click', () => selectTowerType(type));
    container.appendChild(btn);
    const icon = btn.querySelector('canvas'), c = icon.getContext('2d');
    c.scale(1.05, 1.05); c.translate(55,88); drawTowerArt(c, {type,level:0,aim:0,shot:0}, 0);
  });
}
function updateHUD() {
  if(!G) return;
  const lvl = LEVELS[G.levelIdx];
  document.getElementById('hud-lives').textContent = G.lives;
  document.getElementById('hud-gold').textContent = G.gold;
  document.getElementById('hud-wave').textContent = `${Math.min(G.waveIdx+1,lvl.waves.length)}/${lvl.waves.length}`;
  document.getElementById('hud-level').textContent = lvl.name;
  const start = document.getElementById('btn-wave');
  start.disabled = G.phase !== 'build' || G.paused;
  start.textContent = G.waveIdx === 0 ? 'Start wave →' : 'Next wave →';
  document.getElementById('btn-speed').textContent = `${G.speed}×`;
  document.getElementById('btn-speed').setAttribute('aria-label', `Speed ${G.speed} times. Change speed`);
  document.getElementById('btn-pause').textContent = G.paused ? '▶ Resume' : 'Ⅱ Pause';
  const wave = lvl.waves[Math.min(G.waveIdx, lvl.waves.length-1)];
  document.getElementById('wave-phase').textContent = G.phase === 'wave' ? 'BATTLE IN PROGRESS' : 'PREPARE YOUR DEFENSE';
  document.getElementById('wave-summary').textContent = wave.map(g => `${g.count} ${g.type === 'boss' ? BOSS_DEFS[G.bossType].name : MONSTER_DEFS[g.type].name.replace(' Warrior','')}`).join(' · ') + ' ↗';
  updateShop();
}
function updateShop() {
  if(!G) return;
  TOWER_ORDER.forEach(type => {
    const b = document.getElementById('shop-' + type); if(!b) return;
    b.classList.toggle('active', G.selectedTowerType === type);
    b.classList.toggle('unaffordable', G.gold < TOWER_DEFS[type].levels[0].cost);
    b.setAttribute('aria-pressed', String(G.selectedTowerType === type));
  });
  renderTowerInfo();
}
function statsHTML(s) { return `${s.damage} damage · ${s.fireRate}/sec · ${(s.range/48).toFixed(1)} range${s.splashR ? ' · area attack' : ''}`; }
function renderTowerInfo() {
  const panel = document.getElementById('tower-info'); if(!panel) return;
  let html;
  if(G && G.inspectedTower) {
    const t = G.inspectedTower, def = TOWER_DEFS[t.type], s = def.levels[t.level], next = def.levels[t.level+1];
    html = `<div class="ti-name">${def.name}<span class="ti-lvl">LEVEL ${t.level+1}</span></div><div class="ti-stats">${statsHTML(s)}</div>${next ? `<div class="upgrade-preview">Upgrade: ${next.damage} damage · ${next.fireRate}/sec · ${(next.range/48).toFixed(1)} range</div>` : '<div class="upgrade-preview">Fully upgraded</div>'}<div class="ti-btns">${next ? `<button class="ti-btn upgrade" onclick="upgradeTower()" ${G.gold < s.upgradeCost ? 'disabled' : ''}>Upgrade ◈ ${s.upgradeCost}</button>` : ''}<button class="ti-btn sell" onclick="sellTower()">Sell ${towerSellValue(t)}g</button><select class="target-select" aria-label="Target priority" onchange="setTargetPriority(this.value)">${['first','strongest','fastest'].map(mode => `<option value="${mode}" ${(t.priority || 'first') === mode ? 'selected' : ''}>${mode[0].toUpperCase()+mode.slice(1)}</option>`).join('')}</select><button class="ti-btn close" onclick="cancelSelection()" aria-label="Close tower details">Close</button></div>`;
  } else if(G && G.selectedTowerType) {
    const def = TOWER_DEFS[G.selectedTowerType], cell = G.hoverCell;
    const reason = cell ? placementError(cell.col,cell.row) : '';
    html = `<div class="ti-name">${def.name}</div><div class="ti-stats">${statsHTML(def.levels[0])}</div><div class="ti-desc">${def.desc}</div><div class="ti-btns">${G.touchMode ? `<button class="ti-btn build" onclick="buildSelectedTile()" ${!cell || reason ? 'disabled' : ''}>Build here ◈ ${def.levels[0].cost}</button>` : ''}<button class="ti-btn close" onclick="cancelSelection()">Cancel</button><span class="ti-hint">${reason || (G.touchMode ? 'Tap a tile to preview.' : 'Choose a clear meadow tile.')}</span></div>`;
  } else {
    html = `<div class="ti-name">${G && G.towers.length ? 'Hold the line.' : 'A kingdom worth protecting.'}</div><div class="ti-hint">${G && G.towers.length ? 'Select a tower to upgrade or change its target. Scout the next wave before calling it.' : 'Start with two Archer towers beside the path. Enemies enter at the red banners and head for your crystal.'}</div>`;
  }
  // Preserve focus and select state when HUD updates do not change this panel.
  if(panel.innerHTML !== html) panel.innerHTML = html;
}
function selectTowerType(type) {
  if(!G || G.paused || !['build','wave'].includes(G.phase)) return;
  G.inspectedTower = null;
  G.selectedTowerType = G.selectedTowerType === type ? null : type;
  G.pendingTile = null;
  updateShop(); Sound.play('select');
}
function clearInspect() { if(G) { G.inspectedTower = null; updateShop(); } }
function updateBossHealth() {
  const panel = document.getElementById('boss-health');
  const boss = G && G.monsters.find(m => m.isBoss && !m.dead && !m.reachedEnd);
  panel.hidden = !boss;
  if(boss) {
    document.getElementById('boss-name').textContent = BOSS_DEFS[boss.bossType].name;
    document.getElementById('boss-fill').style.width = `${Math.max(0,boss.hp/boss.maxHp*100)}%`;
    document.getElementById('boss-trait').textContent = BOSS_DEFS[boss.bossType].desc;
  }
}
function presentOverlay(html, label) {
  const ov = document.getElementById('overlay');
  ov.innerHTML = html; ov.classList.remove('hidden'); ov.setAttribute('aria-label', label);
  ['hud','battlebar','board','shop'].forEach(id => document.getElementById(id).inert = true);
  ov.querySelector('button,input')?.focus();
}
function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
  ['hud','battlebar','board','shop'].forEach(id => document.getElementById(id).inert = false);
  canvas?.focus({preventScroll:true});
}
function showMenu() {
  G = null; carryScore = 0; Sound.sync(false);
  presentOverlay(`<div class="ov-box menu-box"><div class="menu-hero"><span class="eyebrow">THE CRYSTAL WATCH</span><h1 class="ov-title">Kingdom<br>Defense</h1><p class="ov-sub">Raise your towers. Read the enemy.<br>Keep the last light of the kingdom alive.</p></div><div class="menu-content"><div class="menu-caption"><span class="eyebrow">CHOOSE YOUR REALM</span><span>3 realms · 19 waves</span></div><div class="level-cards">${LEVELS.map((l,i) => { const p = progressFor(i); return `<div class="level-card"><div class="lc-num">Realm 0${i+1}</div><div class="lc-name">${l.name}</div><div class="lc-desc">${l.desc}</div><div class="lc-meta">${l.waves.length} waves · ${l.startGold} gold</div><div class="lc-medal">${p.stars ? '★'.repeat(p.stars)+'☆'.repeat(3-p.stars)+' · '+p.lives+' lives' : 'Uncharted'}</div><button class="lc-btn" onclick="startLevel(${i})" aria-label="Play ${l.name}">Defend →</button></div>`; }).join('')}</div><p class="menu-note">Start in the valley for a full campaign. Each realm begins with a fresh treasury. Earn three stars by protecting every crystal life.</p><div class="hs-panel"><div class="hs-title">CAMPAIGN RECORDS</div>${_hsHTML()}</div></div></div>`, 'Choose a realm');
}
function showPause(reason = '') {
  presentOverlay(`<div class="ov-box"><span class="eyebrow">TAKE A BREATH</span><h1 class="ov-title">The watch can wait.</h1><p class="ov-sub">${reason || 'Your defenses are safe. Plan your next move.'}</p><div class="ov-btns"><button class="ov-btn" onclick="setPaused(false)">Resume defense</button><button class="ov-btn sec" onclick="startLevel(G.levelIdx)">Restart realm</button><button class="ov-btn sec" onclick="showMenu()">Realm selection</button></div><p class="controls-note">1–5: choose tower · Arrows: choose tile · Enter: build / inspect<br>Space: start wave / pause · P: pause · Escape: cancel / pause<br>Scroll to zoom. Drag to pan. On touch, preview a tile, then tap Build here.</p><button class="ti-btn" onclick="Sound.toggle();updateSoundButton();this.textContent=Sound.enabled?'Sound on':'Sound off'">${Sound.enabled ? 'Sound on' : 'Sound off'}</button></div>`, 'Game paused');
}
function showScout() {
  if(!G || !['build','wave'].includes(G.phase)) return;
  G.paused = true; Sound.sync(false); updateHUD();
  const wave = LEVELS[G.levelIdx].waves[G.waveIdx];
  presentOverlay(`<div class="ov-box"><span class="eyebrow">SCOUT REPORT · WAVE ${G.waveIdx+1}</span><h1 class="ov-title">Know your enemy.</h1><p class="ov-sub">Battle is paused while you plan.</p>${wave.map(g => { const boss = g.type === 'boss', d = boss ? BOSS_DEFS[G.bossType] : MONSTER_DEFS[g.type], guide = ENEMY_GUIDE[g.type]; return `<div class="scout-row"><span class="scout-count">${g.count}×</span><div><strong>${d.name} · ${d.hp.toLocaleString()} health</strong><p>${boss ? d.desc : guide.trait}<br>${boss ? 'Defeat the boss before it reaches the crystal. An escaped boss destroys it.' : guide.counter}</p></div></div>`; }).join('')}${G.bossType ? `<div class="scout-warning">Final wave: ${BOSS_DEFS[G.bossType].name}. ${BOSS_DEFS[G.bossType].desc}. Prepare your towers now.</div>` : ''}<div class="ov-btns"><button class="ov-btn" onclick="setPaused(false)">Back to the battlefield</button></div></div>`, 'Enemy scout report');
}
function showGameOver() {
  Sound.play('defeat'); Sound.sync(false,1);
  presentOverlay(`<div class="ov-box"><span class="eyebrow">THE CRYSTAL HAS FALLEN</span><h1 class="ov-title ov-red">The watch is broken.</h1><p class="ov-sub">${LEVELS[G.levelIdx].name} · Wave ${G.waveIdx+1}<br>${G.bossEscaped ? 'The boss reached the stronghold. It must be defeated to win.' : 'Too many enemies reached the stronghold. Cover the bends and upgrade your damage.'}</p><div class="ov-stats">${G.killScore} gold earned from enemies</div><div class="ov-btns"><button class="ov-btn" onclick="startLevel(G.levelIdx)">Try again</button><button class="ov-btn sec" onclick="showMenu()">Realm selection</button></div></div>`, 'Defeat');
}
function showLevelComplete() {
  const stars = bankMedal(); Sound.play('victory'); Sound.sync(false,1);
  presentOverlay(`<div class="ov-box"><span class="eyebrow">REALM SECURED</span><h1 class="ov-title ov-gold">The light endures.</h1><p class="ov-sub">${LEVELS[G.levelIdx].name} is safe.</p><div class="result-stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)+'☆'.repeat(3-stars)}</div><div class="ov-stats">${G.lives} crystal lives · ${G.gold} gold remaining</div><p class="ov-sub">${G.recordSaved ? 'Your best medal is saved on this device.' : 'Medal could not be saved on this device.'} The next realm starts with a fresh treasury.</p><div class="ov-btns"><button class="ov-btn" onclick="startLevel(G.levelIdx+1)">Next realm →</button><button class="ov-btn sec" onclick="showMenu()">Realm selection</button></div></div>`, 'Realm completed');
}
function showVictory() {
  const stars = bankMedal(), finalScore = G.totalScore + G.lives*100;
  const campaign = G.campaignStart === 0, isTop = campaign && _hsIsTop(finalScore);
  Sound.play('victory'); Sound.sync(false,1);
  presentOverlay(`<div class="ov-box"><span class="eyebrow">${campaign ? 'THE KINGDOM IS SAFE' : 'THE KEEP IS SECURED'}</span><h1 class="ov-title ov-gold">A dawn worth defending.</h1><p class="ov-sub">The ${BOSS_DEFS[G.bossType].name} has fallen.${campaign ? ' You have defended all three realms.' : ''}</p><div class="result-stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)+'☆'.repeat(3-stars)}</div><div class="ov-stats">${G.lives} lives · <strong class="final-score">${finalScore.toLocaleString()} points</strong></div>${isTop ? '<div class="hs-entry-label">New campaign record · your initials</div><input id="hs-initials" class="hs-input" maxlength="3" aria-label="Your initials" placeholder="AAA"><button class="ti-btn" id="hs-save-btn">Save record</button>' : ''}<div class="hs-panel" id="hs-panel-victory">${_hsHTML()}</div><div class="ov-btns"><button class="ov-btn" onclick="showMenu()">Return to the realms</button></div></div>`, 'Victory');
  if(isTop) {
    const inp = document.getElementById('hs-initials'), btn = document.getElementById('hs-save-btn');
    inp.focus();
    btn.addEventListener('click', () => {
      if(_hsSave(inp.value,finalScore)) { btn.disabled = true; btn.textContent = 'Record saved'; document.getElementById('hs-panel-victory').innerHTML = _hsHTML(); }
      else btn.textContent = 'Storage unavailable';
    });
    inp.addEventListener('keydown', e => { if(e.key === 'Enter') btn.click(); });
  }
}
function showBossBanner(type) { notifyPlayer(`${BOSS_DEFS[type].name} approaches. Protect the crystal!`, 4500); Sound.play('boss'); }
