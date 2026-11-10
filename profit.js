// Payout projection for the Tournaments tab. VERY APPROXIMATE PROJECTION, not a guarantee. Inputs saved in localStorage.
(function(){
const Lg = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const Sg = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const num = (v) => { if (v === "" || v == null) return null; const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : null; };
const money = (n) => (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
// Default payout splits, used only when a listing gives payout info but no posted table, or when you enter your own.
// Up to 64 players: PoolHost "Pool tournament payout table" (poolhost.app/guides/pool-tournament-payout/). 65+: 16 places, from the AZBilliards forum thread "64 players, paying 16 places (25% of the field)".
const SRC = { ph: ["PoolHost payout guide", "https://www.poolhost.app/guides/pool-tournament-payout/"], azb: ["AZBilliards forum: 64 players, paying 16 places", "https://forums.azbilliards.com/threads/64-players-paying-16-places-25-of-the-field-1-000-tournament-purse-entries.562636/"] };
const TABLE = [[8, [70, 30], "ph"], [16, [50, 30, 20], "ph"], [24, [45, 25, 18, 12], "ph"], [32, [40, 25, 15, 10, 5, 5], "ph"], [64, [35, 22, 13, 10, 6, 6, 4, 4], "ph"], [9999, [30, 20, 9, 9, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2], "azb"]];
const defSplit = (n) => TABLE.find((r) => n <= r[0]);
const DEF = { field: 32, attend: 75, payback: 80, sort: "none", calc: "any", onlyPay: false, min1: "", minLow: "" };
const S = () => Object.assign({}, DEF, Lg("pt_tprof", {}));
const EV = () => Lg("pt_tpev", {});
const txt = (e) => [e.name, e.format, e.caps, e.fee, e.added, e.info, e.note].filter(Boolean).join(" | ");
function calcutta(e){ const t = txt(e); if (/\bno (calcutta|player auction|auction)\b/i.test(t)) return "No"; if (/calcutta|player auction|\bauction\b/i.test(t)) return "Yes"; return "Not listed"; }
function fieldOf(e){ const t = [e.caps, e.format, e.info].filter(Boolean).join(" "); const m = t.match(/(?:max(?:imum)?\s*(?:of\s*)?)?(\d{1,4})\s*(?:-|\s)?player(?:s)?(?:\s*max(?:imum)?)?/i); return m && +m[1] >= 4 ? +m[1] : null; }
function listing(e){ // payout info the listing itself gives
  const t = txt(e), out = { payback: null, added: null, cond: false, cad: false, posted: null, notes: [] };
  const pb = t.match(/(\d{2,3})\s*%\s*(?:payback|pay ?back|paid back|of entries)/i); if (pb) out.payback = +pb[1];
  const ad = String(e.added || "") || ((t.match(/\$[\d,]+(?:\.\d+)?\s*(?:added|guaranteed|guarantee)[^.|]*/i) || [])[0] || "");
  if (ad) { const m = ad.match(/\$?\s?([\d,]+(?:\.\d+)?)/); if (m) out.added = +m[1].replace(/,/g, ""); out.cond = /full field/i.test(ad + " " + t.match(/added[^.|]*/i)); out.cad = /canadian|CAD/i.test(ad); out.addedTxt = ad; }
  out.has = out.payback != null || out.added != null || out.posted != null; return out; }
function feesInEntry(e){ const t = (e.info || "") + " " + (e.fee || ""); let f = 0; const re = /\$\s?(\d+)\s*(?:registration|green fee|table fee|admin)/gi; let m; while ((m = re.exec(t))) f += +m[1]; return /includ/i.test(t) || /\+\s*\$\d+\s*(?:registration|green)/i.test(t) ? f : 0; }
function project(x){
  const e = x.e, s = S(), u = EV()[e.id] || {}, li = listing(e);
  const user = num(u.payback) != null || num(u.added) != null || (u.places && String(u.places).trim() !== "");
  const res = { calc: calcutta(e), listing: li, user, ok: li.has || user };
  const capF = fieldOf(e), field = num(u.field) || capF || +s.field || 32, att = num(u.attend) != null ? num(u.attend) : +s.attend;
  const players = Math.max(2, Math.round(field * att / 100));
  Object.assign(res, { field, fieldSrc: num(u.field) ? "you" : capF ? "listing cap" : "default (no cap listed)", att, players });
  if (!res.ok) return res;
  const fee = x.cost && x.cost.fee != null ? x.cost.fee : null;
  let payback, pbSrc;
  if (num(u.payback) != null) { payback = num(u.payback); pbSrc = "user-entered"; }
  else if (li.payback != null) { payback = li.payback; pbSrc = "from the listing"; }
  else if (fee && feesInEntry(e) > 0 && feesInEntry(e) < fee) { payback = Math.round((fee - feesInEntry(e)) / fee * 1000) / 10; pbSrc = `assumed: entry minus the $${feesInEntry(e)} of fees the listing names`; }
  else { payback = +s.payback; pbSrc = "assumed default"; }
  let added = num(u.added) != null ? num(u.added) : li.added || 0, addNote = "";
  if (num(u.added) != null) addNote = "added $ user-entered";
  else if (li.added != null) { addNote = "added $ based on the listing (“" + li.addedTxt + "”)"; if (li.cond && players < field) { addNote += "; conditional on a full field, so not counted at " + att + "% attendance"; added = 0; } else if (li.cond) addNote += "; conditional on a full field"; if (li.cad) addNote += "; Canadian dollars, not converted"; }
  const entries = fee != null ? players * fee * payback / 100 : 0;
  const pool = entries + added;
  let split, splitSrc;
  const up = u.places ? String(u.places).split(/[,\s]+/).map(num).filter((v) => v != null && v > 0) : [];
  if (up.length) { split = up; splitSrc = "user-entered"; }
  else { const d = defSplit(players); split = d[1]; splitSrc = "default: " + SRC[d[2]][0]; res.splitUrl = SRC[d[2]][1]; }
  const ssum = split.reduce((a, b) => a + b, 0) || 1;
  const trip = x.cost ? x.cost.total : (fee || 0);
  const rows = split.map((p, i) => { const pay = pool * p / ssum; return { place: i + 1, pct: p / ssum * 100, pay, net: pay - trip }; });
  let be = null; rows.forEach((r) => { if (r.pay >= trip) be = r.place; });
  const firstPay = rows.length ? rows[0].pay : null, lowPay = rows.length ? rows[rows.length - 1].pay : null;
  Object.assign(res, { firstPay, lowPay, payMark: p_mark(li, user), fee, payback, pbSrc, added, addNote, entries, pool, split, splitSrc, rows, trip, be, best: rows.length ? rows[0].net : null, feeUnknown: fee == null, tripPartial: x.cost && (x.cost.feeUnknown || x.cost.distUnknown || x.cost.lodgeMissing) });
  return res;
}
function p_mark(li, user){ return li.posted ? "listed" : user ? "projected from your inputs" : "projected"; }
function beText(p){ if (!p.ok) return "No payouts listed"; if (p.be == null) return "Can't break even at these settings"; return p.be === 1 ? "Break even: only by winning" : "Break even: " + ord(p.be) + " or better"; }
function settingsHTML(esc, st){ const s = S();
  return `<details id="tpset" ${st.tpset ? "open" : ""}><summary>🏆 Payout projection settings (very approximate)</summary><div class="inner">
    <div class="meta">Projections only run for events whose listing gives payout info (posted payouts, a payback %, or added/guaranteed money), or where you type your own. Everything else shows “No payouts listed”. Not a guarantee.</div>
    <div class="row"><label>Default field (no cap listed)<input type="number" id="tp_field" value="${esc(s.field)}" min="4"></label><label>Attendance % of the field<input type="number" id="tp_att" value="${esc(s.attend)}" min="5" max="100"></label></div>
    <div class="row"><label>Assumed payback % of entries<input type="number" id="tp_pb" value="${esc(s.payback)}" min="0" max="100"></label></div>
    <div class="meta">The payback % is only used when the listing doesn't state one; it's labeled “assumed”. If the listing names fees inside the entry (e.g. $10 registration + $10 green fee), the app assumes the rest of the entry goes to the pot.</div>
    <div class="row"><label>Sort events<select id="tp_sort"><option value="none" ${s.sort === "none" ? "selected" : ""}>Use the trip cost sort</option><option value="be" ${s.sort === "be" ? "selected" : ""}>Easiest break-even place</option><option value="best" ${s.sort === "best" ? "selected" : ""}>Best-case profit (1st)</option><option value="first" ${s.sort === "first" ? "selected" : ""}>1st place payout (high → low)</option><option value="low" ${s.sort === "low" ? "selected" : ""}>Minimum place payout (high → low)</option></select></label>
    <label>Calcutta / player auction<select id="tp_calc">${["any", "Yes", "No", "Not listed"].map((v) => `<option value="${v}" ${s.calc === v ? "selected" : ""}>${v === "any" ? "Any" : v}</option>`).join("")}</select></label></div>
    <div class="row"><label>Min 1st-place payout ($)<input type="number" id="tp_min1" value="${esc(s.min1)}" placeholder="any"></label><label>Min lowest-place payout ($)<input type="number" id="tp_minlow" value="${esc(s.minLow)}" placeholder="any"></label></div>
    <div class="meta">Payout filters hide events with no payout info. Use either one or both.</div>
    <label class="tog"><input type="checkbox" id="tp_only" ${s.onlyPay ? "checked" : ""}> Only events with payout info (listed or yours)</label>
    <div class="meta">Default payout splits (used only when no table is posted): up to 64 players from the <a href="${SRC.ph[1]}" target="_blank" rel="noopener">PoolHost payout guide</a> (e.g. 33–64 players: 35/22/13/10/6/6/4/4%); 65+ players pay 16 places (30/20/9/9/4×4/2×8%) from an <a href="${SRC.azb[1]}" target="_blank" rel="noopener">AZBilliards forum example</a>. Edit them per event.</div>
    <div class="row"><button class="btn ghost" id="tp_reset">Reset payout settings</button></div></div></details>`; }
function wireSettings($, st, rerender){ const d = $("#tpset"); if (!d) return; d.ontoggle = () => { st.tpset = d.open; };
  const set = (k, v) => { const s = Lg("pt_tprof", {}); s[k] = v; Sg("pt_tprof", s); st.tpset = true; rerender(); };
  $("#tp_field").onchange = (e) => set("field", e.target.value); $("#tp_att").onchange = (e) => set("attend", e.target.value); $("#tp_pb").onchange = (e) => set("payback", e.target.value);
  $("#tp_sort").onchange = (e) => set("sort", e.target.value); $("#tp_calc").onchange = (e) => set("calc", e.target.value); $("#tp_only").onchange = (e) => set("onlyPay", e.target.checked); $("#tp_min1").onchange = (e) => set("min1", e.target.value); $("#tp_minlow").onchange = (e) => set("minLow", e.target.value);
  $("#tp_reset").onclick = () => { localStorage.removeItem("pt_tprof"); st.tpset = true; rerender(); }; }
function tagsHTML(p){
  const t = [];
  t.push(p.ok ? `<span class="tag ok">✅ ${p.user && !p.listing.has ? "Payouts: user-entered" : "Payout info listed"}</span>` : `<span class="tag bad">❌ No payouts listed</span>`);
  t.push(p.calc === "Yes" ? `<span class="tag ok">✅ Calcutta / auction: yes (listed)</span>` : p.calc === "No" ? `<span class="tag bad">❌ No Calcutta (listing says no)</span>` : `<span class="tag bad">❔ Calcutta not listed</span>`);
  if (p.ok) t.push(p.be != null ? `<span class="tag ok">✅ Profitable at ${ord(p.be)} or better</span>` : `<span class="tag bad">❌ Not viable at these settings</span>`);
  return `<div class="tags">${t.join(" ")}</div>`; }
function payCell(v, trip){ const ok = v >= trip; return `<b class="${ok ? "pgood" : "pbad"}">${ok ? "✔" : "✖"} ${money(v)}</b>`; }
function cardHTML(x, p, esc, st){ const e = x.e, id = esc(e.id), u = EV()[e.id] || {};
  const inp = (k, l, v, ph) => `<label>${l}<input type="text" inputmode="decimal" data-tpf="${id}" data-k="${k}" value="${esc(v ?? "")}" placeholder="${esc(ph || "")}"></label>`;
  let b = `<div class="meta">Calcutta / player auction: <b>${p.calc === "Yes" ? "Yes" : p.calc === "No" ? "No (the listing says there isn't one)" : "Not listed (the listing doesn't say either way)"}</b></div>`;
  b += `<table class="kv"><tr><td>1st place payout</td><td>${p.ok ? payCell(p.firstPay, p.trip) + ` <span class="muted">(${esc(p.payMark)})</span>` : `<span class="pbad">❌ No payouts listed</span>`}</td></tr><tr><td>Minimum place payout</td><td>${p.ok ? payCell(p.lowPay, p.trip) + ` <span class="muted">(${ord(p.rows.length)} place, ${esc(p.payMark)})</span>` : `<span class="pbad">❌ No payouts listed</span>`}</td></tr></table>`;
  if (!p.ok) {
    b += `<div class="callout">No payouts listed. The listing gives no payout table, payback % or added money, so there's no projection for this event.</div>`;
  } else {
    b += `<div class="meta">${p.user ? "<b>Using payout info you entered (user-entered).</b> " : ""}Field ${p.field} (${esc(p.fieldSrc)}) × ${p.att}% attendance = <b>${p.players} players</b>.</div>`;
    b += `<div class="meta">Prize pool ≈ ${p.players} × ${p.fee != null ? money(p.fee) : "entry fee unknown"} × ${p.payback}% payback (${esc(p.pbSrc)})${p.added ? " + " + money(p.added) + " added" : ""} = <b>${money(p.pool)}</b>${p.addNote ? `<br><span class="muted">${esc(p.addNote)}</span>` : ""}</div>`;
    if (p.feeUnknown) b += `<div class="callout warnc">Entry fee unknown, so only the added money is in the pool. Type the fee in the trip cost section.</div>`;
    b += `<div class="meta">Payout split: ${esc(p.splitSrc)}${p.splitUrl ? ` (<a href="${p.splitUrl}" target="_blank" rel="noopener">source</a>)` : ""}. Trip cost used: ${money(p.trip)}${p.tripPartial ? " (incomplete: see trip cost)" : ""}.</div>`;
    b += `<table class="kv"><tr><td><b>Place</b></td><td><b>% · payout · net after trip</b></td></tr>${p.rows.map((r) => `<tr><td>${ord(r.place)}</td><td>${r.pct.toFixed(1)}% · ${payCell(r.pay, p.trip)} · net ${money(r.net)}</td></tr>`).join("")}</table>`;
    b += `<div class="meta">✔ green = covers your trip cost; ✖ red = a net loss. <b>${esc(beText(p))}</b>. Very approximate projection: real fields, payouts and splits vary, and most players finish out of the money. Not a guarantee.</div>`;
  }
  b += `<div class="t" style="margin-top:8px">Adjust${p.ok ? "" : " / enter your own payout info (user-entered)"}</div>`;
  b += `<div class="row">${inp("field", "Field size", u.field, String(p.field))}${inp("attend", "Attendance %", u.attend, String(p.att))}</div>`;
  b += `<div class="row">${inp("payback", "Payback % of entries", u.payback, p.ok ? String(p.payback) : "e.g. 100")}${inp("added", "Added money ($)", u.added, p.ok && p.listing.added != null ? String(p.listing.added) : "e.g. 500")}</div>`;
  b += `<div class="row">${inp("places", "Payout % by place (comma list)", u.places, p.ok ? p.split.join(",") : "e.g. 40,25,15,10,5,5")}</div>`;
  if (u.field || u.attend || u.payback || u.added || u.places) b += `<button class="btn ghost" data-tpclr="${id}">Clear my payout inputs</button>`;
  return tagsHTML(p) + `<details class="tc" data-tpd="${id}" ${st.tpOpen && st.tpOpen[e.id] ? "open" : ""}><summary>🏆 Payouts (very approximate projection): ${esc(beText(p))}${p.ok && p.best != null ? " · 1st nets " + money(p.best) : ""}</summary><div class="inner">${b}</div></details>`; }
function wireCards(st, rerender){ st.tpOpen = st.tpOpen || {};
  document.querySelectorAll("[data-tpd]").forEach((d) => d.ontoggle = () => { st.tpOpen[d.dataset.tpd] = d.open; });
  const put = (id, k, v) => { const a = EV(), u = a[id] || {}; if (v === "") delete u[k]; else u[k] = v; a[id] = u; Sg("pt_tpev", a); st.tpOpen[id] = true; rerender(); };
  document.querySelectorAll("[data-tpf]").forEach((i) => i.onchange = () => put(i.dataset.tpf, i.dataset.k, i.value.trim()));
  document.querySelectorAll("[data-tpclr]").forEach((b) => b.onclick = () => { const a = EV(); delete a[b.dataset.tpclr]; Sg("pt_tpev", a); st.tpOpen[b.dataset.tpclr] = true; rerender(); }); }
window.Profit = { project, calcutta, listing, fieldOf, settings: S, settingsHTML, wireSettings, cardHTML, wireCards, beText, TABLE, SRC };
})();
