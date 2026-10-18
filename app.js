(function () {
  "use strict";

  function esc(val) {
    return String(val == null ? "" : val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
    gameState: { choices: {}, players: {}, hostId: null, streak: 0 },
    pollTimer: null,
    lastHash: "",
    lastLog: "UI Upgraded.",

    init() {
      getClient();
      this.renderHome();
    },

    isHost() { return this.gameState.hostId === this.myId; },
    log(msg) { console.log("DuoVibe:", msg); },

    renderHome() {
      const c = document.getElementById("main-content");
      if (!c) return;
      c.innerHTML = `
        <div class="card">
          <h2>Welcome to DuoVibe ⚡</h2>
          <p style="margin-bottom:20px;">Test your vibe. Build your streak.</p>
          <label style="font-size:12px; font-weight:800; color:var(--text-muted);">YOUR NAME</label>
          <input id="input-my-name" value="${esc(this.myName)}" class="game-input" placeholder="Your name" />
          
          <div style="margin-top:24px;">
            <button class="btn-primary" onclick="App.createRoom()">👑 Create Room (Host)</button>
            <div class="divider">OR JOIN</div>
            <div style="display:flex; gap:10px;">
              <input id="input-room-code" placeholder="6-DIGIT" class="game-input" style="text-transform:uppercase; letter-spacing:2px; text-align:center; margin:0;" maxlength="6" />
              <button class="btn-secondary" style="width:120px;" onclick="App.joinRoomWithCode()">Join</button>
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
      this.gameState = { choices: {}, players: {}, hostId: creatingAsHost ? this.myId : null, streak: 0 };
      this.renderLobby();

      const sb = getClient();
      if (!sb) return;

      try {
        let { data: room } = await sb.from("rooms").select("*").eq("id", code).maybeSingle();
        if (!room) {
          if (!creatingAsHost) { alert("Room not found."); this.renderHome(); return; }
          const state = { hostId: this.myId, players: { [this.myId]: { name: this.myName, role: "host" } }, choices: {}, streak: 0 };
          await sb.from("rooms").insert({ id: code, current_game: "", game_state: state });
          this.gameState = state;
        } else {
          let state = room.game_state || { choices: {}, players: {}, hostId: null, streak: 0 };
          state.players = state.players || {};
          if (!state.hostId && creatingAsHost) state.hostId = this.myId;
          
          this.myRole = (state.hostId === this.myId) ? "host" : "player";
          state.players[this.myId] = { name: this.myName, role: this.myRole };
          await sb.from("rooms").update({ game_state: state, updated_at: new Date().toISOString() }).eq("id", code);
          this.activeGame = room.current_game || null;
          this.gameState = state;
        }
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(() => this.pollDB(), 1200);
        this.renderLobby();
      } catch (e) { console.error("Join error:", e); }
    },

    async pollDB() {
      const sb = getClient();
      if (!this.roomCode || !sb) return;
      try {
        let { data: room, error } = await sb.from("rooms").select("*").eq("id", this.roomCode).maybeSingle();
        if (error || !room) return;

        const remoteGame = room.current_game || "";
        const remoteState = room.game_state || { choices: {}, players: {}, hostId: null, streak: 0 };
        remoteState.players = remoteState.players || {};
        remoteState.choices = remoteState.choices || {};

        let needsSync = false;
        if (!remoteState.players[this.myId]) {
          remoteState.players[this.myId] = { name: this.myName, role: this.myRole };
          needsSync = true;
        }

        const myLocalChoices = this.gameState.choices[this.myId];
        if (myLocalChoices !== undefined) {
          if (JSON.stringify(remoteState.choices[this.myId]) !== JSON.stringify(myLocalChoices)) {
            remoteState.choices[this.myId] = myLocalChoices;
            needsSync = true;
          }
        }

        if (needsSync) {
          await sb.from("rooms").update({ game_state: remoteState }).eq("id", this.roomCode);
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
        if (!document.querySelector(".active-game-wrapper")) this.renderActiveGame();
        else this.updateGameChoicesUI();
      } else {
        if (!document.querySelector(".lobby-wrapper")) this.renderLobby();
        else this.updatePlayersUI(this.gameState.players || {});
      }
    },

    async pushDB(evaluateStreak = false) {
      const sb = getClient();
      if (!this.roomCode || !sb) return;
      try {
        let { data: room } = await sb.from("rooms").select("*").eq("id", this.roomCode).maybeSingle();
        let state = room ? (room.game_state || {}) : {};

        state.hostId = this.gameState.hostId;
        state.players = Object.assign({}, state.players || {}, this.gameState.players || {});
        state.choices = Object.assign({}, state.choices || {}, this.gameState.choices || {});
        
        if (this.gameState.currentPrompt) state.currentPrompt = this.gameState.currentPrompt;
        if (this.gameState.rankSet) state.rankSet = this.gameState.rankSet;
        if (evaluateStreak) state.streak = this.gameState.streak;
        else state.streak = state.streak || this.gameState.streak || 0;

        const currentGame = this.activeGame || "";
        this.gameState = state;
        this.lastHash = JSON.stringify({ g: currentGame, s: state });

        await sb.from("rooms").update({ current_game: currentGame, game_state: state }).eq("id", this.roomCode);
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
        items.push(`<span class="player-tag ${isHost ? 'host-tag' : 'player-tag-standard'}">
          ${isHost ? '👑' : '👤'} ${esc(pName)}
        </span>`);
      });
      container.innerHTML = items.join(" ");
    },

    renderLobby() {
      const c = document.getElementById("main-content");
      if (!c) return;
      const isHost = this.isHost();
      const streak = this.gameState.streak || 0;

      c.innerHTML = `
        <div class="card lobby-wrapper">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px;">
            <div>
              <div style="font-size:11px; font-weight:800; color:var(--text-muted); letter-spacing:1px;">ROOM CODE</div>
              <h2 style="color:var(--primary); cursor:pointer;" onclick="navigator.clipboard.writeText('${esc(this.roomCode)}'); alert('Code copied!');">${esc(this.roomCode)} 📋</h2>
            </div>
            <div class="streak-badge">🔥 ${streak} STREAK</div>
          </div>
          
          <label style="font-size:11px; font-weight:800; color:var(--text-muted);">PLAYERS:</label>
          <div id="connected-players-list" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;"></div>

          ${isHost ? `
            <h3 style="margin-top:24px;">Game Modes</h3>
            <div class="games-grid">
              <div class="game-mode-card" onclick="App.launchGame('would-rather')"><span>🤔</span><h4>Would You Rather</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('red-green-flag')"><span>🚩</span><h4>Red/Green Flag</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('couple-compat')"><span>❤️</span><h4>Compat Quiz</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('mind-meld')"><span>🧠</span><h4>Mind Meld</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('percentage')"><span>💯</span><h4>1-100 Scale</h4></div>
              <div class="game-mode-card" style="border-color:var(--primary); background:#EEF2FF;" onclick="App.launchGame('blind-rank')"><span>🔢</span><h4 style="color:var(--primary);">Blind Rank</h4></div>
            </div>
          ` : `
            <div style="margin-top:30px; text-align:center; padding:30px 20px; background:#F9FAFB; border-radius:var(--radius-md);">
              <h3>Waiting for Host...</h3>
              <p>The host is choosing the next game mode. Get ready to lock in.</p>
            </div>
          `}
        </div>
      `;
      this.updatePlayersUI(this.gameState.players || {});
    },

    async evaluateStreak() {
      if (!this.isHost()) return;
      const choices = this.gameState.choices || {};
      const keys = Object.keys(choices);
      if (keys.length === 2 && this.activeGame !== "blind-rank") {
        const vals = keys.map(k => choices[k]);
        let isMatch = false;
        if (this.activeGame === "percentage") isMatch = Math.abs(parseInt(vals[0]) - parseInt(vals[1])) <= 15;
        else if (this.activeGame === "mind-meld") isMatch = String(vals[0]).toLowerCase() === String(vals[1]).toLowerCase();
        else isMatch = vals[0] === vals[1];

        if (isMatch) this.gameState.streak = (this.gameState.streak || 0) + 1;
        else this.gameState.streak = 0;
      }
    },

    async launchGame(gameId) {
      if (!this.isHost()) return;
      await this.evaluateStreak(); 

      this.activeGame = gameId;
      this.gameState.choices = {};
      const b = window.BANKS || {};
      const p = window.Picker;

      if (gameId === "would-rather") this.gameState.currentPrompt = p.nextItem("wouldRather", b.wouldRather);
      if (gameId === "red-green-flag") this.gameState.currentPrompt = p.nextItem("redGreenFlag", b.redGreenFlag);
      if (gameId === "couple-compat") this.gameState.currentPrompt = p.nextItem("compatQuiz", b.compatQuiz);
      if (gameId === "mind-meld") this.gameState.currentPrompt = p.nextItem("mindMeld", b.mindMeld);
      if (gameId === "percentage") this.gameState.currentPrompt = p.nextItem("percentage", b.percentage);
      if (gameId === "blind-rank") this.gameState.rankSet = p.freshBlindRankSet();

      await this.pushDB(true);
      this.renderActiveGame();
    },

    async exitGame() {
      if (!this.isHost()) return;
      await this.evaluateStreak();
      this.activeGame = null;
      this.gameState.choices = {};
      await this.pushDB(true);
      this.renderLobby();
    },

    async submitChoice(val) {
      if (!val || !val.toString().trim()) return;
      this.gameState.choices = this.gameState.choices || {};
      this.gameState.choices[this.myId] = val.toString().trim();
      await this.pushDB();
      this.renderActiveGame();
    },

    async submitBlindRank(slot, item) {
      this.gameState.choices = this.gameState.choices || {};
      if (typeof this.gameState.choices[this.myId] !== "object") this.gameState.choices[this.myId] = {};
      this.gameState.choices[this.myId][slot] = item;
      
      const numAnswered = Object.keys(this.gameState.choices[this.myId]).length;
      if (numAnswered === 5 && window.confetti) window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      await this.pushDB();
      this.renderActiveGame();
    },

    renderComparison() {
      const choices = this.gameState.choices || {};
      const keys = Object.keys(choices);
      if (keys.length === 0) return '<div class="comparison-bar" style="text-align:center;color:var(--text-muted);margin-top:20px;">Waiting for answers...</div>';

      if (this.activeGame === "blind-rank") {
        const p1Done = choices[keys[0]] && Object.keys(choices[keys[0]]).length === 5;
        const p2Done = keys.length > 1 && choices[keys[1]] && Object.keys(choices[keys[1]]).length === 5;
        
        if (!p1Done || (keys.length > 1 && !p2Done)) return '<div class="comparison-bar" style="text-align:center;margin-top:20px;font-weight:700;">Ranking in progress... ⏳</div>';

        let html = '<div class="comparison-bar" style="display:flex; gap:16px; margin-top:20px;">';
        keys.forEach(k => {
          const pObj = this.gameState.players && this.gameState.players[k];
          const name = (k === this.myId) ? "You" : (pObj ? (pObj.name || pObj) : "Partner");
          html += `<div style="flex:1;"><strong>${esc(name)}</strong>`;
          for(let i=1; i<=5; i++) {
            html += `<div style="font-size:13px; font-weight:600; background:#F3F4F6; margin-top:8px; padding:10px; border-radius:8px;">${i}. ${esc(choices[k][i])}</div>`;
          }
          html += `</div>`;
        });
        html += '</div>';
        return html;
      }

      let html = '<div class="comparison-bar" style="margin-top:24px; background:#F9FAFB; padding:20px; border-radius:var(--radius-md);">';
      keys.forEach(k => {
        const pObj = this.gameState.players && this.gameState.players[k];
        const name = (k === this.myId) ? "You" : (pObj ? (pObj.name || pObj) : "Partner");
        html += `<div style="display:flex; justify-content:space-between; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #E5E7EB;">
                   <strong style="color:var(--text-muted);">${esc(name)}:</strong>
                   <span style="font-weight:800; text-align:right;">${esc(choices[k])}</span>
                 </div>`;
      });

      if (keys.length >= 2) {
        const vals = keys.map(k => choices[k]);
        let isMatch = false;
        if (this.activeGame === "percentage") isMatch = Math.abs(parseInt(vals[0]) - parseInt(vals[1])) <= 15;
        else if (this.activeGame === "mind-meld") isMatch = String(vals[0]).toLowerCase() === String(vals[1]).toLowerCase();
        else isMatch = vals[0] === vals[1];

        if (isMatch) {
          if (window.confetti) window.confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          html += `<div class="match-box">🔥 VIBE MATCH! 🔥</div>`;
        } else {
          html += `<div style="text-align:center;font-weight:900;margin-top:16px;color:#D32F2F;font-size:15px;">💀 STREAK BROKEN</div>`;
          if ((this.gameState.streak || 0) >= 2) {
            const dares = window.BANKS.dares || ["Take a drink!"];
            const dareStr = dares[(this.roomCode.charCodeAt(0) + vals[0].length) % dares.length];
            html += `<div class="penalty-box"><strong style="color:#991B1B;font-size:13px;letter-spacing:1px;">🚨 PENALTY 🚨</strong><br/><span style="color:#DC2626;font-weight:700;">${esc(dareStr)}</span></div>`;
          }
        }
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
      if (this.activeGame === "blind-rank" && document.getElementById("br-body")) {
        document.getElementById("br-body").innerHTML = this.getBlindRankBody();
      }
    },

    getBlindRankBody() {
      const rankSet = this.gameState.rankSet || [];
      const myRanks = (this.gameState.choices && this.gameState.choices[this.myId]) || {};
      const numAnswered = Object.keys(myRanks).length;

      if (numAnswered < 5) {
        const currentItem = rankSet[numAnswered];
        let slotsHtml = "";
        for(let i=1; i<=5; i++) {
          if (myRanks[i]) {
            slotsHtml += `<div style="background:#F3F4F6; padding:12px; margin-bottom:8px; border-radius:var(--radius-sm); color:#9CA3AF; font-size:14px; text-decoration:line-through; font-weight:700;">${i}. ${esc(myRanks[i])}</div>`;
          } else {
            slotsHtml += `<button class="btn-secondary" style="margin-bottom:8px; justify-content:flex-start; border-color:var(--primary); color:var(--primary);" onclick="App.submitBlindRank(${i}, '${esc(currentItem)}')">Lock in Slot #${i}</button>`;
          }
        }
        return `
          <div style="background:linear-gradient(135deg, var(--primary), #818CF8); color:white; padding:24px; border-radius:var(--radius-md); margin-bottom:20px; text-align:center; box-shadow: 0 10px 20px rgba(79,102,241,0.2);">
            <span style="font-size:11px; font-weight:900; opacity:0.9; letter-spacing:1.5px;">ITEM ${numAnswered + 1} OF 5</span>
            <h2 style="margin:8px 0 0 0; font-size:28px;">${esc(currentItem)}</h2>
          </div>
          ${slotsHtml}
        `;
      } else {
        return `<div style="padding:24px; text-align:center; background:#E0F2FE; color:#0369A1; border-radius:var(--radius-md); margin:16px 0; font-weight:800; font-size:16px;">✅ Your list is locked in!</div>`;
      }
    },

    renderActiveGame() {
      const c = document.getElementById("main-content");
      if (!c) return;
      if (!this.activeGame) { this.renderLobby(); return; }

      const isHost = this.isHost();
      const streak = this.gameState.streak || 0;
      let body = "";
      const cur = this.gameState.currentPrompt || { a: "A", b: "B" };
      const myChoice = (this.gameState.choices && this.gameState.choices[this.myId]) ? this.gameState.choices[this.myId] : null;

      if (this.activeGame === "blind-rank") {
        body = `<div id="br-body">${this.getBlindRankBody()}</div>`;
      } else {
        switch (this.activeGame) {
          case "would-rather":
            body = `
              <h3 style="margin-bottom:16px; text-align:center;">Would You Rather...</h3>
              <button class="btn-choice ${myChoice === cur.a ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.a)}')">${esc(cur.a)}</button>
              <div class="divider">OR</div>
              <button class="btn-choice ${myChoice === cur.b ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.b)}')">${esc(cur.b)}</button>
            `;
            break;
          case "red-green-flag":
            body = `
              <h3 style="text-align:center;">Red or Green Flag?</h3>
              <div style="background:#F9FAFB; padding:24px; border-radius:var(--radius-md); text-align:center; margin:20px 0; border:2px solid var(--border);">
                <p style="font-weight:800; font-size:18px; margin:0; color:var(--text-main);">"${esc(cur)}"</p>
              </div>
              <div style="display:flex; gap:10px;">
                <button style="flex:1; border-color:#FECACA; color:#DC2626;" class="btn-choice ${myChoice === '🚩 Red Flag' ? 'selected' : ''}" onclick="App.submitChoice('🚩 Red Flag')">🚩 Red Flag</button>
                <button style="flex:1; border-color:#A7F3D0; color:#059669;" class="btn-choice ${myChoice === '🌿 Green Flag' ? 'selected' : ''}" onclick="App.submitChoice('🌿 Green Flag')">🌿 Green Flag</button>
              </div>
            `;
            break;
          case "couple-compat":
            body = `
              <h3 style="text-align:center;">Compatibility Quiz</h3>
              <p style="font-weight:800;margin:24px 0;font-size:20px;text-align:center;line-height:1.3;">${esc(cur)}</p>
              <div style="display:flex; gap:12px;">
                <button style="flex:1; padding:24px 10px;" class="btn-choice ${myChoice === 'ME' ? 'selected' : ''}" onclick="App.submitChoice('ME')"><span style="font-size:24px;display:block;margin-bottom:8px;">🙋‍♂️</span> Me</button>
                <button style="flex:1; padding:24px 10px;" class="btn-choice ${myChoice === 'PARTNER' ? 'selected' : ''}" onclick="App.submitChoice('PARTNER')"><span style="font-size:24px;display:block;margin-bottom:8px;">🙋‍♀️</span> Partner</button>
              </div>
            `;
            break;
          case "mind-meld":
            body = `
              <h3 style="text-align:center;">Mind Meld 🧠</h3>
              <div style="background:var(--primary); color:white; padding:24px; border-radius:var(--radius-md); text-align:center; margin:20px 0;">
                <p style="font-weight:800;font-size:20px;margin:0;color:white;">${esc(cur)}</p>
              </div>
              <p style="font-size:13px; color:var(--text-muted); text-align:center; margin-bottom:12px;">Type the first thing that comes to mind. Exact matches win.</p>
              <div style="display:flex; gap:10px;">
                <input type="text" id="meld-input" class="game-input" placeholder="Your answer..." style="flex:1; margin:0;">
                <button class="btn-primary" style="width:auto; padding:0 24px;" onclick="App.submitChoice(document.getElementById('meld-input').value)">Lock In</button>
              </div>
            `;
            break;
          case "percentage":
            body = `
              <h3 style="text-align:center;">The 1-100 Scale</h3>
              <p style="font-weight:800;margin:24px 0;font-size:18px;text-align:center;">${esc(cur)}</p>
              <div class="slider-container">
                <input type="range" id="perc-slider" min="0" max="100" value="50" oninput="document.getElementById('perc-val').innerText = this.value">
                <div style="text-align:center; font-size:42px; font-weight:900; color:var(--primary); margin:20px 0;" id="perc-val">50</div>
                <button class="btn-primary" onclick="App.submitChoice(document.getElementById('perc-slider').value)">Submit Rating</button>
              </div>
            `;
            break;
        }
      }

      c.innerHTML = `
        <div class="card active-game-wrapper">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border);">
            ${isHost ? `<button class="btn-secondary" style="width:auto;min-height:36px;padding:6px 16px;font-size:13px;border-radius:30px;" onclick="App.exitGame()">← Lobby</button>` : `<span style="font-size:12px;font-weight:700;color:var(--text-muted);">HOST CONTROLS ROUND</span>`}
            <div class="streak-badge">🔥 ${streak}</div>
          </div>
          
          ${body}
          ${this.renderComparison()}
          
          ${isHost ? `
            <button class="btn-primary" style="margin-top:24px; background:#111; box-shadow:none;" onclick="App.launchGame('${this.activeGame}')">Next Round →</button>
          ` : ``}
        </div>
      `;
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => window.App.init());
  else window.App.init();
})();