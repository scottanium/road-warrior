// Appearance UI for the More screen. Theme engine (apply, presets, storage) lives in the head script as window.PT_Theme.
(function () {
  const T = window.PT_Theme;
  if (!T) return;
  const ORDER = ["dark", "light", "midnight", "felt", "contrast", "warm", "custom"];
  const labels = { dark: "Dark", light: "Light", midnight: "Midnight Blue", felt: "Felt Green", contrast: "High Contrast", warm: "Warm", custom: "Custom" };
  const blurbs = { dark: "Default" };

  function swatchColors(id, saved) {
    if (id === "custom") {
      const s = saved && saved.id === "custom" ? saved : T.load();
      return s && s.id === "custom" ? T.derive(s.bg, s.text, s.accent) : T.PRESETS.dark;
    }
    return T.PRESETS[id] || T.PRESETS.dark;
  }

  function contrastNote(c) {
    const r = Math.min(T.contrast(c.text, c.bg), T.contrast(c.text, c.card));
    if (r >= 4.5) return { low: false, text: "Contrast looks good (" + r.toFixed(1) + ":1)." };
    return { low: true, text: "These colors may be hard to read (" + r.toFixed(1) + ":1). Try a darker background with lighter letters, or the other way around." };
  }

  function swatchesHTML(saved) {
    const cur = (saved && saved.id) || "dark";
    return `<div class="theme-presets" role="listbox" aria-label="Color schemes">${ORDER.map((id) => {
      const c = swatchColors(id, saved);
      const on = cur === id;
      return `<button type="button" class="theme-swatch${on ? " on" : ""}" data-theme="${id}" role="option" aria-selected="${on}" aria-pressed="${on}">
        <span class="theme-dot" style="background:${c.bg};border-color:${c.line}"><i style="background:${c.accent}"></i></span>
        ${labels[id]}${blurbs[id] ? `<small>${blurbs[id]}</small>` : ""}
      </button>`;
    }).join("")}</div>`;
  }

  function customHTML(saved) {
    const on = saved && saved.id === "custom";
    const c = on ? T.derive(saved.bg, saved.text, saved.accent) : T.colorsOf(saved);
    const note = contrastNote(c);
    return `<div id="theme-custom" class="theme-custom"${on ? "" : " hidden"}>
      <div class="theme-colors">
        <label>Background <input type="color" id="tc-bg" value="${c.bg}" aria-label="Background color"></label>
        <label>Letters <input type="color" id="tc-text" value="${c.text}" aria-label="Letter color"></label>
        <label>Accent <input type="color" id="tc-accent" value="${c.accent}" aria-label="Accent color"></label>
      </div>
      <div id="tc-warn" class="callout ${note.low ? "warnc" : ""}" ${note.low ? "" : "hidden"}>${note.text}</div>
    </div>
    <div class="theme-live card" id="tc-preview" aria-hidden="true">
      <div class="t">Preview</div>
      <p class="meta">Secondary text and a sample button, using your colors.</p>
      <div class="row"><span class="btn sm">Button</span><span class="btn ghost sm" style="display:inline-flex">Ghost</span></div>
    </div>`;
  }

  T.sectionHTML = function () {
    const saved = T.load();
    return `<div class="card" id="pttheme">
      <div class="t">Appearance</div>
      <p class="meta">Color scheme for the app. Dark with white letters is the default, and it no longer follows your phone's light or dark setting.</p>
      ${swatchesHTML(saved)}
      ${customHTML(saved)}
      <div class="row theme-actions"><button type="button" class="btn ghost" id="tc-reset">Reset to default</button></div>
    </div>`;
  };

  function refreshPanel() {
    const host = document.getElementById("pttheme");
    if (!host) return;
    const saved = T.load();
    const html = T.sectionHTML();
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    host.replaceWith(tmp.firstElementChild);
    T.wire();
  }

  T.wire = function () {
    const host = document.getElementById("pttheme");
    if (!host || host.dataset.wired) return;
    host.dataset.wired = "1";
    host.querySelectorAll("[data-theme]").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.theme;
        if (id === "custom") {
          const cur = T.colorsOf(T.load());
          const prev = T.load();
          const t = { id: "custom", bg: prev.bg || cur.bg, text: prev.text || cur.text, accent: prev.accent || cur.accent };
          T.save(t); T.apply(t);
        } else {
          const t = { id }; T.save(t); T.apply(t);
        }
        refreshPanel();
      };
    });
    const applyCustom = () => {
      const bg = document.getElementById("tc-bg");
      const text = document.getElementById("tc-text");
      const accent = document.getElementById("tc-accent");
      if (!bg || !text || !accent) return;
      const t = { id: "custom", bg: bg.value, text: text.value, accent: accent.value };
      T.save(t);
      const c = T.apply(t);
      const warn = document.getElementById("tc-warn");
      if (warn) {
        const note = contrastNote(c);
        warn.hidden = !note.low;
        warn.classList.toggle("warnc", note.low);
        warn.textContent = note.text;
      }
    };
    ["tc-bg", "tc-text", "tc-accent"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", applyCustom);
    });
    const reset = document.getElementById("tc-reset");
    if (reset) reset.onclick = () => { T.reset(); refreshPanel(); };
  };
})();
