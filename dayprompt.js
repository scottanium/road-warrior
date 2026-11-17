// Training-day start prompt: test first (scores shape the plan) or generate a general session.
// Waits until the legal notice and the Get Started tour are done, and asks at most once a day.
(function () {
  const KEY = "pt_dayprompt";
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const ld = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch (e) { return {}; } };
  const sv = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };

  const legalOpen = () => !!document.getElementById("ptlg");
  const legalOK = () => {
    if (legalOpen()) return false;
    try { const v = JSON.parse(localStorage.getItem("poolTrainer.legalAgreed")); return !!(v && v.version); } catch (e) { return !!window.__ptAgreedSession; }
  };
  const tourActive = () => !!(window.PT_Tour && PT_Tour.active && PT_Tour.active());
  const tourSeen = () => { try { const v = JSON.parse(localStorage.getItem("pt_tour") || "null"); return !!(v && v.seen); } catch (e) { return false; } };
  const askedToday = () => ld().date === today();
  const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains("labfs-on") || document.body.classList.contains("tcproj-on"));

  function shouldShow() {
    if (legalOpen() || !legalOK()) return false;
    if (tourActive() || !tourSeen()) return false;
    if (askedToday()) return false;
    if (fsOn()) return false;
    if (document.getElementById("ptday")) return false;
    if (window.PT_curView && PT_curView() !== "today") return false;
    return true;
  }

  function mark(extra) {
    sv(Object.assign({}, ld(), { date: today() }, extra || {}));
  }

  function saveCardIfFilled() {
    const root = $("#ptday .rating-card");
    if (!root || !window.Adaptive || !Adaptive.saveRatingFromCard) return null;
    const f = root.querySelector('[data-rt="f"]');
    const uf = root.querySelector('[data-rt="uf"]');
    const csi = root.querySelector('[data-rt="csi"]');
    const other = root.querySelector('[data-rt="other"]');
    const typed = (f && f.value.trim()) || (csi && csi.value.trim()) || (other && other.value.trim()) || (uf && uf.checked);
    if (!typed) return Adaptive.prof();
    return Adaptive.saveRatingFromCard(root, { allowEmptyFargo: !(uf && uf.checked) });
  }

  function hide() {
    const el = document.getElementById("ptday");
    if (el) el.remove();
    document.removeEventListener("keydown", onKey, true);
  }

  function onKey(e) {
    if (e.key !== "Escape") return;
    if (!document.getElementById("ptday")) return;
    e.preventDefault();
    // Escape is the same as "don't ask again today" so the day can start without a trapped overlay.
    quiet();
  }

  function goToday() {
    if (window.PT_goView) PT_goView("today");
    else if (window.PT_render) PT_render();
  }

  function testPath() {
    const p = saveCardIfFilled();
    if (p === false) return;
    const ids = (window.Adaptive && Adaptive.usefulTests) ? Adaptive.usefulTests(p || Adaptive.prof()).map((t) => t.id) : [];
    mark({ action: "test", useAdaptive: true });
    hide();
    if (window.PT_startTests) PT_startTests(ids);
    else if (window.PT_goView) PT_goView("tests");
  }

  function trainPath() {
    const p = saveCardIfFilled();
    if (p === false) return;
    const prof = p || (window.Adaptive && Adaptive.prof()) || {};
    if (window.Adaptive && Adaptive.generate) {
      try {
        const keep = JSON.parse(localStorage.getItem("pt_aplan") || "null");
        const pl = Adaptive.generate(prof, keep);
        localStorage.setItem("pt_aplan", JSON.stringify(pl));
      } catch (e) {}
    }
    mark({ action: "train", useAdaptive: true });
    hide();
    goToday();
  }

  function quiet() {
    mark({ action: "quiet", useAdaptive: false });
    hide();
  }

  function show() {
    if (document.getElementById("ptday")) return;
    const A = window.Adaptive || {};
    const p = A.prof ? A.prof() : {};
    const sum = A.ratingSummary ? A.ratingSummary(p) : null;
    const useful = (A.usefulTests ? A.usefulTests(p) : []).slice(0, 5);
    const names = useful.map((t) => t.name.replace(", set up as a ", " ").split(" (")[0]);
    const levelLine = sum
      ? (sum.set ? "Using your rating: " + sum.lvl + " · " + sum.text + "." : sum.text)
      : "If you have not entered a rating, I'll treat you as Intermediate.";
    const o = document.createElement("div");
    o.id = "ptday";
    o.innerHTML = `<div class="ptday-scrim" aria-hidden="true"></div>
      <div class="ptday-card" role="dialog" aria-modal="true" aria-labelledby="ptday-h" aria-describedby="ptday-p">
        <h2 id="ptday-h">Start today's practice?</h2>
        <p id="ptday-p">Want to test your skills first so I can build today's workout around you? Your scores tell the app where to spend the time. If you'd rather just train, I'll put together a solid session for your estimated level.</p>
        <p class="meta">${esc(levelLine)}</p>
        ${A.ratingCardHTML ? A.ratingCardHTML(esc, { id: "day", saveBtn: false, compact: true }) : ""}
        <div class="ptday-acts">
          <button type="button" class="btn" data-dp="test">Test my skills</button>
          <div class="meta" style="margin-top:-4px">Results shape today's plan${names.length ? ": " + names.map(esc).join(", ") : ""}.</div>
          <button type="button" class="btn ghost" data-dp="train">No thanks, just train</button>
          <button type="button" class="ptday-quiet" data-dp="quiet">Don't ask again today</button>
        </div>
      </div>`;
    document.body.appendChild(o);
    document.addEventListener("keydown", onKey, true);
    if (A.wireRatingCard) A.wireRatingCard($(".rating-card", o), null);
    o.addEventListener("click", (e) => {
      const b = e.target.closest("[data-dp]");
      if (!b) return;
      if (b.dataset.dp === "test") testPath();
      else if (b.dataset.dp === "train") trainPath();
      else if (b.dataset.dp === "quiet") quiet();
    });
    const tb = $('[data-dp="test"]', o);
    if (tb) setTimeout(() => tb.focus(), 0);
  }

  function maybeShow() {
    if (shouldShow()) show();
  }

  function boot() {
    const t = setInterval(() => {
      if (document.getElementById("ptday")) { clearInterval(t); return; }
      if (!legalOK() || tourActive() || !tourSeen()) return;
      maybeShow();
      if (askedToday() || document.getElementById("ptday")) clearInterval(t);
    }, 400);
    maybeShow();
  }

  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);

  window.PT_DayPrompt = { maybeShow, hide, shouldShow, askedToday, today, KEY };
})();
