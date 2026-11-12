// "Add to Home Screen" install sheet. Local only: no tracking, no external assets.
(function(){
  const K = "pt_install", NAME = "The Road Warrior";
  const ua = navigator.userAgent || "";
  const isIPad = /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIOS = /iPhone|iPod/.test(ua) || isIPad;
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|Snapchat|LinkedInApp|GSA\//.test(ua);
  const otherIOS = isIOS && (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|Brave/.test(ua) || inApp || !/Safari/.test(ua));
  const isAndroid = /Android/.test(ua);
  const standalone = () => navigator.standalone === true || (window.matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: minimal-ui)").matches));
  const ld = () => { try { return JSON.parse(localStorage.getItem(K) || "{}") || {}; } catch (e) { return {}; } };
  const sv = (o) => { try { localStorage.setItem(K, JSON.stringify(Object.assign(ld(), o))); } catch (e) {} };
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; if (open.el && open.el.dataset.v === "android") paint(open.el, "android"); else autoShow(); });
  window.addEventListener("appinstalled", () => { sv({ installed: Date.now() }); close(); });

  const I = {
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>',
    vdots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/></svg>',
    compass: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" fill="currentColor"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="m8 12.3 2.7 2.7L16 9.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const icon = () => { const l = document.querySelector('link[rel="apple-touch-icon"]'); return l && l.href ? `<img class="ins-ic" src="${l.href}" alt="" width="52" height="52">` : `<span class="ins-ic ins-ic8" aria-hidden="true">8</span>`; };
  const step = (n, ic, html) => `<li><span class="ins-n" aria-hidden="true">${n}</span><span class="ins-g">${ic}</span><span class="ins-t">${html}</span></li>`;
  const variant = () => standalone() ? "installed" : isIOS ? (otherIOS ? "iosother" : "ios") : isAndroid ? "android" : "desktop";
  function body(v){
    if (v === "installed") return { sub: "You're using the installed app. Nothing else to do.", steps: "", btn: "" };
    if (v === "ios") return { sub: "Add it to your Home Screen for full-screen use and offline access.", steps: `<ol class="ins-steps">${step(1, I.share, `Tap the <b>Share</b> button <span class="ins-dim">(or tap <span class="ins-inl">${I.dots}</span> then Share)</span>`).replace("</li>", `<span class="ins-arrow" aria-hidden="true" title="">${I.down}</span></li>`)}${step(2, I.plus, `Choose <b>Add to Home Screen</b> <span class="ins-dim">(scroll down if you don't see it)</span>`)}${step(3, I.add, `Tap <b>Add</b>`)}</ol>`, btn: "" };
    if (v === "iosother") return { sub: inApp ? "This in-app browser can't install apps. Open the page in Safari first." : "To install, open this page in Safari.", steps: `<ol class="ins-steps">${step(1, inApp ? I.dots : I.link, inApp ? `Tap <b>•••</b> and choose <b>Open in Safari</b> <span class="ins-dim">(or open in browser)</span>` : `Tap <b>Copy link</b> below, then open <b>Safari</b> and paste it`)}${step(2, I.share, `In Safari, tap <b>Share</b> <span class="ins-dim">(or <span class="ins-inl">${I.dots}</span> then Share)</span>`)}${step(3, I.plus, `Choose <b>Add to Home Screen</b>, then <b>Add</b>`)}</ol>${/CriOS/.test(ua) ? `<p class="ins-note">On iOS 16.4 or later, Chrome's own Share menu also has Add to Home Screen.</p>` : ""}`, btn: inApp ? "" : `<button class="ins-pri" data-ins="copy">Copy link</button>` };
    if (v === "android") return deferred ? { sub: "Install it for full-screen use and offline access.", steps: "", btn: `<button class="ins-pri" data-ins="prompt">Install</button>` } : { sub: "Add it to your Home Screen for full-screen use and offline access.", steps: `<ol class="ins-steps">${step(1, I.vdots, `Tap the browser menu <b>⋮</b>`)}${step(2, I.plus, `Choose <b>Install app</b> or <b>Add to Home screen</b>`)}${step(3, I.add, `Tap <b>Install</b>`)}</ol>`, btn: "" };
    return deferred ? { sub: "Install it as an app on this computer.", steps: "", btn: `<button class="ins-pri" data-ins="prompt">Install</button>` } : { sub: "Best on iPhone: open this page in Safari and add it to your Home Screen.", steps: `<ol class="ins-steps">${step(1, I.compass, `On a computer, Chrome or Edge shows an <b>install</b> icon in the address bar; in Safari on a Mac use <b>File → Add to Dock</b>`)}</ol>`, btn: "" };
  }
  function paint(el, v){
    const b = body(v), manual = el.dataset.manual === "1";
    el.dataset.v = v; el.className = "ins-sheet" + (isIPad && v === "ios" ? " ins-ipad" : "") + (manual ? " ins-manual" : "");
    el.innerHTML = `<div class="ins-head">${icon()}<div class="ins-hd"><h2 id="ins-title">${v === "installed" ? `${I.ok} Installed` : "Install " + NAME}</h2><p class="ins-sub">${b.sub}</p></div><button class="ins-x" data-ins="x" aria-label="Close install instructions">${I.x}</button></div>${b.steps}
      <div class="ins-acts">${b.btn}${manual || v === "installed" ? `<button class="ins-sec" data-ins="done">Done</button>` : `<button class="ins-sec" data-ins="snooze">Not now</button><button class="ins-lnk" data-ins="never">Don't show again</button>`}</div><p class="ins-msg" role="status" aria-live="polite"></p>
`;
    setH();
  }
  const setH = () => { const el = open.el; document.documentElement.style.setProperty("--insh", el && !el.classList.contains("ins-ipad") ? el.offsetHeight + 12 + "px" : "0px"); };
  function open(manual){
    if (open.el) { open.el.dataset.manual = manual ? "1" : open.el.dataset.manual; paint(open.el, variant()); if (manual) open.el.querySelector(".ins-x").focus(); return; }
    const el = document.createElement("section"); el.id = "ptinstall"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "false"); el.setAttribute("aria-labelledby", "ins-title"); el.dataset.manual = manual ? "1" : "0";
    open.el = el; document.body.appendChild(el); paint(el, variant()); document.body.classList.add("ins-open");
    requestAnimationFrame(() => { el.classList.add("in"); setH(); });
    if (manual) setTimeout(() => el.querySelector(".ins-x").focus(), 30);
  }
  function close(){ const el = open.el; if (!el) return; open.el = null; document.body.classList.remove("ins-open"); document.documentElement.style.setProperty("--insh", "0px"); el.remove(); }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ins]"); if (!b) return; const a = b.dataset.ins, manual = open.el && open.el.dataset.manual === "1";
    if (a === "x" || a === "snooze") { if (!manual) sv({ snoozeUntil: Date.now() + 7 * 864e5 }); close(); }
    else if (a === "never") { sv({ never: true }); close(); }
    else if (a === "done") close();
    else if (a === "prompt" && deferred) { deferred.prompt(); (deferred.userChoice || Promise.resolve({})).then((r) => { if (r && r.outcome === "accepted") { sv({ installed: Date.now() }); close(); } }); deferred = null; }
    else if (a === "copy") { const m = open.el.querySelector(".ins-msg"); const done = () => { m.textContent = "Link copied. Now open Safari and paste it."; }; try { navigator.clipboard.writeText(location.href.split("#")[0]).then(done, () => { m.textContent = location.href.split("#")[0]; }); } catch (err) { m.textContent = location.href.split("#")[0]; } }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open.el) { if (open.el.dataset.manual !== "1") sv({ snoozeUntil: Date.now() + 7 * 864e5 }); close(); } });
  window.addEventListener("resize", setH);
  // auto-show: only when not installed, after the legal notice is accepted, not on desktop without a prompt
  const legalOK = () => { if (document.getElementById("ptlg")) return false; try { const v = JSON.parse(localStorage.getItem("poolTrainer.legalAgreed")); return !!(v && v.version); } catch (e) { return !!window.__ptAgreedSession; } };
  const tourBusy = () => !!(document.getElementById("pttour") || document.getElementById("pttour-welcome") || (window.PT_Tour && PT_Tour.active && PT_Tour.active()));
  function eligible(){ const s = ld(); if (standalone() || s.never || s.installed || (s.snoozeUntil && Date.now() < s.snoozeUntil)) return false; const v = variant(); return v === "ios" || v === "iosother" || v === "android" || (v === "desktop" && !!deferred); }
  let waiting = false;
  function autoShow(){ if (open.el || waiting || !eligible()) return; waiting = true; const t = setInterval(() => { if (!eligible()) { clearInterval(t); waiting = false; return; } if (legalOK() && !tourBusy()) { clearInterval(t); setTimeout(() => { waiting = false; if (eligible() && legalOK() && !document.getElementById("ptlg") && !tourBusy()) open(false); else if (eligible()) autoShow(); }, 1500); } }, 700); }
  if (document.readyState === "complete") autoShow(); else window.addEventListener("load", autoShow);
  window.PT_Install = { open: () => open(true), close, variant, standalone };
})();
