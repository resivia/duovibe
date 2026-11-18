/* Poll, word and spy rounds. Uses the same turn-scoped writes as other games. */
(function () {
  'use strict';

  function isSpy(type) { return type === 'spyInTheCrowd' || type === 'spy'; }
  function isStream(type) { return isSpy(type) || type === 'flashPoll' || type === 'wordStorm'; }

  function buildPrompt(type, players, code) {
    const prompt = window.Picker.nextItem(isSpy(type) ? 'spyInTheCrowd' : type, code);
    if (!isSpy(type)) return prompt;
    const spy = players[Math.floor(Math.random() * players.length)];
    return {
      ...prompt,
      spyId: spy.id,
      assignments: Object.fromEntries(players.map(p => [p.id, p.id === spy.id ? prompt.spyWord : prompt.commonWord])),
      stage: 'CLUES'
    };
  }

  function form(id, label, action, value) {
    return `<form class="gv-stack stream-form" id="stream-entry">
      <label for="${id}">${label}</label>
      <input type="text" id="${id}" class="input-field" maxlength="80" required value="${esc(value)}">
      <button type="submit" class="btn-primary">${action}</button>
    </form>`;
  }

  function wordList(players, choices) {
    return '<div class="stream-entries">' + players.filter(p => choices[p.id] !== undefined).map(p =>
      `<div class="badge-pill">${esc(p.name)}: ${esc(choices[p.id])}</div>`
    ).join('') + '</div>';
  }

  function render(app, el) {
    const { game_type: type, current_prompt: prompt, state, choices, players, round } = app.roomData;
    const spy = isSpy(type);
    const clues = spy && prompt.stage === 'CLUES';
    const result = state === 'COMPARISON' || (!clues && app.checkAllAnswered());
    const label = spy ? 'Spy in the Crowd' : type === 'flashPoll' ? 'Flash Poll' : 'Word Storm';
    const question = prompt.question || prompt.category || label;
    const mine = choices[app.myUid] || '';
    let html = `<div class="glass-card animate-fade gv stream">
      <div class="gv-top"><span class="badge-pill">${label}</span><span class="badge-pill">${result ? 'Results' : 'Round ' + round}</span></div>
      <h2 class="gv-q">${esc(question)}</h2>`;

    if (type === 'flashPoll') {
      const total = Object.keys(choices).length;
      html += '<div class="gv-stack">' + (prompt.options || []).map((option, idx) => {
        const count = Object.values(choices).filter(value => value === String(idx)).length;
        const stats = `${total > 0 ? Math.round(count * 100 / total) : 0}% (${count})`;
        if (result) return `<div class="stream-option"><strong>${esc(option)}</strong> <span>${stats}</span></div>`;
        return `<button type="button" class="btn-secondary stream-option${mine === String(idx) ? ' active-selection' : ''}" data-stream-choice="${idx}"><span>${esc(option)}</span> <span>${stats}</span></button>`;
      }).join('') + '</div>';
    } else if (type === 'wordStorm') {
      if (!result) html += form('wordstorm-input', 'Enter a word for this category', 'Send', mine);
      html += wordList(players, choices);
    } else if (result) {
      const found = players.find(p => p.id === prompt.spyId);
      html += `<div class="gv-locked"><p class="gv-note">The spy was</p><h3>${esc(found?.name || 'Unknown')}</h3>
        <p class="gv-note">Civilian: ${esc(prompt.commonWord)} · Spy: ${esc(prompt.spyWord)}</p></div>`;
    } else {
      html += `<div class="gv-target">Your secret word: <b>${esc(prompt.assignments?.[app.myUid] || '???')}</b></div>`;
      if (clues) {
        html += form('spy-input', 'Give a one-word clue', 'Submit clue', mine) + wordList(players, choices);
      } else {
        html += wordList(players, prompt.clues || {});
        html += '<h3 class="gv-center">Vote for the spy</h3><div class="gv-host">' + players.map(p =>
          `<button type="button" class="btn-secondary${mine === p.id ? ' active-selection' : ''}" data-stream-choice="${esc(p.id)}">${esc(p.name)}</button>`
        ).join('') + '</div>';
      }
    }

    if (app.isHost) {
      html += '<div class="gv-host">';
      if (!result) {
        html += clues
          ? '<button type="button" class="btn-primary" id="spy-vote">Start voting</button>'
          : '<button type="button" class="btn-primary" id="stream-reveal">Force reveal</button>';
      }
      html += `<button type="button" class="btn-secondary" id="stream-next">${result ? 'Next round' : 'Skip'}</button>
        <button type="button" class="btn-secondary" id="stream-lobby">Back to lobby</button></div>`;
    } else if (result) {
      html += '<p class="gv-note gv-center">Waiting for the next round…</p>';
    }
    el.innerHTML = html + '</div>';
    el.querySelectorAll('[data-stream-choice]').forEach(b => {
      b.addEventListener('click', () => app.submitChoice(b.dataset.streamChoice));
    });
    el.querySelector('#stream-lobby')?.addEventListener('click', () => app.hostReturnToLobby());
    el.querySelector('#stream-next')?.addEventListener('click', () => app.hostNextRound());
    el.querySelector('#stream-reveal')?.addEventListener('click', () => app.forceRevealResults());
    el.querySelector('#spy-vote')?.addEventListener('click', () => {
      app.updateRoomState({ current_prompt: { ...prompt, stage: 'VOTING', clues: choices }, choices: {} });
    });
    el.querySelector('#stream-entry')?.addEventListener('submit', event => {
      event.preventDefault();
      const word = event.currentTarget.querySelector('input').value.trim();
      if (word) app.submitChoice(word);
    });
  }

  window.StreamGames = { isStream, buildPrompt, render };
})();
