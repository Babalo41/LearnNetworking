/* app.js — navigation, badge, theme, keyboard shortcuts, toasts, import/export */
(function () {
  "use strict";

  function refreshBadge() {
    const n = LN.idx.dueItems().length;
    const el = document.getElementById("due-badge");
    el.textContent = n ? `${n} due for review` : "nothing due — drill anyway?";
  }
  LN.refreshBadge = refreshBadge;

  /* ---------------- toast ---------------- */
  function toast(msg) {
    let host = document.getElementById("toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-host";
      document.body.appendChild(host);
    }
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => t.classList.add("out"), 2200);
    setTimeout(() => t.remove(), 2600);
  }
  LN.toast = toast;

  /* ---------------- update banner ---------------- */
  function showUpdateBanner() {
    if (document.getElementById("update-banner")) return;
    const el = document.createElement("div");
    el.id = "update-banner";
    el.className = "update-banner";
    el.innerHTML = `<span>A new version of LearnNetworking is available.</span>
      <button class="btn" id="update-refresh">Refresh</button>
      <button class="mini" id="update-dismiss">Later</button>`;
    el.querySelector("#update-refresh").onclick = () => location.reload();
    el.querySelector("#update-dismiss").onclick = () => el.remove();
    document.body.appendChild(el);
  }
  LN.showUpdateBanner = showUpdateBanner;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((reg) => {
        // A worker already waiting (installed while this tab was closed/backgrounded)
        // is itself an update worth surfacing.
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner();
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            // A controller already existing means this is an update, not the first install.
            if (nw.state === "activated" && navigator.serviceWorker.controller) showUpdateBanner();
          });
        });
      }).catch(() => {});
    });
  }

  /* ---------------- theme ---------------- */
  function applyTheme() {
    const theme = (LN.db.data.settings && LN.db.data.settings.theme) || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-btn");
    if (btn) btn.textContent = theme === "dark" ? "☀" : "☾";
  }
  function toggleTheme() {
    const cur = (LN.db.data.settings && LN.db.data.settings.theme) || "dark";
    LN.db.data.settings.theme = cur === "dark" ? "light" : "dark";
    LN.db.save();
    applyTheme();
    toast("Switched to " + LN.db.data.settings.theme + " theme");
  }
  document.getElementById("theme-btn").onclick = toggleTheme;
  applyTheme();

  /* ---------------- navigation / deep links ----------------
     The URL hash is the single source of truth for what's on screen:
     #/<mode> or #/<mode>/<id> (a learn card id, or an incident scenario id).
     That makes any card or scenario a bookmarkable, shareable link, and
     gives the browser's back/forward buttons real meaning. */
  const MODES = ["learn", "drill", "lab", "incident", "progress", "changelog"];

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [mode, arg] = raw.split("/").filter(Boolean);
    return { mode, arg };
  }

  function renderRoute() {
    let { mode, arg } = parseHash();
    if (!MODES.includes(mode)) mode = "learn";
    document.querySelectorAll("button.nav").forEach(b =>
      b.classList.toggle("active", b.dataset.mode === mode));
    try { localStorage.setItem("learnnetworking.mode", mode); } catch (e) {}

    if (mode === "learn" && arg) {
      const card = LN.idx.cardById[arg];
      if (card && LN.idx.unlocked(card)) { LN.views.concept(arg); refreshBadge(); return; }
      // unknown or still-locked card id (stale link, typo) — fall through to the list
    }
    if (mode === "incident" && arg) {
      const sc = LN.scenarios.find(s => s.id === arg);
      if (sc) { LN.views.runScenario(sc); refreshBadge(); return; }
    }
    (LN.views[mode] || LN.views.learn)();
    refreshBadge();
  }

  function navigate(path) {
    const target = "#/" + path;
    if (location.hash === target) renderRoute(); // re-open the same route (e.g. clicking the active tab)
    else location.hash = target; // sets a new history entry and fires hashchange -> renderRoute
  }
  LN.navigate = navigate;
  const go = navigate; // alias — kept so the rest of this file reads naturally

  window.addEventListener("hashchange", renderRoute);

  document.querySelectorAll("button.nav").forEach(b =>
    b.onclick = () => navigate(b.dataset.mode));

  /* ---------------- keyboard shortcuts ---------------- */
  const SHORTCUTS = [
    ["1–6", "Jump to Learn / Drill / Lab / Incident / Progress / Changelog"],
    ["/", "Focus the search box (Learn view)"],
    ["b", "Bookmark the card you're currently reading"],
    ["Esc", "Back out of a card, close this help, blur a field"],
    ["?", "Show / hide this shortcuts list"]
  ];

  function helpModal() {
    let el = document.getElementById("shortcuts-modal");
    if (el) { el.remove(); return; }
    el = document.createElement("div");
    el.id = "shortcuts-modal";
    el.className = "modal-backdrop";
    el.innerHTML = `<div class="modal">
      <h3>Keyboard shortcuts</h3>
      <table>${SHORTCUTS.map(([k, d]) => `<tr><td><code>${k}</code></td><td>${d}</td></tr>`).join("")}</table>
      <button class="btn ghost" style="margin-top:14px">Close</button>
    </div>`;
    el.querySelector("button").onclick = () => el.remove();
    el.onclick = e => { if (e.target === el) el.remove(); };
    document.body.appendChild(el);
  }
  document.getElementById("help-btn").onclick = helpModal;

  document.addEventListener("keydown", e => {
    const tag = document.activeElement && document.activeElement.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    if (e.key === "Escape") {
      const modal = document.getElementById("shortcuts-modal");
      if (modal) { modal.remove(); return; }
      if (typing) { document.activeElement.blur(); return; }
      return;
    }
    if (typing) return; // never hijack keys while the user is typing/answering

    if (e.key === "?") { helpModal(); return; }
    if (e.key === "/") {
      const search = document.getElementById("learn-search");
      if (search) { e.preventDefault(); search.focus(); }
      else { go("learn"); setTimeout(() => { const s = document.getElementById("learn-search"); if (s) s.focus(); }, 0); }
      return;
    }
    if (e.key >= "1" && e.key <= String(MODES.length)) {
      go(MODES[+e.key - 1]);
      return;
    }
    if (e.key === "b") {
      const star = document.querySelector(".concept-badges .bigstar");
      if (star) star.click();
    }
  });

  /* ---------------- export / import ---------------- */
  document.getElementById("export-btn").onclick = () => {
    const blob = new Blob([JSON.stringify(LN.db.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "learnnetworking-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Progress exported");
  };

  const fileInput = document.getElementById("import-file");
  document.getElementById("import-btn").onclick = () => fileInput.click();
  fileInput.onchange = () => {
    const f = fileInput.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let obj;
      try { obj = JSON.parse(r.result); }
      catch (e) { alert("Could not read that file — not valid JSON."); fileInput.value = ""; return; }
      const check = LN.db.validateImport(obj);
      if (!check.ok) {
        alert("This file doesn't look like a LearnNetworking export:\n" + check.errors.join("\n"));
        fileInput.value = "";
        return;
      }
      const s = check.summary;
      const msg = `Import this file?\n\n` +
        `${s.seenCount} card(s) marked read\n${s.itemCount} spaced-repetition record(s)\n` +
        `${s.answered} question(s) answered\n${s.scenarioCount} incident scenario record(s)\n\n` +
        `This REPLACES your current progress on this browser. Export first if you want to keep it.`;
      if (!confirm(msg)) { fileInput.value = ""; return; }
      LN.db.load(obj);
      go("progress");
      toast("Progress imported");
      fileInput.value = "";
    };
    r.readAsText(f);
  };

  if (location.hash && location.hash !== "#") {
    renderRoute(); // a deep link was opened directly — honor it
  } else {
    let start = "learn";
    try { start = localStorage.getItem("learnnetworking.mode") || "learn"; } catch (e) {}
    navigate(start);
  }
})();
