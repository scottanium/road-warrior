// Tournaments finder / tracker. Runs on the phone; no accounts, no scraping from the phone.
(function(){
const Lg = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const Sg = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const DEFLOC = { label: "Scottsburg, IN (town center)", lat: 38.6856, lon: -85.7702, src: "default" };
const UPL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRs22Y2e5a5WU7NhcM_MHN8z8wm2_D5IWkwhhLpnbAj7q8LVKzKLXqKDMgVM758NN5Zse0PVE_h5UE3/pub?gid=0&single=true&output=csv";
const DOWS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ST = { AL:"al",AK:"ak",AZ:"az",AR:"ar",CA:"ca",CO:"co",CT:"ct",DE:"de",FL:"fl",GA:"ga",HI:"hi",ID:"id",IL:"il",IN:"in",IA:"ia",KS:"ks",KY:"ky",LA:"la",ME:"me",MD:"md",MA:"ma",MI:"mi",MN:"mn",MS:"ms",MO:"mo",MT:"mt",NE:"ne",NV:"nv",NH:"nh",NJ:"nj",NM:"nm",NY:"ny",NC:"nc",ND:"nd",OH:"oh",OK:"ok",OR:"or",PA:"pa",RI:"ri",SC:"sc",SD:"sd",TN:"tn",TX:"tx",UT:"ut",VT:"vt",VA:"va",WA:"wa",WV:"wv",WI:"wi",WY:"wy" };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const hav = (a, b, c, d) => { const R = 3958.8, r = Math.PI / 180, p1 = a*r, p2 = c*r, dp = (c-a)*r, dl = (d-b)*r; return 2*R*Math.asin(Math.sqrt(Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2)); };
const loc = () => { const L = Lg("pt_tloc", DEFLOC); return L && L.src === "default" ? DEFLOC : L; };
const geoOn = () => Lg("pt_tgeo", false) === true;
function classify(e){
  const t = [e.name, e.format, e.caps, e.info].filter(Boolean).join(" ").replace(/doors open|sign-?ups? open|opens to/gi, "");
  const f = { split: /split/i.test(t), hcp: /handicap|hcp|chip/i.test(t), open: /\bopen\b/i.test(t) };
  const m = t.match(/(\d{3})\s*(?:&|and)?\s*(?:under|max|maximum)/i) || t.match(/(?:fargo|rating)\s*(\d{3})\s*(?:max|maximum|cap|and under)/i);
  f.cap = m ? +m[1] : null;
  f.known = !!(e.format || e.caps || f.split || f.hcp || f.cap);
  return f;
}
function occurrences(e, from, to){
  if (!e.weekly) { const s = e.start, en = e.end || e.start; return (en >= from && s <= to) ? [s] : []; }
  const dow = DOWS.indexOf(e.weekly); const out = []; let d = new Date(from + "T12:00:00");
  while (iso(d) <= to && out.length < 20) { if (d.getDay() === dow && iso(d) >= (e.start || from)) out.push(iso(d)); d.setDate(d.getDate() + 1); }
  return out;
}
function icsFor(e, date, remind){
  const dt = date.replace(/-/g, ""); const end = (e.end && !e.weekly ? addDays(e.end, 1) : addDays(date, 1)).replace(/-/g, "");
  const esc = (s) => String(s || "").replace(/[,;\\]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const alarm = remind ? `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${esc(e.name)}\r\nTRIGGER:-P${remind}D\r\nEND:VALARM\r\n` : "";
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Pool Trainer//EN\r\nBEGIN:VEVENT\r\nUID:${esc(e.id)}-${dt}@pool-trainer\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z\r\nDTSTART;VALUE=DATE:${dt}\r\nDTEND;VALUE=DATE:${end}\r\nSUMMARY:${esc(e.name)}\r\nLOCATION:${esc([e.venue, e.address].filter(Boolean).join(", "))}\r\nDESCRIPTION:${esc([e.time, e.game, e.format, e.caps, e.fee && "Entry " + e.fee, e.src].filter(Boolean).join(" | "))}\r\n${e.src ? "URL:" + e.src + "\r\n" : ""}${alarm}END:VEVENT\r\nEND:VCALENDAR\r\n`;
}
function parseCSV(t){ const rows = []; let r = [], f = "", q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i+1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ",") { r.push(f); f = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && t[i+1] === "\n") i++; r.push(f); rows.push(r); r = []; f = ""; } else f += c; } if (f || r.length) { r.push(f); rows.push(r); } return rows; }
function uplToEvents(csv){
  const rows = parseCSV(csv).filter((r) => r.length >= 4); const h = rows.shift().map((x) => x.trim().toLowerCase());
  const ix = (n) => h.indexOf(n);
  return rows.map((r, i) => { const sd = new Date(r[ix("start date")]), ed = new Date(r[ix("end date")]); if (isNaN(sd)) return null;
    return { id: "upl-" + i, name: (r[ix("event")] || "").trim(), start: iso(sd), end: isNaN(ed) ? null : iso(ed), time: r[ix("start time")] || null, venue: r[ix("venue")] || null, address: null, lat: null, lon: null, game: null, format: "UPL league session / event", caps: null, fee: null, added: null, src: "https://www.uplindy.com/", srcName: "UPL Indy calendar (live, official)", flyer: null, info: "Status: " + (r[ix("status")] || "n/a") + ". League sessions run across the date range shown.", tier: "league", weekly: null, note: null }; }).filter(Boolean);
}
function T_ui($, esc, save, st, rerender){
  function settingsHTML(){
    const L = loc(), g = geoOn();
    return `<details id="tset" ${st.tset ? "open" : ""}><summary>📍 Location: ${esc(L.label)}</summary><div class="inner">
      <label for="tl_in"><b>City or ZIP</b> (change any time)</label>
      <div class="row"><input type="text" id="tl_in" placeholder="e.g. Scottsburg, IN or 47170" value="${esc(L.src === "manual" ? L.q || "" : "")}" autocomplete="postal-code"><button class="btn" id="tl_set">Set location</button></div>
      <div class="meta" id="tl_msg">Distances are measured from ${esc(L.label)}${L.src === "gps" ? " (from your phone's location)" : ""}.</div>
      <label class="tog big"><input type="checkbox" id="tl_geo" ${g ? "checked" : ""}> Use my location</label>
      <div class="meta">${g ? "On: the app asks Safari for your location only when you tap “Locate me”." : "Off: the app never asks for your location, and no GPS coordinates are saved."}</div>
      ${g ? `<button class="btn ghost" id="tl_loc">Locate me</button>` : ""}
      <div class="callout"><b>Turn off Safari location for good (iPhone):</b> Settings → Privacy &amp; Security → Location Services → Safari Websites → Never. On iOS 18 and later you can also go to Settings → Apps → Safari → Location → Deny. To reset just this site, open it in Safari, tap the “aA” (page settings) button → Website Settings → Location → Deny.</div>
      <div class="meta">City and ZIP lookups go to Zippopotam.us (ZIP) or OpenStreetMap Nominatim (city). Only the text you type is sent.</div>
    </div></details>`;
  }
  function wireSettings(){
    $("#tset").ontoggle = () => { st.tset = $("#tset").open; };
    $("#tl_set").onclick = async () => {
      const q = $("#tl_in").value.trim(); if (!q) return; $("#tl_msg").textContent = "Looking up…";
      try {
        let r;
        if (/^\d{5}$/.test(q)) { const j = await (await fetch("https://api.zippopotam.us/us/" + q)).json(); const p = j.places[0]; r = { label: `${p["place name"]}, ${p["state abbreviation"]} ${q}`, lat: +p.latitude, lon: +p.longitude, st: p["state abbreviation"], city: p["place name"] }; }
        else { const j = await (await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us,ca&addressdetails=1&q=" + encodeURIComponent(q))).json(); if (!j.length) throw 0; const a = j[0].address || {}; const stc = (a["ISO3166-2-lvl4"] || "").split("-")[1] || ""; r = { label: j[0].display_name.split(",").slice(0, 3).join(","), lat: +j[0].lat, lon: +j[0].lon, st: stc, city: a.city || a.town || a.village || q.split(",")[0] }; }
        Sg("pt_tloc", Object.assign(r, { src: "manual", q })); st.tset = true; renderTour();
      } catch (e) { $("#tl_msg").textContent = "Couldn't find that place. Try “City, ST” or a 5-digit ZIP."; }
    };
    $("#tl_geo").onchange = () => {
      const on = $("#tl_geo").checked; Sg("pt_tgeo", on);
      if (!on) { const L = loc(); if (L.src === "gps") Sg("pt_tloc", Lg("pt_tloc_manual", DEFLOC)); localStorage.removeItem("pt_tgps"); }
      st.tset = true; renderTour();
    };
    const lb = $("#tl_loc"); if (lb) lb.onclick = () => {
      if (!geoOn() || !navigator.geolocation) return; // never called when the toggle is off
      $("#tl_msg").textContent = "Asking Safari for your location…";
      navigator.geolocation.getCurrentPosition((p) => { const L = loc(); if (L.src !== "gps") Sg("pt_tloc_manual", L); Sg("pt_tloc", { label: "My location (±" + Math.round(p.coords.accuracy) + " m)", lat: p.coords.latitude, lon: p.coords.longitude, src: "gps" }); st.tset = true; renderTour(); },
        () => { $("#tl_msg").textContent = "Location not available (permission denied or off). Type a city or ZIP instead."; }, { maximumAge: 600000, timeout: 15000 });
    };
  }
  function deepLinks(from, to){
    const L = loc(), m0 = new Date(from + "T12:00:00"), cityQ = (L.city || L.label.split(",")[0]).trim();
    const stc = (L.st || (L.label.match(/,\s*([A-Z]{2})\b/) || [])[1] || "IN").toUpperCase(), sts = ST[stc] || "in";
    const mon = MONTHS[m0.getMonth()], yr = m0.getFullYear();
    const slug = cityQ.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + sts;
    const q = encodeURIComponent(`pool tournament near ${cityQ} ${stc} ${mon} ${yr}`);
    return [
      ["AZBilliards calendar (North America, " + mon + " " + yr + ")", `https://www.azbilliards.com/calendar/?pyear=${yr}&event_months=${mon}&event_zone=zna`, "Major and regional events. Pre-filtered by month and region."],
      ["Action Buddy: " + cityQ + ", " + stc, `https://actionbuddy.app/tournaments/${slug}/`, "Aggregator of weekly and one-time events. If the city page doesn't exist, use the state page below."],
      ["Action Buddy: " + stc + " (state)", `https://actionbuddy.app/tournaments/${sts}/`, "All cities in the state."],
      ["Heartland Area Billiards Tour", "https://heartlandareabilliardstour.com/events/", "IN / IL / KY / OH split-bracket tour (Fargo handicap)."],
      ["UPL Indianapolis calendar", "https://www.uplindy.com/", "Ultimate Pool league sessions and events."],
      ["Indy BCAPL / VNEA tournaments", "https://indybca.com/2026_2027-bcapl-vnea-tournaments/", "Local qualifiers and city events."],
      ["DigitalPool tournaments", "https://digitalpool.com/tournaments", "Search there by name or location (the app doesn't read DigitalPool's data)."],
      ["CueScore tournaments", "https://cuescore.com/tournaments", "Filter by country / area on the site."],
      ["Web search (pre-filled)", `https://www.google.com/search?q=${q}`, "Venue flyers and Facebook posts often show up here; open them yourself."]];
  }
  function allEvents(){ return [].concat(typeof TOUR_SNAP !== "undefined" ? TOUR_SNAP : [], Lg("pt_tmanual", []).map((e) => Object.assign({ tier: "manual" }, e)), Lg("pt_tupl", { ev: [] }).ev); }
  function renderTour(){
    $("#title").textContent = "Tournaments";
    const today = iso(new Date());
    const F = Object.assign({ from: today, to: addDays(today, 60), rad: 150, game: "all", split: false, hcp: false, open: false, capOnly: false, capMax: "", elig: false, weekly: true, unv: true, favOnly: false }, Lg("pt_tfilt", {}));
    if (F.from < today) F.from = today;
    const L = loc(), favs = Lg("pt_tfav", {}), myF = window.Adaptive ? window.Adaptive.fOf(window.Adaptive.prof()) : 500;
    $("#headx").innerHTML = `<div class="chips"><button class="chip ${st.ttab !== "add" && st.ttab !== "src" && st.ttab !== "hist" ? "on" : ""}" data-tt="list">Find</button><button class="chip ${st.ttab === "add" ? "on" : ""}" data-tt="add">＋ Add manually</button><button class="chip ${st.ttab === "src" ? "on" : ""}" data-tt="src">Sources & links</button><button class="chip ${st.ttab === "hist" ? "on" : ""}" data-tt="hist">📒 History</button></div>`;
    document.querySelectorAll("[data-tt]").forEach((b) => b.onclick = () => { st.ttab = b.dataset.tt; renderTour(); });
    if (st.ttab === "add") return renderAdd();
    if (st.ttab === "src") return renderSrc(F);
    if (st.ttab === "hist" && window.THist) { $("#title").textContent = "Tournament History"; return window.THist.renderScreen($, esc, st, renderTour); }
    const ev = allEvents();
    const items = [];
    ev.forEach((e) => { const occ = occurrences(e, F.from, F.to); if (!occ.length) return;
      const dist = e.lat == null ? null : hav(L.lat, L.lon, e.lat, e.lon); const c = classify(e);
      const x = { e, occ, dist, c }; if (window.TripCost) x.cost = window.TripCost.calc(x, L); if (window.Profit) x.prof = window.Profit.project(x); items.push(x); });
    const PS = window.Profit ? window.Profit.settings() : null;
    const TC = window.TripCost ? window.TripCost.settings() : null, bud = TC && TC.budget !== "" && isFinite(+TC.budget) ? +TC.budget : null;
    const pass = (x) => { const { e, dist, c } = x;
      if (F.rad !== "any" && dist != null && dist > +F.rad) return false;
      if (F.rad !== "any" && dist == null && e.tier !== "league" && e.tier !== "manual") return false;
      if (F.game !== "all" && !(new RegExp(F.game.replace("-", "[- ]?"), "i")).test([e.game, e.name, e.format].join(" "))) return false;
      if (F.split && !c.split) return false; if (F.hcp && !c.hcp) return false; if (F.open && !c.open) return false;
      if (F.capOnly && !c.cap) return false; if (F.capMax && (!c.cap || c.cap > +F.capMax)) return false;
      if (F.elig && c.cap && myF > c.cap) return false;
      if (!F.weekly && e.weekly) return false; if (!F.unv && e.tier === "unverified") return false;
      if (F.favOnly && !favs[e.id]) return false; if (bud != null && x.cost && x.cost.total > bud) return false; if (PS && x.prof) { if (PS.calc !== "any" && x.prof.calc !== PS.calc) return false; if (PS.onlyPay && !x.prof.ok) return false; if (PS.min1 !== "" && isFinite(+PS.min1) && (!x.prof.ok || x.prof.firstPay < +PS.min1)) return false; if (PS.minLow !== "" && isFinite(+PS.minLow) && (!x.prof.ok || x.prof.lowPay < +PS.minLow)) return false; } return true; };
    const byDate = (a, b) => a.occ[0] < b.occ[0] ? -1 : a.occ[0] > b.occ[0] ? 1 : (a.dist || 0) - (b.dist || 0);
    const byCost = (a, b) => { const ua = !a.cost || a.cost.distUnknown, ub = !b.cost || b.cost.distUnknown; if (ua !== ub) return ua ? 1 : -1; return (a.cost ? a.cost.total : 0) - (b.cost ? b.cost.total : 0) || byDate(a, b); };
    const byBe = (a, b) => { const va = a.prof && a.prof.ok && a.prof.be != null ? a.prof.be : -1, vb = b.prof && b.prof.ok && b.prof.be != null ? b.prof.be : -1; return vb - va || byDate(a, b); };
    const byBest = (a, b) => { const va = a.prof && a.prof.ok && a.prof.best != null ? a.prof.best : -Infinity, vb = b.prof && b.prof.ok && b.prof.best != null ? b.prof.best : -Infinity; return (vb === va ? 0 : vb > va ? 1 : -1) || byDate(a, b); };
    const byF = (k) => (a, b) => { const va = a.prof && a.prof.ok ? a.prof[k] : -Infinity, vb = b.prof && b.prof.ok ? b.prof[k] : -Infinity; return (vb === va ? 0 : vb > va ? 1 : -1) || byDate(a, b); };
    const shown = items.filter(pass).sort(PS && PS.sort === "first" ? byF("firstPay") : PS && PS.sort === "low" ? byF("lowPay") : PS && PS.sort === "be" ? byBe : PS && PS.sort === "best" ? byBest : TC && TC.sort === "cost" ? byCost : byDate);
    const one = shown.filter((x) => !x.e.weekly), wk = shown.filter((x) => x.e.weekly);
    let h = settingsHTML() + (window.TripCost ? window.TripCost.settingsHTML(esc, st) : "") + (window.Profit ? window.Profit.settingsHTML(esc, st) : "");
    h += `<details ${st.tf ? "open" : ""} id="tfd"><summary>Filters: ${F.rad === "any" ? "any distance" : F.rad + " mi"} · ${esc(F.from)} → ${esc(F.to)}</summary><div class="inner">
      <div class="row"><label>From<input type="date" id="tf_from" value="${esc(F.from)}"></label><label>To<input type="date" id="tf_to" value="${esc(F.to)}"></label></div>
      <div class="row"><label>Radius<select id="tf_rad">${["25","50","100","150","250","500","any"].map((r) => `<option value="${r}" ${String(F.rad)===r?"selected":""}>${r === "any" ? "Any distance" : r + " miles"}</option>`).join("")}</select></label>
      <label>Game<select id="tf_game">${[["all","Any game"],["8-ball","8-ball"],["9-ball","9-ball"],["10-ball","10-ball"],["one-pocket","One-pocket"],["bank","Banks"],["straight","Straight pool"]].map(([v, l]) => `<option value="${v}" ${F.game===v?"selected":""}>${l}</option>`).join("")}</select></label></div>
      <div class="ckgrid"><label><input type="checkbox" id="tf_open" ${F.open?"checked":""}> Open</label><label><input type="checkbox" id="tf_split" ${F.split?"checked":""}> Split bracket</label><label><input type="checkbox" id="tf_hcp" ${F.hcp?"checked":""}> Handicapped</label><label><input type="checkbox" id="tf_cap" ${F.capOnly?"checked":""}> Has a rating cap</label></div>
      <div class="row"><label>Cap at or under (e.g. 550)<input type="number" id="tf_capmax" value="${esc(F.capMax)}" placeholder="any"></label></div>
      <label class="tog"><input type="checkbox" id="tf_elig" ${F.elig?"checked":""}> Hide events capped below my rating (${myF})</label>
      <label class="tog"><input type="checkbox" id="tf_wk" ${F.weekly?"checked":""}> Include weekly bar tournaments</label>
      <label class="tog"><input type="checkbox" id="tf_unv" ${F.unv?"checked":""}> Include unverified listings</label>
      <label class="tog"><input type="checkbox" id="tf_fav" ${F.favOnly?"checked":""}> Favorites only</label>
      <div class="row"><button class="btn ghost" id="tf_reset">Reset filters</button></div></div></details>`;
    const upl = Lg("pt_tupl", null);
    h += `<div class="row"><button class="btn ghost" id="t_upl">${upl ? "↻ Refresh" : "⬇ Load"} UPL Indy calendar (live)</button></div>${upl ? `<div class="meta">UPL Indy loaded ${esc(upl.at)}; ${upl.ev.length} items.</div>` : ""}`;
    const reminders = Object.entries(favs).map(([id, f]) => { const x = items.find((i) => i.e.id === id); if (!x) return null; const d = x.occ[0]; const days = Math.round((new Date(d + "T12:00:00") - new Date(today + "T12:00:00")) / 864e5); return f.remind && days >= 0 && days <= f.remind ? `⭐ ${esc(x.e.name)}: ${days === 0 ? "today" : days === 1 ? "tomorrow" : "in " + days + " days"} (${esc(d)})` : null; }).filter(Boolean);
    if (reminders.length) h += `<div class="callout remind">${reminders.join("<br>")}</div>`;
    h += `<div class="count">${one.length} events + ${wk.length} weekly series within ${F.rad === "any" ? "any distance" : F.rad + " miles"}${bud != null ? " · trip cost ≤ $" + bud : ""}${TC && TC.sort === "cost" ? " · sorted by trip cost" : ""} · data snapshot ${esc(typeof TOUR_SNAP_DATE !== "undefined" ? TOUR_SNAP_DATE : "")}. <a href="#" id="t_srcl">How listings are collected</a></div>`;
    h += `<div class="legend"><span class="pill major">Major event</span> <span class="pill verified">Verified (organizer page)</span> <span class="pill league">League (official calendar)</span> <span class="pill unverified">Unverified / not a major event</span> <span class="pill manual">Added by you</span></div>`;
    const card = (x) => { const e = x.e, c = x.c, fav = favs[e.id];
      const badge = { major: ["major", "Major event"], verified: ["verified", "Verified"], league: ["league", "League calendar"], manual: ["manual", "Added by you"] }[e.tier] || ["unverified", "Unverified / not a major event"];
      const unk = e.tier === "unverified" || !c.known;
      const when = e.weekly ? `Every ${e.weekly}${e.time ? " · " + e.time : ""} · next ${x.occ[0]}${x.occ.length > 1 ? " (" + x.occ.length + " dates in range)" : ""}` : `${x.occ[0]}${e.end && e.end !== e.start ? " → " + e.end : ""}${e.time ? " · " + e.time : ""}`;
      const field = (l, v, none) => `<tr><td>${l}</td><td>${v ? esc(v) : `<span class="muted">${none || "Not listed"}</span>`}</td></tr>`;
      return `<div class="card tour ${badge[0]}"><div class="t">${fav ? "⭐ " : ""}${esc(e.name)}</div><div><span class="pill ${badge[0]}">${badge[1]}</span>${unk && e.tier !== "unverified" ? ` <span class="pill unverified">Format/cap unverified</span>` : ""}</div>
      <table class="kv">${field("When", when)}${field("Venue", e.venue)}${field("Address", e.address)}${field("Distance", x.dist == null ? null : "≈ " + Math.round(x.dist) + " mi from " + loc().label.split(",")[0] + " (straight line)", "Unknown")}${field("Game", e.game)}${field("Format", e.format, "Unverified")}${field("Rating cap", e.caps, c.cap ? "≤ " + c.cap : "None listed / unverified")}${field("Entry fee", e.fee)}${field("Added money", e.added)}</table>
      ${x.cost ? window.TripCost.cardHTML(x, x.cost, esc, st) : ""}${x.prof ? window.Profit.cardHTML(x, x.prof, esc, st) : ""}${window.THist ? window.THist.cardHTML(x, esc, st) : ""}
      ${e.note ? `<div class="callout warnc">${esc(e.note)}</div>` : ""}
      <div class="desc">${e.info ? esc(e.info) : `<span class="muted">No extra information</span>`}</div>
      <div class="vids">${e.src ? `<a class="btn ghost2" href="${esc(e.src)}" target="_blank" rel="noopener">🔗 Source: ${esc(e.srcName || "listing")}</a>` : ""}${e.flyer ? `<a class="btn ghost2" href="${esc(e.flyer)}" target="_blank" rel="noopener">🖼 Flyer</a>` : `<span class="btn none">No flyer</span>`}</div>
      <div class="row"><button class="btn ${fav ? "" : "ghost"}" data-fav="${esc(e.id)}">${fav ? "★ Favorite" : "☆ Favorite"}</button>
      <select data-rem="${esc(e.id)}" ${fav ? "" : "disabled"}><option value="0">No reminder</option>${[1,3,7,14].map((n) => `<option value="${n}" ${fav && fav.remind===n?"selected":""}>Remind ${n} day${n>1?"s":""} before</option>`).join("")}</select>
      <button class="btn ghost" data-ics="${esc(e.id)}">📅 Add to Calendar</button>${e.tier === "manual" ? `<button class="btn ghost" data-del="${esc(e.id)}">Delete</button>` : ""}</div></div>`; };
    h += one.length ? one.map(card).join("") : `<div class="callout">No one-time events match. Widen the radius or dates, or try the deep links under “Sources & links”.</div>`;
    if (wk.length) h += `<h2>Weekly series (${wk.length})</h2>` + wk.map(card).join("");
    h += `<div class="meta">Reminders: iPhone web apps can't schedule notifications on their own, so the app shows due reminders here when you open it, and “Add to Calendar” saves an .ics file with an alert that your Calendar app will fire.</div>`;
    $("#main").innerHTML = h;
    wireSettings();
    if (window.TripCost) { window.TripCost.wireSettings($, st, renderTour); window.TripCost.wireCards(st, renderTour); }
    if (window.Profit) { window.Profit.wireSettings($, st, renderTour); window.Profit.wireCards(st, renderTour); }
    if (window.THist) window.THist.wireCards(st, renderTour, items);
    $("#tfd").ontoggle = () => { st.tf = $("#tfd").open; };
    const setF = (k, v) => { F[k] = v; Sg("pt_tfilt", F); st.tf = true; renderTour(); };
    $("#tf_from").onchange = (e) => setF("from", e.target.value); $("#tf_to").onchange = (e) => setF("to", e.target.value);
    $("#tf_rad").onchange = (e) => setF("rad", e.target.value); $("#tf_game").onchange = (e) => setF("game", e.target.value);
    [["tf_open","open"],["tf_split","split"],["tf_hcp","hcp"],["tf_cap","capOnly"],["tf_elig","elig"],["tf_wk","weekly"],["tf_unv","unv"],["tf_fav","favOnly"]].forEach(([i, k]) => $("#" + i).onchange = (e) => setF(k, e.target.checked));
    $("#tf_capmax").onchange = (e) => setF("capMax", e.target.value);
    $("#tf_reset").onclick = () => { localStorage.removeItem("pt_tfilt"); renderTour(); };
    $("#t_srcl").onclick = (e) => { e.preventDefault(); st.ttab = "src"; renderTour(); };
    $("#t_upl").onclick = async () => { $("#t_upl").textContent = "Loading…"; try { const t = await (await fetch(UPL_CSV)).text(); Sg("pt_tupl", { at: new Date().toLocaleString(), ev: uplToEvents(t) }); } catch (e) { alert("Couldn't load the UPL Indy sheet. Check your connection."); } renderTour(); };
    document.querySelectorAll("[data-fav]").forEach((b) => b.onclick = () => { const f = Lg("pt_tfav", {}); if (f[b.dataset.fav]) delete f[b.dataset.fav]; else f[b.dataset.fav] = { remind: 1 }; Sg("pt_tfav", f); renderTour(); });
    document.querySelectorAll("[data-rem]").forEach((s) => s.onchange = () => { const f = Lg("pt_tfav", {}); if (f[s.dataset.rem]) { f[s.dataset.rem].remind = +s.value; Sg("pt_tfav", f); } renderTour(); });
    document.querySelectorAll("[data-ics]").forEach((b) => b.onclick = () => { const x = items.find((i) => i.e.id === b.dataset.ics); if (!x) return; const f = Lg("pt_tfav", {})[x.e.id]; const blob = new Blob([icsFor(x.e, x.occ[0], f ? f.remind : 1)], { type: "text/calendar" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = x.e.name.replace(/[^\w]+/g, "_").slice(0, 40) + ".ics"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); });
    document.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { if (!confirm("Delete this event?")) return; Sg("pt_tmanual", Lg("pt_tmanual", []).filter((e) => e.id !== b.dataset.del)); renderTour(); });
  }
  function renderAdd(){
    const fl = [["name","Name *","text"],["start","Start date *","date"],["end","End date","date"],["time","Start time","text"],["venue","Venue","text"],["address","Address (city, ST at least, for distance)","text"],["game","Game","text"],["format","Format (open, split bracket, handicapped…)","text"],["caps","Rating cap / floor (e.g. Fargo 550 and under)","text"],["fee","Entry fee","text"],["added","Added money","text"],["src","Source link","url"],["flyer","Flyer link","url"],["info","Notes","textarea"]];
    let h = `<div class="callout">Found an event on Facebook, a flyer or a venue board? Add it here. It stays on this phone.</div><div class="card">${fl.map(([k, l, t]) => `<label>${l}${t === "textarea" ? `<textarea id="ta_${k}"></textarea>` : `<input type="${t}" id="ta_${k}">`}</label>`).join("")}
      <label class="tog"><input type="checkbox" id="ta_wk"> Repeats weekly on the start date's weekday</label>
      <div class="row"><button class="btn" id="ta_save">Save event</button></div><div class="meta" id="ta_msg"></div></div>`;
    $("#main").innerHTML = h;
    $("#ta_save").onclick = async () => {
      const g = (k) => ($("#ta_" + k).value || "").trim(); if (!g("name") || !g("start")) { $("#ta_msg").textContent = "Name and start date are required."; return; }
      const e = { id: "m-" + Date.now() }; fl.forEach(([k]) => { e[k] = g(k) || null; }); e.srcName = "Your note"; e.weekly = $("#ta_wk").checked ? DOWS[new Date(e.start + "T12:00:00").getDay()] : null;
      if (e.address) { $("#ta_msg").textContent = "Finding the address for distance…"; try { const j = await (await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(e.address))).json(); if (j.length) { e.lat = +j[0].lat; e.lon = +j[0].lon; } } catch (x) {} }
      const m = Lg("pt_tmanual", []); m.push(e); Sg("pt_tmanual", m); st.ttab = "list"; renderTour();
    };
  }
  function renderSrc(F){
    let h = `<h2>Search these sources (pre-filled)</h2>` + deepLinks(F.from, F.to).map(([l, u, d]) => `<div class="card"><div class="t">${esc(l)}</div><div class="meta">${esc(d)}</div><a class="btn" href="${esc(u)}" target="_blank" rel="noopener">Open</a></div>`).join("");
    h += `<h2>How listings get into the app</h2><div class="card"><div class="desc">
      <b>Bundled snapshot.</b> The listings were collected on ${esc(typeof TOUR_SNAP_DATE !== "undefined" ? TOUR_SNAP_DATE : "")} from public pages whose robots.txt allows it: the Heartland Area Billiards Tour events page (organizer), the AZBilliards calendar, and Action Buddy's public city pages. No logins, no private APIs.<br><br>
      <b>Live on your phone.</b> Only sources that allow it from a browser (CORS-open) are fetched directly: the UPL Indy calendar (a published Google Sheet), and Zippopotam / OpenStreetMap for city and ZIP lookups.<br><br>
      <b>Not read by the app.</b> Facebook (its robots.txt forbids bots), DigitalPool (private API), CueScore (its API looks up by ID only) and Challonge (needs an API key). Use the links above.<br><br>
      <b>Badges.</b> “Verified” = from the organizer's own page with format and caps listed. “Major” = on the AZBilliards national calendar or a known major. Everything else, or anything without a known format or cap, gets the orange “Unverified / not a major event” badge.</div></div>`;
    $("#main").innerHTML = h;
  }
  return { renderTour };
}
window.Tour = { ui: T_ui, classify, occurrences, icsFor, parseCSV, uplToEvents, hav };
})();
