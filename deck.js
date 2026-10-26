/* ═══════════════════════════════════════════════════════════════════
   DuoVibe deck engine

   Two jobs:

   1. RANDOMISE PER ROOM. The old picker shuffled with Math.random, so
      two different rooms could open on the same question. Decks are now
      ordered from a seed derived from the room code, so every room is a
      different sequence — and every round within it keeps moving.

   2. REMEMBER WHAT YOU HAVE SEEN. A rolling history per category is
      kept in localStorage. Anything you saw recently is pushed to the
      back of the deck, so opening a brand new room does not hand you
      the same three questions you just answered.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORE = 'duovibe_deck_v2';
  const SEEN_LIMIT = 80;
  const KEEP_TAIL = 15;   /* items held back when a full pass wraps */

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }
  }
  function save(d) {
    try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {}
  }

  /* FNV-1a — small, stable, good enough to scatter a deck. */
  function hash(str) {
    let h = 2166136261;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* mulberry32 — deterministic PRNG, same seed always gives the same run. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleWith(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  const Deck = {
    hash: hash,
    rng: rng,

    /* Roll a full ordering for a category.
       seed      — usually the room code, so every room differs
       salt      — extra entropy (round number, game type)
       avoidSeen — push recently served items to the back                */
    order(cat, length, seed, salt, avoidSeen) {
      const rand = rng(hash(cat + '|' + (seed || '') + '|' + (salt || '') + '|' + Date.now()));
      let idx = [];
      for (let i = 0; i < length; i++) idx.push(i);
      shuffleWith(idx, rand);

      if (!avoidSeen) return idx;

      const db = load();
      /* Remember how big this bank is, so the seen cap can never evict an
         item the player has not met yet. */
      db.size = db.size || {};
      if (db.size[cat] !== length) { db.size[cat] = length; save(db); }

      const seen = (db.seen && db.seen[cat]) || [];
      if (!seen.length) return idx;

      let fresh = idx.filter(i => seen.indexOf(i) === -1);
      let stale = idx.filter(i => seen.indexOf(i) !== -1);

      /* The bank has been served end to end: start a new pass, but hold
         back the last few rounds so the wrap is not an instant repeat. */
      if (!fresh.length) {
        const keep = seen.slice(-KEEP_TAIL);
        fresh = idx.filter(i => keep.indexOf(i) === -1);
        stale = idx.filter(i => keep.indexOf(i) !== -1);
      }
      return fresh.concat(stale);
    },

    /* Remember what was just served. */
    markSeen(cat, indices) {
      const db = load();
      db.seen = db.seen || {};
      const list = db.seen[cat] || [];
      (Array.isArray(indices) ? indices : [indices]).forEach(i => {
        const at = list.indexOf(i);
        if (at !== -1) list.splice(at, 1);
        list.push(i);
      });
      const bank = (db.size && db.size[cat]) || 0;
      const cap = Math.max(SEEN_LIMIT, bank);
      while (list.length > cap) list.shift();
      db.seen[cat] = list;
      save(db);
    },

    seenCount(cat) {
      const db = load();
      return ((db.seen && db.seen[cat]) || []).length;
    },

    /* Pick `count` distinct items from a list, avoiding recent ones.
       Returns the items, not indices. */
    pick(cat, list, count, seed, salt) {
      if (!list || !list.length) return [];
      const wanted = Math.min(count, list.length);
      const idx = this.order(cat, list.length, seed, salt, true).slice(0, wanted);
      this.markSeen(cat, idx);
      return idx.map(i => list[i]);
    },

    /* One item. */
    one(cat, list, seed, salt) {
      const out = this.pick(cat, list, 1, seed, salt);
      return out.length ? out[0] : null;
    },

    reset(cat) {
      const db = load();
      if (cat) { db.seen = db.seen || {}; delete db.seen[cat]; }
      else db.seen = {};
      save(db);
    },

    stats() {
      const db = load();
      return db.seen || {};
    }
  };

  window.Deck = Deck;
})();
