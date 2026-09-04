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
  function learn() {
    const m = M(); m.innerHTML = "";
    const w = h("div", "wrap");
    w.appendChild(h("h1", null, "Learn"));
    w.appendChild(h("p", "sub", "Read a concept, then practise it. Cards unlock as you read their prerequisites — the order is not arbitrary, each one is built on the last."));

    LN.tracks.forEach(t => {
      const sec = h("div", "track");
      const pct = Math.round(LN.idx.trackMastery(t.id) * 100);
      const hd = h("div", "track-h");
      hd.appendChild(h("h2", null, t.title));
      hd.appendChild(h("span", "pct", pct + "% retained"));
      sec.appendChild(hd);
      sec.appendChild(h("p", "sub", t.blurb));

      const list = h("div", "cardlist");
      t.cards.forEach(c => {
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
          learn();
        };
        tile.innerHTML = `<div class="t">${esc(c.title)}${earlyAccess ? ' <span class="pendingtag">unlocked early</span>' : ""}</div>
          <div class="w">${open ? c.why.replace(/<[^>]+>/g, "").slice(0, 110) + "…"
            : "Locked — read: " + c.prereqs.map(p => LN.idx.cardById[p] ? LN.idx.cardById[p].title : p).join(", ")}</div>
          <div class="bar"><i style="width:${Math.round(LN.idx.mastery(c) * 100)}%"></i></div>`;
        tile.appendChild(star);
        if (open) tile.onclick = () => concept(c.id);
        list.appendChild(tile);
      });
      sec.appendChild(list);
      w.appendChild(sec);
    });
    m.appendChild(w);
  }

  function concept(id) {
    const c = LN.idx.cardById[id];
    LN.db.markSeen(id);
    const m = M(); m.innerHTML = "";
    const w = h("div", "wrap");
    const crumb = h("div", "crumb", "← back to Learn");
    crumb.onclick = learn;
    w.appendChild(crumb);

    const box = h("div", "concept");
    box.appendChild(h("h1", null, c.title));
    box.appendChild(h("div", "why", "<b>Why this matters to you:</b> " + c.why));
    box.appendChild(h("div", null, c.body));
    (c.pitfalls || []).forEach(p => box.appendChild(h("div", "pitfall", "<b>Watch out:</b> " + p)));
    w.appendChild(box);

    const bar = h("div");
    const go = h("button", "btn", `Practise this card (${(c.items || []).length} questions)`);
    go.onclick = () => practice(c);
    bar.appendChild(go);

    const nxt = nextCard(c);
    if (nxt) {
      const b2 = h("button", "btn ghost", "Next: " + nxt.title);
      b2.style.marginLeft = "8px";
      b2.onclick = () => concept(nxt.id);
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
  function drill() {
    const due = LN.idx.dueItems();
    const queue = [];
    due.slice(0, 8).forEach(d => queue.push({ item: d.item, key: d.key, card: d.card }));
    // top up with generated drills so a session is always worth doing
    const want = Math.max(6, Math.min(12, due.length + 4));
    while (queue.length < want) {
      const d = LN.drills.random();
      queue.push({ item: { type: "input", q: d.q, accept: d.accept, explain: d.explain }, key: d.key, gen: true });
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
    w.appendChild(h("h1", null, "Lab"));
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

    const hist = [];
    let hi = 0;
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
        if (v.trim()) { hist.push(v); hi = hist.length; }
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
      const tile = h("div", "cardtile");
      tile.innerHTML = `<div class="t">${esc(s.title)}</div><div class="w">${esc(s.brief.slice(0, 130))}…</div>
        <div class="bar"><i style="width:${st ? Math.round(st.best * 100) : 0}%"></i></div>`;
      tile.onclick = () => runScenario(s);
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
    crumb.onclick = incident;
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
        b.onclick = incident;
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
    const g = h("div", "statgrid");
    [["Cards read", Object.keys(d.seen).length + " / " + LN.idx.cards.length],
     ["Questions answered", d.log.answered],
     ["Accuracy", acc + "%"],
     ["Due now", LN.idx.dueItems().length],
     ["Day streak", LN.idx.streak()]].forEach(([l, n]) => {
      const s = h("div", "stat");
      s.innerHTML = `<div class="n">${n}</div><div class="l">${l}</div>`;
      g.appendChild(s);
    });
    w.appendChild(g);

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

    const rb = h("button", "btn ghost", "Reset all progress");
    rb.style.marginTop = "24px";
    rb.onclick = () => {
      if (confirm("Erase all progress on this browser? Export first if you want to keep it.")) {
        LN.db.reset(); progress(); LN.refreshBadge();
      }
    };
    w.appendChild(rb);
    m.appendChild(w);
  }

  LN.views = { learn, drill, lab, incident, progress, concept };
})();
