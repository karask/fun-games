import { getHighScores, saveHighScore } from '../../assets/highscore.js';
import { PongMatch, FrameClock, COURT } from './engine.mjs?v=court-2';
import { CourtRenderer } from './renderer.mjs?v=court-2';

const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
const match = new PongMatch();
const clock = new FrameClock();
const renderer = new CourtRenderer(canvas);
const keys = new Set(), pointers = new Map();
const targets = [null, null];
let shownPhase = null, audio = null, sound = false;
try { sound = localStorage.getItem('fun_games_pong_sound') === 'on'; } catch { /* Audio remains optional. */ }

function write(id, value) {
    const element = $(id), text = String(value);
    if (element.textContent !== text) element.textContent = text;
}
function options() {
    return { mode: document.querySelector('input[name="mode"]:checked').value,
        difficulty: document.querySelector('input[name="difficulty"]:checked').value };
}
function playerName(side) { return match.mode === 'solo' ? (side === 0 ? 'You' : 'CPU') : `Player ${side + 1}`; }
function records() {
    try {
        return getHighScores('pong').filter(entry => entry && typeof entry.name === 'string' &&
            Number.isFinite(entry.score) && entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    } catch { return []; }
}
function renderRecords() {
    const list = $('start-leaderboard');
    list.replaceChildren();
    const scores = records();
    if (!scores.length) {
        const empty = document.createElement('li');
        empty.className = 'empty'; empty.textContent = 'A clean slate. How long can you keep it alive?';
        list.append(empty);
    }
    scores.forEach((entry, index) => {
        const row = document.createElement('li'), rank = document.createElement('span');
        const name = document.createElement('strong'), score = document.createElement('b');
        rank.textContent = String(index + 1).padStart(2, '0');
        name.textContent = entry.name.slice(0, 3); score.textContent = entry.score;
        row.append(rank, name, score); list.append(row);
    });
}

function clearInput() {
    keys.clear(); targets.fill(null);
    for (const pointer of pointers.keys()) if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointers.clear();
    clock.reset();
}
function prepareAudio() {
    if (!sound) return;
    try {
        if (!audio) audio = new AudioContext();
        if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch { /* The game also works without an audio device. */ }
}
function tone(type) {
    if (!sound || !audio || audio.state !== 'running') return;
    const frequency = { hit: 520 + match.rally * 15, wall: 240, point: 140, serve: 720 }[type];
    if (!frequency) return;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    const now = audio.currentTime, duration = type === 'point' ? .22 : .06;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * .7, now + duration);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.07, now + .005);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(now); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
function updateSoundButton() {
    write('sound-btn', sound ? 'Sound on' : 'Sound off');
    $('sound-btn').setAttribute('aria-pressed', String(sound));
}
$('sound-btn').addEventListener('click', () => {
    sound = !sound; prepareAudio(); updateSoundButton();
    try { localStorage.setItem('fun_games_pong_sound', sound ? 'on' : 'off'); } catch { /* Session setting still works. */ }
    if (sound) tone('serve');
    if (['playing', 'serving'].includes(match.phase)) canvas.focus({ preventScroll: true });
});

function startMatch() {
    clearInput(); prepareAudio(); renderer.reset();
    match.start(options());
    syncUI(); canvas.focus({ preventScroll: true });
    write('announcer', `Match started. ${match.mode === 'solo' ? 'You versus CPU' : 'Two players'}. First to five.`);
}
function showMenu() {
    clearInput(); renderer.reset(); match.start(options()); match.phase = 'menu';
    renderRecords(); syncUI(); $('start-btn').focus({ preventScroll: true });
}
function pause(reason = 'Your rally will be right here.') {
    if (!['playing', 'serving'].includes(match.phase)) return;
    match.pause(); clearInput(); write('pause-reason', reason); syncUI();
    $('resume-btn').focus({ preventScroll: true });
    write('announcer', 'Match paused.');
}
function resume() {
    if (match.phase !== 'paused') return;
    clearInput(); prepareAudio(); match.resume(); syncUI(); canvas.focus({ preventScroll: true });
    write('announcer', 'Match resumed.');
}
function finishMatch() {
    clearInput();
    const title = match.mode === 'solo' ? (match.winner === 0 ? 'YOU WIN.' : 'CPU WINS.') : `PLAYER ${match.winner + 1} WINS.`;
    write('winner-text', title);
    $('winner-text').className = match.winner === 0 ? 'pink' : 'cyan';
    write('final-score', `${match.scores[0]} — ${match.scores[1]}`);
    write('rally-text', match.bestRally);
    const scores = records();
    $('record-form').hidden = !(match.bestRally > 0 && (scores.length < 5 || match.bestRally > scores.at(-1).score));
    $('record-form').reset(); write('record-status', '');
    $('rematch-btn').focus({ preventScroll: true });
    write('announcer', `${title} ${match.scores[0]} to ${match.scores[1]}. Longest rally: ${match.bestRally}.`);
}
$('record-form').addEventListener('submit', event => {
    event.preventDefault();
    const initials = $('hs-initials').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,3}$/.test(initials)) return;
    try {
        saveHighScore('pong', initials, match.bestRally);
        $('record-form').hidden = true; write('record-status', 'Record saved. Your next rally is waiting.');
        $('rematch-btn').focus({ preventScroll: true });
    } catch { write('record-status', 'Could not save on this device. You can still play again.'); }
});
$('start-btn').addEventListener('click', startMatch);
$('rematch-btn').addEventListener('click', startMatch);
$('main-menu-btn').addEventListener('click', showMenu);
$('pause-menu-btn').addEventListener('click', showMenu);
$('pause-btn').addEventListener('click', () => pause());
$('resume-btn').addEventListener('click', resume);
for (const radio of document.querySelectorAll('input[type="radio"]')) radio.addEventListener('change', () => {
    const choice = options();
    $('difficulty-field').disabled = choice.mode === 'versus';
    $('setup-hint').innerHTML = choice.mode === 'solo' ? 'W / S or ↑ / ↓ to move.<br>Mouse and touch work too.' : 'P1: W / S · P2: ↑ / ↓<br>Touch: drag on your half of the court.';
    match.mode = choice.mode; match.difficulty = choice.difficulty; syncUI();
});

for (const id of ['pips-p1', 'pips-p2']) {
    for (let i = 0; i < 5; i++) $(id).append(document.createElement('i'));
}
function syncUI() {
    const phase = match.phase;
    if (shownPhase !== phase) {
        $('game-container').dataset.phase = phase;
        $('start-screen').hidden = phase !== 'menu';
        $('pause-screen').hidden = phase !== 'paused';
        $('game-over').hidden = phase !== 'over';
        $('serve-notice').hidden = phase !== 'serving';
        $('pause-btn').disabled = !['playing', 'serving'].includes(phase);
        canvas.tabIndex = ['playing', 'serving'].includes(phase) ? 0 : -1;
        shownPhase = phase;
        if (phase === 'over') finishMatch();
    }
    for (let side = 0; side < 2; side++) {
        write(`score-p${side + 1}`, match.scores[side]);
        write(`label-p${side + 1}`, playerName(side).toUpperCase());
        Array.from($(`pips-p${side + 1}`).children).forEach((pip, i) => pip.classList.toggle('on', i < match.scores[side]));
    }
    write('match-mode', match.mode === 'solo' ? `SOLO / ${match.difficulty.toUpperCase()}` : 'LOCAL VERSUS');
    write('rally-count', String(match.rally).padStart(2, '0'));
    write('best-rally', String(match.bestRally).padStart(2, '0'));
    write('speed-label', (match.ball.speed / COURT.ballSpeed).toFixed(1) + '×');
    $('speed-fill').style.width = `${(match.ball.speed - COURT.ballSpeed) / (COURT.maxBallSpeed - COURT.ballSpeed) * 100}%`;
    write('controls-hint', match.mode === 'solo' ? 'W / S or ↑ / ↓ · Mouse / touch · P to pause' : 'P1: W / S · P2: ↑ / ↓ · Touch: drag your half · P to pause');
    if (phase === 'serving') {
        write('serve-label', match.lastScorer === null ? 'GET READY' : `${playerName(match.lastScorer).toUpperCase()} ${match.mode === 'solo' && match.lastScorer === 0 ? 'SCORE' : 'SCORES'}`);
        write('serve-count', Math.ceil(match.serveTime));
        write('serve-direction', match.ball.vx > 0 ? 'SERVING RIGHT →' : '← SERVING LEFT');
    }
}

function input() {
    const axis = (up, down) => Number(keys.has(down)) - Number(keys.has(up));
    const left = axis('KeyW', 'KeyS') + (match.mode === 'solo' ? axis('ArrowUp', 'ArrowDown') : 0);
    return [{ axis: left, target: targets[0] }, { axis: axis('ArrowUp', 'ArrowDown'), target: targets[1] }];
}
const movementKeys = ['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'];
document.addEventListener('keydown', event => {
    const modal = match.phase === 'paused' ? $('pause-screen') : match.phase === 'over' ? $('game-over') : null;
    if (event.code === 'Tab' && modal) {
        const focusable = [...modal.querySelectorAll('button, input')].filter(element => element.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        return;
    }
    if (event.target.matches('input:not([type="radio"]), textarea')) return;
    if (event.code === 'KeyP' || event.code === 'Escape') {
        if (!event.repeat) { event.preventDefault(); match.phase === 'paused' ? resume() : pause(); }
        return;
    }
    if (event.target.closest('button, input, select')) return;
    if (event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) {
            if (match.phase === 'menu' || match.phase === 'over') startMatch();
            else if (match.phase === 'paused') resume(); else pause();
        }
        return;
    }
    if (movementKeys.includes(event.code) && ['playing', 'serving'].includes(match.phase)) {
        event.preventDefault(); keys.add(event.code);
        targets[event.code.startsWith('Key') || match.mode === 'solo' ? 0 : 1] = null;
    }
});
document.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { pause('Focus left the court. Resume when you’re ready.'); clearInput(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause('The match paused while you were away.'); clearInput(); } });

function pointerTarget(event, side) {
    const rect = canvas.getBoundingClientRect();
    targets[side] = (event.clientY - rect.top) / rect.height * COURT.height;
}
canvas.addEventListener('pointerdown', event => {
    if (!['playing', 'serving'].includes(match.phase)) return;
    event.preventDefault(); canvas.focus({ preventScroll: true }); prepareAudio();
    const rect = canvas.getBoundingClientRect();
    const side = match.mode === 'solo' || event.clientX < rect.left + rect.width / 2 ? 0 : 1;
    if ([...pointers.values()].includes(side)) return;
    pointers.set(event.pointerId, side); canvas.setPointerCapture(event.pointerId); pointerTarget(event, side);
});
canvas.addEventListener('pointermove', event => {
    if (!['playing', 'serving'].includes(match.phase)) return;
    if (pointers.has(event.pointerId)) pointerTarget(event, pointers.get(event.pointerId));
    else if (event.pointerType === 'mouse' && match.mode === 'solo') pointerTarget(event, 0);
});
function releasePointer(event) {
    const side = pointers.get(event.pointerId);
    if (side !== undefined) { targets[side] = null; pointers.delete(event.pointerId); }
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, releasePointer);
canvas.addEventListener('pointerleave', event => { if (!pointers.has(event.pointerId) && event.pointerType === 'mouse') targets[0] = null; });

function gameLoop(timestamp) {
    clock.advance(timestamp, () => {
        match.step(input());
        if (match.phase === 'playing' || match.phase === 'serving' || match.events.length) renderer.step(match);
        for (const event of match.events) {
            tone(event.type);
            if (event.type === 'point') write('announcer', `${playerName(event.side)} scored. ${match.scores[0]} to ${match.scores[1]}.`);
        }
    });
    syncUI(); renderer.draw(match);
    requestAnimationFrame(gameLoop);
}
renderRecords(); updateSoundButton(); syncUI();
requestAnimationFrame(gameLoop);
