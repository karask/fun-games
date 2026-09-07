import { createGame, queueTurn, stepGame, getStepMs } from './engine.js';
import { createRenderer, createSound } from './renderer.js';
import { scoreKey, readScores, qualifies, saveScore, renderScores } from './records.js';

const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
const renderer = createRenderer(canvas);
const sound = createSound();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const touchDevice = matchMedia('(pointer: coarse)');
let settings = { difficulty: 'classic', sound: false, reduced: reducedMotion.matches };
try {
    const saved = JSON.parse(localStorage.getItem('neon_snake_settings'));
    if (saved && ['relaxed', 'classic', 'fast'].includes(saved.difficulty)) settings.difficulty = saved.difficulty;
    if (typeof saved?.sound === 'boolean') settings.sound = saved.sound;
    if (typeof saved?.reduced === 'boolean') settings.reduced = saved.reduced;
} catch { /* Settings are optional when storage is unavailable. */ }

let game;
let state = 'menu';
let mode = 1;
let wins = [0, 0];
let matchOver = false;
let countdownLeft = 0;
let lastCount = 0;
let accumulator = 0;
let lastFrame = 0;
let animation;
let endingLeft = 0;
let pendingScore = false;
let swipe = null;

function persistSettings() {
    try { localStorage.setItem('neon_snake_settings', JSON.stringify(settings)); } catch {}
}
function updateSettings() {
    $('sound-btn').textContent = settings.sound ? 'Sound on' : 'Sound off';
    $('sound-btn').setAttribute('aria-pressed', String(settings.sound));
    $('effects-btn').setAttribute('aria-pressed', String(settings.reduced));
    document.body.classList.toggle('reduced-effects', settings.reduced);
    document.querySelector('input[name="difficulty"][value="' + settings.difficulty + '"]').checked = true;
}
function playSound(kind) { if (settings.sound) sound.play(kind); }
function announce(message) { $('announcer').textContent = message; }

function refreshLeaderboard() {
    $('leaderboard-title').textContent = settings.difficulty.toUpperCase() + ' · PERSONAL BESTS';
    renderScores($('start-leaderboard'), scoreKey(settings.difficulty));
    $('legacy-scores').hidden = readScores('snake').length === 0;
    if (!$('legacy-scores').hidden) renderScores($('legacy-leaderboard'), 'snake');
}

function showOverlay(id = null) {
    for (const name of ['countdown', 'pause-screen', 'game-over']) $(name).hidden = name !== id;
    const modal = id === 'pause-screen' || id === 'game-over';
    for (const element of [canvas, document.querySelector('.hud'), document.querySelector('.game-footer'), $('touch-controls'), document.querySelector('.topbar')]) {
        element.inert = modal;
    }
}

function updateHUD() {
    $('score-p1-val').textContent = game.players[0].score;
    $('p1-label').textContent = mode === 1 ? 'SCORE' : 'P1 · WASD';
    $('ui-p2').hidden = mode !== 2;
    $('mode-label').textContent = settings.difficulty.toUpperCase();
    $('round-label').textContent = mode === 2 ? 'ROUND ' + (wins[0] + wins[1] + 1) + ' · FIRST TO 3' :
        (settings.difficulty === 'classic' ? 'LEVEL ' + (Math.min(9, Math.floor(game.apples / 5)) + 1) : 'STEADY PACE');
    $('speed-label').textContent = (1000 / getStepMs(game)).toFixed(1) + ' moves / sec';
    $('wins-p1').textContent = mode === 2 ? wins[0] + ' / 3 wins' : '';
    if (mode === 2) {
        $('score-p2-val').textContent = game.players[1].score;
        $('wins-p2').textContent = wins[1] + ' / 3 wins';
    }
}

function beginCountdown(milliseconds, caption) {
    countdownLeft = milliseconds;
    lastCount = Math.ceil(milliseconds / 1000);
    $('countdown-caption').textContent = caption;
    $('countdown-number').textContent = lastCount;
    $('countdown-controls').textContent = mode === 2 ? 'P1: WASD · P2: Arrows' :
        (touchDevice.matches ? 'Swipe or use the direction pad' : 'Arrows or WASD to steer');
    showOverlay('countdown');
    state = 'countdown';
    $('pause-btn').disabled = false;
    canvas.focus({ preventScroll: true });
    lastFrame = performance.now();
    playSound('count');
}

function startRound() {
    cancelAnimationFrame(animation);
    game = createGame({ mode, difficulty: settings.difficulty });
    pendingScore = false;
    swipe = null;
    accumulator = 0;
    renderer.clear();
    $('start-screen').hidden = true;
    $('play-screen').hidden = false;
    $('touch-controls').hidden = mode === 2;
    $('controls-help').textContent = mode === 2 ? 'P1: WASD · P2: Arrows · Space pauses · Ties replay the round' :
        (touchDevice.matches ? 'Swipe / direction pad to steer · Tap Pause to take a break' : 'Arrows / WASD to steer · Space to pause');
    $('hs-input-section').hidden = true;
    $('score-message').textContent = '';
    $('game-over-leaderboard').hidden = true;
    updateHUD();
    renderer.draw(game, 0, settings.reduced);
    if (settings.sound) sound.unlock();
    beginCountdown(3000, mode === 2 ? 'ROUND ' + (wins[0] + wins[1] + 1) : 'READY?');
    announce(mode === 2 ? 'Two players. First to three wins. Player one uses WASD. Player two uses arrows.' : 'Get ready. ' + settings.difficulty + ' game.');
    animation = requestAnimationFrame(frame);
    if (document.hidden) pause(true);
}

function startMode(selectedMode) {
    mode = selectedMode;
    wins = [0, 0];
    matchOver = false;
    startRound();
}

function showMenu() {
    cancelAnimationFrame(animation);
    state = 'menu';
    swipe = null;
    showOverlay();
    $('play-screen').hidden = true;
    $('start-screen').hidden = false;
    refreshLeaderboard();
    (mode === 2 ? $('duel-btn') : $('solo-btn')).focus({ preventScroll: true });
}

function pause(automatic = false) {
    if (!['playing', 'countdown'].includes(state)) return;
    state = 'paused';
    swipe = null;
    $('pause-reason').textContent = automatic ? 'Paused while you were away. Your snake and bonus timers are on hold.' : 'Your snake and bonus timers are on hold.';
    showOverlay('pause-screen');
    $('resume-btn').focus({ preventScroll: true });
    announce('Paused.');
}

function resume() {
    if (state !== 'paused') return;
    if (settings.sound) sound.unlock();
    beginCountdown(1000, 'BACK IN');
}

function finishRound() {
    let title;
    let detail;
    if (mode === 2) {
        const survivors = game.players.filter(player => !player.dead);
        const winner = survivors.length === 1 ? survivors[0].id - 1 : null;
        if (winner !== null) wins[winner]++;
        matchOver = wins.some(count => count >= 3);
        title = winner === null ? 'Round tied' : 'Player ' + (winner + 1) + (matchOver ? ' wins the match!' : ' wins the round');
        detail = 'P1 ' + wins[0] + ' — ' + wins[1] + ' P2 · ' + (winner === null ? 'No point awarded. Replay this round.' : game.players.find(player => player.dead).cause + '.');
        $('result-label').textContent = matchOver ? 'MATCH COMPLETE' : 'BEST OF FIVE';
        $('replay-btn').textContent = matchOver ? 'Rematch' : (winner === null ? 'Replay round' : 'Next round');
        $('wins-p1').textContent = wins[0] + ' / 3 wins';
        $('wins-p2').textContent = wins[1] + ' / 3 wins';
        $('round-label').textContent = matchOver ? 'MATCH COMPLETE' : 'ROUND COMPLETE';
    } else {
        title = game.cleared ? 'Board cleared!' : 'Score: ' + game.players[0].score;
        detail = (game.cleared ? 'Every cell, yours.' : game.players[0].cause + '.') + ' ' +
            game.apples + (game.apples === 1 ? ' apple · ' : ' apples · ') + Math.floor(game.elapsed / 1000) + ' seconds · ' + settings.difficulty;
        $('result-label').textContent = 'RUN COMPLETE';
        $('replay-btn').textContent = 'Play again';
        pendingScore = qualifies(scoreKey(settings.difficulty), game.players[0].score);
        $('hs-input-section').hidden = !pendingScore;
        $('hs-initials').value = '';
        if (!pendingScore) {
            renderScores($('game-over-leaderboard'), scoreKey(settings.difficulty));
            $('game-over-leaderboard').hidden = false;
        }
    }
    $('winner-text').textContent = title;
    $('result-detail').textContent = detail;
    state = 'result';
    showOverlay('game-over');
    announce(title + '. ' + detail);
    (pendingScore ? $('hs-initials') : $('replay-btn')).focus({ preventScroll: true });
}

function replay() {
    if (state !== 'result') return;
    if (mode === 2 && matchOver) {
        wins = [0, 0];
        matchOver = false;
    }
    startRound();
}

function frame(now) {
    const delta = Math.min(250, Math.max(0, now - lastFrame));
    lastFrame = now;
    if (state === 'countdown') {
        countdownLeft -= delta;
        const count = Math.max(1, Math.ceil(countdownLeft / 1000));
        if (count !== lastCount) {
            lastCount = count;
            $('countdown-number').textContent = count;
            playSound('count');
        }
        if (countdownLeft <= 0) {
            state = 'playing';
            showOverlay();
            playSound('go');
            announce('Go!');
        }
    } else if (state === 'playing') {
        accumulator += delta;
        while (accumulator >= getStepMs(game) && state === 'playing') {
            accumulator -= getStepMs(game);
            const events = stepGame(game);
            renderer.feedback(events, settings.reduced);
            for (const event of events) playSound(event.type === 'death' ? 'death' : event.food);
            updateHUD();
            if (game.over) {
                state = 'ending';
                endingLeft = settings.reduced ? 0 : 450;
                $('pause-btn').disabled = true;
            }
        }
    } else if (state === 'ending') {
        endingLeft -= delta;
        if (endingLeft <= 0) finishRound();
    }
    if (state !== 'menu') {
        if (state !== 'result') renderer.draw(game, state === 'paused' ? 0 : delta, settings.reduced);
        animation = requestAnimationFrame(frame);
    }
}

function steer(direction, playerIndex = 0) {
    if (['playing', 'countdown'].includes(state)) queueTurn(game.players[playerIndex], direction);
}

const keyDirections = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
document.addEventListener('keydown', event => {
    const dialog = state === 'paused' ? $('pause-screen') : state === 'result' ? $('game-over') : null;
    if (event.key === 'Tab' && dialog) {
        const focusable = [...dialog.querySelectorAll('button, input')].filter(element => !element.disabled && element.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        return;
    }
    if (event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        if (!event.repeat) state === 'paused' ? resume() : pause();
        return;
    }
    if (event.code === 'Space') {
        // Focused buttons retain native Space activation; the board gets the game shortcut.
        if (event.target.closest('button') || state === 'menu') return;
        event.preventDefault();
        if (event.repeat) return;
        if (state === 'result') replay();
        else if (state === 'paused') resume();
        else pause();
        return;
    }
    const direction = keyDirections[event.key] || keyDirections[event.key.toLowerCase()];
    if (direction && ['playing', 'countdown'].includes(state)) {
        event.preventDefault();
        if (!event.repeat) steer(direction, mode === 2 && event.key.startsWith('Arrow') ? 1 : 0);
    }
});

canvas.addEventListener('pointerdown', event => {
    if (mode !== 1 || !['playing', 'countdown'].includes(state) || !event.isPrimary) return;
    canvas.focus({ preventScroll: true });
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    swipe.x = event.clientX; swipe.y = event.clientY;
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { swipe = null; });
for (const button of document.querySelectorAll('[data-direction]')) {
    button.addEventListener('pointerdown', event => {
        event.preventDefault();
        steer(button.dataset.direction);
        canvas.focus({ preventScroll: true });
    });
    button.addEventListener('click', event => {
        if (event.detail === 0) steer(button.dataset.direction);
    });
}

$('solo-btn').addEventListener('click', () => startMode(1));
$('duel-btn').addEventListener('click', () => startMode(2));
$('pause-btn').addEventListener('click', () => pause());
$('resume-btn').addEventListener('click', resume);
$('replay-btn').addEventListener('click', replay);
$('main-menu-btn').addEventListener('click', showMenu);
$('pause-menu-btn').addEventListener('click', showMenu);
$('hs-skip-btn').addEventListener('click', () => {
    pendingScore = false;
    $('hs-input-section').hidden = true;
    $('replay-btn').focus();
});
$('hs-initials').addEventListener('input', event => {
    event.target.value = event.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase();
});
$('hs-input-section').addEventListener('submit', event => {
    event.preventDefault();
    if (!pendingScore) return;
    const initials = $('hs-initials').value.trim().toUpperCase();
    if (!saveScore(scoreKey(settings.difficulty), initials, game.players[0].score)) {
        $('score-message').textContent = 'Could not save on this device. You can try again or skip.';
        return;
    }
    pendingScore = false;
    $('hs-input-section').hidden = true;
    $('score-message').textContent = 'Score saved on this device.';
    renderScores($('game-over-leaderboard'), scoreKey(settings.difficulty));
    $('game-over-leaderboard').hidden = false;
    $('replay-btn').focus();
});
$('difficulty-options').addEventListener('change', event => {
    settings.difficulty = event.target.value;
    persistSettings();
    refreshLeaderboard();
});
$('sound-btn').addEventListener('click', () => {
    settings.sound = !settings.sound;
    if (settings.sound) { sound.unlock(); playSound('normal'); }
    updateSettings(); persistSettings();
});
$('effects-btn').addEventListener('click', () => {
    settings.reduced = !settings.reduced;
    updateSettings(); persistSettings();
    renderer.clear();
});
reducedMotion.addEventListener('change', event => {
    settings.reduced = event.matches;
    updateSettings(); persistSettings();
});
window.addEventListener('blur', () => pause(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
window.addEventListener('pagehide', () => pause(true));

updateSettings();
refreshLeaderboard();
