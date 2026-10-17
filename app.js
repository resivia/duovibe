(function () {
  "use strict";

  function initSupabase() {
    var url = window.CONFIG && window.CONFIG.SUPABASE_URL;
    var key = window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY;

    if (window.supabase && typeof window.supabase.createClient === "function" && url && key) {
      window.sb = window.supabase.createClient(url, key);
    }
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function gameIcon(code) {
    return '<span class="duo-icon">' + code + '</span>';
  }

  var GAME_DEFS = [
    { id: "blind-rank", title: "Blind Rank", icon: "&#128584;", desc: "Rank 5 surprise items." },
    { id: "truths-lie", title: "2 Truths 1 Lie", icon: "&#129323;", desc: "Submit statements and reveal the lie." },
    { id: "would-rather", title: "Would You Rather", icon: "&#9878;", desc: "Pick A or B." },
    { id: "this-or-that", title: "This or That", icon: "&#128260;", desc: "Quick preference picks." },
    { id: "red-green-flag", title: "Red/Green Flag", icon: "&#128681;", desc: "Judge the scenario." },
    { id: "couple-compat", title: "Compat Quiz", icon: "&#128150;", desc: "Who is most likely?" },
    { id: "word-letters", title: "First Letter", icon: "&#128292;", desc: "Word must start with a letter." },
    { id: "categories-bomb", title: "Pass The Bomb", icon: "&#128163;", desc: "Fast category answers." },
    { id: "guess-age", title: "Guess The Year", icon: "&#128197;", desc: "Closest year wins." },
    { id: "guess-number", title: "Guess Number", icon: "&#128290;", desc: "Higher/lower guessing." },
    { id: "guess-celeb", title: "Guess Celebrity", icon: "&#11088;", desc: "Reveal clues one at a time." }
  ];

  function findGame(id) {
    return GAME_DEFS.find(function (g) { return g.id === id; }) || GAME_DEFS[0];
  }

  window.App = {
    myId: localStorage.getItem("duo_my_id") || ("user_" + Math.random().toString(36).slice(2, 10)),
    myName: localStorage.getItem("duo_my_name") || ("Player " + Math.floor(Math.random() * 100)),
    roomCode: null,
    activeGame: null,
    gameState: null,
    channel: null,
    peers: {},

    init: function () {
      localStorage.setItem("duo_my_id", this.myId);
      initSupabase();
      this.updateStatusBadge(window.sb ? "online" : "offline", window.sb ? "ONLINE" : "OFFLINE");
      this.renderHome();
    },

    updateStatusBadge: function (className, text) {
      var badge = document.getElementById("conn-status");
      if (!badge) return;
      badge.className = "status-badge " + className;
      badge.textContent = text;
    },

    renderHome: function () {
      var container = document.getElementById("main-content");
      if (!container) return;

      container.innerHTML =
        '<section class="home-card">' +
          '<h2>Welcome to DuoVibe <span aria-hidden="true">&#128149;</span></h2>' +
          '<p>Play 11 real-time games with your long-distance partner or a group of 3 to 8 players.</p>' +

          '<div class="mini-feature-row">' +
            '<span>Video call ready</span><span>Live reveals</span><span>No-repeat prompts</span>' +
          '</div>' +

          '<label class="form-label" for="input-my-name">Your Name</label>' +
          '<input id="input-my-name" class="game-input" type="text" value="' + esc(this.myName) + '" placeholder="Enter your name">' +

          '<button class="btn-primary full-btn" onclick="App.createRoom()">Create New Room</button>' +

          '<div class="divider">OR</div>' +

          '<div class="join-row">' +
            '<input id="input-room-code" class="game-input" type="text" inputmode="numeric" maxlength="6" placeholder="6-DIGIT CODE">' +
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
      var code = input ? input.value.trim().replace(/\D/g, "") : "";
      if (code.length !== 6) {
        alert("Enter a valid 6-digit room code.");
        return;
      }
      this.joinRoom(code);
    },

    joinRoom: function (code) {
      this.roomCode = code;
      this.renderLobby();

      if (!window.sb) initSupabase();

      if (!window.sb) {
        this.updateStatusBadge("offline", "LOCAL");
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
          var count = Object.keys(self.peers).length || 1;
          self.updateStatusBadge("live", "LIVE " + count);
          self.updateLobbyPlayers();
          if (self.activeGame) self.renderActiveGame();
        })
        .on("broadcast", { event: "game_update" }, function (message) {
          var payload = message.payload || {};
          if (payload.activeGame !== undefined) self.activeGame = payload.activeGame;
          if (payload.gameState !== undefined) self.gameState = payload.gameState;
          if (self.activeGame) self.renderActiveGame();
          else self.renderLobby();
        })
        .on("broadcast", { event: "state_request" }, function (message) {
          var payload = message.payload || {};
          if (payload.from !== self.myId && self.activeGame && self.gameState) {
            self.sendFullState();
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
              payload: { from: self.myId }
            });
          }
        });
    },

    getPlayers: function () {
      var players = {};
      players[this.myId] = this.myName;

      Object.keys(this.peers || {}).forEach(function (key) {
        var arr = App.peers[key];
        if (arr && arr[0]) {
          players[key] = arr[0].name || "Player";
        }
      });

      return Object.keys(players).map(function (id) {
        return { id: id, name: players[id] };
      }).slice(0, 8);
    },

    updateLobbyPlayers: function () {
      var el = document.getElementById("connected-players-list");
      if (!el) return;
      var players = this.getPlayers();
      el.innerHTML = players.map(function (p) {
        return '<span class="player-tag"><span class="online-dot"></span>' + esc(p.name) + '</span>';
      }).join("");
    },

    renderLobby: function () {
      var container = document.getElementById("main-content");
      if (!container) return;

      var cards = GAME_DEFS.map(function (g) {
        return '<button class="game-card" onclick="App.launchGame(\'' + g.id + '\')">' +
          '<span class="game-card-icon">' + g.icon + '</span>' +
          '<span class="game-card-title">' + esc(g.title) + '</span>' +
          '<span class="game-card-desc">' + esc(g.desc) + '</span>' +
        '</button>';
      }).join("");

      container.innerHTML =
        '<section class="lobby-card">' +
          '<div class="room-panel">' +
            '<span class="room-label">ROOM CODE</span>' +
            '<div class="room-code-display">' + esc(this.roomCode) + '</div>' +
            '<button class="btn-primary copy-btn" onclick="App.copyRoomCode()">Copy Code</button>' +
          '</div>' +

          '<div class="players-block">' +
            '<h3>Players in Room</h3>' +
            '<div id="connected-players-list" class="players-list"></div>' +
            '<p class="helper-text">Group mode supports 3 to 8 players. Games still work with 1 or 2 players for testing.</p>' +
          '</div>' +

          '<div class="lobby-title-row">' +
            '<h2>Select a Game</h2>' +
            '<button class="btn-secondary small-btn" onclick="window.Features && window.Features.toggleCallWidget()">Call</button>' +
          '</div>' +

          '<div class="games-grid-container">' + cards + '</div>' +
        '</section>';

      this.updateLobbyPlayers();
    },

    copyRoomCode: function () {
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

    sendFullState: function () {
      if (!this.channel) return;
      this.channel.send({
        type: "broadcast",
        event: "game_update",
        payload: {
          activeGame: this.activeGame,
          gameState: this.gameState
        }
      });
    },

    launchGame: function (gameId) {
      this.activeGame = gameId;
      this.gameState = this.createRoundState(gameId, 1);
      this.sendFullState();
      this.renderActiveGame();
    },

    nextRound: function () {
      if (!this.activeGame) return;
      var round = ((this.gameState && this.gameState.round) || 0) + 1;
      this.gameState = this.createRoundState(this.activeGame, round);
      this.sendFullState();
      this.renderActiveGame();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    createRoundState: function (gameId, round) {
      var state = {
        gameId: gameId,
        round: round || 1,
        choices: {},
        revealed: false,
        startedAt: Date.now(),
        prompt: null,
        clueIdx: 0
      };

      switch (gameId) {
        case "would-rather": {
          var wr = window.Picker.nextItem("wouldRather", window.BANKS.wouldRather);
          state.prompt = { title: "Would You Rather", options: [wr.a, wr.b] };
          break;
        }

        case "this-or-that": {
          var tot = window.Picker.nextItem("thisOrThat", window.BANKS.thisOrThat);
          state.prompt = { title: "This or That", options: [tot.a, tot.b] };
          break;
        }

        case "red-green-flag": {
          var flag = window.Picker.nextItem("redGreenFlag", window.BANKS.redGreenFlag);
          state.prompt = { title: "Red Flag or Green Flag?", scenario: flag, options: ["Green Flag", "Red Flag"] };
          break;
        }

        case "couple-compat": {
          var q = window.Picker.nextItem("compatQuiz", window.BANKS.compatQuiz);
          state.prompt = { title: "Compatibility Quiz", question: q };
          break;
        }

        case "blind-rank": {
          state.prompt = { title: "Blind Rank", items: window.Picker.freshBlindRankSet(5) };
          break;
        }

        case "word-letters": {
          var lp = window.Picker.nextItem("letterPrompts", window.BANKS.letterPrompts);
          state.prompt = { title: "First Letter", category: lp.category, letter: lp.letter };
          break;
        }

        case "categories-bomb": {
          var cat = window.Picker.nextItem("bombCategories", window.BANKS.bombCategories);
          state.prompt = { title: "Pass The Bomb", category: cat };
          break;
        }

        case "guess-age": {
          var age = window.Picker.nextItem("guessAge", window.BANKS.guessAge);
          state.prompt = { title: "Guess The Year", subject: age.subject, answer: age.answer };
          break;
        }

        case "guess-number": {
          state.prompt = { title: "Guess Number", min: 1, max: 100, answer: window.Picker.freshNumber(1, 100) };
          break;
        }

        case "guess-celeb": {
          var celeb = window.Picker.nextItem("guessCeleb", window.BANKS.guessCeleb);
          state.prompt = { title: "Guess Celebrity", clues: celeb.clues, answer: celeb.answer };
          state.clueIdx = 0;
          break;
        }

        case "truths-lie":
        default:
          state.prompt = { title: "2 Truths 1 Lie" };
          break;
      }

      return state;
    },

    renderActiveGame: function () {
      var container = document.getElementById("main-content");
      if (!container) return;

      if (!this.activeGame || !this.gameState) {
        this.renderLobby();
        return;
      }

      var game = findGame(this.activeGame);
      var body = "";

      switch (this.activeGame) {
        case "blind-rank": body = this.renderBlindRank(); break;
        case "truths-lie": body = this.renderTruthsLie(); break;
        case "would-rather": body = this.renderTwoOptionGame(); break;
        case "this-or-that": body = this.renderTwoOptionGame(); break;
        case "red-green-flag": body = this.renderFlagGame(); break;
        case "couple-compat": body = this.renderCompatQuiz(); break;
        case "word-letters": body = this.renderWordLetters(); break;
        case "categories-bomb": body = this.renderBomb(); break;
        case "guess-age": body = this.renderGuessYear(); break;
        case "guess-number": body = this.renderGuessNumber(); break;
        case "guess-celeb": body = this.renderGuessCeleb(); break;
        default: body = "<p>Game not found.</p>";
      }

      container.innerHTML =
        '<section class="active-game-wrapper">' +
          '<div class="game-topbar">' +
            '<button class="btn-secondary small-btn" onclick="App.exitGame()">Lobby</button>' +
            '<div class="game-title-mini">' + game.icon + ' ' + esc(game.title) + '<span>Round ' + esc(this.gameState.round) + '</span></div>' +
            '<button class="btn-secondary small-btn" onclick="window.Features && window.Features.toggleCallWidget()">Call</button>' +
          '</div>' +
          body +
        '</section>';
    },

    exitGame: function () {
      this.activeGame = null;
      this.gameState = null;
      this.sendFullState();
      this.renderLobby();
    },

    submitChoice: function (value) {
      if (!this.gameState) return;

      value = typeof value === "string" ? value.trim() : value;
      if (value === "" || value == null) {
        alert("Enter an answer first.");
        return;
      }

      var choices = this.gameState.choices || {};
      choices[this.myId] = {
        name: this.myName,
        value: value,
        at: Date.now()
      };

      this.gameState.choices = choices;
      this.sendFullState();
      this.renderActiveGame();

      if (Object.keys(choices).length >= 2 && window.confetti) {
        window.confetti({ particleCount: 70, spread: 60, origin: { y: 0.75 } });
      }
    },

    pickOption: function (index) {
      var options = this.gameState && this.gameState.prompt && this.gameState.prompt.options;
      if (!options || !options[index]) return;
      this.submitChoice(options[index]);
    },

    submitInput: function (id) {
      var el = document.getElementById(id);
      this.submitChoice(el ? el.value : "");
    },

    revealAnswer: function () {
      if (!this.gameState) return;
      this.gameState.revealed = true;
      this.sendFullState();
      this.renderActiveGame();
    },

    patchState: function (patch) {
      this.gameState = Object.assign({}, this.gameState || {}, patch || {});
      this.sendFullState();
      this.renderActiveGame();
    },

    renderChoiceComparison: function () {
      var state = this.gameState || {};
      var choices = state.choices || {};
      var keys = Object.keys(choices);
      var players = this.getPlayers();
      var waiting = Math.max(0, players.length - keys.length);

      if (keys.length === 0) {
        return '<div class="choice-reveal"><p class="muted">Waiting for players to answer...</p></div>';
      }

      var html = '<div class="choice-reveal"><h4>Live Answers</h4><div class="answer-grid">';

      keys.forEach(function (id) {
        var entry = choices[id];
        html += '<div class="answer-card">' +
          '<span class="answer-name">' + esc(entry.name || "Player") + '</span>' +
          '<div class="answer-value">' + App.formatChoice(entry.value) + '</div>' +
        '</div>';
      });

      html += '</div>';

      if (waiting > 0) {
        html += '<p class="muted">' + waiting + ' player(s) still picking...</p>';
      }

      if (keys.length >= 2) {
        var vals = keys.map(function (id) {
          return JSON.stringify(choices[id].value).toLowerCase();
        });
        var match = vals.every(function (v) { return v === vals[0]; });
        html += '<div class="' + (match ? "match-banner" : "diff-banner") + '">' + (match ? "MATCH" : "Different answers") + '</div>';
      }

      html += '</div>';
      return html;
    },

    formatChoice: function (value) {
      if (value && typeof value === "object" && value.kind === "truths-lie") {
        var out = '<ol class="truth-list">';
        value.statements.forEach(function (s, i) {
          var isLie = App.gameState && App.gameState.revealed && i === value.lieIndex;
          out += '<li' + (isLie ? ' class="lie-mark"' : "") + '>' + esc(s) + (isLie ? " - LIE" : "") + '</li>';
        });
        out += '</ol>';
        return out;
      }

      if (value && typeof value === "object" && value.kind === "ranking") {
        return '<ol class="truth-list">' + value.items.map(function (item) {
          return '<li>' + esc(item) + '</li>';
        }).join("") + '</ol>';
      }

      return esc(value);
    },

    renderTwoOptionGame: function () {
      var p = this.gameState.prompt;
      var mine = this.gameState.choices && this.gameState.choices[this.myId];
      var myVal = mine && mine.value;

      return '<div class="dilemma-card">' +
        '<h2>' + esc(p.title) + '</h2>' +
        '<div class="choice-buttons">' +
          '<button class="btn-choice ' + (myVal === p.options[0] ? "selected" : "") + '" onclick="App.pickOption(0)">' + esc(p.options[0]) + '</button>' +
          '<div class="divider">OR</div>' +
          '<button class="btn-choice ' + (myVal === p.options[1] ? "selected" : "") + '" onclick="App.pickOption(1)">' + esc(p.options[1]) + '</button>' +
        '</div>' +
        this.renderChoiceComparison() +
        '<button class="btn-action" onclick="App.nextRound()">Next Round</button>' +
      '</div>';
    },

    renderFlagGame: function () {
      var p = this.gameState.prompt;
      var mine = this.gameState.choices && this.gameState.choices[this.myId];
      var myVal = mine && mine.value;

      return '<div class="dilemma-card">' +
        '<h2>' + esc(p.title) + '</h2>' +
        '<p class="scenario-text">' + esc(p.scenario) + '</p>' +
        '<div class="choice-buttons">' +
          '<button class="btn-choice ' + (myVal === "Green Flag" ? "selected" : "") + '" onclick="App.pickOption(0)">Green Flag</button>' +
          '<button class="btn-choice ' + (myVal === "Red Flag" ? "selected" : "") + '" onclick="App.pickOption(1)">Red Flag</button>' +
        '</div>' +
        this.renderChoiceComparison() +
        '<button class="btn-action" onclick="App.nextRound()">Next Scenario</button>' +
      '</div>';
    },

    renderCompatQuiz: function () {
      var p = this.gameState.prompt;
      var players = this.getPlayers();
      var mine = this.gameState.choices && this.gameState.choices[this.myId];
      var myVal = mine && mine.value;

      var buttons = players.map(function (pl) {
        var label = pl.id === App.myId ? "Me (" + pl.name + ")" : pl.name;
        return '<button class="btn-choice ' + (myVal === pl.name ? "selected" : "") + '" onclick="App.submitChoice(\'' + esc(pl.name).replace(/&#039;/g, "\\'") + '\')">' + esc(label) + '</button>';
      }).join("");

      if (players.length < 2) {
        buttons += '<button class="btn-choice" onclick="App.submitChoice(\'Partner\')">Partner</button>';
      }

      return '<div class="dilemma-card">' +
        '<h2>Compatibility Quiz</h2>' +
        '<p class="scenario-text">' + esc(p.question) + '</p>' +
        '<div class="choice-buttons compact">' + buttons + '</div>' +
        this.renderChoiceComparison() +
        '<button class="btn-action" onclick="App.nextRound()">Next Question</button>' +
      '</div>';
    },

    renderBlindRank: function () {
      var items = this.gameState.prompt.items || [];
      var rows = items.map(function (item, i) {
        var opts = '<option value="">Rank</option>';
        for (var r = 1; r <= 5; r++) opts += '<option value="' + r + '">' + r + '</option>';
        return '<div class="rank-row">' +
          '<span>' + esc(item) + '</span>' +
          '<select id="rank-' + i + '" class="rank-select">' + opts + '</select>' +
        '</div>';
      }).join("");

      return '<div class="dilemma-card">' +
        '<h2>Blind Rank</h2>' +
        '<p class="muted">Give each item a unique rank from 1 best to 5 worst.</p>' +
        '<div class="rank-list">' + rows + '</div>' +
        '<button class="btn-action" onclick="App.submitBlindRank()">Submit Ranking</button>' +
        this.renderChoiceComparison() +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">New Set</button>' +
      '</div>';
    },

    submitBlindRank: function () {
      var items = this.gameState.prompt.items || [];
      var ranked = [];
      var used = {};

      for (var i = 0; i < items.length; i++) {
        var el = document.getElementById("rank-" + i);
        var rank = el ? parseInt(el.value, 10) : 0;
        if (!rank || rank < 1 || rank > 5) {
          alert("Please rank every item from 1 to 5.");
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

      this.submitChoice({
        kind: "ranking",
        items: ranked.map(function (x) { return x.rank + ". " + x.item; })
      });
    },

    renderTruthsLie: function () {
      return '<div class="dilemma-card">' +
        '<h2>2 Truths 1 Lie</h2>' +
        '<p class="muted">Write 3 statements and secretly mark the lie. Tap Reveal after everyone submits.</p>' +
        '<input class="game-input" id="stmt-0" placeholder="Statement 1">' +
        '<input class="game-input" id="stmt-1" placeholder="Statement 2">' +
        '<input class="game-input" id="stmt-2" placeholder="Statement 3">' +
        '<label class="form-label">Which one is the lie?</label>' +
        '<select class="game-input" id="lie-index">' +
          '<option value="0">Statement 1</option>' +
          '<option value="1">Statement 2</option>' +
          '<option value="2">Statement 3</option>' +
        '</select>' +
        '<button class="btn-action" onclick="App.submitTruthsLie()">Submit</button>' +
        this.renderChoiceComparison() +
        '<button class="btn-action secondary-action" onclick="App.revealAnswer()">Reveal Lies</button>' +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">New Round</button>' +
      '</div>';
    },

    submitTruthsLie: function () {
      var statements = [0, 1, 2].map(function (i) {
        var el = document.getElementById("stmt-" + i);
        return el ? el.value.trim() : "";
      });

      if (statements.some(function (s) { return !s; })) {
        alert("Fill all 3 statements first.");
        return;
      }

      var lieEl = document.getElementById("lie-index");
      var lieIndex = lieEl ? parseInt(lieEl.value, 10) : 0;

      this.submitChoice({
        kind: "truths-lie",
        statements: statements,
        lieIndex: lieIndex
      });
    },

    renderWordLetters: function () {
      var p = this.gameState.prompt;
      return '<div class="dilemma-card">' +
        '<h2>First Letter</h2>' +
        '<p class="scenario-text">Category: <strong>' + esc(p.category) + '</strong></p>' +
        '<p class="scenario-text">Word must start with: <strong>' + esc(p.letter) + '</strong></p>' +
        '<input class="game-input" id="word-input" placeholder="Type your word">' +
        '<button class="btn-action" onclick="App.submitWord()">Submit Word</button>' +
        this.renderChoiceComparison() +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">New Category</button>' +
      '</div>';
    },

    submitWord: function () {
      var p = this.gameState.prompt;
      var el = document.getElementById("word-input");
      var word = el ? el.value.trim() : "";

      if (!word) {
        alert("Type a word first.");
        return;
      }

      if (word[0].toUpperCase() !== p.letter.toUpperCase()) {
        alert("Your word must start with " + p.letter + ".");
        return;
      }

      this.submitChoice(word);
    },

    renderBomb: function () {
      var p = this.gameState.prompt;
      return '<div class="dilemma-card">' +
        '<h2>Pass The Bomb</h2>' +
        '<p class="scenario-text">Category: <strong>' + esc(p.category) + '</strong></p>' +
        '<p class="muted">Type a valid answer fast. Use Next Category for unlimited rounds.</p>' +
        '<input class="game-input" id="bomb-input" placeholder="Type answer fast">' +
        '<button class="btn-action" onclick="App.submitInput(\'bomb-input\')">Pass Bomb</button>' +
        this.renderChoiceComparison() +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">Next Category</button>' +
      '</div>';
    },

    renderGuessYear: function () {
      var p = this.gameState.prompt;
      var answerHtml = "";

      if (this.gameState.revealed) {
        answerHtml = '<div class="answer-panel">Answer: <strong>' + esc(p.answer) + '</strong></div>';
      }

      return '<div class="dilemma-card">' +
        '<h2>Guess The Year</h2>' +
        '<p class="scenario-text">' + esc(p.subject) + '</p>' +
        '<input class="game-input" id="year-input" type="number" inputmode="numeric" placeholder="Enter year">' +
        '<button class="btn-action" onclick="App.submitYearGuess()">Submit Guess</button>' +
        answerHtml +
        this.renderChoiceComparison() +
        '<button class="btn-action secondary-action" onclick="App.revealAnswer()">Reveal Answer</button>' +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">Next Year</button>' +
      '</div>';
    },

    submitYearGuess: function () {
      var el = document.getElementById("year-input");
      var val = el ? parseInt(el.value, 10) : NaN;
      if (!val || isNaN(val)) {
        alert("Enter a valid year.");
        return;
      }
      this.submitChoice(String(val));
    },

    renderGuessNumber: function () {
      var p = this.gameState.prompt;
      var mine = this.gameState.choices && this.gameState.choices[this.myId];
      var hint = "";

      if (mine && mine.value) {
        var guess = parseInt(mine.value, 10);
        if (guess === p.answer) hint = "Correct!";
        else if (guess < p.answer) hint = "Higher";
        else hint = "Lower";
      }

      var answerHtml = this.gameState.revealed ? '<div class="answer-panel">Number: <strong>' + esc(p.answer) + '</strong></div>' : "";

      return '<div class="dilemma-card">' +
        '<h2>Guess Number</h2>' +
        '<p class="scenario-text">Guess a number from 1 to 100.</p>' +
        '<input class="game-input" id="number-input" type="number" inputmode="numeric" placeholder="1-100">' +
        '<button class="btn-action" onclick="App.submitNumberGuess()">Submit Guess</button>' +
        (hint ? '<div class="answer-panel">Hint: <strong>' + esc(hint) + '</strong></div>' : "") +
        answerHtml +
        this.renderChoiceComparison() +
        '<button class="btn-action secondary-action" onclick="App.revealAnswer()">Reveal Number</button>' +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">New Number</button>' +
      '</div>';
    },

    submitNumberGuess: function () {
      var el = document.getElementById("number-input");
      var val = el ? parseInt(el.value, 10) : NaN;
      if (!val || isNaN(val) || val < 1 || val > 100) {
        alert("Enter a number from 1 to 100.");
        return;
      }
      this.submitChoice(String(val));
    },

    renderGuessCeleb: function () {
      var p = this.gameState.prompt;
      var idx = this.gameState.clueIdx || 0;
      var clues = (p.clues || []).slice(0, idx + 1);
      var answerHtml = this.gameState.revealed ? '<div class="answer-panel">Answer: <strong>' + esc(p.answer) + '</strong></div>' : "";

      return '<div class="dilemma-card">' +
        '<h2>Guess Celebrity</h2>' +
        '<div class="clue-box">' +
          clues.map(function (c, i) {
            return '<p><strong>Clue ' + (i + 1) + ':</strong> ' + esc(c) + '</p>';
          }).join("") +
        '</div>' +
        (idx < p.clues.length - 1 ? '<button class="btn-action secondary-action" onclick="App.revealNextClue()">Reveal Next Clue</button>' : "") +
        '<input class="game-input" id="celeb-input" placeholder="Type celebrity name">' +
        '<button class="btn-action" onclick="App.submitInput(\'celeb-input\')">Submit Guess</button>' +
        answerHtml +
        this.renderChoiceComparison() +
        '<button class="btn-action secondary-action" onclick="App.revealAnswer()">Reveal Answer</button>' +
        '<button class="btn-action secondary-action" onclick="App.nextRound()">Next Celebrity</button>' +
      '</div>';
    },

    revealNextClue: function () {
      var p = this.gameState.prompt;
      var idx = this.gameState.clueIdx || 0;
      if (idx < p.clues.length - 1) {
        this.patchState({ clueIdx: idx + 1 });
      }
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.App.init();
  });
})();