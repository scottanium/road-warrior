// Shot Lab: to-scale table, drag balls, shot suggestions (approximate training aid), photo-to-layout.
(function(){
const R = 1.125; // ball radius, in (2.25 in ball, WPA)
const TABLES = { "7": { L: 78, W: 39, name: "7 ft (78x39 in, typical bar box; not regulated)" }, "8": { L: 88, W: 44, name: "8 ft (88x44 in)" }, "8p": { L: 92, W: 46, name: "8 ft pro / 8.5 ft (92x46 in, WPA 8 ft)" }, "9": { L: 100, W: 50, name: "9 ft (100x50 in, WPA)" } };
const MOUTH = { corner: 4.5625, side: 5.0625 }; // WPA ranges 4.5-4.625 / 5-5.125 in (midpoints)
const COL = { 1: "#f5c518", 2: "#1e5bd8", 3: "#d32f2f", 4: "#6a1b9a", 5: "#ef6c00", 6: "#1b8f3a", 7: "#7b1f1f", 8: "#111" };
const ballCol = (n) => COL[n > 8 ? n - 8 : n] || "#9e9e9e";
const TIPS = [["Max low (≈1.5 tips low)", -1.25], ["1 tip low", -0.9], ["1/2 tip low", -0.45], ["Center", 0], ["1/2 tip high", 0.45], ["1 tip high", 0.9], ["Max high (≈1.5 tips high)", 1.25]];
const SPEEDS = [["Soft", 30], ["Medium", 55], ["Firm", 85], ["Power", 120]]; // in/s at the cue ball (rough)
const MU_S = 0.2, MU_R = 0.012, G = 386, E_RAIL = 0.75; // sliding / rolling friction, gravity in/s^2, rail restitution (rough)
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const SS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const v2 = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, s) => [a[0] * s, a[1] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1], len: (a) => Math.hypot(a[0], a[1]), norm: (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; } };

function pockets(T){ const { L, W } = T; return [["TL", [0, 0], "corner"], ["TS", [L / 2, -0.6], "side"], ["TR", [L, 0], "corner"], ["BL", [0, W], "corner"], ["BS", [L / 2, W + 0.6], "side"], ["BR", [L, W], "corner"]]; }
// aim point a little inside the pocket mouth center
function aimPoint(p, T){ const [id, c, k] = p; if (k === "side") return [c[0], c[1] < 1 ? 0.4 : T.W - 0.4]; const dx = c[0] === 0 ? 1 : -1, dy = c[1] === 0 ? 1 : -1; return [c[0] + dx * 0.9, c[1] + dy * 0.9]; }
function distSeg(p, a, b){ const ab = v2.sub(b, a), t = Math.max(0, Math.min(1, v2.dot(v2.sub(p, a), ab) / (v2.dot(ab, ab) || 1))); return [v2.len(v2.sub(p, v2.add(a, v2.mul(ab, t)))), t]; }

// Cue ball travel to contact: returns speed and spin ratio at contact (spin ratio 1 = natural roll)
function approach(v0, k0, d){ let v = v0, w = k0 * v0, s = 0; const dt = 0.002;
  while (s < d && v > 0.5){ const slip = v - w; if (Math.abs(slip) > 0.3){ const sg = Math.sign(slip); v -= sg * MU_S * G * dt; w += sg * 2.5 * MU_S * G * dt; } else { v -= MU_R * G * dt; w = v; } s += v * dt; }
  return { v: Math.max(v, 0), k: v > 0 ? w / v : 1, reached: s >= d }; }

// Simulate CB after contact: velocity Va (vector) and spin vector (velocity-equivalent) Ws. Rails reflect. Returns path points.
function simCB(start, Va, Ws, T, side){ let p = start.slice(), v = Va.slice(), w = Ws.slice(); const pts = [p.slice()]; const dt = 0.004; let rails = 0, t = 0;
  const minX = R, maxX = T.L - R, minY = R, maxY = T.W - R;
  while (t < 20){ const slip = v2.sub(v, w), sl = v2.len(slip);
    if (sl > 0.4){ const u = v2.mul(slip, 1 / sl); v = v2.sub(v, v2.mul(u, MU_S * G * dt)); w = v2.add(w, v2.mul(u, 2.5 * MU_S * G * dt)); }
    else { const sp = v2.len(v); if (sp < 0.6) break; const nv = Math.max(sp - MU_R * G * dt, 0); v = v2.mul(v, nv / sp); w = v.slice(); }
    p = v2.add(p, v2.mul(v, dt)); t += dt;
    let hit = false;
    if (p[0] < minX || p[0] > maxX){ p[0] = p[0] < minX ? minX : maxX; v[0] = -v[0] * E_RAIL; w[0] = -w[0] * 0.5; hit = true; }
    if (p[1] < minY || p[1] > maxY){ p[1] = p[1] < minY ? minY : maxY; v[1] = -v[1] * E_RAIL; w[1] = -w[1] * 0.5; hit = true; }
    if (hit){ rails++; if (side){ const sp = v2.len(v); const along = v2.norm(Math.abs(v[0]) > Math.abs(v[1]) ? [v[0], 0] : [0, v[1]]); v = v2.add(v, v2.mul(along, side * 0.15 * sp)); side *= 0.4; } pts.push(p.slice()); }
    if (pts.length < 400 && (t % 0.05) < dt) pts.push(p.slice());
    if (pocketedAt(p, T)) { pts.push(p.slice()); return { pts, end: p, rails, scratch: true }; }
  }
  pts.push(p.slice()); return { pts, end: p, rails, scratch: false }; }
function pocketedAt(p, T){ return pockets(T).some(([id, c, k]) => v2.len(v2.sub(p, c)) < (k === "corner" ? MOUTH.corner * 0.5 : MOUTH.side * 0.5)); }

// Cut-induced throw estimate (rough, after Dr. Dave TP A.14 trends): biggest near half-ball, slower = more, roll halves it
function throwDeg(cutDeg, speedIn, kAtContact){ const base = speedIn < 40 ? 5 : speedIn < 70 ? 3.8 : speedIn < 100 ? 2.8 : 2.2; const shape = Math.sin(Math.min(cutDeg, 89) * Math.PI / 180 * 2) ** 0.6; const rollF = kAtContact > 0.6 ? 0.5 : 1; return cutDeg < 1 ? 0 : base * shape * rollF; }

function analyze(L, T){ // L: layout {cb:[x,y], balls:[{n,x,y}], ob: n, pocket: id|'auto', target:[x,y]|null}
  const out = { ok: false, msg: "", cands: [] };
  if (!L.cb) { out.msg = "Place the cue ball."; return out; }
  const ob = L.balls.find((b) => b.n === L.ob); if (!ob) { out.msg = "Tap a ball and choose 'Object ball'."; return out; }
  const O = [ob.x, ob.y], C = L.cb;
  const others = L.balls.filter((b) => b !== ob).map((b) => [b.x, b.y]);
  const list = (L.pocket && L.pocket !== "auto" ? pockets(T).filter((p) => p[0] === L.pocket) : pockets(T)).map((p) => {
    const P = aimPoint(p, T), u = v2.norm(v2.sub(P, O)), Gb = v2.sub(O, v2.mul(u, 2 * R)), aim = v2.norm(v2.sub(Gb, C));
    const cut = Math.acos(Math.max(-1, Math.min(1, v2.dot(aim, u)))) * 180 / Math.PI;
    const blockOB = others.filter((q) => distSeg(q, O, P)[0] < 2 * R - 0.05).length, blockCB = others.filter((q) => distSeg(q, C, Gb)[0] < 2 * R - 0.05).length;
    // side pockets accept a narrow range of angles
    let angOK = true; if (p[2] === "side"){ const a = Math.abs(Math.atan2(Math.abs(u[1]), Math.abs(u[0])) * 180 / Math.PI); angOK = a > 35; }
    return { p, P, u, Gb, aim, cut, blockOB, blockCB, angOK, dOP: v2.len(v2.sub(P, O)), dCG: v2.len(v2.sub(Gb, C)) }; });
  let pk = list.filter((x) => x.cut < 85 && x.angOK).sort((a, b) => (a.blockOB + a.blockCB) - (b.blockOB + b.blockCB) || (a.cut + a.dOP * 0.3) - (b.cut + b.dOP * 0.3))[0];
  if (!pk) { pk = list[0]; out.msg = "No makeable angle to that pocket (cut ≥ 85°, or the side pocket angle is too shallow)."; out.pk = pk; return out; }
  out.pk = pk; out.ok = true;
  const tgt = L.target || [T.L * 0.5, T.W * 0.5];
  const sims = [];
  for (const [tl, k0] of TIPS) for (const [sl, v0] of SPEEDS) for (const side of [0, -1, 1]) {
    if (side && Math.abs(k0) > 0.9) continue;
    const a = approach(v0, k0, pk.dCG); if (!a.reached || a.v < 2) continue;
    const n = pk.u, t0 = v2.sub(pk.aim, v2.mul(n, v2.dot(pk.aim, n))); const tl0 = v2.len(t0); const tdir = tl0 > 1e-6 ? v2.mul(t0, 1 / tl0) : [0, 0];
    const cr = pk.cut * Math.PI / 180, Va = v2.mul(tdir, a.v * Math.sin(cr)), Ws = v2.mul(pk.aim, a.k * a.v);
    // object ball must reach the pocket: OB leaves at v cos(cut), slides then rolls at 5/7 of that speed
    const vOB = a.v * Math.cos(cr) * (5 / 7), dOB = vOB * vOB / (2 * MU_R * G);
    const th = throwDeg(pk.cut, a.v, a.k), miss = pk.dOP * Math.tan(th * Math.PI / 180);
    const r = simCB(pk.Gb, Va, Ws, T, side);
    // kisses: first ball within 2R of the CB path
    let kiss = null; for (let i = 1; i < r.pts.length && !kiss; i++){ for (const q of others){ if (distSeg(q, r.pts[i - 1], r.pts[i])[0] < 2 * R - 0.05){ kiss = q; break; } } }
    if (v2.len(v2.sub(r.end, O)) < 2 * R && pk.cut < 3 && k0 > 0) kiss = O;
    const dist = v2.len(v2.sub(r.end, tgt));
    const score = dist + (r.scratch ? 200 : 0) + (kiss ? 40 : 0) + (dOB < pk.dOP ? 300 : 0) + (side ? 2 : 0) + Math.max(0, r.rails - 2) * 1.5;
    sims.push({ tip: tl + (side ? (side < 0 ? " + left english" : " + right english") : ""), speed: sl, k0, side, r, kiss, dist, score, th, miss, obShort: dOB < pk.dOP, kc: a.k });
  }
  sims.sort((a, b) => a.score - b.score);
  const seen = new Set(); for (const s of sims){ const key = s.tip + s.speed; const endKey = Math.round(s.r.end[0] / 3) + "," + Math.round(s.r.end[1] / 3); if (seen.has(key) || seen.has(endKey)) continue; seen.add(key); seen.add(endKey); out.cands.push(s); if (out.cands.length >= 5) break; }
  return out; }

// ---------- UI ----------
let T, Lay, sel = null, res = null, showIdx = 0;
const defLayout = () => ({ size: "9", cb: [25, 25], balls: [{ n: 1, x: 70, y: 18 }], ob: 1, pocket: "auto", target: [60, 34], name: "", notes: "" });
function load(){ Lay = LS("pt_lab_cur", null) || defLayout(); T = TABLES[Lay.size] || TABLES["9"]; }
function persist(){ SS("pt_lab_cur", Lay); }
function svgTable(esc){ const S = 10, rail = 4.5, L = T.L, W = T.W; const land = matchMedia("(orientation: landscape)").matches || window.innerWidth > 700;
  const vw = (L + 2 * rail) * S, vh = (W + 2 * rail) * S;
  const g = land ? `translate(${rail * S},${rail * S}) scale(${S})` : `translate(${vh - rail * S},${rail * S}) rotate(90) scale(${S})`;
  let s = `<svg id="labsvg" viewBox="0 0 ${land ? vw : vh} ${land ? vh : vw}" style="width:100%;height:auto;touch-action:none;display:block;border-radius:12px;background:#4a2c17">`;
  s += `<g id="labg" transform="${g}"><rect x="0" y="0" width="${L}" height="${W}" fill="#1f6f43"/>`;
  for (let i = 1; i < 8; i++) s += `<circle cx="${L * i / 8}" cy="${-rail / 2}" r=".45" fill="#eee"/><circle cx="${L * i / 8}" cy="${W + rail / 2}" r=".45" fill="#eee"/>`;
  for (let i = 1; i < 4; i++) s += `<circle cx="${-rail / 2}" cy="${W * i / 4}" r=".45" fill="#eee"/><circle cx="${L + rail / 2}" cy="${W * i / 4}" r=".45" fill="#eee"/>`;
  s += `<line x1="${L / 4}" y1="0" x2="${L / 4}" y2="${W}" stroke="#ffffff22" stroke-width=".25"/><circle cx="${L * 3 / 4}" cy="${W / 2}" r=".4" fill="#ffffff55"/>`;
  for (const p of pockets(T)) { const on = res && res.pk && res.pk.p[0] === p[0]; s += `<circle data-pk="${p[0]}" cx="${p[1][0]}" cy="${p[1][1]}" r="${(p[2] === "corner" ? MOUTH.corner : MOUTH.side) / 2}" fill="#050505" stroke="${on ? "#ffd54f" : "none"}" stroke-width=".5"/>`; }
  if (res && res.pk){ const pk = res.pk; s += `<line x1="${Lay.cb[0]}" y1="${Lay.cb[1]}" x2="${pk.Gb[0]}" y2="${pk.Gb[1]}" stroke="#ffd54f" stroke-width=".35"/><line x1="${pk.Gb[0] + pk.u[0] * 2 * R}" y1="${pk.Gb[1] + pk.u[1] * 2 * R}" x2="${pk.P[0]}" y2="${pk.P[1]}" stroke="#81d4fa" stroke-width=".35" stroke-dasharray="1 .6"/><circle cx="${pk.Gb[0]}" cy="${pk.Gb[1]}" r="${R}" fill="none" stroke="#fff" stroke-width=".2" stroke-dasharray=".6 .4"/>`;
    res.cands.forEach((c, i) => { if (i !== showIdx && showIdx !== -1) return; const col = ["#b9f6ca", "#ffab91", "#ce93d8", "#fff59d", "#80cbc4"][i]; s += `<polyline points="${c.r.pts.map((q) => q[0].toFixed(2) + "," + q[1].toFixed(2)).join(" ")}" fill="none" stroke="${col}" stroke-width="${i === showIdx ? .45 : .3}"/><circle cx="${c.r.end[0]}" cy="${c.r.end[1]}" r="${R}" fill="none" stroke="${col}" stroke-width=".3"/>`; }); }
  if (Lay.target) s += `<g data-drag="tgt"><circle cx="${Lay.target[0]}" cy="${Lay.target[1]}" r="2.2" fill="#ffffff18" stroke="#fff" stroke-width=".25" stroke-dasharray=".8 .5"/><path d="M${Lay.target[0] - 1},${Lay.target[1]} h2 M${Lay.target[0]},${Lay.target[1] - 1} v2" stroke="#fff" stroke-width=".25"/></g>`;
  for (const b of Lay.balls){ const c = ballCol(b.n), st = b.n > 8; s += `<g data-drag="b${Lay.balls.indexOf(b)}">` + (st ? `<circle cx="${b.x}" cy="${b.y}" r="${R}" fill="#fafafa"/><clipPath id="cl${b.x | 0}_${b.y | 0}"><rect x="${b.x - R}" y="${b.y - R * .55}" width="${2 * R}" height="${R * 1.1}"/></clipPath><circle cx="${b.x}" cy="${b.y}" r="${R}" fill="${c}" clip-path="url(#cl${b.x | 0}_${b.y | 0})"/>` : `<circle cx="${b.x}" cy="${b.y}" r="${R}" fill="${b.n ? c : "#9e9e9e"}"/>`) + `<circle cx="${b.x}" cy="${b.y}" r="${R}" fill="none" stroke="${sel === b ? "#ffd54f" : b.n === Lay.ob ? "#fff" : "#0006"}" stroke-width="${sel === b || b.n === Lay.ob ? .35 : .12}"/><text x="${b.x}" y="${b.y + .42}" font-size="1.15" text-anchor="middle" fill="${b.n === 8 || b.n === 2 || b.n === 4 || b.n === 7 ? "#fff" : "#000"}" font-family="system-ui" font-weight="700" ${land ? "" : `transform="rotate(-90 ${b.x} ${b.y})"`}>${b.n || "?"}</text></g>`; }
  if (Lay.cb) s += `<g data-drag="cb"><circle cx="${Lay.cb[0]}" cy="${Lay.cb[1]}" r="${R}" fill="#fffef5" stroke="${sel === "cb" ? "#ffd54f" : "#0006"}" stroke-width=".2"/></g>`;
  return s + `</g></svg>`; }

window.renderLab = function($, esc, save, st){
  load();
  $("#title").textContent = "Shot Lab";
  $("#headx").innerHTML = `<div class="chips">${[["table","Table"],["photo","📷 Photo"],["saved","Saved"]].map(([k, l]) => `<button class="chip ${(st.labtab || "table") === k ? "on" : ""}" data-lt="${k}">${l}</button>`).join("")}</div>`;
  document.querySelectorAll("[data-lt]").forEach((b) => b.onclick = () => { st.labtab = b.dataset.lt; window.renderLab($, esc, save, st); });
  const tab = st.labtab || "table";
  if (tab === "photo") return window.PhotoLab($, esc, () => { st.labtab = "table"; window.renderLab($, esc, save, st); }, (lay) => { Lay = Object.assign(defLayout(), lay); T = TABLES[Lay.size]; persist(); });
  if (tab === "saved") return renderSaved($, esc, save, st);
  const draw = () => {
    res = analyze(Lay, T);
    const used = new Set(Lay.balls.map((b) => b.n));
    let h = `<div class="callout warnc"><b>Approximate training aid, not a physics simulator.</b> Paths use simple friction, rail-bounce and throw models from published trends (Dr. Dave TPs); real cloth, balls, cushions and your stroke will differ. Use it to plan, then test on the table.</div>`;
    h += `<div class="row"><select id="lsize">${Object.entries(TABLES).map(([k, t]) => `<option value="${k}" ${Lay.size === k ? "selected" : ""}>${t.name}</option>`).join("")}</select><select id="lpk"><option value="auto">Pocket: best (auto)</option>${pockets(T).map((p) => `<option value="${p[0]}" ${Lay.pocket === p[0] ? "selected" : ""}>Pocket: ${({TL:"top-left corner",TS:"top side",TR:"top-right corner",BL:"bottom-left corner",BS:"bottom side",BR:"bottom-right corner"})[p[0]]}</option>`).join("")}</select></div>`;
    h += `<div id="tblwrap">${svgTable(esc)}</div><div class="meta">Drag the cue ball, balls and the dashed target ring (where you want the cue ball to finish). Tap a ball to select it. Rotate the phone for a bigger landscape table.</div>`;
    h += `<div class="chips" id="addb">${[...Array(15)].map((_, i) => i + 1).map((n) => `<button class="chip ${used.has(n) ? "on" : ""}" data-n="${n}" style="${used.has(n) ? `background:${ballCol(n)};border-color:${ballCol(n)};color:${[2,4,7,8].includes(n > 8 ? n - 8 : n) ? "#fff" : "#000"}` : ""}">${n}</button>`).join("")}</div><div class="meta">Tap a number to add or remove that ball.</div>`;
    if (sel && sel !== "cb") h += `<div class="card"><b>Selected: ball ${sel.n || "?"}</b><div class="row"><button class="btn" id="mkob">Make object ball</button><select id="setn"><option value="">Set number…</option>${[...Array(15)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select><button class="btn ghost" id="delb">Remove</button></div></div>`;
    if (!res.ok) h += `<div class="callout">${esc(res.msg)}</div>`;
    else { const pk = res.pk; h += `<div class="card"><div class="t">Shot: ball ${Lay.ob} to the ${({TL:"top-left corner",TS:"top side",TR:"top-right corner",BL:"bottom-left corner",BS:"bottom side",BR:"bottom-right corner"})[pk.p[0]]}</div><div class="meta">Cut angle <b>${pk.cut.toFixed(1)}°</b> · ball-hit fraction ≈ ${(1 - Math.sin(pk.cut * Math.PI / 180)).toFixed(2)} · CB→ghost ${(pk.dCG / 12).toFixed(1)} ft · OB→pocket ${(pk.dOP / 12).toFixed(1)} ft</div>${pk.blockCB ? `<div class="bad">⚠ Cue ball path to the ghost ball is blocked</div>` : ""}${pk.blockOB ? `<div class="bad">⚠ Object ball path to the pocket is blocked</div>` : ""}</div>`;
      if (!res.cands.length) h += `<div class="callout">No candidate reaches the object ball cleanly. Try another pocket.</div>`;
      h += res.cands.map((c, i) => `<div class="card cand ${i === showIdx ? "on" : ""}" data-ci="${i}"><div class="t">${i + 1}. ${esc(c.tip)} · ${c.speed}</div><div class="meta">Ends ${(c.dist).toFixed(0)} in from your target · ${c.r.rails} rail${c.r.rails === 1 ? "" : "s"} · cue ball arrives with ${c.kc > 0.8 ? "natural roll" : c.kc > 0.2 ? "some follow" : c.kc > -0.2 ? "stun (no spin)" : "draw"}</div><div class="meta">Throw estimate ≈ ${c.th.toFixed(1)}° (≈ ${c.miss.toFixed(1)} in at the pocket) - aim a touch thicker${c.side ? "; sidespin also squirts and throws, adjust" : ""}</div>${c.r.scratch ? `<div class="bad">⚠ Scratch risk</div>` : ""}${c.kiss ? `<div class="bad">⚠ Possible kiss / contact with another ball</div>` : ""}${c.obShort ? `<div class="bad">⚠ Object ball may not reach the pocket at this speed</div>` : ""}</div>`).join("");
      h += `<div class="row"><button class="btn ghost" id="showall">${showIdx === -1 ? "Show one path" : "Show all paths"}</button></div>`; }
    h += `<div class="card"><div class="t">Save layout</div><input type="text" id="lname" placeholder="Name (e.g. 'Right cut, side pocket')" value="${esc(Lay.name || "")}"><textarea id="lnotes" placeholder="Notes">${esc(Lay.notes || "")}</textarea><div class="row"><button class="btn" id="lsave">Save</button><button class="btn ghost" id="lreset">Reset table</button></div></div>`;
    h += `<details><summary>How the suggestions work</summary><div class="inner desc">Ghost ball and cut angle from simple geometry. After contact the cue ball keeps the tangent part of its speed and its spin; friction bends it from the tangent line (stun) toward the 30° roll line or back for draw (the trisect and 30° rules come out of this). Rails bounce with a restitution of ${E_RAIL}, so rebound angles come out wider than the approach (TP 6.3). Throw uses a rough 0-5° estimate (largest near half-ball and at slow speed). Candidates: 7 tip heights × 4 speeds (+ left/right english), ranked by how close the cue ball ends to your target, with penalties for scratches, kisses and short object balls.</div></details>`;
    $("#main").innerHTML = h; wire();
  };
  const wire = () => {
    $("#lsize").onchange = (e) => { Lay.size = e.target.value; T = TABLES[Lay.size]; const cl = (p) => [Math.min(p[0], T.L - R), Math.min(p[1], T.W - R)]; Lay.cb = cl(Lay.cb); Lay.target = cl(Lay.target); Lay.balls.forEach((b) => { [b.x, b.y] = cl([b.x, b.y]); }); persist(); draw(); };
    $("#lpk").onchange = (e) => { Lay.pocket = e.target.value; persist(); draw(); };
    document.querySelectorAll("#addb [data-n]").forEach((b) => b.onclick = () => { const n = +b.dataset.n, i = Lay.balls.findIndex((x) => x.n === n); if (i >= 0) { Lay.balls.splice(i, 1); if (Lay.ob === n) Lay.ob = Lay.balls[0] ? Lay.balls[0].n : null; } else { const sp = freeSpot(); Lay.balls.push({ n, x: sp[0], y: sp[1] }); if (!Lay.ob) Lay.ob = n; } sel = null; persist(); draw(); });
    const mk = $("#mkob"); if (mk) mk.onclick = () => { Lay.ob = sel.n; persist(); draw(); };
    const sn = $("#setn"); if (sn) sn.onchange = (e) => { const n = +e.target.value; const o = Lay.balls.find((b) => b.n === n && b !== sel); if (o) o.n = 0; sel.n = n; persist(); draw(); };
    const db = $("#delb"); if (db) db.onclick = () => { Lay.balls.splice(Lay.balls.indexOf(sel), 1); sel = null; persist(); draw(); };
    document.querySelectorAll(".cand").forEach((c) => c.onclick = () => { showIdx = +c.dataset.ci; draw(); });
    const sa = $("#showall"); if (sa) sa.onclick = () => { showIdx = showIdx === -1 ? 0 : -1; draw(); };
    $("#lsave").onclick = () => { Lay.name = $("#lname").value.trim() || ("Layout " + new Date().toLocaleString()); Lay.notes = $("#lnotes").value; const all = LS("pt_layouts", []); all.unshift(Object.assign(JSON.parse(JSON.stringify(Lay)), { date: new Date().toISOString() })); SS("pt_layouts", all); persist(); alert("Saved: " + Lay.name); };
    $("#lreset").onclick = () => { Lay = defLayout(); T = TABLES["9"]; sel = null; persist(); draw(); };
    const svg = $("#labsvg"), g = $("#labg"); let drag = null, el = null, moved = false, start = null, cur = null;
    const toModel = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(g.getScreenCTM().inverse()); return [q.x, q.y]; };
    const posOf = (d) => d === "cb" ? Lay.cb : d === "tgt" ? Lay.target : [Lay.balls[+d.slice(1)].x, Lay.balls[+d.slice(1)].y];
    svg.addEventListener("pointerdown", (ev) => { el = ev.target.closest("[data-drag]"); if (!el) return; drag = el.dataset.drag; moved = false; start = toModel(ev); cur = posOf(drag).slice(); svg.setPointerCapture(ev.pointerId); ev.preventDefault(); });
    svg.addEventListener("pointermove", (ev) => { if (!drag) return; const m = toModel(ev), o = posOf(drag); if (!moved && Math.hypot(m[0] - start[0], m[1] - start[1]) < 0.8) return; moved = true;
      cur = [Math.max(R, Math.min(T.L - R, o[0] + m[0] - start[0])), Math.max(R, Math.min(T.W - R, o[1] + m[1] - start[1]))];
      el.setAttribute("transform", `translate(${cur[0] - o[0]},${cur[1] - o[1]})`); });
    const up = () => { if (!drag) return; const d = drag; drag = null;
      if (moved) { if (d === "cb") Lay.cb = cur; else if (d === "tgt") Lay.target = cur; else { const b = Lay.balls[+d.slice(1)]; b.x = cur[0]; b.y = cur[1]; } }
      else sel = d === "cb" ? "cb" : d === "tgt" ? null : Lay.balls[+d.slice(1)];
      persist(); draw(); };
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
  };
  const freeSpot = () => { for (let i = 0; i < 200; i++){ const p = [R + Math.random() * (T.L - 2 * R), R + Math.random() * (T.W - 2 * R)]; if ([Lay.cb, ...Lay.balls.map((b) => [b.x, b.y])].every((q) => !q || v2.len(v2.sub(p, q)) > 3 * R)) return p; } return [T.L / 2, T.W / 2]; };
  draw();
  window.onorientationchange = () => { if (st.view === "lab") draw(); };
};

function renderSaved($, esc, save, st){
  const all = LS("pt_layouts", []);
  let h = `<div class="row"><button class="btn" id="exp">Export all (JSON)</button><label class="btn ghost" style="display:inline-flex;align-items:center;justify-content:center">Import JSON<input type="file" id="imp" accept="application/json,.json" style="display:none"></label></div>`;
  h += all.length ? all.map((l, i) => `<div class="card"><div class="t">${esc(l.name)}</div><div class="meta">${new Date(l.date).toLocaleString()} · ${TABLES[l.size] ? TABLES[l.size].name : l.size} · ${l.balls.length} object ball(s)</div>${l.notes ? `<div class="desc">${esc(l.notes)}</div>` : ""}<div class="row"><button class="btn" data-ld="${i}">Load</button><button class="btn ghost" data-del="${i}">Delete</button></div></div>`).join("") : `<div class="callout">No saved layouts yet. Set up a shot on the Table tab and tap Save.</div>`;
  $("#main").innerHTML = h;
  document.querySelectorAll("[data-ld]").forEach((b) => b.onclick = () => { SS("pt_lab_cur", all[+b.dataset.ld]); st.labtab = "table"; window.renderLab($, esc, save, st); });
  document.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { if (confirm("Delete this layout?")) { all.splice(+b.dataset.del, 1); SS("pt_layouts", all); renderSaved($, esc, save, st); } });
  $("#exp").onclick = () => { const blob = new Blob([JSON.stringify({ app: "Pool Trainer Shot Lab", version: 1, layouts: all }, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "shotlab-layouts.json"; document.body.appendChild(a); a.click(); a.remove(); };
  $("#imp").onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { try { const j = JSON.parse(t); const arr = Array.isArray(j) ? j : j.layouts || [j]; const ok = arr.filter((l) => l && l.balls && l.size); SS("pt_layouts", ok.concat(all)); alert("Imported " + ok.length + " layout(s)."); renderSaved($, esc, save, st); } catch (err) { alert("That file isn't a Shot Lab JSON export."); } }); };
}
window.ShotLab = { analyze, TABLES, pockets, R, approach, simCB };
})();
// ---------- Photo to layout (all on-device; nothing is uploaded) ----------
(function(){
function solve(A, b){ const n = b.length; for (let i = 0; i < n; i++){ let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]]; for (let r = i + 1; r < n; r++){ const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } } const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--){ let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; } return x; }
// homography H mapping src points -> dst points (4 pairs)
function homog(src, dst){ const A = [], b = []; for (let i = 0; i < 4; i++){ const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); } const h = solve(A, b); return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]; }
const apply = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
// warp: out image (L*ppi x W*ppi) sampling the source via H (model inches -> source px)
function warp(src, sw, sh, H, L, W, ppi){ const ow = Math.round(L * ppi), oh = Math.round(W * ppi), out = new Uint8ClampedArray(ow * oh * 4);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++){ const [sx, sy] = apply(H, (x + 0.5) / ppi, (y + 0.5) / ppi); const ix = sx | 0, iy = sy | 0, o = (y * ow + x) * 4;
    if (ix < 0 || iy < 0 || ix >= sw - 1 || iy >= sh - 1){ out[o + 3] = 255; continue; } const fx = sx - ix, fy = sy - iy;
    for (let c = 0; c < 3; c++){ const i0 = (iy * sw + ix) * 4 + c; out[o + c] = (src[i0] * (1 - fx) + src[i0 + 4] * fx) * (1 - fy) + (src[i0 + sw * 4] * (1 - fx) + src[i0 + sw * 4 + 4] * fx) * fy; } out[o + 3] = 255; }
  return { data: out, w: ow, h: oh }; }
function hsv(r, g, b){ r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d){ if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; }
function inv3(H){ const [a,b,c,d,e,f,g,h,i] = H, A = e*i-f*h, B = -(d*i-f*g), C = d*h-e*g, det = a*A + b*B + c*C; return [A/det, -(b*i-c*h)/det, (b*f-c*e)/det, B/det, (a*i-c*g)/det, -(a*f-c*d)/det, C/det, -(a*h-b*g)/det, (a*e-b*d)/det]; }
// Detect balls in the ORIGINAL photo (a sphere stays round in a photo, its footprint on the cloth does not), then map to table inches.
function detect(src, sw, sh, H, T, R){ const data = src, Hi = inv3(H), L = T.L, W = T.W;
  const inTable = (x, y, m) => { const q = apply(Hi, x, y); return q[0] > m && q[0] < L - m && q[1] > m && q[1] < W - m ? q : null; };
  const pk = [[0,0],[L/2,0],[L,0],[0,W],[L/2,W],[L,W]], nearPocket = (q) => pk.some((p) => Math.hypot(q[0]-p[0], q[1]-p[1]) < 3.2);
  // local scale: singular values of the model->image Jacobian
  const jac = (q) => { const e = 0.5, p0 = apply(H, q[0], q[1]), px = apply(H, q[0]+e, q[1]), py = apply(H, q[0], q[1]+e); const a = (px[0]-p0[0])/e, b = (py[0]-p0[0])/e, c = (px[1]-p0[1])/e, d = (py[1]-p0[1])/e;
    const s1 = a*a+b*b+c*c+d*d, s2 = Math.sqrt(Math.max(0, (a*a+b*b-c*c-d*d)**2 + 4*(a*c+b*d)**2)); const smax = Math.sqrt((s1+s2)/2), smin = Math.sqrt(Math.max(0,(s1-s2)/2));
    // image direction of the most foreshortened table direction
    const ang = 0.5*Math.atan2(2*(a*b+c*d), a*a+c*c-b*b-d*d) + Math.PI/2; const dv = [a*Math.cos(ang)+b*Math.sin(ang), c*Math.cos(ang)+d*Math.sin(ang)]; const dl = Math.hypot(dv[0], dv[1]) || 1; let u = [dv[0]/dl, dv[1]/dl]; if (u[1] < 0) u = [-u[0], -u[1]];
    return { smax, smin, u }; };
  const rs = [], gs = [], bs = []; const st = Math.max(2, Math.round(Math.sqrt(sw*sh)/300));
  for (let y = 0; y < sh; y += st) for (let x = 0; x < sw; x += st){ if (!inTable(x, y, 2)) continue; const o = (y*sw+x)*4; rs.push(data[o]); gs.push(data[o+1]); bs.push(data[o+2]); }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1]; const cr = med(rs), cg = med(gs), cb = med(bs), cs = cr+cg+cb+1, cv = Math.max(cr, cg, cb) + 1;
  const mask = new Uint8Array(sw*sh); let minX = sw, maxX = 0, minY = sh, maxY = 0;
  for (const [x, y] of [[0,0],[L,0],[L,W],[0,W]].map((q) => apply(H, q[0], q[1]))){ minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  minX = Math.max(1, minX|0); minY = Math.max(1, minY|0); maxX = Math.min(sw-2, Math.ceil(maxX)); maxY = Math.min(sh-2, Math.ceil(maxY));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++){ if (!inTable(x, y, 0.3)) continue; const o = (y*sw+x)*4, r = data[o], g = data[o+1], b = data[o+2], s = r+g+b+1, v = Math.max(r, g, b);
    const chroma = Math.abs(r/s-cr/cs) + Math.abs(g/s-cg/cs) + Math.abs(b/s-cb/cs);
    if ((chroma > 0.16 && v > cv*0.45) || v > cv*1.45 || v < cv*0.3) mask[y*sw+x] = 1; }
  const er = new Uint8Array(sw*sh); for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++){ const i = y*sw+x; er[i] = mask[i] && mask[i-1] && mask[i+1] && mask[i-sw] && mask[i+sw] ? 1 : 0; }
  const lab = new Int32Array(sw*sh), balls = []; let id = 0;
  for (let y0 = minY; y0 <= maxY; y0++) for (let x0 = minX; x0 <= maxX; x0++){ const i0 = y0*sw+x0; if (!er[i0] || lab[i0]) continue; id++; const stk = [i0], px = []; lab[i0] = id;
    while (stk.length){ const j = stk.pop(); px.push(j); const x = j % sw; for (const k of [j-1, j+1, j-sw, j+sw]){ if (lab[k] || !er[k]) continue; if (Math.abs((k % sw) - x) > 1) continue; lab[k] = id; stk.push(k); } }
    let sx = 0, sy = 0; for (const j of px){ sx += j % sw; sy += (j / sw) | 0; } const cx = sx/px.length, cy = sy/px.length; const q = apply(Hi, cx, cy); if (!q) continue;
    const J = jac(q), re = R * J.smax, A1 = Math.PI * re * re; const area = px.length; if (area < 0.35*A1 || re < 2.5) continue;
    let n = Math.max(1, Math.round(area / (A1 * 0.85))); if (n > 18) continue;
    let mnx = 1e9, mxx = -1, mny = 1e9, mxy = -1; for (const j of px){ const x = j % sw, y = (j / sw) | 0; mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
    const bw = mxx-mnx+1, bh = mxy-mny+1; if (Math.min(bw, bh) < re*1.2) continue;
    { let sxx = 0, syy = 0, sxy = 0; for (const j of px){ const dx = (j % sw) - cx, dy = ((j / sw) | 0) - cy; sxx += dx*dx; syy += dy*dy; sxy += dx*dy; } sxx /= area; syy /= area; sxy /= area; const tr = sxx + syy, dt = Math.sqrt(Math.max(0, (sxx-syy)**2/4 + sxy*sxy)); const smin = Math.sqrt(Math.max(0, tr/2 - dt)), smaj = Math.sqrt(tr/2 + dt);
      if (4*smin < re*1.3) continue; // thinner than about 2/3 of a ball: cue stick, chalk line, glare
      if (n <= 3 && smaj > 3.2*smin && 4*smaj > 2*re*(n+1)) continue; } // long streak (motion blur) rather than touching balls
    let cs2 = []; if (n === 1) cs2 = [[cx, cy]]; else { for (let k = 0; k < n; k++){ const t = (k+0.5)/n; cs2.push([mnx + bw*t, mny + bh*(bw > bh ? 0.5 : t)]); }
      for (let it = 0; it < 15; it++){ const acc = cs2.map(() => [0,0,0]); for (const j of px){ const x = j % sw, y = (j / sw) | 0; let bi = 0, bd = 1e18; cs2.forEach((c, ci) => { const dd = (c[0]-x)**2 + (c[1]-y)**2; if (dd < bd){ bd = dd; bi = ci; } }); acc[bi][0] += x; acc[bi][1] += y; acc[bi][2]++; } cs2 = acc.map((a, ci) => a[2] ? [a[0]/a[2], a[1]/a[2]] : cs2[ci]); } }
    for (const [x, y] of cs2){ const qq = apply(Hi, x, y), Jb = jac(qq), rb = R*Jb.smax, obl = 1 - Jb.smin/Jb.smax;
      // the sphere's center sits R above the cloth; shift toward the camera (down the foreshortened direction) to estimate the contact point
      const contact = apply(Hi, x + Jb.u[0]*rb*obl*0.9, y + Jb.u[1]*rb*obl*0.9); if (nearPocket(contact)) continue;
      balls.push({ grp: n, ix: x, iy: y, ir: rb, x: Math.max(R, Math.min(L-R, contact[0])), y: Math.max(R, Math.min(W-R, contact[1])) }); } }
  for (const b of balls){ let wht = 0, drk = 0, col = 0, tot = 0, hx = 0, hy = 0, vs = 0; const rr = b.ir*0.7;
    for (let y = Math.round(b.iy-rr); y <= b.iy+rr; y++) for (let x = Math.round(b.ix-rr); x <= b.ix+rr; x++){ if ((x-b.ix)**2 + (y-b.iy)**2 > rr*rr || x < 0 || y < 0 || x >= sw || y >= sh) continue; const o = (y*sw+x)*4; const [Hh, S, V] = hsv(data[o], data[o+1], data[o+2]); tot++;
      if (S < 0.28 && V > 0.6) wht++; else if (V < 0.22) drk++; else if (S > 0.35){ col++; hx += Math.cos(Hh*Math.PI/180); hy += Math.sin(Hh*Math.PI/180); vs += V; } }
    tot = tot || 1; b.white = wht/tot; b.dark = drk/tot; b.col = col/tot; b.hue = (Math.atan2(hy, hx)*180/Math.PI + 360) % 360; b.val = col ? vs/col : 0; }
  let cue = null; const cs3 = (b) => b.white - (b.grp > 1 ? 0.25 : 0); for (const b of balls) if (b.white > 0.35 && b.col < 0.45 && (!cue || cs3(b) > cs3(cue))) cue = b;
  const guesses = [];
  for (const b of balls){ if (b === cue) continue; let n = 0, conf = 0;
    if (b.dark > 0.45 && b.col < 0.2) { n = 8; conf = b.dark; }
    else if (b.col > 0.2){ const hh = b.hue; let base = hh >= 340 || hh < 14 ? (b.val < 0.5 ? 7 : 3) : hh < 38 ? 5 : hh < 70 ? 1 : hh < 170 ? 6 : hh < 255 ? 2 : 4; const stripe = b.white > 0.2; n = base + (stripe ? 8 : 0); conf = b.col; }
    guesses.push([conf, b, n]); }
  guesses.sort((a, b) => b[0] - a[0]); const used = new Set(); for (const [c, b, n] of guesses){ if (n && !used.has(n)) { b.n = n; used.add(n); } else b.n = 0; }
  return { balls, cue, cloth: [cr, cg, cb] }; }
window.PhotoCore = { homog, apply, warp, detect, inv3 };

window.PhotoLab = function($, esc, back, setLayout){
  const S = window.ShotLab; let size = "9", img = null, cv = null, pts = [], det = null, warped = null;
  $("#main").innerHTML = `<div class="callout"><b>Photo to layout.</b> Take or pick a photo of the table (overhead is best, an angle works). Everything runs on your phone; the photo is never uploaded. Then tap the 4 corner pockets in order going around the table: 1 and 2 along a long rail, then 3 and 4.</div>
  <div class="row"><select id="psize">${Object.entries(S.TABLES).map(([k, t]) => `<option value="${k}" ${k === size ? "selected" : ""}>${t.name}</option>`).join("")}</select><label class="btn" style="display:inline-flex;align-items:center;justify-content:center">📷 Take / choose photo<input type="file" id="pfile" accept="image/*" capture="environment" style="display:none"></label></div>
  <div id="pstep" class="meta"></div><div id="pwrap" style="position:relative"></div><div id="pres"></div>`;
  $("#psize").onchange = (e) => { size = e.target.value; if (pts.length === 4) run(); };
  $("#pfile").onchange = (e) => { const f = e.target.files[0]; if (!f) return; const u = URL.createObjectURL(f); const im = new Image(); im.onload = () => { img = im; pts = []; det = null; showPhoto(); }; im.src = u; };
  function showPhoto(){ const mx = 1600, sc = Math.min(1, mx / Math.max(img.width, img.height)); cv = document.createElement("canvas"); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); cv.style.cssText = "width:100%;height:auto;border-radius:10px;touch-action:manipulation"; $("#pwrap").innerHTML = ""; $("#pwrap").appendChild(cv); redrawMarks(); cv.onclick = (ev) => { if (pts.length >= 4) return; const r = cv.getBoundingClientRect(); pts.push([(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height]); redrawMarks(); if (pts.length === 4) run(); }; }
  function redrawMarks(){ const c = cv.getContext("2d"); c.drawImage(img, 0, 0, cv.width, cv.height); c.lineWidth = Math.max(2, cv.width / 300); pts.forEach((p, i) => { c.strokeStyle = "#ffd54f"; c.beginPath(); c.arc(p[0], p[1], cv.width / 60, 0, 7); c.stroke(); c.fillStyle = "#ffd54f"; c.font = `${Math.round(cv.width / 30)}px system-ui`; c.fillText(String(i + 1), p[0] + cv.width / 50, p[1]); if (i) { c.beginPath(); c.moveTo(...pts[i - 1]); c.lineTo(...p); c.stroke(); } });
    $("#pstep").innerHTML = pts.length < 4 ? `Tap corner pocket ${pts.length + 1} of 4 ${pts.length ? `<button class="btn ghost" id="pundo">Undo</button>` : ""}` : `<button class="btn ghost" id="pundo">Redo corners</button>`; const u = $("#pundo"); if (u) u.onclick = () => { pts = pts.length === 4 ? [] : pts.slice(0, -1); det = null; $("#pres").innerHTML = ""; redrawMarks(); }; }
  function run(){ const T = S.TABLES[size], ppi = 8, src = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height);
    // corners 1-2 along a long rail: model (0,0),(L,0),(L,W),(0,W); if the user tapped along a short rail first, rotate
    const d01 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), d12 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]); const P = d01 >= d12 * 0.6 ? pts : [pts[1], pts[2], pts[3], pts[0]];
    const H = homog([[0, 0], [T.L, 0], [T.L, T.W], [0, T.W]], P); warped = warp(src.data, cv.width, cv.height, H, T.L, T.W, ppi); det = detect(src.data, cv.width, cv.height, H, T, S.R); det.balls.forEach((b) => { b.px = b.x * ppi; b.py = b.y * ppi; });
    const oc = document.createElement("canvas"); oc.width = warped.w; oc.height = warped.h; const c = oc.getContext("2d"); c.putImageData(new ImageData(warped.data, warped.w, warped.h), 0, 0); c.lineWidth = 2;
    det.balls.forEach((b) => { c.strokeStyle = b === det.cue ? "#fff" : b.n ? "#ffd54f" : "#ff5252"; c.beginPath(); c.arc(b.px, b.py, S.R * ppi + 2, 0, 7); c.stroke(); c.fillStyle = "#fff"; c.font = "bold 13px system-ui"; c.fillText(b === det.cue ? "CB" : b.n || "?", b.px + 10, b.py - 10); });
    oc.style.cssText = "width:100%;height:auto;border-radius:10px;margin-top:8px";
    const nb = det.balls.length - (det.cue ? 1 : 0), unl = det.balls.filter((b) => b !== det.cue && !b.n).length;
    $("#pres").innerHTML = `<h3>Top-down view</h3><div class="meta">Found ${det.balls.length} ball(s): ${det.cue ? "cue ball found" : "no cue ball found (add it on the table)"}, ${nb} object ball(s), ${unl} without a number guess (shown as "?"). Number guesses come from color and can be wrong; fix them on the table by tapping a ball.</div>`;
    $("#pres").appendChild(oc);
    const row = document.createElement("div"); row.innerHTML = `<label class="meta" style="display:block;margin:8px 0"><input type="checkbox" id="psave"> Keep a small copy of this top-down photo with the layout (stored only on this phone)</label><div class="row"><button class="btn" id="puse">Use this layout</button></div>`; $("#pres").appendChild(row);
    $("#puse").onclick = () => { const balls = det.balls.filter((b) => b !== det.cue).map((b) => ({ n: b.n || 0, x: b.x, y: b.y })); const firstN = balls.find((b) => b.n); const lay = { size, cb: det.cue ? [det.cue.x, det.cue.y] : [T.L * 0.25, T.W * 0.5], balls, ob: firstN ? firstN.n : null, pocket: "auto", target: [T.L / 2, T.W / 2], name: "From photo " + new Date().toLocaleDateString(), notes: "" };
      if ($("#psave").checked) { const sc = document.createElement("canvas"); sc.width = 400; sc.height = Math.round(400 * warped.h / warped.w); sc.getContext("2d").drawImage(oc, 0, 0, sc.width, sc.height); lay.photo = sc.toDataURL("image/jpeg", 0.6); }
      setLayout(lay); back(); }; }
};
})();
