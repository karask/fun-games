import { generateLeaderboardHTML } from './assets/highscore.js';

// Game Data
const games = [
    {
        id: 'snake',
        title: 'Neon Snake',
        genre: 'Classic Arcade',
        thumb: 'assets/snake_thumb.png',
        url: 'games/snake/index.html'
    },
    {
        id: 'pong',
        title: 'Cyber Pong',
        genre: 'Sports Arcade',
        thumb: 'assets/pong_thumb.png',
        url: 'games/pong/index.html'
    },
    {
        id: 'survival',
        title: 'Neon Survival',
        genre: 'Top-Down Shooter',
        thumb: 'assets/survival_thumb.png',
        url: 'games/survival/index.html'
    },
    {
        id: 'tinydungeon',
        title: 'Tiny Dungeon',
        genre: 'Roguelike RPG',
        thumb: 'assets/tinydungeon_thumb.png',
        url: 'games/tinydungeon/index.html'
    },
    {
        id: 'breakout',
        title: 'Neon Breakout',
        genre: 'Brick Breaker',
        thumb: 'assets/breakout_thumb.png',
        url: 'games/breakout/index.html'
    },
    {
        id: 'neondog',
        title: 'Neon Dog',
        genre: 'Platformer',
        thumb: 'assets/neondog_thumb.png',
        url: 'games/neondog/index.html'
    }
];

// DOM Elements
const gameListEl = document.getElementById('game-list');
const gameFrame = document.getElementById('game-frame');
const emptyState = document.getElementById('empty-state');
const currentGameTitle = document.getElementById('current-game-title');

// Modal Elements
const leaderboardBtn = document.getElementById('leaderboard-btn');
const hsModal = document.getElementById('hs-modal');
const closeModalBtn = document.getElementById('close-modal');
const hsTabs = document.getElementById('hs-tabs');
const hsContent = document.getElementById('hs-content');

// Initialize App
function init() {
    renderGameList();
    setupLeaderboardUI();

    // Handle iframe load event for smooth appearance
    gameFrame.addEventListener('load', () => {
        if (gameFrame.src && gameFrame.src !== window.location.href && gameFrame.src !== 'about:blank') {
            gameFrame.classList.add('loaded');
            gameFrame.focus();
        }
    });
}

// Render dynamic game list in sidebar
function renderGameList() {
    gameListEl.innerHTML = '';

    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.id = game.id;

        card.innerHTML = `
            <img src="${game.thumb}" alt="${game.title}" class="game-thumb">
            <div class="game-info">
                <span class="game-title">${game.title}</span>
                <span class="game-genre">${game.genre}</span>
            </div>
        `;

        card.addEventListener('click', () => selectGame(game));
        gameListEl.appendChild(card);
    });
}

// Handle game selection
function selectGame(game) {
    // Update active styling
    document.querySelectorAll('.game-card').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.id === game.id) {
            el.classList.add('active');
        }
    });

    // Update UI headers
    currentGameTitle.textContent = game.title;

    // Switch views
    emptyState.style.display = 'none';

    // Load game (smooth transition reset)
    gameFrame.classList.remove('loaded');
    gameFrame.style.display = 'block';

    // Slight delay before changing src ensures the fade-out effect
    setTimeout(() => {
        gameFrame.src = game.url;
    }, 50);
}

// Setup Modal
function setupLeaderboardUI() {
    leaderboardBtn.addEventListener('click', () => {
        hsModal.classList.add('show');
        renderLeaderboardModal();
    });

    closeModalBtn.addEventListener('click', () => {
        hsModal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === hsModal) {
            hsModal.classList.remove('show');
        }
    });
}

function renderLeaderboardModal() {
    hsTabs.innerHTML = '';
    
    // Create tabs
    games.forEach((game, index) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
        btn.textContent = game.title;
        btn.onclick = () => renderTabContent(game.id, btn);
        hsTabs.appendChild(btn);
    });

    // Render first tab by default
    if (games.length > 0) {
        renderTabContent(games[0].id, hsTabs.firstChild);
    }
}

function renderTabContent(gameId, activeBtn) {
    // Update active tab styles
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');

    // Get and set html from our shared library
    hsContent.innerHTML = generateLeaderboardHTML(gameId);
}

// Bootstrap
document.addEventListener('DOMContentLoaded', init);
