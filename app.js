// DuoVibe Main Application Engine
function initSupabase() {
  const url = (window.CONFIG && window.CONFIG.SUPABASE_URL) || "https://euqrzxxldlsbhuyjuleo.supabase.co";
  const key = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cXJ6eHhsZGxzYmh1eWp1bGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMjI5NzEsImV4cCI6MjA1Njg5ODk3MX0.yT2eF0X8-O_0h9Y6wWvQ5P6L7m8N9O0P1Q2R3S4T5U6";
  
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window.sb = window.supabase.createClient(url, key);
  }
}

initSupabase();

window.App = {
  myId: 'user_' + Math.random().toString(36).substring(2, 9),
  myName: localStorage.getItem('duo_my_name') || 'Player ' + Math.floor(Math.random() * 100),
  roomCode: null,
  activeGame: null,
  gameState: { turn: 0, choices: {} },
  channel: null,
  peers: {},

  init() {
    initSupabase();
    this.updateStatusBadge('online', 'ONLINE');

    const appContainer = document.getElementById('main-content');
    if (!appContainer) return;

    if (this.roomCode) {
      this.renderLobby();
    } else {
      this.renderHome();
    }
  },

  updateStatusBadge(statusClass, text) {
    const badge = document.getElementById('conn-status');
    if (badge) {
      badge.className = 'status-badge ' + statusClass;
      badge.textContent = text;
    }
  },

  renderHome() {
    const container = document.getElementById('main-content');
    if (!container) return;

    container.innerHTML = `
      <div class="home-card">
        <h2>Welcome to DuoVibe 💕</h2>
        <p>Play 11 real-time games with your long-distance partner</p>
        
        <div class="form-group" style="margin-top:20px;">
          <label style="display:block; font-size:14px; font-weight:600; margin-bottom:6px;">Your Name:</label>
          <input type="text" id="input-my-name" value="${this.myName}" class="game-input" style="font-size:16px;" placeholder="Enter your name..." />
        </div>

        <div class="action-stack" style="margin-top:20px;">
          <button class="btn-primary" onclick="App.createRoom()">✨ Create New Room</button>
          <div class="divider">OR</div>
          <div style="display:flex; gap:8px;">
            <input type="text" id="input-room-code" placeholder="6-DIGIT ROOM CODE" class="game-input" style="text-transform:uppercase; letter-spacing:2px; text-align:center; font-size:16px;" maxlength="6" />
            <button class="btn-secondary" onclick="App.joinRoomWithCode()">Join Room</button>
          </div>
        </div>
      </div>
    `;
  },

  saveNameFromInput() {
    const input = document.getElementById('input-my-name');
    if (input && input.value.trim()) {
      this.myName = input.value.trim();
      localStorage.setItem('duo_my_name', this.myName);
    }
  },

  createRoom() {
    this.saveNameFromInput();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.joinRoom(code);
  },

  joinRoomWithCode() {
    this.saveNameFromInput();
    const input = document.getElementById('input-room-code');
    const code = input ? input.value.trim().toUpperCase() : '';
    if (code.length === 6) {
      this.joinRoom(code);
    } else {
      alert('Please enter a valid 6-character room code!');
    }
  },

  joinRoom(code) {
    this.roomCode = code;
    this.renderLobby();

    if (!window.sb) {
      initSupabase();
    }

    if (window.sb) {
      this.channel = window.sb.channel('room_' + code, {
        config: { presence: { key: this.myId } }
      });

      this.channel
        .on('presence', { event: 'sync' }, () => {
          const state = this.channel.presenceState();
          this.peers = state;
          const count = Object.keys(state).length;
          this.updateStatusBadge('live', `LIVE (${count})`);
          this.updateLobbyPlayers();
        })
        .on('broadcast', { event: 'game_update' }, payload => {
          if (payload.payload) {
            this.gameState = { ...this.gameState, ...payload.payload };
            if (payload.payload.activeGame !== undefined) {
              this.activeGame = payload.payload.activeGame;
            }
            this.renderActiveGame();
          }
        })
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            this.channel.track({ name: this.myName, onlineAt: new Date().toISOString() });
          }
        });
    }
  },

  updateLobbyPlayers() {
    const el = document.getElementById('connected-players-list');
    if (!el) return;

    const names = [];
    Object.keys(this.peers).forEach(key => {
      const presences = this.peers[key];
      if (presences && presences[0] && presences[0].name) {
        names.push(presences[0].name);
      }
    });

    if (names.length === 0) names.push(this.myName);
    el.innerHTML = names.map(n => `<span class="player-tag">🟢 ${n}</span>`).join(' ');
  },

  renderLobby() {
    const container = document.getElementById('main-content');
    if (!container) return;

    container.innerHTML = `
      <div class="lobby-card">
        <div class="lobby-header-bar">
          <div>
            <span class="room-label">ROOM CODE</span>
            <h2 class="room-code-display">${this.roomCode}</h2>
          </div>
          <button class="btn-action" style="padding:6px 12px; font-size:13px;" onclick="navigator.clipboard.writeText('${this.roomCode}'); alert('Room code copied!');">📋 Copy</button>
        </div>

        <div style="margin: 16px 0;">
          <label style="font-size:12px; font-weight:700; color:#666;">PLAYERS IN ROOM:</label>
          <div id="connected-players-list" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
            <span class="player-tag">🟢 ${this.myName}</span>
          </div>
        </div>

        <h3 style="margin-top:24px; font-size:16px; font-weight:700;">Select a Game to Play</h3>
        <div class="games-grid-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:12px; margin-top:12px;">
          <div class="game-card" onclick="App.launchGame('blind-rank')">🙈 <h4>Blind Rank</h4></div>
          <div class="game-card" onclick="App.launchGame('truths-lie')">🤫 <h4>2 Truths 1 Lie</h4></div>
          <div class="game-card" onclick="App.launchGame('would-rather')">⚖️ <h4>Would You Rather</h4></div>
          <div class="game-card" onclick="App.launchGame('this-or-that')">🔄 <h4>This or That</h4></div>
          <div class="game-card" onclick="App.launchGame('red-green-flag')">🚩 <h4>Red/Green Flag</h4></div>
          <div class="game-card" onclick="App.launchGame('couple-compat')">💖 <h4>Compat Quiz</h4></div>
          <div class="game-card" onclick="App.launchGame('word-letters')">🔤 <h4>First/Last Letter</h4></div>
          <div class="game-card" onclick="App.launchGame('categories-bomb')">💣 <h4>Pass The Bomb</h4></div>
          <div class="game-card" onclick="App.launchGame('guess-age')">📅 <h4>Guess The Year</h4></div>
          <div class="game-card" onclick="App.launchGame('guess-number')">🔢 <h4>Guess Number</h4></div>
          <div class="game-card" onclick="App.launchGame('guess-celeb')">⭐ <h4>Guess Celeb</h4></div>
        </div>
      </div>
    `;

    this.updateLobbyPlayers();
  },

  launchGame(gameId) {
    this.activeGame = gameId;
    this.gameState = { gameId, choices: {}, turn: 0, currentPrompt: null, rankSet: null, secretNumber: null, clueIdx: 0 };
    this.broadcastState({ activeGame: gameId, choices: {}, turn: 0, currentPrompt: null, rankSet: null, secretNumber: null, clueIdx: 0 });
    this.renderActiveGame();
  },

  broadcastState(data) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: data
      });
    }
  },

  renderActiveGame() {
    const container = document.getElementById('main-content');
    if (!container) return;

    if (!this.activeGame) {
      this.renderLobby();
      return;
    }

    let gameHtml = '';
    switch (this.activeGame) {
      case 'blind-rank': gameHtml = this.renderBlindRank(); break;
      case 'truths-lie': gameHtml = this.renderTruthsLie(); break;
      case 'would-rather': gameHtml = this.renderWouldRather(); break;
      case 'this-or-that': gameHtml = this.renderThisOrThat(); break;
      case 'red-green-flag': gameHtml = this.renderRedGreenFlag(); break;
      case 'couple-compat': gameHtml = this.renderCompatQuiz(); break;
      case 'word-letters': gameHtml = this.renderWordLetters(); break;
      case 'categories-bomb': gameHtml = this.renderBomb(); break;
      case 'guess-age': gameHtml = this.renderGuessAge(); break;
      case 'guess-number': gameHtml = this.renderGuessNumber(); break;
      case 'guess-celeb': gameHtml = this.renderGuessCeleb(); break;
      default: gameHtml = '<p>Game coming soon!</p>';
    }

    container.innerHTML = `
      <div class="active-game-wrapper">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <button class="btn-secondary" style="padding:6px 12px; font-size:13px;" onclick="App.exitGame()">← Lobby</button>
          <span style="font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:1px;">${this.activeGame}</span>
        </div>
        ${gameHtml}
      </div>
    `;
  },

  exitGame() {
    this.activeGame = null;
    this.broadcastState({ activeGame: null });
    this.renderLobby();
  },

  submitChoice(val) {
    if (!this.gameState.choices) this.gameState.choices = {};
    this.gameState.choices[this.myId] = val;
    this.broadcastState({ choices: this.gameState.choices });
    this.renderActiveGame();

    if (Object.keys(this.gameState.choices).length >= 2 && window.confetti) {
      window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  },

  renderChoiceComparison() {
    const choices = this.gameState.choices || {};
    const keys = Object.keys(choices);

    if (keys.length === 0) {
      return '<div class="comparison-bar" style="margin-top:16px; font-size:13px; color:#666; text-align:center;">Waiting for responses...</div>';
    }

    let html = '<div class="comparison-bar" style="margin-top:16px; background:#FAF9F7; border:1px solid #E8E6E3; padding:12px; border-radius:12px;">';
    keys.forEach(k => {
      const name = k === this.myId ? 'You' : 'Partner';
      html += `<div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:4px;">
        <span><strong>${name}:</strong></span>
        <span>${choices[k]}</span>
      </div>`;
    });

    if (keys.length >= 2) {
      const vals = keys.map(k => choices[k]);
      const match = vals.every(v => v === vals[0]);
      html += `<div style="text-align:center; font-weight:700; margin-top:8px; color:${match ? '#137333' : '#1A1A1A'}; font-size:15px;">
        ${match ? '🎉 MATCH!' : '🤝 Different choices'}
      </div>`;
    }

    html += '</div>';
    return html;
  },

  renderBlindRank() {
    if (!this.gameState.rankSet) {
      this.gameState.rankSet = window.Picker.freshBlindRankSet(5);
    }
    const items = this.gameState.rankSet;

    return `
      <div class="dilemma-card">
        <h3>🙈 Blind Ranking</h3>
        <p style="font-size:14px; color:#666; margin-bottom:12px;">Rank these 5 items 1 to 5!</p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${items.map((item, i) => `
            <div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:10px 14px; border-radius:8px; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
              <span>${i + 1}. ${item}</span>
              <button class="btn-secondary" style="padding:4px 8px; font-size:12px;" onclick="App.submitChoice('Ranked #${i + 1}: ${item}')">Rank #${i + 1}</button>
            </div>
          `).join('')}
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ choices: {}, rankSet: null }); App.renderActiveGame();">New Round →</button>
      </div>
    `;
  },

  renderTruthsLie() {
    return `
      <div class="dilemma-card">
        <h3>🤫 2 Truths & 1 Lie</h3>
        <p style="font-size:14px; color:#666; margin-bottom:12px;">Type 2 truths and 1 lie. Can your partner guess the lie?</p>
        <div class="form-group" style="display:flex; flex-direction:column; gap:8px;">
          <input type="text" id="truth1" class="game-input" placeholder="Truth #1..." />
          <input type="text" id="truth2" class="game-input" placeholder="Truth #2..." />
          <input type="text" id="lie" class="game-input" placeholder="The Lie..." />
          <button class="btn-action" onclick="App.submitChoice('1: ' + document.getElementById('truth1').value + ' | 2: ' + document.getElementById('truth2').value + ' | LIE: ' + document.getElementById('lie').value)">Submit Statements</button>
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="App.broadcastState({ choices: {} }); App.renderActiveGame();">Clear / Reset →</button>
      </div>
    `;
  },

  renderWouldRather() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('wouldRather', window.BANKS.wouldRather);
    }
    const cur = this.gameState.currentPrompt;
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    return `
      <div class="dilemma-card">
        <h3>Would You Rather...</h3>
        <div class="choice-buttons">
          <button class="btn-choice ${myChoice === cur.a ? 'selected' : ''}" onclick="App.submitChoice('${cur.a.replace(/'/g, "\\'")}')">${cur.a}</button>
          <div class="divider">OR</div>
          <button class="btn-choice ${myChoice === cur.b ? 'selected' : ''}" onclick="App.submitChoice('${cur.b.replace(/'/g, "\\'")}')">${cur.b}</button>
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ turn: (App.gameState.turn||0)+1, choices: {}, currentPrompt: null }); App.renderActiveGame();">Next Question →</button>
      </div>
    `;
  },

  renderThisOrThat() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('thisOrThat', window.BANKS.thisOrThat);
    }
    const cur = this.gameState.currentPrompt;
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    return `
      <div class="dilemma-card">
        <h3>This or That</h3>
        <div class="choice-buttons">
          <button class="btn-choice ${myChoice === cur.a ? 'selected' : ''}" onclick="App.submitChoice('${cur.a.replace(/'/g, "\\'")}')">${cur.a}</button>
          <div class="divider">VS</div>
          <button class="btn-choice ${myChoice === cur.b ? 'selected' : ''}" onclick="App.submitChoice('${cur.b.replace(/'/g, "\\'")}')">${cur.b}</button>
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ turn: (App.gameState.turn||0)+1, choices: {}, currentPrompt: null }); App.renderActiveGame();">Next Pair →</button>
      </div>
    `;
  },

  renderRedGreenFlag() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('redGreenFlag', window.BANKS.redGreenFlag);
    }
    const cur = this.gameState.currentPrompt;
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    return `
      <div class="dilemma-card">
        <h3>Red Flag or Green Flag?</h3>
        <p class="scenario-text">"${cur}"</p>
        <div class="choice-buttons">
          <button class="btn-choice ${myChoice === '🟢 Green Flag' ? 'selected' : ''}" onclick="App.submitChoice('🟢 Green Flag')">🟢 Green Flag</button>
          <button class="btn-choice ${myChoice === '🚩 Red Flag' ? 'selected' : ''}" onclick="App.submitChoice('🚩 Red Flag')">🚩 Red Flag</button>
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ turn: (App.gameState.turn||0)+1, choices: {}, currentPrompt: null }); App.renderActiveGame();">Next Scenario →</button>
      </div>
    `;
  },

  renderCompatQuiz() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('compatQuiz', window.BANKS.compatQuiz);
    }
    const question = this.gameState.currentPrompt;
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    return `
      <div class="dilemma-card">
        <h3>Compatibility Quiz</h3>
        <p>${question}</p>
        <div class="choice-buttons">
          <button class="btn-choice ${myChoice === 'ME' ? 'selected' : ''}" onclick="App.submitChoice('ME')">🙋‍♂️ Definitely Me</button>
          <button class="btn-choice ${myChoice === 'PARTNER' ? 'selected' : ''}" onclick="App.submitChoice('PARTNER')">🙋‍♀️ Definitely Partner</button>
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ choices: {}, currentPrompt: null }); App.renderActiveGame();">Next Question →</button>
      </div>
    `;
  },

  renderWordLetters() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('letterPrompts', window.BANKS.letterPrompts);
    }
    const cur = this.gameState.currentPrompt;

    return `
      <div class="dilemma-card">
        <h3>🔤 First / Last Letter</h3>
        <p>Category: <strong>${cur.category}</strong></p>
        <p>Word must start with letter: <strong style="font-size:20px; color:#1A1A1A;">'${cur.letter}'</strong></p>
        <input type="text" id="letter-input" placeholder="Type word..." class="game-input" style="font-size:16px;" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('letter-input').value)">Submit Word</button>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="App.broadcastState({ choices: {}, currentPrompt: null }); App.renderActiveGame();">New Category →</button>
      </div>
    `;
  },

  renderBomb() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('bombCategories', window.BANKS.bombCategories);
    }
    const cat = this.gameState.currentPrompt;

    return `
      <div class="dilemma-card">
        <h3>💣 Pass The Bomb</h3>
        <p>Category: <strong>${cat}</strong></p>
        <input type="text" id="bomb-input" placeholder="Type word fast..." class="game-input" style="font-size:16px;" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('bomb-input').value)">PASS BOMB 💣</button>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="App.broadcastState({ choices: {}, currentPrompt: null }); App.renderActiveGame();">New Category →</button>
      </div>
    `;
  },

  renderGuessAge() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('guessAge', window.BANKS.guessAge);
    }
    const cur = this.gameState.currentPrompt;

    return `
      <div class="dilemma-card">
        <h3>📅 Guess The Year</h3>
        <div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:16px; border-radius:12px; font-weight:600; text-align:center;">"${cur.subject}"</div>
        <input type="number" id="age-input" placeholder="Enter year (e.g. 2007)..." class="game-input" style="font-size:16px; margin-top:12px;" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('age-input').value)">Submit Guess</button>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="alert('Answer: ' + App.gameState.currentPrompt.answer); App.broadcastState({ choices: {}, currentPrompt: null }); App.renderActiveGame();">Reveal & Next →</button>
      </div>
    `;
  },

  renderGuessNumber() {
    if (!this.gameState.secretNumber) {
      this.gameState.secretNumber = window.Picker.freshNumber(1, 100);
    }
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;
    const guess = myChoice ? parseInt(myChoice) : null;
    const secret = this.gameState.secretNumber;
    let hint = '';
    if (guess !== null && !isNaN(guess)) {
      if (guess === secret) hint = '🎉 CORRECT!';
      else if (guess < secret) hint = '📈 Higher';
      else hint = '📉 Lower';
    }

    return `
      <div class="dilemma-card">
        <h3>🔢 Guess Secret Number (1-100)</h3>
        <input type="number" id="num-input" placeholder="Enter number (1-100)..." class="game-input" style="font-size:16px;" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('num-input').value)">Submit Guess</button>
        ${myChoice ? `<p style="font-weight:600; margin-top:12px;">Your guess: ${myChoice} - <strong>${hint}</strong></p>` : ''}
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="App.broadcastState({ choices: {}, secretNumber: null }); App.renderActiveGame();">New Round →</button>
      </div>
    `;
  },

  renderGuessCeleb() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('guessCeleb', window.BANKS.guessCeleb);
      this.gameState.clueIdx = 0;
    }
    const cur = this.gameState.currentPrompt;
    const clueIdx = this.gameState.clueIdx || 0;
    const cluesShown = cur.clues.slice(0, clueIdx + 1);

    return `
      <div class="dilemma-card">
        <h3>⭐ Guess The Celebrity</h3>
        <div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:12px; border-radius:12px; margin-bottom:12px;">
          ${cluesShown.map((c, i) => `<p style="margin-bottom:6px;"><strong>Clue #${i + 1}:</strong> ${c}</p>`).join('')}
        </div>
        ${clueIdx < cur.clues.length - 1 ? `<button class="btn-action" style="background:#E8E6E3; color:#1A1A1A; margin-bottom:12px;" onclick="App.broadcastState({ clueIdx: (App.gameState.clueIdx||0)+1 }); App.renderActiveGame();">Reveal Next Clue 💡</button>` : ''}
        <input type="text" id="celeb-input" placeholder="Type answer..." class="game-input" style="font-size:16px;" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('celeb-input').value)">Submit Guess</button>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="alert('Answer: ' + App.gameState.currentPrompt.answer); App.broadcastState({ choices: {}, currentPrompt: null, clueIdx: 0 }); App.renderActiveGame();">Reveal & Next →</button>
      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});