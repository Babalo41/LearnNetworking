/* app.js — navigation, badge, import/export */
(function () {
  "use strict";

  function refreshBadge() {
    const n = LN.idx.dueItems().length;
    const el = document.getElementById("due-badge");
    el.textContent = n ? `${n} due for review` : "nothing due — drill anyway?";
  }
  LN.refreshBadge = refreshBadge;

  function go(mode) {
    document.querySelectorAll("button.nav").forEach(b =>
      b.classList.toggle("active", b.dataset.mode === mode));
    (LN.views[mode] || LN.views.learn)();
    try { localStorage.setItem("learnnetworking.mode", mode); } catch (e) {}
    refreshBadge();
  }

  document.querySelectorAll("button.nav").forEach(b =>
    b.onclick = () => go(b.dataset.mode));

  document.getElementById("export-btn").onclick = () => {
    const blob = new Blob([JSON.stringify(LN.db.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "learnnetworking-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const fileInput = document.getElementById("import-file");
  document.getElementById("import-btn").onclick = () => fileInput.click();
  fileInput.onchange = () => {
    const f = fileInput.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { LN.db.load(JSON.parse(r.result)); go("progress"); }
      catch (e) { alert("Could not read that file."); }
    };
    r.readAsText(f);
  };

  let start = "learn";
  try { start = localStorage.getItem("learnnetworking.mode") || "learn"; } catch (e) {}
  go(start);
})();
