(function(){
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const L = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const inTab = (g, t) => g === "all" || g.split(",").includes(t);
const LIBTABS = GAMES.filter((g) => g.value !== "reg" && g.value !== "ins");
const st = Object.assign({ view: "today", game: "fund", q: "", lvl: "all", cat: "all", typ: "all", plat: "all", all: false, day: null }, L("pt_state", {}));
{ const hv = location.hash.slice(1); if (["today","lib","plan","log","ins","geo","lab","tests","tour","more","warm","rate","prof","rules","license"].includes(hv)) st.view = hv; }
const save = () => S("pt_state", { view: st.view, game: st.game, lvl: st.lvl, cat: st.cat, typ: st.typ, plat: st.plat });
const link = (s, label) => `<a class="btn" href="${esc(url(s))}" target="_blank" rel="noopener">${esc(label || "Open source")}</a>`;
const isYT = (s) => !s.startsWith("http") && !s.startsWith("/");
const srcLabel = (s) => isYT(s) || /youtube\.com|youtu\.be/.test(s) ? "▶ Watch video" : /\.pdf$/i.test(s) ? "Open PDF" : "Open page";
const fmt = (t) => Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
const vbtns = (list) => !list || !list.length ? "" : `<div class="vids">${list.map(([lab, src, t, kind]) => {
  if (kind === "none" || kind === "rest") return `<span class="btn none">${esc(kind === "rest" ? lab : (lab.includes("No video") || lab.includes("no video") ? lab : "No video found"))}</span>`;
  let u = url(src); if (t && isYT(src)) u += "&t=" + t + "s";
  const pre = kind === "read" ? "📄 " : "▶ ";
  return `<a class="btn vid" href="${esc(u)}" target="_blank" rel="noopener">${pre}${kind === "read" ? "" : "Watch example: "}${esc(lab)}${t ? " (from " + fmt(t) + ")" : ""}</a>`;
}).join("")}</div>` + (window.Layouts ? window.Layouts.forList(list) : "");
window.PT_goView = (v) => { st.view = v; save(); render(); };
window.PT_goLab = () => { st.view = "lab"; st.labtab = "table"; save(); render(); };
if (/aired\.sh$/.test(location.hostname)) document.documentElement.classList.add("aired");
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };

function card(e){
  const games = e[1].split(",").map((g) => GL[g] || g).join(", ");
  return `<div class="card"><div class="t">${esc(e[0])}</div>
  <div class="meta">${esc(TYP[e[3]])} · ${esc(CAT[e[2]])} · ${e[7]} min</div>
  <div class="meta">${esc(e[5])} · ${esc(PLAT[e[6]] || e[6])} · ${esc(games)}</div>
  <div class="desc">${esc(e[8])}</div>${link(e[9], srcLabel(e[9]))}</div>`;
}
function xcard(x){
  return `<div class="card"><div class="t">${esc(x[0])}</div>
  <div class="meta">${esc(x[3])} · ${esc(PLAT[x[4]] || x[4])} · ${x[5]} min</div>
  <div class="desc">${esc(x[6])}</div>${link(x[7], srcLabel(x[7]))}</div>`;
}
function rcard(x){
  return `<div class="card"><div class="t">${esc(x[0])}</div>
  <div class="meta">${esc(x[2])} · ${esc(PLAT[x[3]] || x[3])} · ${x[4]} min</div>
  <div class="desc">${esc(x[5])}</div>${vbtns([[isYT(x[6]) ? x[2] : "Read: " + x[2] + (/\.pdf$/i.test(x[6]) ? " (PDF)" : " (page)"), x[6], x[7], isYT(x[6]) ? undefined : "read"]])}</div>`;
}
function checkHTML(){
  return `<div class="card"><div class="t">Diagnostic checklist: aim, alignment or stroke?</div>${CHECK.map((c) => `<div class="block"><div><div class="t">${esc(c[0])}</div><div class="muted">${esc(c[1])}</div><div class="desc" style="margin-top:4px">${esc(c[2])}</div>${vbtns(c[3])}</div></div>`).join("")}</div>`;
}
function rcLevels(rows, openAll){
  return Object.keys(LVL).map((k) => { const r = rows.filter((x) => x[1] === k); return r.length ? `<details ${openAll?"open":""}><summary>${LVL[k]} (${r.length})</summary><div class="inner">${r.map(rcard).join("")}</div></details>` : ""; }).join("");
}
const opts = (obj, cur, allLabel) => `<option value="all">${allLabel}</option>` + Object.keys(obj).map((k) => `<option value="${k}" ${cur===k?"selected":""}>${esc(obj[k])}</option>`).join("");

function renderLib(){
  $("#title").textContent = GL[st.game];
  $("#headx").innerHTML = `<input type="search" id="q" placeholder="Search drills, tips, instructors…" value="${esc(st.q)}">
  <div class="chips" id="gchips">${LIBTABS.map((g) => `<button class="chip ${g.value===st.game?"on":""}" data-g="${g.value}">${esc(g.label)}</button>`).join("")}</div>`;
  $("#q").oninput = (ev) => { st.q = ev.target.value; body(); };
  document.querySelectorAll("#gchips .chip").forEach((b) => b.onclick = () => { st.game = b.dataset.g; save(); render(); });
  const on = document.querySelector("#gchips .chip.on"); if (on) on.scrollIntoView({inline:"center", block:"nearest"});
  body();
  function body(){
    const s = st.q.trim().toLowerCase();
    const pool = DATA.filter((e) => (st.all && s) ? true : inTab(e[1], st.game));
    const r = pool.filter((e) => (!s || (e[0]+" "+e[8]+" "+e[5]+" "+CAT[e[2]]).toLowerCase().includes(s)) &&
      (st.lvl==="all"||e[4]===st.lvl) && (st.cat==="all"||e[2]===st.cat) && (st.typ==="all"||e[3]===st.typ) && (st.plat==="all"||e[6]===st.plat))
      .sort((a,b) => a[0].localeCompare(b[0]));
    const cats = {}; pool.forEach((e) => cats[e[2]] = CAT[e[2]]);
    let h = "";
    if (st.game === "fun") h += `<div class="callout">Use these on days you play longer than 3 hours (up to 8). Each one is still scored, so you can log it: Bowliards (out of 300), Golf (strokes), Equal Offense (out of 200), and 3-ball (strokes or runs out of 20).</div>`;
    if (st.game === "fund") {
      const rq = RC.filter((x) => (!s || (x[0]+" "+x[5]+" "+x[2]).toLowerCase().includes(s)) && (st.lvl === "all" || x[1] === st.lvl));
      h += `<details id="rcfix" class="rc" ${s && rq.length ? "open" : ""}><summary>🎯 Right-Cut Fix: checklist + ${rq.length} items</summary><div class="inner"><div class="callout">${esc(RC_INTRO)}</div>${checkHTML()}${rcLevels(rq, true)}</div></details>`;
    }
    h += `<div class="row"><select id="flvl">${opts(LVL, st.lvl, "All levels")}</select><select id="fcat">${opts(cats, st.cat, "All categories")}</select></div>
    <div class="row"><select id="ftyp">${opts(TYP, st.typ, "All types")}</select><select id="fplat">${opts(PLAT, st.plat, "All platforms")}</select></div>
    <div class="row"><label class="muted" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="fall" ${st.all?"checked":""} style="width:22px;height:22px"> Search all games</label><button class="btn ghost" id="freset">Reset</button></div>
    <div class="count">${r.length} entries</div>`;
    Object.keys(LVL).forEach((k) => {
      const rows = r.filter((e) => e[4] === k); if (!rows.length) return;
      h += `<details ${k==="B"||k==="I"||s?"open":""}><summary>${LVL[k]} (${rows.length})</summary><div class="inner">${rows.map(card).join("")}</div></details>`;
    });
    const xd = XD.filter((x) => inTab(x[1], st.game) || x[1] === "all");
    h += `<h2>Cross-Eye Dominant: ${esc(GL[st.game])}</h2><div class="callout">You're left-handed, right-eye dominant, and shoot right-handed. Start with the vision-center test rather than assuming the cue goes under your right eye. Dr. Dave notes it can fall under the dominant eye, the nose, or in between, and it differs from person to person.</div>`;
    Object.keys(LVL).forEach((k) => {
      const rows = xd.filter((x) => x[2] === k); if (!rows.length) return;
      h += `<details><summary>${LVL[k]} (${rows.length})</summary><div class="inner">${rows.map(xcard).join("")}</div></details>`;
    });
    h += `<h3>Right-Cut Fix: vision and alignment items</h3><p class="muted">You miss more cuts to the right. These are the items that check head position and visual alignment. The full Right-Cut Fix section and checklist are in Fundamentals.</p>` + rcLevels(RC.filter((x) => x[8]), false);
    $("#main").innerHTML = h;
    const bind = (id, key) => { $(id).onchange = (ev) => { st[key] = ev.target.value; save(); body(); }; };
    bind("#flvl","lvl"); bind("#fcat","cat"); bind("#ftyp","typ"); bind("#fplat","plat");
    $("#fall").onchange = (ev) => { st.all = ev.target.checked; body(); };
    $("#freset").onclick = () => { Object.assign(st, {q:"",lvl:"all",cat:"all",typ:"all",plat:"all",all:false}); $("#q").value=""; save(); body(); };
  }
}

let AUI = null, TUI = null;
const aui = () => AUI || (AUI = window.Adaptive.ui($, esc, url, vbtns, save, st, () => render()));
const tui = () => TUI || (TUI = window.Tour.ui($, esc, save, st, () => render()));
function dayHTML(d, dateKey){
  const done = dateKey ? L("pt_done_" + dateKey, {}) : null;
  return `<div class="card"><div class="t">${esc(d.day)}: ${esc(d.theme)}</div>${d.blocks.map((b, i) => `<div class="block">${done?`<input type="checkbox" data-i="${i}" ${done[i]?"checked":""}>`:""}<div><div class="t">${esc(b[0])}</div><div class="muted">${esc(b[1])}</div>${vbtns((STEPV[d.day] || [])[i])}</div></div>`).join("")}</div>`;
}
function renderToday(){
  const dow = DOW[new Date().getDay()];
  const d = DAYS.find((x) => x.day === dow);
  $("#title").textContent = "Today · " + new Date().toLocaleDateString(undefined, {weekday:"long", month:"short", day:"numeric"});
  $("#headx").innerHTML = "";
  let h = "";
  const P = window.Adaptive.prof();
  if (P.mode === "adaptive") {
    const ta = aui().todayAdaptive();
    h += `<div class="callout">Showing your <b>adaptive plan</b>. <a href="#" id="goap">See the week and why</a> · switch back in Profile.</div>`;
    const TK = ta.day ? "today:" + today() + ":a" : null;
    if (ta.day && window.StepTimer) h += window.StepTimer.panel(TK, "Today's plan (" + ta.day.day + ")", "today", ta.day.blocks.map((b) => ({ t: b.t, sec: b.min ? b.min * 60 : null })));
    h += ta.day ? ta.html(ta.day) : `<div class="callout">Rest day in your adaptive plan (${ta.pl.days.map((x) => x.day).join(", ")}). Try the warm-up or a fun game.</div>`;
    h += `<div class="row"><button class="btn ghost" id="gowarm">Pre-match warm-up</button><button class="btn ghost" id="gotests">Log a test score</button></div>`;
    $("#main").innerHTML = h;
    if (TK && window.StepTimer) { document.querySelectorAll("#main .block").forEach((el, i) => window.StepTimer.mark(el, TK, i)); window.StepTimer.refresh(); }
    $("#goap").onclick = (e) => { e.preventDefault(); st.view = "plan"; st.pmode = "adaptive"; save(); render(); };
    $("#gowarm").onclick = () => { st.view = "warm"; save(); render(); };
    $("#gotests").onclick = () => { st.view = "tests"; save(); render(); };
    return;
  }
  if (d) {
    const TK = "today:" + today() + ":b";
    if (window.StepTimer) h += window.StepTimer.panel(TK, "Today's plan (" + d.day + ")", "today", d.blocks.map((b) => window.StepTimer.parseRange(b[0])));
    h += `<p class="muted">Tick blocks as you finish them. Ticks are saved on this phone for today.</p>` + dayHTML(d, today());
    setTimeout(() => { if (window.StepTimer) { document.querySelectorAll("#main .card .block").forEach((el, i) => { if (i < d.blocks.length) window.StepTimer.mark(el, TK, i); }); window.StepTimer.refresh(); } }, 0);
    const bm = { Mon: "3-ball run-out drill", Tue: "Wagon wheel (out of 20)", Wed: "Safety drill (Big Brother Little Brother)", Thu: "Half Equal Offense (5 innings)", Fri: "9-ball ghost race to 7" }[dow];
    h += `<button class="btn" id="golog" style="width:100%;margin-top:6px">Log today's score: ${esc(bm)}</button>`;
    if (dow === "Fri") h += `<button class="btn" id="gorl" style="width:100%;margin-top:6px">Log right vs left cuts</button>`;
    h += `<div class="callout">Right-cut work today. If a step isn't clear, open the checklist: <a href="#" id="gochk">Right-Cut Fix checklist</a></div>`;
    setTimeout(() => { const b = $("#golog"); if (b) b.onclick = () => { st.view = "log"; st.prefill = bm; render(); };   const g = $("#gorl"); if (g) g.onclick = () => { st.view = "log"; st.prefill = "Right cuts: BU F1 (out of 10)"; render(); }; const c = $("#gochk"); if (c) c.onclick = (ev) => { ev.preventDefault(); st.view = "plan"; render(); setTimeout(() => { const t = document.getElementById("rcplan"); if (t) t.scrollIntoView(); }, 50); }; }, 0);
  } else {
    h += `<div class="callout">Rest day. The plan is 5 days (Mon–Fri). If you want to play, pick a fun game, or preview Monday below.</div>`;
    h += `<button class="btn" id="gofun" style="width:100%">Open Fun Drills & Games</button>`;
    h += `<h3>Next: Monday</h3>` + dayHTML(DAYS[0], null);
    setTimeout(() => { $("#gofun").onclick = () => { st.view = "lib"; st.game = "fun"; save(); render(); }; }, 0);
  }
  h += `<h3>Back-friendly reminders</h3>` + BACK.map((b, i) => `<div class="card"><div>${esc(b.split("|")[0])}</div>${vbtns(BACKNV[i])}</div>`).join("");
  $("#main").innerHTML = h;
  document.querySelectorAll(".block input").forEach((c) => c.onchange = () => { const k = "pt_done_" + today(); const v = L(k, {}); v[c.dataset.i] = c.checked; S(k, v); });
}

function renderPlan(){
  $("#title").textContent = "Daily Training Regimen";
  const pm = st.pmode || (window.Adaptive.prof().mode === "adaptive" ? "adaptive" : "built");
  const pmc = `<div class="chips"><button class="chip ${pm==="built"?"on":""}" data-pm="built">Built plan (3 h × 5)</button><button class="chip ${pm==="adaptive"?"on":""}" data-pm="adaptive">Adaptive plan</button><button class="chip" data-pm="prof">⚙ Profile</button></div>`;
  const wirePm = () => document.querySelectorAll("[data-pm]").forEach((b) => b.onclick = () => { if (b.dataset.pm === "prof") { st.view = "prof"; save(); return render(); } st.pmode = b.dataset.pm; renderPlan(); });
  if (pm === "adaptive") { $("#headx").innerHTML = pmc; wirePm(); aui().renderAPlan($("#main")); $("#title").textContent = "Adaptive Plan"; return; }
  const sel = st.day || (DAYS.find((x) => x.day === DOW[new Date().getDay()]) || DAYS[0]).day;
  $("#headx").innerHTML = pmc + `<div class="chips">${DAYS.map((d) => `<button class="chip ${d.day===sel?"on":""}" data-d="${d.day}">${d.day}: ${esc(d.theme)}</button>`).join("")}</div>`;
  wirePm(); document.querySelectorAll("#headx .chip[data-d]").forEach((b) => b.onclick = () => { st.day = b.dataset.d; renderPlan(); });
  let h = `<p class="muted">${esc(REG_INTRO)}</p>` + dayHTML(DAYS.find((d) => d.day === sel), null);
  h += `<h2>Weekly overview</h2>` + WEEKLY.map((w) => `<div class="card"><div class="t">${w[0]}</div><div class="meta">Stroke: ${esc(w[1])}</div><div class="meta">Focus: ${esc(w[2])}</div><div class="meta">Game: ${esc(w[3])}</div><div class="meta">Pressure: ${esc(w[4])}</div></div>`).join("");
  h += `<h2>Benchmarks to log</h2>` + BENCH.map((b) => `<div class="card"><div class="t">${esc(b[0])}</div><div class="meta">${esc(b[1])}</div><div class="desc">${esc(b[2])}</div>${link(b[3], "Rules / source")}${vbtns(BENCHV.map((x)=>x)[BENCH.indexOf(b)])}</div>`).join("");
  h += `<p class="muted">To judge consistency, look at the spread between your best and worst score each week as well as the average. The Log tab shows this for you.</p>`;
  h += `<h2 id="rcplan">Right-Cut Fix checklist</h2><div class="callout">${esc(RC_INTRO)} About 90 minutes a week of right-cut work is built into the days above, plus the Friday right-vs-left benchmark.</div>` + checkHTML();
  h += `<h2>4- to 12-week progression</h2>` + PROG.map((p) => `<div class="card"><div class="t">${esc(p[0])}: ${esc(p[1])}</div><div class="meta">${esc(p[2])}</div><div class="desc">${esc(p[3])}</div>${vbtns(PROGV[PROG.indexOf(p)])}</div>`).join("");
  h += `<h2>Back-friendly notes (general, not medical advice)</h2>` + BACK.map((b, i) => `<div class="card"><div>${esc(b.split("|")[0])}</div>${vbtns(BACKNV[i])}</div>`).join("");
  h += `<h2>Longer days (3 to 8 hours)</h2><div class="card">${esc(LONGER)}${vbtns(LONGERV)}</div>`;
  $("#main").innerHTML = h;
}

function renderLog(){
  $("#title").textContent = "Practice Log";
  $("#headx").innerHTML = "";
  const names = BENCH.map((b) => b[0]).concat(EXTRA_LOG);
  const pre = st.prefill || ""; st.prefill = null;
  const log = L("pt_log", []);
  let h = `<div class="card"><div class="row"><input type="date" id="ld" value="${today()}"></div>
  <div class="row"><select id="lb">${names.map((n) => `<option ${n===pre?"selected":""}>${esc(n)}</option>`).join("")}</select></div>
  <div class="row"><input type="text" id="lo" placeholder="Name (if Other)" style="display:none"></div>
  <div class="row"><input type="number" inputmode="decimal" id="ls" placeholder="Score"><input type="number" inputmode="decimal" id="lm" placeholder="Out of (optional)"></div>
  <div class="row"><textarea id="ln" placeholder="Session notes: what broke down, vision-center check, back"></textarea></div>
  <button class="btn" id="lsave" style="width:100%">Save entry</button></div>`;
  const by = {};
  log.forEach((e) => { if (e.score !== "" && e.score != null && !isNaN(+e.score)) (by[e.name] = by[e.name] || []).push(e); });
  const keys = Object.keys(by);
  if (keys.length) {
    h += `<h2>Progress by benchmark</h2>` + keys.map((k) => {
      const v = by[k].sort((a,b) => a.date.localeCompare(b.date)); const n = v.map((e) => +e.score);
      const avg = n.reduce((a,b) => a+b, 0) / n.length;
      const recent = v.slice(-7);
      return `<div class="card"><div class="t">${esc(k)}</div><div class="meta"><span class="stat">Entries ${n.length}</span><span class="stat">Avg ${avg.toFixed(1)}</span><span class="stat">Best ${Math.max(...n)}</span><span class="stat">Worst ${Math.min(...n)}</span><span class="stat">Spread ${Math.max(...n)-Math.min(...n)}</span></div>
      <div class="meta">First ${esc(v[0].date)}: ${v[0].score} · Latest ${esc(v[v.length-1].date)}: ${v[v.length-1].score}</div>
      <div class="meta">Recent: ${recent.map((e) => e.score).join(" → ")}</div></div>`;
    }).join("");
  }
  const gapCard = (rn, ln, label) => {
    const R = (by[rn] || []).slice().sort((a,b) => a.date.localeCompare(b.date)), Lf = (by[ln] || []).slice().sort((a,b) => a.date.localeCompare(b.date));
    if (!R.length || !Lf.length) return "";
    const dates = Array.from(new Set(R.map((e) => e.date))).filter((d) => Lf.some((e) => e.date === d));
    const rows = dates.map((d) => { const r = +R.filter((e) => e.date === d).pop().score, l = +Lf.filter((e) => e.date === d).pop().score; return [d, r, l, l - r]; });
    const lr = +R[R.length-1].score, ll = +Lf[Lf.length-1].score;
    return `<div class="card"><div class="t">${esc(label)}: right vs left gap</div><div class="meta"><span class="stat">Latest right ${lr}</span><span class="stat">Latest left ${ll}</span><span class="stat">Gap ${ll - lr}</span></div>${rows.length ? `<div class="meta">Same-day gaps (left minus right): ${rows.slice(-8).map((x) => x[0].slice(5) + " " + x[3]).join(" → ")}</div>` : ""}<div class="muted">The goal is a gap near 0.</div></div>`;
  };
  const gaps = gapCard("Right cuts: BU F1 (out of 10)", "Left cuts: BU F1 (out of 10)", "BU F1 cut drill") + gapCard("Colenso test: right side (out of 40)", "Colenso test: left side (out of 40)", "Colenso test");
  if (gaps) h += `<h2>Right-cut gap</h2>` + gaps;
  h += `<h2>All entries (${log.length})</h2>`;
  if (log.length) h += `<div class="row"><button class="btn ghost" id="lexp">Export CSV</button><button class="btn ghost" id="lclr">Delete all</button></div>`;
  h += log.slice().sort((a,b) => b.date.localeCompare(a.date) || b.ts - a.ts).map((e) => `<div class="card"><div class="t">${esc(e.date)} · ${esc(e.name)}</div>${e.score!==""&&e.score!=null?`<div class="meta">Score: ${esc(e.score)}${e.max?" / "+esc(e.max):""}</div>`:""}${e.notes?`<div class="desc">${esc(e.notes)}</div>`:""}<button class="btn ghost" data-del="${e.ts}">Delete</button></div>`).join("");
  h += `<p class="muted">Entries are saved only on this phone, in this browser or home-screen app. Use Export CSV now and then as a backup. For a backup of everything (including tournament history), open Events → 📒 History → Download full backup.</p>`;
  $("#main").innerHTML = h;
  const lb = $("#lb"), lo = $("#lo");
  lb.onchange = () => { lo.style.display = lb.value === "Other" ? "" : "none"; };
  $("#lsave").onclick = () => {
    const name = lb.value === "Other" ? (lo.value.trim() || "Other") : lb.value;
    const e = { ts: Date.now(), date: $("#ld").value || today(), name, score: $("#ls").value, max: $("#lm").value, notes: $("#ln").value.trim() };
    if (e.score === "" && !e.notes) { alert("Add a score or a note."); return; }
    const l = L("pt_log", []); l.push(e); S("pt_log", l); renderLog();
  };
  document.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { if (!confirm("Delete this entry?")) return; S("pt_log", L("pt_log", []).filter((e) => String(e.ts) !== b.dataset.del)); renderLog(); });
  const ex = $("#lexp"); if (ex) ex.onclick = () => {
    const rows = [["date","benchmark","score","out_of","notes"]].concat(L("pt_log", []).map((e) => [e.date, e.name, e.score, e.max, e.notes]));
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"})); a.download = "pool-log.csv"; a.click();
  };
  const cl = $("#lclr"); if (cl) cl.onclick = () => { if (confirm("Delete ALL log entries? This can't be undone.")) { S("pt_log", []); renderLog(); } };
}

function renderIns(){
  $("#title").textContent = "Instructors & Channels";
  $("#headx").innerHTML = `<input type="search" id="iq" placeholder="Search instructors, platforms…">`;
  const body = (s) => { s = (s||"").toLowerCase();
    const r = DIRECTORY.filter((d) => !s || d.join(" ").toLowerCase().includes(s));
    $("#main").innerHTML = `<div class="count">${r.length} listings</div>` + r.map((d) => `<div class="card"><div class="t">${esc(d[0])}</div><div class="meta">${esc(d[2])}</div><div class="desc">${esc(d[1])}</div>${link(d[3], "Open")}</div>`).join(""); };
  $("#iq").oninput = (ev) => body(ev.target.value);
  body("");
}

function renderGeo(){
  $("#title").textContent = "Pool Geometry";
  const lv = st.glvl || "all";
  $("#headx").innerHTML = `<div class="chips">${[["all","All"],["B","Beginner"],["I","Intermediate"],["E","Expert"],["P","Pro"]].map(([k,l]) => `<button class="chip ${lv===k?"on":""}" data-gl="${k}">${l}</button>`).join("")}</div>`;
  document.querySelectorAll("[data-gl]").forEach((b) => b.onclick = () => { st.glvl = b.dataset.gl; renderGeo(); });
  const gcard = (g) => `<div class="card geo" id="geo-${g[0]}"><div class="t">${esc(g[2])}</div><div class="meta">${esc(LVL[g[1]])}</div>
    <div class="dia">${GSV[g[0]]()}</div>
    <div class="desc">${esc(g[3])}</div>
    <div class="desc"><b>Key numbers:</b> ${esc(g[4])}</div>
    <div class="desc"><b>Takeaway:</b> ${esc(g[5])}</div>
    <div class="vids">${g[6].map(([l, u]) => `<a class="btn ghost2" href="${esc(url(u))}" target="_blank" rel="noopener">📄 Source: ${esc(l)}</a>`).join("")}</div>${vbtns(g[7])}</div>`;
  let h = `<div class="callout">Every diagram is drawn for this app (not to scale except where noted). Numbers come from the linked sources; the cards go from Beginner to Pro.</div>`;
  h += `<details ${lv==="all"||lv==="B"?"":""}><summary>Cut angle ↔ ball-hit fraction table</summary><div class="inner"><table><tr><th>Ball hit (overlap)</th><th>Cut angle</th></tr>${CUT_TABLE.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</table><div class="meta">sin(cut angle) = 1 − fraction. Source: Dr. Dave, TP A.23 (ball-hit fraction vs cut angle).</div></div></details>`;
  Object.keys(LVL).forEach((k) => { if (lv !== "all" && lv !== k) return; const r = GEO.filter((g) => g[1] === k); if (r.length) h += `<h2>${LVL[k]} (${r.length})</h2>` + r.map(gcard).join(""); });
  h += `<div class="callout">Want to try the geometry on your own layout? Open <a href="#lab" id="golab">Shot Lab</a>.</div>`;
  $("#main").innerHTML = h;
  const gl = $("#golab"); if (gl) gl.onclick = (ev) => { ev.preventDefault(); st.view = "lab"; save(); render(); };
}

function renderMore(){
  $("#title").textContent = "More";
  $("#headx").innerHTML = "";
  const it = [["warm","⏱️","Pre-Match Warm-Up","10/20/30-minute routine with a timer"],["geo","📐","Geometry","19 concepts with diagrams, cut-angle table"],["rules","⚖️","Rules Compare","Rule differences and terms when you switch leagues"],["rate","🏅","Ratings & Rules","Fargo, UPL, CSI/BCA, NAPA, TAP, VNEA, IBA, ACS, WPA"],["prof","⚙️","Profile & Settings","Level, handedness, eyes, time, games, weaknesses"],["log","📈","Practice Log","Scores and consistency"],["ins","👥","Instructors & Channels","Who to learn from"],["license","📄","License","MIT License, full text"]];
  $("#main").innerHTML = `<div class="card menu">${it.map(([v, i, t, d]) => `<a href="#${v}" data-go="${v}"><span class="i">${i}</span><span>${t}<small>${d}</small></span></a>`).join("")}</div>`;
  document.querySelectorAll("[data-go]").forEach((a) => a.onclick = (e) => { e.preventDefault(); st.view = a.dataset.go; save(); render(); });
}
function renderLicense(){
  $("#title").textContent = "License";
  $("#headx").innerHTML = "";
  $("#main").innerHTML = `<div class="card"><pre style="white-space:pre-wrap;word-wrap:break-word;font:13px/1.45 ui-monospace,Menlo,monospace;margin:0">${esc(window.PT_LICENSE || "")}</pre></div>`;
}
const MOREV = ["warm","geo","rules","license","rate","prof","log","ins","more"];
function render(){
  if (window.Adaptive && aui().stopT && st.view !== "warm") aui().stopT();
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.v === st.view || (b.dataset.v === "more" && MOREV.includes(st.view))));
  ({ today: renderToday, lib: renderLib, plan: renderPlan, log: renderLog, ins: renderIns, geo: renderGeo, lab: () => window.renderLab($, esc, save, st),
     tests: () => aui().renderTests(), tour: () => tui().renderTour(), more: renderMore, warm: () => aui().renderWarm(), rate: () => aui().renderRatings(), rules: () => window.renderRules($, esc), license: renderLicense, prof: () => aui().renderProfile() }[st.view] || renderToday)();
  if (history.replaceState) history.replaceState(null, "", "#" + st.view);
  document.body.classList.toggle("labmode", st.view === "lab");
  window.scrollTo(0, 0);
}
document.querySelectorAll("#tabs button").forEach((b) => b.onclick = () => { st.view = b.dataset.v; save(); render(); });
render();
})();
