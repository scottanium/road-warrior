// Optional Get Started tour. First-launch welcome is skippable; replay from More or #start.
// #tour is already the Events tab, so the replay hash is #start (not #tour).
(function () {
  const KEY = "pt_tour";
  const HASHES = { start: 1, guide: 1, getstarted: 1 };
  const bootHash = (location.hash || "").replace(/^#/, "").toLowerCase();
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

  const STEPS = [
    {
      title: "Welcome to The Road Warrior",
      body: "This is a pool tracker and trainer. The tabs along the bottom take you to each main screen. This tour is short, and you can skip it or replay it anytime from More.",
      view: "today",
      target: () => $("nav.tabs")
    },
    {
      title: "Today's plan and step timers",
      body: "Today shows your practice plan for this day. Tick steps as you finish them. When a step has a timer, you'll be alerted when it's time to move on — keep the app open on screen for the most reliable alert.",
      view: "today",
      target: () => $("[data-stpanel]") || $("#main .card") || $("#title")
    },
    {
      title: "The weekly Plan",
      body: "Plan has the full week: a built 3-hour plan and an Adaptive plan based on your profile. Open Profile from here or from More to set your level, time, and games.",
      view: "plan",
      target: () => $("#headx") || $("#title")
    },
    {
      title: "The Library",
      body: "The Library is a searchable collection of drills, tips, and videos, filtered by game and level. Fundamentals also includes the Right-Cut Fix checklist.",
      view: "lib",
      target: () => $("#gchips") || $("#q") || $("#title")
    },
    {
      title: "Tests",
      body: "Tests are skill checks you can score and save. Those results can help shape an adaptive plan, which you turn on in Profile.",
      view: "tests",
      target: () => $("#headx") || $("#main .card") || $("#title")
    },
    {
      title: "Shot Lab and Table Capture",
      body: "Shot Lab lets you place balls and work through a shot. The Photo and Capture tabs can build a layout from a picture or a live overhead camera. Table Capture needs camera permission when you start the camera — you can also load a video instead.",
      view: "lab",
      target: () => $("#headx") || $("#main")
    },
    {
      title: "Events",
      body: "Events is for finding and tracking tournaments, trip costs, and your history. A full backup of everything, including tournament history, is under Events → History.",
      view: "tour",
      target: () => $("#headx") || $("#title")
    },
    {
      title: "More, and Add to Home Screen",
      body: "More holds Rules Compare, Credits, the Practice Log, Geometry, Ratings, Instructors, and your Profile. Want it to feel like an app on your iPhone? That's optional: open Install app here, or in Safari tap Share, then Add to Home Screen. You can replay this tour anytime from this menu.",
      view: "more",
      target: () => $("[data-go='start']") || $("[data-go='install']") || $(".card.menu") || $("#main")
    }
  ];

  let i = 0, root = null, welcome = null, prevView = null, started = false;
  const seen = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return !!(v && v.seen); } catch (e) { return false; } };
  const markSeen = () => { try { localStorage.setItem(KEY, JSON.stringify({ seen: true, at: Date.now() })); } catch (e) {} };
  const legalOpen = () => !!document.getElementById("ptlg");
  const legalOK = () => {
    if (legalOpen()) return false;
    try { const v = JSON.parse(localStorage.getItem("poolTrainer.legalAgreed")); return !!(v && v.version); } catch (e) { return !!window.__ptAgreedSession; }
  };
  const goView = (v) => { if (v && window.PT_goView && (!window.PT_curView || PT_curView() !== v)) PT_goView(v); };
  const clearHash = () => {
    const h = (location.hash || "").replace(/^#/, "").toLowerCase();
    if (HASHES[h] && history.replaceState) {
      const v = (window.PT_curView && PT_curView()) || "today";
      history.replaceState(null, "", "#" + v);
    }
  };

  function hideForFs(on) {
    [root, welcome].forEach((el) => { if (el) el.classList.toggle("pttour-fs", !!on); });
  }
  function fsOn() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains("labfs-on") || document.body.classList.contains("tcproj-on"));
  }
  function syncFs() { hideForFs(fsOn()); }

  function removeRoot() {
    if (root) { root.remove(); root = null; }
    if (welcome) { welcome.remove(); welcome = null; }
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onResize);
  }

  function close(fromUser) {
    if (fromUser) markSeen();
    const restore = prevView;
    prevView = null;
    started = false;
    removeRoot();
    if (restore && window.PT_goView && window.PT_curView && PT_curView() !== restore) PT_goView(restore);
    clearHash();
  }

  function onKey(e) {
    if (e.key !== "Escape") return;
    if (!root && !welcome) return;
    e.preventDefault();
    if (welcome) skipWelcome();
    else close(true);
  }

  let resizeT = 0;
  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (root) layout(); }, 60);
  }

  function paintWelcome() {
    if (welcome || started || legalOpen()) return;
    welcome = document.createElement("div");
    welcome.id = "pttour-welcome";
    welcome.innerHTML = `<div class="pttour-scrim" aria-hidden="true"></div>
      <div class="pttour-card pttour-welcome-card" role="dialog" aria-modal="true" aria-labelledby="pttour-wh" aria-describedby="pttour-wp">
        <h2 id="pttour-wh">New here? Take a 1-minute tour</h2>
        <p id="pttour-wp">A short walk through the basics. You can skip it, and you can replay it anytime from More.</p>
        <div class="pttour-acts">
          <button type="button" class="btn" data-tq="start">Start tour</button>
          <button type="button" class="btn ghost" data-tq="skip">Skip</button>
        </div>
      </div>`;
    document.body.appendChild(welcome);
    document.addEventListener("keydown", onKey, true);
    welcome.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tq]");
      if (!b) return;
      if (b.dataset.tq === "start") { markSeen(); welcome.remove(); welcome = null; start(); }
      else skipWelcome();
    });
    const sb = welcome.querySelector("[data-tq='start']");
    if (sb) setTimeout(() => sb.focus(), 0);
  }

  function skipWelcome() {
    markSeen();
    if (welcome) { welcome.remove(); welcome = null; }
    document.removeEventListener("keydown", onKey, true);
    clearHash();
  }

  function start(opts) {
    if (legalOpen()) return;
    markSeen();
    if (welcome) { welcome.remove(); welcome = null; }
    if (root) root.remove();
    if (window.PT_Install && PT_Install.close) try { PT_Install.close(); } catch (e) {}
    prevView = (opts && opts.restore === false) ? null : (window.PT_curView ? PT_curView() : null);
    if (prevView === "start") prevView = "more";
    started = true;
    i = 0;
    root = document.createElement("div");
    root.id = "pttour";
    root.innerHTML = `<div id="pttour-spot" hidden></div>
      <div class="pttour-card" role="dialog" aria-modal="true" aria-labelledby="pttour-h" aria-describedby="pttour-p">
        <div class="pttour-count" id="pttour-count"></div>
        <h2 id="pttour-h"></h2>
        <p id="pttour-p"></p>
        <div class="pttour-acts">
          <button type="button" class="btn ghost" data-tq="back">Back</button>
          <button type="button" class="btn ghost" data-tq="skip">Skip</button>
          <button type="button" class="btn" data-tq="next">Next</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tq]");
      if (!b) return;
      if (b.dataset.tq === "back") { if (i > 0) { i -= 1; show(); } }
      else if (b.dataset.tq === "skip") close(true);
      else if (b.dataset.tq === "next") {
        if (i >= STEPS.length - 1) { prevView = null; close(true); }
        else { i += 1; show(); }
      }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key !== "Tab" || !root) return;
      const bs = [...root.querySelectorAll("button:not([disabled])")];
      if (!bs.length) return;
      const k = bs.indexOf(document.activeElement);
      if (e.shiftKey && k <= 0) { e.preventDefault(); bs[bs.length - 1].focus(); }
      else if (!e.shiftKey && (k === bs.length - 1 || k < 0)) { e.preventDefault(); bs[0].focus(); }
    });
    clearHash();
    show();
    syncFs();
  }

  function show() {
    const step = STEPS[i];
    if (!step || !root) return;
    goView(step.view);
    const n = STEPS.length;
    $("#pttour-count", root).textContent = "Step " + (i + 1) + " of " + n;
    $("#pttour-h", root).textContent = step.title;
    $("#pttour-p", root).textContent = step.body;
    const back = $("[data-tq='back']", root);
    const next = $("[data-tq='next']", root);
    back.disabled = i === 0;
    next.textContent = i >= n - 1 ? "Done" : "Next";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { setTimeout(layout, 50); });
    });
    setTimeout(() => { if (next) next.focus(); }, 0);
  }

  function layout() {
    if (!root) return;
    const step = STEPS[i];
    const card = $(".pttour-card", root);
    const spot = $("#pttour-spot", root);
    if (!card || !spot) return;
    let el = null;
    try { el = step && step.target ? step.target() : null; } catch (e) { el = null; }
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > window.innerHeight) el = null;
    } else el = null;
    const pad = 6;
    if (el) {
      const r = el.getBoundingClientRect();
      spot.hidden = false;
      spot.style.top = Math.max(0, r.top - pad) + "px";
      spot.style.left = Math.max(0, r.left - pad) + "px";
      spot.style.width = Math.min(window.innerWidth, r.width + pad * 2) + "px";
      spot.style.height = Math.min(window.innerHeight, r.height + pad * 2) + "px";
      spot.style.borderRadius = window.getComputedStyle(el).borderRadius || "14px";
    } else {
      spot.hidden = true;
      spot.removeAttribute("style");
    }
    card.style.transform = "none";
    const ch = card.offsetHeight, cw = card.offsetWidth;
    const vw = window.innerWidth, vh = window.innerHeight;
    const m = 12, safeT = 8, safeB = 12;
    let top, left;
    if (el) {
      const r = el.getBoundingClientRect();
      const below = vh - r.bottom - m - safeB;
      const above = r.top - m - safeT;
      if (below >= ch + 4) top = r.bottom + 10;
      else if (above >= ch + 4) top = r.top - ch - 10;
      else top = Math.max(safeT, (vh - ch) / 2);
      left = r.left + r.width / 2 - cw / 2;
    } else {
      top = Math.max(safeT, (vh - ch) / 2);
      left = (vw - cw) / 2;
    }
    left = Math.max(m, Math.min(left, vw - cw - m));
    top = Math.max(safeT, Math.min(top, vh - ch - safeB));
    card.style.top = top + "px";
    card.style.left = left + "px";
  }

  function maybeWelcome() {
    if (started || welcome || legalOpen()) return;
    if (HASHES[bootHash] || HASHES[(location.hash || "").replace(/^#/, "").toLowerCase()]) {
      if (!legalOK()) return;
      markSeen();
      start({ restore: false });
      return;
    }
    if (!seen() && legalOK()) paintWelcome();
  }

  function boot() {
    const t = setInterval(() => {
      if (started) { clearInterval(t); return; }
      if (!legalOK()) return;
      clearInterval(t);
      maybeWelcome();
    }, 400);
    maybeWelcome();
  }

  document.addEventListener("fullscreenchange", syncFs);
  document.addEventListener("webkitfullscreenchange", syncFs);
  document.addEventListener("webkitbeginfullscreen", () => hideForFs(true), true);
  document.addEventListener("webkitendfullscreen", syncFs, true);
  const mo = new MutationObserver(syncFs);
  if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  else document.addEventListener("DOMContentLoaded", () => mo.observe(document.body, { attributes: true, attributeFilter: ["class"] }));

  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace(/^#/, "").toLowerCase();
    if (HASHES[h] && legalOK() && !started) start({ restore: false });
  });

  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);

  window.PT_Tour = {
    start: () => start(),
    close: () => close(true),
    maybeWelcome,
    active: () => !!(root || welcome),
    steps: STEPS.map((s) => s.title)
  };
})();
