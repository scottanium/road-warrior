// Money Tracker: optional win/loss ledger. Manual entry only; stored on this phone ("pt_money", settings "pt_money_set").
(function(){
const Lg = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const Sg = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const num = (v) => { if (v === "" || v == null) return null; const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : null; };
const r2 = (n) => Math.round(n * 100) / 100;
const money = (n) => n == null ? "—" : (n < 0 ? "−$" : "$") + Math.abs(r2(n)).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const ALL = () => Lg("pt_money", []), put = (a) => Sg("pt_money", a);
const SET = () => Object.assign({ on: false }, Lg("pt_money_set", {}));
const COST = [["entry", "Entry fee"], ["calc", "Calcutta buy-in"], ["travel", "Gas / travel"], ["lodge", "Lodging"], ["food", "Food"], ["other", "Other costs"]];
const WIN = [["pay", "Tournament payout"], ["calc", "Calcutta winnings"], ["other", "Other winnings"]];
const GAMES = ["8-ball", "9-ball", "10-ball", "One-pocket", "Bank pool", "Straight pool", "Scotch doubles", "Other"];
const spent = (m) => COST.reduce((s, [k]) => s + (num(m.c && m.c[k]) || 0), 0);
const won = (m) => WIN.reduce((s, [k]) => s + (num(m.w && m.w[k]) || 0), 0);
const net = (m) => won(m) - spent(m);
const roi = (m) => spent(m) > 0 ? net(m) / spent(m) * 100 : null;
const hourly = (m) => num(m.hours) > 0 ? net(m) / num(m.hours) : null;
const tol = () => { try { return +(Object.assign({ tol: 5 }, Lg("pt_thset", {})).tol) || 0; } catch (e) { return 5; } };
const res = (n) => Math.abs(n) <= tol() ? ["even", "➖ Break-even"] : n > 0 ? ["ok", "✅ Profit"] : ["bad", "❌ Loss"];
const tag = (n) => { const r = res(n); return `<span class="tag ${r[0]}">${r[1]} ${money(n)}</span>`; };
const evKey = (m) => m.evId ? "e:" + m.evId : "n:" + norm(m.name) + "|" + norm(m.venue);
const hist = () => (window.THist ? window.THist.H() : Lg("pt_thist", []));
const picks = () => { if (!window.PT_tourPick && window.PT_tui) { try { window.PT_tui(); } catch (e) {} } return window.PT_tourPick ? window.PT_tourPick() : []; };

// period filter
function inPeriod(d, P){ if (!d) return P.per === "all"; const t = new Date(); const td = iso(t);
  if (P.per === "week") { const s = new Date(t); s.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return d >= iso(s) && d <= td; }
  if (P.per === "month") return d.slice(0, 7) === td.slice(0, 7);
  if (P.per === "year") return d.slice(0, 4) === td.slice(0, 4);
  if (P.per === "custom") return (!P.from || d >= P.from) && (!P.to || d <= P.to);
  return true; }
function filtered(P){ return ALL().filter((m) => (P.per !== "event" || evKey(m) === P.ev) && (P.per === "event" || inPeriod(m.date, P)) && (P.game === "all" || norm(m.game) === P.game) && (P.ven === "all" || norm(m.venue) === P.ven) && (P.res === "all" || (P.res === "profit" ? net(m) > tol() : net(m) < -tol()))); }
function sortRows(a, P){ const f = { date: (m) => m.date || "", net, roi: (m) => roi(m) ?? -1e9, place: (m) => num(m.place) ?? 1e9, hourly: (m) => hourly(m) ?? -1e9 }[P.sort] || ((m) => m.date || ""); const d = P.dir === "asc" ? 1 : -1; return a.slice().sort((x, y) => { const p = f(x), q = f(y); return (p > q ? 1 : p < q ? -1 : 0) * d; }); }
function summary(rows){ const sp = rows.reduce((s, m) => s + spent(m), 0), wn = rows.reduce((s, m) => s + won(m), 0), n = wn - sp; const cash = rows.filter((m) => net(m) > tol()).length; const by = rows.slice().sort((a, b) => net(b) - net(a));
  return { sp, wn, n, roi: sp > 0 ? n / sp * 100 : null, cnt: rows.length, cash: rows.length ? cash / rows.length * 100 : null, best: by[0], worst: by[by.length - 1] }; }
function ranking(by){ const g = {}; ALL().forEach((m) => { const k = evKey(m); (g[k] = g[k] || { name: m.name || "(no name)", venue: m.venue || "", rows: [] }).rows.push(m); });
  const out = Object.values(g).map((x) => { const sp = x.rows.reduce((s, m) => s + spent(m), 0), n = x.rows.reduce((s, m) => s + net(m), 0), hrs = x.rows.reduce((s, m) => s + (num(m.hours) || 0), 0), pl = x.rows.map((m) => num(m.place)).filter((v) => v != null);
    return { name: x.name, venue: x.venue, cnt: x.rows.length, avg: n / x.rows.length, roi: sp > 0 ? n / sp * 100 : null, hr: hrs > 0 ? n / hrs : null, fin: pl.length ? pl.reduce((a, b) => a + b, 0) / pl.length : null }; });
  const f = { avg: (x) => x.avg, roi: (x) => x.roi ?? -1e9, hr: (x) => x.hr ?? -1e9, fin: (x) => x.fin == null ? -1e9 : -x.fin }[by] || ((x) => x.avg);
  return out.sort((a, b) => f(b) - f(a)); }

// history link: keep the linked Tournament History entry in step (summary numbers only)
function syncHist(m){ if (!m.histId) return; const H = Lg("pt_thist", []); const h = H.find((x) => x.id === m.histId); if (!h) return;
  Object.assign(h, { date: m.date || h.date, name: m.name || h.name, venue: m.venue || h.venue, game: m.game || h.game, place: m.place || "", players: m.players || "", win: String(r2((num(m.w.pay) || 0) + (num(m.w.other) || 0))), calc: String(r2(num(m.w.calc) || 0)), cost: String(r2(spent(m))) }); Sg("pt_thist", H); }
function addHist(m){ const H = Lg("pt_thist", []); const id = "h" + Date.now(); H.push({ id, date: m.date || "", name: m.name || "", venue: m.venue || "", series: "", game: m.game || "", format: "", place: m.place || "", players: m.players || "", win: String(r2((num(m.w.pay) || 0) + (num(m.w.other) || 0))), calc: String(r2(num(m.w.calc) || 0)), cost: String(r2(spent(m))), notes: "Added from Money Tracker", evId: m.evId || "", venueKey: norm(m.venue) }); Sg("pt_thist", H); return id; }

// calculator (immediate execution, like a phone calculator)
const CAL = { cur: "0", acc: null, op: null, fresh: true };
function calcKey(k){ const c = CAL; const v = parseFloat(c.cur);
  const run = () => { if (c.op == null || c.acc == null) return v; const a = c.acc; return c.op === "+" ? a + v : c.op === "−" ? a - v : c.op === "×" ? a * v : v === 0 ? NaN : a / v; };
  if (/^[0-9]$/.test(k)) { c.cur = c.fresh || c.cur === "0" ? k : c.cur + k; c.fresh = false; }
  else if (k === ".") { if (c.fresh) { c.cur = "0."; c.fresh = false; } else if (!c.cur.includes(".")) c.cur += "."; }
  else if (k === "C") { Object.assign(c, { cur: "0", acc: null, op: null, fresh: true }); }
  else if (k === "⌫") { c.cur = c.fresh || c.cur.length <= 1 ? "0" : c.cur.slice(0, -1); }
  else if (k === "±") { c.cur = String(-v); }
  else if ("+−×÷".includes(k)) { c.acc = c.fresh && c.op ? c.acc : run(); c.op = k; c.fresh = true; c.cur = String(r2(c.acc)); }
  else if (k === "=") { const r = run(); c.cur = isFinite(r) ? String(Math.round(r * 1e6) / 1e6) : "Error"; c.acc = null; c.op = null; c.fresh = true; }
  const d = document.getElementById("mc_disp"); if (d) d.textContent = (c.op && c.acc != null ? r2(c.acc) + " " + c.op + " " : "") + c.cur; }

function formHTML(esc, m, P){
  const H = hist(), E = picks();
  const opt = `<option value="">— Type it in (free text) —</option>${H.length ? `<optgroup label="From Tournament History">${H.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((h) => `<option value="h:${esc(h.id)}" ${m.histId === h.id ? "selected" : ""}>${esc((h.date || "") + " · " + (h.name || "") + (h.venue ? " · " + h.venue : ""))}</option>`).join("")}</optgroup>` : ""}${E.length ? `<optgroup label="From the event finder (recent and upcoming)">${E.map((e) => `<option value="e:${esc(e.id)}" ${!m.histId && m.evId === e.id ? "selected" : ""}>${esc(e.date + " · " + e.name + (e.venue ? " · " + e.venue : ""))}</option>`).join("")}</optgroup>` : ""}`;
  const f = (k, l, v, t, x) => `<label>${l}<input ${t === "money" ? 'type="text" inputmode="decimal" data-money' : `type="${t || "text"}"`} ${t === "number" ? 'inputmode="numeric"' : ""} data-mk="${k}" value="${esc(v ?? "")}" ${x || ""}></label>`;
  return `<div class="card mform" id="mform"><div class="t">${m.id ? "✏️ Edit entry" : "➕ New entry"}</div>
    <label>Tournament / event<select id="mf_pick">${opt}</select></label><div class="meta" id="mf_note" aria-live="polite">${m.histId ? "🔗 Linked to your Tournament History entry; saving updates its totals there." : ""}</div>
    <div class="mgrid">${f("name", "Event name", m.name)}${f("venue", "Venue", m.venue)}${f("date", "Date", m.date || iso(new Date()), "date")}<label>Game<input type="text" list="mf_games" data-mk="game" value="${esc(m.game || "")}"><datalist id="mf_games">${GAMES.map((g) => `<option value="${g}">`).join("")}</datalist></label>${f("players", "Players (optional)", m.players, "number", 'min="1"')}${f("place", "Where I placed (1 = won)", m.place, "number", 'min="1"')}${f("hours", "Hours played (optional)", m.hours, "money")}</div>
    <fieldset class="mset"><legend>Costs</legend><div class="mgrid">${COST.map(([k, l]) => f("c." + k, l, m.c && m.c[k], "money")).join("")}</div></fieldset>
    <fieldset class="mset"><legend>Winnings</legend><div class="mgrid">${WIN.map(([k, l]) => f("w." + k, l, m.w && m.w[k], "money")).join("")}</div></fieldset>
    <label>Notes<input type="text" data-mk="notes" value="${esc(m.notes || "")}"></label>
    ${m.histId ? "" : `<label class="tog"><input type="checkbox" id="mf_hist" ${m.id ? "" : "checked"}> Also add it to Tournament History (one linked entry, no double counting)</label>`}
    <div class="mnet" id="mf_net" aria-live="polite"></div>
    <div class="row"><button class="btn" id="mf_save">${m.id ? "Save changes" : "Save entry"}</button>${m.id ? `<button class="btn ghost" id="mf_cancel">Cancel</button>` : `<button class="btn ghost" id="mf_clear">Clear</button>`}</div><div class="meta" id="mf_msg" role="status"></div></div>`; }
function readForm(){ const o = { c: {}, w: {} }; document.querySelectorAll("#mform [data-mk]").forEach((i) => { const k = i.dataset.mk, v = i.value.trim(); if (k.startsWith("c.")) o.c[k.slice(2)] = v; else if (k.startsWith("w.")) o.w[k.slice(2)] = v; else o[k] = v; }); return o; }

function render($, esc, st, save){
  $("#title").textContent = "Money Tracker";
  $("#headx").innerHTML = `<div class="meta">Your win/loss ledger. Typed in by you and kept only on this phone.</div>`;
  const P = Object.assign({ per: "all", ev: "", from: "", to: "", game: "all", ven: "all", res: "all", sort: "date", dir: "desc", rank: "avg" }, st.mP || {}); st.mP = P;
  const all = ALL(), ed = st.medit ? all.find((m) => m.id === st.medit) || {} : (st.mdraft || {});
  const rows = sortRows(filtered(P), P), S = summary(rows);
  const games = [...new Set(all.map((m) => norm(m.game)).filter(Boolean))], vens = [...new Map(all.filter((m) => m.venue).map((m) => [norm(m.venue), m.venue])).entries()], evs = [...new Map(all.map((m) => [evKey(m), (m.name || "(no name)") + (m.venue ? " · " + m.venue : "")])).entries()];
  const sel = (id, cur, opts, lab) => `<label>${lab}<select id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
  let h = `<div class="msum" role="region" aria-label="Summary for the selected period">
    <div><span>Spent</span><b>${money(S.sp)}</b></div><div><span>Won</span><b>${money(S.wn)}</b></div><div class="${res(S.n)[0]}"><span>Net</span><b>${S.cnt ? (S.n > tol() ? "▲ " : S.n < -tol() ? "▼ " : "") + money(S.n) : "—"}</b></div>
    <div><span>ROI</span><b>${S.roi == null ? "—" : Math.round(S.roi) + "%"}</b></div><div><span>Events</span><b>${S.cnt}</b></div><div><span>Cash rate</span><b>${S.cash == null ? "—" : Math.round(S.cash) + "%"}</b></div></div>
    ${S.cnt ? `<div class="meta">Best: ${esc(S.best.name || "(no name)")} ${tag(net(S.best))}${S.cnt > 1 ? ` · Worst: ${esc(S.worst.name || "(no name)")} ${tag(net(S.worst))}` : ""}</div>` : ""}`;
  h += `<div class="chips" role="group" aria-label="Period">${[["event", "This tournament"], ["week", "This week"], ["month", "This month"], ["year", "This year"], ["all", "All time"], ["custom", "Custom"]].map(([k, l]) => `<button class="chip ${P.per === k ? "on" : ""}" data-mper="${k}" aria-pressed="${P.per === k}">${l}</button>`).join("")}</div>`;
  h += `<details class="card" ${st.mfOpen ? "open" : ""} id="mfilt"><summary>Filters and sort</summary><div class="mgrid">
    ${P.per === "event" ? sel("mp_ev", P.ev, [["", "Pick a tournament"]].concat(evs), "Tournament") : ""}
    ${P.per === "custom" ? `<label>From<input type="date" id="mp_from" value="${esc(P.from)}"></label><label>To<input type="date" id="mp_to" value="${esc(P.to)}"></label>` : ""}
    ${sel("mp_game", P.game, [["all", "All games"]].concat(games.map((g) => [g, g])), "Game")}${sel("mp_ven", P.ven, [["all", "All venues"]].concat(vens), "Event / venue")}
    ${sel("mp_res", P.res, [["all", "Profit and loss"], ["profit", "Profit only"], ["loss", "Loss only"]], "Result")}
    ${sel("mp_sort", P.sort, [["date", "Date"], ["net", "Net"], ["roi", "ROI"], ["place", "Placement"], ["hourly", "$ per hour"]], "Sort by")}${sel("mp_dir", P.dir, [["desc", "High to low / newest"], ["asc", "Low to high / oldest"]], "Order")}</div></details>`;
  h += `<details class="card" open><summary>History (${rows.length} of ${all.length})</summary>${rows.length ? rows.map((m) => { const n = net(m), ro = roi(m), hr = hourly(m);
    return `<div class="mrow"><div class="t">${esc(m.date || "")} · ${esc(m.name || "(no name)")}${m.histId ? ' <span class="tag info" title="Linked to Tournament History">🔗 History</span>' : ""}</div>
      <div class="meta">${esc([m.venue, m.game].filter(Boolean).join(" · "))}${m.place ? " · " + ord(+m.place) + (m.players ? " of " + esc(m.players) : "") : ""}</div>
      <div class="meta">Spent ${money(spent(m))} (${COST.filter(([k]) => num(m.c[k])).map(([k, l]) => esc(l.toLowerCase()) + " " + money(num(m.c[k]))).join(", ") || "none"}) · Won ${money(won(m))}${WIN.filter(([k]) => num(m.w[k])).length ? " (" + WIN.filter(([k]) => num(m.w[k])).map(([k, l]) => esc(l.toLowerCase()) + " " + money(num(m.w[k]))).join(", ") + ")" : ""}</div>
      <div class="tags">${tag(n)}${ro != null ? `<span class="tag info">ROI ${Math.round(ro)}%</span>` : ""}${hr != null ? `<span class="tag info">${money(hr)}/hr over ${esc(m.hours)} h</span>` : ""}</div>${m.notes ? `<div class="meta">${esc(m.notes)}</div>` : ""}
      <div class="row"><button class="btn ghost sm" data-medit="${esc(m.id)}">Edit</button><button class="btn ghost sm" data-mdel="${esc(m.id)}">Delete</button></div></div>`; }).join("") : `<div class="meta" style="padding:8px 0">${all.length ? "No entries match these filters." : "No entries yet. Add your first one below."}</div>`}</details>`;
  h += formHTML(esc, ed, P);
  h += `<details class="card" id="mcalc" ${st.mcOpen ? "open" : ""}><summary>🧮 Calculator</summary><div class="mcal"><div class="mcdisp" id="mc_disp" aria-live="polite">${esc(CAL.cur)}</div>
    <div class="mkeys">${["C", "⌫", "±", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "="].map((k) => `<button class="mkey ${"+−×÷=".includes(k) ? "op" : ""} ${k === "0" ? "z" : ""}" data-mc="${k}" aria-label="${{ "−": "minus", "×": "times", "÷": "divide by", "⌫": "delete", "±": "plus or minus", C: "clear" }[k] || k}">${k}</button>`).join("")}</div>
    <button class="btn" id="mc_use" style="width:100%;margin-top:8px">Use result in <span id="mc_tgt">the last field you tapped</span></button></div></details>`;
  const R = ranking(P.rank);
  h += `<details class="card"><summary>🏆 Your best events</summary><div class="meta">Ranked from your own entries only, no outside data.</div>${sel("mp_rank", P.rank, [["avg", "Average net"], ["roi", "ROI"], ["hr", "$ per hour"], ["fin", "Average finish"]], "Rank by")}
    ${R.length ? `<table class="mrank"><tr><th>#</th><th>Event</th><th>Played</th><th>Avg net</th><th>ROI</th><th>$/hr</th><th>Avg finish</th></tr>${R.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)}${x.venue ? `<div class="meta">${esc(x.venue)}</div>` : ""}</td><td>${x.cnt}</td><td class="${res(x.avg)[0] === "ok" ? "pgood" : res(x.avg)[0] === "bad" ? "pbad" : ""}">${money(x.avg)}</td><td>${x.roi == null ? "—" : Math.round(x.roi) + "%"}</td><td>${x.hr == null ? "—" : money(x.hr)}</td><td>${x.fin == null ? "—" : x.fin.toFixed(1)}</td></tr>`).join("")}</table>` : `<div class="meta">Add entries to see your ranking.</div>`}</details>`;
  h += `<details class="card"><summary>Export / import ledger</summary><div class="meta">Share your ledger by sending the file yourself. It's also in the full app backup (Events → 📒 History).</div><div class="row"><button class="btn ghost" id="mx_json">Export JSON</button><label class="btn ghost">Import JSON<input type="file" id="mx_imp" accept="application/json,.json" hidden></label></div><div class="meta" id="mx_msg" role="status"></div></details>`;
  $("#main").innerHTML = h;
  const rr = () => render($, esc, st, save);
  const setP = (o) => { Object.assign(P, o); st.mP = P; save(); rr(); };
  document.querySelectorAll("[data-mper]").forEach((b) => b.onclick = () => setP({ per: b.dataset.mper }));
  [["mp_ev", "ev"], ["mp_from", "from"], ["mp_to", "to"], ["mp_game", "game"], ["mp_ven", "ven"], ["mp_res", "res"], ["mp_sort", "sort"], ["mp_dir", "dir"], ["mp_rank", "rank"]].forEach(([id, k]) => { const e = document.getElementById(id); if (e) e.onchange = () => { st.mfOpen = id !== "mp_rank"; setP({ [k]: e.value }); }; });
  document.querySelectorAll("[data-medit]").forEach((b) => b.onclick = () => { st.medit = b.dataset.medit; save(); rr(); setTimeout(() => { const f = $("#mform"); if (f) f.scrollIntoView({ block: "start" }); }, 30); });
  document.querySelectorAll("[data-mdel]").forEach((b) => b.onclick = () => { const m = ALL().find((x) => x.id === b.dataset.mdel); if (!m || !confirm("Delete this entry: " + (m.date || "") + " " + (m.name || "") + "?" + (m.histId ? " Its linked Tournament History entry stays." : ""))) return; put(ALL().filter((x) => x.id !== m.id)); if (st.medit === m.id) st.medit = null; save(); rr(); });
  // form
  let tgt = null; const upd = () => { const o = readForm(); const n = net(o), r = res(n); const sp = spent(o), hr = num(o.hours) > 0 ? n / num(o.hours) : null; $("#mf_net").className = "mnet " + r[0]; $("#mf_net").innerHTML = `<span>Spent ${money(sp)} · Won ${money(won(o))}</span><b>${r[1]}: ${money(n)}</b>${sp > 0 ? `<span>ROI ${Math.round(n / sp * 100)}%${hr != null ? " · " + money(hr) + "/hr" : ""}</span>` : ""}`; };
  document.querySelectorAll("#mform [data-mk]").forEach((i) => { i.oninput = upd; i.onfocus = () => { if (i.hasAttribute("data-money")) { tgt = i; $("#mc_tgt").textContent = i.closest("label").firstChild.textContent.trim(); } }; });
  upd();
  $("#mf_pick").onchange = () => { const v = $("#mf_pick").value, set = (k, val) => { const i = document.querySelector(`#mform [data-mk="${k}"]`); if (i && val != null && val !== "") i.value = val; };
    const note = $("#mf_note"); st.mlink = null;
    if (v.startsWith("h:")) { const h = hist().find((x) => x.id === v.slice(2)); if (!h) return; ["name", "venue", "date", "game", "players", "place"].forEach((k) => set(k, h[k])); set("w.pay", h.win); set("w.calc", h.calc);
      const E = h.evId ? picks().find((e) => e.id === h.evId) : null; if (E) { set("c.entry", E.fee); set("c.travel", E.gas != null ? r2(E.gas) : ""); set("c.lodge", E.lodge ? r2(E.lodge) : ""); } else if (num(h.cost)) set("c.other", h.cost);
      st.mlink = { histId: h.id, evId: h.evId || "" }; note.textContent = "🔗 Linked to that Tournament History entry; saving updates its totals there." + (E ? " Costs prefilled from the trip estimate; edit as needed." : num(h.cost) ? " Its total cost went into Other costs; split it up if you like." : ""); const hb = $("#mf_hist"); if (hb) { hb.checked = false; hb.closest("label").hidden = true; } }
    else if (v.startsWith("e:")) { const E = picks().find((e) => e.id === v.slice(2)); if (!E) return; set("name", E.name); set("venue", E.venue); set("date", E.date); set("game", E.game); set("c.entry", E.fee); set("c.travel", E.gas != null ? r2(E.gas) : ""); set("c.lodge", E.lodge ? r2(E.lodge) : "");
      st.mlink = { evId: E.id }; note.textContent = "Prefilled from the event finder" + (E.gas != null || E.lodge ? " and its trip-cost estimate (gas" + (E.lodge ? " and lodging" : "") + ")" : "") + ". Edit anything that's different."; const hb = $("#mf_hist"); if (hb) hb.closest("label").hidden = false; }
    else { note.textContent = ""; const hb = $("#mf_hist"); if (hb) hb.closest("label").hidden = false; }
    upd(); };
  $("#mf_save").onclick = () => { const o = readForm(); if (!o.name && !spent(o) && !won(o)) { $("#mf_msg").textContent = "Add at least an event name or an amount."; return; }
    const list = ALL(); let m = st.medit ? list.find((x) => x.id === st.medit) : null;
    const link = st.mlink || {}; if (!m) { m = { id: "m" + Date.now() }; list.push(m); }
    Object.assign(m, o, { evId: link.evId != null ? link.evId : (m.evId || ""), histId: link.histId || m.histId || "" , updated: new Date().toISOString() });
    const hb = $("#mf_hist"); if (!m.histId && hb && hb.checked && !hb.closest("label").hidden) m.histId = addHist(m); else syncHist(m);
    put(list); st.medit = null; st.mlink = null; st.mdraft = null; save(); rr(); const msg = document.getElementById("mf_msg"); if (msg) msg.textContent = "Saved."; };
  const c = $("#mf_cancel"); if (c) c.onclick = () => { st.medit = null; st.mlink = null; save(); rr(); };
  const cl = $("#mf_clear"); if (cl) cl.onclick = () => { st.mlink = null; st.mdraft = null; rr(); };
  // calculator
  $("#mcalc").ontoggle = () => { st.mcOpen = $("#mcalc").open; };
  document.querySelectorAll("[data-mc]").forEach((b) => b.onclick = () => calcKey(b.dataset.mc));
  $("#mc_use").onclick = () => { const v = parseFloat(CAL.cur); const t = tgt || document.querySelector('#mform [data-mk="c.other"]'); if (!isFinite(v) || !t) return; t.value = String(r2(v)); upd(); t.focus(); };
  // export / import
  $("#mx_json").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: "The Road Warrior: Pool Tracker and Trainer", kind: "money ledger", version: 1, entries: ALL() }, null, 1)], { type: "application/json" })); a.download = "road_warrior_money_" + iso(new Date()) + ".json"; document.body.appendChild(a); a.click(); a.remove(); };
  $("#mx_imp").onchange = (ev) => { const f = ev.target.files[0]; if (!f) return; f.text().then((t) => { try { const j = JSON.parse(t), arr = Array.isArray(j) ? j : j.entries; if (!Array.isArray(arr)) throw 0; const list = ALL(), ids = new Set(list.map((m) => m.id)); let n = 0; arr.forEach((m) => { if (!m || typeof m !== "object") return; m = Object.assign({ c: {}, w: {} }, m); if (!m.id || ids.has(m.id)) m.id = "m" + Date.now() + "_" + n; m.histId = ""; list.push(m); ids.add(m.id); n++; }); put(list); rr(); $("#mx_msg").textContent = "Imported " + n + " entr" + (n === 1 ? "y" : "ies") + "."; } catch (e) { $("#mx_msg").textContent = "That file isn't a money ledger export."; } }); };
}

// floating $ button (only when the tracker is turned on)
function fab(){ let b = document.getElementById("mfab"); const on = SET().on; document.body.classList.toggle("money-on", on);
  if (!on) { if (b) b.hidden = true; return; }
  if (!b) { b = document.createElement("button"); b.id = "mfab"; b.type = "button"; b.setAttribute("aria-label", "Open Money Tracker"); b.innerHTML = '<span aria-hidden="true">$</span>'; b.onclick = () => window.PT_goView && window.PT_goView("money"); document.body.appendChild(b); }
  b.hidden = false; b.classList.toggle("on", !!(window.PT_curView && window.PT_curView() === "money")); }
const settingHTML = (esc) => `<div class="card"><label class="tog" style="margin:0"><input type="checkbox" id="mset_on" ${SET().on ? "checked" : ""}> <b>💵 Money Tracker</b> <span class="meta">(optional win/loss ledger; adds a $ button on every screen; off by default)</span></label></div>`;
const wireSetting = () => { const c = document.getElementById("mset_on"); if (c) c.onchange = () => { const s = SET(); s.on = c.checked; Sg("pt_money_set", s); fab(); }; };
window.Money = { render, fab, settingHTML, wireSetting, on: () => SET().on, net, spent, won, _calc: calcKey };
})();
