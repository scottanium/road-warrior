// Rules Compare view. Data comes from rulesets.js (window.RulesData).
(function(){
const D = window.RulesData;
const L = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const S = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
function resolved(){
  const by = {}; D.RS_SETS.forEach((s) => by[s.id] = s);
  const out = {};
  D.RS_SETS.forEach((s) => { const base = s.extends ? by[s.extends].rules : {}; out[s.id] = Object.assign({}, s, { rules: Object.assign({}, base, s.rules || {}, s.over || {}) }); });
  return out;
}
const PRI = ["foul", "bih", "call", "scratch8", "combo8", "break", "jump", "open", "safety", "three", "push", "clock", "coach", "stalemate", "timeout", "lag", "equip"];
function termRow(t, ids){ // returns [[id, meaningIndex|-1]]
  return ids.map((id) => [id, t[1].findIndex((m) => m[1].includes(id))]);
}
window.renderRules = function($, esc){
  const R = resolved(), T = Object.fromEntries(D.RS_TOPICS);
  let sel = L("pt_rcsel", ["upg", "ipa"]).filter((id) => R[id]); if (sel.length < 2) sel = ["upg", "ipa"];
  const only = L("pt_rcdiff", true);
  const src = (c) => { const b = D.RS_BOOKS[c[2]]; return b ? `<a href="${esc(b[1])}" target="_blank" rel="noopener">${esc(b[0])}${c[3] ? " §" + esc(c[3]) : ""}</a>` : ""; };
  const nm = (id) => esc(R[id].name);
  $("#title").textContent = "Rules Compare";
  $("#headx").innerHTML = "";
  let h = `<p class="muted">Pick two or more rule sets. Each cell sums up the official rulebook in plain words and links to the section. APA isn't included. "Not addressed" means that rulebook is silent on the topic.</p>`;
  h += `<div class="card"><div class="t">Rule sets</div><div class="chips">${D.RS_SETS.map((s) => `<label class="chip${sel.includes(s.id) ? " on" : ""}"><input type="checkbox" data-rs="${s.id}"${sel.includes(s.id) ? " checked" : ""}> ${esc(s.name)}</label>`).join("")}</div>
    <label class="tog"><input type="checkbox" id="rcdiff"${only ? " checked" : ""}> Show only differences</label></div>`;
  sel.forEach((id) => { if (R[id].note) h += `<div class="card"><div class="meta"><b>${nm(id)}:</b> ${esc(R[id].note)}</div></div>`; });
  // crossing-over gotchas
  const diffTopics = PRI.filter((k) => { const v = sel.map((id) => R[id].rules[k][0]); return new Set(v).size > 1 && !v.includes("na"); });
  const termG = D.RS_TERMS.filter((t) => { const m = new Set(termRow(t, sel).map((x) => x[1]).filter((i) => i >= 0)); return m.size > 1; });
  h += `<h2>Crossing over: top gotchas</h2><div class="card"><ol class="gotcha">`;
  diffTopics.slice(0, 6).forEach((k) => { h += `<li><b>${esc(T[k])}:</b> ${sel.map((id) => `<i>${nm(id)}</i>: ${esc(R[id].rules[k][1])}`).join(" <b>vs</b> ")}</li>`; });
  termG.slice(0, 5).forEach((t) => { h += `<li><b>Words: "${esc(t[0])}"</b>: ${esc(t[2])}</li>`; });
  if (!diffTopics.length && !termG.length) h += `<li>No differences found between these rule sets.</li>`;
  h += `</ol></div>`;
  // topics
  h += `<h2>By topic</h2>`;
  D.RS_TOPICS.forEach(([k, lab]) => {
    const cells = sel.map((id) => R[id].rules[k]); const same = new Set(cells.map((c) => c[0])).size === 1; const gap = !same && cells.some((c) => c[0] === "na");
    if (only && same) return;
    h += `<div class="card rc"><div class="t">${esc(lab)} ${same ? '<span class="pill sourced">Same</span>' : gap ? '<span class="pill">One rulebook is silent</span>' : '<span class="pill derived">Differs</span>'}</div>${sel.map((id, i) => { const c = cells[i]; return `<div class="rcrow"><div class="rcn">${nm(id)}</div><div class="desc${c[0] === "na" ? " muted" : ""}">${esc(c[1])}</div><div class="rcs">${src(c)}</div></div>`; }).join("")}</div>`;
  });
  if (only && D.RS_TOPICS.every(([k]) => new Set(sel.map((id) => R[id].rules[k][0])).size === 1)) h += `<p class="muted">Every topic matches.</p>`;
  // terminology
  h += `<h2>Terminology</h2><p class="muted">The same word can mean different things, and different words can mean the same thing. These meanings come from the rulebooks, so check the term before you argue a call.</p>`;
  D.RS_TERMS.forEach((t) => {
    const rows = termRow(t, sel); const ms = new Set(rows.map((x) => x[1]).filter((i) => i >= 0)); const dif = ms.size > 1;
    if (only && !dif) return;
    h += `<div class="card rc"><div class="t">${esc(t[0])} ${dif ? '<span class="pill derived">Gotcha</span>' : ""}</div><div class="desc">${esc(t[2])}</div>${rows.map(([id, i]) => { const m = t[1][i]; return `<div class="rcrow"><div class="rcn">${nm(id)}</div><div class="desc${m ? "" : " muted"}">${m ? esc(m[0]) : "Not mapped for this rule set"}</div><div class="rcs">${m ? src([0, 0, m[2], m[3]]) : ""}</div></div>`; }).join("")}</div>`;
  });
  h += `<details class="card"><summary>Terms checked but not found in any of these rulebooks</summary><ul>${D.RS_TERMS_NOTFOUND.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>`;
  h += `<details class="card"><summary>Rulebooks used</summary><ul>${Object.values(D.RS_BOOKS).map((b) => `<li><a href="${esc(b[1])}" target="_blank" rel="noopener">${esc(b[0])}</a></li>`).join("")}</ul><p class="muted">To add a rule set, add its rulebook and an entry in rulesets.js. A set can copy another set and change only some topics.</p></details>`;
  $("#main").innerHTML = h;
  document.querySelectorAll("[data-rs]").forEach((c) => c.onchange = () => { const id = c.dataset.rs; let s = sel.slice(); if (c.checked) s.push(id); else s = s.filter((x) => x !== id); if (s.length < 2) { c.checked = true; alert("Pick at least two rule sets."); return; } S("pt_rcsel", s); window.renderRules($, esc); });
  $("#rcdiff").onchange = (e) => { S("pt_rcdiff", e.target.checked); window.renderRules($, esc); };
};
})();
