/* ui.js — views. Every mode renders into #main. */
(function () {
  "use strict";
  const M = () => document.getElementById("main");
  const h = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  /* ============================ LEARN ============================ */
  let learnState = { q: "", track: "all", bookmarkedOnly: false };

  function diffTagHtml(c) {
    const d = LN.util.difficultyOf(c);
    return `<span class="difftag ${d}">${d}</span>`;
  }

  function learn() {
    const m = M(); m.innerHTML = "";
    const w = h("div", "wrap");
    w.appendChild(h("h1", null, "Learn"));
    w.appendChild(h("p", "sub", "Read a concept, then practise it. Cards unlock as you read their prerequisites — the order is not arbitrary, each one is built on the last."));

    /* ---- toolbar: search, track filter, bookmarked-only, random, continue ---- */
    const toolbar = h("div", "learn-toolbar");
    const search = h("input", "searchbox");
    search.id = "learn-search";
    search.placeholder = "Search cards… ( / )";
    search.value = learnState.q;
    search.autocomplete = "off";
    search.oninput = () => { learnState.q = search.value; renderList(); };
    toolbar.appendChild(search);

    const trackSel = h("select", "trackfilter");
    trackSel.appendChild(h("option", null, "All tracks"));
    trackSel.children[0].value = "all";
    LN.tracks.forEach(t => {
      const o = h("option", null, esc(t.title));
      o.value = t.id;
      trackSel.appendChild(o);
    });
    trackSel.value = learnState.track;
    trackSel.onchange = () => { learnState.track = trackSel.value; renderList(); };
    toolbar.appendChild(trackSel);

    const bmLabel = h("label", "bmfilter");
    const bmCb = h("input"); bmCb.type = "checkbox"; bmCb.checked = learnState.bookmarkedOnly;
    bmCb.onchange = () => { learnState.bookmarkedOnly = bmCb.checked; renderList(); };
    bmLabel.appendChild(bmCb);
    bmLabel.appendChild(document.createTextNode(" ★ bookmarked only"));
    toolbar.appendChild(bmLabel);

    const randomBtn = h("button", "btn ghost", "🎲 Random card");
    randomBtn.onclick = () => {
      const open = LN.idx.cards.filter(c => LN.idx.unlocked(c));
      if (!open.length) return;
      LN.navigate("learn/" + open[Math.floor(Math.random() * open.length)].id);
    };
    toolbar.appendChild(randomBtn);

    if (LN.db.data.lastCard && LN.idx.cardById[LN.db.data.lastCard]) {
      const cont = h("button", "btn ghost", "▶ Continue: " + LN.idx.cardById[LN.db.data.lastCard].title);
      cont.onclick = () => LN.navigate("learn/" + LN.db.data.lastCard);
      toolbar.appendChild(cont);
    }
    w.appendChild(toolbar);

    const listHost = h("div");
    w.appendChild(listHost);
    m.appendChild(w);
    renderList();

    function renderList() {
      listHost.innerHTML = "";
      let anyVisible = false;
      LN.tracks.forEach(t => {
        if (learnState.track !== "all" && learnState.track !== t.id) return;
        const visibleCards = t.cards.filter(c =>
          LN.util.matchCard(c, learnState.q) &&
          (!learnState.bookmarkedOnly || LN.db.data.bookmarks[c.id]));
        if (!visibleCards.length) return;
        anyVisible = true;

        const sec = h("div", "track");
        const pct = Math.round(LN.idx.trackMastery(t.id) * 100);
        const hd = h("div", "track-h");
        hd.appendChild(h("h2", null, t.title));
        const lastStudied = LN.util.trackLastStudied(t);
        hd.appendChild(h("span", "pct", pct + "% retained · last studied " + LN.util.timeAgo(lastStudied)));
        sec.appendChild(hd);
        sec.appendChild(h("p", "sub", t.blurb));

        const list = h("div", "cardlist");
        visibleCards.forEach(c => {
          const open = LN.idx.unlocked(c);
          const metPrereqs = LN.idx.prereqsMet(c);
          const earlyAccess = open && !metPrereqs; // free-nav let us in ahead of the guided order
          const starred = !!LN.db.data.bookmarks[c.id];
          const tile = h("div", "cardtile" + (open ? "" : " locked") + (earlyAccess ? " pending" : ""));
          const star = h("span", "star" + (starred ? " on" : ""), starred ? "★" : "☆");
          star.title = starred ? "Remove bookmark" : "Bookmark this card";
          star.onclick = e => {
            e.stopPropagation();
            if (LN.db.data.bookmarks[c.id]) delete LN.db.data.bookmarks[c.id];
            else LN.db.data.bookmarks[c.id] = true;
            LN.db.save();
            renderList();
          };
          tile.innerHTML = `<div class="t">${esc(c.title)}${earlyAccess ? ' <span class="pendingtag">unlocked early</span>' : ""}</div>
            <div class="w">${open ? c.why.replace(/<[^>]+>/g, "").slice(0, 110) + "…"
              : "Locked — read: " + c.prereqs.map(p => LN.idx.cardById[p] ? LN.idx.cardById[p].title : p).join(", ")}</div>
            <div class="meta">${diffTagHtml(c)}<span class="readtime">${LN.util.estReadMinutes(c)} min read</span></div>
            <div class="bar"><i style="width:${Math.round(LN.idx.mastery(c) * 100)}%"></i></div>`;
          tile.appendChild(star);
          if (open) tile.onclick = () => LN.navigate("learn/" + c.id);
          list.appendChild(tile);
        });
        sec.appendChild(list);
        listHost.appendChild(sec);
      });
      if (!anyVisible) listHost.appendChild(h("div", "empty", "No cards match. Try a different search, track, or turn off the bookmarked-only filter."));
    }
  }

  function concept(id) {
    const c = LN.idx.cardById[id];
    LN.db.markSeen(id);
    const m = M(); m.innerHTML = "";
    const w = h("div", "wrap");
    const crumbRow = h("div", "crumbrow");
    const crumb = h("span", "crumb", "← back to Learn");
    crumb.onclick = () => LN.navigate("learn");
    crumbRow.appendChild(crumb);
    const track = LN.tracks.find(t => t.id === c.track);
    const posInTrack = track.cards.findIndex(x => x.id === c.id);
    crumbRow.appendChild(h("span", "crumbsep", "·"));
    crumbRow.appendChild(h("span", "crumbtrack", `${esc(track.title)} — card ${posInTrack + 1} of ${track.cards.length}`));
    w.appendChild(crumbRow);

    const box = h("div", "concept");
    const hdRow = h("div", "concept-hd");
    hdRow.appendChild(h("h1", null, c.title));
    const badges = h("div", "concept-badges");
    badges.innerHTML = diffTagHtml(c) + `<span class="readtime">${LN.util.estReadMinutes(c)} min read</span>`;
    const starred = !!LN.db.data.bookmarks[c.id];
    const star = h("span", "star bigstar" + (starred ? " on" : ""), starred ? "★" : "☆");
    star.title = starred ? "Remove bookmark" : "Bookmark this card";
    star.onclick = () => {
      if (LN.db.data.bookmarks[c.id]) delete LN.db.data.bookmarks[c.id];
      else LN.db.data.bookmarks[c.id] = true;
      LN.db.save();
      concept(id);
    };
    badges.appendChild(star);
    hdRow.appendChild(badges);
    box.appendChild(hdRow);
    box.appendChild(h("div", "why", "<b>Why this matters to you:</b> " + c.why));
    box.appendChild(h("div", null, c.body));
    (c.pitfalls || []).forEach(p => box.appendChild(h("div", "pitfall", "<b>Watch out:</b> " + p)));
    w.appendChild(box);

    const bar = h("div");
    const go = h("button", "btn", `Practise this card (${(c.items || []).length} questions)`);
    go.onclick = () => practice(c);
    bar.appendChild(go);

    const prevC = track.cards[posInTrack - 1];
    if (prevC) {
      const bp = h("button", "btn ghost", "← Prev: " + prevC.title);
      bp.style.marginLeft = "8px";
      bp.onclick = () => LN.navigate("learn/" + prevC.id);
      bar.appendChild(bp);
    }
    const nxt = nextCard(c);
    if (nxt) {
      const b2 = h("button", "btn ghost", "Next: " + nxt.title);
      b2.style.marginLeft = "8px";
      b2.onclick = () => LN.navigate("learn/" + nxt.id);
      bar.appendChild(b2);
    }
    w.appendChild(bar);
    m.appendChild(w);
    m.scrollTop = 0;
  }

  function nextCard(c) {
    const all = LN.idx.cards;
    const i = all.findIndex(x => x.id === c.id);
    return all[i + 1] || null;
  }

  /* practice = every item on one card, in order */
  function practice(card) {
    const queue = (card.items || []).map((it, i) => ({ item: it, key: LN.idx.itemKey(card.id, i) }));
    session(queue, "Practice · " + card.title, () => concept(card.id));
  }

  /* ============================ DRILL ============================ */
  let drillState = { length: "normal", bookmarkedOnly: false };

  function drill() {
    const due = LN.idx.dueItems();
    const m = M(); m.innerHTML = "";
    const w = h("div", "wrap");
    w.appendChild(h("h1", null, "Drill"));
    w.appendChild(h("p", "sub", "Spaced review, mixed with freshly generated problems so there is no answer key to memorise."));

    // due breakdown by track — helps you see where the backlog actually is
    const byTrack = {};
    due.forEach(d => { byTrack[d.card.track] = (byTrack[d.card.track] || 0) + 1; });
    if (due.length) {
      const bd = h("div", "panel");
      bd.appendChild(h("h4", null, "Due right now, by track"));
      const rows = h("div", "duebreak");
      LN.tracks.forEach(t => {
        const n = byTrack[t.id] || 0;
        if (!n) return;
        rows.appendChild(h("div", "duebreak-row", `<span>${esc(t.title)}</span><b>${n}</b>`));
      });
      bd.appendChild(rows);
      w.appendChild(bd);
    } else {
      w.appendChild(h("div", "empty", "Nothing due right now — a drill session will use freshly generated subnetting/multicast problems instead."));
    }

    const controls = h("div", "drill-controls");
    const lenSel = h("select");
    [["quick", "Quick (5 questions)"], ["normal", "Normal (6–12)"], ["long", "Long (20 questions)"]]
      .forEach(([v, l]) => { const o = h("option", null, l); o.value = v; lenSel.appendChild(o); });
    lenSel.value = drillState.length;
    lenSel.onchange = () => drillState.length = lenSel.value;
    controls.appendChild(lenSel);

    const bmLabel = h("label", "bmfilter");
    const bmCb = h("input"); bmCb.type = "checkbox"; bmCb.checked = drillState.bookmarkedOnly;
    bmCb.onchange = () => drillState.bookmarkedOnly = bmCb.checked;
    bmLabel.appendChild(bmCb);
    bmLabel.appendChild(document.createTextNode(" ★ bookmarked cards only"));
    controls.appendChild(bmLabel);
    w.appendChild(controls);

    const start = h("button", "btn", "Start drilling");
    start.style.marginTop = "14px";
    start.onclick = startDrill;
    w.appendChild(start);
    m.appendChild(w);
  }

  function startDrill() {
    let due = LN.idx.dueItems();
    if (drillState.bookmarkedOnly) due = due.filter(d => LN.db.data.bookmarks[d.card.id]);

    const targetLen = drillState.length === "quick" ? 5 : drillState.length === "long" ? 20 : null;
    const queue = [];
    due.slice(0, targetLen || 8).forEach(d => queue.push({ item: d.item, key: d.key, card: d.card }));

    if (!drillState.bookmarkedOnly) {
      // top up with generated drills so a session is always worth doing
      const want = targetLen || Math.max(6, Math.min(12, due.length + 4));
      while (queue.length < want) {
        const d = LN.drills.random();
        queue.push({ item: { type: "input", q: d.q, accept: d.accept, explain: d.explain }, key: d.key, gen: true });
      }
    } else if (targetLen) {
      while (queue.length < Math.min(targetLen, due.length)) break; // bookmarked-only: don't pad past what's actually due
    }
    if (!queue.length) {
      alert("No bookmarked cards are due for review yet. Star some cards in Learn, or turn off the bookmarked-only filter.");
      return;
    }
    queue.sort(() => Math.random() - 0.5);
    session(queue, "Drill", drill);
  }

  /* ---- shared question session ---- */
  function session(queue, title, onFinish) {
    let i = 0, right = 0;
    const m = M(); m.innerHTML = "";
    const w = h("div", "wrap");
    const crumb = h("div", "crumb", "← leave session");
    crumb.onclick = onFinish;
    w.appendChild(crumb);
    const head = h("h1", null, title);
    w.appendChild(head);
    const prog = h("p", "sub", "");
    w.appendChild(prog);
    const slot = h("div");
    w.appendChild(slot);
    m.appendChild(w);

    function step() {
      if (i >= queue.length) {
        slot.innerHTML = "";
        const done = h("div", "q");
        done.innerHTML = `<div class="qtext">Session complete — ${right} / ${queue.length} correct.</div>
          <p class="sub">Anything you missed will come back sooner. Anything you got right moves further out.</p>`;
        const again = h("button", "btn", "Another round");
        again.onclick = onFinish;
        done.appendChild(again);
        slot.appendChild(done);
        prog.textContent = "";
        LN.refreshBadge();
        return;
      }
      prog.textContent = `Question ${i + 1} of ${queue.length}`;
      slot.innerHTML = "";
      const q = queue[i];
      slot.appendChild(question(q, ok => {
        if (ok) right++;
        i++;
        step();
      }));
    }
    step();
  }

  function question(entry, done) {
    const it = entry.item;
    const box = h("div", "q");
    if (entry.card) box.appendChild(h("div", "sub", entry.card.trackTitle + " · " + entry.card.title));
    box.appendChild(h("div", "qtext", it.q));

    const verdict = h("div");
    let answered = false;

    const finish = (ok, extra) => {
      if (answered) return;
      answered = true;
      LN.db.review(entry.key, ok ? 4 : 0);
      const v = h("div", "verdict " + (ok ? "ok" : "no"));
      v.innerHTML = `<b>${ok ? "Correct" : "Not quite"}</b>${extra || ""}<div class="exp">${it.explain || ""}</div>`;
      verdict.appendChild(v);
      const nb = h("button", "btn");
      nb.textContent = "Next";
      nb.style.marginTop = "12px";
      nb.onclick = () => done(ok);
      verdict.appendChild(nb);
      nb.focus();
    };

    if (it.type === "mcq") {
      const cs = h("div", "choices");
      it.choices.forEach((c, ci) => {
        const b = h("button", "choice", c);
        b.onclick = () => {
          if (answered) return;
          const ok = ci === it.correct;
          b.classList.add(ok ? "right" : "wrong");
          if (!ok) cs.children[it.correct].classList.add("right");
          Array.from(cs.children).forEach(x => x.disabled = true);
          finish(ok);
        };
        cs.appendChild(b);
      });
      box.appendChild(cs);
    } else {
      const row = h("div", "answerbox");
      const inp = h("input");
      inp.placeholder = "your answer";
      inp.autocomplete = "off";
      const sb = h("button", "btn", "Check");
      const submit = () => {
        if (answered) return;
        const ok = LN.drills.check(inp.value, it.accept);
        inp.disabled = true; sb.disabled = true;
        finish(ok, ok ? "" : ` — expected <code>${esc(it.accept[0])}</code>`);
      };
      sb.onclick = submit;
      inp.onkeydown = e => { if (e.key === "Enter") submit(); };
      row.appendChild(inp); row.appendChild(sb);
      box.appendChild(row);
      setTimeout(() => inp.focus(), 0);
    }
    box.appendChild(verdict);
    return box;
  }

  /* ============================ LAB ============================ */
  let sh = null;
  function lab() {
    if (!sh) sh = new LN.Shell("flat");
    const m = M(); m.innerHTML = "";
    const w = h("div");
    const hdRow = h("div", "lab-hdrow");
    hdRow.appendChild(h("h1", null, "Lab"));
    const copyBtn = h("button", "btn ghost", "Copy transcript");
    copyBtn.onclick = () => {
      const text = term.innerText || term.textContent || "";
      const done = () => { copyBtn.textContent = "Copied!"; setTimeout(() => copyBtn.textContent = "Copy transcript", 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
    };
    hdRow.appendChild(copyBtn);
    w.appendChild(hdRow);
    w.appendChild(h("p", "sub", "A simulated switch, hosts and IGMP. Nothing here touches your machine. Type <code>help</code>, or run the walkthrough on the right."));

    const grid = h("div", "labgrid");
    const left = h("div");
    const term = h("div"); term.id = "term";
    left.appendChild(term);
    const row = h("div", "prompt-row");
    const ps1 = h("span", "ps1", sh.ps1());
    const inp = h("input");
    inp.autocomplete = "off"; inp.spellcheck = false;
    row.appendChild(ps1); row.appendChild(inp);
    left.appendChild(row);
    grid.appendChild(left);

    const side = h("div");
    const state = h("div", "panel"); state.id = "labstate";
    side.appendChild(state);
    const hints = h("div", "panel");
    hints.innerHTML = `<h4>Walkthrough — the five-minute death</h4>
      <div class="hintlist">
      1. <code>stream start app01 239.1.1.1</code><br>
      2. <code>use app02</code> then <code>join 239.1.1.1</code><br>
      3. <code>use app03</code> then <code>top</code> — app03 never joined, look at <b>si</b><br>
      4. <code>switch snooping on</code> — read the warning<br>
      5. <code>tcpdump -i eth0 igmp 300</code> — silence is the finding<br>
      6. <code>switch show igmp</code> — the entries are gone<br>
      7. <code>switch querier on</code> then <code>use app02</code>, <code>join 239.1.1.1</code>, <code>tick 300</code><br>
      8. <code>switch show igmp</code> — now it holds<br><br>
      <b>Then try:</b> <code>topo vlans</code> and ping across a VLAN; <code>topo sina</code> and
      <code>send 239.1.1.1 1500 5</code> across the boundary.
      </div>`;
    side.appendChild(hints);
    grid.appendChild(side);
    w.appendChild(grid);
    m.appendChild(w);

    const HIST_KEY = "learnnetworking.lab.history";
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch (e) { hist = []; }
    let hi = hist.length;
    const write = lines => {
      lines.forEach(l => {
        const d = h("div", l.cls || "");
        d.textContent = l.s;
        term.appendChild(d);
      });
      term.scrollTop = term.scrollHeight;
    };
    const refresh = () => {
      ps1.textContent = sh.ps1();
      state.innerHTML = labState(sh);
    };

    inp.onkeydown = e => {
      if (e.key === "Enter") {
        const v = inp.value;
        inp.value = "";
        if (v.trim()) {
          hist.push(v); hi = hist.length;
          try { localStorage.setItem(HIST_KEY, JSON.stringify(hist.slice(-50))); } catch (e) {}
        }
        const out = sh.run(v);
        if (out === "CLEAR" || (out[1] && out[1] === "CLEAR")) { term.innerHTML = ""; refresh(); return; }
        write(out.filter(x => x && x.s !== undefined));
        refresh();
      } else if (e.key === "ArrowUp") {
        if (hi > 0) { hi--; inp.value = hist[hi]; }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (hi < hist.length - 1) { hi++; inp.value = hist[hi]; } else { hi = hist.length; inp.value = ""; }
        e.preventDefault();
      }
    };

    write([{ cls: "note", s: `topology "${sh.topo}" — ${LN.topologies[sh.topo].desc}` },
           { cls: "note", s: "type 'help' for the command list, or follow the walkthrough on the right" }]);
    refresh();
    inp.focus();
  }

  function labState(sh) {
    const net = sh.net;
    let s = "<h4>Live state</h4><div class='topo'>";
    Object.values(net.vlans).forEach(v => {
      s += `<div class="flowline"><b>vlan ${v.id}</b> — snooping <span class="${v.snooping ? "" : "off"}">${v.snooping ? "ON" : "off"}</span>,
            querier <span class="${v.querier ? "" : "off"}">${v.querier ? "ON" : "off"}</span></div>`;
    });
    s += "</div><div style='height:8px'></div><div class='topo'>";
    Object.values(net.hosts).forEach(hh => {
      s += `<div class="node"><span>${hh.name === net.cur ? "▶ " : "&nbsp;&nbsp;"}${hh.name} <span class="off">${hh.port}/v${hh.vlan}</span></span>
            <span class="${hh.joined.length ? "g" : "off"}">${hh.joined.length ? hh.joined.join(" ") : "—"}</span></div>`;
    });
    s += "</div>";
    if (sh.streams.length)
      s += `<div style='margin-top:8px' class='topo'><b>streaming:</b> ${sh.streams.map(x => x.src + " → " + x.group).join(", ")}</div>`;
    s += `<div style='margin-top:8px' class='topo off'>clock ${net.clock()}</div>`;
    return s;
  }

  /* ============================ INCIDENT ============================ */
  function incident() {
    const m = M(); m.innerHTML = "";
    const w = h("div", "wrap");
    w.appendChild(h("h1", null, "Incident"));
    w.appendChild(h("p", "sub", "Timed-decision scenarios drawn from the situations you described. Every wrong branch explains why it is wrong — those explanations are half the value."));
    const list = h("div", "cardlist");
    LN.scenarios.forEach(s => {
      const st = LN.db.data.scenarios[s.id];
      const solved = st && st.best >= 1;
      const tile = h("div", "cardtile");
      tile.innerHTML = `<div class="t">${solved ? "✓ " : ""}${esc(s.title)}</div><div class="w">${esc(s.brief.slice(0, 130))}…</div>
        <div class="meta"><span class="readtime">${st ? st.runs + " attempt" + (st.runs === 1 ? "" : "s") : "not attempted"}</span></div>
        <div class="bar"><i style="width:${st ? Math.round(st.best * 100) : 0}%"></i></div>`;
      tile.onclick = () => LN.navigate("incident/" + s.id);
      list.appendChild(tile);
    });
    w.appendChild(list);
    m.appendChild(w);
  }

  function runScenario(sc) {
    let step = 0, firstTry = 0;
    const m = M(); m.innerHTML = "";
    const w = h("div", "wrap");
    const crumb = h("div", "crumb", "← back to Incident");
    crumb.onclick = () => LN.navigate("incident");
    w.appendChild(crumb);
    w.appendChild(h("h1", null, sc.title));
    w.appendChild(h("div", "why", "<b>Situation:</b> " + sc.brief));
    const slot = h("div");
    w.appendChild(slot);
    m.appendChild(w);

    function render() {
      slot.innerHTML = "";
      if (step >= sc.steps.length) {
        const score = firstTry / sc.steps.length;
        const rec = LN.db.data.scenarios[sc.id] || { best: 0, runs: 0 };
        rec.best = Math.max(rec.best, score); rec.runs++; rec.lastRun = Date.now();
        LN.db.data.scenarios[sc.id] = rec; LN.db.save();
        const box = h("div", "concept");
        box.appendChild(h("h2", null, `Resolved — ${firstTry} of ${sc.steps.length} decisions right first time`));
        box.appendChild(h("div", null, sc.debrief));
        const b = h("button", "btn", "Back to scenarios");
        b.onclick = () => LN.navigate("incident");
        box.appendChild(b);
        slot.appendChild(box);
        return;
      }
      const s = sc.steps[step];
      const box = h("div", "q");
      box.appendChild(h("div", "sub", `Decision ${step + 1} of ${sc.steps.length}`));
      box.appendChild(h("div", "qtext", s.q));
      const cs = h("div", "choices");
      let missed = false;
      s.options.forEach(o => {
        const b = h("button", "choice", o.t);
        b.onclick = () => {
          if (b.disabled) return;
          b.classList.add(o.ok ? "right" : "wrong");
          b.disabled = true;
          const v = h("div", "verdict " + (o.ok ? "ok" : "no"));
          v.innerHTML = o.fb;
          box.appendChild(v);
          if (o.ok) {
            if (!missed) firstTry++;
            Array.from(cs.children).forEach(x => x.disabled = true);
            const nb = h("button", "btn", step + 1 >= sc.steps.length ? "See the debrief" : "Next decision");
            nb.style.marginTop = "12px";
            nb.onclick = () => { step++; render(); };
            box.appendChild(nb);
          } else missed = true;
        };
        cs.appendChild(b);
      });
      box.appendChild(cs);
      slot.appendChild(box);
      m.scrollTop = m.scrollHeight;
    }
    render();
  }

  /* ============================ PROGRESS ============================ */
  function progress() {
    const m = M(); m.innerHTML = "";
    const d = LN.db.data;
    const w = h("div", "wrap");
    w.appendChild(h("h1", null, "Progress"));
    w.appendChild(h("p", "sub", "Retention is measured by how many times you have recalled something correctly at increasing intervals — not by how much you have read."));

    const acc = d.log.answered ? Math.round(d.log.correct / d.log.answered * 100) : 0;
    const streak = LN.idx.streak();
    const milestone = streak >= 30 ? "🔥 30+" : streak >= 7 ? "🔥 7+" : streak >= 3 ? "🔥 3+" : "";
    const g = h("div", "statgrid");
    [["Cards read", Object.keys(d.seen).length + " / " + LN.idx.cards.length],
     ["Questions answered", d.log.answered],
     ["Accuracy", acc + "%"],
     ["Due now", LN.idx.dueItems().length],
     ["Day streak", streak + (milestone ? " " + milestone : "")]].forEach(([l, n]) => {
      const s = h("div", "stat");
      s.innerHTML = `<div class="n">${n}</div><div class="l">${l}</div>`;
      g.appendChild(s);
    });
    w.appendChild(g);

    // track mastery mini bar chart — one glance across every track
    const chart = h("div", "panel");
    chart.appendChild(h("h4", null, "Retention by track"));
    LN.tracks.forEach(t => {
      const pct = Math.round(LN.idx.trackMastery(t.id) * 100);
      const row = h("div", "trackbar-row");
      row.innerHTML = `<span class="trackbar-label">${esc(t.title)}</span>
        <span class="trackbar-track"><i style="width:${pct}%"></i></span>
        <span class="trackbar-pct">${pct}%</span>`;
      chart.appendChild(row);
    });
    w.appendChild(chart);

    // bookmarked cards, quick access
    const bmIds = Object.keys(d.bookmarks);
    if (bmIds.length) {
      const bmBox = h("div", "panel");
      bmBox.appendChild(h("h4", null, `★ Bookmarked (${bmIds.length})`));
      const bmList = h("div", "bmlist");
      bmIds.forEach(id => {
        const c = LN.idx.cardById[id];
        if (!c) return;
        const link = h("div", "bmlink", esc(c.title));
        link.onclick = () => LN.navigate("learn/" + id);
        bmList.appendChild(link);
      });
      bmBox.appendChild(bmList);
      w.appendChild(bmBox);
    }

    const settingsBox = h("div", "panel settings-panel");
    settingsBox.appendChild(h("h4", null, "Settings"));
    const freeNavRow = h("label", "switchrow");
    const freeNavCb = h("input");
    freeNavCb.type = "checkbox";
    freeNavCb.checked = !!d.settings.freeNav;
    freeNavCb.onchange = () => {
      d.settings.freeNav = freeNavCb.checked;
      LN.db.save();
      progress();
    };
    freeNavRow.appendChild(freeNavCb);
    const freeNavTxt = h("div");
    freeNavTxt.innerHTML = "<b>Free navigation</b><br><span class='sub' style='margin:0'>Unlock every card immediately — jump to whatever topic you want instead of following the guided prerequisite order. Cards you haven't earned the guided way stay marked \"unlocked early\".</span>";
    freeNavRow.appendChild(freeNavTxt);
    settingsBox.appendChild(freeNavRow);
    w.appendChild(settingsBox);

    LN.tracks.forEach(t => {
      w.appendChild(h("h2", null, t.title));
      const tbl = h("table");
      tbl.innerHTML = "<tr><th>Concept</th><th style='width:120px'>Retention</th><th style='width:90px'>Status</th></tr>" +
        t.cards.map(c => {
          const pc = Math.round(LN.idx.mastery(c) * 100);
          const st = !d.seen[c.id] ? "unread" : pc >= 80 ? "solid" : pc >= 40 ? "learning" : "shaky";
          return `<tr><td>${esc(c.title)}</td><td>${pc}%</td><td>${st}</td></tr>`;
        }).join("");
      w.appendChild(tbl);
    });

    w.appendChild(h("p", "sub legend", "Status legend: <b>unread</b> — not opened yet · <b>shaky</b> (&lt;40%) — reviewed but not sticking · <b>learning</b> (40–79%) — improving · <b>solid</b> (≥80%) — well retained."));

    const dangerRow = h("div");
    dangerRow.style.marginTop = "24px";
    const rb = h("button", "btn ghost", "Reset all progress");
    rb.onclick = () => {
      if (confirm("Erase all progress on this browser? Export first if you want to keep it. (You'll be able to Undo once, right after.)")) {
        LN.db.reset(); progress(); LN.refreshBadge();
      }
    };
    dangerRow.appendChild(rb);
    if (LN.db.hasBackup()) {
      const ub = h("button", "btn ghost", "Undo reset");
      ub.style.marginLeft = "8px";
      ub.onclick = () => {
        if (LN.db.restoreBackup()) { progress(); LN.refreshBadge(); }
      };
      dangerRow.appendChild(ub);
    }
    w.appendChild(dangerRow);
    m.appendChild(w);
  }

  /* ============================ CHANGELOG ============================ */
  const CHANGELOG = [
    { d: "Free navigation", items: [
      "A Settings toggle in Progress lets you unlock every card immediately, instead of following the guided prerequisite order. Cards opened this way are marked \"unlocked early\"."
    ]},
    { d: "Find things faster", items: [
      "Search box in Learn — matches title, why-it-matters, body, and pitfalls across every track.",
      "Filter Learn by track, or to bookmarked cards only.",
      "🎲 Random card button, and a \"Continue: <card>\" shortcut back to whatever you read last.",
      "Bookmark (★) any card from its tile or from inside the card itself; see them all in Progress."
    ]},
    { d: "Know what you're getting into", items: [
      "Every card shows a difficulty tag (starter / core / advanced, based on prerequisite depth) and an estimated read time.",
      "Card view shows a breadcrumb: which track, and which position in it (e.g. \"card 3 of 8\"), with Prev/Next buttons."
    ]},
    { d: "Drill, your way", items: [
      "See the due backlog broken down by track before you start.",
      "Choose a session length: quick (5), normal, or long (20).",
      "Restrict a session to bookmarked cards only."
    ]},
    { d: "Progress, visualised", items: [
      "A retention bar chart across every track, at a glance.",
      "Streak milestones (3/7/30 days) get a small 🔥 badge.",
      "Reset all progress now offers one-shot Undo.",
      "A status legend explains what unread/shaky/learning/solid actually mean."
    ]},
    { d: "Lab and Incident", items: [
      "Copy the full Lab terminal transcript to your clipboard.",
      "Lab command history now survives a page reload.",
      "Solved Incident scenarios get a ✓ and show attempt counts."
    ]},
    { d: "Around the app", items: [
      "Light theme, alongside the original dark theme (footer toggle).",
      "Keyboard shortcuts: <code>/</code> search, <code>1-5</code> switch modes, <code>b</code> bookmark, <code>Esc</code> back, <code>?</code> for the full list.",
      "Import now validates the file and shows a summary (cards seen, questions answered) before overwriting anything.",
      "Content: more Learn cards deepening Linux, Windows, and remote-tooling coverage.",
      "A real, no-dependency test suite (tests/run.js) now covers the spaced-repetition engine, content integrity, the Lab's full walkthrough, and every feature above."
    ]}
  ];

  function changelog() {
    const m = M(); m.innerHTML = "";
    const w = h("div", "wrap");
    w.appendChild(h("h1", null, "Changelog"));
    w.appendChild(h("p", "sub", "What's new in this build."));
    CHANGELOG.forEach(sec => {
      w.appendChild(h("h2", null, sec.d));
      const ul = h("ul");
      sec.items.forEach(it => ul.appendChild(h("li", null, it)));
      w.appendChild(ul);
    });
    m.appendChild(w);
  }

  LN.views = { learn, drill, lab, incident, progress, concept, changelog, runScenario };
})();
