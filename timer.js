// Step timer: per-step countdown for the daily plan and the pre-match warm-up.
// Layers: in-app banner + chime (Web Audio) + vibration where supported, optional
// system notification, and a Screen Wake Lock while running. State in localStorage.
(function(){
  const K = "pt_timer", KS = "pt_timer_set";
  const DS = { sound: true, warn: true, autoAdv: false, notif: "unasked" };
  const ld = (k, d) => { try { return Object.assign({}, d, JSON.parse(localStorage.getItem(k) || "null") || {}); } catch (e) { return Object.assign({}, d); } };
  let S = ld(K, { status: "idle" }), SET = ld(KS, DS);
  const save = () => { try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) {} };
  const saveSet = () => { try { localStorage.setItem(KS, JSON.stringify(SET)); } catch (e) {} };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const defs = {};
  // stale sessions (older than 8 h) are cleared on load
  if (S.status !== "idle" && S.touched && Date.now() - S.touched > 8 * 3600e3) S = { status: "idle" };
  const fmt = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0"); };
  const cur = () => S.steps && S.steps[S.idx];
  const leftSec = () => { const st = cur(); if (!st || !st.sec) return null; if (S.status === "pause") return S.left; return (S.endAt - Date.now()) / 1000; };
  const elapsed = () => S.status === "pause" ? (S.el || 0) : (Date.now() - (S.startAt || Date.now())) / 1000;

  // ---- sound ----
  let AC = null;
  const unlock = () => { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); const b = AC.createBuffer(1, 1, 22050), s = AC.createBufferSource(); s.buffer = b; s.connect(AC.destination); s.start(0); } catch (e) {} };
  const tone = (f, t0, d, v) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + d + 0.05); };
  const chime = (soft) => { if (!SET.sound) return; try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); const t = AC.currentTime + 0.03; if (soft) { tone(784, t, 0.5, 0.25); } else { tone(659.3, t, 0.6, 0.35); tone(880, t + 0.22, 0.6, 0.35); tone(1318.5, t + 0.44, 0.9, 0.3); } } catch (e) {} };
  const buzz = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

  // ---- notifications ----
  const canNotif = () => "Notification" in window;
  const notify = (title, body) => {
    if (!canNotif() || SET.notif !== "granted" || Notification.permission !== "granted") return;
    const opt = { body, tag: "pt-step", renotify: true, icon: "icons/icon-192.png" };
    const fallback = () => { try { new Notification(title, opt); } catch (e) {} };
    try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then((r) => r && r.showNotification ? r.showNotification(title, opt).catch(fallback) : fallback()).catch(fallback); else fallback(); } catch (e) { fallback(); }
  };
  const askNotif = () => { if (!canNotif()) return; try { const p = Notification.requestPermission((r) => done(r)); if (p && p.then) p.then(done); } catch (e) { done("denied"); } function done(r) { if (done.x) return; done.x = 1; SET.notif = r === "granted" ? "granted" : "denied"; saveSet(); ui(true); } };

  // ---- wake lock ----
  let WL = null;
  const lockOn = async () => { if (!("wakeLock" in navigator) || WL || document.hidden) return; try { WL = await navigator.wakeLock.request("screen"); WL.addEventListener("release", () => { WL = null; ui(); }); } catch (e) { WL = null; } ui(); };
  const lockOff = () => { try { if (WL) WL.release(); } catch (e) {} WL = null; };

  // ---- state changes ----
  const begin = (i) => { const st = S.steps[i]; S.idx = i; S.status = "run"; S.startAt = Date.now(); S.el = 0; S.endAt = st && st.sec ? Date.now() + st.sec * 1000 : null; S.warned = false; S.alerted = false; S.autoNote = ""; S.alertMsg = ""; S.touched = Date.now(); save(); lockOn(); ui(true); };
  const startSession = (key, i) => { const d = defs[key]; if (!d) return; if (S.status !== "idle" && S.status !== "done" && S.key !== key && !confirm("Stop the timer for \"" + S.title + "\" and start this one?")) return; S = { key, title: d.title, view: d.view, steps: d.steps, status: "idle" }; unlock(); begin(i || 0); };
  const pause = () => { if (S.status !== "run" && S.status !== "up") return; S.left = leftSec(); S.el = elapsed(); S.prev = S.status; S.status = "pause"; S.touched = Date.now(); save(); lockOff(); ui(true); };
  const resume = () => { if (S.status !== "pause") return; unlock(); S.status = S.prev === "up" ? "up" : "run"; S.endAt = S.left != null ? Date.now() + S.left * 1000 : null; S.startAt = Date.now() - (S.el || 0) * 1000; S.touched = Date.now(); save(); lockOn(); ui(true); };
  const next = () => { unlock(); if (S.idx + 1 < S.steps.length) begin(S.idx + 1); else finish(); };
  const finish = () => { S.status = "done"; S.touched = Date.now(); save(); lockOff(); document.title = baseTitle; ui(true); };
  const clear = () => { S = { status: "idle" }; save(); lockOff(); document.title = baseTitle; ui(true); };
  const addMin = (m) => { const st = cur(); if (!st) return; unlock(); if (!st.sec) { st.sec = Math.round(elapsed()) + m * 60; S.endAt = Date.now() + m * 60e3; S.left = m * 60; } else if (S.status === "pause") { S.left = Math.max(0, S.left) + m * 60; S.prev = "run"; } else { S.endAt = Math.max(S.endAt, Date.now()) + m * 60e3; S.status = "run"; st.sec += m * 60; } S.alerted = false; S.warned = false; S.touched = Date.now(); save(); ui(true); };

  // ---- tick ----
  const baseTitle = document.title;
  const alertUp = (late) => {
    const st = cur(), nx = S.steps[S.idx + 1];
    const msg = nx ? "Next: " + nx.t + (nx.sec ? " (" + Math.round(nx.sec / 60) + " min)" : "") : "That was the last step.";
    chime(false); buzz([300, 150, 300, 150, 300]);
    notify("Road Warrior: time to move on" + (st ? ": " + st.t : ""), msg);
    toast("⏰ Time to move on" + (st ? " from " + st.t : "") + ". " + msg);
    S.alertMsg = (late ? "Time was up " + Math.round(late / 60) + " min ago. " : "") + msg;
    if (SET.autoAdv && nx) { begin(S.idx + 1); S.autoNote = "Moved on automatically to " + nx.t + "."; save(); return; }
    S.status = "up"; save();
  };
  const tick = () => {
    if (S.status !== "run" && S.status !== "up") { return; }
    const l = leftSec();
    if (l != null) {
      if (SET.warn && !S.warned && l <= 60 && l > 0 && cur().sec >= 180) { S.warned = true; save(); chime(true); buzz(120); toast("About 1 minute left on " + cur().t + "."); }
      if (l <= 0 && !S.alerted) { S.alerted = true; S.warned = true; alertUp(-l > 90 ? -l : 0); }
    }
    ui();
  };
  setInterval(tick, 1000);
  window.addEventListener("scroll", () => { if (S.status !== "idle") ui(); }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { if (S.status === "run" || S.status === "up") lockOn(); tick(); } });
  window.addEventListener("pageshow", tick);

  // ---- UI ----
  let toastT = null;
  const toast = (m) => { let t = document.getElementById("sttoast"); if (!t) { t = document.createElement("div"); t.id = "sttoast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); } t.textContent = m; t.className = "show"; clearTimeout(toastT); toastT = setTimeout(() => { t.className = ""; }, 6000); };
  const settingsHTML = () => {
    const ns = !canNotif() ? "Not available in this browser or on this copy of the app." : SET.notif === "granted" && Notification.permission === "granted" ? "On" : Notification.permission === "denied" || SET.notif === "denied" ? "Off (blocked). You can turn it on in iPhone Settings → Notifications if Road Warrior is listed." : "Off";
    return `<details class="stset"><summary>Timer settings and how alerts work</summary><div class="inner">
      <label class="tog"><input type="checkbox" data-stset="sound" ${SET.sound ? "checked" : ""}> Chime when time is up</label>
      <label class="tog"><input type="checkbox" data-stset="warn" ${SET.warn ? "checked" : ""}> 1-minute warning (steps of 3 min or more)</label>
      <label class="tog"><input type="checkbox" data-stset="autoAdv" ${SET.autoAdv ? "checked" : ""}> Move on to the next step automatically (off by default)</label>
      <div class="meta">Phone notifications: ${esc(ns)}${canNotif() && SET.notif !== "granted" && Notification.permission !== "denied" ? ` <button class="btn ghost sm" data-st="asknotif">Allow notifications</button>` : ""}</div>
      <div class="meta">Keep screen awake: ${"wakeLock" in navigator ? (WL ? "on while the timer runs ✔" : "turns on while the timer runs") : "not supported here"}.</div>
      <div class="meta"><b>Honest note:</b> iPhone may not alert you if Road Warrior is in the background or the phone is locked, and the chime is silent when the ring/silent switch is on silent. iPhone also doesn't vibrate for web apps. The reliable way is to keep Road Warrior open on screen while you practice; the timer keeps the screen awake for you. If you come back after the time ran out, the app tells you as soon as it's open again. Phone notifications are a bonus and may not appear at all on iPhone.</div>
    </div></details>`;
  };
  const clk = () => { const st = cur(), l = leftSec(), up = S.status === "up" || (l != null && l <= 0); return { clock: (S.status === "pause" ? "⏸ " : "") + (st.sec ? (l > 0 ? fmt(l) : "+" + fmt(-l)) : fmt(elapsed())), sub: st.sec ? (up ? "over the planned " + Math.round(st.sec / 60) + " min" : "left of " + Math.round(st.sec / 60) + " min") : "elapsed · no set time for this step (add one below if you like)" }; };
  const panelInner = (key, noClk) => {
    const d = defs[key]; if (!d) return "";
    const mine = S.key === key && S.status !== "idle";
    if (!mine) {
      const tot = d.steps.reduce((s, x) => s + (x.sec || 0), 0);
      return `<div class="t">⏱️ Step timer</div><div class="meta">${d.steps.length} steps · about ${Math.round(tot / 60)} min. It tells you when each step's time is up; you decide when to move on.</div>
        <div class="row"><button class="btn" data-st="start" data-key="${esc(key)}">▶ Start session</button></div>${S.status !== "idle" && S.status !== "done" ? `<div class="meta">Another timer is running: ${esc(S.title)}.</div>` : ""}${notifAsk()}${settingsHTML()}`;
    }
    if (S.status === "done") return `<div class="t">✅ Session done</div><div class="meta">${esc(S.title)}: all ${S.steps.length} steps finished. Log your scores while they're fresh.</div><div class="row"><button class="btn ghost" data-st="clear">Reset timer</button></div>${settingsHTML()}`;
    const st = cur(), nx = S.steps[S.idx + 1], l = leftSec(), up = S.status === "up" || (l != null && l <= 0), paused = S.status === "pause";
    const c = clk(), clock = noClk ? "" : c.clock, sub = c.sub;
    return `<div class="t">Step ${S.idx + 1} of ${S.steps.length}: ${esc(st.t)}</div>
      ${up ? `<div class="stup" role="alert"><b>⏰ Time to move on.</b> ${esc(S.alertMsg || (nx ? "Next: " + nx.t : "That was the last step."))}</div>` : ""}
      ${S.autoNote ? `<div class="meta">${esc(S.autoNote)}</div>` : ""}
      <div class="clock ${up ? "over" : ""}" data-stclock aria-live="off">${clock}</div><div class="meta" style="text-align:center">${esc(sub)}${paused ? " · paused" : ""}</div>
      <div class="row strow">
        ${paused ? `<button class="btn" data-st="resume">▶ Resume</button>` : `<button class="btn ghost" data-st="pause">⏸ Pause</button>`}
        <button class="btn ${up ? "" : "ghost"}" data-st="next">${nx ? "⏭ Move on" : "✅ Finish"}</button>
        <button class="btn ghost" data-st="add" data-m="2">+2 min</button><button class="btn ghost" data-st="add" data-m="5">+5 min</button>
        <button class="btn ghost" data-st="clear">Reset</button>
      </div>
      <div class="meta">${nx ? "Up next: " + esc(nx.t) + (nx.sec ? " · " + Math.round(nx.sec / 60) + " min" : "") : "This is the last step."}</div>${notifAsk()}${settingsHTML()}`;
  };
  const notifAsk = () => canNotif() && SET.notif === "unasked" && Notification.permission === "default" ? `<div class="callout stask">🔔 Want a phone notification too when a step's time is up? It's optional; the on-screen banner and chime work either way. <div class="row"><button class="btn sm" data-st="asknotif">Allow notifications</button><button class="btn ghost sm" data-st="nonotif">No thanks</button></div></div>` : "";
  let lastHTML = "";
  const ui = (force) => {
    document.querySelectorAll("[data-stpanel]").forEach((p) => { const k = p.dataset.stpanel, skel = panelInner(k, true); if (force || p._h !== skel) { const op = p.querySelector("details.stset"); const wasOpen = op && op.open; p.innerHTML = panelInner(k); p._h = skel; if (wasOpen) { const n = p.querySelector("details.stset"); if (n) n.open = true; } } else { const c = p.querySelector("[data-stclock]"); if (c && cur()) { const t = clk().clock; if (c.textContent !== t) c.textContent = t; } } });
    // highlight current step + mini bar on step rows
    document.querySelectorAll("[data-stkey]").forEach((el) => { const on = S.key === el.dataset.stkey && S.status !== "idle" && S.status !== "done" && S.idx === +el.dataset.sti; el.classList.toggle("stcur", on); });
    // floating pill on other screens
    let pill = document.getElementById("stpill");
    const active = S.status === "run" || S.status === "up" || S.status === "pause";
    const pe = document.querySelector(`[data-stpanel="${window.CSS && CSS.escape ? CSS.escape(S.key || "") : S.key}"]`);
    let visible = false; if (pe) { const r = pe.getBoundingClientRect(); visible = r.bottom > 60 && r.top < (window.innerHeight || 800) - 120; }
    if (active && !visible) {
      if (!pill) { pill = document.createElement("button"); pill.id = "stpill"; pill.type = "button"; pill.onclick = () => { const q = document.querySelector("[data-stpanel=\"" + (S.key || "").replace(/"/g, "") + "\"]"); if (q) q.scrollIntoView({ block: "start", behavior: "smooth" }); else if (window.PT_goView && S.view) window.PT_goView(S.view); }; document.body.appendChild(pill); }
      const l = leftSec(), up = S.status === "up" || (l != null && l <= 0);
      const txt = (up ? "⏰ Time to move on · " : S.status === "pause" ? "⏸ " : "⏱️ ") + (cur() ? cur().t : "") + " · " + (cur() && cur().sec ? (l > 0 ? fmt(l) : "+" + fmt(-l)) : fmt(elapsed()));
      if (pill.textContent !== txt) pill.textContent = txt;
      pill.classList.toggle("over", up); pill.hidden = false;
    } else if (pill) pill.hidden = true;
    const want = S.status === "up" ? "⏰ " + baseTitle : baseTitle; if (document.title !== want) document.title = want;
  };

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-st]"); if (!b) return;
    const a = b.dataset.st;
    if (a === "start") startSession(b.dataset.key, 0);
    else if (a === "startstep") startSession(b.dataset.key, +b.dataset.i);
    else if (a === "pause") pause(); else if (a === "resume") resume(); else if (a === "next") next();
    else if (a === "add") addMin(+b.dataset.m); else if (a === "clear") clear();
    else if (a === "asknotif") askNotif(); else if (a === "nonotif") { SET.notif = "off"; saveSet(); ui(true); }
    if (a === "next" || a === "startstep" || a === "start") { const c = document.querySelector(".stcur"); if (c && c.scrollIntoView) setTimeout(() => c.scrollIntoView({ block: "center", behavior: "smooth" }), 30); }
  });
  document.addEventListener("change", (e) => { const c = e.target.closest("[data-stset]"); if (!c) return; SET[c.dataset.stset] = c.checked; saveSet(); ui(true); });

  // Public API
  // define(key, title, view, steps:[{t, sec|null}]) -> panel HTML; mark(el, key, i) adds a "start here" button to a step row.
  const panel = (key, title, view, steps) => { defs[key] = { title, view, steps: steps.map((s) => ({ t: s.t, sec: s.sec ? Math.round(s.sec) : null })) }; if (S.key === key && S.steps && S.steps.length !== steps.length) S.steps = defs[key].steps; return `<div class="timer sttimer" data-stpanel="${esc(key)}">${panelInner(key)}</div>`; };
  const mark = (el, key, i) => { if (!el || !defs[key]) return; el.dataset.stkey = key; el.dataset.sti = i; const host = el.classList.contains("block") ? (el.querySelector(":scope > div") || el) : el; const s = defs[key].steps[i]; const b = document.createElement("div"); b.className = "stbtns"; b.innerHTML = `<button class="btn ghost sm" data-st="startstep" data-key="${esc(key)}" data-i="${i}">▶ Start timer here${s.sec ? " (" + Math.round(s.sec / 60) + " min)" : ""}</button><span class="stnow">⏱️ Current step</span>`; host.appendChild(b); };
  const parseRange = (s) => { const m = /^(\d+):(\d\d)\s*[–-]\s*(\d+):(\d\d)\s*/.exec(s || ""); if (!m) return { t: s, sec: null }; const a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4]; return { t: s.slice(m[0].length) || s, sec: b > a ? (b - a) * 60 : null }; };
  window.StepTimer = { panel, mark, refresh: () => ui(true), parseRange, state: () => S, settings: () => SET, _tick: tick, chime };
  if (S.status === "run" || S.status === "up") setTimeout(() => { lockOn(); tick(); }, 0);
})();
