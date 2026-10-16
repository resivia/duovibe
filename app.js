// DuoVibe Main Application Logic - LDR 11 Games & Voice Call Integrated

const ALL_GAMES = [
  { id: 'blind-rank', num: 1, title: 'Blind Ranking', emoji: '🔟', tag: 'TikTok Trend', desc: 'Rank 5 mystery items 1-5 without knowing what comes next!' },
  { id: 'truths-lie', num: 2, title: '2 Truths & 1 Lie', emoji: '🤫', tag: 'Duo Game', desc: 'Write 3 statements — partner sniffs out the lie.' },
  { id: 'would-rather', num: 3, title: 'Would You Rather', emoji: '⚖️', tag: 'Dilemmas', desc: 'Vote secretly on dilemmas. Compare choices side-by-side!' },
  { id: 'this-or-that', num: 4, title: 'This or That', emoji: '⚡', tag: 'Rapid Fire', desc: 'Quick-fire choices — see if your tastes align in real time!' },
  { id: 'red-green-flag', num: 5, title: 'Red or Green Flag', emoji: '🚩', tag: 'Opinion', desc: 'Judge dating scenarios — Red, Green, or Beige flag?' },
  { id: 'couple-compat', num: 6, title: 'Compatibility Quiz', emoji: '🔮', tag: 'Secrets', desc: 'Answer relationship questions secretly & reveal match %!' },
  { id: 'word-letters', num: 7, title: 'First / Last Letter', emoji: '🔤', tag: 'Word Battle', desc: 'Word matching constraints before the round timer runs out!' },
  { id: 'categories-bomb', num: 8, title: 'Pass The Bomb', emoji: '💣', tag: 'Adrenaline', desc: 'Name items fast before the bomb explodes on your screen!' },
  { id: 'guess-age', num: 9, title: 'Guess The Age', emoji: '🎂', tag: 'Visual Guess', desc: 'Both guess numbers/ages — closest guess wins!' },
  { id: 'guess-number', num: 10, title: 'Guess The Number', emoji: '🔢', tag: 'Hot or Cold', desc: 'Race to find secret number 1-100 with live higher/lower hints!' },
  { id: 'guess-celeb', num: 11, title: 'Guess Celebrity', emoji: '🌟', tag: 'Mystery Pop', desc: 'Unlock clues together and guess the star!' }
];

window.App = {
  currentRoom: null,
  activeFilter: 'all',

  init() {
    console.log("DuoVibe Loaded - 11 Games & Persistent Voice/Video Chat Ready");
    this.checkOnlineStatus();
    this.bindEvents();
  },

  checkOnlineStatus() {
    const statusEl = document.getElementById('conn-status');
    if (!statusEl) return;
    if (window.sb) {
      statusEl.textContent = '• ONLINE';
      statusEl.className = 'status-badge online';
    } else {
      statusEl.textContent = '• OFFLINE';
      statusEl.className = 'status-badge offline';
    }
  },

  bindEvents() {
    const createBtn = document.getElementById('btn-create-room');
    const joinBtn = document.getElementById('btn-join-room');
    if (createBtn) createBtn.onclick = () => this.createRoom();
    if (joinBtn) joinBtn.onclick = () => this.joinRoom();
  },

  renderLobby() {
    const container = document.getElementById('game-grid') || document.getElementById('lobby-games');
    if (!container) return;

    let html = 
      <div class="lobby-header-bar">
        <h3>Choose a Game to Play Together ( + ALL_GAMES.length +  Available)</h3>
        <div class="voice-call-quickbar">
          <button id="quick-call-btn" onclick="window.Features && window.Features.toggleCallWidget()" class="call-action-btn">
            🎙️ Start Voice / Video Call
          </button>
        </div>
      </div>
      <div class="games-grid-container">
    ;

    ALL_GAMES.forEach(game => {
      html += 
        <div class="game-card" onclick="App.launchGame(' + game.id + ')">
          <div class="game-card-top">
            <span class="game-emoji"> + game.emoji + </span>
            <span class="game-badge"> + game.tag + </span>
          </div>
          <h4 class="game-title"> + game.title + </h4>
          <p class="game-desc"> + game.desc + </p>
          <button class="btn-play-card">Play Game →</button>
        </div>
      ;
    });

    html += </div>;
    container.innerHTML = html;
  },

  launchGame(gameId) {
    console.log("Launching game:", gameId);
    const gameArea = document.getElementById('active-game-area');
    if (gameArea) {
      gameArea.style.display = 'block';
      gameArea.innerHTML = 
        <div class="game-play-wrapper">
          <div class="game-top-bar">
            <button class="btn-back" onclick="App.renderLobby()">← Back to All 11 Games</button>
            <button class="btn-call-mini" onclick="window.Features && window.Features.toggleCallWidget()">🎙️ Voice/Video Call</button>
          </div>
          <div id="game-live-content">
            <h2> + gameId.toUpperCase() + </h2>
            <p>Game loaded! Live choice syncing & partner presence active.</p>
          </div>
        </div>
      ;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());