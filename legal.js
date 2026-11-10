// Legal gate: first-launch notice (exact text from NOTICE-shown-to-users.txt) and the MIT license (LICENSE.txt).
(function(){
const NOTICE = "Before you use this software\n\nThis software is free and provided \"AS IS,\" with no warranty of any kind.\nYou use it entirely at your own risk. The author is not responsible for any\ndamage, data loss, account issues, or other problems that come from using it.\n\nSome tools may interact with third-party games or services. Using them may\nbreak those services' rules, and you alone are responsible for how you use\nthis software.\n\nBy downloading, installing, or using this software, you agree to these terms\nand to the full license in the LICENSE file.\n\n[ I Agree ]   [ Exit ]\n";
const LICENSE = "MIT License\n\nCopyright (c) 2026 Scott McCrory (AppsByIdiot)\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n";
const VER = "notice-8cf64aab4e";
const KEY = "poolTrainer.legalAgreed";
window.PT_LICENSE = LICENSE;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function agreed(){ try { const v = JSON.parse(localStorage.getItem(KEY)); return !!(v && v.version === VER); } catch (e) { return !!window.__ptAgreedSession; } }
function setAgreed(){ window.__ptAgreedSession = true; try { localStorage.setItem(KEY, JSON.stringify({ version: VER, date: new Date().toISOString() })); } catch (e) {} }
const app = () => ["header", "main", "nav"].map((s) => document.querySelector(s)).filter(Boolean);
function lock(on){ app().forEach((el) => { if (on) { el.setAttribute("inert", ""); el.setAttribute("aria-hidden", "true"); } else { el.removeAttribute("inert"); el.removeAttribute("aria-hidden"); } }); document.documentElement.style.overflow = on ? "hidden" : ""; }
const ST = "position:fixed;inset:0;z-index:2147483646;background:var(--bg,#0f1412);color:var(--text,#e9efe9);overflow:auto;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top) + 20px) 20px calc(env(safe-area-inset-bottom) + 24px);font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const BTN = "font:inherit;font-weight:600;padding:12px 22px;border-radius:10px;border:1px solid var(--accent,#4cc38a);margin:6px 8px 6px 0;min-width:120px";
function noticeHTML(){
  const paras = NOTICE.replace(/\r/g, "").replace(/\n+$/, "").split(/\n\s*\n/);
  let h = "";
  paras.forEach((p, i) => {
    const t = p.split("\n").join(" ");
    if (i === 0) { h += `<h1 id="ptlg-h" style="font-size:22px;margin:0 0 14px">${esc(t)}</h1>`; return; }
    if (/^\[ I Agree \]\s+\[ Exit \]$/.test(t)) { h += `<div style="margin-top:18px"><button id="ptlg-ok" style="${BTN};background:var(--accent,#4cc38a);color:#fff">I Agree</button><button id="ptlg-exit" style="${BTN};background:transparent;color:var(--text,#e9efe9)">Exit</button></div>`; return; }
    h += `<p style="margin:0 0 14px">${esc(t).replace("LICENSE", '<a href="#" id="ptlg-lic" style="color:var(--accent,#4cc38a)">LICENSE</a>')}</p>`;
  });
  return h;
}
function showLicense(back){
  const o = document.createElement("div"); o.id = "ptlg-licv"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", "License");
  o.style.cssText = ST.replace("2147483646", "2147483647");
  o.innerHTML = `<pre style="white-space:pre-wrap;word-wrap:break-word;font:13px/1.45 ui-monospace,Menlo,monospace;margin:0 0 16px">${esc(LICENSE)}</pre><button id="ptlg-licx" style="${BTN};background:transparent;color:var(--text,#e9efe9)">Close</button>`;
  document.body.appendChild(o);
  o.querySelector("#ptlg-licx").onclick = () => { o.remove(); if (back) back(); };
}
window.PT_showLicense = () => showLicense();
function gate(){
  let g = document.getElementById("ptlg");
  if (!g) { g = document.createElement("div"); g.id = "ptlg"; g.setAttribute("role", "dialog"); g.setAttribute("aria-modal", "true"); g.setAttribute("aria-labelledby", "ptlg-h"); g.style.cssText = ST; document.body.appendChild(g); }
  g.innerHTML = `<div style="max-width:640px;margin:0 auto">${noticeHTML()}</div>`;
  lock(true);
  g.querySelector("#ptlg-lic").onclick = (e) => { e.preventDefault(); showLicense(); };
  g.querySelector("#ptlg-ok").onclick = () => { setAgreed(); g.remove(); lock(false); };
  g.querySelector("#ptlg-exit").onclick = () => { try { window.close(); } catch (e) {} setTimeout(() => blocked(g), 150); };
  setTimeout(() => { const b = g.querySelector("#ptlg-ok"); if (b) b.focus(); }, 0);
}
function blocked(g){
  g.innerHTML = `<div style="max-width:640px;margin:0 auto"><h1 id="ptlg-h" style="font-size:22px;margin:0 0 14px">The Road Warrior: Pool Tracker and Trainer can't be used</h1><p style="margin:0 0 18px">This app can't be used without agreeing to the notice.</p><button id="ptlg-again" style="${BTN};background:var(--accent,#4cc38a);color:#fff">View the notice again</button></div>`;
  g.querySelector("#ptlg-again").onclick = gate;
}
if (!agreed()) gate();
})();
