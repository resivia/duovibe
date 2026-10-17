(function () {
  "use strict";

  function esc(val) {
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const SUPABASE_URL = (window.CONFIG && window.CONFIG.SUPABASE_URL) || "https://euqrzxxldlsbhuyjuleo.supabase.co";
  const SUPABASE_KEY = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cXJ6eHhsZGxzYmh1eWp1bGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTUzOTAsImV4cCI6MjA5MzIzMTM5MH0.J4zrhIzjIBkUmxHEPcaoxgoFudtAvXHmJaPToigR_ig";

  function getClient() {
    if (window.sb) return window.sb;
    if (window.supabase && typeof window.supabase.createClient === "function") {
      window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return window.sb;
    }
    return null;
  }

  window.App = {
    myId: "user_" + Math.random().toString(36).slice(2, 10),
    myName: localStorage.getItem("duo_my_name") || ("Player " + Math.floor(Math.random() * 100)),
    myRole: "player",
    roomCode: null,
    activeGame: null,
    gameState: { choices: {}, players: {}, hostId: null },
    pollTimer: null,
    lastHash: "",
    lastLog: "App ready.",

    init() {
      try {
        getClient();
        this.renderHome();
      } catch (err) {
        console.error("Init error:", err);
      }
    },

    isHost() {
      return this.gameState.hostId === this.myId;
    },

    log(msg, isErr = false) {
      console.log("DuoVibe:", msg);
      this.lastLog = (isErr ? "[ERR] " : "[OK] ") + msg;
      const dbg = document.getElementById("debug-hud");
      if (dbg) dbg.textContent = this.lastLog;
    },

    renderHome() {
      const c = document.getElementById("main-content");
      if (!c) return;
      c.innerHTML = `
        <div class="home-card">
          <h2>Welcome to DuoVibe 🎮</h2>
          <p>Play live social media games with your partner or friends.</p>
          <div style="margin-top:16px;">
            <label style="font-size:13px; font-weight:800; color:#666;">YOUR NAME</label>
            <input id="input-my-name" value="${esc(this.myName)}" class="game-input" placeholder="Your name" />
          </div>
          <div style="margin-top:16px;">
            <button class="btn-primary" onclick="App.createRoom()">👑 Create Room (Host)</button>
            <div class="divider">OR JOIN AS PLAYER</div>
            <div style="display:flex; gap:8px;">
              <input id="input-room-code" placeholder="6-DIGIT CODE" class="game-input" style="text-transform:uppercase; letter-spacing:2px; text-align:center;" maxlength="6" />
              <button class="btn-secondary" style="width:110px;" onclick="App.joinRoomWithCode()">Join</button>
            </div>
          </div>
          <button class="btn-secondary" style="margin-top:16px; background:#FAF9F7; border:1px solid #E8E6E3; font-size:12px;" onclick="App.testConnection()">⚡ Test Connection</button>
          <div id="debug-hud" style="margin-top:12px; font-size:11px; background:#1A1A1A; color:#00FF66; padding:10px; border-radius:10px; font-family:monospace; text-align:left; word-break:break-all;">Ready</div>
        </div>
      `;
    },

    async testConnection() {
      const sb = getClient();
      if (!sb) { alert("Supabase failed to load."); return; }
      try {
        const { error } = await sb.from("rooms").select("id").limit(1);
        if (error) alert("DB Error: " + error.message);
        else alert("Connected to Supabase rooms table!");
      } catch (err) {
        alert("Exception: " + err.message);
      }
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
      this.myRole = "host";
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.joinRoom(code, true);
    },

    joinRoomWithCode() {
      this.saveName();
      this.myRole = "player";
      const el = document.getElementById("input-room-code");
      const code = el ? el.value.trim().toUpperCase() : "";
      if (code.length === 6) this.joinRoom(code, false);
      else alert("Enter a valid 6-digit room code.");
    },

    async joinRoom(code, creatingAsHost) {
      this.roomCode = code;
      this.activeGame = null;
      this.gameState = { choices: {}, players: {}, hostId: creatingAsHost ? this.myId : null };
      this.renderLobby();

      const sb = getClient();
      if (!sb) return;

      try {
        let { data: room, error } = await sb.from("rooms").select("*").eq("id", code).maybeSingle();
        if (!room) {
          if (!creatingAsHost) {
            alert("Room " + code + " not found. Ask the host to create it first!");
            this.renderHome();
            return;
          }
          const state = {
            hostId: this.myId,
            players: { [this.myId]: { name: this.myName, role: "host" } },
            choices: {}
          };
          await sb.from("rooms").insert({ id: code, current_game: "", game_state: state });
          this.gameState = state;
        } else {
          let state = room.game_state || { choices: {}, players: {}, hostId: null };
          state.players = state.players || {};
          if (!state.hostId && creatingAsHost) state.hostId = this.myId;

          const assignedRole = (state.hostId === this.myId) ? "host" : "player";
          this.myRole = assignedRole;
          state.players[this.myId] = { name: this.myName, role: assignedRole };

          await sb.from("rooms").update({ game_state: state, updated_at: new Date().toISOString() }).eq("id", code);

          this.activeGame = room.current_game || null;
          this.gameState = state;
        }

        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(() => this.pollDB(), 1200);
        this.renderLobby();
      } catch (e) {
        console.error("Join error:", e);
      }
    },

    async pollDB() {
      const sb = getClient();
      if (!this.roomCode || !sb) return;
      try {
        let { data: room, error } = await sb.from("rooms").select("*").eq("id", this.roomCode).maybeSingle();
        if (error || !room) return;

        const remoteGame = room.current_game || "";
        const remoteState = room.game_state || { choices: {}, players: {}, hostId: null };
        remoteState.players = remoteState.players || {};
        remoteState.choices = remoteState.choices || {};

        let needsSync = false;
        if (!remoteState.players[this.myId]) {
          remoteState.players[this.myId] = { name: this.myName, role: this.myRole };
          needsSync = true;
        }

        if (this.gameState.choices && this.gameState.choices[this.myId]) {
          if (remoteState.choices[this.myId] !== this.gameState.choices[this.myId]) {
            remoteState.choices[this.myId] = this.gameState.choices[this.myId];
            needsSync = true;
          }
        }

        if (needsSync) {
          await sb.from("rooms").update({ game_state: remoteState, updated_at: new Date().toISOString() }).eq("id", this.roomCode);
        }

        const hash = JSON.stringify({ g: remoteGame, s: remoteState });
        if (hash !== this.lastHash) {
          this.lastHash = hash;
          this.activeGame = remoteGame || null;
          this.gameState = remoteState;
          this.renderCurrentView();
        }
      } catch (e) {}
    },

    renderCurrentView() {
      if (this.activeGame) {
        if (!document.querySelector(".active-game-wrapper")) {
          this.renderActiveGame();
        } else {
          this.updateGameChoicesUI();
        }
      } else {
        if (!document.querySelector(".lobby-card")) {
          this.renderLobby();
        } else {
          this.updatePlayersUI(this.gameState.players || {});
        }
      }
    },

    async pushDB() {
      const sb = getClient();
      if (!this.roomCode || !sb) return;
      try {
        let { data: room } = await sb.from("rooms").select("*").eq("id", this.roomCode).maybeSingle();
        let state = room ? (room.game_state || {}) : {};

        state.hostId = this.gameState.hostId || (room && room.game_state ? room.game_state.hostId : this.myId);
        state.players = Object.assign({}, state.players || {}, this.gameState.players || {});
        state.choices = Object.assign({}, state.choices || {}, this.gameState.choices || {});
        if (this.gameState.currentPrompt) state.currentPrompt = this.gameState.currentPrompt;
        if (this.gameState.rankSet) state.rankSet = this.gameState.rankSet;
        if (this.gameState.secretNumber) state.secretNumber = this.gameState.secretNumber;
        if (this.gameState.clueIdx !== undefined) state.clueIdx = this.gameState.clueIdx;

        const currentGame = this.activeGame || "";
        this.gameState = state;
        this.lastHash = JSON.stringify({ g: currentGame, s: state });

        await sb.from("rooms").update({
          current_game: currentGame,
          game_state: state,
          updated_at: new Date().toISOString()
        }).eq("id", this.roomCode);
      } catch (e) {}
    },

    updatePlayersUI(playersMap) {
      const container = document.getElementById("connected-players-list");
      if (!container) return;
      const items = [];
      Object.keys(playersMap).forEach(id => {
        const p = playersMap[id];
        const pName = typeof p === "object" ? p.name : p;
        const isHost = id === this.gameState.hostId;
        const isMe = id === this.myId;
        items.push(`<span class="player-tag" style="background:${isHost ? '#FFF4E5; border:1px solid #FF9800;' : '#EEF2FF; border:1px solid #6366F1;'}">
          ${isHost ? '👑' : '👤'} ${esc(pName)} ${isMe ? '(You)' : ''} [${isHost ? 'HOST' : 'PLAYER'}]
        </span>`);
      });
      container.innerHTML = items.join(" ");
    },

    renderLobby() {
      const c = document.getElementById("main-content");
      if (!c) return;
      const isHost = this.isHost();

      c.innerHTML = `
        <div class="lobby-card">
          <div class="lobby-header-bar">
            <div>
              <span class="room-label">ROOM CODE</span>
              <h2 class="room-code-display">${esc(this.roomCode)}</h2>
            </div>
            <button class="btn-primary" style="width:auto;min-height:36px;padding:6px 12px;font-size:13px;" onclick="navigator.clipboard.writeText('${esc(this.roomCode)}'); alert('Code copied!');">📋 Copy</button>
          </div>
          <div style="margin: 16px 0;">
            <label style="font-size:11px; font-weight:800; color:#8E8E93;">PLAYERS CONNECTED:</label>
            <div id="connected-players-list" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;"></div>
          </div>

          ${isHost ? `
            <h3 style="margin-top:20px;">Choose a Game (You are Host 👑)</h3>
            <div class="games-grid-container">
              <div class="game-card" onclick="App.launchGame('would-rather')"><span>⚖️</span> <h4>Would You Rather</h4></div>
              <div class="game-card" onclick="App.launchGame('this-or-that')"><span>🔄</span> <h4>This or That</h4></div>
              <div class="game-card" onclick="App.launchGame('red-green-flag')"><span>🚩</span> <h4>Red/Green Flag</h4></div>
              <div class="game-card" onclick="App.launchGame('couple-compat')"><span>💖</span> <h4>Compat Quiz</h4></div>
              <div class="game-card" onclick="App.launchGame('blind-rank')"><span>🙈</span> <h4>Blind Rank</h4></div>
              <div class="game-card" onclick="App.launchGame('truths-lie')"><span>🤫</span> <h4>2 Truths & 1 Lie</h4></div>
              <div class="game-card" onclick="App.launchGame('word-letters')"><span>🔤</span> <h4>First/Last Letter</h4></div>
              <div class="game-card" onclick="App.launchGame('categories-bomb')"><span>💣</span> <h4>Pass The Bomb</h4></div>
              <div class="game-card" onclick="App.launchGame('guess-age')"><span>📅</span> <h4>Guess The Year</h4></div>
              <div class="game-card" onclick="App.launchGame('guess-number')"><span>🔢</span> <h4>Guess Number</h4></div>
              <div class="game-card" onclick="App.launchGame('guess-celeb')"><span>⭐</span> <h4>Guess Celeb</h4></div>
            </div>
          ` : `
            <div style="padding:24px; text-align:center; background:#FAF9F7; border:1px solid #E8E6E3; border-radius:12px; margin-top:20px;">
              <div class="spinner"></div>
              <h4 style="margin-top:12px;">Waiting for Host to choose a game...</h4>
              <p style="font-size:13px; color:#666;">Only the Host can start rounds. Get ready!</p>
            </div>
          `}
        </div>
      `;
      this.updatePlayersUI(this.gameState.players || {});
    },

    async launchGame(gameId) {
      if (!this.isHost()) {
        alert("Only the Host can select or advance games.");
        return;
      }
      this.activeGame = gameId;
      this.gameState.choices = {};
      const banks = window.BANKS || {};
      const picker = window.Picker || {
        nextItem: (k, arr) => (arr && arr.length) ? arr[Math.floor(Math.random() * arr.length)] : { a: "A", b: "B" },
        freshBlindRankSet: () => ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"]
      };

      if (gameId === "would-rather") this.gameState.currentPrompt = picker.nextItem("wouldRather", banks.wouldRather);
      if (gameId === "this-or-that") this.gameState.currentPrompt = picker.nextItem("thisOrThat", banks.thisOrThat);
      if (gameId === "red-green-flag") this.gameState.currentPrompt = picker.nextItem("redGreenFlag", banks.redGreenFlag);
      if (gameId === "couple-compat") this.gameState.currentPrompt = picker.nextItem("compatQuiz", banks.compatQuiz);
      if (gameId === "blind-rank") this.gameState.rankSet = picker.freshBlindRankSet(5);
      if (gameId === "word-letters") this.gameState.currentPrompt = picker.nextItem("letterPrompts", banks.letterPrompts);
      if (gameId === "categories-bomb") this.gameState.currentPrompt = picker.nextItem("bombCategories", banks.bombCategories);
      if (gameId === "guess-age") this.gameState.currentPrompt = picker.nextItem("guessAge", banks.guessAge);
      if (gameId === "guess-celeb") { this.gameState.currentPrompt = picker.nextItem("guessCeleb", banks.guessCeleb); this.gameState.clueIdx = 0; }
      if (gameId === "guess-number") this.gameState.secretNumber = picker.freshNumber(1, 100);

      await this.pushDB();
      this.renderActiveGame();
    },

    async exitGame() {
      if (!this.isHost()) {
        alert("Only the Host can return the room to the lobby.");
        return;
      }
      this.activeGame = null;
      this.gameState.choices = {};
      await this.pushDB();
      this.renderLobby();
    },

    async submitChoice(val) {
      if (!val || !val.toString().trim()) return;
      this.gameState.choices = this.gameState.choices || {};
      this.gameState.choices[this.myId] = val.toString().trim();
      await this.pushDB();
      this.renderActiveGame();

      if (Object.keys(this.gameState.choices).length >= 2 && window.confetti) {
        window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      }
    },

    renderComparison() {
      const choices = this.gameState.choices || {};
      const keys = Object.keys(choices);
      if (keys.length === 0) return '<div class="comparison-bar" style="text-align:center;font-size:13px;color:#666;">Waiting for answers...</div>';

      let html = '<div class="comparison-bar">';
      keys.forEach(k => {
        const pObj = this.gameState.players && this.gameState.players[k];
        const name = (k === this.myId) ? "You" : (pObj ? (pObj.name || pObj) : "Partner");
        html += `<div class="choice-row"><strong>${esc(name)}:</strong> <span>${esc(choices[k])}</span></div>`;
      });
      if (keys.length >= 2) {
        const vals = keys.map(k => choices[k]);
        const match = vals.every(v => v === vals[0]);
        html += `<div style="text-align:center;font-weight:900;margin-top:10px;color:${match ? '#137333' : '#1A1A1A'};">${match ? '🎉 MATCH!' : '⚡ Different choices'}</div>`;
      }
      html += '</div>';
      return html;
    },

    updateGameChoicesUI() {
      const bar = document.querySelector(".comparison-bar");
      if (bar) {
        const temp = document.createElement("div");
        temp.innerHTML = this.renderComparison();
        bar.parentNode.replaceChild(temp.firstElementChild, bar);
      }
    },

    renderActiveGame() {
      const c = document.getElementById("main-content");
      if (!c) return;
      if (!this.activeGame) { this.renderLobby(); return; }

      const isHost = this.isHost();
      let body = "";
      const cur = this.gameState.currentPrompt || { a: "Option A", b: "Option B" };
      const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

      switch (this.activeGame) {
        case "would-rather":
        case "this-or-that":
          const title = this.activeGame === "would-rather" ? "Would You Rather..." : "This or That";
          const div = this.activeGame === "would-rather" ? "OR" : "VS";
          body = `
            <h3>${title}</h3>
            <button class="btn-choice ${myChoice === cur.a ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.a)}')">${esc(cur.a)}</button>
            <div class="divider">${div}</div>
            <button class="btn-choice ${myChoice === cur.b ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.b)}')">${esc(cur.b)}</button>
          `;
          break;
        case "red-green-flag":
          body = `
            <h3>Red Flag or Green Flag?</h3>
            <p style="font-weight:700;margin:16px 0;">"${esc(cur)}"</p>
            <button class="btn-choice ${myChoice === 'Red Flag' ? 'selected' : ''}" onclick="App.submitChoice('Red Flag')">Red Flag</button>
            <button class="btn-choice ${myChoice === 'Green Flag' ? 'selected' : ''}" onclick="App.submitChoice('Green Flag')">Green Flag</button>
          `;
          break;
        case "couple-compat":
          body = `
            <h3>Compatibility Quiz</h3>
            <p style="font-weight:700;margin:16px 0;">${esc(cur)}</p>
            <button class="btn-choice ${myChoice === 'ME' ? 'selected' : ''}" onclick="App.submitChoice('ME')">Definitely Me</button>
            <button class="btn-choice ${myChoice === 'PARTNER' ? 'selected' : ''}" onclick="App.submitChoice('PARTNER')">Definitely Partner</button>
          `;
          break;
        case "blind-rank":
          const rankSet = this.gameState.rankSet || [];
          body = `
            <h3>Blind Ranking</h3>
            <p style="font-size:13px;color:#666;margin-bottom:10px;">Select your ranking:</p>
            ${rankSet.map((item, i) => `
              <div style="background:#FAF9F7;border:1px solid #E8E6E3;padding:10px;border-radius:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
                <span>${i+1}. ${esc(item)}</span>
                <button class="btn-secondary" style="width:auto;min-height:34px;padding:4px 10px;font-size:12px;" onclick="App.submitChoice('Rank #${i+1}: ${esc(item)}')">Rank #${i+1}</button>
              </div>
            `).join("")}
          `;
          break;
        case "word-letters":
          body = `
            <h3>First / Last Letter</h3>
            <p>Category: <strong>${esc(cur.category)}</strong></p>
            <p>Must start with letter: <strong>'${esc(cur.letter)}'</strong></p>
            <input type="text" id="g-input" placeholder="Type word..." class="game-input" />
            <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('g-input').value)">Submit Word</button>
          `;
          break;
        case "categories-bomb":
          body = `
            <h3>Pass The Bomb</h3>
            <p>Category: <strong>${esc(cur)}</strong></p>
            <input type="text" id="g-input" placeholder="Type word fast..." class="game-input" />
            <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('g-input').value)">Pass Answer</button>
          `;
          break;
        case "guess-age":
          body = `
            <h3>Guess The Year</h3>
            <div style="background:#FAF9F7;border:1px solid #E8E6E3;padding:14px;border-radius:12px;font-weight:600;text-align:center;margin:12px 0;">"${esc(cur.subject)}"</div>
            <input type="number" id="g-input" placeholder="Enter year..." class="game-input" />
            <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('g-input').value)">Submit Guess</button>
            <button class="btn-secondary" style="margin-top:8px;" onclick="alert('Answer: ' + App.gameState.currentPrompt.answer)">Reveal Year</button>
          `;
          break;
        case "guess-number":
          const guess = myChoice ? parseInt(myChoice) : null;
          const secret = this.gameState.secretNumber || 50;
          let hint = "";
          if (guess !== null && !isNaN(guess)) {
            if (guess === secret) hint = "Correct!";
            else if (guess < secret) hint = "Higher 📈";
            else hint = "Lower 📉";
          }
          body = `
            <h3>Guess Secret Number (1-100)</h3>
            <input type="number" id="g-input" placeholder="1 to 100..." class="game-input" />
            <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('g-input').value)">Submit Guess</button>
            ${myChoice ? `<p style="font-weight:700;margin-top:10px;">Your Guess: ${myChoice} — ${hint}</p>` : ""}
          `;
          break;
        case "guess-celeb":
          const clueIdx = this.gameState.clueIdx || 0;
          const cluesList = cur.clues || [];
          const cluesShown = cluesList.slice(0, clueIdx + 1);
          body = `
            <h3>Guess The Celebrity</h3>
            <div style="background:#FAF9F7;border:1px solid #E8E6E3;padding:12px;border-radius:12px;margin:12px 0;">
              ${cluesShown.map((cl, i) => `<p style="margin-bottom:4px;"><strong>Clue #${i+1}:</strong> ${esc(cl)}</p>`).join("")}
            </div>
            ${clueIdx < cluesList.length - 1 ? `<button class="btn-secondary" style="margin-bottom:10px;" onclick="App.gameState.clueIdx++; App.pushDB(); App.renderActiveGame();">Reveal Next Clue</button>` : ""}
            <input type="text" id="g-input" placeholder="Type name..." class="game-input" />
            <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('g-input').value)">Submit Guess</button>
            <button class="btn-secondary" style="margin-top:8px;" onclick="alert('Answer: ' + App.gameState.currentPrompt.answer)">Reveal Answer</button>
          `;
          break;
        default:
          body = `<p>Game active.</p>`;
      }

      c.innerHTML = `
        <div class="active-game-wrapper">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            ${isHost ? `
              <button class="btn-secondary" style="width:auto;min-height:36px;padding:6px 12px;font-size:13px;" onclick="App.exitGame()">← Lobby</button>
            ` : `
              <span style="font-size:12px;color:#8E8E93;font-weight:700;">Host controls the session</span>
            `}
            <span style="font-weight:900;font-size:11px;letter-spacing:1px;color:#8E8E93;">ACTIVE GAME</span>
          </div>
          ${body}
          ${this.renderComparison()}${isHost ? `
            <button class="btn-action" style="margin-top:16px;" onclick="App.launchGame('${this.activeGame}')">Next Round →</button>
          ` : `
            <p style="font-size:12px;color:#888;margin-top:12px;text-align:center;">Waiting for Host to advance to next round...</p>
          `}
        </div>
      `;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.App.init());
  } else {
    window.App.init();
  }
})();