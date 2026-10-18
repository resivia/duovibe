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
    celebrated: false, // Prevents duplicate confetti pops
    
    init() {
      getClient();
      this.renderHome();
    },

    isHost() { return this.gameState.hostId === this.myId; },

    // Core verification engine to check if all connected players have submitted data
    checkAllAnswered() {
      const numPlayers = Object.keys(this.gameState.players || {}).length || 2;
      const numChoices = Object.keys(this.gameState.choices || {}).length;
      
      if (this.activeGame === "secret-guess") {
        // Mastermind: 1 setter, everyone else guesses. 
        return numChoices >= (numPlayers - 1);
      }
      if (this.activeGame === "blind-rank") {
        // Blind Rank: All players must have exactly 5 slots filled
        const keys = Object.keys(this.gameState.players || {});
        for (let k of keys) {
            if (!this.gameState.choices || !this.gameState.choices[k] || Object.keys(this.gameState.choices[k]).length < 5) return false;
        }
        return true;
      }
      // Default: 1 choice per player
      return numChoices >= numPlayers;
    },

    renderHome() {
      const c = document.getElementById("main-content");
      if (!c) return;
      c.innerHTML = `
        <div class="workspace-shell">
          <div>
            <h2>Initialize</h2>
            <p>Establish a real-time connection sequence.</p>
          </div>
          
          <div>
            <label style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); text-transform:uppercase;">Player Handle</label>
            <input id="input-my-name" value="${esc(this.myName)}" class="game-input" placeholder="Enter handle..." />
          </div>
          
          <div style="margin-top:16px;">
            <button class="btn-primary" onclick="App.createRoom()">Create Session (Host)</button>
            <div class="divider">Join Session</div>
            <div style="display:flex; gap:12px;">
              <input id="input-room-code" placeholder="CODE" class="game-input" style="text-transform:uppercase; text-align:center; margin:0;" maxlength="6" />
              <button class="btn-secondary" style="width:140px;" onclick="App.joinRoomWithCode()">Connect</button>
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
        this.pollTimer = setInterval(() => this.pollDB(), 750);
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
          ${isHost ? '[HOST]' : '[USER]'} ${esc(pName)}
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
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); margin-bottom:4px;">SESSION_ID</div>
              <div class="mono-display" style="cursor:pointer;" onclick="navigator.clipboard.writeText('${esc(this.roomCode)}'); alert('Code copied!');">${esc(this.roomCode)}</div>
            </div>
            <div class="badge badge-streak">STREAK: ${streak}</div>
          </div>
          
          <div>
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); margin-bottom:8px;">ACTIVE_NODES</div>
            <div id="connected-players-list" style="display:flex; gap:8px; flex-wrap:wrap;"></div>
          </div>

          ${isHost ? `
            <div style="margin-top:16px;">
              <h3>Deploy Module</h3>
              <div class="games-grid">
                <div class="game-mode-card" onclick="App.launchGame('secret-guess')"><span>[01]</span><h4>Mastermind</h4></div>
                <div class="game-mode-card" onclick="App.launchGame('would-rather')"><span>[02]</span><h4>Would Rather</h4></div>
                <div class="game-mode-card" onclick="App.launchGame('couple-compat')"><span>[03]</span><h4>Compat Quiz</h4></div>
                <div class="game-mode-card" onclick="App.launchGame('mind-meld')"><span>[04]</span><h4>Mind Meld</h4></div>
                <div class="game-mode-card" onclick="App.launchGame('percentage')"><span>[05]</span><h4>1-100 Scale</h4></div>
                <div class="game-mode-card" onclick="App.launchGame('blind-rank')"><span>[06]</span><h4>Blind Rank</h4></div>
              </div>
            </div>
          ` : `
            <div style="margin-top:24px; padding:32px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); text-align:center;">
              <h4 style="font-weight:500;">Awaiting Host Instruction...</h4>
              <p style="font-size:13px; margin-top:8px; color:var(--text-muted);">Stand by for module deployment.</p>
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
      
      // Do not evaluate unless all players have answered
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
        
        // Exact Logic Fixes
        if (this.activeGame === "couple-compat") isMatch = vals[0] !== vals[1]; // Opposite match
        else if (this.activeGame === "percentage") isMatch = Math.abs(parseInt(vals[0]) - parseInt(vals[1])) <= 15; // Margin match
        else if (this.activeGame === "mind-meld") isMatch = String(vals[0]).toLowerCase() === String(vals[1]).toLowerCase(); // Case-insensitive
        else isMatch = vals[0] === vals[1]; // Exact

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
      this.celebrated = false; // Reset confetti

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
          window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      }
      await this.pushDB();
      this.renderActiveGame();
    },

    getDraftingBody() {
      // DRAFT ISOLATION FIX
      if (!this.isHost()) {
         return `
            <div style="text-align:center; padding:40px 20px; background:var(--surface); border:1px dashed var(--border); border-radius:var(--radius-md);">
              <h4 style="font-weight:500;">Configuring Round</h4>
              <p style="font-size:13px; margin-top:8px; color:var(--text-muted);">Host is establishing the query parameters...</p>
            </div>
         `;
      }

      const g = this.activeGame;
      let html = `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:20px;">Draft Phase</h2>
          <p>Provide input parameters or generate a random sequence.</p>
        </div>
      `;

      if (g === "would-rather") {
         html += `
           <input id="draft-a" class="game-input" placeholder="Option A">
           <div class="divider">VS</div>
           <input id="draft-b" class="game-input" placeholder="Option B">
           <button class="btn-primary" style="margin-top:24px;" onclick="App.submitCustomPrompt({a: document.getElementById('draft-a').value, b: document.getElementById('draft-b').value})">Compile</button>
         `;
      } else if (g === "blind-rank") {
         html += `
           <textarea id="draft-rank" class="game-input" placeholder="Input 5 items (comma separated)" rows="3" style="resize:none;"></textarea>
           <button class="btn-primary" style="margin-top:24px;" onclick="App.submitCustomRank(document.getElementById('draft-rank').value)">Compile</button>
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
         let ph = "Input query parameter...";
         if (g === "mind-meld") ph = "Input category...";
         if (g === "percentage") ph = "Input 1-100 metric question...";

         html += `
           <input id="draft-text" class="game-input" placeholder="${ph}">
           <button class="btn-primary" style="margin-top:24px;" onclick="App.submitCustomPrompt(document.getElementById('draft-text').value)">Compile</button>
         `;
      }

      html += `
        <div class="divider">OR</div>
        <button class="btn-secondary" onclick="App.rollRandomPrompt()">Generate Random Sequence</button>
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
          <div style="background:var(--surface); border:1px solid var(--border); padding:20px; border-radius:var(--radius-md); margin-bottom:24px;">
            <span style="font-family:var(--font-mono); font-size:12px; color:var(--danger);">TARGET</span>
            <div style="font-size:18px; font-weight:600; margin-top:4px;">${esc(secret)}</div>
          </div>
          <p style="color:var(--text-muted);">Awaiting user identification...</p>
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
            <div style="background:var(--surface); border:1px solid var(--border); padding:20px; border-radius:var(--radius-md);">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--primary);">YOUR GUESS</span>
              <div style="font-size:18px; font-weight:600; margin-top:4px;">${esc(myChoice)}</div>
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
         
         let html = '<div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">';
         html += `<div style="display:flex; justify-content:space-between; margin-bottom:12px;"><span style="color:var(--text-muted);">Target:</span><span style="font-weight:600; color:var(--text-main);">${esc(this.gameState.secretWord)}</span></div>`;
         html += `<div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Identified:</span><span style="font-weight:600; color:var(--text-main);">${esc(guess)}</span></div>`;
         
         if (String(guess).toLowerCase() === String(this.gameState.secretWord).toLowerCase()) {
            if (window.confetti && allAnswered && !this.celebrated) { window.confetti(); this.celebrated = true; }
            html += `<div class="match-box">TARGET ACQUIRED</div>`;
         } else {
            html += `<div class="penalty-box"><strong style="color:var(--danger);">MISMATCH</strong></div>`;
         }
         html += '</div>';
         return html;
      }

      if (keys.length === 0) return '';

      if (this.activeGame === "blind-rank") {
        if (!allAnswered) return `<div style="margin-top:24px; color:var(--text-muted); font-size:13px; font-family:var(--font-mono); text-align:center;">AWAITING COMPILATION...</div>`;

        let html = '<div style="display:flex; gap:20px; margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">';
        keys.forEach(k => {
          const pObj = this.gameState.players && this.gameState.players[k];
          const name = (k === this.myId) ? "You" : (pObj ? (pObj.name || pObj) : "Partner");
          html += `<div style="flex:1;"><strong style="font-size:13px; color:var(--text-muted); text-transform:uppercase;">${esc(name)}</strong>`;
          for(let i=1; i<=5; i++) {
            html += `<div style="font-size:13px; background:var(--surface); border:1px solid var(--border); margin-top:8px; padding:10px; border-radius:4px;">${i}. ${esc(choices[k][i])}</div>`;
          }
          html += `</div>`;
        });
        html += '</div>';
        return html;
      }

      let html = '<div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">';
      keys.forEach(k => {
        const pObj = this.gameState.players && this.gameState.players[k];
        const name = (k === this.myId) ? "You" : (pObj ? (pObj.name || pObj) : "Partner");
        
        // ANTI-CHEAT MASKING FIX
        let displayChoice = esc(choices[k]);
        if (!allAnswered && k !== this.myId) {
           displayChoice = `<span style="color:var(--primary); font-family:var(--font-mono); font-size:12px;">[ HIDDEN ]</span>`;
        }

        html += `<div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                   <span style="color:var(--text-muted);">${esc(name)}</span>
                   <span style="font-weight:600;">${displayChoice}</span>
                 </div>`;
      });

      if (allAnswered && keys.length >= 2) {
        const vals = keys.map(k => choices[k]);
        let isMatch = false;
        
        // LOGIC FIXES IMPLEMENTED HERE
        if (this.activeGame === "couple-compat") isMatch = vals[0] !== vals[1]; // Opposite match
        else if (this.activeGame === "percentage") isMatch = Math.abs(parseInt(vals[0]) - parseInt(vals[1])) <= 15; // 15 pt margin
        else if (this.activeGame === "mind-meld") isMatch = String(vals[0]).toLowerCase() === String(vals[1]).toLowerCase(); // Case-insensitive
        else isMatch = vals[0] === vals[1]; // Exact Match

        if (isMatch) {
          if (window.confetti && !this.celebrated) { window.confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } }); this.celebrated = true; }
          html += `<div class="match-box">SYNC ACHIEVED</div>`;
        } else {
          html += `<div style="text-align:center;font-weight:600;margin-top:20px;color:var(--danger);font-size:14px;letter-spacing:1px;">STREAK TERMINATED</div>`;
          if ((this.gameState.streak || 0) >= 2) {
            const dares = window.BANKS.dares || ["Take a drink!"];
            const dareStr = dares[(this.roomCode.charCodeAt(0) + vals[0].length) % dares.length];
            html += `<div class="penalty-box"><span style="font-family:var(--font-mono); font-size:11px; color:var(--danger);">PENALTY PROTOCOL</span><br/><span style="font-weight:500; font-size:14px; margin-top:8px; display:block; color:var(--text-main);">${esc(dareStr)}</span></div>`;
          }
        }
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
            slotsHtml += `<div style="background:var(--surface); padding:14px; margin-bottom:8px; border-radius:var(--radius-sm); color:var(--text-muted); font-size:14px; text-decoration:line-through; border:1px solid var(--border);">${i}. ${esc(myRanks[i])}</div>`;
          } else {
            slotsHtml += `<button class="btn-secondary" style="margin-bottom:8px; justify-content:flex-start;" onclick="App.submitBlindRank(${i}, '${esc(currentItem)}')">Lock into Slot [${i}]</button>`;
          }
        }
        return `
          <div style="background:var(--surface); padding:24px; border-radius:var(--radius-md); margin-bottom:24px; border:1px solid var(--border);">
            <span style="font-family:var(--font-mono); font-size:11px; color:var(--primary); letter-spacing:1px;">ITEM ${numAnswered + 1} / 5</span>
            <h2 style="margin:8px 0 0 0; font-size:24px;">${esc(currentItem)}</h2>
          </div>
          ${slotsHtml}
        `;
      } else {
        return `<div style="padding:24px; text-align:center; background:rgba(16,185,129,0.1); color:var(--accent); border:1px solid rgba(16,185,129,0.2); border-radius:var(--radius-md); margin:16px 0; font-weight:600;">Sequence Locked</div>`;
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
                 <h3 style="margin-bottom:16px;">Decision Matrix</h3>
                 <button class="btn-choice ${myChoice === cur.a ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.a)}')">${esc(cur.a)}</button>
                 <div class="divider">OR</div>
                 <button class="btn-choice ${myChoice === cur.b ? "selected" : ""}" onclick="App.submitChoice('${esc(cur.b)}')">${esc(cur.b)}</button>
               `;
               break;
             case "red-green-flag":
               body = `
                 <h3>Flag Analysis</h3>
                 <div style="background:var(--surface); padding:24px; border-radius:var(--radius-md); margin:16px 0; border:1px solid var(--border);">
                   <p style="font-weight:500; font-size:16px; margin:0; color:var(--text-main);">"${esc(cur)}"</p>
                 </div>
                 <div style="display:flex; gap:12px;">
                   <button style="flex:1; border-color:rgba(225,29,72,0.5); color:var(--danger);" class="btn-choice ${myChoice === 'Red Flag' ? 'selected' : ''}" onclick="App.submitChoice('Red Flag')">RED</button>
                   <button style="flex:1; border-color:rgba(16,185,129,0.5); color:var(--accent);" class="btn-choice ${myChoice === 'Green Flag' ? 'selected' : ''}" onclick="App.submitChoice('Green Flag')">GREEN</button>
                 </div>
               `;
               break;
             case "couple-compat":
               body = `
                 <h3>Compatibility Diagnostic</h3>
                 <p style="font-weight:500;margin:20px 0;font-size:18px;line-height:1.4;color:var(--text-main);">${esc(cur)}</p>
                 <div style="display:flex; gap:12px;">
                   <button style="flex:1; padding:20px 10px;" class="btn-choice ${myChoice === 'ME' ? 'selected' : ''}" onclick="App.submitChoice('ME')">ME</button>
                   <button style="flex:1; padding:20px 10px;" class="btn-choice ${myChoice === 'PARTNER' ? 'selected' : ''}" onclick="App.submitChoice('PARTNER')">PARTNER</button>
                 </div>
               `;
               break;
             case "mind-meld":
               body = `
                 <h3>Mind Meld</h3>
                 <div style="background:var(--surface); padding:20px; border-radius:var(--radius-md); margin:16px 0; border:1px solid var(--border);">
                   <p style="font-weight:600;font-size:16px;margin:0;">${esc(cur)}</p>
                 </div>
                 <div style="display:flex; gap:12px;">
                   <input type="text" id="meld-input" class="game-input" placeholder="Enter string..." style="flex:1; margin:0;">
                   <button class="btn-primary" style="width:auto; padding:0 24px;" onclick="App.submitChoice(document.getElementById('meld-input').value)">Lock</button>
                 </div>
               `;
               break;
             case "percentage":
               body = `
                 <h3>Metric Scale</h3>
                 <p style="font-weight:500;margin:20px 0;font-size:16px;">${esc(cur)}</p>
                 <div class="slider-container">
                   <input type="range" id="perc-slider" min="0" max="100" value="50" oninput="document.getElementById('perc-val').innerText = this.value">
                   <div style="text-align:center; font-size:42px; font-weight:700; color:var(--text-main); margin:24px 0;" id="perc-val">50</div>
                   <button class="btn-primary" onclick="App.submitChoice(document.getElementById('perc-slider').value)">Submit Value</button>
                 </div>
               `;
               break;
           }
         }
      }

      c.innerHTML = `
        <div class="workspace-shell active-game-wrapper">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            ${isHost ? `<button class="btn-secondary" style="width:auto;min-height:36px;padding:6px 16px;font-size:13px;" onclick="App.exitGame()">Exit Module</button>` : `<span class="badge badge-player">AWAITING HOST</span>`}
            <span class="badge badge-streak">STREAK: ${streak}</span>
          </div>
          
          ${body}
          <div class="comparison-container">
            ${this.gameState.currentPrompt ? this.renderComparison() : ''}
          </div>
          
          ${isHost && this.gameState.currentPrompt && allAnswered ? `
            <button class="btn-primary" style="margin-top:32px;" onclick="App.launchGame('${this.activeGame}')">Proceed Next</button>
          ` : ``}
        </div>
      `;
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => window.App.init());
  else window.App.init();
})();