/* Two untimed, text-only games. Each answer stays in its writer's room slot. */
(function () {
  'use strict';

  const POSTCARDS = [
    'What small thing made you smile today?',
    'What would I hear if I sat beside you for one minute right now?',
    'Describe a snack from where you live that you’d like me to try.',
    'What was the best five minutes of your day?',
    'Name a colour you saw today and where you noticed it.',
    'Give today a movie title. What would its opening shot be?',
    'If you could send me one smell from your day, what would it be?',
    'What is the smallest thing you’re looking forward to tomorrow?',
    'Tell me about a tiny win you haven’t mentioned yet.',
    'What is something people say where you live that makes you laugh?',
    'What should we put on an imaginary menu for a late-night café?',
    'What would you call a radio show about your morning?',
    'What song would you put over a video of your walk home?',
    'Which ordinary object in your day deserves its own award?',
    'Describe your ideal lazy breakfast without naming the food.',
    'What was your most unexpected thought today?',
    'Pick a made-up weather forecast for your mood.',
    'What is a word you like for the way it sounds?',
    'What would be a fun five-minute tradition for our calls?',
    'Design one little room in an imaginary house we can both visit.',
    'You can teleport a dessert to me. What’s in the box?',
    'Describe a spot in your town without telling me the name.',
    'What’s your favourite midnight snack, real or invented?',
    'If your alarm had to play a sound from nature, which one?',
    'What would the first line of a postcard from your future self say?',
    'What silly thing can always improve your mood?',
    'What should we name a tiny plant we both look after in our imagination?',
    'What is one thing you’d love to learn just for fun?',
    'Give me a tiny tour of an imaginary city in three words.',
    'What would you pack for a picnic on the moon?'
  ];

  const OPENERS = [
    'The last train stopped at a station that wasn’t on the map.',
    'Our little café only opened when it rained.',
    'The moon called and asked for a favour.',
    'A penguin turned up at the door with a takeaway order.',
    'The map on the back of the receipt led to a second sky.',
    'The suitcase was full of warm sand and one tiny flag.',
    'Someone had put wheels on the library.',
    'The quietest person in town won the shouting contest.',
    'An old phone picked up a call from tomorrow.',
    'A flock of paper cranes carried off the washing line.',
    'The bakery had invented a bun that gave terrible advice.',
    'By sunset the village had traded mountains with another town.',
    'The elevator had a button labelled “Earlier”.',
    'A tiny voice in the teapot asked us to turn down the heat.',
    'A letter arrived addressed to the person we might become.',
    'The arcade’s prize machine handed us a tiny cloud.',
    'There was one extra chair at the orchestra rehearsal.',
    'The street lights changed colour as the dog walked past.',
    'A shop sold dreams in jars, with no labels.',
    'On Mondays the local bookshop was under the sea.'
  ];

  const TWISTS = [
    'Include a very bad disguise.', 'Something turns out to be edible.',
    'Bring in a character who only whispers.', 'Someone has the wrong key.',
    'A word is taken very literally.', 'A tiny celebration begins.',
    'The next thing anyone hears is music.', 'Include a questionable souvenir.',
    'Add something that used to belong to a giant.', 'Someone owes a bird an apology.',
    'There’s a clue in a grocery list.', 'Include a sudden colour change.',
    'A message arrives with only three words.', 'Someone is absurdly proud of a hat.',
    'A very small promise saves the day.', 'Someone misunderstands a recipe.',
    'Include an upside-down sign.', 'One character has a delightful secret hobby.',
    'A stranger remembers what everyone else forgot.', 'Add a thing that refuses to make a sound.'
  ];

  const POSTCARD_LIMIT = 240;
  const LINE_LIMIT = 140;

  function isDuo(gameType) { return gameType === 'postcards' || gameType === 'storyRelay'; }

  function buildPrompt(gameType, code) {
    if (gameType === 'postcards') return { question: window.Deck.one('postcards', POSTCARDS, code) };
    return {
      opening: window.Deck.one('relayOpeners', OPENERS, code),
      twist: window.Deck.one('relayTwists', TWISTS, code)
    };
  }

  function slot(data, id) {
    try { return JSON.parse(data.choices?.[id]) || {}; } catch (e) { return {}; }
  }

  function toolbar(app, label) {
    if (!app.isHost) return '';
    return `<div class="gv-host"><button type="button" class="btn-secondary" data-duo-next>${label}</button>` +
      '<button type="button" class="btn-secondary" data-duo-lobby>Change game</button></div>';
  }

  function entry(label, limit, submit) {
    return `<form class="duo-form gv-stack" id="duo-form">
      <label for="duo-text">${label}</label>
      <textarea class="input-field duo-text" id="duo-text" rows="3" maxlength="${limit}" placeholder="A sentence or two is plenty." required></textarea>
      <button class="btn-primary" type="submit">${submit}</button>
      <button class="btn-secondary duo-pass" type="button" data-duo-pass>Pass this turn</button>
    </form>`;
  }

  function postcards(app, data, me, partner) {
    const sent = p => slot(data, p.id);
    const done = p => sent(p).pass === true || typeof sent(p).text === 'string';
    const revealed = done(me) && done(partner);
    let html = `<h2 class="gv-q">${esc(data.current_prompt.question)}</h2>`;
    if (revealed) {
      html += '<div class="gv-reveal duo-reveal">' + data.players.map(p =>
        `<div class="gv-reveal-card"><div class="gv-reveal-name">${window.Avatars.html(p.emoji)} ${esc(p.name)}</div>
        <p class="gv-reveal-val">${sent(p).pass ? 'Passed this time' : esc(sent(p).text)}</p></div>`
      ).join('') + '</div>';
    } else {
      html += `<p class="gv-note gv-center">${done(partner) ? `${esc(partner.name)} is ready.` : 'Both postcards open when you’re both ready.'}</p>`;
      if (done(me)) {
        html += `<div class="gv-locked"><h3>${sent(me).pass ? 'You passed this turn' : 'Postcard sent'}</h3><p class="gv-note">Waiting for ${esc(partner.name)}…</p></div>`;
      } else {
        html += entry('Your postcard', POSTCARD_LIMIT, 'Send postcard');
      }
    }
    return {
      html: html + toolbar(app, revealed ? 'Next postcard' : 'Skip prompt'),
      send: text => app.submitChoice(JSON.stringify(text === null ? { pass: true } : { text }))
    };
  }

  function relay(app, data) {
    const first = (data.round - 1) % 2;
    const writers = [data.players[first], data.players[1 - first]];
    const byWriter = writers.map(p => {
      const lines = slot(data, p.id).lines;
      return Array.isArray(lines) ? lines.slice(0, 2) : [];
    });
    const lines = [];
    for (let i = 0; i < 4; i++) {
      const text = byWriter[i % 2][Math.floor(i / 2)];
      if (text === undefined) break;
      lines.push(text);
    }
    const done = lines.length === 4;
    const iWrite = !done && writers[lines.length % 2].id === app.myUid;
    const { opening, twist } = data.current_prompt;
    let html = `<h2 class="gv-q">${esc(opening)}</h2><p class="gv-note gv-center">Take turns adding one line. Two lines each, any ending you like.</p>`;
    if (lines.length) {
      html += '<ol class="duo-lines">' + lines.map((line, i) =>
        `<li><strong>${esc(writers[i % 2].name)}</strong><span>${line === null ? 'Passed' : esc(line)}</span></li>`
      ).join('') + '</ol>';
    }
    if (lines.length === 2 || lines.length === 3) {
      html += `<p class="duo-twist"><strong>Plot twist:</strong> ${esc(twist)}</p>`;
    }
    if (done) html += '<h3 class="gv-center">That’s a story!</h3>';
    else if (iWrite) html += entry(`Your line · ${lines.length + 1} of 4`, LINE_LIMIT, 'Add line');
    else html += `<p class="gv-note gv-center">Waiting for ${esc(writers[lines.length % 2].name)}’s line…</p>`;
    return {
      html: html + toolbar(app, done ? 'New story' : 'Skip story'),
      send: text => app.submitChoice(JSON.stringify({ lines: [...byWriter[lines.length % 2], text] }))
    };
  }

  function render(app, container) {
    const data = app.roomData;
    const me = data.players.find(p => p.id === app.myUid);
    const partner = data.players.find(p => p.id !== app.myUid);
    if (!me || !partner) return;
    const isPostcards = data.game_type === 'postcards';
    const view = isPostcards ? postcards(app, data, me, partner) : relay(app, data);
    container.innerHTML = `<div class="glass-card animate-fade gv duo" data-turn="${data.turn_token}">
      <div class="gv-top"><span class="badge-pill">${isPostcards ? '✉️ Postcards' : '📖 Story Relay'}</span>
        <span class="badge-pill">Round ${data.round}</span></div>${view.html}</div>`;
    container.querySelector('[data-duo-next]')?.addEventListener('click', () => app.hostNextRound());
    container.querySelector('[data-duo-lobby]')?.addEventListener('click', () => app.hostReturnToLobby());
    const form = container.querySelector('#duo-form');
    if (!form) return;
    const input = form.querySelector('textarea');
    const send = async text => {
      if (form.dataset.sending || app.roomData?.turn_token !== data.turn_token) return;
      form.dataset.sending = 'true';
      const buttons = [...form.querySelectorAll('button')];
      buttons.forEach(b => { b.disabled = true; });
      try { await view.send(text); }
      finally {
        delete form.dataset.sending;
        buttons.forEach(b => { b.disabled = false; });
      }
    };
    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = input.value.trim();
      if (text) send(text);
      else app.showMessage('Write a little something or pass this turn.');
    });
    form.querySelector('[data-duo-pass]').addEventListener('click', () => send(null));
  }

  window.DuoGames = { isDuo, buildPrompt, render };
})();
