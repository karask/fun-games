// Shared high score utility for all games

const MAX_SCORES = 5;

/**
 * Retrieves the high scores for a given game ID.
 * @param {string} gameId - The ID of the game (e.g. 'snake', 'pong')
 * @returns {Array<{name: string, score: number}>} Array of top scores
 */
export function getHighScores(gameId) {
    const key = `fun_games_${gameId}_highscores`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    try {
        const scores = JSON.parse(data);
        return Array.isArray(scores) ? scores : [];
    } catch (e) {
        console.error("Error parsing high scores", e);
        return [];
    }
}

/**
 * Checks if a given score qualifies for the top 5.
 * @param {string} gameId
 * @param {number} score 
 * @returns {boolean} True if the score qualifies
 */
export function isHighScore(gameId, score) {
    if (score <= 0) return false;
    
    const scores = getHighScores(gameId);
    if (scores.length < MAX_SCORES) return true;
    
    // Check if the score beats the lowest score in the Top 5
    return score > scores[scores.length - 1].score;
}

/**
 * Saves a new high score, keeping only the Top 5.
 * @param {string} gameId 
 * @param {string} name - 3 letter initials
 * @param {number} score 
 */
export function saveHighScore(gameId, name, score) {
    let scores = getHighScores(gameId);
    
    scores.push({ name: name.toUpperCase().substring(0, 3), score: score });
    
    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);
    
    // Keep only top MAX_SCORES
    scores = scores.slice(0, MAX_SCORES);
    
    const key = `fun_games_${gameId}_highscores`;
    localStorage.setItem(key, JSON.stringify(scores));
}

/**
 * Helper to generate HTML for a leaderboard table specifically for game views
 * @param {string} gameId 
 * @returns {string} HTML string of the leaderboard
 */
export function generateLeaderboardHTML(gameId) {
    const scores = getHighScores(gameId);
    if (scores.length === 0) {
        return `<div style="text-align:center; color:#aaa; font-size:14px; margin: 10px 0;">NO HIGH SCORES YET</div>`;
    }
    
    let html = `<table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 16px;">`;
    html += `<tr><th style="padding: 5px; text-align: left; color: #fbc531;">Rnk</th><th style="padding: 5px; text-align: left; color: #fbc531;">Init</th><th style="padding: 5px; text-align: right; color: #fbc531;">Score</th></tr>`;
    
    scores.forEach((entry, idx) => {
        const rankColor = idx === 0 ? '#fbc531' : '#fff';
        html += `<tr style="color: ${rankColor};">
            <td style="padding: 5px;">#${idx + 1}</td>
            <td style="padding: 5px; font-weight: bold;">${entry.name}</td>
            <td style="padding: 5px; text-align: right;">${entry.score}</td>
        </tr>`;
    });
    
    html += `</table>`;
    return html;
}
