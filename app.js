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
    myName: localStorage.getItem("duo_my_name") || ("Player " + Math.floor(Math.random() * 100)),
    myRole: "player",
    roomCode: null,
    activeGame: null,
    gameState: { choices: {}, players: {}, hostId: null, streak: 0, currentPrompt: null, secretWord: null, secretSetter: null, rankSet: null },
    pollTimer: null,
    lastHash: "",
    
    init() {
      getClient();
      this.renderHome();
    },

    isHost() { return this.gameState.hostId === this.myId; },

    renderHome() {
      const c = document.getElementById("main-content");
      if (!c) return;
      c.innerHTML = `
        <div class="card">
          <h2>DuoVibe</h2>
          <p style="margin-bottom:20px; font-weight:800;">Real-time games for long-distance couples & friends.</p>
          <label style="font-size:12px; font-weight:900; color:var(--text-main);">YOUR PLAYER NAME</label>
          <input id="input-my-name" value="${esc(this.myName)}" class="game-input" placeholder="Type name..." />
          
          <div style="margin-top:24px;">
            <button class="btn-primary" onclick="App.createRoom()">ðŸ‘‘ Create Room</button>
            <div class="divider">OR JOIN EXISTING ROOM</div>
            <div style="display:flex; gap:10px;">
              <input id="input-room-code" placeholder="6-DIGIT" class="game-input" style="text-transform:uppercase; text-align:center; margin:0;" maxlength="6" />
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
        items.push(`<span class="player-tag ${isHost ? 'host-tag' : 'player-tag-standard'}">
          ${isHost ? 'ðŸ‘‘' : 'ðŸ‘¤'} ${esc(pName)}
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
              <div style="font-size:11px; font-weight:900; color:var(--text-muted); letter-spacing:1px;">ROOM CODE</div>
              <h2 style="color:var(--primary); cursor:pointer;" onclick="navigator.clipboard.writeText('${esc(this.roomCode)}'); alert('Code copied!');">${esc(this.roomCode)} ðŸ“‹</h2>
            </div>
            <div class="streak-badge">ðŸ”¥ ${streak}</div>
          </div>
          
          <label style="font-size:11px; font-weight:900; color:var(--text-muted);">PLAYERS:</label>
          <div id="connected-players-list" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;"></div>

          ${isHost ? `
            <h3 style="margin-top:24px;">Select Game</h3>
            <div class="games-grid">
              <div class="game-mode-card" onclick="App.launchGame('secret-guess')"><span>ðŸ•µï¸â€â™‚ï¸</span><h4>Mastermind</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('would-rather')"><span>ðŸ¤”</span><h4>Would Rather</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('couple-compat')"><span>â¤ï¸</span><h4>Compat Quiz</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('mind-meld')"><span>ðŸ§ </span><h4>Mind Meld</h4></div>
              <div class="game-mode-card" onclick="App.launchGame('percentage')"><span>ðŸ’¯</span><h4>1-100 Scale</h4></div>
              <div class="game-mode-card" style="border-color:var(--primary); background:#EEF2FF;" onclick="App.launchGame('blind-rank')"><span>ðŸ”¢</span><h4 style="color:var(--primary);">Blind Rank</h4></div>
            </div>
          ` : `
            <div style="margin-top:30px; text-align:center; padding:30px 20px; background:#F8FAFC; border:2px dashed var(--border); border-radius:var(--radius-md);">
              <h3>Waiting for Host...</h3>
              <p>The host is choosing the next game. Sit tight.</p>
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
      
      if (this.activeGame === "secret-guess" && this.gameState.secretWord) {
        const guesserId = keys.find(k => k !== this.gameState.secretSetter);
        if (guesserId && choices[guesserId]) {
           if (String(choices[guesserId]).toLowerCase() === String(this.gameState.secretWord).toLowerCase()) this.gameState.streak = (this.gameState.streak || 0) + 1;
           else this.gameState.streak = 0;
        }
      } else if (keys.length === 2 && this.activeGame !== "blind-rank") {
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

    async submitCustomSecret(val) {
      if (!val || !val.trim()) return;
      this.gameState.secretWord = val.trim();
      this.gameState.secretSetter = this.myId;
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

    async submitBlindRank(slot, item) {
      this.gameState.choices = this.gameState.choices || {};
      if (typeof this.gameState.choices[this.myId] !== "object") this.gameState.choices[this.myId] = {};
      this.gameState.choices[this.myId][slot] = item;
      
      const numAnswered = Object.keys(this.gameState.choices[this.myId]).length;
      if (numAnswered === 5 && window.confetti) window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      await this.pushDB();
      this.renderActiveGame();
    },

    getDraftingBody() {
      const g = this.activeGame;
      let html = `
        <div style="text-align:center; margin-bottom:20px;">
          <h3 style="text-transform:uppercase; color:var(--primary); font-size:24px;">Draft Phase</h3>
          <p style="font-size:13px; font-weight:800; color:var(--text-muted);">Anyone can write the prompt, or roll the dice!</p>
        </div>
      `;
                  
      if (g === "would-rather") {
         html += `
           <input id="draft-a" class="game-input" placeholder="Option 1 (e.g. Eat bugs)">
           <div style="text-align:center; font-weight:900; color:var(--text-muted); margin:8px 0;">VS</div>
           <input id="draft-b" class="game-input" placeholder="Option 2 (e.g. Eat dirt)">
           <button class="btn-primary" style="margin-top:16px;" onclick="App.submitCustomPrompt({a: document.getElementById('draft-a').value, b: document.getElementById('draft-b').value})">Lock In Custom</button>
         `;
      } else if (g === "blind-rank") {
         html += `
           <textarea id="draft-rank" class="game-input" placeholder="Type 5 items separated by commas" rows="3" style="resize:none; padding:16px;"></textarea>
           <button class="btn-primary" style="margin-top:16px;" onclick="App.submitCustomRank(document.getElementById('draft-rank').value)">Lock In Custom</button>
         `;
      } else if (g === "secret-guess") {
         html += `
           <div style="background:#FEF2F2; padding:12px; border-radius:8px; border:2px dashed #EF4444; margin-bottom:12px;">
             <p style="text-align:center; font-weight:900; color:#DC2626; margin:0;">ðŸš¨ Hide screen! Type a secret word.</p>
           </div>
           <input id="draft-secret" class="game-input" placeholder="Type secret word...">
           <button class="btn-primary" style="margin-top:16px; background:var(--danger);" onclick="App.submitCustomSecret(document.getElementById('draft-secret').value)">Set Secret Word</button>
         `;
      } else {
         let ph = "Type a scenario/question...";
         if (g === "mind-meld") ph = "Type a category...";
         if (g === "percentage") ph = "Type a 1-100 scale question...";
         
         html += `
           <input id="draft-text" class="game-input" placeholder="${ph}">
           <button class="btn-primary" style="margin-top:16px;" onclick="App.submitCustomPrompt(document.getElementById('draft-text').value)">Lock In Custom</button>
         `;
      }

      html += `
        <div class="divider">OR</div>
        <button class="btn-secondary" style="border-color:var(--primary); color:var(--primary);" onclick="App.rollRandomPrompt()">ðŸŽ² Pick Random For Us</button>
      `;
      return html;
    },

    getSecretGuessBody() {
      const isSetter = this.myId === this.gameState.secretSetter;
      const secret = this.gameState.secretWord;
      const myChoice = (this.gameState.choices && this.gameState.choices[this.myId]) ? this.gameState.choices[this.myId] : null;

      if (isSetter) {
        return `
          <h3 style="text-align:center;">You set the secret!</h3>
          <p style="text-align:center; font-size:16px; font-weight:900; color:var(--danger); margin:16px 0; text-transform:uppercase;">Secret: ${esc(secret)}</p>
          <div style="padding:30px 20px; text-align:center; background:#F8FAFC; border:2px dashed var(--border); border-radius:var(--radius-md);">
            <h4>Waiting for partner to guess...</h4>
          </div>
        `;
      } else {
        if (!myChoice) {
          return `
            <h3 style="text-align:center;">Mastermind ðŸ•µï¸â€â™‚ï¸</h3>
            <p style="text-align:center; font-size:13px; font-weight:800; color:var(--text-muted); margin-bottom:16px;">Try to guess the secret word or phrase!</p>
            <input id="sg-guess" class="game-input" placeholder="Type your guess...">
            <button class="btn-primary" style="margin-top:16px;" onclick="App.submitChoice(document.getElementById('sg-guess').value)">Lock In Guess</button>
          `;
        } else {
          return `<h3 style="text-align:center;">Guess Locked In</h3><p style="text-align:center; font-size:16px; font-weight:900; color:var(--primary); margin:16px 0; text-transform:uppercase;">You guessed: ${esc(myChoice)}</p>`;
        }
      }
    },

    renderComparison() {
      const choices = this.gameState.choices || {};
      const keys = Object.keys(choices);

      if (this.activeGame === "secret-guess") {
         const setterId = this.gameState.secretSetter;
         const guesserId = Object.keys(this.gameState.players || {}).find(k => k !== setterId);
         const guess = guesserId ? choices[guesserId] : null;
         
         if (!guess) return `<div class="comparison-bar" style="text-align:center;font-weight:900;margin-top:20px;">Waiting for guess...</div>`;
         
         let html = '<div class="comparison-bar" style="margin-top:24px; background:#F8FAFC; padding:20px; border-radius:var(--radius-md); border:2px solid var(--border);">';
         html += `<p style="text-align:center; font-weight:900; font-size:18px;">Secret was: <span style="color:var(--danger);">${esc(this.gameState.secretWord)}</span></p>`;
         html += `<p style="text-align:center; font-weight:900; font-size:18px; margin-top:8px;">Guess was: <span>${esc(guess)}</span></p>`;
         
         if (String(guess).toLowerCase() === String(this.gameState.secretWord).toLowerCase()) {
            if (window.confetti) window.confetti();
            html += `<div class="match-box">ðŸ”¥ MIND READER! ðŸ”¥</div>`;
         } else {
            html += `<div class="penalty-box"><strong style="font-size:24px;">âŒ FAILED</strong></div>`;
         }
         html += '</div>';
         return html;
      }

      if (keys.length === 0) return '<div class="comparison-bar" style="text-align:center;font-weight:700;color:var(--text-muted);margin-top:20px;">Waiting for answers...</div>';

      if (this.activeGame === "blind-rank") {
        const p1Done = choices[keys[0]] && Object.keys(choices[keys[0]]).length === 5;
        const p2Done = keys.length > 1 && choices[keys[1]] && Object.keys(choices[keys[1]]).length === 5;
        
        if (!p1Done || (keys.length > 1 && !p2Done)) return '<div class="comparison-bar" style="text-align:center;margin-top:20px;font-weight:900;">Ranking in progress... â³</div>';

        let html = '<div class="comparison-bar" style="display:flex; gap:16px; margin-top:20px;">';
        keys.forEach(k => {
          const pObj = this.gameState.players && this.gameState.players[k];
          const name = (k === this.myId) ? "You" : (pObj ? (pObj.name || pObj) : "Partner");
          html += `<div style="flex:1;"><strong>${esc(name)}</strong>`;
          for(let i=1; i<=5; i++) {
            html += `<div style="font-size:13px; font-weight:800; background:#F8FAFC; border: 2px solid var(--border); margin-top:8px; padding:10px; border-radius:8px;">${i}. ${esc(choices[k][i])}</div>`;
          }
          html += `</div>`;
        });
        html += '</div>';
        return html;
      }

      let html = '<div class="comparison-bar" style="margin-top:24px; background:#F8FAFC; padding:20px; border-radius:var(--radius-md); border:2px solid var(--border);">';
      keys.forEach(k => {
        const pObj = this.gameState.players && this.gameState.players[k];
        const name = (k === this.myId) ? "You" : (pObj ? (pObj.name || pObj) : "Partner");
        html += `<div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:12px; border-bottom:2px solid var(--border);">
                   <strong style="color:var(--text-muted);">${esc(name)}:</strong>
                   <span style="font-weight:900; text-align:right;">${esc(choices[k])}</span>
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
          html += `<div class="match-box">ðŸ”¥ VIBE MATCH! ðŸ”¥</div>`;
        } else {
          html += `<div style="text-align:center;font-weight:900;margin-top:16px;color:var(--danger);font-size:18px;">ðŸ’€ STREAK BROKEN</div>`;
          if ((this.gameState.streak || 0) >= 2) {
            const dares = window.BANKS.dares || ["Take a drink!"];
            const dareStr = dares[(this.roomCode.charCodeAt(0) + vals[0].length) % dares.length];
            html += `<div class="penalty-box"><strong style="font-size:16px;letter-spacing:1px;text-transform:uppercase;">ðŸš¨ Penalty ðŸš¨</strong><br/><span style="font-weight:800;font-size:16px;margin-top:8px;display:block;">${esc(dareStr)}</span></div>`;
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
            slotsHtml += `<div style="background:#E2E8F0; padding:16px; margin-bottom:8px; border-radius:var(--radius-sm); color:#64748B; font-size:14px; text-decoration:line-through; font-weight:800; border:2px solid #CBD5E1;">${i}. ${esc(myRanks[i])}</div>`;
          } else {
            slotsHtml += `<button class="btn-secondary" style="margin-bottom:8px; justify-content:flex-start; border-color:var(--primary); color:var(--primary);" onclick="App.submitBlindRank(${i}, '${esc(currentItem)}')">Lock in Slot #${i}</button>`;
          }
        }
        return `
          <div style="background:var(--primary); color:white; padding:24px; border-radius:var(--radius-md); margin-bottom:20px; text-align:center;">
            <span style="font-size:11px; font-weight:900; opacity:0.9; letter-spacing:1px; text-transform:uppercase;">ITEM ${numAnswered + 1} OF 5</span>
            <h2 style="margin:8px 0 0 0; font-size:28px;">${esc(currentItem)}</h2>
          </div>
          ${slotsHtml}
        `;
      } else {
        return `<div style="padding:24px; text-align:center; background:#D1FAE5; color:#065F46; border-radius:var(--radius-md); margin:16px 0; font-weight:900; font-size:18px;">âœ… Locked in!</div>`;
      }
    },

    renderActiveGame() {
      const c = document.getElementById("main-content");
      if (!c) return;
      if (!this.activeGame) { this.renderLobby(); return; }

      const isHost = this.isHost();
      const streak = this.gameState.streak || 0;
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
                 <h3 style="margin-bottom:16px; text-align:center;">Would You Rather...</h3>
                 <button class="btn-choice ${myChoice === cur.a ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.a)}')">${esc(cur.a)}</button>
                 <div class="divider">OR</div>
                 <button class="btn-choice ${myChoice === cur.b ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.b)}')">${esc(cur.b)}</button>
               `;
               break;
             case "red-green-flag":
               body = `
                 <h3 style="text-align:center;">Red or Green Flag?</h3>
                 <div style="background:#F8FAFC; padding:24px; border-radius:var(--radius-md); text-align:center; margin:20px 0; border:2px solid var(--border);">
                   <p style="font-weight:900; font-size:18px; margin:0; color:var(--text-main);">"${esc(cur)}"</p>
                 </div>
                 <div style="display:flex; gap:10px;">
                   <button style="flex:1; background:#FEF2F2; color:#DC2626;" class="btn-choice ${myChoice === 'ðŸš© Red Flag' ? 'selected' : ''}" onclick="App.submitChoice('ðŸš© Red Flag')">ðŸš© Red</button>
                   <button style="flex:1; background:#ECFDF5; color:#059669;" class="btn-choice ${myChoice === 'ðŸŒ¿ Green Flag' ? 'selected' : ''}" onclick="App.submitChoice('ðŸŒ¿ Green Flag')">ðŸŒ¿ Green</button>
                 </div>
               `;
               break;
             case "couple-compat":
               body = `
                 <h3 style="text-align:center;">Compatibility Quiz</h3>
                 <p style="font-weight:900;margin:24px 0;font-size:20px;text-align:center;line-height:1.3;">${esc(cur)}</p>
                 <div style="display:flex; gap:12px;">
                   <button style="flex:1; padding:32px 10px;" class="btn-choice ${myChoice === 'ME' ? 'selected' : ''}" onclick="App.submitChoice('ME')"><span style="font-size:32px;display:block;margin-bottom:8px;">ðŸ™‹â€â™‚ï¸</span> Me</button>
                   <button style="flex:1; padding:32px 10px;" class="btn-choice ${myChoice === 'PARTNER' ? 'selected' : ''}" onclick="App.submitChoice('PARTNER')"><span style="font-size:32px;display:block;margin-bottom:8px;">ðŸ™‹â€â™€ï¸</span> Partner</button>
                 </div>
               `;
               break;
             case "mind-meld":
               body = `
                 <h3 style="text-align:center;">Mind Meld ðŸ§ </h3>
                 <div style="background:var(--accent); color:white; padding:24px; border-radius:var(--radius-md); text-align:center; margin:20px 0;">
                   <p style="font-weight:900;font-size:20px;margin:0;color:white;">${esc(cur)}</p>
                 </div>
                 <p style="font-size:13px; font-weight:800; color:var(--text-muted); text-align:center; margin-bottom:16px;">Type the first thing that comes to mind.</p>
                 <div style="display:flex; gap:10px;">
                   <input type="text" id="meld-input" class="game-input" placeholder="Your answer..." style="flex:1; margin:0;">
                   <button class="btn-primary" style="width:auto; padding:0 24px;" onclick="App.submitChoice(document.getElementById('meld-input').value)">Lock In</button>
                 </div>
               `;
               break;
             case "percentage":
               body = `
                 <h3 style="text-align:center;">The 1-100 Scale</h3>
                 <p style="font-weight:900;margin:24px 0;font-size:18px;text-align:center;">${esc(cur)}</p>
                 <div class="slider-container">
                   <input type="range" id="perc-slider" min="0" max="100" value="50" oninput="document.getElementById('perc-val').innerText = this.value">
                   <div style="text-align:center; font-size:48px; font-weight:900; color:var(--primary); margin:20px 0;" id="perc-val">50</div>
                   <button class="btn-primary" onclick="App.submitChoice(document.getElementById('perc-slider').value)">Submit Rating</button>
                 </div>
               `;
               break;
           }
         }
      }

      c.innerHTML = `
        <div class="card active-game-wrapper">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid var(--border);">
            ${isHost ? `<button class="btn-secondary" style="width:auto;min-height:36px;padding:6px 16px;font-size:13px;border-radius:10px;" onclick="App.exitGame()">Lobby</button>` : `<span style="font-size:13px;font-weight:900;color:var(--text-muted);text-transform:uppercase;">HOST CONTROLS ROUND</span>`}
            <div class="streak-badge">ðŸ”¥ ${streak}</div>
          </div>
          
          ${body}
          ${this.gameState.currentPrompt ? this.renderComparison() : ''}
          
          ${isHost && this.gameState.currentPrompt ? `
            <button class="btn-primary" style="margin-top:30px; background:var(--text-main);" onclick="App.launchGame('${this.activeGame}')">Next Round â†’</button>
          ` : ``}
        </div>
      `;
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => window.App.init());
  else window.App.init();
})();