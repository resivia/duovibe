/* ═══════════════════════════════════════════════════════════════════
   DuoVibe icon set

   One visual language for all 14 games: 24×24 grid, 2px round strokes,
   currentColor so a card can tint them, no fills except where a shape
   needs weight. Drawn once here instead of shipping emoji, which look
   different on every phone and rendered as tofu boxes on some Android
   builds.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const P = {
    /* Two arrows pointing at each other — a choice between two things */
    wouldRather:
      '<path d="M3 8h11l-3-3M21 16H10l3 3"/>' +
      '<path d="M14 8h7M10 16H3" opacity=".45"/>',

    /* Comedy / tragedy masks — truth versus dare */
    truthOrDare:
      '<circle cx="9" cy="12" r="5.2"/>' +
      '<path d="M6.6 10.2h.01M11.4 10.2h.01" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M6.8 14.2c1.3 1.1 3.1 1.1 4.4 0"/>' +
      '<path d="M15.5 7.2a5.2 5.2 0 1 1 0 9.6" opacity=".5"/>',

    /* Two waves meeting as one */
    mindMeld:
      '<path d="M2 15c3 0 3-6 6-6s3 6 6 6 3-6 6-6"/>' +
      '<circle cx="12" cy="12" r="9.5" opacity=".25"/>',

    /* Signpost with two directions */
    percentage:
      '<path d="M4 9h13l3 3-3 3H4z"/>' +
      '<path d="M8 9V6h7M8 15v3h5" opacity=".5"/>',

    /* Ranked bars */
    blindRank:
      '<path d="M4 20V13M10 20V7M16 20V10M22 20V4" stroke-linecap="round"/>' +
      '<path d="M2 20h20" opacity=".35"/>',

    /* Lightning in a speech bubble — quick votes */
    flashPoll:
      '<path d="M20 4H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3v3l4-3h9a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"/>' +
      '<path d="M12.5 7.5 10 12h2.6l-1 4.2 3.4-5h-2.4z"/>',

    /* Storm cloud */
    wordStorm:
      '<path d="M7.5 17a3.6 3.6 0 0 1-.3-7.2A5 5 0 0 1 17 9.6a3.7 3.7 0 0 1 .4 7.4"/>' +
      '<path d="M9.5 20.5 8 22M13 20.5 11.5 22M16.5 20.5 15 22" stroke-linecap="round" opacity=".55"/>',

    /* Incognito — hat and glasses */
    spyInTheCrowd:
      '<path d="M3.5 10 5 5h14l1.5 5"/>' +
      '<path d="M3.5 10h17"/>' +
      '<circle cx="8" cy="14.5" r="2.6"/><circle cx="16" cy="14.5" r="2.6"/>' +
      '<path d="M10.6 14.5h2.8"/>',

    /* Locked card */
    secretGuess:
      '<rect x="4" y="10" width="16" height="10" rx="2.5"/>' +
      '<path d="M8 10V7a4 4 0 0 1 8 0v3"/>' +
      '<circle cx="12" cy="15" r="1.4"/>',

    /* Cake with one candle */
    ageGuess:
      '<path d="M4 20h16v-5a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3z"/>' +
      '<path d="M12 12V9"/>' +
      '<path d="M12 6.5c1 1 1.6.2 1.6-.8 0-.9-1.6-2.4-1.6-2.4s-1.6 1.5-1.6 2.4c0 1 .6 1.8 1.6.8z" fill="currentColor" stroke="none"/>' +
      '<path d="M4 16h16" opacity=".4"/>',

    /* Hash + question — a hidden number */
    numberGuess:
      '<path d="M9 3 7 21M17 3l-2 18M3.5 9h17M3 15h17"/>' +
      '<circle cx="12" cy="12" r="0.1" opacity="0"/>',

    /* Two truths, one lie — three lines, one crossed */
    twoTruths:
      '<path d="M4 7h11M4 12h16M4 17h9"/>' +
      '<path d="M16.5 5.5 21 10M21 5.5 16.5 10" opacity=".7"/>',

    /* Emoji-ish face with a raised brow */
    emojiClue:
      '<circle cx="12" cy="12" r="9"/>' +
      '<path d="M8.5 9.8h.01M15.5 9.2h.01" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M8.5 15.5c2 1.6 5 1.6 7 0"/>',

    /* Stopwatch */
    speedRound:
      '<circle cx="12" cy="13.5" r="7.5"/>' +
      '<path d="M12 13.5V9.8" stroke-linecap="round"/>' +
      '<path d="M10 2.5h4M12 2.5V6"/>' +
      '<path d="M18.5 8.5 20 7" stroke-linecap="round" opacity=".6"/>'
  };

  /* Trend extras used by the next batch of games. */
  const T = {
    hotSeat:
      '<path d="M6 20v-3.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V20"/>' +
      '<circle cx="12" cy="8" r="3.4"/>' +
      '<path d="M3 20v-2M21 20v-2" stroke-linecap="round" opacity=".45"/>',

    redFlag:
      '<path d="M6 21V4"/><path d="M6 5h9l-1.8 3.2L15 11.5H6z"/>' +
      '<circle cx="6" cy="4" r="1.1" fill="currentColor" stroke="none"/>',

    thisOrThat:
      '<circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5" opacity=".55"/>',

    mostLikely:
      '<circle cx="9" cy="8.5" r="3"/><circle cx="17" cy="9.5" r="2.4" opacity=".6"/>' +
      '<path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/>' +
      '<path d="M16 20c0-2.6 1.6-4 3.5-4s1.5 1 1.5 4" opacity=".5"/>',

    neverHave:
      '<circle cx="12" cy="12" r="9"/>' +
      '<path d="M6 6l12 12" stroke-linecap="round"/>' +
      '<path d="M12 12m-9 0a9 9 0 1 1 18 0" opacity=".25"/>',

    storyBuilder:
      '<path d="M4 5.5h7a1.5 1.5 0 0 1 1.5 1.5v12A2.5 2.5 0 0 0 10 16.5H4z"/>' +
      '<path d="M20 5.5h-7A1.5 1.5 0 0 0 11.5 7v12A2.5 2.5 0 0 1 14 16.5h6z"/>'
  };

  Object.assign(P, T);

  /* Game ids that do not match their icon key */
  P.nhie = P.neverHave;

  function svg(name, size) {
    const body = P[name];
    if (!body) return '';
    const s = size || 24;
    return '<svg class="dv-i" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* ── player avatars ────────────────────────────────────────────
     Every player gets a face. They can pick one, or keep the one we
     deal them from their name, so nobody shows up as a grey circle.  */
  const AVATARS = [
    '🦊','🐼','🐸','🐙','🦁','🐨','🐯','🦄',
    '🐵','🐧','🐳','🦋','🐝','🦉','🐺','🐢',
    '🌙','⭐','🔥','🌈','🍀','⚡','🌻','💎'
  ];

  function defaultAvatar(seed) {
    const s = String(seed || 'duovibe');
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return AVATARS[(h >>> 0) % AVATARS.length];
  }

  function avatarHtml(emoji, cls) {
    const e = emoji || '🙂';
    return '<span class="dv-av ' + (cls || '') + '" aria-hidden="true">' + e + '</span>';
  }

  window.Icons = { svg: svg, names: Object.keys(P) };
  window.Avatars = {
    set: AVATARS,
    fallback: defaultAvatar,
    html: avatarHtml,
    isValid: function (e) { return AVATARS.indexOf(e) !== -1; }
  };
})();
