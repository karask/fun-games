import { getHighScores, saveHighScore } from '../../assets/highscore.js';

export const scoreKey = difficulty => `snake_solo_${difficulty}`;

export function readScores(key) {
    try {
        return getHighScores(key).filter(entry => entry && typeof entry.name === 'string' &&
            Number.isFinite(entry.score) && entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    } catch {
        return [];
    }
}

export function qualifies(key, score) {
    const scores = readScores(key);
    return score > 0 && (scores.length < 5 || score > scores.at(-1).score);
}

export function saveScore(key, initials, score) {
    if (!/^[A-Z0-9]{1,3}$/.test(initials) || !Number.isFinite(score) || score <= 0) return false;
    try {
        saveHighScore(key, initials, score);
        return true;
    } catch {
        return false;
    }
}

export function renderScores(container, key) {
    container.replaceChildren();
    const scores = readScores(key);
    if (!scores.length) {
        const empty = document.createElement('p');
        empty.className = 'hint';
        empty.textContent = 'Your next run could start the leaderboard.';
        container.append(empty);
        return;
    }
    const table = document.createElement('table');
    table.className = 'scores';
    table.style.cssText = 'width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums';
    const header = table.createTHead().insertRow();
    ['Rank', 'Name', 'Score'].forEach(label => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = label;
        th.style.textAlign = label === 'Score' ? 'right' : 'left';
        header.append(th);
    });
    const body = table.createTBody();
    scores.forEach((entry, index) => {
        const row = body.insertRow();
        [index + 1, entry.name.slice(0, 3), entry.score].forEach((value, column) => {
            const cell = row.insertCell();
            cell.textContent = value;
            cell.style.cssText = `padding:6px 0;text-align:${column === 2 ? 'right' : 'left'}`;
        });
    });
    container.append(table);
}
