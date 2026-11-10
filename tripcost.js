// Trip cost estimate for the Tournaments tab. VERY APPROXIMATE. Everything runs on the phone; inputs are saved in localStorage.
(function(){
const Lg = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const Sg = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
// Gas price snapshot: U.S. EIA "Gasoline and Diesel Fuel Update", regular gasoline retail price, week of 2026-11-02 (released 2026-11-03).
const GAS = { src: "https://www.eia.gov/petroleum/gasdiesel/", srcName: "U.S. EIA Gasoline and Diesel Fuel Update", week: "2026-11-02", released: "2026-11-03",
  padd: { "1A": ["New England (PADD 1A)", 4.145], "1B": ["Central Atlantic (PADD 1B)", 4.232], "1C": ["Lower Atlantic (PADD 1C)", 3.695], "2": ["Midwest (PADD 2)", 4.102], "3": ["Gulf Coast (PADD 3)", 3.636], "4": ["Rocky Mountain (PADD 4)", 4.213], "5": ["West Coast less California", 4.771] },
  state: { CA: 5.748, CO: 4.068, FL: 3.791, MA: 4.104, MN: 4.017, NY: 4.217, OH: 4.090, TX: 3.578, WA: 5.095 }, us: 4.153 };
const PADD = {}; Object.entries({ "1A": "CT ME MA NH RI VT", "1B": "DE DC MD NJ NY PA", "1C": "FL GA NC SC VA WV", "2": "IL IN IA KS KY MI MN MO NE ND SD OH OK TN WI", "3": "AL AR LA MS NM TX", "4": "CO ID MT UT WY", "5": "AK AZ CA HI NV OR WA" }).forEach(([p, s]) => s.split(" ").forEach((x) => PADD[x] = p));
function gasFor(stc){ stc = (stc || "").toUpperCase();
  if (GAS.state[stc]) return { p: GAS.state[stc], label: stc + " state average" };
  const pd = PADD[stc]; if (pd) return { p: GAS.padd[pd][1], label: GAS.padd[pd][0] + " average" };
  return { p: GAS.us, label: "U.S. average (no regional figure for this place)" }; }
const stOf = (s) => { const m = String(s || "").match(/,\s*([A-Z]{2})\b(?:\s*\d{5})?\s*$/) || String(s || "").match(/,\s*([A-Z]{2})\b/); return m ? m[1] : ""; };
const DEF = { mpg: 25, gas: "", perState: false, factor: 1.25, people: 1, sort: "date", budget: "" };
const S = () => Object.assign({}, DEF, Lg("pt_tcost", {}));
const EV = () => Lg("pt_tcev", {});
const num = (v) => { if (v === "" || v == null) return null; const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : null; };
const money = (n) => "$" + (Math.round(n * 100) / 100).toFixed(2);
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
function parseFee(e){
  if (!e.fee) return null; const m = String(e.fee).match(/\$\s?(\d+(?:\.\d{1,2})?)/); if (!m) return null;
  const notes = [];
  if (/advance/i.test(e.fee)) notes.push("advance price used; day-of may cost more");
  if (/per main event|per event/i.test(e.fee)) notes.push("per event; multi-event festivals charge each event separately");
  if (/per player|per person/i.test(e.fee + " " + (e.info || ""))) notes.push("per player");
  return { amt: +m[1], notes };
}
function greenNote(e){
  const t = (e.info || "") + " " + (e.fee || ""); const m = t.match(/[^.;]*?(?:\$\s?(\d+)\s*(?:green|table) fee|(?:green|table) fees?[^$.;]{0,20}\$\s?(\d+))[^.;]*/i);
  if (!m) return null; const v = m[1] || m[2];
  return /includ/i.test(m[0]) ? `The listing says the entry includes a $${v} green/table fee.` : `The listing mentions a $${v} green/table fee; add it below if it's charged on top of the entry.`;
}
function defNights(e){ return (!e.weekly && e.end && e.end > e.start) ? daysBetween(e.start, e.end) : 0; }
function calc(x, L){
  const s = S(), e = x.e, u = EV()[e.id] || {}, lo = u.lodge || {};
  const pf = parseFee(e), feeOv = num(u.fee), fee = feeOv != null ? feeOv : pf ? pf.amt : null;
  const green = num(u.green) || 0, other = num(u.other) || 0;
  const oneWay = num(u.roadMi) != null ? num(u.roadMi) : x.dist != null ? x.dist * (num(s.factor) || 1.25) : null;
  const rt = oneWay != null ? oneWay * 2 : null;
  const mpg = num(s.mpg) > 0 ? num(s.mpg) : 25;
  const home = gasFor(L.st || stOf(L.label)), dest = gasFor(stOf(e.address));
  let gp, gl;
  if (num(s.gas) != null) { gp = num(s.gas); gl = "your price"; }
  else if (s.perState) { gp = (home.p + dest.p) / 2; gl = `avg of ${home.label} and ${dest.label} (EIA, week of ${GAS.week})`; }
  else { gp = home.p; gl = `${home.label} (EIA, week of ${GAS.week})`; }
  const gal = rt != null ? rt / mpg : null, gas = gal != null ? gal * gp : null;
  const ppl = Math.max(1, Math.round(num(u.people) || num(s.people) || 1));
  const nights = num(lo.nights) != null ? Math.max(0, Math.round(num(lo.nights))) : defNights(e);
  const rate = num(lo.rate), tax = num(lo.tax) || 0, flat = num(lo.flat) || 0, split = Math.max(1, Math.round(num(lo.split) || 1));
  const lodgeAll = nights > 0 && rate != null ? rate * nights * (1 + tax / 100) + flat : (nights > 0 && flat ? flat : 0);
  const lodge = lodgeAll / split;
  const gasShare = gas != null ? gas / ppl : null;
  const total = (fee || 0) + green + other + (gasShare || 0) + lodge;
  return { fee, feeSrc: feeOv != null ? "your override" : pf ? "from the listing (" + e.fee + ")" : null, feeNotes: pf && feeOv == null ? pf.notes : [], green, other, oneWay, rt, roadOv: num(u.roadMi) != null, mpg, gp, gl, gal, gas, ppl, gasShare,
    nights, rate, tax, flat, split, lodgeAll, lodge, lodgeType: lo.type || "hotel", total, feeUnknown: fee == null, distUnknown: rt == null, lodgeMissing: nights > 0 && rate == null, perNight: !!e.weekly };
}
function settingsHTML(esc, st){
  const s = S(), L = (window.Tour && Lg("pt_tloc", null)) || {};
  return `<details id="tcset" ${st.tcset ? "open" : ""}><summary>⛽ Trip cost settings (very approximate)</summary><div class="inner">
    <div class="row"><label>Miles per gallon<input type="number" inputmode="decimal" id="tc_mpg" value="${esc(s.mpg)}" min="5" max="150" step="0.5"></label>
    <label>Gas $/gal (blank = EIA)<input type="text" inputmode="decimal" id="tc_gas" value="${esc(s.gas)}" placeholder="${GAS.padd["2"][1].toFixed(3)}"></label></div>
    <div class="meta">25 MPG is a generic figure, not your car. Change it to your car's real-world MPG.</div>
    <div class="meta">Default gas price: U.S. EIA weekly retail regular gasoline, week of Nov 2, 2026 (released Nov 3, 2026): Midwest ${money(GAS.padd["2"][1])}/gal, Ohio ${money(GAS.state.OH)}/gal, U.S. ${money(GAS.us)}/gal. This is a snapshot bundled in the app. EIA's live data needs an API key and AAA's site blocks apps, so there's no automatic refresh. <a href="${GAS.src}" target="_blank" rel="noopener">Check the current EIA price</a> and type it above.</div>
    <label class="tog"><input type="checkbox" id="tc_ps" ${s.perState ? "checked" : ""}> Use the event's state/region price too (average of home and destination)</label>
    <div class="row"><label>Road factor (× straight line)<input type="number" inputmode="decimal" id="tc_fac" value="${esc(s.factor)}" step="0.05" min="1" max="2"></label>
    <label>People splitting gas<input type="number" inputmode="numeric" id="tc_ppl" value="${esc(s.people)}" min="1" max="8"></label></div>
    <div class="meta">Distance = straight-line miles × road factor, round trip. Approx. only. Type real road miles on any event to override it.</div>
    <div class="row"><label>Sort events<select id="tc_sort"><option value="date" ${s.sort === "date" ? "selected" : ""}>By date</option><option value="cost" ${s.sort === "cost" ? "selected" : ""}>By total cost (low → high)</option></select></label>
    <label>Max budget per trip ($)<input type="number" inputmode="decimal" id="tc_bud" value="${esc(s.budget)}" placeholder="no limit"></label></div>
    <div class="meta">The budget filter uses your share of the total. Unknown entry fees aren't counted, so those events can look cheaper than they are.</div>
    <div class="row"><button class="btn ghost" id="tc_reset">Reset trip cost settings</button></div></div></details>`;
}
function wireSettings($, st, rerender){
  const d = $("#tcset"); if (!d) return; d.ontoggle = () => { st.tcset = d.open; };
  const set = (k, v) => { const s = Lg("pt_tcost", {}); s[k] = v; Sg("pt_tcost", s); st.tcset = true; rerender(); };
  $("#tc_mpg").onchange = (e) => set("mpg", e.target.value); $("#tc_gas").onchange = (e) => set("gas", e.target.value.trim());
  $("#tc_ps").onchange = (e) => set("perState", e.target.checked); $("#tc_fac").onchange = (e) => set("factor", e.target.value);
  $("#tc_ppl").onchange = (e) => set("people", e.target.value); $("#tc_sort").onchange = (e) => set("sort", e.target.value);
  $("#tc_bud").onchange = (e) => set("budget", e.target.value);
  $("#tc_reset").onclick = () => { localStorage.removeItem("pt_tcost"); st.tcset = true; rerender(); };
}
function dealLinks(e, c, checkin){
  const out = addDays(checkin, Math.max(1, c.nights || 1)), g = Math.max(1, c.split);
  const city = String(e.address || "").split(",").slice(-2).join(",").replace(/\d{5}/, "").trim() || e.venue || "";
  const cityName = city.split(",")[0].trim(), stc = stOf(e.address);
  const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], txt = (d) => MO[+d.slice(5, 7) - 1] + " " + (+d.slice(8)) + " " + d.slice(0, 4);
  const L = [];
  L.push(["Google Hotels", `https://www.google.com/travel/search?q=${encodeURIComponent(`hotels near ${e.address || city} ${txt(checkin)} to ${txt(out)}`)}&hl=en-US&gl=us&curr=USD`, "dates set; choose Sort by → Lowest price"]);
  if (e.lat != null) L.push(["Booking.com", `https://www.booking.com/searchresults.html?latitude=${e.lat}&longitude=${e.lon}&dest_type=latlong&checkin=${checkin}&checkout=${out}&group_adults=${g}&no_rooms=1&order=price&lang=en-us&selected_currency=USD`, "near the venue, cheapest first"]);
  else if (city) L.push(["Booking.com", `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${out}&group_adults=${g}&no_rooms=1&order=price&lang=en-us&selected_currency=USD`, "cheapest first"]);
  if (cityName && stc) L.push(["Airbnb", `https://www.airbnb.com/s/${encodeURIComponent(cityName.replace(/\s+/g, "-"))}--${stc}--United-States/homes?checkin=${checkin}&checkout=${out}&adults=${g}&display_currency=USD${c.rate != null ? "&price_max=" + Math.ceil(c.rate) : ""}`, c.rate != null ? `capped at your $${Math.ceil(c.rate)}/night` : "no price sort on Airbnb; use its price filter"]);
  if (cityName && stc) L.push(["Kayak", `https://www.kayak.com/hotels/${encodeURIComponent(cityName.replace(/\s+/g, "-"))}-${stc}/${checkin}/${out}/${g}adults?sort=price_a`, "dates set; opens on Recommended, switch Sort to Cheapest"]);
  L.push(["Google Maps", `https://www.google.com/maps/search/${encodeURIComponent("hotels near " + (e.address || city))}`, "map of nearby hotels, no dates"]);
  return L;
}
function cardHTML(x, c, esc, st){
  const e = x.e, id = esc(e.id), u = EV()[e.id] || {}, lo = u.lodge || {};
  const sumParts = [`<b>${money(c.total)}</b>${c.ppl > 1 || c.split > 1 ? " your share" : ""}`];
  if (c.feeUnknown) sumParts.push("entry fee unknown"); if (c.distUnknown) sumParts.push("distance unknown"); if (c.lodgeMissing) sumParts.push("lodging rate not set");
  const row = (l, v) => `<tr><td>${l}</td><td>${v}</td></tr>`;
  let b = `<table class="kv">`;
  b += row("Entry fee", c.fee != null ? `${money(c.fee)} <span class="muted">${esc(c.feeSrc)}${c.feeNotes.length ? "; " + esc(c.feeNotes.join("; ")) : ""}</span>` : `<b>Entry fee unknown</b> <span class="muted">(not in the total)</span>`);
  if (c.green) b += row("Green/table fee", money(c.green));
  b += row("Distance", c.rt != null ? `${Math.round(c.rt)} mi round trip ${c.roadOv ? "(your road miles)" : "(approx.: straight line × " + (+S().factor || 1.25) + ")"}` : `<span class="muted">Unknown; type road miles below</span>`);
  if (c.rt != null) { b += row("Gas", `${c.gal.toFixed(1)} gal at ${c.mpg} MPG × ${money(c.gp)}/gal = <b>${money(c.gas)}</b>${c.ppl > 1 ? ` ÷ ${c.ppl} people = ${money(c.gasShare)}` : ""}<br><span class="muted">${esc(c.gl)}</span>`); }
  if (c.nights > 0) b += row("Lodging", c.rate != null ? `${esc(c.lodgeType)}: ${c.nights} night${c.nights > 1 ? "s" : ""} × ${money(c.rate)}${c.tax ? " + " + c.tax + "% tax/fees" : ""}${c.flat ? " + " + money(c.flat) + " flat fee" : ""} = ${money(c.lodgeAll)}${c.split > 1 ? ` ÷ ${c.split} = ${money(c.lodge)}` : ""}` : `<span class="muted">${c.nights} night${c.nights > 1 ? "s" : ""}: enter a nightly rate (not in the total yet)</span>`);
  if (c.other) b += row("Other (food, etc.)", money(c.other));
  b += row("Total", `<b>${money(c.total)}</b>${c.ppl > 1 || c.split > 1 ? " (your share)" : ""}${c.perNight ? " per night you play" : ""}`);
  b += `</table>`;
  if (c.feeUnknown) b += `<div class="callout warnc">Entry fee unknown: the listing doesn't give one, so it's left out of the total. Check the source and type it below.</div>`;
  const gn = greenNote(e); if (gn) b += `<div class="meta">${esc(gn)}</div>`;
  const inp = (k, l, v, ph, t) => `<label>${l}<input type="${t || "text"}" inputmode="decimal" data-tcf="${id}" data-k="${k}" value="${esc(v ?? "")}" placeholder="${esc(ph || "")}"></label>`;
  b += `<div class="row">${inp("fee", "Entry fee override ($)", u.fee, c.fee != null && !c.feeSrc.startsWith("your") ? String(c.fee) : "unknown")}${inp("green", "Green/table fee ($)", u.green, "0")}</div>`;
  b += `<div class="row">${inp("roadMi", "Road miles one way", u.roadMi, c.oneWay != null && !c.roadOv ? String(Math.round(c.oneWay)) + " approx." : "")}${inp("people", "People splitting gas", u.people, String(S().people || 1), "number")}</div>`;
  b += `<div class="row">${inp("other", "Other costs: food, etc. ($)", u.other, "0")}</div>`;
  // Lodging
  const types = ["hotel", "motel", "Airbnb", "other"];
  b += `<div class="t" style="margin-top:8px">🛏 Lodging</div><div class="row"><label>Type<select data-tcl="${id}" data-k="type">${types.map((t) => `<option ${ (lo.type || "hotel") === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>${inp("l.nights", "Nights", lo.nights, String(defNights(e)), "number")}</div>`;
  b += `<div class="row">${inp("l.rate", "Nightly rate ($)", lo.rate, "you enter it")}${inp("l.tax", "Taxes/fees (%)", lo.tax, "0")}</div>`;
  b += `<div class="row">${inp("l.flat", "Flat fee, e.g. cleaning ($)", lo.flat, "0")}${inp("l.split", "People sharing the room", lo.split, "1", "number")}</div>`;
  b += `<div class="row"><input type="text" id="tcp_${id}" placeholder="Paste a rate, e.g. $89 nightly" style="flex:1"><button class="btn ghost" data-tcpaste="${id}">Use pasted rate</button></div>`;
  const checkin = x.occ[0];
  b += `<div class="meta"><b>Find deals</b> (${esc(checkin)} → ${esc(addDays(checkin, Math.max(1, c.nights || 1)))}, ${Math.max(1, c.split)} guest${c.split > 1 ? "s" : ""}): opens the site, cheapest first. Tap a rate to paste it into the calculator.</div><div class="vids">${dealLinks(e, c, checkin).map(([n, h, d]) => `<a class="btn ghost2" href="${esc(h)}" target="_blank" rel="noopener" title="${esc(d)}">${esc(n)}</a>`).join("")}</div>` + `<div class="meta">${dealLinks(e, c, checkin).map(([n, h, d]) => `<b>${esc(n)}</b>: ${esc(d)}`).join(" · ")}</div>`;
  b += `<div class="meta">Prices on those sites change constantly; the app never reads them. You copy a rate you like and paste or type it here.</div>`;
  b += `<div class="meta"><b>Very approximate.</b> Gas, distance and fees are estimates; tolls, parking, food and side pots aren't included unless you add them.</div>`;
  return `<details class="tc" data-tcd="${id}" ${st.tcOpen && st.tcOpen[e.id] ? "open" : ""}><summary>💵 Trip cost (very approx.): ${sumParts.join(" · ")}</summary><div class="inner">${b}</div></details>`;
}
function wireCards(st, rerender){
  st.tcOpen = st.tcOpen || {};
  document.querySelectorAll("[data-tcd]").forEach((d) => d.ontoggle = () => { st.tcOpen[d.dataset.tcd] = d.open; });
  const put = (id, k, v) => { const all = EV(), u = all[id] || {}; if (k.startsWith("l.")) { u.lodge = u.lodge || {}; u.lodge[k.slice(2)] = v; } else u[k] = v; all[id] = u; Sg("pt_tcev", all); st.tcOpen[id] = true; rerender(); };
  document.querySelectorAll("[data-tcf]").forEach((i) => i.onchange = () => put(i.dataset.tcf, i.dataset.k, i.value.trim()));
  document.querySelectorAll("[data-tcl]").forEach((i) => i.onchange = () => put(i.dataset.tcl, "l." + i.dataset.k, i.value));
  document.querySelectorAll("[data-tcpaste]").forEach((b) => b.onclick = async () => {
    const id = b.dataset.tcpaste, f = document.getElementById("tcp_" + id); let t = f ? f.value : "";
    if (!t && navigator.clipboard && navigator.clipboard.readText) { try { t = await navigator.clipboard.readText(); } catch (e) {} }
    const m = String(t).replace(/,/g, "").match(/\$?\s?(\d+(?:\.\d{1,2})?)/); if (!m) { if (f) f.placeholder = "No price found. Type e.g. 89"; return; }
    put(id, "l.rate", m[1]);
  });
}
window.TripCost = { GAS, gasFor, calc, settings: S, settingsHTML, wireSettings, cardHTML, wireCards, parseFee, dealLinks, defNights };
})();
