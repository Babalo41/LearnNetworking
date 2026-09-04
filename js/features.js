/* features.js — small pure helpers shared by the UI: search, difficulty tags,
   read-time estimates, and per-track "last studied" dates. Kept dependency-free
   (only touches card objects and LN.db.data) so they're unit-testable headlessly,
   the same way js/core.js and js/net.js are. */
(function () {
  "use strict";

  const stripHtml = s => String(s || "").replace(/<[^>]+>/g, " ");

  /** Flattened, lower-cased searchable text for one card: title, why, body, pitfalls. */
  function cardText(card) {
    const parts = [
      card.title || "",
      stripHtml(card.why || ""),
      stripHtml(card.body || ""),
      (card.pitfalls || []).map(stripHtml).join(" ")
    ];
    return parts.join(" ").toLowerCase();
  }

  /** Does this card match a free-text query? Every whitespace-separated term
      must appear somewhere in the card's text (AND semantics, substring match). */
  function matchCard(card, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    const terms = q.split(/\s+/).filter(Boolean);
    const text = cardText(card);
    return terms.every(t => text.includes(t));
  }

  /** A simple, deterministic difficulty heuristic based on how deep a card sits
      in its prerequisite chain — no per-card authoring required. */
  function difficultyOf(card) {
    const n = (card.prereqs || []).length;
    if (n === 0) return "starter";
    if (n <= 2) return "core";
    return "advanced";
  }

  /** Rough reading time in whole minutes, at ~200 words/minute, floor 1. */
  function estReadMinutes(card) {
    const words = stripHtml(card.why || "").split(/\s+/).filter(Boolean).length
      + stripHtml(card.body || "").split(/\s+/).filter(Boolean).length
      + (card.pitfalls || []).reduce((a, p) => a + stripHtml(p).split(/\s+/).filter(Boolean).length, 0);
    return Math.max(1, Math.round(words / 200));
  }

  /** Most recent 'seen' timestamp among a track's cards, or null if none read yet. */
  function trackLastStudied(track) {
    const seen = LN.db.data.seen;
    let latest = null;
    track.cards.forEach(c => {
      const t = seen[c.id];
      if (t && (!latest || t > latest)) latest = t;
    });
    return latest;
  }

  /** Relative "x ago" phrasing for a timestamp, coarse (good enough for a study app). */
  function timeAgo(ts) {
    if (!ts) return "never";
    const s = Math.max(0, Date.now() - ts) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    const d = Math.floor(s / 86400);
    return d === 1 ? "yesterday" : d + "d ago";
  }

  LN.util = { cardText, matchCard, difficultyOf, estReadMinutes, trackLastStudied, timeAgo };
})();
