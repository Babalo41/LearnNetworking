/* core.js — persistence, spaced repetition, content indexing */
(function () {
  "use strict";
  const KEY = "learnnetworking.v1";
  const DAY = 86400000;

  /* ---------------- storage ---------------- */
  const blank = () => ({
    version: 1,
    created: Date.now(),
    items: {},        // itemKey -> srs record
    scenarios: {},    // scenarioId -> {best, runs, lastRun}
    seen: {},         // cardId -> timestamp of last read
    lastCard: null,    // cardId of the most recently opened concept, for "continue"
    bookmarks: {},     // cardId -> true, user-starred cards
    settings: {         // user preferences, persisted like everything else
      freeNav: false,     // when true, every card is clickable regardless of prereqs
      theme: "dark"        // "dark" | "light"
    },
    log: { answered: 0, correct: 0, days: {} }
  });

  let data;
  try {
    data = JSON.parse(localStorage.getItem(KEY)) || blank();
  } catch (e) {
    data = blank();
  }
  for (const k of Object.keys(blank())) if (data[k] === undefined) data[k] = blank()[k];
  // shallow-merge nested defaults too, so an older save (missing a newer setting) still gets it
  for (const k of Object.keys(blank().settings)) if (data.settings[k] === undefined) data.settings[k] = blank().settings[k];

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.warn("save failed", e); }
  }

  /* ---------------- SM-2 spaced repetition ----------------
     quality: 0 = wrong, 3 = correct but hard, 4 = correct, 5 = easy   */
  function record(key) {
    if (!data.items[key]) data.items[key] = { ef: 2.5, n: 0, iv: 0, due: 0, lapses: 0, seen: 0 };
    return data.items[key];
  }

  function review(key, quality) {
    const r = record(key);
    r.seen++;
    if (quality < 3) {
      r.n = 0; r.iv = 0; r.lapses++;
      r.due = Date.now() + 6e4;            // resurface in ~1 minute this session
    } else {
      r.n++;
      if (r.n === 1) r.iv = 1;
      else if (r.n === 2) r.iv = 4;
      else r.iv = Math.round(r.iv * r.ef);
      r.ef = Math.max(1.3, r.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      r.due = Date.now() + r.iv * DAY;
    }
    // daily log
    const d = new Date().toISOString().slice(0, 10);
    data.log.days[d] = (data.log.days[d] || 0) + 1;
    data.log.answered++;
    if (quality >= 3) data.log.correct++;
    save();
    return r;
  }

  const isDue = key => {
    const r = data.items[key];
    return !r || r.due <= Date.now();
  };

  /* ---------------- content index ---------------- */
  const cards = [];
  const cardById = {};
  (LN.tracks || []).forEach(t => t.cards.forEach(c => {
    c.track = t.id; c.trackTitle = t.title;
    cards.push(c); cardById[c.id] = c;
  }));

  const itemKey = (cardId, i) => cardId + "#" + i;

  // every item across all cards, flattened
  const allItems = [];
  cards.forEach(c => (c.items || []).forEach((it, i) =>
    allItems.push({ item: it, card: c, key: itemKey(c.id, i) })));

  /** A card is unlocked when every prerequisite has been read —
      or unconditionally, if the user has switched on free navigation. */
  function unlocked(card) {
    if (data.settings && data.settings.freeNav) return true;
    return (card.prereqs || []).every(p => data.seen[p]);
  }

  /** True only when a card's real prerequisites are met — ignores the
      free-nav override. Used by the UI to still flag "read this first"
      even when free navigation lets you click through anyway. */
  function prereqsMet(card) {
    return (card.prereqs || []).every(p => data.seen[p]);
  }

  /** 0..1 — how well the items of this card are retained. */
  function mastery(card) {
    const its = card.items || [];
    if (!its.length) return data.seen[card.id] ? 1 : 0;
    let sum = 0;
    its.forEach((_, i) => {
      const r = data.items[itemKey(card.id, i)];
      if (r) sum += Math.min(1, r.n / 3);
    });
    return sum / its.length;
  }

  function trackMastery(trackId) {
    const cs = cards.filter(c => c.track === trackId);
    if (!cs.length) return 0;
    return cs.reduce((a, c) => a + mastery(c), 0) / cs.length;
  }

  /** Items due for review, hardest-overdue first. Unread cards excluded. */
  function dueItems() {
    return allItems
      .filter(x => data.seen[x.card.id] && isDue(x.key))
      .sort((a, b) => {
        const ra = data.items[a.key], rb = data.items[b.key];
        return (ra ? ra.due : 0) - (rb ? rb.due : 0);
      });
  }

  function markSeen(cardId) { data.seen[cardId] = Date.now(); data.lastCard = cardId; save(); }

  function streak() {
    let n = 0;
    for (let i = 0; ; i++) {
      const d = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
      if (data.log.days[d]) n++;
      else if (i > 0) break;          // today may legitimately be empty
    }
    return n;
  }

  /* ---------------- reset undo (one-slot backup) ---------------- */
  const BACKUP_KEY = KEY + ".backup";
  function backupNow() {
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function hasBackup() {
    try { return !!localStorage.getItem(BACKUP_KEY); } catch (e) { return false; }
  }
  function restoreBackup() {
    let raw;
    try { raw = localStorage.getItem(BACKUP_KEY); } catch (e) { raw = null; }
    if (!raw) return false;
    try {
      data = JSON.parse(raw);
      for (const k of Object.keys(blank())) if (data[k] === undefined) data[k] = blank()[k];
      save();
      try { localStorage.removeItem(BACKUP_KEY); } catch (e) {}
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- import validation ----------------
     Checked BEFORE overwriting live data, so the UI can show a summary and
     let the user back out instead of silently clobbering their progress. */
  function validateImport(obj) {
    const errors = [];
    if (!obj || typeof obj !== "object") errors.push("not a JSON object");
    else {
      if (obj.items !== undefined && typeof obj.items !== "object") errors.push("'items' is not an object");
      if (obj.seen !== undefined && typeof obj.seen !== "object") errors.push("'seen' is not an object");
      if (obj.scenarios !== undefined && typeof obj.scenarios !== "object") errors.push("'scenarios' is not an object");
      if (obj.log !== undefined && typeof obj.log !== "object") errors.push("'log' is not an object");
    }
    if (errors.length) return { ok: false, errors, summary: null };
    const seenCount = obj.seen ? Object.keys(obj.seen).length : 0;
    const itemCount = obj.items ? Object.keys(obj.items).length : 0;
    const answered = obj.log && obj.log.answered || 0;
    const scenarioCount = obj.scenarios ? Object.keys(obj.scenarios).length : 0;
    return {
      ok: true, errors: [],
      summary: { seenCount, itemCount, answered, scenarioCount }
    };
  }

  LN.db = {
    get data() { return data; },
    save, review, isDue, record, markSeen,
    reset() { backupNow(); data = blank(); save(); },
    load(obj) { data = Object.assign(blank(), obj); save(); },
    backupNow, hasBackup, restoreBackup, validateImport
  };
  LN.idx = { cards, cardById, allItems, itemKey, unlocked, prereqsMet, mastery, trackMastery, dueItems, streak };
})();
