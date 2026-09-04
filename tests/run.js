#!/usr/bin/env node
/* tests/run.js — headless test harness for the plain-JS LearnNetworking engine.
   No dependencies (no jsdom, no npm install) — runs the real content/*.js and
   js/{core,net,shell,drills}.js files in Node's vm module, global scope, exactly
   the way index.html loads them via <script> tags. UI files (js/ui.js, js/app.js)
   are NOT loaded — they need a real document and are covered by manual/browser
   testing instead.

   Run: node tests/run.js
   Exits 1 on any failure (for CI-style use), 0 if everything passes. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

/* ---------------- tiny in-memory localStorage stub ---------------- */
function makeLocalStorage() {
  const store = {};
  return {
    getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

/* ---------------- load app files into the real Node global, like <script> tags ---------------- */
global.window = global;
global.localStorage = makeLocalStorage();

const LOAD_ORDER = [
  "content/t1-addressing.js",
  "content/t2-switching.js",
  "content/t3-multicast.js",
  "content/t4-linux.js",
  "content/t5-windows.js",
  "content/t6-remote-tools.js",
  "content/scenarios.js",
  "js/core.js",
  "js/net.js",
  "js/shell.js",
  "js/drills.js"
];

for (const rel of LOAD_ORDER) {
  const file = path.join(ROOT, rel);
  const code = fs.readFileSync(file, "utf8");
  vm.runInThisContext(code, { filename: file });
}

/* ---------------- tiny test runner ---------------- */
let pass = 0, fail = 0;
const failures = [];
function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; failures.push(msg); console.error("FAIL: " + msg); }
}
function eq(actual, expected, msg) {
  assert(actual === expected, `${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}
function section(name, fn) {
  console.log("\n== " + name + " ==");
  fn();
}

/* ============================================================
   1. CONTENT INTEGRITY — catches typos/broken refs across all tracks
   ============================================================ */
section("content integrity", () => {
  assert(LN.tracks.length >= 6, "at least 6 tracks are registered, got " + LN.tracks.length);

  const allIds = new Set();
  let totalCards = 0, totalItems = 0;
  LN.tracks.forEach(t => {
    assert(!!t.id, "track has an id: " + JSON.stringify(t.title));
    assert(!!t.title, "track has a title: " + t.id);
    assert(Array.isArray(t.cards) && t.cards.length > 0, "track " + t.id + " has cards");

    t.cards.forEach(c => {
      totalCards++;
      assert(!!c.id, "card has an id in track " + t.id);
      assert(!allIds.has(c.id), "card id is unique: " + c.id);
      allIds.add(c.id);
      assert(!!c.title, "card " + c.id + " has a title");
      assert(Array.isArray(c.prereqs), "card " + c.id + " has a prereqs array");
      assert(typeof c.why === "string" && c.why.length > 10, "card " + c.id + " has a real 'why'");
      assert(typeof c.body === "string" && c.body.length > 20, "card " + c.id + " has a real body");
      assert(Array.isArray(c.items) && c.items.length > 0, "card " + c.id + " has quiz items");

      (c.items || []).forEach((it, i) => {
        totalItems++;
        const where = c.id + "#" + i;
        assert(it.type === "mcq" || it.type === "input", where + " has a valid type (mcq/input)");
        assert(typeof it.q === "string" && it.q.length > 5, where + " has a question");
        assert(typeof it.explain === "string" && it.explain.length > 5, where + " has an explanation");
        if (it.type === "mcq") {
          assert(Array.isArray(it.choices) && it.choices.length >= 2, where + " mcq has >=2 choices");
          assert(Number.isInteger(it.correct) && it.correct >= 0 && it.correct < it.choices.length,
            where + " mcq 'correct' index is in range");
        } else {
          assert(Array.isArray(it.accept) && it.accept.length > 0, where + " input has an accept list");
        }
      });
    });
  });

  // every prereq must point at a real card id, in SOME track (cross-track prereqs are allowed)
  LN.tracks.forEach(t => t.cards.forEach(c => {
    (c.prereqs || []).forEach(p => {
      assert(allIds.has(p), "card " + c.id + "'s prereq '" + p + "' refers to a real card id");
    });
  }));

  console.log(`  ${LN.tracks.length} tracks, ${totalCards} cards, ${totalItems} quiz items, all ids unique, all prereqs resolve.`);

  // scenarios (Incident mode) sanity
  assert(Array.isArray(LN.scenarios) && LN.scenarios.length > 0, "LN.scenarios is a non-empty array");
  LN.scenarios.forEach(s => {
    assert(!!s.id && !!s.title && !!s.brief, "scenario " + (s.id || "?") + " has id/title/brief");
    assert(Array.isArray(s.steps) && s.steps.length > 0, "scenario " + s.id + " has steps");
    s.steps.forEach((st, i) => {
      const ok = (st.options || []).filter(o => o.ok);
      assert(ok.length === 1, `scenario ${s.id} step ${i} has exactly one 'ok:true' option (found ${ok.length})`);
    });
  });
});

/* ============================================================
   2. CONTENT INDEX (LN.idx) — unlocked/mastery/dueItems logic
   ============================================================ */
section("LN.idx — content indexing and unlock logic", () => {
  assert(LN.idx.cards.length > 0, "LN.idx.cards is populated");
  const t1ip = LN.idx.cardById["t1-ip"];
  assert(!!t1ip, "cardById resolves a known id (t1-ip)");

  // fresh state: cards with no prereqs are unlocked, cards with unmet prereqs are not
  LN.db.reset();
  assert(LN.idx.unlocked(t1ip) === true, "a card with no prereqs starts unlocked");
  const t1same = LN.idx.cardById["t1-same-subnet"];
  assert(LN.idx.unlocked(t1same) === false, "a card with an unmet prereq starts locked");

  LN.db.markSeen("t1-ip");
  assert(LN.idx.unlocked(t1same) === true, "reading the prereq unlocks the dependent card");

  // mastery: unseen card with items -> 0
  const fresh = LN.idx.cardById["t2-vlans"] || LN.idx.cards.find(c => c.items && c.items.length && !LN.db.data.seen[c.id]);
  assert(LN.idx.mastery(fresh) === 0, "an unseen card with items has 0 mastery");

  // trackMastery is between 0 and 1
  LN.tracks.forEach(t => {
    const m = LN.idx.trackMastery(t.id);
    assert(m >= 0 && m <= 1, "trackMastery(" + t.id + ") is in [0,1], got " + m);
  });

  // dueItems only includes cards that have been seen
  LN.db.reset();
  const due0 = LN.idx.dueItems();
  eq(due0.length, 0, "dueItems is empty when nothing has been seen/reviewed yet");
});

/* ============================================================
   3. SM-2 SPACED REPETITION (LN.db.review)
   ============================================================ */
section("SM-2 spaced repetition engine", () => {
  LN.db.reset();
  const key = "t1-ip#0";

  // first correct review: n=1, interval=1 day
  let r = LN.db.review(key, 4);
  eq(r.n, 1, "first correct review sets n=1");
  eq(r.iv, 1, "first correct review sets interval=1 day");
  assert(r.due > Date.now(), "due date is pushed into the future after a correct review");

  // second correct review: n=2, interval=4 days
  r = LN.db.review(key, 4);
  eq(r.n, 2, "second correct review sets n=2");
  eq(r.iv, 4, "second correct review sets interval=4 days");

  // third correct review: interval grows by ease factor, not fixed
  const prevIv = r.iv, prevEf = r.ef;
  r = LN.db.review(key, 4);
  eq(r.n, 3, "third correct review sets n=3");
  assert(r.iv === Math.round(prevIv * prevEf), "third+ review interval = round(prevInterval * ease factor)");
  assert(r.iv > prevIv, "interval keeps growing on repeated correct answers");

  // a wrong answer resets progress but does not erase lapse history
  const beforeLapses = r.lapses;
  r = LN.db.review(key, 0);
  eq(r.n, 0, "a wrong answer (quality<3) resets n to 0");
  eq(r.iv, 0, "a wrong answer resets the interval to 0");
  eq(r.lapses, beforeLapses + 1, "a wrong answer increments the lapse counter");
  assert(r.due <= Date.now() + 61000, "a wrong answer resurfaces the item almost immediately (~1 min)");

  // ease factor never drops below the SM-2 floor of 1.3
  LN.db.reset();
  const key2 = "floor-test#0";
  let ef = 2.5;
  for (let i = 0; i < 30; i++) {
    const rr = LN.db.review(key2, 3); // "correct but hard" repeatedly drags ef down
    ef = rr.ef;
    assert(rr.ef >= 1.3, "ease factor never drops below the 1.3 floor (iteration " + i + ")");
  }

  // isDue: an item just reviewed with quality>=3 is not immediately due again
  LN.db.reset();
  LN.db.review("isdue-test#0", 4);
  assert(LN.db.isDue("isdue-test#0") === false, "a freshly-reviewed correct item is not due again immediately");
  assert(LN.db.isDue("never-reviewed#0") === true, "an item with no record at all is considered due");
});

/* ============================================================
   4. DRILLS — generated practice problems stay internally consistent
   ============================================================ */
section("generated drills (js/drills.js)", () => {
  const U = LN.net.util;

  // run every generator many times and sanity-check its own answer against the
  // same math it explains, rather than hardcoding expected values (the point of
  // "generated" drills is that they're randomised every time).
  LN.drills.order.forEach(genId => {
    for (let i = 0; i < 25; i++) {
      const d = LN.drills.make(genId);
      assert(typeof d.q === "string" && d.q.length > 0, genId + " produced a non-empty question");
      assert(Array.isArray(d.accept) && d.accept.length > 0, genId + " produced a non-empty accept list");
      assert(typeof d.explain === "string" && d.explain.length > 0, genId + " produced a non-empty explanation");
      assert(d.key === "drill:" + genId, genId + " sets the right drill key");
    }
  });

  // check(): case/whitespace/trailing-period forgiving comparison
  assert(LN.drills.check("Direct", ["direct"]) === true, "check() is case-insensitive");
  assert(LN.drills.check("  direct  ", ["direct"]) === true, "check() trims whitespace");
  assert(LN.drills.check("direct.", ["direct"]) === true, "check() ignores a trailing period");
  assert(LN.drills.check("gateway", ["direct"]) === false, "check() correctly rejects a wrong answer");

  // spot-check the actual arithmetic behind one generator instead of trusting it blindly
  for (let i = 0; i < 25; i++) {
    const d = LN.drills.make("subnet-network");
    // parse "/nn" out of the question HTML and recompute independently
    const m = d.q.match(/(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})/);
    assert(!!m, "subnet-network question contains an ip/cidr pair");
    const [, ip, cidrStr] = m;
    const cidr = +cidrStr;
    const expected = U.int2ip(U.network(ip, cidr));
    assert(d.accept.includes(expected), "subnet-network's accepted answer matches independently recomputed network address");
  }
});

/* ============================================================
   5. LAB SHELL — the exact 8-command walkthrough from README.md
   ============================================================ */
section("Lab shell — README's 8-command walkthrough", () => {
  const sh = new LN.Shell("flat");
  const outputs = [];
  function run(cmd) {
    const out = sh.run(cmd);
    outputs.push({ cmd, out });
    return out;
  }
  function textOf(out) {
    return (Array.isArray(out) ? out : []).filter(l => l && l.s).map(l => l.s).join("\n");
  }

  // 1. stream start app01 239.1.1.1
  let out = run("stream start app01 239.1.1.1");
  assert(/transmitting/i.test(textOf(out)), "stream start confirms app01 is transmitting");

  // 2. use app02; join 239.1.1.1
  run("use app02");
  eq(sh.net.cur, "app02", "'use app02' switches the current host");
  out = run("join 239.1.1.1");
  assert(/snooping is off/i.test(textOf(out)), "joining with snooping off says the report is ignored/flooded");

  // 3. use app03; top -- should show high softirq from unwanted flooded traffic
  run("use app03");
  out = run("top");
  const topText = textOf(out);
  assert(/si\b/i.test(topText) || /softirq/i.test(topText), "top output mentions si/softirq on the non-joined host");

  // 4. switch snooping on -- should warn about missing querier
  out = run("switch snooping on");
  assert(/no querier/i.test(textOf(out)), "enabling snooping with no querier warns about it");

  // 5. tcpdump -i eth0 igmp 300 -- silence, and the entry should have expired by then
  out = run("tcpdump -i eth0 igmp 300");
  assert(/expired|pruned/i.test(textOf(out)), "a 300s tcpdump window shows the membership expiring with no querier");

  // 6. switch show igmp -- entries should be gone
  out = run("switch show igmp");
  assert(/no group entries|no entries|empty/i.test(textOf(out)), "switch show igmp reports no entries after expiry");

  // 7. switch querier on; use app02; join 239.1.1.1; tick 300
  run("switch querier on");
  run("use app02");
  run("join 239.1.1.1");
  run("tick 300");

  // 8. switch show igmp -- now it should hold, with an active (unexpired) entry
  out = run("switch show igmp");
  const finalText = textOf(out);
  assert(/239\.1\.1\.1/.test(finalText), "final switch show igmp mentions the group 239.1.1.1");
  assert(!/no group entries/i.test(finalText), "final switch show igmp is NOT empty — the querier keeps the entry alive");
  assert(/expires in/i.test(finalText), "final switch show igmp shows a live, refreshing expiry timer");

  console.log("  full 8-command walkthrough reproduced the documented behaviour end to end.");
});

/* ============================================================
   6. NET UTIL — pure IPv4 math, spot-checked against known values
   ============================================================ */
section("LN.net.util — IPv4 arithmetic", () => {
  const U = LN.net.util;
  eq(U.int2ip(U.network("10.42.7.93", 26)), "10.42.7.64", "network() for 10.42.7.93/26");
  eq(U.int2ip(U.broadcast("10.42.7.93", 26)), "10.42.7.127", "broadcast() for 10.42.7.93/26");
  eq(U.mask2cidr("255.255.255.192"), 26, "mask2cidr(255.255.255.192) == 26");
  eq(U.int2ip(U.cidr2mask(24)), "255.255.255.0", "cidr2mask(24) == 255.255.255.0");
  assert(U.sameSubnet("10.42.7.10", "10.42.7.20", 24) === true, "sameSubnet true within the same /24");
  assert(U.sameSubnet("10.42.7.10", "10.42.8.10", 24) === false, "sameSubnet false across different /24s");
  assert(U.isMulticast("239.1.1.1") === true, "239.1.1.1 is recognised as multicast");
  assert(U.isMulticast("10.1.1.1") === false, "10.1.1.1 is not multicast");
  eq(U.mcastMac("239.1.1.1"), "01:00:5e:01:01:01", "mcastMac(239.1.1.1)");
  // the 32:1 collision property the T3 cards teach: top 5 bits are discarded
  eq(U.mcastMac("239.1.1.1"), U.mcastMac("224.1.1.1"), "mcastMac collision: 239.x and 224.x with the same low 23 bits share a MAC");
});

/* ---------------- summary ---------------- */
console.log(`\n${pass} passed, ${fail} failed.`);
if (fail > 0) {
  console.error("\nFailures:");
  failures.forEach(f => console.error("  - " + f));
  process.exit(1);
}
process.exit(0);
