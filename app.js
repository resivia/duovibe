// DuoVibe Direct Real-Time Broadcast & Presence Engine
const SUPABASE_URL = (window.CONFIG && window.CONFIG.SUPABASE_URL) || "https://euqrzxxldlsbhuyjuleo.supabase.co";
const SUPABASE_KEY = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cXJ6eHhsZGxzYmh1eWp1bGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTUzOTAsImV4cCI6MjA5MzIzMTM5MH0.J4zrhIzjIBkUmxHEPcaoxgoFudtAvXHmJaPToigR_ig";

let sbClient = null;

function initSupabase() {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    try {
      sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        realtime: { params: { eventsPerSecond: 10 } }
      });
      window.sb = sbClient;
    } catch (e) {
      console.error("Supabase init error:", e);
    }
  }
}

window.Picker = {
  nextItem(bankKey, bankArray) {
    if (!bankArray || !bankArray.length) return null;
    const storageKey = "duo_seen_" + bankKey;
    let seen = [];
    try {
      seen = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(seen)) seen = [];
    } catch (e) { seen = []; }

    if (seen.length >= bankArray.length) seen = [];
    const unseen = bankArray.map((_, i) => i).filter(i => !seen.includes(i));
    const randomIdx = unseen[Math.floor(Math.random() * unseen.length)];
    seen.push(randomIdx);
    try { localStorage.setItem(storageKey, JSON.stringify(seen)); } catch (e) {}
    return bankArray[randomIdx];
  },
  freshNumber(min, max) {
    min = min || 1; max = max || 100;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  freshBlindRankSet(count) {
    count = count || 5;
    const bank = window.BANKS ? (window.BANKS.blindRankItems || []) : ["Movie Night", "Beach", "Dinner"];
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
};

window.App = {
  myId: "user_" + Math.random().toString(36).slice(2, 10),
  myName: localStorage.getItem("duo_my_name") || ("Player " + Math.floor(Math.random() * 100)),
  roomCode: null,
  activeGame: null,
  gameState: { choices: {} },
  channel: null,
  peers: {},

  init() {
    initSupabase();
    this.updateStatus("online", "ONLINE");
    this.renderHome();
  },

  updateStatus(cls, txt) {
    const el = document.getElementById("conn-status");
    if (el) { el.className = "status-badge " + cls; el.textContent = txt; }
  },

  renderHome() {
    const c = document.getElementById("main-content");
    if (!c) return;
    c.innerHTML = `
      <div class="home-card">
        <h2>Welcome to DuoVibe 💕</h2>
        <p>Play real-time games with your partner or friends instantly.</p>
        
        <div style="margin-top:16px;">
          <label style="font-size:13px; font-weight:800; color:#666;">YOUR NAME:</label>
          <input id="input-my-name" value="${this.myName}" class="game-input" placeholder="Your name" />
        </div>

        <div style="margin-top:16px;">
          <button class="btn-primary" onclick="App.createRoom()">✨ Create New Room</button>
          <div class="divider">OR JOIN</div>
          <div style="display:flex; gap:8px;">
            <input id="input-room-code" placeholder="6-DIGIT CODE" class="game-input" style="text-transform:uppercase; letter-spacing:2px; text-align:center;" maxlength="6" />
            <button class="btn-secondary" style="width:110px;" onclick="App.joinRoomWithCode()">Join</button>
          </div>
        </div>
      </div>
    `;
  },

  saveName() {
    const el = document.getElementById("input-my-name");
    if (el && el.value.trim()) {
      this.myName = el.value.trim();
      localStorage.setItem("duo_my_name", this.myName);
    }
  },

  createRoom() {
    this.saveName();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.joinRoom(code);
  },

  joinRoomWithCode() {
    this.saveName();
    const el = document.getElementById("input-room-code");
    const code = el ? el.value.trim().toUpperCase() : "";
    if (code.length === 6) {
      this.joinRoom(code);
    } else {
      alert("Please enter a valid 6-character room code.");
    }
  },

  joinRoom(code) {
    this.roomCode = code;
    this.activeGame = null;
    this.gameState = { choices: {} };
    this.renderLobby();

    if (!sbClient) initSupabase();
    if (!sbClient) {
      alert("Supabase client not initialized.");
      return;
    }

    // Remove existing channel if any
    if (this.channel) {
      try { sbClient.removeChannel(this.channel); } catch (e) {}
    }

    const channelName = "duovibe_live_room_" + code;
    this.channel = sbClient.channel(channelName, {
      config: {
        presence: { key: this.myId },
        broadcast: { self: true }
      }
    });

    this.channel
      .on("presence", { event: "sync" }, () => {
        const state = this.channel.presenceState();
        this.peers = state;
        const count = Object.keys(state).length || 1;
        this.updateStatus("live", "LIVE (" + count + ")");
        this.updatePresenceUI();
      })
      .on("broadcast", { event: "GAME_ACTION" }, ({ payload }) => {
        if (!payload) return;

        if (payload.action === "START") {
          this.activeGame = payload.gameId;
          this.gameState = payload.gameState || { choices: {} };
          this.renderActiveGame();
        } else if (payload.action === "CHOICE") {
          if (!this.gameState.choices) this.gameState.choices = {};
          this.gameState.choices[payload.playerId] = payload.choice;
          this.renderActiveGame();

          if (Object.keys(this.gameState.choices).length >= 2 && window.confetti) {
            window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          }
        } else if (payload.action === "EXIT") {
          this.activeGame = null;
          this.gameState = { choices: {} };
          this.renderLobby();
        } else if (payload.action === "CLUE") {
          if (this.gameState) {
            this.gameState.clueIdx = payload.clueIdx;
            this.renderActiveGame();
          }
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.updateStatus("live", "LIVE");
          this.channel.track({ id: this.myId, name: this.myName, joinedAt: Date.now() });

          // Request state in case another player is already playing
          this.broadcastAction({ action: "REQUEST_STATE", playerId: this.myId });
        } else if (status === "CHANNEL_ERROR") {
          this.updateStatus("offline", "CHANNEL ERR");
        }
      });
  },

  broadcastAction(payload) {
    if (this.channel) {
      this.channel.send({
        type: "broadcast",
        event: "GAME_ACTION",
        payload: payload
      });
    }
  },

  updatePresenceUI() {
    const container = document.getElementById("connected-players-list");
    if (!container) return;

    const names = [];
    Object.keys(this.peers).forEach((key) => {
      const p = this.peers[key];
      if (p && p[0] && p[0].name) {
        const isMe = key === this.myId;
        names.push(`🟢 ${p[0].name}${isMe ? " (You)" : ""}`);
      }
    });

    if (names.length === 0) names.push(`🟢 ${this.myName} (You)`);
    container.innerHTML = names.map(n => `<span class="player-tag">${n}</span>`).join(" ");
  },

  renderLobby() {
    const c = document.getElementById("main-content");
    if (!c) return;

    c.innerHTML = `
      <div class="lobby-card">
        <div class="lobby-header-bar">
          <div>
            <span class="room-label">ROOM CODE</span>
            <h2 class="room-code-display">${this.roomCode}</h2>
          </div>
          <button class="btn-primary" style="width:auto;min-height:36px;padding:6px 12px;font-size:13px;" onclick="navigator.clipboard.writeText('${this.roomCode}'); alert('Room code copied!');">📋 Copy</button>
        </div>

        <div style="margin: 16px 0;">
          <label style="font-size:11px; font-weight:800; color:#8E8E93; letter-spacing:1px;">PLAYERS IN ROOM:</label>
          <div id="connected-players-list" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
            <span class="player-tag">🟢 ${this.myName} (You)</span>
          </div>
        </div>

        <h3 style="margin-top:20px;">Select a Game</h3>
        <div class="games-grid-container">
          <div class="game-card" onclick="App.launchGame('blind-rank')"><span>🙈</span> <h4>Blind Rank</h4></div>
          <div class="game-card" onclick="App.launchGame('truths-lie')"><span>🤫</span> <h4>2 Truths 1 Lie</h4></div>
          <div class="game-card" onclick="App.launchGame('would-rather')"><span>⚖️</span> <h4>Would You Rather</h4></div>
          <div class="game-card" onclick="App.launchGame('this-or-that')"><span>🔄</span> <h4>This or That</h4></div>
          <div class="game-card" onclick="App.launchGame('red-green-flag')"><span>🚩</span> <h4>Red/Green Flag</h4></div>
          <div class="game-card" onclick="App.launchGame('couple-compat')"><span>💖</span> <h4>Compat Quiz</h4></div>
          <div class="game-card" onclick="App.launchGame('word-letters')"><span>🔤</span> <h4>First/Last Letter</h4></div>
          <div class="game-card" onclick="App.launchGame('categories-bomb')"><span>💣</span> <h4>Pass The Bomb</h4></div>
          <div class="game-card" onclick="App.launchGame('guess-age')"><span>📅</span> <h4>Guess The Year</h4></div>
          <div class="game-card" onclick="App.launchGame('guess-number')"><span>🔢</span> <h4>Guess Number</h4></div>
          <div class="game-card" onclick="App.launchGame('guess-celeb')"><span>⭐</span> <h4>Guess Celeb</h4></div>
        </div>
      </div>
    `;
    this.updatePresenceUI();
  },

  launchGame(gameId) {
    this.activeGame = gameId;
    this.gameState = { choices: {}, currentPrompt: null, rankSet: null, secretNumber: null, clueIdx: 0 };

    if (gameId === "would-rather") this.gameState.currentPrompt = window.Picker.nextItem("wouldRather", window.BANKS.wouldRather);
    if (gameId === "this-or-that") this.gameState.currentPrompt = window.Picker.nextItem("thisOrThat", window.BANKS.thisOrThat);
    if (gameId === "red-green-flag") this.gameState.currentPrompt = window.Picker.nextItem("redGreenFlag", window.BANKS.redGreenFlag);
    if (gameId === "couple-compat") this.gameState.currentPrompt = window.Picker.nextItem("compatQuiz", window.BANKS.compatQuiz);
    if (gameId === "word-letters") this.gameState.currentPrompt = window.Picker.nextItem("letterPrompts", window.BANKS.letterPrompts);
    if (gameId === "categories-bomb") this.gameState.currentPrompt = window.Picker.nextItem("bombCategories", window.BANKS.bombCategories);
    if (gameId === "guess-age") this.gameState.currentPrompt = window.Picker.nextItem("guessAge", window.BANKS.guessAge);
    if (gameId === "guess-celeb") { this.gameState.currentPrompt = window.Picker.nextItem("guessCeleb", window.BANKS.guessCeleb); this.gameState.clueIdx = 0; }
    if (gameId === "guess-number") this.gameState.secretNumber = window.Picker.freshNumber(1, 100);
    if (gameId === "blind-rank") this.gameState.rankSet = window.Picker.freshBlindRankSet(5);

    this.broadcastAction({ action: "START", gameId: gameId, gameState: this.gameState });
    this.renderActiveGame();
    window.scrollTo(0, 0);
  },

  exitGame() {
    this.activeGame = null;
    this.gameState = { choices: {} };
    this.broadcastAction({ action: "EXIT" });
    this.renderLobby();
  },

  submitChoice(val) {
    if (!val || !val.toString().trim()) { alert("Please enter or select an answer first."); return; }
    if (!this.gameState.choices) this.gameState.choices = {};

    this.gameState.choices[this.myId] = val.toString().trim();

    this.broadcastAction({
      action: "CHOICE",
      playerId: this.myId,
      choice: val.toString().trim()
    });

    this.renderActiveGame();

    if (Object.keys(this.gameState.choices).length >= 2 && window.confetti) {
      window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  },

  getPlayerNameById(id) {
    if (id === this.myId) return "You";
    const p = this.peers[id];
    if (p && p[0] && p[0].name) return p[0].name;
    return "Partner";
  },

  renderChoiceComparison() {
    const choices = this.gameState.choices || {};
    const keys = Object.keys(choices);

    if (keys.length === 0) {
      return '<div class="comparison-bar" style="text-align:center; font-size:13px; color:#666;">Waiting for answers...</div>';
    }

    let html = '<div class="comparison-bar">';
    keys.forEach(k => {
      html += `<div class="choice-row">
        <strong>${esc(this.getPlayerNameById(k))}:</strong>
        <span>${esc(choices[k])}</span>
      </div>`;
    });

    if (keys.length >= 2) {
      const vals = keys.map(k => choices[k]);
      const match = vals.every(v => v === vals[0]);
      html += `<div style="text-align:center; font-weight:800; margin-top:10px; color:${match ? '#137333' : '#1A1A1A'}; font-size:15px;">
        ${match ? '🎉 MATCH!' : '🤝 Different choices'}
      </div>`;
    }

    html += '</div>';
    return html;
  },

  renderActiveGame() {
    const container = document.getElementById("main-content");
    if (!container) return;

    if (!this.activeGame) {
      this.renderLobby();
      return;
    }

    let body = "";
    const cur = this.gameState.currentPrompt;
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    switch (this.activeGame) {
      case "would-rather":
        body = `
          <h3>Would You Rather...</h3>
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
            <button class="btn-choice ${myChoice === cur.a ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.a)}')">${esc(cur.a)}</button>
            <div class="divider">OR</div>
            <button class="btn-choice ${myChoice === cur.b ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.b)}')">${esc(cur.b)}</button>
          </div>
        `;
        break;

      case "this-or-that":
        body = `
          <h3>This or That</h3>
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
            <button class="btn-choice ${myChoice === cur.a ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.a)}')">${esc(cur.a)}</button>
            <div class="divider">VS</div>
            <button class="btn-choice ${myChoice === cur.b ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.b)}')">${esc(cur.b)}</button>
          </div>
        `;
        break;

      case "red-green-flag":
        body = `
          <h3>Red Flag or Green Flag?</h3>
          <p style="font-weight:600; font-size:16px; margin:16px 0;">"${esc(cur)}"</p>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="btn-choice ${myChoice === '🟢 Green Flag' ? 'selected' : ''}" onclick="App.submitChoice('🟢 Green Flag')">🟢 Green Flag</button>
            <button class="btn-choice ${myChoice === '🚩 Red Flag' ? 'selected' : ''}" onclick="App.submitChoice('🚩 Red Flag')">🚩 Red Flag</button>
          </div>
        `;
        break;

      case "couple-compat":
        body = `
          <h3>Compatibility Quiz</h3>
          <p style="font-weight:600; font-size:16px; margin:16px 0;">${esc(cur)}</p>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="btn-choice ${myChoice === 'ME' ? 'selected' : ''}" onclick="App.submitChoice('ME')">🙋‍♂️ Definitely Me</button>
            <button class="btn-choice ${myChoice === 'PARTNER' ? 'selected' : ''}" onclick="App.submitChoice('PARTNER')">🙋‍♀️ Definitely Partner</button>
          </div>
        `;
        break;

      case "word-letters":
        body = `
          <h3>🔤 First / Last Letter</h3>
          <p style="margin-top:12px;">Category: <strong>${esc(cur.category)}</strong></p>
          <p style="margin-bottom:12px;">Must start with letter: <strong style="font-size:20px;">'${esc(cur.letter)}'</strong></p>
          <input type="text" id="game-input-val" placeholder="Type word..." class="game-input" />
          <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('game-input-val').value)">Submit Word</button>
        `;
        break;

      case "categories-bomb":
        body = `
          <h3>💣 Pass The Bomb</h3>
          <p style="margin:12px 0;">Category: <strong>${esc(cur)}</strong></p>
          <input type="text" id="game-input-val" placeholder="Type word fast..." class="game-input" />
          <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('game-input-val').value)">PASS BOMB 💣</button>
        `;
        break;

      case "guess-age":
        body = `
          <h3>📅 Guess The Year</h3>
          <div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:16px; border-radius:12px; font-weight:600; text-align:center; margin:12px 0;">"${esc(cur.subject)}"</div>
          <input type="number" id="game-input-val" placeholder="Enter year..." class="game-input" />
          <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('game-input-val').value)">Submit Guess</button>
          <button class="btn-secondary" style="margin-top:8px;" onclick="alert('Correct Answer: ' + App.gameState.currentPrompt.answer)">Reveal Correct Year</button>
        `;
        break;

      case "guess-number":
        const guess = myChoice ? parseInt(myChoice) : null;
        const secret = this.gameState.secretNumber;
        let hint = "";
        if (guess !== null && !isNaN(guess)) {
          if (guess === secret) hint = "🎉 CORRECT!";
          else if (guess < secret) hint = "📈 Higher";
          else hint = "📉 Lower";
        }
        body = `
          <h3>🔢 Guess Secret Number (1-100)</h3>
          <input type="number" id="game-input-val" placeholder="Enter 1-100..." class="game-input" />
          <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('game-input-val').value)">Submit Guess</button>
          ${myChoice ? `<p style="font-weight:700; margin-top:10px;">Your Guess: ${myChoice} — ${hint}</p>` : ""}
        `;
        break;

      case "guess-celeb":
        const clueIdx = this.gameState.clueIdx || 0;
        const cluesShown = cur.clues.slice(0, clueIdx + 1);
        body = `
          <h3>⭐ Guess The Celebrity</h3>
          <div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:12px; border-radius:12px; margin:12px 0;">
            ${cluesShown.map((c, i) => `<p style="margin-bottom:4px;"><strong>Clue #${i + 1}:</strong> ${esc(c)}</p>`).join("")}
          </div>
          ${clueIdx < cur.clues.length - 1 ? `<button class="btn-secondary" style="margin-bottom:10px;" onclick="App.gameState.clueIdx++; App.broadcastAction({action:'CLUE', clueIdx:App.gameState.clueIdx}); App.renderActiveGame();">Reveal Next Clue 💡</button>` : ""}
          <input type="text" id="game-input-val" placeholder="Type answer..." class="game-input" />
          <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('game-input-val').value)">Submit Guess</button>
          <button class="btn-secondary" style="margin-top:8px;" onclick="alert('Correct Answer: ' + App.gameState.currentPrompt.answer)">Reveal Celebrity</button>
        `;
        break;

      case "blind-rank":
        const rankSet = this.gameState.rankSet || [];
        body = `
          <h3>🙈 Blind Ranking</h3>
          <p style="font-size:13px; color:#666; margin-bottom:12px;">Rank these items 1 to 5:</p>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${rankSet.map((item, i) => `
              <div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:10px 14px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; font-weight:600;">
                <span>${i + 1}. ${esc(item)}</span>
                <button class="btn-secondary" style="width:auto; min-height:36px; padding:4px 10px; font-size:12px;" onclick="App.submitChoice('Ranked #${i + 1}: ${esc(item)}')">Rank #${i + 1}</button>
              </div>
            `).join("")}
          </div>
        `;
        break;

      case "truths-lie":
        body = `
          <h3>🤫 2 Truths & 1 Lie</h3>
          <p style="font-size:13px; color:#666; margin-bottom:12px;">Enter 2 truths and 1 lie:</p>
          <input type="text" id="truth1" class="game-input" placeholder="Truth #1..." />
          <input type="text" id="truth2" class="game-input" placeholder="Truth #2..." style="margin-top:8px;" />
          <input type="text" id="lie" class="game-input" placeholder="The Lie..." style="margin-top:8px;" />
          <button class="btn-action" style="margin-top:12px;" onclick="App.submitChoice('1: ' + document.getElementById('truth1').value + ' | 2: ' + document.getElementById('truth2').value + ' | LIE: ' + document.getElementById('lie').value)">Submit Statements</button>
        `;
        break;
    }

    container.innerHTML = `
      <div class="active-game-wrapper">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <button class="btn-secondary" style="width:auto; min-height:36px; padding:6px 12px; font-size:13px;" onclick="App.exitGame()">← Lobby</button>
          <span style="font-weight:800; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#8E8E93;">${esc(this.activeGame)}</span>
        </div>
        ${body}
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:16px;" onclick="App.launchGame('${this.activeGame}')">Next Round →</button>
      </div>
    `;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.App.init();
});