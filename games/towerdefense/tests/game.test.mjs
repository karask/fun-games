import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = ['levels.js', 'entities.js', 'renderer.js', 'audio.js', 'ui.js', 'controls.js', 'game.js']
  .map(file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).join('\n');

function game(width = 1280, height = 746) {
  const elements = new Map();
  const storage = new Map();
  const context = vm.createContext({
    console,
    window: { innerWidth: width, innerHeight: height + 170, addEventListener() {} },
    document: { getElementById(id) {
      if (!elements.has(id)) elements.set(id, { innerHTML: '', offsetHeight: id === 'hud' ? 60 : 110 });
      return elements.get(id);
    } },
    performance: { now: () => 0 },
    requestAnimationFrame() {},
    setTimeout() {},
    clearTimeout() {},
    localStorage: { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, String(value)); } },
  });
  const run = code => vm.runInContext(code, context);
  run(source);
  run(`
    updateHUD = hideOverlay = showVictory = showGameOver = showLevelComplete = showBossBanner = renderFrame = notifyPlayer = function() {};
    canvas = { width: ${width}, height: ${height}, style: {}, getBoundingClientRect() { return {left: 0, top: 0, width: this.width, height: this.height}; } };
    viewWidth = ${width}; viewHeight = ${height}; updateOffsets();
    startLevel(0);
  `);
  return { run, elements, storage };
}

function plain(value) { return JSON.parse(JSON.stringify(value)); }

test('clicking every tile center selects that tile on desktop and phone', () => {
  for (const width of [1280, 390]) {
    const { run } = game(width);
    const mismatches = plain(run(`(() => {
      const errors = [];
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        const world = gridCenter(col, row);
        const point = typeof worldToScreen === 'function' ? worldToScreen(world.x, world.y) : world;
        const hit = screenToGrid(point.x, point.y);
        if (hit.col !== col || hit.row !== row) errors.push({col, row, hit});
      }
      return errors;
    })()`));
    assert.equal(mismatches.length, 0, `Incorrect tile hits at width ${width}; first: ${JSON.stringify(mismatches[0])}`);
  }
});

test('the same opening defense has identical outcomes at different viewport sizes', () => {
  const outcomes = [1280, 768, 390].map(width => {
    const { run } = game(width);
    return plain(run(`(() => {
      G.selectedTowerType = 'archer'; placeTower(2, 3); placeTower(9, 6);
      onStartWave();
      let frames = 0;
      while (G.phase === 'wave' && frames < 12000) { update(1000 / 60); frames++; }
      return { phase: G.phase, lives: G.lives, gold: G.gold, kills: G.killScore, frames };
    })()`));
  });
  assert.notEqual(outcomes[0].phase, 'wave', 'The simulated wave must finish');
  assert.deepEqual(outcomes[1], outcomes[0]);
  assert.deepEqual(outcomes[2], outcomes[0]);
});

test('resizing preserves enemy positions and routes aligned with the map', () => {
  const { run } = game();
  run(`spawnMonster('goblin'); updateMonsters(1000);`);
  const before = plain(run(`({x: G.monsters[0].x, y: G.monsters[0].y, route: G.screenWPs, destination: gridCenter(...LEVELS[0].waypoints[1])})`));
  run('window.innerWidth = 390; window.innerHeight = 770; canvas.width = 390; canvas.height = 600; resizeCanvas();');
  const after = plain(run(`({x: G.monsters[0].x, y: G.monsters[0].y, route: G.screenWPs, destination: gridCenter(...LEVELS[0].waypoints[1])})`));
  assert.deepEqual(after, before);
  assert.deepEqual(after.route[1], after.destination);
});

for (const upgrades of [0, 1, 2]) test(`selling an archer with ${upgrades} upgrades refunds the displayed amount`, () => {
  const { run, elements } = game();
  run(`G.gold = 1000; G.selectedTowerType = 'archer'; placeTower(2, 3); G.inspectedTower = G.towers[0];`);
  for (let i = 0; i < upgrades; i++) run('upgradeTower();');
  run('renderTowerInfo();');
  const sellButton = elements.get('tower-info').innerHTML.match(/<button[^>]*onclick="sellTower\(\)"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(sellButton, 'Tower information contains a sell button');
  const displayed = Number(sellButton[1].replace(/<[^>]*>/g, '').match(/\d+/)?.[0]);
  const actual = run('(() => { const before = G.gold; sellTower(); return G.gold - before; })()');
  assert.equal(actual, displayed);
  assert.equal(run('G.towers.length'), 0);
});

test('a boss escaping on the final wave causes defeat', () => {
  const { run } = game();
  const outcome = plain(run(`startLevel(2); G.waveIdx = LEVELS[2].waves.length - 1; G.bossType = 'dragon';
    spawnMonster('boss'); G.monsters[0].wpIdx = G.screenWPs.length;
    G.allSpawned = true; G.phase = 'wave'; update(16);
    ({phase: G.phase, lives: G.lives, killScore: G.killScore});`));
  assert.equal(outcome.phase, 'gameover');
  assert.equal(outcome.lives, 0);
  assert.equal(outcome.killScore, 0);
});

test('an in-flight projectile cannot award gold for an escaped enemy', () => {
  const { run } = game();
  const reward = run(`spawnMonster('goblin'); const escaped = G.monsters[0]; escaped.reachedEnd = true;
    G.projectiles.push({x: escaped.x, y: escaped.y, targetId: escaped.id, damage: 9999, speed: 100, dead: false});
    const before = G.gold; updateProjectiles(16); G.gold - before;`);
  assert.equal(reward, 0);
});

test('damage and repeated kills never reward an already dead enemy twice', () => {
  const { run } = game();
  const reward = run(`spawnMonster('goblin'); const victim = G.monsters[0];
    killMonster(victim); const before = G.gold;
    applyDamage(victim, {damage: 9999}); killMonster(victim); G.gold - before;`);
  assert.equal(reward, 0);
});

test('splash damage rewards only living enemies that have not escaped', () => {
  const { run } = game();
  const outcome = plain(run(`spawnMonster('goblin'); spawnMonster('goblin');
    const active = G.monsters[0], escaped = G.monsters[1]; escaped.reachedEnd = true;
    G.projectiles.push({x: active.x, y: active.y, targetId: active.id, damage: 9999, speed: 100, splashR: 100, dead: false});
    const before = G.gold; updateProjectiles(16);
    ({gold: G.gold - before, reward: active.reward, escapedHp: escaped.hp, escapedMaxHp: escaped.maxHp});`));
  assert.equal(outcome.gold, outcome.reward);
  assert.equal(outcome.escapedHp, outcome.escapedMaxHp);
});

test('pausing a wave freezes simulation and resuming advances it', () => {
  const { run } = game();
  run(`onStartWave(); spawnMonster('goblin'); renderFrame = function() {}; G.paused = true;`);
  const before = plain(run('({monster: G.monsters[0], groups: G.spawnGroups, gold: G.gold})'));
  run('gameLoop(100);');
  assert.deepEqual(plain(run('({monster: G.monsters[0], groups: G.spawnGroups, gold: G.gold})')), before);
  run('G.paused = false; gameLoop(200);');
  assert.ok(run('G.monsters[0].distTraveled') > before.monster.distTraveled);
});

test('repeated ice hits cannot extend a freeze already in progress', () => {
  const { run } = game();
  run(`spawnMonster('goblin'); const frozen = G.monsters[0];
    const iceHit = {damage: 1, towerType: 'ice', effect: {freeze: 800}};
    applyDamage(frozen, iceHit); updateMonsters(300);`);
  const remaining = run('frozen.effects.freezeTimer');
  assert.equal(remaining, 500);
  run('applyDamage(frozen, iceHit); applyDamage(frozen, iceHit);');
  assert.equal(run('frozen.effects.freezeTimer'), remaining);
  run('updateMonsters(500);');
  assert.equal(run('frozen.effects.freezeTimer'), 0);
});

test('enemies can move during the 1200ms freeze recovery before freezing again', () => {
  const { run } = game();
  run(`spawnMonster('goblin'); const frozen = G.monsters[0];
    const iceHit = {damage: 1, towerType: 'ice', effect: {freeze: 800}};
    applyDamage(frozen, iceHit); updateMonsters(800);
    applyDamage(frozen, iceHit);`);
  assert.equal(run('frozen.effects.freezeTimer'), 0);
  run('updateMonsters(1199); applyDamage(frozen, iceHit);');
  assert.equal(run('frozen.effects.freezeTimer'), 0);
  assert.ok(run('frozen.distTraveled') > 0);
  run('updateMonsters(1); applyDamage(frozen, iceHit);');
  assert.equal(run('frozen.effects.freezeTimer'), 800);
});

test('magic bypasses enemy armor while physical shots respect it', () => {
  const { run } = game();
  const damage = plain(run(`spawnMonster('orc'); const armored = G.monsters[0]; armored.dodge = 0;
    const before = armored.hp; applyDamage(armored, {damage: 20, towerType: 'archer'});
    const physical = before - armored.hp;
    const afterPhysical = armored.hp; applyDamage(armored, {damage: 20, towerType: 'magic'});
    ({physical, magic: afterPhysical - armored.hp, armor: armored.armor});`));
  assert.ok(damage.armor > 0);
  assert.equal(damage.physical, 20 - damage.armor);
  assert.equal(damage.magic, 20);
});

for (const [priority, expectedIndex] of [['first', 0], ['strongest', 1], ['fastest', 2]]) {
  test(`${priority} target priority chooses the appropriate living enemy in range`, () => {
    const { run } = game();
    const result = plain(run(`G.selectedTowerType = 'archer'; placeTower(2, 3);
      G.inspectedTower = G.towers[0]; setTargetPriority('${priority}');
      for(let i = 0; i < 5; i++) spawnMonster('goblin');
      const position = gridCenter(2, 3);
      G.monsters.forEach(m => { m.x = position.x; m.y = position.y; m.distTraveled = 1; m.hp = 10; m.speed = 10; });
      G.monsters[0].distTraveled = 100; G.monsters[1].hp = 100; G.monsters[2].speed = 100;
      Object.assign(G.monsters[3], {hp: 9999, speed: 9999, distTraveled: 9999, x: position.x + 9999});
      Object.assign(G.monsters[4], {hp: 9999, speed: 9999, distTraveled: 9999, reachedEnd: true});
      updateTowers(16);
      ({target: G.projectiles[0]?.targetId, expected: G.monsters[${expectedIndex}].id});`));
    assert.equal(result.target, result.expected);
  });
}

test('pausing blocks tower purchases, upgrades, sales, and starting a wave', () => {
  const { run } = game();
  run(`G.gold = 1000; G.selectedTowerType = 'archer'; placeTower(2, 3);
    G.inspectedTower = G.towers[0]; showPause = function() {}; setPaused(true);`);
  const before = plain(run('({gold: G.gold, towers: G.towers, phase: G.phase, groups: G.spawnGroups})'));
  run('placeTower(9, 6); upgradeTower(); sellTower(); onStartWave();');
  assert.deepEqual(plain(run('({gold: G.gold, towers: G.towers, phase: G.phase, groups: G.spawnGroups})')), before);
});

test('malformed saved medals are safe to render in realm selection', () => {
  const { run, storage } = game();
  const key = run('PROGRESS_KEY');
  run('presentOverlay = function(html) { globalThis.menuHTML = html; };');
  for (const saved of ['broken json', 'null', '7', JSON.stringify({0: {stars: 9, lives: 20}}),
    JSON.stringify({0: {stars: -1, lives: 20}}), JSON.stringify({0: {stars: 1.5, lives: 20}}),
    JSON.stringify({0: {stars: 3, lives: '<script>'}}), JSON.stringify({0: {stars: 3, lives: 999}})]) {
    storage.set(key, saved);
    assert.deepEqual(plain(run('progressFor(0)')), {stars: 0, lives: 0});
    assert.doesNotThrow(() => run('showMenu();'));
    assert.match(run('menuHTML'), /Uncharted/);
  }
});

test('saved medals retain the best stars and lives across stronger and weaker clears', () => {
  const { run } = game();
  run('G.lives = 15; bankMedal();');
  assert.deepEqual(plain(run('progressFor(0)')), {stars: 2, lives: 15});
  run('G.lives = LEVELS[0].lives; bankMedal();');
  const best = plain(run('progressFor(0)'));
  assert.equal(best.stars, 3);
  run('G.lives = 1; bankMedal();');
  assert.deepEqual(plain(run('progressFor(0)')), best);
  assert.equal(run('G.recordSaved'), true);
});

test('tile hit testing remains accurate after camera zoom and pan', () => {
  for (const width of [1280, 390]) {
    const { run } = game(width);
    const hits = plain(run(`zoomCamera(0.8, {x: 150, y: 200}); cameraPanX += 85; cameraPanY -= 47; updateOffsets();
      [[0,0], [2,3], [9,6], [COLS-1,ROWS-1]].map(([col,row]) => {
        const world = gridCenter(col,row), screen = worldToScreen(world.x,world.y);
        return {expected: {col,row}, actual: screenToGrid(screen.x,screen.y)};
      });`));
    for (const hit of hits) assert.deepEqual(hit.actual, hit.expected);
  }
});
