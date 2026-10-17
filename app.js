(function () {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function normalizeText(value) {
    var s = String(value || "").toLowerCase().trim();
    try {
      s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch (e) {}
    return s.replace(/[^a-z0-9]/g, "");
  }

  function initSupabase() {
    var cfg = window.CONFIG || {};
    var url = cfg.SUPABASE_URL || "https://euqrzxxldlsbhuyjuleo.supabase.co";
    var key = cfg.SUPABASE_ANON_KEY || "";
    if (window.supabase && url && key) {
      window.sb = window.supabase.createClient(url, key);
    }
  }

  function forceScroll() {
    document.documentElement.style.height = "auto";
    document.documentElement.style.overflowY = "auto";
    document.body.style.height = "auto";
    document.body.style.overflowY = "auto";
    document.body.style.position = "static";
    document.body.style.touchAction = "pan-y";
  }

  var GAMES = [
    { id: "blind-rank", title: "Blind Rank", icon: "&#128584;", desc: "Rank 5 random items." },
    { id: "truths-lie", title: "2 Truths 1 Lie", icon: "&#129323;", desc: "Submit 3 statements." },
    { id: "would-rather", title: "Would You Rather", icon: "&#9878;", desc: "Pick between two choices." },
    { id: "this-or-that", title: "This or That", icon: "&#128260;", desc: "Quick preference round." },
    { id: "red-green-flag", title: "Red/Green Flag", icon: "&#128681;", desc: "Judge the scenario." },
    { id: "couple-compat", title: "Compat Quiz", icon: "&#128150;", desc: "Who is more likely?" },
    { id: "word-letters", title: "First Letter", icon: "&#128292;", desc: "Answer with the right letter." },
    { id: "categories-bomb", title: "Pass The Bomb", icon: "&#128163;", desc: "Fast category answers." },
    { id: "guess-age", title: "Guess The Year", icon: "&#128197;", desc: "Closest year wins." },
    { id: "guess-number", title: "Guess Number", icon: "&#128290;", desc: "Higher or lower." },
    { id: "guess-celeb", title: "Guess Celebrity", icon: "&#11088;", desc: "Reveal clues." }
  ];

  function gameById(id) {
    for (var i = 0; i < GAMES.length; i++) {
      if (GAMES[i].id === id) return GAMES[i];
    }
    return GAMES[0];
  }

  window.App = {
    myId: localStorage.getItem("duo_my_id") || ("user_" + Math.random().toString(36).slice(2, 10)),
    myName: localStorage.getItem("duo_my_name") || ("Player " + Math.floor(Math.random() * 100)),
    roomCode: null,
    activeGame: null,
    state: null,
    channel: null,
    peers: {},
    bombTimer: null,

    init: function () {
      forceScroll();
      localStorage.setItem("duo_my_id", this.myId);
      initSupabase();
      this.updateStatus(window.sb ? "online" : "offline", window.sb ? "ONLINE" : "LOCAL");
      this.renderHome();
    },

    updateStatus: function (className, text) {
      var badge = document.getElementById("conn-status");
      if (!badge) return;
      badge.className = "status-badge " + className;
      badge.textContent = text;
    },

    renderHome: function () {
      this.stopBombTimer();
      forceScroll();

      var root = document.getElementById("main-content");
      if (!root) return;

      root.innerHTML =
        '<section class="home-card duo-card">' +
          '<h2>Welcome to DuoVibe <span>&hearts;</span></h2>' +
          '<p>Play real-time games with your partner or group.</p>' +
          '<div class="mini-feature-row"><span>Live play</span><span>Video call</span><span>Group mode</span></div>' +
          '<label class="form-label" for="input-my-name">Your Name</label>' +
          '<input id="input-my-name" class="game-input" type="text" value="' + esc(this.myName) + '" placeholder="Enter your name">' +
          '<button class="btn-primary full-btn" onclick="App.createRoom()">Create New Room</button>' +
          '<div class="divider">OR</div>' +
          '<div class="join-row">' +
            '<input id="input-room-code" class="game-input" inputmode="numeric" maxlength="6" placeholder="6-DIGIT CODE">' +
            '<button class="btn-secondary" onclick="App.joinRoomWithCode()">Join</button>' +
          '</div>' +
        '</section>';
    },

    saveName: function () {
      var input = document.getElementById("input-my-name");
      if (input && input.value.trim()) {
        this.myName = input.value.trim().slice(0, 24);
        localStorage.setItem("duo_my_name", this.myName);
      }
    },

    createRoom: function () {
      this.saveName();
      var code = Math.floor(100000 + Math.random() * 900000).toString();
      this.joinRoom(code);
    },

    joinRoomWithCode: function () {
      this.saveName();
      var input = document.getElementById("input-room-code");
      var code = input ? input.value.replace(/\D/g, "") : "";
      if (code.length !== 6) {
        alert("Please enter a valid 6-digit room code.");
        return;
      }
      this.joinRoom(code);
    },

    joinRoom: function (code) {
      this.roomCode = code;
      this.renderLobby();

      if (!window.sb) initSupabase();

      if (!window.sb) {
        this.updateStatus("offline", "LOCAL");
        return;
      }

      if (this.channel) {
        try { window.sb.removeChannel(this.channel); } catch (e) {}
      }

      var self = this;

      this.channel = window.sb.channel("room_" + code, {
        config: {
          presence: { key: self.myId },
          broadcast: { self: false }
        }
      });

      this.channel
        .on("presence", { event: "sync" }, function () {
          self.peers = self.channel.presenceState();
          var count = self.players().length;
          self.updateStatus("live", "LIVE " + count);
          self.renderPlayers();
          if (self.activeGame) self.renderGame(false);
        })
        .on("broadcast", { event: "game_update" }, function (msg) {
          var data = msg.payload || {};
          if (data.sender === self.myId) return;

          if (data.activeGame !== undefined) self.activeGame = data.activeGame;
          if (data.state !== undefined) self.state = data.state;

          if (self.activeGame && self.state) {
            self.renderGame(false);
          } else {
            self.renderLobby();
          }
        })
        .on("broadcast", { event: "state_request" }, function (msg) {
          var data = msg.payload || {};
          if (data.sender !== self.myId && self.activeGame && self.state) {
            self.broadcastFullState();
          }
        })
        .subscribe(function (status) {
          if (status === "SUBSCRIBED") {
            self.channel.track({
              id: self.myId,
              name: self.myName,
              onlineAt: new Date().toISOString()
            });

            self.channel.send({
              type: "broadcast",
              event: "state_request",
              payload: { sender: self.myId }
            });
          }
        });
    },

    players: function () {
      var out = [];
      var seen = {};
      out.push({ id: this.myId, name: this.myName });
      seen[this.myId] = true;

      var peers = this.peers || {};
      Object.keys(peers).forEach(function (key) {
        var arr = peers[key];
        if (!arr || !arr[0]) return;
        var id = arr[0].id || key;
        var name = arr[0].name || "Player";
        if (!seen[id]) {
          out.push({ id: id, name: name });
          seen[id] = true;
        }
      });

      return out.slice(0, 8);
    },

    renderPlayers: function () {
      var el = document.getElementById("connected-players-list");
      if (!el) return;
      el.innerHTML = this.players().map(function (p) {
        return '<span class="player-tag"><span class="online-dot"></span>' + esc(p.name) + '</span>';
      }).join("");
    },

    renderLobby: function () {
      this.stopBombTimer();
      forceScroll();

      var root = document.getElementById("main-content");
      if (!root) return;

      var cards = GAMES.map(function (g) {
        return '<button class="game-card" onclick="App.launchGame(\'' + g.id + '\')">' +
          '<span class="game-card-icon">' + g.icon + '</span>' +
          '<span class="game-card-title">' + esc(g.title) + '</span>' +
          '<span class="game-card-desc">' + esc(g.desc) + '</span>' +
        '</button>';
      }).join("");

      root.innerHTML =
        '<section class="lobby-card duo-card">' +
          '<div class="room-panel">' +
            '<span class="room-label">ROOM CODE</span>' +
            '<div class="room-code-display">' + esc(this.roomCode || "") + '</div>' +
            '<button class="btn-primary copy-btn" onclick="App.copyRoom()">Copy Code</button>' +
          '</div>' +
          '<div class="players-block">' +
            '<h3>Players in Room</h3>' +
            '<div id="connected-players-list" class="players-list"></div>' +
          '</div>' +
          '<div class="lobby-title-row">' +
            '<h2>Select a Game</h2>' +
            '<button class="btn-secondary small-btn" onclick="window.Features && window.Features.toggleCallWidget()">Call</button>' +
          '</div>' +
          '<div class="games-grid-container">' + cards + '</div>' +
        '</section>';

      this.renderPlayers();
    },

    copyRoom: function () {
      var code = this.roomCode || "";
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () {
          alert("Room code copied: " + code);
        }).catch(function () {
          alert("Room code: " + code);
        });
      } else {
        alert("Room code: " + code);
      }
    },

    broadcastFullState: function () {
      if (!this.channel) return;
      this.channel.send({
        type: "broadcast",
        event: "game_update",
        payload: {
          sender: this.myId,
          activeGame: this.activeGame,
          state: this.state
        }
      });
    },

    pickFromBank: function (bankKey, bank, used) {
      bank = bank || [];
      used = used || {};
      if (!bank.length) return null;

      var seen = Array.isArray(used[bankKey]) ? used[bankKey].slice() : [];

      if (seen.length >= bank.length) seen = [];

      var unseen = [];
      for (var i = 0; i < bank.length; i++) {
        if (seen.indexOf(i) === -1) unseen.push(i);
      }

      var idx = unseen[Math.floor(Math.random() * unseen.length)];
      seen.push(idx);
      used[bankKey] = seen;

      try {
        localStorage.setItem("duo_seen_" + bankKey, JSON.stringify(seen));
      } catch (e) {}

      return bank[idx];
    },

    pickManyFromBank: function (bankKey, bank, count, used) {
      var items = [];
      for (var i = 0; i < count; i++) {
        var item = this.pickFromBank(bankKey, bank, used);
        if (item != null) items.push(item);
      }
      return items;
    },

    createRoundState: function (gameId, round) {
      var previousUsed = this.state && this.state.used ? clone(this.state.used) : {};
      var state = {
        gameId: gameId,
        round: round || 1,
        prompt: null,
        choices: {},
        revealed: false,
        clueIdx: 0,
        used: previousUsed,
        createdAt: Date.now()
      };

      if (gameId === "would-rather") {
        var wr = this.pickFromBank("wouldRather", window.BANKS.wouldRather, state.used);
        state.prompt = { options: [wr.a, wr.b] };
      } else if (gameId === "this-or-that") {
        var tt = this.pickFromBank("thisOrThat", window.BANKS.thisOrThat, state.used);
        state.prompt = { options: [tt.a, tt.b] };
      } else if (gameId === "red-green-flag") {
        var flag = this.pickFromBank("redGreenFlag", window.BANKS.redGreenFlag, state.used);
        state.prompt = { scenario: flag, options: ["Green Flag", "Red Flag"] };
      } else if (gameId === "couple-compat") {
        var q = this.pickFromBank("compatQuiz", window.BANKS.compatQuiz, state.used);
        state.prompt = { question: q };
      } else if (gameId === "blind-rank") {
        state.prompt = { items: this.pickManyFromBank("blindRankItems", window.BANKS.blindRankItems, 5, state.used) };
      } else if (gameId === "truths-lie") {
        state.prompt = { instruction: "Write two truths and one lie." };
      } else if (gameId === "word-letters") {
        var lp = this.pickFromBank("letterPrompts", window.BANKS.letterPrompts, state.used);
        state.prompt = { category: lp.category, letter: lp.letter };
      } else if (gameId === "categories-bomb") {
        var cat = this.pickFromBank("bombCategories", window.BANKS.bombCategories, state.used);
        state.prompt = { category: cat, endsAt: Date.now() + 30000 };
      } else if (gameId === "guess-age") {
        var gy = this.pickFromBank("guessAge", window.BANKS.guessAge, state.used);
        state.prompt = { subject: gy.subject, answer: gy.answer };
      } else if (gameId === "guess-number") {
        state.prompt = { min: 1, max: 100, answer: Math.floor(Math.random() * 100) + 1 };
      } else if (gameId === "guess-celeb") {
        var celeb = this.pickFromBank("guessCeleb", window.BANKS.guessCeleb, state.used);
        state.prompt = { clues: celeb.clues || [], answer: celeb.answer };
      }

      return state;
    },

    launchGame: function (gameId) {
      this.activeGame = gameId;
      this.state = this.createRoundState(gameId, 1);
      this.broadcastFullState();
      this.renderGame(true);
    },

    nextRound: function () {
      if (!this.activeGame) return;
      var next = this.state ? (this.state.round + 1) : 1;
      this.state = this.createRoundState(this.activeGame, next);
      this.broadcastFullState();
      this.renderGame(true);
    },

    exitGame: function () {
      this.activeGame = null;
      this.state = null;
      this.stopBombTimer();
      this.broadcastFullState();
      this.renderLobby();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    renderGame: function (jumpTop) {
      forceScroll();
      this.stopBombTimer();

      var root = document.getElementById("main-content");
      if (!root) return;

      if (!this.activeGame || !this.state) {
        this.renderLobby();
        return;
      }

      var game = gameById(this.activeGame);
      var body = "";

      if (this.activeGame === "would-rather") body = this.renderTwoOption("Would You Rather");
      else if (this.activeGame === "this-or-that") body = this.renderTwoOption("This or That");
      else if (this.activeGame === "red-green-flag") body = this.renderFlag();
      else if (this.activeGame === "couple-compat") body = this.renderCompat();
      else if (this.activeGame === "blind-rank") body = this.renderBlindRank();
      else if (this.activeGame === "truths-lie") body = this.renderTruthsLie();
      else if (this.activeGame === "word-letters") body = this.renderWordLetters();
      else if (this.activeGame === "categories-bomb") body = this.renderBomb();
      else if (this.activeGame === "guess-age") body = this.renderGuessYear();
      else if (this.activeGame === "guess-number") body = this.renderGuessNumber();
      else if (this.activeGame === "guess-celeb") body = this.renderGuessCeleb();

      root.innerHTML =
        '<section class="active-game-wrapper duo-card">' +
          '<div class="game-topbar">' +
            '<button class="btn-secondary small-btn" onclick="App.exitGame()">Lobby</button>' +
            '<div class="game-title-mini">' + game.icon + ' ' + esc(game.title) + '<span>Round ' + esc(this.state.round) + '</span></div>' +
            '<button class="btn-secondary small-btn" onclick="window.Features && window.Features.toggleCallWidget()">Call</button>' +
          '</div>' +
          body +
        '</section>';

      if (this.activeGame === "categories-bomb") this.startBombTimer();
      if (jumpTop) window.scrollTo({ top: 0, behavior: "smooth" });
    },

    setChoice: function (value) {
      if (!this.state) return;
      if (value == null || value === "") {
        alert("Enter an answer first.");
        return;
      }

      this.state.choices = this.state.choices || {};
      this.state.choices[this.myId] = {
        id: this.myId,
        name: this.myName,
        value: value,
        at: Date.now()
      };

      this.broadcastFullState();
      this.renderGame(false);

      if (Object.keys(this.state.choices).length >= 2 && window.confetti) {
        window.confetti({ particleCount: 70, spread: 65, origin: { y: 0.75 } });
      }
    },

    chooseOption: function (index) {
      var opts = this.state && this.state.prompt && this.state.prompt.options;
      if (!opts || !opts[index]) return;
      this.setChoice(opts[index]);
    },

    submitInput: function (id) {
      var el = document.getElementById(id);
      var value = el ? el.value.trim() : "";
      this.setChoice(value);
    },

    reveal: function () {
      if (!this.state) return;
      this.state.revealed = true;
      this.broadcastFullState();
      this.renderGame(false);
    },

    renderTwoOption: function (title) {
      var p = this.state.prompt;
      var mine = this.state.choices && this.state.choices[this.myId];
      var myValue = mine && mine.value;

      return '<div class="dilemma-card">' +
        '<h2>' + esc(title) + '</h2>' +
        '<div class="choice-buttons">' +
          '<button class="btn-choice ' + (myValue === p.options[0] ? "selected" : "") + '" onclick="App.chooseOption(0)">' + esc(p.options[0]) + '</button>' +
          '<div class="divider">OR</div>' +
          '<button class="btn-choice ' + (myValue === p.options[1] ? "selected" : "") + '" onclick="App.chooseOption(1)">' + esc(p.options[1]) + '</button>' +
        '</div>' +
        this.renderAnswers() +
        '<button class="btn-action" onclick="App.nextRound()">Next Round</button>' +
      '</div>';
    },

    renderFlag: function () {
      var p = this.state.prompt;
      var mine = this.state.choices && this.state.choices[this.myId];
      var myValue = mine && mine.value;

      return '<div class="dilemma-card">' +
        '<h2>Red Flag or Green Flag?</h2>' +
        '<p class="scenario-text">' + esc(p.scenario) + '</p>' +
        '<div class="choice-buttons">' +
          '<button class="btn-choice ' + (myValue === "Green Flag" ? "selected" : "") + '" onclick="App.chooseOption(0)">Green Flag</button>' +
          '<button class="btn-choice ' + (myValue === "Red Flag" ? "selected" : "") + '" onclick="App.chooseOption(1)">Red Flag</button>' +
        '</div>' +
        this.renderAnswers() +
        '<button class="btn-action" onclick="App.nextRound()">Next Scenario</button>' +
      '</div>';
    },

    renderCompat: function () {
      var p = this.state.prompt;
      var players = this.players();
      var mine = this.state.choices && this.state.choices[this.myId];
      var myValue = mine && mine.value;

      var buttons = players.map(function (pl, i) {
        var label = pl.id === App.myId ? "Me (" + pl.name + ")" : pl.name;
        return '<button class="btn-choice ' + (myValue === pl.name ? "selected" : "") + '" onclick="App.chooseCompat(' + i + ')">' + esc(label) + '</button>';
      }).join("");

      buttons += '<button class="btn-choice ' + (myValue === "Both" ? "selected" : "") + '" onclick="App.setChoice(\'Both\')">Both</button>';
      buttons += '<button class="btn-choice ' + (myValue === "Neither" ? "selected" : "") + '" onclick="App.setChoice(\'Neither\')">Neither</button>';

      return '<div class="dilemma-card">' +
        '<h2>Compatibility Quiz</h2>' +
        '<p class="scenario-text">' + esc(p.question) + '</p>' +
        '<div class="choice-buttons compact">' + buttons + '</div>' +
        this.renderAnswers() +
        '<button class="btn-action" onclick="App.nextRound()">Next Question</button>' +
      '</div>';
    },

    chooseCompat: function (index) {
      var players = this.players();
      if (!players[index]) return;
      this.setChoice(players[index].name);
    },

    renderBlindRank: function () {
      var items = this.state.prompt.items || [];

      var rows = items.map(function (item, i) {
        var opts = '<option value="">Rank</option>';
        for (var r = 1; r <= items.length; r++) opts += '<option value="' + r + '">' + r + '</option>';
        return '<div class="rank-row">' +
          '<span>' + esc(item) + '</span>' +
          '<select id="rank-' + i + '" class="rank-select">' + opts + '</select>' +
        '</div>';
      }).join("");

      return '<div class="dilemma-card">' +
        '<h2>Blind Rank</h2>' +
        '<p class="muted">Give each item a unique rank. 1 is best.</p>' +
        '<div class="rank-list">' + rows + '</div>' +
        '<button class="btn-action" onclick="App.submitBlindRank()">Submit Ranking</button>' +
        this.renderAnswers() +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">New Set</button>' +
      '</div>';
    },

    submitBlindRank: function () {
      var items = this.state.prompt.items || [];
      var used = {};
      var ranked = [];

      for (var i = 0; i < items.length; i++) {
        var el = document.getElementById("rank-" + i);
        var rank = el ? parseInt(el.value, 10) : 0;

        if (!rank) {
          alert("Please rank every item.");
          return;
        }

        if (used[rank]) {
          alert("Each rank can only be used once.");
          return;
        }

        used[rank] = true;
        ranked.push({ rank: rank, item: items[i] });
      }

      ranked.sort(function (a, b) { return a.rank - b.rank; });

      this.setChoice({
        kind: "ranking",
        items: ranked.map(function (x) { return x.rank + ". " + x.item; })
      });
    },

    renderTruthsLie: function () {
      return '<div class="dilemma-card">' +
        '<h2>2 Truths 1 Lie</h2>' +
        '<p class="muted">Write three statements and secretly choose the lie.</p>' +
        '<input id="stmt-0" class="game-input" placeholder="Statement 1">' +
        '<input id="stmt-1" class="game-input" placeholder="Statement 2">' +
        '<input id="stmt-2" class="game-input" placeholder="Statement 3">' +
        '<label class="form-label">Which statement is the lie?</label>' +
        '<select id="lie-index" class="game-input">' +
          '<option value="0">Statement 1</option>' +
          '<option value="1">Statement 2</option>' +
          '<option value="2">Statement 3</option>' +
        '</select>' +
        '<button class="btn-action" onclick="App.submitTruthsLie()">Submit Statements</button>' +
        this.renderAnswers() +
        '<button class="btn-action secondary-action" onclick="App.reveal()">Reveal Lies</button>' +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">New Round</button>' +
      '</div>';
    },

    submitTruthsLie: function () {
      var statements = [];
      for (var i = 0; i < 3; i++) {
        var el = document.getElementById("stmt-" + i);
        var v = el ? el.value.trim() : "";
        if (!v) {
          alert("Fill all three statements.");
          return;
        }
        statements.push(v);
      }

      var lieEl = document.getElementById("lie-index");
      var lieIndex = lieEl ? parseInt(lieEl.value, 10) : 0;

      this.setChoice({
        kind: "truths-lie",
        statements: statements,
        lieIndex: lieIndex
      });
    },

    renderWordLetters: function () {
      var p = this.state.prompt;

      return '<div class="dilemma-card">' +
        '<h2>First Letter</h2>' +
        '<p class="scenario-text">Category: <strong>' + esc(p.category) + '</strong><br>Word must start with: <strong>' + esc(p.letter) + '</strong></p>' +
        '<input id="word-input" class="game-input" placeholder="Type your word">' +
        '<button class="btn-action" onclick="App.submitWord()">Submit Word</button>' +
        this.renderAnswers() +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">New Category</button>' +
      '</div>';
    },

    submitWord: function () {
      var p = this.state.prompt;
      var el = document.getElementById("word-input");
      var word = el ? el.value.trim() : "";

      if (!word) {
        alert("Type a word first.");
        return;
      }

      if (word.charAt(0).toUpperCase() !== String(p.letter).toUpperCase()) {
        alert("Your word must start with " + p.letter + ".");
        return;
      }

      this.setChoice(word);
    },

    renderBomb: function () {
      var p = this.state.prompt;

      return '<div class="dilemma-card">' +
        '<h2>Pass The Bomb</h2>' +
        '<div class="bomb-timer" id="bomb-timer">30</div>' +
        '<p class="scenario-text">Category: <strong>' + esc(p.category) + '</strong></p>' +
        '<input id="bomb-input" class="game-input" placeholder="Type a valid answer fast">' +
        '<button class="btn-action" onclick="App.submitBomb()">Pass Bomb</button>' +
        this.renderAnswers() +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">Next Category</button>' +
      '</div>';
    },

    submitBomb: function () {
      var el = document.getElementById("bomb-input");
      var value = el ? el.value.trim() : "";
      if (!value) {
        alert("Type an answer first.");
        return;
      }

      var p = this.state.prompt;
      var label = Date.now() > p.endsAt ? value + " (after timer)" : value;
      this.setChoice(label);
    },

    startBombTimer: function () {
      var self = this;

      function tick() {
        if (!self.state || !self.state.prompt || !self.state.prompt.endsAt) return;
        var el = document.getElementById("bomb-timer");
        if (!el) return;
        var left = Math.max(0, Math.ceil((self.state.prompt.endsAt - Date.now()) / 1000));
        el.textContent = left;
        el.className = left <= 5 ? "bomb-timer danger" : "bomb-timer";
      }

      tick();
      this.bombTimer = setInterval(tick, 1000);
    },

    stopBombTimer: function () {
      if (this.bombTimer) {
        clearInterval(this.bombTimer);
        this.bombTimer = null;
      }
    },

    renderGuessYear: function () {
      var p = this.state.prompt;
      var answer = this.state.revealed ? '<div class="answer-panel">Answer: <strong>' + esc(p.answer) + '</strong></div>' : "";

      return '<div class="dilemma-card">' +
        '<h2>Guess The Year</h2>' +
        '<p class="scenario-text">' + esc(p.subject) + '</p>' +
        '<input id="year-input" class="game-input" type="number" inputmode="numeric" placeholder="Enter year">' +
        '<button class="btn-action" onclick="App.submitYear()">Submit Guess</button>' +
        answer +
        this.renderAnswers() +
        '<button class="btn-action secondary-action" onclick="App.reveal()">Reveal Answer</button>' +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">Next Year</button>' +
      '</div>';
    },

    submitYear: function () {
      var el = document.getElementById("year-input");
      var val = el ? parseInt(el.value, 10) : NaN;
      if (isNaN(val) || val < 1000 || val > 2100) {
        alert("Enter a valid year.");
        return;
      }
      this.setChoice(String(val));
    },

    renderGuessNumber: function () {
      var p = this.state.prompt;
      var mine = this.state.choices && this.state.choices[this.myId];
      var hint = "";

      if (mine) {
        var guess = parseInt(mine.value, 10);
        if (guess === p.answer) hint = "Correct";
        else if (guess < p.answer) hint = "Higher";
        else hint = "Lower";
      }

      var reveal = this.state.revealed ? '<div class="answer-panel">Secret Number: <strong>' + esc(p.answer) + '</strong></div>' : "";

      return '<div class="dilemma-card">' +
        '<h2>Guess Number</h2>' +
        '<p class="scenario-text">Guess the secret number from 1 to 100.</p>' +
        '<input id="number-input" class="game-input" type="number" inputmode="numeric" placeholder="1-100">' +
        '<button class="btn-action" onclick="App.submitNumber()">Submit Guess</button>' +
        (hint ? '<div class="answer-panel">Your hint: <strong>' + esc(hint) + '</strong></div>' : "") +
        reveal +
        this.renderAnswers() +
        '<button class="btn-action secondary-action" onclick="App.reveal()">Reveal Number</button>' +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">New Number</button>' +
      '</div>';
    },

    submitNumber: function () {
      var el = document.getElementById("number-input");
      var val = el ? parseInt(el.value, 10) : NaN;
      if (isNaN(val) || val < 1 || val > 100) {
        alert("Enter a number from 1 to 100.");
        return;
      }
      this.setChoice(String(val));
    },

    renderGuessCeleb: function () {
      var p = this.state.prompt;
      var idx = this.state.clueIdx || 0;
      var clues = (p.clues || []).slice(0, idx + 1);

      var clueHtml = clues.map(function (c, i) {
        return '<p><strong>Clue ' + (i + 1) + ':</strong> ' + esc(c) + '</p>';
      }).join("");

      var nextClue = idx < (p.clues || []).length - 1
        ? '<button class="btn-action secondary-action" onclick="App.nextClue()">Reveal Next Clue</button>'
        : "";

      var answer = this.state.revealed ? '<div class="answer-panel">Answer: <strong>' + esc(p.answer) + '</strong></div>' : "";

      return '<div class="dilemma-card">' +
        '<h2>Guess Celebrity</h2>' +
        '<div class="clue-box">' + clueHtml + '</div>' +
        nextClue +
        '<input id="celeb-input" class="game-input" placeholder="Type celebrity name">' +
        '<button class="btn-action" onclick="App.submitInput(&quot;celeb-input&quot;)">Submit Guess</button>' +
        answer +
        this.renderAnswers() +
        '<button class="btn-action secondary-action" onclick="App.reveal()">Reveal Answer</button>' +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">Next Celebrity</button>' +
      '</div>';
    },

    nextClue: function () {
      if (!this.state || !this.state.prompt) return;
      var max = (this.state.prompt.clues || []).length - 1;
      this.state.clueIdx = Math.min(max, (this.state.clueIdx || 0) + 1);
      this.broadcastFullState();
      this.renderGame(false);
    },

    renderAnswers: function () {
      var choices = this.state && this.state.choices ? this.state.choices : {};
      var keys = Object.keys(choices);
      var players = this.players();
      var waiting = Math.max(0, players.length - keys.length);

      var html = '<div class="choice-reveal"><h4>Live Answers</h4>';

      if (!keys.length) {
        html += '<p class="muted">Waiting for players to answer...</p></div>';
        return html;
      }

      html += '<div class="answer-grid">';

      for (var i = 0; i < keys.length; i++) {
        var entry = choices[keys[i]];
        html += '<div class="answer-card">' +
          '<span class="answer-name">' + esc(entry.name || "Player") + '</span>' +
          '<div class="answer-value">' + this.formatAnswer(entry.value) + '</div>' +
          this.answerMeta(entry.value) +
        '</div>';
      }

      html += '</div>';

      if (waiting > 0) {
        html += '<p class="muted">' + waiting + ' player(s) still picking...</p>';
      }

      html += this.roundSummary(keys, choices);
      html += '</div>';

      return html;
    },

    formatAnswer: function (value) {
      if (value && typeof value === "object" && value.kind === "ranking") {
        return '<ol class="truth-list">' + value.items.map(function (x) {
          return '<li>' + esc(x) + '</li>';
        }).join("") + '</ol>';
      }

      if (value && typeof value === "object" && value.kind === "truths-lie") {
        var showLie = this.state && this.state.revealed;
        return '<ol class="truth-list">' + value.statements.map(function (s, i) {
          var lie = showLie && i === value.lieIndex;
          return '<li class="' + (lie ? "lie-mark" : "") + '">' + esc(s) + (lie ? " - LIE" : "") + '</li>';
        }).join("") + '</ol>';
      }

      return esc(value);
    },

    answerMeta: function (value) {
      if (!this.state || !this.state.prompt) return "";
      var id = this.activeGame;
      var p = this.state.prompt;

      if (id === "guess-number") {
        var n = parseInt(value, 10);
        if (isNaN(n)) return "";
        var hint = n === p.answer ? "Correct" : (n < p.answer ? "Higher" : "Lower");
        return '<div class="answer-meta">' + esc(hint) + '</div>';
      }

      if (id === "guess-age" && this.state.revealed) {
        var y = parseInt(value, 10);
        if (isNaN(y)) return "";
        var diff = Math.abs(y - parseInt(p.answer, 10));
        return '<div class="answer-meta">Off by ' + diff + '</div>';
      }

      if (id === "guess-celeb" && this.state.revealed) {
        var ok = normalizeText(value) === normalizeText(p.answer);
        return '<div class="answer-meta">' + (ok ? "Correct" : "Not quite") + '</div>';
      }

      return "";
    },

    roundSummary: function (keys, choices) {
      if (keys.length < 2) return "";
      var id = this.activeGame;

      if (id === "would-rather" || id === "this-or-that" || id === "red-green-flag" || id === "couple-compat") {
        var first = String(choices[keys[0]].value);
        var match = true;
        for (var i = 1; i < keys.length; i++) {
          if (String(choices[keys[i]].value) !== first) {
            match = false;
            break;
          }
        }
        return '<div class="' + (match ? "match-banner" : "diff-banner") + '">' + (match ? "MATCH" : "Different answers") + '</div>';
      }

      if ((id === "guess-age" || id === "guess-number") && this.state.revealed) {
        var answer = parseInt(this.state.prompt.answer, 10);
        var bestName = "";
        var bestDiff = Infinity;

        keys.forEach(function (k) {
          var entry = choices[k];
          var guess = parseInt(entry.value, 10);
          if (!isNaN(guess)) {
            var diff = Math.abs(guess - answer);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestName = entry.name;
            }
          }
        });

        if (bestName) return '<div class="match-banner">Closest: ' + esc(bestName) + '</div>';
      }

      if (id === "guess-celeb" && this.state.revealed) {
        var correct = [];
        var answerText = this.state.prompt.answer;

        keys.forEach(function (k) {
          var entry = choices[k];
          if (normalizeText(entry.value) === normalizeText(answerText)) correct.push(entry.name);
        });

        if (correct.length) return '<div class="match-banner">Correct: ' + esc(correct.join(", ")) + '</div>';
        return '<div class="diff-banner">No correct guesses this round</div>';
      }

      return "";
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.App.init();
  });
})();