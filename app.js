// DuoVibe Cloud Sync Engine - Version: sync99
(function () {
  "use strict";

  function esc(val) {
    return String(val == null ? "" : val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  const SUPABASE_URL = (window.CONFIG && window.CONFIG.SUPABASE_URL) || "https://euqrzxxldlsbhuyjuleo.supabase.co";
  const SUPABASE_KEY = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cXJ6eHhsZGxzYmh1eWp1bGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTUzOTAsImV4cCI6MjA5MzIzMTM5MH0.J4zrhIzjIBkUmxHEPcaoxgoFudtAvXHmJaPToigR_ig";

  let sb = null;
  try {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      window.sb = sb;
    }
  } catch (e) { console.error("Supabase error:", e); }

  window.App = {
    myId: "user_" + Math.random().toString(36).slice(2, 10),
    myName: localStorage.getItem("duo_my_name") || ("Player " + Math.floor(Math.random() * 100)),
    roomCode: null,
    activeGame: null,
    gameState: { choices: {}, players: {} },
    pollTimer: null,
    lastHash: "",
    lastLog: "App loaded (v99). Ready.",

    init() {
      this.renderHome();
    },

    log(msg, isErr = false) {
      console.log("DuoVibe:", msg);
      this.lastLog = (isErr ? "❌ " : "🟢 ") + msg;
      const dbg = document.getElementById("debug-hud");
      if (dbg) dbg.textContent = this.lastLog;
    },

    renderHome() {
      const c = document.getElementById("main-content");
      if (!c) return;
      c.innerHTML = `
        <div class="home-card">
          <h2>Welcome to DuoVibe 💕</h2>
          <p>Play real-time games with your partner or friends across the world.</p>
          <div style="margin-top:16px;">
            <label style="font-size:13px; font-weight:800; color:#666;">YOUR NAME</label>
            <input id="input-my-name" value="${esc(this.myName)}" class="game-input" placeholder="Your name" />
          </div>
          <div style="margin-top:16px;">
            <button class="btn-primary" onclick="App.createRoom()">✨ Create New Room</button>
            <div class="divider">OR JOIN</div>
            <div style="display:flex; gap:8px;">
              <input id="input-room-code" placeholder="6-DIGIT CODE" class="game-input" style="text-transform:uppercase; letter-spacing:2px; text-align:center;" maxlength="6" />
              <button class="btn-secondary" style="width:110px;" onclick="App.joinRoomWithCode()">Join</button>
            </div>
          </div>
          <button class="btn-secondary" style="margin-top:16px; background:#FAF9F7; border:1px solid #E8E6E3; font-size:12px;" onclick="App.testConnection()">🔍 Test Cloud Connection</button>
          <div id="debug-hud" style="margin-top:12px; font-size:11px; background:#1A1A1A; color:#00FF66; padding:10px; border-radius:10px; font-family:monospace; text-align:left; word-break:break-all;">Status: Ready (v99)</div>
        </div>
      `;
    },

    async testConnection() {
      if (!sb) { this.log("Supabase client is null", true); return; }
      this.log("Testing Supabase connection...");
      try {
        const { data, error } = await sb.from("rooms").select("id").limit(1);
        if (error) {
          this.log("DB Error: " + error.message, true);
          alert("DB Error: " + error.message + "\nDid you run supabase-schema.sql in Supabase?");
        } else {
          this.log("SUCCESS! Connected to Supabase rooms table.");
          alert("✅ SUCCESS! Connected to Supabase rooms table.");
        }
      } catch (err) {
        this.log("Exception: " + err.message, true);
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
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.joinRoom(code);
    },

    joinRoomWithCode() {
      this.saveName();
      const el = document.getElementById("input-room-code");
      const code = el ? el.value.trim().toUpperCase() : "";
      if (code.length === 6) this.joinRoom(code);
      else alert("Enter a valid 6-digit room code.");
    },

    async joinRoom(code) {
      this.roomCode = code;
      this.activeGame = null;
      this.gameState = { choices: {}, players: {} };
      this.renderLobby();
      this.log("Joining room " + code + "...");

      if (!sb) {
        this.log("Supabase missing", true);
        return;
      }

      try {
        let { data: room, error } = await sb.from("rooms").select("*").eq("id", code).maybeSingle();
        let state = { choices: {}, players: {} };

        if (!room) {
          state.players[this.myId] = this.myName;
          const { error: insErr } = await sb.from("rooms").insert({ id: code, current_game: "", game_state: state });
          if (insErr) {
            this.log("Insert Error: " + insErr.message, true);
            alert("Database Error: " + insErr.message);
            return;
          }
          this.log("Created room in cloud.");
        } else {
          state = room.game_state || { choices: {}, players: {} };
          state.players = state.players || {};
          state.players[this.myId] = this.myName;
          await sb.from("rooms").update({ game_state: state, updated_at: new Date().toISOString() }).eq("id", code);
          this.activeGame = room.current_game || null;
          this.gameState = state;
          this.log("Joined room in cloud.");
        }

        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(() => this.pollDB(), 1500);
      } catch (e) {
        this.log("Join exception: " + e.message, true);
      }
    },

    async pollDB() {
      if (!this.roomCode || !sb) return;
      try {
        let { data: room, error } = await sb.from("rooms").select("*").eq("id", this.roomCode).maybeSingle();
        if (error || !room) return;

        const remoteGame = room.current_game || "";
        const remoteState = room.game_state || { choices: {}, players: {} };

        this.updatePlayersUI(remoteState.players || {});

        const mergedChoices = Object.assign({}, remoteState.choices || {}, this.gameState.choices || {});
        remoteState.choices = mergedChoices;

        const hash = JSON.stringify({ g: remoteGame, s: remoteState });
        if (hash !== this.lastHash) {
          this.lastHash = hash;
          this.activeGame = remoteGame || null;
          this.gameState = remoteState;
          this.log("Synced: " + (remoteGame || "Lobby"));
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
        }
      }
    },

    async pushDB() {
      if (!this.roomCode || !sb) return;
      try {
        let { data: room } = await sb.from("rooms").select("*").eq("id", this.roomCode).maybeSingle();
        let remoteState = room ? (room.game_state || { choices: {}, players: {} }) : { choices: {}, players: {} };

        remoteState.players = Object.assign({}, remoteState.players || {}, this.gameState.players || {});
        remoteState.players[this.myId] = this.myName;
        remoteState.choices = Object.assign({}, remoteState.choices || {}, this.gameState.choices || {});

        const currentGame = this.activeGame || (room ? room.current_game : "") || "";

        this.gameState = remoteState;
        this.lastHash = JSON.stringify({ g: currentGame, s: remoteState });

        const { error } = await sb.from("rooms").update({
          current_game: currentGame,
          game_state: remoteState,
          updated_at: new Date().toISOString()
        }).eq("id", this.roomCode);

        if (error) {
          this.log("Push error: " + error.message, true);
        } else {
          this.log("Pushed to cloud.");
        }
      } catch (e) {
        this.log("Push exception: " + e.message, true);
      }
    },

    updatePlayersUI(playersMap) {
      const container = document.getElementById("connected-players-list");
      if (!container) return;
      const names = [];
      Object.keys(playersMap).forEach(id => {
        const name = playersMap[id];
        names.push(`🟢 ${esc(name)}${id === this.myId ? " (You)" : ""}`);
      });
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
              <h2 class="room-code-display">${esc(this.roomCode)}</h2>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn-primary" style="width:auto;min-height:36px;padding:6px 10px;font-size:12px;" onclick="App.pollDB(); alert('Synced with cloud!');">🔄 Sync</button>
              <button class="btn-primary" style="width:auto;min-height:36px;padding:6px 10px;font-size:12px;" onclick="navigator.clipboard.writeText('${esc(this.roomCode)}'); alert('Copied!');">📋 Copy</button>
            </div>
          </div>
          <div style="margin: 16px 0;">
            <label style="font-size:11px; font-weight:800; color:#8E8E93;">PLAYERS IN ROOM:</label>
            <div id="connected-players-list" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
              <span class="player-tag">🟢 ${esc(this.myName)} (You)</span>
            </div>
          </div>
          <h3 style="margin-top:20px;">Select a Game</h3>
          <div class="games-grid-container">
            <div class="game-card" onclick="App.launchGame('would-rather')"><span>⚖️</span> <h4>Would You Rather</h4></div>
            <div class="game-card" onclick="App.launchGame('this-or-that')"><span>🔄</span> <h4>This or That</h4></div>
            <div class="game-card" onclick="App.launchGame('red-green-flag')"><span>🚩</span> <h4>Red/Green Flag</h4></div>
            <div class="game-card" onclick="App.launchGame('couple-compat')"><span>💖</span> <h4>Compat Quiz</h4></div>
            <div class="game-card" onclick="App.launchGame('blind-rank')"><span>🙈</span> <h4>Blind Rank</h4></div>
            <div class="game-card" onclick="App.launchGame('truths-lie')"><span>🤫</span> <h4>2 Truths 1 Lie</h4></div>
            <div class="game-card" onclick="App.launchGame('guess-age')"><span>📅</span> <h4>Guess The Year</h4></div>
            <div class="game-card" onclick="App.launchGame('guess-number')"><span>🔢</span> <h4>Guess Number</h4></div>
          </div>
          <div id="debug-hud" style="margin-top:14px; font-size:11px; background:#1A1A1A; color:#00FF66; padding:10px; border-radius:10px; font-family:monospace; text-align:left; word-break:break-all;">${esc(this.lastLog)}</div>
        </div>
      `;
      this.updatePlayersUI(this.gameState.players || {});
    },

    async launchGame(gameId) {
      this.activeGame = gameId;
      this.gameState.choices = {};
      const banks = window.BANKS || {};
      const picker = window.Picker;

      if (gameId === "would-rather") this.gameState.currentPrompt = picker.nextItem("wouldRather", banks.wouldRather);
      if (gameId === "this-or-that") this.gameState.currentPrompt = picker.nextItem("thisOrThat", banks.thisOrThat);
      if (gameId === "red-green-flag") this.gameState.currentPrompt = picker.nextItem("redGreenFlag", banks.redGreenFlag);
      if (gameId === "couple-compat") this.gameState.currentPrompt = picker.nextItem("compatQuiz", banks.compatQuiz);
      if (gameId === "blind-rank") this.gameState.rankSet = picker.freshBlindRankSet(5);
      if (gameId === "guess-number") this.gameState.secretNumber = picker.freshNumber(1, 100);

      this.log("Launching: " + gameId);
      await this.pushDB();
      this.renderActiveGame();
      window.scrollTo(0, 0);
    },

    async exitGame() {
      this.activeGame = null;
      this.gameState.choices = {};
      await this.pushDB();
      this.renderLobby();
    },

    async submitChoice(val) {
      if (!val || !val.toString().trim()) { alert("Please enter or select an answer."); return; }

      await this.pollDB();
      this.gameState.choices = this.gameState.choices || {};
      this.gameState.choices[this.myId] = val.toString().trim();

      this.log("Choice: " + val);
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
        const name = (k === this.myId) ? "You" : ((this.gameState.players && this.gameState.players[k]) || "Partner");
        html += `<div class="choice-row"><strong>${esc(name)}:</strong> <span>${esc(choices[k])}</span></div>`;
      });
      if (keys.length >= 2) {
        const vals = keys.map(k => choices[k]);
        const match = vals.every(v => v === vals[0]);
        html += `<div style="text-align:center;font-weight:900;margin-top:10px;color:${match ? '#137333' : '#1A1A1A'};">${match ? '🎉 MATCH!' : '🤝 Different choices'}</div>`;
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
            <button class="btn-choice ${myChoice === '🟢 Green Flag' ? 'selected' : ''}" onclick="App.submitChoice('🟢 Green Flag')">🟢 Green Flag</button>
            <button class="btn-choice ${myChoice === '🚩 Red Flag' ? 'selected' : ''}" onclick="App.submitChoice('🚩 Red Flag')">🚩 Red Flag</button>
          `;
          break;
        case "couple-compat":
          body = `
            <h3>Compatibility Quiz</h3>
            <p style="font-weight:700;margin:16px 0;">${esc(cur)}</p>
            <button class="btn-choice ${myChoice === 'ME' ? 'selected' : ''}" onclick="App.submitChoice('ME')">🙋‍♂️ Definitely Me</button>
            <button class="btn-choice ${myChoice === 'PARTNER' ? 'selected' : ''}" onclick="App.submitChoice('PARTNER')">🙋‍♀️ Definitely Partner</button>
          `;
          break;
        case "blind-rank":
          const rankSet = this.gameState.rankSet || [];
          body = `
            <h3>Blind Ranking</h3>
            <p style="font-size:13px;color:#666;margin-bottom:10px;">Rank these items:</p>
            ${rankSet.map((item, i) => `<div style="background:#FAF9F7;border:1px solid #E8E6E3;padding:10px;border-radius:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
              <span>${i+1}. ${esc(item)}</span>
              <button class="btn-secondary" style="width:auto;min-height:34px;padding:4px 10px;font-size:12px;" onclick="App.submitChoice('Ranked #${i+1}: ${esc(item)}')">Rank #${i+1}</button>
            </div>`).join("")}
          `;
          break;
        default:
          body = `<h3>${esc(this.activeGame)}</h3><p>Game active. Submit your answer below.</p>
          <input id="ans-input" class="game-input" placeholder="Type answer..." />
          <button class="btn-action" style="margin-top:10px;" onclick="App.submitChoice(document.getElementById('ans-input').value)">Submit</button>`;
      }

      c.innerHTML = `
        <div class="active-game-wrapper">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <button class="btn-secondary" style="width:auto;min-height:36px;padding:6px 12px;font-size:13px;" onclick="App.exitGame()">← Lobby</button>
            <span style="font-weight:900;font-size:11px;letter-spacing:1px;color:#8E8E93;">ACTIVE GAME</span>
          </div>
          ${body}
          ${this.renderComparison()}
          <div style="display:flex;gap:8px;margin-top:16px;">
            <button class="btn-primary" style="flex:1;" onclick="App.pollDB(); alert('Synced!');">🔄 Force Sync</button>
            <button class="btn-action" style="flex:1;" onclick="App.launchGame('${this.activeGame}')">Next Round →</button>
          </div>
          <div id="debug-hud" style="margin-top:14px; font-size:11px; background:#1A1A1A; color:#00FF66; padding:10px; border-radius:10px; font-family:monospace; text-align:left; word-break:break-all;">${esc(this.lastLog)}</div>
        </div>
      `;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.App.init();
  });
})();