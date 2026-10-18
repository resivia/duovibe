(function () {
  "use strict";

  function esc(val) {
    return String(val == null ? "" : val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function getPersistentId() {
    let id = localStorage.getItem("duovibe_uid");
    if (!id) {
      id = "user_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("duovibe_uid", id);
    }
    return id;
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
    myId: getPersistentId(),
    myName: localStorage.getItem("duo_my_name") || ("Player_" + Math.floor(Math.random() * 1000)),
    myRole: "player",
    roomCode: null,
    activeGame: null,
    gameState: { choices: {}, players: {}, hostId: null, streak: 0, currentPrompt: null, secretWord: null, secretSetter: null, rankSet: null },
    pollTimer: null,
    lastHash: "",
    celebrated: false,
    
    init() {
      getClient();
      this.renderHome();
    },

    isHost() { return this.gameState.hostId === this.myId; },

    checkAllAnswered() {
      const numPlayers = Object.keys(this.gameState.players || {}).length || 2;
      const numChoices = Object.keys(this.gameState.choices || {}).length;
      
      if (this.activeGame === "secret-guess") return numChoices >= (numPlayers - 1);
      if (this.activeGame === "blind-rank") {
        const keys = Object.keys(this.gameState.players || {});
        for (let k of keys) {
            if (!this.gameState.choices || !this.gameState.choices[k] || Object.keys(this.gameState.choices[k]).length < 5) return false;
        }
        return true;
      }
      return numChoices >= numPlayers;
    },

    renderHome() {
      const c = document.getElementById("main-content");
      if (!c) return;
      c.innerHTML = `
        <div class="workspace-shell" style="text-align:center;">
          <div style="font-size:60px; margin-bottom:10px;">🔥</div>
          <h2>DuoVibe</h2>
          <p style="margin-bottom:32px;">Are you on the same wavelength?</p>
          
          <div style="text-align:left;">
            <label style="font-size:13px; font-weight:800; color:rgba(255,255,255,0.6); text-transform:uppercase; margin-left:8px;">Your Handle</label>
            <input id="input-my-name" value="${esc(this.myName)}" class="game-input" placeholder="Type your name..." />
          </div>
          
          <div style="margin-top:32px;">
            <button class="btn-primary" onclick="App.createRoom()">Create Session</button>
            <div class="divider">Join a Friend</div>
            <div style="display:flex; gap:12px;">
              <input id="input-room-code" placeholder="CODE" class="game-input" style="text-transform:uppercase; text-align:center; margin:0; flex:1;" maxlength="6" />
              <button class="btn-secondary" style="width:120px; background:rgba(255,255,255,0.15);" onclick="App.joinRoomWithCode()">Join</button>
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
      else alert("Invalid session code.");
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
          if (!creatingAsHost) { alert("Session not found."); this.renderHome(); return; }
          const state = { hostId: this.myId, players: { [this.myId]: { name: this.myName, role: "host" } }, choices: {}, streak: 0 };
          await sb.from("rooms").insert({ id: code, current_game: "", game_state: state });
          this.gameState = state;
        } else {
          let state = room.game_state || { choices: {}, players: {}, hostId: null, streak: 0 };
          state.players = state.players || {};
          
          if (state.players[this.myId]) {
             this.myRole = state.players[this.myId].role;
             if (this.myRole === 'host') state.hostId = this.myId;
          } else {
             if (!state.hostId && creatingAsHost) state.hostId = this.myId;
             this.myRole = (state.hostId === this.myId) ? "host" : "player";
          }
          
          state.players[this.myId] = { name: this.myName, role: this.myRole };
          await sb.from("rooms").update({ game_state: state, updated_at: new Date().toISOString() }).eq("id", code);
          this.activeGame = room.current_game || null;
          this.gameState = state;
        }
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(() => this.pollDB(), 800);
        this.renderLobby();
      } catch (e) {}
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
        
        state.currentPrompt = this.gameState.currentPrompt || null;
        state.rankSet = this.gameState.rankSet || null;
        state.secretWord = this.gameState.secretWord || null;
        state.secretSetter = this.gameState.secretSetter || null;
        
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
        items.push(`<span class="badge ${isHost ? 'badge-host' : 'badge-player'}">
          ${isHost ? '⭐' : '👤'} ${esc(pName)}
        </span>`);
      });
      container.innerHTML = items.join("");
    },

    renderLobby() {
      const c = document.getElementById("main-content");
      if (!c) return;
      const isHost = this.isHost();
      const streak = this.gameState.streak || 0;

      c.innerHTML = `
        <div class="workspace-shell lobby-wrapper">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
            <div>
              <div style="font-size:12px; font-weight:800; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">Room Code</div>
              <div style="font-size:36px; font-weight:900; letter-spacing:4px; color:var(--secondary); cursor:pointer;" onclick="navigator.clipboard.writeText('${esc(this.roomCode)}'); alert('Copied!');">${esc(this.roomCode)}</div>
            </div>
            <div class="badge badge-streak">🔥 ${streak}</div>
          </div>
          
          <div style="background:rgba(0,0,0,0.3); padding:20px; border-radius:20px; border:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:12px; font-weight:800; color:var(--text-muted); margin-bottom:12px; text-transform:uppercase;">Connected</div>
            <div id="connected-players-list" style="display:flex; gap:10px; flex-wrap:wrap;"></div>
          </div>

          ${isHost ? `
            <h3 style="margin-top:32px; font-size:24px; text-align:center;">Select Mode</h3>
            <div class="games-grid">
              <div class="game-mode-card" onclick="App.launchGame('secret-guess')"><span>🕵️‍♂️</span><h4>Mastermind</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('would-rather')"><span>🤔</span><h4>Would Rather</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('couple-compat')"><span>❤️</span><h4>Compat Quiz</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('mind-meld')"><span>🧠</span><h4>Mind Meld</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('percentage')"><span>💯</span><h4>Vibe Slider</h4></div>
              <div class="game-mode-card" style="border-color:var(--secondary); background:rgba(0,229,255,0.05);" onclick="App.launchGame('blind-rank')"><span>🔢</span><h4 style="color:var(--secondary);">Blind Rank</h4></div>
            </div>
          ` : `
            <div style="margin-top:30px; text-align:center; padding:40px 20px; background:rgba(255,255,255,0.05); border:2px dashed rgba(255,255,255,0.2); border-radius:24px;">
              <h4 style="font-size:20px; font-weight:800;">Waiting for Host...</h4>
              <p style="font-size:15px; margin-top:12px;">They are picking the next game. Sit tight.</p>
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
      
      if (!this.checkAllAnswered()) return;
      
      if (this.activeGame === "secret-guess" && this.gameState.secretWord) {
        const guesserId = keys.find(k => k !== this.gameState.secretSetter);
        if (guesserId && choices[guesserId]) {
           if (String(choices[guesserId]).toLowerCase() === String(this.gameState.secretWord).toLowerCase()) this.gameState.streak = (this.gameState.streak || 0) + 1;
           else this.gameState.streak = 0;
        }
      } else if (keys.length >= 2 && this.activeGame !== "blind-rank") {
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
      this.gameState.currentPrompt = null;
      this.gameState.secretWord = null;
      this.gameState.secretSetter = null;
      this.gameState.rankSet = null;
      this.celebrated = false;

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

    async submitCustomPrompt(val) {
      if (!val) return;
      if (typeof val === 'object' && (!val.a || !val.b)) return;
      this.gameState.currentPrompt = val;
      await this.pushDB();
      this.renderActiveGame();
    },

    async submitCustomRank(val) {
      if (!val || !val.trim()) return;
      let items = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      while(items.length < 5) items.push("Empty");
      this.gameState.rankSet = items.slice(0,5);
      this.gameState.currentPrompt = "ready";
      await this.pushDB();
      this.renderActiveGame();
    },

    async rollRandomPrompt() {
      const g = this.activeGame;
      const b = window.BANKS || {};
      const p = window.Picker;
      
      if (g === "would-rather") this.gameState.currentPrompt = p.nextItem("wouldRather", b.wouldRather);
      else if (g === "red-green-flag") this.gameState.currentPrompt = p.nextItem("redGreenFlag", b.redGreenFlag);
      else if (g === "couple-compat") this.gameState.currentPrompt = p.nextItem("compatQuiz", b.compatQuiz);
      else if (g === "mind-meld") this.gameState.currentPrompt = p.nextItem("mindMeld", b.mindMeld);
      else if (g === "percentage") this.gameState.currentPrompt = p.nextItem("percentage", b.percentage);
      else if (g === "blind-rank") {
         this.gameState.rankSet = p.freshBlindRankSet();
         this.gameState.currentPrompt = "ready";
      } else if (g === "secret-guess") {
         this.gameState.secretWord = p.nextItem("secretGuess", b.secretGuess);
         this.gameState.secretSetter = this.gameState.hostId;
         this.gameState.currentPrompt = "ready";
      }
      await this.pushDB();
      this.renderActiveGame();
    },

    async submitChoice(val) {
      if (!val || !val.toString().trim()) return;
      this.gameState.choices = this.gameState.choices || {};
      this.gameState.choices[this.myId] = val.toString().trim();
      await this.pushDB();
      this.renderActiveGame();
    },

    async hostSetSecret(val) {
      if (!this.isHost()) return;
      this.gameState.secretWord = val;
      this.gameState.secretSetter = this.myId;
      this.gameState.currentPrompt = "ready";
      await this.pushDB();
      this.renderActiveGame();
    },

    async submitBlindRank(slot, item) {
      this.gameState.choices = this.gameState.choices || {};
      if (typeof this.gameState.choices[this.myId] !== "object") this.gameState.choices[this.myId] = {};
      this.gameState.choices[this.myId][slot] = item;
      
      const numAnswered = Object.keys(this.gameState.choices[this.myId]).length;
      if (numAnswered === 5 && window.confetti && !this.celebrated) {
          window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.8 } });
      }
      await this.pushDB();
      this.renderActiveGame();
    },

    getDraftingBody() {
      if (!this.isHost()) {
         return `
            <div style="text-align:center; padding:40px 20px; background:rgba(255,255,255,0.05); border:2px dashed rgba(255,255,255,0.2); border-radius:24px;">
              <div style="font-size:40px; margin-bottom:16px;">⏳</div>
              <h3 style="margin-bottom:8px;">Configuring Round</h3>
              <p>Host is picking the prompt...</p>
            </div>
         `;
      }

      const g = this.activeGame;
      let html = `
        <div style="text-align:center; margin-bottom:32px;">
          <h2 style="font-size:28px;">Setup Phase</h2>
          <p>Write your own prompt or pick randomly!</p>
        </div>
      `;

      if (g === "would-rather") {
         html += `
           <input id="draft-a" class="game-input" placeholder="Option A">
           <div class="divider">VS</div>
           <input id="draft-b" class="game-input" placeholder="Option B">
           <button class="btn-primary" style="margin-top:24px;" onclick="App.submitCustomPrompt({a: document.getElementById('draft-a').value, b: document.getElementById('draft-b').value})">Lock In Custom</button>
         `;
      } else if (g === "blind-rank") {
         html += `
           <textarea id="draft-rank" class="game-input" placeholder="Input 5 items (comma separated)" rows="3" style="resize:none; padding:16px;"></textarea>
           <button class="btn-primary" style="margin-top:24px;" onclick="App.submitCustomRank(document.getElementById('draft-rank').value)">Lock In Custom</button>
         `;
      } else if (g === "secret-guess") {
         const items = window.Picker.get50Items();
         let gridHtml = `<div class="options-grid">`;
         items.forEach(item => {
           gridHtml += `<div class="option-chip" onclick="App.hostSetSecret('${esc(item)}')">${esc(item)}</div>`;
         });
         gridHtml += `</div>`;
         html = `<h3>Select Target Node</h3><p>Choose 1 of 50 items for the user to identify.</p>${gridHtml}`;
      } else {
         let ph = "Type a scenario/question...";
         if (g === "mind-meld") ph = "Type a category (e.g. A fast food chain)";
         if (g === "percentage") ph = "Type a 1-100 question (e.g. How annoying is...)";

         html += `
           <input id="draft-text" class="game-input" placeholder="${ph}">
           <button class="btn-primary" style="margin-top:24px;" onclick="App.submitCustomPrompt(document.getElementById('draft-text').value)">Lock In Custom</button>
         `;
      }

      html += `
        <div class="divider">OR</div>
        <button class="btn-secondary" onclick="App.rollRandomPrompt()">🎲 Generate Random Prompt</button>
      `;
      return html;
    },

    getSecretGuessBody() {
      const isSetter = this.myId === this.gameState.secretSetter;
      const secret = this.gameState.secretWord;
      const myChoice = (this.gameState.choices && this.gameState.choices[this.myId]) ? this.gameState.choices[this.myId] : null;

      if (isSetter) {
        return `
          <h3>Target Locked</h3>
          <div style="background:rgba(255, 51, 102, 0.15); border:2px solid #FF3366; padding:24px; border-radius:24px; margin:20px 0; text-align:center; box-shadow:0 0 20px rgba(255,51,102,0.3);">
            <span style="font-size:12px; font-weight:900; color:#FF3366; letter-spacing:2px; text-transform:uppercase;">SECRET</span>
            <div style="font-size:28px; font-weight:900; margin-top:8px; color:#FFF;">${esc(secret)}</div>
          </div>
          <div style="padding:32px; text-align:center; background:rgba(0,0,0,0.2); border:1px dashed rgba(255,255,255,0.2); border-radius:20px;">
            <p>Waiting for them to guess...</p>
          </div>
        `;
      } else {
        if (!myChoice) {
          const items = window.Picker.get50Items();
          let gridHtml = `<div class="options-grid">`;
          items.forEach(item => {
            gridHtml += `<div class="option-chip" onclick="App.submitChoice('${esc(item)}')">${esc(item)}</div>`;
          });
          gridHtml += `</div>`;

          return `
            <h3>Identify Target</h3>
            <p>The host has locked a target node. Select the matching string.</p>
            ${gridHtml}
          `;
        } else {
          return `
            <h3>Submission Sent</h3>
            <div style="background:rgba(0, 229, 255, 0.15); border:2px solid #00E5FF; padding:24px; border-radius:24px; margin:20px 0; text-align:center; box-shadow:0 0 20px rgba(0,229,255,0.2);">
              <span style="font-size:12px; font-weight:900; color:#00E5FF; letter-spacing:2px; text-transform:uppercase;">YOUR GUESS</span>
              <div style="font-size:28px; font-weight:900; margin-top:8px; color:#FFF;">${esc(myChoice)}</div>
            </div>
          `;
        }
      }
    },

    renderComparison() {
      const choices = this.gameState.choices || {};
      const keys = Object.keys(choices);
      const allAnswered = this.checkAllAnswered();

      if (this.activeGame === "secret-guess") {
         const setterId = this.gameState.secretSetter;
         const guesserId = Object.keys(this.gameState.players || {}).find(k => k !== setterId);
         const guess = guesserId ? choices[guesserId] : null;
         
         if (!guess) return ``;
         
         let html = '<div style="margin-top:32px; padding-top:24px; border-top:1px solid rgba(255,255,255,0.1);">';
         html += `<div style="display:flex; justify-content:space-between; margin-bottom:16px; align-items:center;"><span style="color:var(--text-muted); font-size:14px; font-weight:800;">Target:</span><span style="font-weight:900; font-size:20px; color:var(--danger);">${esc(this.gameState.secretWord)}</span></div>`;
         html += `<div style="display:flex; justify-content:space-between; align-items:center;"><span style="color:var(--text-muted); font-size:14px; font-weight:800;">Guessed:</span><span style="font-weight:900; font-size:20px; color:#FFF;">${esc(guess)}</span></div>`;
         
         if (String(guess).toLowerCase() === String(this.gameState.secretWord).toLowerCase()) {
            if (window.confetti && allAnswered && !this.celebrated) { window.confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } }); this.celebrated = true; }
            html += `<div class="match-box" style="display:flex; flex-direction:column; gap:6px;">
                       <span style="font-size:22px;">🔥 VIBE MATCH!</span>
                       <span style="font-size:14px; font-weight:800; color:rgba(0,0,0,0.6); background:rgba(255,255,255,0.3); padding:4px 12px; border-radius:12px; align-self:center;">TARGET ACQUIRED!</span>
                     </div>`;
         } else {
            html += `<div class="penalty-box"><strong style="font-size:24px;">❌ FAILED</strong></div>`;
         }
         html += '</div>';
         return html;
      }

      if (keys.length === 0) return '';

      if (this.activeGame === "blind-rank") {
        if (!allAnswered) return `<div style="margin-top:32px; color:var(--secondary); font-size:15px; font-weight:900; text-align:center; text-transform:uppercase; letter-spacing:1px; animation: pulse 1.5s infinite;">Waiting for Partner...</div>`;

        let html = '<div style="display:flex; gap:16px; margin-top:32px; padding-top:24px; border-top:1px solid rgba(255,255,255,0.1);">';
        keys.forEach(k => {
          const pObj = this.gameState.players && this.gameState.players[k];
          const name = (k === this.myId) ? "You" : (pObj ? (pObj.name || pObj) : "Partner");
          html += `<div style="flex:1;"><strong style="font-size:14px; color:var(--secondary); text-transform:uppercase; display:block; text-align:center; margin-bottom:12px;">${esc(name)}</strong>`;
          for(let i=1; i<=5; i++) {
            html += `<div style="font-size:14px; font-weight:800; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); margin-top:8px; padding:12px; border-radius:12px;">${i}. ${esc(choices[k][i])}</div>`;
          }
          html += `</div>`;
        });
        html += '</div>';
        return html;
      }

      let html = '<div style="margin-top:32px; padding:32px 24px; background:rgba(0,0,0,0.2); border-radius:24px; border:1px solid rgba(255,255,255,0.05);">';
      keys.forEach(k => {
        const pObj = this.gameState.players && this.gameState.players[k];
        const name = (k === this.myId) ? "You" : (pObj ? (pObj.name || pObj) : "Partner");
        
        let displayChoice = esc(choices[k]);
        if (!allAnswered && k !== this.myId) {
           displayChoice = `<span style="color:var(--secondary); font-weight:900; font-size:14px; letter-spacing:2px;">[ HIDDEN ]</span>`;
        }

        html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.1);">
                   <span style="color:var(--text-muted); font-weight:800; font-size:16px;">${esc(name)}:</span>
                   <span style="font-weight:900; font-size:18px;">${displayChoice}</span>
                 </div>`;
      });

      if (allAnswered && keys.length >= 2) {
        const vals = keys.map(k => choices[k]);
        let isMatch = false;
        
        if (this.activeGame === "percentage") isMatch = Math.abs(parseInt(vals[0]) - parseInt(vals[1])) <= 15;
        else if (this.activeGame === "mind-meld") isMatch = String(vals[0]).toLowerCase() === String(vals[1]).toLowerCase();
        else isMatch = vals[0] === vals[1];

        if (isMatch) {
          if (window.confetti && !this.celebrated) { window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); this.celebrated = true; }
          
          let matchReason = "EXACT MATCH!";
          if (this.activeGame === "couple-compat") matchReason = `BOTH AGREED ON ${esc(vals[0]).toUpperCase()}!`;
          else if (this.activeGame === "percentage") matchReason = `WITHIN 15 POINTS!`;
          else if (this.activeGame === "mind-meld") matchReason = `EXACT MIND MELD!`;
          else if (this.activeGame === "would-rather") matchReason = `SAME CHOICE!`;

          html += `<div class="match-box" style="display:flex; flex-direction:column; gap:6px;">
                     <span style="font-size:22px;">🔥 VIBE MATCH!</span>
                     <span style="font-size:14px; font-weight:800; color:rgba(0,0,0,0.6); background:rgba(255,255,255,0.3); padding:4px 12px; border-radius:12px; align-self:center;">${matchReason}</span>
                   </div>`;
        } else {
          html += `<div style="text-align:center;font-weight:900;margin-top:24px;color:var(--danger);font-size:20px;text-transform:uppercase;letter-spacing:1px;">❌ Streak Broken</div>`;
          if ((this.gameState.streak || 0) >= 2) {
            const dares = window.BANKS.dares || ["Take a drink!"];
            const dareStr = dares[(this.roomCode.charCodeAt(0) + vals[0].length) % dares.length];
            html += `<div class="penalty-box"><strong style="font-size:18px; letter-spacing:1.5px; text-transform:uppercase;">🚨 Penalty 🚨</strong><br/><span style="font-weight:800; font-size:18px; margin-top:12px; display:block; line-height:1.4;">${esc(dareStr)}</span></div>`;
          }
        }
      } else if (!allAnswered) {
         html += `<div style="text-align:center; font-weight:800; color:var(--secondary); font-size:15px; margin-top:24px; text-transform:uppercase; letter-spacing:1px; animation: pulse 1.5s infinite;">Waiting for partner...</div>`;
      }
      
      html += '</div>';
      return html;
    },

    updateGameChoicesUI() {
      const bar = document.querySelector(".comparison-container");
      if (bar) {
        const temp = document.createElement("div");
        temp.innerHTML = this.renderComparison();
        bar.innerHTML = temp.firstElementChild ? temp.firstElementChild.innerHTML : '';
      }
      if (this.activeGame === "blind-rank" && document.getElementById("br-body")) {
        document.getElementById("br-body").innerHTML = this.getBlindRankBody();
      }
      if (this.activeGame === "secret-guess" && document.getElementById("sg-body")) {
        document.getElementById("sg-body").innerHTML = this.getSecretGuessBody();
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
            slotsHtml += `<div style="background:rgba(255,255,255,0.05); padding:16px; margin-bottom:12px; border-radius:16px; color:rgba(255,255,255,0.4); font-size:16px; text-decoration:line-through; font-weight:800; border:2px solid rgba(255,255,255,0.1);">${i}. ${esc(myRanks[i])}</div>`;
          } else {
            slotsHtml += `<button class="btn-secondary" style="margin-bottom:12px; justify-content:flex-start; font-size:16px; padding:18px 20px; border-color:var(--secondary); color:var(--secondary);" onclick="App.submitBlindRank(${i}, '${esc(currentItem)}')">Lock into Slot [ ${i} ]</button>`;
          }
        }
        return `
          <div style="background:linear-gradient(135deg, var(--primary), #FF8000); color:white; padding:32px 20px; border-radius:24px; margin-bottom:30px; text-align:center; box-shadow: 0 10px 20px rgba(255,46,147,0.3);">
            <span style="font-size:12px; font-weight:900; opacity:0.9; letter-spacing:2px; text-transform:uppercase;">ITEM ${numAnswered + 1} OF 5</span>
            <h2 style="margin:12px 0 0 0; font-size:32px;">${esc(currentItem)}</h2>
          </div>
          ${slotsHtml}
        `;
      } else {
        return `<div style="padding:32px; text-align:center; background:rgba(0,255,136,0.15); color:var(--success); border:2px solid rgba(0,255,136,0.3); border-radius:24px; margin:24px 0; font-weight:900; font-size:22px;">✅ List Locked!</div>`;
      }
    },

    renderActiveGame() {
      const c = document.getElementById("main-content");
      if (!c) return;
      if (!this.activeGame) { this.renderLobby(); return; }

      const isHost = this.isHost();
      const streak = this.gameState.streak || 0;
      const allAnswered = this.checkAllAnswered();
      let body = "";
      
      if (!this.gameState.currentPrompt) {
         body = this.getDraftingBody();
      } else {
         const cur = this.gameState.currentPrompt || { a: "A", b: "B" };
         const myChoice = (this.gameState.choices && this.gameState.choices[this.myId]) ? this.gameState.choices[this.myId] : null;

         if (this.activeGame === "blind-rank") {
           body = `<div id="br-body">${this.getBlindRankBody()}</div>`;
         } else if (this.activeGame === "secret-guess") {
           body = `<div id="sg-body">${this.getSecretGuessBody()}</div>`;
         } else {
           switch (this.activeGame) {
             case "would-rather":
               body = `
                 <h3 style="margin-bottom:20px; text-align:center; font-size:24px;">Would You Rather...</h3>
                 <button class="btn-choice ${myChoice === cur.a ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.a)}')">${esc(cur.a)}</button>
                 <div class="divider">OR</div>
                 <button class="btn-choice ${myChoice === cur.b ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.b)}')">${esc(cur.b)}</button>
               `;
               break;
             case "red-green-flag":
               body = `
                 <h3 style="text-align:center; font-size:24px;">Red or Green Flag?</h3>
                 <div style="background:rgba(0,0,0,0.3); padding:32px 24px; border-radius:24px; text-align:center; margin:24px 0; border:2px solid rgba(255,255,255,0.1); box-shadow:inset 0 4px 15px rgba(0,0,0,0.5);">
                   <p style="font-weight:900; font-size:22px; margin:0; color:#FFF; line-height:1.4;">"${esc(cur)}"</p>
                 </div>
                 <div style="display:flex; gap:16px;">
                   <button style="flex:1; border-color:rgba(255,51,102,0.4); color:var(--danger);" class="btn-choice ${myChoice === 'Red Flag' ? 'selected' : ''}" onclick="App.submitChoice('Red Flag')">🚩 Red</button>
                   <button style="flex:1; border-color:rgba(0,255,136,0.4); color:var(--success);" class="btn-choice ${myChoice === 'Green Flag' ? 'selected' : ''}" onclick="App.submitChoice('Green Flag')">🌿 Green</button>
                 </div>
               `;
               break;
             case "couple-compat":
               const pKeys = Object.keys(this.gameState.players || {});
               const name1 = pKeys.length > 0 ? this.gameState.players[pKeys[0]].name : "Player 1";
               const name2 = pKeys.length > 1 ? this.gameState.players[pKeys[1]].name : "Waiting...";
               body = `
                 <h3 style="text-align:center; font-size:24px;">Who is more likely?</h3>
                 <p style="font-weight:900;margin:16px 0 8px 0;font-size:24px;text-align:center;line-height:1.4;">${esc(cur)}</p>
                 <div style="background:rgba(0, 229, 255, 0.15); border:1px solid rgba(0, 229, 255, 0.3); border-radius:16px; padding:16px; margin-bottom:24px; text-align:center;">
                    <p style="font-weight:900; color:var(--secondary); font-size:14px; text-transform:uppercase; letter-spacing:1px; margin:0;">Win Condition: Consensus</p>
                    <p style="font-weight:700; color:rgba(255,255,255,0.7); font-size:13px; margin-top:6px;">You only get a point if you both vote for the same person!</p>
                 </div>
                 <div style="display:flex; gap:16px;">
                   <button style="flex:1; padding:32px 10px; font-size:18px; text-transform:uppercase;" class="btn-choice ${myChoice === name1 ? 'selected' : ''}" onclick="App.submitChoice('${esc(name1)}')">${esc(name1)}</button>
                   <button style="flex:1; padding:32px 10px; font-size:18px; text-transform:uppercase;" class="btn-choice ${myChoice === name2 ? 'selected' : ''}" onclick="App.submitChoice('${esc(name2)}')">${esc(name2)}</button>
                 </div>
               `;
               break;
             case "mind-meld":
               body = `
                 <h3 style="text-align:center; font-size:24px;">Mind Meld 🧠</h3>
                 <div style="background:var(--primary); color:white; padding:32px 24px; border-radius:24px; text-align:center; margin:24px 0; box-shadow:0 10px 30px rgba(255,46,147,0.3);">
                   <p style="font-weight:900;font-size:24px;margin:0;">${esc(cur)}</p>
                 </div>
                 <div style="background:rgba(0, 229, 255, 0.15); border:1px solid rgba(0, 229, 255, 0.3); border-radius:16px; padding:16px; margin-bottom:24px; text-align:center;">
                    <p style="font-weight:900; color:var(--secondary); font-size:14px; text-transform:uppercase; letter-spacing:1px; margin:0;">Win Condition: Exact Match</p>
                    <p style="font-weight:700; color:rgba(255,255,255,0.7); font-size:13px; margin-top:6px;">Type the exact same word/phrase to win.</p>
                 </div>
                 <div style="display:flex; flex-direction:column; gap:16px;">
                   <input type="text" id="meld-input" class="game-input" placeholder="Type your answer here..." style="text-align:center; font-size:20px; padding:20px;">
                   <button class="btn-primary" onclick="App.submitChoice(document.getElementById('meld-input').value)">Lock Answer</button>
                 </div>
               `;
               break;
             case "percentage":
               body = `
                 <h3 style="text-align:center; font-size:24px;">The Vibe Slider</h3>
                 <p style="font-weight:900;margin:16px 0 8px 0;font-size:22px;text-align:center;line-height:1.4;">${esc(cur)}</p>
                 <div style="background:rgba(0, 229, 255, 0.15); border:1px solid rgba(0, 229, 255, 0.3); border-radius:16px; padding:16px; margin-bottom:16px; text-align:center;">
                    <p style="font-weight:900; color:var(--secondary); font-size:14px; text-transform:uppercase; letter-spacing:1px; margin:0;">Win Condition: Margin of Error</p>
                    <p style="font-weight:700; color:rgba(255,255,255,0.7); font-size:13px; margin-top:6px;">Match your partner within 15 points to win!</p>
                 </div>
                 <div class="slider-container">
                   <input type="range" id="perc-slider" min="0" max="100" value="50" oninput="document.getElementById('perc-val').innerText = this.value + '%'">
                   <div style="text-align:center; font-size:64px; font-weight:900; color:var(--secondary); margin:32px 0; text-shadow: 0 0 30px rgba(0,229,255,0.4);" id="perc-val">50%</div>
                   <button class="btn-primary" onclick="App.submitChoice(document.getElementById('perc-slider').value)">Lock Rating</button>
                 </div>
               `;
               break;
           }
         }
      }

      c.innerHTML = `
        <div class="workspace-shell active-game-wrapper">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            ${isHost ? `<button class="btn-secondary" style="width:auto;padding:10px 20px;font-size:13px;border-radius:20px;" onclick="App.exitGame()">Exit Module</button>` : `<span class="badge badge-player">AWAITING HOST</span>`}
            <span class="badge badge-streak">🔥 ${streak}</span>
          </div>
          
          ${body}
          <div class="comparison-container">
            ${this.gameState.currentPrompt ? this.renderComparison() : ''}
          </div>
          
          ${isHost && this.gameState.currentPrompt && allAnswered ? `
            <button class="btn-primary" style="margin-top:36px; background:#FFF; color:#000; box-shadow:0 6px 0 #CCC;" onclick="App.launchGame('${this.activeGame}')">Next Round →</button>
          ` : ``}
        </div>
      `;
    }
  };

  const style = document.createElement('style');
  style.innerHTML = `@keyframes pulse { 0% {opacity:0.4;} 50% {opacity:1;} 100% {opacity:0.4;} }`;
  document.head.appendChild(style);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => window.App.init());
  else window.App.init();
})();