// Refresh button: checks for a new version (service worker), applies it, then reloads. Never touches localStorage.
(function(){
  const msg = (t) => { const m = document.getElementById("ptrefmsg"); if (m) m.textContent = t; };
  const btn = () => document.getElementById("ptrefresh");
  let busy = false;
  const reload = (d) => setTimeout(() => location.reload(), d || 0);
  const waitState = (w, ms) => new Promise((res) => { if (!w) return res(); const t = setTimeout(res, ms); w.addEventListener("statechange", () => { if (w.state === "installed" || w.state === "activated" || w.state === "redundant") { clearTimeout(t); res(); } }); });
  async function run(){
    if (busy) return; busy = true; const b = btn(); if (b) b.classList.add("spin"); msg("Updating…");
    try {
      if (!("serviceWorker" in navigator)) { msg("Up to date ✓"); return reload(600); }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { msg("Up to date ✓"); return reload(600); }
      let changed = false; navigator.serviceWorker.addEventListener("controllerchange", () => { changed = true; msg("Updated ✓"); reload(200); }, { once: true });
      try { await reg.update(); } catch (e) {}
      if (reg.installing) await waitState(reg.installing, 8000);
      if (reg.waiting) { msg("Updating…"); reg.waiting.postMessage({ type: "SKIP_WAITING" }); setTimeout(() => { if (!changed) reload(); }, 4000); return; }
      setTimeout(() => { if (!changed) { msg("Up to date ✓"); reload(700); } }, 500);
    } catch (e) { reload(300); }
  }
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#ptrefresh")) run(); });
  window.PT_refresh = run;
})();
