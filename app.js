// DuoVibe Group Mode (3–8 Players) — Real-Time Multiplayer

const MAX_PLAYERS = 8;
const MIN_PLAYERS = 3;

window.App = {
  currentRoom: null,
  players: [],
  activeGame: null,

  init() {
    console.log("DuoVibe Group Mode Ready — 3–8 Players per Room");
    this.checkOnlineStatus();
    this.bindEvents();
  },

  checkOnlineStatus() {
    const statusEl = document.getElementById('conn-status');
    if (!statusEl) return;
    statusEl.textContent = window.sb ? '• ONLINE' : '• OFFLINE';
    statusEl.className = window.sb ? 'status-badge online' : 'status-badge offline';
  },

  bindEvents() {
    document.getElementById('btn-create-room').onclick = () => this.createRoom();
    document.getElementById('btn-join-room').onclick = () => this.joinRoom();
  },

  async createRoom() {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await window.sb.from('rooms').insert([{ code: roomCode, players: [] }]);
    if (error) return alert("Room creation failed: " + error.message);
    this.currentRoom = roomCode;
    this.players = [{ id: window.sb.auth.user().id, name: "You" }];
    this.renderLobby();
    this.setupRealtime();
  },

  async joinRoom() {
    const roomCode = prompt("Enter 6-digit Room Code:");
    if (!roomCode) return;
    const { data, error } = await window.sb.from('rooms').select('*').eq('code', roomCode).single();
    if (error || !data) return alert("Room not found or full.");
    if (data.players.length >= MAX_PLAYERS) return alert("Room is full (max 8 players).");
    this.currentRoom = roomCode;
    this.players = data.players;
    this.renderLobby();
    this.setupRealtime();
  },

  setupRealtime() {
    window.sb.channel('room_' + this.currentRoom)
      .on('presence', { event: 'sync' }, () => {
        const newState = window.sb.channel('room_' + this.currentRoom).presenceState();
        this.players = Object.values(newState).map(p => p[0]);
        this.renderLobby();
      })
      .subscribe();
  },

  renderLobby() {
    const container = document.getElementById('lobby-games');
    if (!container) return;

    let html = 
      <div class="lobby-header-bar">
        <h3>Room:  + this.currentRoom +  ( + this.players.length + / + MAX_PLAYERS +  players)</h3>
        <div class="player-list">
           + this.players.map(p => <span class="player-badge"> + (p.name || "Guest") + </span>).join('') + 
        </div>
        <button onclick="window.Features.toggleCallWidget()" class="call-action-btn">🎙️ Group Voice/Video Call</button>
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
    this.activeGame = gameId;
    const gameArea = document.getElementById('active-game-area');
    if (!gameArea) return;

    gameArea.style.display = 'block';
    gameArea.innerHTML = 
      <div class="game-play-wrapper">
        <div class="game-top-bar">
          <button class="btn-back" onclick="App.renderLobby()">← Back to Lobby</button>
          <button class="btn-call-mini" onclick="window.Features.toggleCallWidget()">🎙️ Group Call</button>
        </div>
        <div id="game-live-content">
          <h2> + gameId.toUpperCase() + </h2>
          <p>Group mode active!  + this.players.length +  players in sync.</p>
        </div>
      </div>
    ;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());