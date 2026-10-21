/* DuoVibe V8 - Stream & Extended Modes Overlay Engine */
(function() {
  function initOverlay() {
    if (typeof window.DuoVibeApp === 'undefined') {
      console.warn("DuoVibeApp core not found yet. Retrying...");
      setTimeout(initOverlay, 100);
      return;
    }

    const AppProto = window.DuoVibeApp.prototype;

    // 1. Dynamic Lobby Card Injector
    const originalRenderLobby = AppProto.renderLobby;
    AppProto.renderLobby = function(container) {
      if (originalRenderLobby) originalRenderLobby.call(this, container);

      const grid = container.querySelector('.game-selector-grid') || container.querySelector('.grid') || container.querySelector('#game-list');
      if (grid && !grid.querySelector('[data-game="flashPoll"]')) {
        const extraCardsHtml = '<div class="game-card" data-game="flashPoll" onclick="window.App.hostLaunchGame(\'flashPoll\')"><div class="game-icon">&#9889;</div><div class="game-title">Flash Poll</div><div class="game-desc">Quick live polls.</div></div><div class="game-card" data-game="wordStorm" onclick="window.App.hostLaunchGame(\'wordStorm\')"><div class="game-icon">&#127786;&#65039;</div><div class="game-title">Word Storm</div><div class="game-desc">Type matching words.</div></div><div class="game-card" data-game="spyInTheCrowd" onclick="window.App.hostLaunchGame(\'spyInTheCrowd\')"><div class="game-icon">&#128373;</div><div class="game-title">Spy in the Crowd</div><div class="game-desc">Find the spy!</div></div>';
        grid.insertAdjacentHTML('beforeend', extraCardsHtml);
      }
    };

    // 2. Enhanced hostLaunchGame Engine
    const originalHostLaunch = AppProto.hostLaunchGame;
    AppProto.hostLaunchGame = async function(gameType) {
      if (gameType === 'flashPoll') {
        const prompt = window.Picker ? window.Picker.nextItem('flashPoll') : null;
        await this.updateRoomState({ game_type: 'flashPoll', state: 'ACTIVE', current_prompt: prompt, choices: {} });
      } else if (gameType === 'wordStorm') {
        const prompt = window.Picker ? window.Picker.nextItem('wordStorm') : null;
        await this.updateRoomState({ game_type: 'wordStorm', state: 'ACTIVE', current_prompt: prompt, choices: {} });
      } else if (gameType === 'spyInTheCrowd' || gameType === 'spy') {
        const pair = window.Picker ? window.Picker.nextItem('spyPairs') : null;
        const players = this.roomData.players || [];
        if (players.length === 0) { alert("Need at least 1 player!"); return; }
        const spyIndex = Math.floor(Math.random() * players.length);
        const spyPlayer = players[spyIndex];
        const assignments = {};
        players.forEach(function(p) { assignments[p.id] = (p.id === spyPlayer.id) ? pair.spyWord : pair.commonWord; });
        await this.updateRoomState({ game_type: 'spyInTheCrowd', state: 'ACTIVE', current_prompt: { category: pair.category, spyId: spyPlayer.id, spyName: spyPlayer.name, commonWord: pair.commonWord, spyWord: pair.spyWord, assignments: assignments, stage: 'CLUES' }, choices: {} });
      } else if (originalHostLaunch) {
        await originalHostLaunch.call(this, gameType);
      }
    };

    // 3. Stream Game Renderer
    AppProto.renderStreamGame = function(container) {
      const gameType = this.roomData.game_type;
      const prompt = this.roomData.current_prompt || {};
      const choices = this.roomData.choices || {};
      const myUid = this.getPersistentId();
      const isHost = (myUid === this.roomData.host_id);
      let html = '';

      if (gameType === 'flashPoll') {
        const totalVotes = Object.keys(choices).length;
        html += '<div class="glass-card" style="text-align:center; padding:20px;"><div class="status-chip">&#9889; Flash Poll</div><h2 style="margin:16px 0;">' + (prompt.question || 'Quick Poll') + '</h2><div style="display:grid; gap:12px; margin-top:20px;">';
        (prompt.options || []).forEach(function(opt, idx) {
          const optVotes = Object.values(choices).filter(function(c) { return String(c) === String(idx); }).length;
          const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
          const isSelected = String(choices[myUid]) === String(idx);
          html += '<button class="btn-secondary ' + (isSelected ? 'active-selection' : '') + '" onclick="window.App.submitChoice(\'' + idx + '\')" style="position:relative; overflow:hidden; padding:16px; text-align:left; display:flex; justify-content:space-between; align-items:center;"><div style="position:absolute; left:0; top:0; bottom:0; width:' + pct + '%; background:rgba(255,255,255,0.15);"></div><span style="position:relative; z-index:2; font-weight:700;">' + opt + '</span><span style="position:relative; z-index:2; font-size:14px;">' + pct + '% (' + optVotes + ')</span></button>';
        });
        html += '</div></div>';
      } else if (gameType === 'wordStorm') {
        const myWord = choices[myUid] || '';
        html += '<div class="glass-card" style="text-align:center; padding:20px;"><div class="status-chip">&#127786;&#65039; Word Storm</div><h2 style="margin:12px 0;">Category: ' + (prompt.category || 'General') + '</h2><div style="display:flex; gap:8px; margin-bottom:16px;"><input type="text" id="wordstorm-input" class="input-field" value="' + myWord + '" placeholder="Enter word..." style="flex:1;"><button class="btn-primary" onclick="var v=document.getElementById(\'wordstorm-input\').value.trim(); if(v) window.App.submitChoice(v);" style="width:auto; padding:0 20px;">Send</button></div><div style="margin-top:20px; text-align:left;"><h4>Words (' + Object.keys(choices).length + '):</h4><div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">' + Object.values(choices).map(function(w) { return '<span class="badge-pill">' + w + '</span>'; }).join('') + '</div></div></div>';
      } else if (gameType === 'spyInTheCrowd' || gameType === 'spy') {
        const assignments = prompt.assignments || {};
        const mySecretWord = assignments[myUid] || '???';
        const stage = prompt.stage || 'CLUES';
        const players = this.roomData.players || [];
        html += '<div class="glass-card" style="text-align:center; padding:20px;"><div class="status-chip">&#128373; Spy in the Crowd</div><h3 style="margin:12px 0;">Category: ' + prompt.category + '</h3><div class="glass-card" style="background:rgba(255,255,255,0.08); padding:16px; margin:16px 0; border:2px solid #ff007f;"><div style="font-size:12px; text-transform:uppercase; opacity:0.8;">Your Secret Word:</div><div style="font-size:26px; font-weight:900; margin-top:6px;">' + mySecretWord + '</div></div>';
        if (stage === 'CLUES') {
          const myClue = choices[myUid] || '';
          html += '<p style="font-size:14px; opacity:0.85;">Give a one-word clue!</p><div style="display:flex; gap:8px; margin:16px 0;"><input type="text" id="spy-input" class="input-field" value="' + myClue + '" placeholder="Type clue..." style="flex:1;"><button class="btn-primary" onclick="var v=document.getElementById(\'spy-input\').value.trim(); if(v) window.App.submitChoice(v);" style="width:auto; padding:0 20px;">Submit</button></div>';
        } else if (stage === 'VOTING') {
          const myVote = choices[myUid] || '';
          html += '<h4 style="margin:12px 0;">Vote for the Spy!</h4><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:16px 0;">';
          players.forEach(function(p) {
            html += '<button class="btn-secondary ' + (myVote === p.id ? 'active-selection' : '') + '" onclick="window.App.submitChoice(\'' + p.id + '\')" style="padding:12px;">' + p.name + '</button>';
          });
          html += '</div>';
        }
        html += '</div>';
      }

      if (isHost) {
        html += '<div class="glass-card" style="margin-top:16px; padding:16px; text-align:center; border:1px dashed rgba(255,255,255,0.3);"><div style="font-size:12px; font-weight:800; text-transform:uppercase; margin-bottom:10px; opacity:0.8;">Host Controls</div><div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">';
        if (gameType === 'spyInTheCrowd' && prompt.stage === 'CLUES') {
          html += '<button class="btn-primary" onclick="window.App.advanceSpyStage(\'VOTING\')" style="width:auto; padding:10px 18px;">Start Voting</button>';
        }
        html += '<button class="btn-primary" onclick="window.App.forceRevealResults()" style="width:auto; padding:10px 18px; background:linear-gradient(135deg, #ff007f, #7928ca);">Force Reveal</button></div></div>';
      }

      container.innerHTML = html;
    };

    // 4. Stream Comparison Renderer
    AppProto.renderStreamComparison = function(container) {
      const gameType = this.roomData.game_type;
      const prompt = this.roomData.current_prompt || {};
      const choices = this.roomData.choices || {};
      const players = this.roomData.players || [];
      const myUid = this.getPersistentId();
      const isHost = (myUid === this.roomData.host_id);
      let html = '<div class="glass-card" style="text-align:center; padding:20px;"><div class="status-chip">&#128202; Results</div><h2 style="margin:12px 0;">' + (prompt.question || prompt.category || 'Round Complete') + '</h2>';

      if (gameType === 'flashPoll') {
        const total = Object.keys(choices).length;
        html += '<div style="display:grid; gap:10px; margin:20px 0;">';
        (prompt.options || []).forEach(function(opt, idx) {
          const count = Object.values(choices).filter(function(c) { return String(c) === String(idx); }).length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          html += '<div class="glass-card" style="padding:12px; text-align:left; display:flex; justify-content:space-between; background:rgba(255,255,255,0.06);"><span style="font-weight:700;">' + opt + '</span><span class="badge-pill">' + pct + '% (' + count + ')</span></div>';
        });
        html += '</div>';
      } else if (gameType === 'wordStorm') {
        html += '<div style="margin:20px 0;"><h4>Word Submissions:</h4><div style="display:grid; gap:8px; margin-top:12px;">';
        Object.entries(choices).forEach(function(entry) {
          const uid = entry[0], word = entry[1];
          const player = players.find(function(p) { return p.id === uid; });
          html += '<div class="glass-card" style="padding:10px; text-align:left; display:flex; justify-content:space-between;"><span>' + (player ? player.name : 'Player') + ':</span><span style="font-weight:800; color:#00f2fe;">' + word + '</span></div>';
        });
        html += '</div></div>';
      } else if (gameType === 'spyInTheCrowd' || gameType === 'spy') {
        const spyPlayer = players.find(function(p) { return p.id === prompt.spyId; });
        html += '<div class="glass-card" style="background:rgba(255,0,127,0.15); border:2px solid #ff007f; padding:16px; margin:16px 0;"><h3 style="color:#fff; margin-bottom:6px;">The Spy Was:</h3><div style="font-size:24px; font-weight:900; color:#00f2fe;">' + (spyPlayer ? spyPlayer.name : 'Unknown') + '</div><div style="margin-top:10px; font-size:14px; opacity:0.9;">Civilian: <b>' + prompt.commonWord + '</b> | Spy: <b>' + prompt.spyWord + '</b></div></div>';
      }

      if (isHost) {
        html += '<div style="margin-top:24px;"><button class="btn-primary" onclick="window.App.nextRound()" style="width:100%; padding:14px;">Next Round</button></div>';
      }
      html += '</div>';
      container.innerHTML = html;
    };

    // 5. Override Core Renderers
    const originalRenderActiveGame = AppProto.renderActiveGame;
    AppProto.renderActiveGame = function(container) {
      const gameType = this.roomData.game_type;
      if (['flashPoll', 'wordStorm', 'spyInTheCrowd', 'spy'].indexOf(gameType) !== -1) {
        this.renderStreamGame(container);
      } else if (originalRenderActiveGame) {
        originalRenderActiveGame.call(this, container);
      }
    };

    const originalRenderComparison = AppProto.renderComparison;
    AppProto.renderComparison = function(container) {
      const gameType = this.roomData.game_type;
      if (['flashPoll', 'wordStorm', 'spyInTheCrowd', 'spy'].indexOf(gameType) !== -1) {
        this.renderStreamComparison(container);
      } else if (originalRenderComparison) {
        originalRenderComparison.call(this, container);
      }
    };

    // 6. Host Helpers
    AppProto.forceRevealResults = async function() {
      await this.updateRoomState({ state: 'COMPARISON' });
    };

    AppProto.advanceSpyStage = async function(nextStage) {
      const currentPrompt = this.roomData.current_prompt || {};
      currentPrompt.stage = nextStage;
      await this.updateRoomState({ current_prompt: currentPrompt, choices: {} });
    };

    console.log("DuoVibe V8 Stream Overlay LOADED SUCCESSFULLY!");
  }

  // Start initialization
  initOverlay();
})();