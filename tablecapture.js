// Table Capture: overhead phone camera -> calibrated, to-scale layouts and shot paths; Projector mode maps them back onto the table.
// Everything runs on the device; no frames are uploaded. Math section is pure and unit-tested with node (tests/tc_test.js).
(function(root){
"use strict";
const R = 1.125; // ball radius, in
const SIZES = { "7": { L: 78, W: 39, name: "7 ft (78x39 in)" }, "8": { L: 88, W: 44, name: "8 ft (88x44 in)" }, "9": { L: 100, W: 50, name: "9 ft (100x50 in)" }, "10": { L: 112, W: 56, name: "10 ft (112x56 in)" } };

// ---------- math ----------
function solve(A, b){ const n = b.length; for (let i = 0; i < n; i++){ let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]]; if (Math.abs(A[i][i]) < 1e-12) return null; for (let r = i + 1; r < n; r++){ const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } } const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--){ let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; } return x; }
// DLT with 4 point pairs (h33 = 1): H maps src -> dst. Points are normalized first for numerical stability.
function norm4(p){ let cx = 0, cy = 0; p.forEach((q) => { cx += q[0] / 4; cy += q[1] / 4; }); let d = 0; p.forEach((q) => { d += Math.hypot(q[0] - cx, q[1] - cy) / 4; }); const s = d ? Math.SQRT2 / d : 1; return [s, 0, -s * cx, 0, s, -s * cy, 0, 0, 1]; }
function mul3(A, B){ const C = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C.push(A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]); return C; }
function inv3(H){ const [a,b,c,d,e,f,g,h,i] = H, A = e*i-f*h, B = -(d*i-f*g), C = d*h-e*g, det = a*A + b*B + c*C; return [A/det, -(b*i-c*h)/det, (b*f-c*e)/det, B/det, (a*i-c*g)/det, -(a*f-c*d)/det, C/det, -(a*h-b*g)/det, (a*e-b*d)/det]; }
const apply = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
function homog(src, dst){ const Ts = norm4(src), Td = norm4(dst), s = src.map((p) => apply(Ts, p[0], p[1])), d = dst.map((p) => apply(Td, p[0], p[1])); const A = [], b = [];
  for (let i = 0; i < 4; i++){ const [x, y] = s[i], [u, v] = d[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  const h = solve(A, b); if (!h) return null; const Hn = mul3(inv3(Td), mul3([h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1], Ts)); return Hn.map((v) => v / Hn[8]); }
const tableCorners = (T) => [[0, 0], [T.L, 0], [T.L, T.W], [0, T.W]];
// Lookup table for a top-down warp: for each output pixel (L*ppi x W*ppi), index of the nearest source pixel inside a crop box (or -1).
function warpLUT(H, L, W, ppi, bx, by, bw, bh){ const ow = Math.round(L * ppi), oh = Math.round(W * ppi), lut = new Int32Array(ow * oh);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++){ const p = apply(H, (x + 0.5) / ppi, (y + 0.5) / ppi), ix = Math.round(p[0] - 0.5) - bx, iy = Math.round(p[1] - 0.5) - by; lut[y * ow + x] = ix < 0 || iy < 0 || ix >= bw || iy >= bh ? -1 : iy * bw + ix; }
  return { lut, w: ow, h: oh }; }
function gather(src, lut, out){ for (let i = 0, n = lut.length; i < n; i++){ const j = lut[i], o = i * 4; if (j < 0){ out[o] = out[o + 1] = out[o + 2] = 0; out[o + 3] = 255; continue; } const k = j * 4; out[o] = src[k]; out[o + 1] = src[k + 1]; out[o + 2] = src[k + 2]; out[o + 3] = 255; } return out; }
// The camera sees the sphere's center, which projects onto the cloth further from the camera than the contact point. Pull it back.
function parallax(p, cam){ if (!cam || !(cam.h > R + 1)) return p; const k = (cam.h - R) / cam.h; return [cam.x + (p[0] - cam.x) * k, cam.y + (p[1] - cam.y) * k]; }
function hsv(r, g, b){ r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d){ if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; }
function clothOf(px, w, h){ const rs = [], gs = [], bs = []; for (let i = 0; i < w * h; i += 3){ const o = i * 4; rs.push(px[o]); gs.push(px[o + 1]); bs.push(px[o + 2]); } const med = (a) => a.sort((p, q) => p - q)[a.length >> 1] || 0; return [med(rs), med(gs), med(bs)]; }
// Ball finder on a top-down RGBA image (ppi px per inch). Returns centers in inches (before parallax correction) plus color stats.
function findBalls(px, w, h, ppi, opt){ opt = opt || {}; const cl = opt.cloth || clothOf(px, w, h), [cr, cg, cb] = cl, cs = cr + cg + cb + 1, cv = Math.max(cr, cg, cb) + 1;
  const L = w / ppi, W = h / ppi, pk = [[0,0],[L/2,0],[L,0],[0,W],[L/2,W],[L,W]], mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){ const o = (y * w + x) * 4, r = px[o], g = px[o + 1], b = px[o + 2], s = r + g + b + 1, v = Math.max(r, g, b);
    const chroma = Math.abs(r / s - cr / cs) + Math.abs(g / s - cg / cs) + Math.abs(b / s - cb / cs);
    if ((chroma > (opt.chroma || 0.16) && v > cv * 0.45) || v > cv * 1.45 || v < cv * 0.3) mask[y * w + x] = 1; }
  const er = new Uint8Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++){ const i = y * w + x; er[i] = mask[i] && mask[i - 1] && mask[i + 1] && mask[i - w] && mask[i + w] ? 1 : 0; }
  const rp = R * ppi, A1 = Math.PI * Math.max(1, rp - 1) ** 2, lab = new Int32Array(w * h), out = []; let id = 0;
  for (let i0 = 0; i0 < w * h; i0++){ if (!er[i0] || lab[i0]) continue; id++; const stk = [i0], pxs = []; lab[i0] = id;
    while (stk.length){ const j = stk.pop(); pxs.push(j); const x = j % w; for (const k of [j - 1, j + 1, j - w, j + w]){ if (k < 0 || k >= w * h || lab[k] || !er[k]) continue; if (Math.abs((k % w) - x) > 1) continue; lab[k] = id; stk.push(k); } }
    const area = pxs.length; if (area < 0.35 * A1) continue; const n = Math.max(1, Math.round(area / (A1 * 0.9))); if (n > (opt.maxN || 6)) continue; // hands, arms, cue case
    let sx = 0, sy = 0, mnx = 1e9, mxx = -1, mny = 1e9, mxy = -1; for (const j of pxs){ const x = j % w, y = (j / w) | 0; sx += x; sy += y; mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
    const cx = sx / area, cy = sy / area; let sxx = 0, syy = 0, sxy = 0; for (const j of pxs){ const dx = (j % w) - cx, dy = ((j / w) | 0) - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; } sxx /= area; syy /= area; sxy /= area;
    const tr = sxx + syy, dt = Math.sqrt(Math.max(0, (sxx - syy) ** 2 / 4 + sxy * sxy)), smin = Math.sqrt(Math.max(0, tr / 2 - dt)); if (4 * smin < rp * 1.2) continue; // thinner than a ball: cue stick, chalk line, shadow edge
    let cen = [[cx, cy]]; if (n > 1){ const bw = mxx - mnx + 1, bh = mxy - mny + 1; cen = []; for (let k = 0; k < n; k++){ const t = (k + 0.5) / n; cen.push(bw > bh ? [mnx + bw * t, cy] : [cx, mny + bh * t]); }
      for (let it = 0; it < 12; it++){ const acc = cen.map(() => [0, 0, 0]); for (const j of pxs){ const x = j % w, y = (j / w) | 0; let bi = 0, bd = 1e18; cen.forEach((c, ci) => { const dd = (c[0] - x) ** 2 + (c[1] - y) ** 2; if (dd < bd){ bd = dd; bi = ci; } }); acc[bi][0] += x; acc[bi][1] += y; acc[bi][2]++; } cen = acc.map((a, ci) => a[2] ? [a[0] / a[2], a[1] / a[2]] : cen[ci]); } }
    for (const [x, y] of cen){ const q = [(x + 0.5) / ppi, (y + 0.5) / ppi]; if (pk.some((p) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 3.2)) continue;
      let wht = 0, drk = 0, col = 0, tot = 0, hx = 0, hy = 0, vs = 0, br = 0; const rr = rp * 0.75;
      for (let yy = Math.round(y - rr); yy <= y + rr; yy++) for (let xx = Math.round(x - rr); xx <= x + rr; xx++){ if ((xx - x) ** 2 + (yy - y) ** 2 > rr * rr || xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const o = (yy * w + xx) * 4, [Hh, S, V] = hsv(px[o], px[o + 1], px[o + 2]); tot++; br += V;
        if (S < 0.28 && V > 0.6) wht++; else if (V < 0.22) drk++; else if (S > 0.35){ col++; hx += Math.cos(Hh * Math.PI / 180); hy += Math.sin(Hh * Math.PI / 180); vs += V; } }
      tot = tot || 1; out.push({ x: q[0], y: q[1], grp: n, white: wht / tot, dark: drk / tot, col: col / tot, hue: (Math.atan2(hy, hx) * 180 / Math.PI + 360) % 360, val: col ? vs / col : 0, bright: br / tot }); } }
  return { balls: out, cloth: cl }; }
// Number guesses from color (rough; the user confirms). Cue ball = whitest, n = 0.
function guessNumbers(balls){ let cue = null; const ws = (b) => b.white + b.bright * 0.3 - (b.grp > 1 ? 0.25 : 0); for (const b of balls) if (b.white > 0.3 && b.col < 0.45 && (!cue || ws(b) > ws(cue))) cue = b;
  if (!cue && balls.length) cue = balls.reduce((a, b) => ws(b) > ws(a) ? b : a);
  const gs = []; for (const b of balls){ if (b === cue) continue; let n = 0, conf = 0; if (b.dark > 0.45 && b.col < 0.2){ n = 8; conf = b.dark; } else if (b.col > 0.2){ const hh = b.hue; const base = hh >= 340 || hh < 14 ? (b.val < 0.5 ? 7 : 3) : hh < 38 ? 5 : hh < 70 ? 1 : hh < 170 ? 6 : hh < 255 ? 2 : 4; n = base + (b.white > 0.2 ? 8 : 0); conf = b.col; } gs.push([conf, b, n]); }
  gs.sort((a, b) => b[0] - a[0]); const used = new Set(); for (const [, b, n] of gs){ if (n && !used.has(n)){ b.n = n; used.add(n); } else b.n = -1; }
  let nx = 1; for (const b of balls){ if (b === cue){ b.n = 0; continue; } if (b.n < 0){ while (used.has(nx)) nx++; b.n = nx; used.add(nx); } } return balls; }
// Nearest-blob tracker in table inches. t in seconds.
function Tracker(init){ this.tr = init.map((b) => ({ n: b.n, p0: [b.x, b.y], last: [b.x, b.y], v: [0, 0], lt: 0, pts: [[+b.x.toFixed(2), +b.y.toFixed(2), 0]], maxD: 0 })); this.lastMotion = -1; this.t = 0; }
Tracker.prototype.step = function(blobs, t){ const cand = []; this.t = t;
  this.tr.forEach((k, ki) => { const dt = Math.max(0.001, t - k.lt), pr = [k.last[0] + k.v[0] * Math.min(dt, 0.1), k.last[1] + k.v[1] * Math.min(dt, 0.1)], lim = Math.min(30, Math.max(2.5, 400 * dt));
    blobs.forEach((b, bi) => { const d = Math.hypot(b.x - pr[0], b.y - pr[1]); if (d < lim) cand.push([d, ki, bi]); }); });
  cand.sort((a, b) => a[0] - b[0]); const ut = new Set(), ub = new Set(); let moved = false;
  for (const [, ki, bi] of cand){ if (ut.has(ki) || ub.has(bi)) continue; ut.add(ki); ub.add(bi); const k = this.tr[ki], b = blobs[bi], dt = Math.max(0.001, t - k.lt), step = Math.hypot(b.x - k.last[0], b.y - k.last[1]);
    const nv = [(b.x - k.last[0]) / dt, (b.y - k.last[1]) / dt]; k.v = step > 0.35 ? [k.v[0] * 0.4 + nv[0] * 0.6, k.v[1] * 0.4 + nv[1] * 0.6] : [0, 0];
    if (step > 0.35){ moved = true; k.last = [b.x, b.y]; k.lt = t; k.pts.push([+b.x.toFixed(2), +b.y.toFixed(2), +t.toFixed(3)]); k.maxD = Math.max(k.maxD, Math.hypot(b.x - k.p0[0], b.y - k.p0[1])); } else k.lt = t; }
  if (moved) this.lastMotion = t; return moved; };
Tracker.prototype.paths = function(minD){ return this.tr.filter((k) => k.maxD > (minD || 1.5)).map((k) => ({ n: k.n, pts: k.pts })); };
// Remove one-frame spikes and near-duplicate points.
function cleanPath(pts){ if (pts.length < 3) return pts.slice(); const st = []; for (let i = 1; i < pts.length; i++) st.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); const med = st.slice().sort((a, b) => a - b)[st.length >> 1] || 1, lim = Math.max(1.5, med * 3);
  let out = [pts[0]]; for (let i = 1; i < pts.length - 1; i++){ const a = out[out.length - 1], p = pts[i], b = pts[i + 1], da = Math.hypot(p[0] - a[0], p[1] - a[1]), db = Math.hypot(p[0] - b[0], p[1] - b[1]), dab = Math.hypot(a[0] - b[0], a[1] - b[1]); if (da > lim && db > lim && dab < lim) continue; if (da < 0.1) continue; out.push(p); }
  out.push(pts[pts.length - 1]); return out; }
const TCMath = { R, SIZES, homog, apply, inv3, tableCorners, warpLUT, gather, parallax, findBalls, guessNumbers, Tracker, cleanPath, clothOf };
if (typeof module !== "undefined" && module.exports) module.exports = TCMath;
if (typeof document === "undefined") return;
root.TCMath = TCMath;

// ---------- storage ----------
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { alert("Couldn't save: storage is full. Delete some saved captures."); return false; } };
const COL = { 1: "#f5c518", 2: "#1e5bd8", 3: "#d32f2f", 4: "#6a1b9a", 5: "#ef6c00", 6: "#1b8f3a", 7: "#7b1f1f", 8: "#111" };
const PCOL = { 0: "#ffffff", 1: "#ffe14d", 2: "#5aa0ff", 3: "#ff5a5a", 4: "#c77dff", 5: "#ffa040", 6: "#4dff88", 7: "#ff7a7a", 8: "#d0d0d0" }; // bright versions for projection
const ballCol = (n) => n === 0 ? "#fffef5" : COL[n > 8 ? n - 8 : n] || "#9e9e9e";
const projCol = (n) => PCOL[n > 8 ? n - 8 : n] || "#ffffff";
const PATHC = ["#00e5ff", "#ffea00", "#ff40ff", "#76ff03", "#ff9100", "#ff5252"];
const dims = (size) => SIZES[size] || (root.ShotLab && root.ShotLab.TABLES[size]) || SIZES["9"];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const cssVar = (n, fb) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb; } catch (e) { return fb; } };
const setups = () => LS("pt_tc_setups", []);
const curSetup = () => { const all = setups(), id = LS("pt_tc_setup", null); return all.find((s) => s.id === id) || all[0] || null; };
const camOf = (s) => { const T = dims(s.size); return { x: T.L / 2, y: -(+s.camD || 17), h: +s.camH || 60 }; };

// ---------- capture state ----------
const C = { sub: "setup", stream: null, video: null, src: "", frame: null, corners: [], selC: -1, lay: null, under: "", sel: -1, trk: null, running: false, ptEdit: false, raw: null };
function video(){ if (!C.video){ const v = document.createElement("video"); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", ""); v.muted = true; v.playsInline = true; v.autoplay = true; v.style.cssText = "width:100%;height:auto;display:block;border-radius:10px;background:#000"; C.video = v; } return C.video; }
function stop(){ C.running = false; if (C.stream){ C.stream.getTracks().forEach((t) => t.stop()); C.stream = null; } if (C.video){ try { C.video.pause(); } catch (e) {} } }
async function startCam(){ const v = video(); stop(); if (v.src){ URL.revokeObjectURL(v.src); v.removeAttribute("src"); }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("This browser can't stream the camera. Use 'Load a video' instead.");
  const tries = [{ facingMode: { ideal: "environment" }, frameRate: { ideal: 60 }, width: { ideal: 3840 }, height: { ideal: 2160 } }, { facingMode: { ideal: "environment" }, frameRate: { ideal: 60 } }, { facingMode: "environment" }, true];
  let s = null, err = null; for (const c of tries){ try { s = await navigator.mediaDevices.getUserMedia({ video: c, audio: false }); break; } catch (e) { err = e; } }
  if (!s) throw err || new Error("Camera unavailable");
  C.stream = s; v.controls = false; v.srcObject = s; C.src = "cam"; await v.play().catch(() => {}); }
function loadFile(f){ const v = video(); stop(); v.srcObject = null; if (v.src) URL.revokeObjectURL(v.src); v.src = URL.createObjectURL(f); v.controls = true; C.src = "file";
  v.addEventListener("loadeddata", () => { v.play().then(() => v.pause()).catch(() => {}); }, { once: true }); v.load(); }
function camInfo(){ const v = C.video; if (!v || !v.videoWidth) return C.src ? "Waiting for video…" : "No video yet."; let s = `${v.videoWidth}×${v.videoHeight}`; if (C.stream){ const t = C.stream.getVideoTracks()[0], g = t && t.getSettings ? t.getSettings() : {}; if (g.frameRate) s += ` at ${Math.round(g.frameRate)} fps`; s += " (live camera)"; } else s += " (video file)"; return s; }
function grab(maxSide){ const v = C.video; if (!v || !v.videoWidth) return null; const sc = Math.min(1, (maxSide || 1920) / Math.max(v.videoWidth, v.videoHeight)), cv = document.createElement("canvas"); cv.width = Math.round(v.videoWidth * sc); cv.height = Math.round(v.videoHeight * sc); const ctx = cv.getContext("2d", { willReadFrequently: true }); ctx.drawImage(v, 0, 0, cv.width, cv.height); return cv; }
function Hfor(s, w, h){ return homog(tableCorners(dims(s.size)), s.corners.map(([x, y]) => [x * w, y * h])); }
function topDown(cv, s, ppi){ const T = dims(s.size), H = Hfor(s, cv.width, cv.height); if (!H) return null; const W = warpLUT(H, T.L, T.W, ppi, 0, 0, cv.width, cv.height), src = cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data, out = new Uint8ClampedArray(W.w * W.h * 4); gather(src, W.lut, out); return { px: out, w: W.w, h: W.h, ppi }; }
function tdCanvas(td){ const c = document.createElement("canvas"); c.width = td.w; c.height = td.h; c.getContext("2d").putImageData(new ImageData(td.px, td.w, td.h), 0, 0); return c; }

// ---------- diagram (to scale, same look as Shot Lab) ----------
function diagram(lay, o){ o = o || {}; const T = dims(lay.size), L = T.L, W = T.W, rl = 4.5, acc = cssVar("--accent", "#4cc38a");
  let s = `<svg id="${o.id || "tcsvg"}" viewBox="${-rl} ${-rl} ${L + 2 * rl} ${W + 2 * rl}" style="width:100%;height:auto;display:block;border-radius:12px;background:#4a2c17;touch-action:${o.edit ? "none" : "pan-x pan-y pinch-zoom"}" aria-label="Captured layout, to scale">`;
  s += `<rect x="0" y="0" width="${L}" height="${W}" fill="#1f6f43"/>`;
  if (o.under && C.under) s += `<image href="${C.under}" xlink:href="${C.under}" x="0" y="0" width="${L}" height="${W}" preserveAspectRatio="none" opacity=".9"/>`;
  for (let i = 1; i < 8; i++) s += `<circle cx="${L * i / 8}" cy="${-rl / 2}" r=".45" fill="#eee"/><circle cx="${L * i / 8}" cy="${W + rl / 2}" r=".45" fill="#eee"/>`;
  for (let i = 1; i < 4; i++) s += `<circle cx="${-rl / 2}" cy="${W * i / 4}" r=".45" fill="#eee"/><circle cx="${L + rl / 2}" cy="${W * i / 4}" r=".45" fill="#eee"/>`;
  s += `<line x1="${L / 4}" y1="0" x2="${L / 4}" y2="${W}" stroke="#ffffff22" stroke-width=".25"/><circle cx="${L * 3 / 4}" cy="${W / 2}" r=".4" fill="#ffffff55"/>`;
  for (const [x, y, c] of [[0,0,1],[L/2,-0.6,0],[L,0,1],[0,W,1],[L/2,W+0.6,0],[L,W,1]]) s += `<circle cx="${x}" cy="${y}" r="${c ? 2.28 : 2.53}" fill="#050505"/>`;
  (lay.paths || []).forEach((p, pi) => { const pts = p.pts.slice(p.a || 0, p.b == null ? undefined : p.b + 1); if (pts.length < 2) return; const c = PATHC[pi % PATHC.length];
    s += `<polyline points="${pts.map((q) => q[0] + "," + q[1]).join(" ")}" fill="none" stroke="${c}" stroke-width=".35" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (o.ptEdit) pts.forEach((q, k) => { s += `<circle data-pp="${pi}:${k + (p.a || 0)}" cx="${q[0]}" cy="${q[1]}" r=".7" fill="${c}" fill-opacity=".5"/>`; }); });
  (lay.balls || []).forEach((b, i) => { const stp = b.n > 8, on = o.edit && i === C.sel, dk = b.n === 8 || b.n === 2 || b.n === 4 || b.n === 7 || b.n === 6;
    s += `<g data-bi="${i}" transform="translate(${b.x},${b.y})"><circle r="${R}" fill="${stp ? "#fffef5" : ballCol(b.n)}" stroke="${on ? acc : "#000"}" stroke-width="${on ? .35 : .12}"/>`;
    if (stp) s += `<rect x="${-R}" y="-.5" width="${2 * R}" height="1" fill="${ballCol(b.n)}"/>`;
    if (b.n > 0) s += `<text y=".38" text-anchor="middle" font-size="1.05" font-weight="700" fill="${dk && !stp ? "#fff" : "#000"}" style="pointer-events:none">${b.n}</text>`;
    if (o.edit) s += `<circle r="${R + 1.6}" fill="#000" fill-opacity="0"/>`;
    s += `</g>`; });
  return s + `</svg>`; }
function svgPt(svg, e){ const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, q.y]; }

// ---------- projector ----------
const PJ = { on: false, show: "both", grid: false, cal: false, bar: true, sel: 0, lay: null, drag: null, wasFS: false, req: false, lock: null, scrollY: 0 };
function projCal(){ const c = LS("pt_tc_projcal", null); return c && c.c && c.c.length === 4 ? c : { c: [[0.08, 0.12], [0.92, 0.12], [0.92, 0.88], [0.08, 0.88]] }; }
function openProjector(lay){ if (PJ.on) return; PJ.on = true; PJ.lay = lay || null; PJ.cal = !LS("pt_tc_projcal", null); PJ.grid = PJ.cal || !lay; PJ.bar = true;
  PJ.wasFS = document.body.classList.contains("labfs-on"); PJ.scrollY = window.scrollY || 0;
  const ov = document.createElement("div"); ov.id = "tcproj"; ov.innerHTML = `<canvas id="tcpc"></canvas><div id="tcpbar"></div><button type="button" id="tcpshow" aria-label="Show controls">⋯</button>`; document.body.appendChild(ov);
  if (!PJ.wasFS){ document.body.style.top = "-" + PJ.scrollY + "px"; document.body.classList.add("labfs-on"); }
  document.body.classList.add("tcproj-on");
  const rootEl = document.documentElement, req = rootEl.requestFullscreen || rootEl.webkitRequestFullscreen; PJ.req = false;
  if (req && !(document.fullscreenElement || document.webkitFullscreenElement)){ PJ.req = true; try { Promise.resolve(req.call(rootEl)).catch(() => {}); } catch (e) {} }
  try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then((l) => { PJ.lock = l; }).catch(() => {}); } catch (e) {}
  const cv = ov.querySelector("#tcpc");
  cv.addEventListener("pointerdown", (e) => { if (!PJ.cal){ PJ.bar = !PJ.bar; pjBar(); return; } const cal = projCal(), W = innerWidth, H = innerHeight; let bi = -1, bd = 1e9; cal.c.forEach((p, i) => { const d = Math.hypot(p[0] * W - e.clientX, p[1] * H - e.clientY); if (d < bd){ bd = d; bi = i; } }); if (bd > 70) return; PJ.sel = bi; PJ.drag = { i: bi, x: e.clientX, y: e.clientY, p: cal.c[bi].slice() }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} pjDraw(); });
  cv.addEventListener("pointermove", (e) => { if (!PJ.drag) return; const cal = projCal(), d = PJ.drag; cal.c[d.i] = [d.p[0] + (e.clientX - d.x) / innerWidth, d.p[1] + (e.clientY - d.y) / innerHeight]; SS("pt_tc_projcal", cal); pjDraw(); });
  const up = () => { PJ.drag = null; }; cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  ov.querySelector("#tcpshow").onclick = () => { PJ.bar = true; pjBar(); };
  window.addEventListener("resize", pjDraw); window.addEventListener("keydown", pjKey, true);
  pjBar(); pjDraw(); setTimeout(pjDraw, 400); }
function pjKey(e){ if (!PJ.on) return; if (e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); closeProjector(); return; } const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (m && PJ.cal){ e.preventDefault(); nudge(m[0] * (e.shiftKey ? 5 : 0.5), m[1] * (e.shiftKey ? 5 : 0.5)); } }
function closeProjector(){ if (!PJ.on) return; PJ.on = false; const ov = document.getElementById("tcproj"); if (ov) ov.remove(); document.body.classList.remove("tcproj-on");
  if (!PJ.wasFS){ document.body.classList.remove("labfs-on"); document.body.style.top = ""; window.scrollTo(0, PJ.scrollY || 0); }
  try { const ex = document.exitFullscreen || document.webkitExitFullscreen; if (PJ.req && ex && (document.fullscreenElement || document.webkitFullscreenElement)) ex.call(document); } catch (e) {}
  try { if (PJ.lock) PJ.lock.release(); } catch (e) {} PJ.lock = null; window.removeEventListener("resize", pjDraw); window.removeEventListener("keydown", pjKey, true); }
function nudge(dx, dy){ const cal = projCal(), W = innerWidth, H = innerHeight; const idx = PJ.sel === 4 ? [0, 1, 2, 3] : [PJ.sel]; idx.forEach((i) => { cal.c[i] = [cal.c[i][0] + dx / W, cal.c[i][1] + dy / H]; }); SS("pt_tc_projcal", cal); pjDraw(); }
function pjBar(){ const b = document.getElementById("tcpbar"), sh = document.getElementById("tcpshow"); if (!b) return; b.hidden = !PJ.bar; sh.hidden = PJ.bar;
  const ch = (k, l, on) => `<button type="button" class="tcpb${on ? " on" : ""}" data-pj="${k}">${l}</button>`;
  let h = `<div class="tcprow">${ch("x", "Exit", false)}${PJ.lay ? ch("both", "Both", PJ.show === "both") + ch("balls", "Balls", PJ.show === "balls") + ch("lines", "Lines", PJ.show === "lines") : ""}${ch("grid", "Test grid", PJ.grid)}${ch("cal", "Calibrate", PJ.cal)}${ch("hide", "Hide controls", false)}</div>`;
  if (PJ.cal) h += `<div class="tcprow">${[1, 2, 3, 4].map((n) => ch("c" + (n - 1), "Corner " + n, PJ.sel === n - 1)).join("")}${ch("c4", "All", PJ.sel === 4)}${ch("l", "◀", false)}${ch("u", "▲", false)}${ch("d", "▼", false)}${ch("r", "▶", false)}${ch("fine", PJ.fine ? "Step 0.5 px" : "Step 5 px", false)}${ch("reset", "Reset", false)}</div><div class="tcpnote">Drag each numbered handle onto its table corner (where the cushion noses meet). Corner 1 is the same corner you tapped as 1 in the camera setup. Use the arrows for fine steps, then check with the test grid.</div>`;
  b.innerHTML = h;
  b.querySelectorAll("[data-pj]").forEach((x) => x.onclick = (e) => { e.stopPropagation(); const k = x.dataset.pj, st = PJ.fine ? 0.5 : 5;
    if (k === "x") return closeProjector(); if (k === "both" || k === "balls" || k === "lines") PJ.show = k; else if (k === "grid") PJ.grid = !PJ.grid; else if (k === "cal") PJ.cal = !PJ.cal; else if (k === "hide") PJ.bar = false;
    else if (k[0] === "c" && k.length === 2) PJ.sel = +k[1]; else if (k === "l") return nudge(-st, 0); else if (k === "r") return nudge(st, 0); else if (k === "u") return nudge(0, -st); else if (k === "d") return nudge(0, st);
    else if (k === "fine") PJ.fine = !PJ.fine; else if (k === "reset"){ if (!confirm("Reset the projector corners?")) return; localStorage.removeItem("pt_tc_projcal"); }
    pjBar(); pjDraw(); }); }
function pjDraw(){ const cv = document.getElementById("tcpc"); if (!cv) return; const dpr = window.devicePixelRatio || 1, W = innerWidth, Hh = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); const x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = "#000"; x.fillRect(0, 0, W, Hh);
  const lay = PJ.lay, T = dims(lay ? lay.size : (curSetup() || { size: "9" }).size), cal = projCal(), P = homog(tableCorners(T), cal.c.map((p) => [p[0] * W, p[1] * Hh])); if (!P) return; const m = (a, b) => apply(P, a, b);
  const poly = (pts, close) => { x.beginPath(); pts.forEach((p, i) => { const q = m(p[0], p[1]); if (i) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); }); if (close) x.closePath(); x.stroke(); };
  const scale = (a, b) => { const p = m(a, b), q = m(a + 1, b), r = m(a, b + 1); return (Math.hypot(q[0] - p[0], q[1] - p[1]) + Math.hypot(r[0] - p[0], r[1] - p[1])) / 2; };
  if (PJ.grid){ x.lineWidth = 1; x.strokeStyle = "#5a5a5a"; for (let gx = 6; gx < T.L; gx += 6) poly([[gx, 0], [gx, T.W]]); for (let gy = 6; gy < T.W; gy += 6) poly([[0, gy], [T.L, gy]]);
    x.strokeStyle = "#00e5ff"; x.setLineDash([6, 6]); for (let i = 1; i < 8; i++) poly([[T.L * i / 8, 0], [T.L * i / 8, T.W]]); for (let i = 1; i < 4; i++) poly([[0, T.W * i / 4], [T.L, T.W * i / 4]]); x.setLineDash([]);
    const dd = 3.6875, dm = (cx, cy) => { x.fillStyle = "#ffffff"; x.beginPath(); [[0, -0.7], [0.45, 0], [0, 0.7], [-0.45, 0]].forEach((o, i) => { const q = m(cx + o[0], cy + o[1]); if (i) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); }); x.closePath(); x.fill(); };
    for (let i = 1; i < 8; i++){ dm(T.L * i / 8, -dd); dm(T.L * i / 8, T.W + dd); } for (let i = 1; i < 4; i++){ dm(-dd, T.W * i / 4); dm(T.L + dd, T.W * i / 4); }
    x.lineWidth = 2; x.strokeStyle = "#ffffff"; poly(tableCorners(T), true); x.strokeStyle = "#ffea00"; poly([[T.L / 4, 0], [T.L / 4, T.W]]); const fs = m(T.L * 3 / 4, T.W / 2); x.beginPath(); x.arc(fs[0], fs[1], 3, 0, 7); x.fillStyle = "#ffea00"; x.fill(); }
  if (lay && PJ.show !== "balls") (lay.paths || []).forEach((p, pi) => { const pts = p.pts.slice(p.a || 0, p.b == null ? undefined : p.b + 1); if (pts.length < 2) return; x.lineWidth = 3; x.lineJoin = "round"; x.lineCap = "round"; x.strokeStyle = PATHC[pi % PATHC.length]; poly(pts); });
  if (lay && PJ.show !== "lines") (lay.balls || []).forEach((b) => { const c = projCol(b.n), circ = []; for (let k = 0; k < 48; k++){ const a = k / 48 * Math.PI * 2; circ.push([b.x + R * Math.cos(a), b.y + R * Math.sin(a)]); }
    x.lineWidth = 2.5; x.strokeStyle = c; poly(circ, true); x.lineWidth = 1.5; poly([[b.x - 0.45, b.y], [b.x + 0.45, b.y]]); poly([[b.x, b.y - 0.45], [b.x, b.y + 0.45]]);
    const sc = scale(b.x, b.y), q = m(b.x + R + 0.9, b.y - R - 0.4); x.fillStyle = c; x.font = `700 ${Math.max(10, Math.round(sc * 1.4))}px system-ui,sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(b.n === 0 ? "CB" : String(b.n), q[0], q[1]); });
  if (PJ.cal) cal.c.forEach((p, i) => { const px = p[0] * W, py = p[1] * Hh, on = PJ.sel === i || PJ.sel === 4; x.strokeStyle = on ? "#ffea00" : "#ff40ff"; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 22, 0, 7); x.moveTo(px - 30, py); x.lineTo(px + 30, py); x.moveTo(px, py - 30); x.lineTo(px, py + 30); x.stroke(); x.fillStyle = x.strokeStyle; x.font = "700 16px system-ui,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(i + 1), px + 30, py - 30); }); }

// ---------- conversions ----------
function toShotLab(lay){ const cue = lay.balls.find((b) => b.n === 0), used = new Set(), balls = []; lay.balls.forEach((b) => { if (b.n > 0 && !used.has(b.n)){ used.add(b.n); balls.push({ n: b.n, x: b.x, y: b.y }); } });
  let nx = 1; lay.balls.forEach((b) => { if (b.n !== 0 && !balls.some((q) => q.x === b.x && q.y === b.y)){ while (used.has(nx)) nx++; used.add(nx); balls.push({ n: nx, x: b.x, y: b.y }); } });
  const T = dims(lay.size); return { size: lay.size, cb: cue ? [cue.x, cue.y] : [T.L / 4, T.W / 2], balls, ob: balls[0] ? balls[0].n : null, pocket: "auto", target: [T.L * 0.6, T.W * 0.68], name: lay.name || "", notes: "From Table Capture" }; }
function fromShotLab(Lay){ const b = (Lay.balls || []).map((q) => ({ n: q.n, x: q.x, y: q.y })); if (Lay.cb) b.unshift({ n: 0, x: Lay.cb[0], y: Lay.cb[1] }); return { size: Lay.size, balls: b, paths: [], name: Lay.name || "Shot Lab layout" }; }

// ---------- UI ----------
let $, esc, ctx = null;
const SUBS = [["setup", "1 Camera & setup"], ["layout", "2 Layout"], ["shot", "3 Shot"], ["saved", "Saved"], ["proj", "📽 Projector"], ["help", "Help"]];
function render(){ const m = $("#main"), s = curSetup();
  let h = `<div class="chips" id="tcsubs">${SUBS.map(([k, l]) => `<button class="chip ${C.sub === k ? "on" : ""}" data-tcs="${k}">${l}</button>`).join("")}</div>`;
  h += `<div class="meta">${s ? `Setup: <b>${esc(s.name)}</b> · ${esc(dims(s.size).name)}` : "No setup saved yet. Start with step 1."}</div><div id="tcbody"></div>`;
  m.innerHTML = h; document.querySelectorAll("[data-tcs]").forEach((b) => b.onclick = () => { C.sub = b.dataset.tcs; if (C.sub !== "setup" && C.sub !== "layout" && C.sub !== "shot") stop(); render(); });
  ({ setup: rSetup, layout: rLayout, shot: rShot, saved: rSaved, proj: rProj, help: rHelp }[C.sub] || rSetup)(); }
function body(h){ const b = $("#tcbody"); b.innerHTML = h; return b; }
function mountVideo(){ const w = $("#tcvid"); if (!w) return; const v = video(); w.innerHTML = ""; if (C.src){ w.appendChild(v); if (C.stream) v.play().catch(() => {}); } const i = $("#tcinfo"); if (i) i.textContent = camInfo(); v.onloadedmetadata = () => { const j = $("#tcinfo"); if (j) j.textContent = camInfo(); }; }
function srcRow(){ return `<div class="row"><button class="btn" id="tccam">📷 Start camera</button><label class="btn ghost" style="display:inline-flex;align-items:center;justify-content:center">🎞️ Load a video<input type="file" id="tcfile" accept="video/*" style="display:none"></label>${C.src ? `<button class="btn ghost" id="tcstop">Stop</button>` : ""}</div><div class="meta" id="tcinfo"></div><div id="tcvid"></div>`; }
function wireSrc(){ const c = $("#tccam"); if (c) c.onclick = () => startCam().then(render).catch((e) => alert("Camera: " + (e && e.message || e) + "\nTip: allow camera access for this site, or record in the Camera app at 60 fps and use Load a video."));
  const f = $("#tcfile"); if (f) f.onchange = (e) => { const fl = e.target.files[0]; if (fl){ loadFile(fl); render(); } };
  const s = $("#tcstop"); if (s) s.onclick = () => { stop(); if (C.video){ C.video.srcObject = null; C.video.removeAttribute("src"); } C.src = ""; render(); }; mountVideo(); }
function rSetup(){ const s = curSetup(), all = setups(), sz = C.size || (s && s.size) || "9";
  let h = `<div class="callout"><b>Step 1: calibrate the camera.</b> Mount your phone overhead about a foot outside a long rail at the side pocket, pointing straight down, using the 1x lens (not 0.5x). Start the camera (or load a clip), grab a frame, then tap the 4 playing-surface corners where the cushion noses meet.</div>`;
  if (all.length) h += `<div class="row"><select id="tcpick">${all.map((x) => `<option value="${x.id}" ${s && x.id === s.id ? "selected" : ""}>${esc(x.name)} (${esc(x.size)} ft)</option>`).join("")}</select><button class="btn ghost" id="tcdelset">Delete setup</button></div>`;
  h += srcRow();
  h += `<div class="mgrid"><label>Table size<select id="tcsize">${Object.entries(SIZES).map(([k, t]) => `<option value="${k}" ${k === sz ? "selected" : ""}>${t.name}</option>`).join("")}</select></label><label>Camera lens height above cloth (in)<input type="number" id="tch" inputmode="decimal" value="${s ? s.camH : 60}"></label><label>Camera distance outside the corner 1–2 cushion (in)<input type="number" id="tcd" inputmode="decimal" value="${s ? s.camD : 17}"></label></div>`;
  h += `<div class="row"><button class="btn" id="tcgrab">Grab frame to calibrate</button></div><div id="tcstep" class="meta"></div><div id="tcfw" style="position:relative"></div><div id="tccal"></div>`;
  body(h); wireSrc();
  if (all.length){ $("#tcpick").onchange = (e) => { SS("pt_tc_setup", e.target.value); C.frame = null; C.corners = []; render(); }; $("#tcdelset").onclick = () => { if (!confirm("Delete this setup?")) return; SS("pt_tc_setups", all.filter((x) => !s || x.id !== s.id)); localStorage.removeItem("pt_tc_setup"); render(); }; }
  $("#tcsize").onchange = (e) => { C.size = e.target.value; drawCal(); };
  $("#tcgrab").onclick = () => { const f = grab(1920); if (!f) return alert("Start the camera or load a video first."); C.frame = f; const cs = curSetup(); C.corners = cs && !C.recal ? cs.corners.map(([x, y]) => [x * f.width, y * f.height]) : []; C.selC = -1; showFrame(); };
  if (C.frame) showFrame(); }
function showFrame(){ const w = $("#tcfw"); if (!w) return; const dc = document.createElement("canvas"); dc.width = C.frame.width; dc.height = C.frame.height; dc.id = "tcfc"; dc.style.cssText = "width:100%;height:auto;border-radius:10px;touch-action:none;display:block"; w.innerHTML = ""; w.appendChild(dc);
  let drag = null; const toImg = (e) => { const r = dc.getBoundingClientRect(); return [(e.clientX - r.left) * dc.width / r.width, (e.clientY - r.top) * dc.height / r.height, dc.width / r.width]; };
  dc.onpointerdown = (e) => { const [x, y, k] = toImg(e); let bi = -1, bd = 1e9; C.corners.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd){ bd = d; bi = i; } });
    if (bi >= 0 && bd < 34 * k){ C.selC = bi; drag = { i: bi, x, y, p: C.corners[bi].slice() }; } else if (C.corners.length < 4){ C.corners.push([x, y]); C.selC = C.corners.length - 1; drag = { i: C.selC, x, y, p: [x, y] }; } else return;
    try { dc.setPointerCapture(e.pointerId); } catch (er) {} drawCal(drag); };
  dc.onpointermove = (e) => { if (!drag) return; const [x, y] = toImg(e); C.corners[drag.i] = [drag.p[0] + (x - drag.x), drag.p[1] + (y - drag.y)]; drawCal(drag); };
  dc.onpointerup = dc.onpointercancel = () => { drag = null; drawCal(); };
  drawCal(); }
function drawCal(drag){ const dc = $("#tcfc"); if (!dc) return; const c = dc.getContext("2d"), f = C.frame, k = Math.max(1, f.width / 700); c.drawImage(f, 0, 0); c.lineWidth = 1.5 * k;
  C.corners.forEach((p, i) => { c.strokeStyle = i === C.selC ? "#ffea00" : "#ff40ff"; c.beginPath(); c.arc(p[0], p[1], 9 * k, 0, 7); c.moveTo(p[0] - 16 * k, p[1]); c.lineTo(p[0] + 16 * k, p[1]); c.moveTo(p[0], p[1] - 16 * k); c.lineTo(p[0], p[1] + 16 * k); c.stroke(); c.fillStyle = c.strokeStyle; c.font = `700 ${Math.round(16 * k)}px system-ui`; c.fillText(String(i + 1), p[0] + 12 * k, p[1] - 12 * k); });
  if (C.corners.length > 1){ c.strokeStyle = "#ffea0099"; c.beginPath(); C.corners.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (C.corners.length === 4) c.closePath(); c.stroke(); }
  if (drag){ const p = C.corners[drag.i], zr = 60 * k, z = 4, lx = p[0] < f.width / 2 ? f.width - zr * 2 - 10 : 10, ly = 10; c.save(); c.beginPath(); c.rect(lx, ly, zr * 2, zr * 2); c.clip(); c.drawImage(f, p[0] - zr / z, p[1] - zr / z, 2 * zr / z, 2 * zr / z, lx, ly, zr * 2, zr * 2); c.strokeStyle = "#ffea00"; c.lineWidth = k; c.beginPath(); c.moveTo(lx + zr, ly); c.lineTo(lx + zr, ly + 2 * zr); c.moveTo(lx, ly + zr); c.lineTo(lx + 2 * zr, ly + zr); c.stroke(); c.restore(); c.strokeStyle = "#fff"; c.strokeRect(lx, ly, zr * 2, zr * 2); }
  const n = C.corners.length, st = $("#tcstep");
  if (st) st.innerHTML = n < 4 ? `Tap corner ${n + 1} of 4. ${["Corner 1: a corner on the long rail nearest the camera.", "Corner 2: the other corner on that same long rail.", "Corner 3: the far-rail corner next to corner 2.", "Corner 4: the last corner."][n]} Drag a mark to fine-tune (a zoom box appears).` : `All 4 corners set. Drag a mark, or pick a corner and nudge it 1 pixel at a time.`;
  if (n === 4 && !drag) calPanel(); else if (n < 4) { const cp = $("#tccal"); if (cp) cp.innerHTML = n ? `<button class="btn ghost" id="tcundo">Undo corner</button>` : ""; const u = $("#tcundo"); if (u) u.onclick = () => { C.corners.pop(); C.selC = -1; drawCal(); }; } }
function calPanel(){ const cp = $("#tccal"), s = curSetup(); if (!cp) return; const size = $("#tcsize").value, tmp = { size, corners: C.corners.map(([x, y]) => [x / C.frame.width, y / C.frame.height]) };
  let h = `<div class="row">${[1, 2, 3, 4].map((n) => `<button class="chip ${C.selC === n - 1 ? "on" : ""}" data-cs="${n - 1}">${n}</button>`).join("")}<button class="btn ghost" data-nd="-1,0">◀</button><button class="btn ghost" data-nd="0,-1">▲</button><button class="btn ghost" data-nd="0,1">▼</button><button class="btn ghost" data-nd="1,0">▶</button><button class="btn ghost" id="tcredo">Redo corners</button></div>`;
  h += `<h3>Top-down check</h3><div class="meta">The cloth should fill this view edge to edge, with the diamond lines (dashed) straight and evenly spaced.</div><div id="tcwarp"></div>`;
  h += `<div class="row"><input type="text" id="tcsname" placeholder="Setup name, e.g. Home table" value="${s ? esc(s.name) : ""}"><button class="btn" id="tcssave">Save setup</button>${s ? `<button class="btn ghost" id="tcsnew">Save as new</button>` : ""}</div>`;
  cp.innerHTML = h;
  cp.querySelectorAll("[data-cs]").forEach((b) => b.onclick = () => { C.selC = +b.dataset.cs; drawCal(); });
  cp.querySelectorAll("[data-nd]").forEach((b) => b.onclick = () => { if (C.selC < 0) return alert("Pick corner 1–4 first."); const [dx, dy] = b.dataset.nd.split(",").map(Number); const p = C.corners[C.selC]; C.corners[C.selC] = [p[0] + dx, p[1] + dy]; drawCal(); });
  $("#tcredo").onclick = () => { C.corners = []; C.selC = -1; drawCal(); };
  const td = topDown(C.frame, tmp, 6); if (td){ const c = tdCanvas(td), x = c.getContext("2d"), T = dims(size); x.strokeStyle = "#00e5ff"; x.setLineDash([4, 4]); for (let i = 1; i < 8; i++){ x.beginPath(); x.moveTo(T.L * i / 8 * 6, 0); x.lineTo(T.L * i / 8 * 6, td.h); x.stroke(); } for (let i = 1; i < 4; i++){ x.beginPath(); x.moveTo(0, T.W * i / 4 * 6); x.lineTo(td.w, T.W * i / 4 * 6); x.stroke(); } c.style.cssText = "width:100%;height:auto;border-radius:8px;display:block"; $("#tcwarp").appendChild(c); }
  const saveAs = (isNew) => { const all = setups(), nm = $("#tcsname").value.trim() || ("Setup " + new Date().toLocaleDateString()), rec = { id: isNew || !s ? uid() : s.id, name: nm, size, corners: tmp.corners, camH: +$("#tch").value || 60, camD: +$("#tcd").value || 17, fw: C.frame.width, fh: C.frame.height, date: new Date().toISOString() };
    const i = all.findIndex((x) => x.id === rec.id); if (i >= 0) all[i] = rec; else all.unshift(rec); if (SS("pt_tc_setups", all)){ SS("pt_tc_setup", rec.id); C.sub = "layout"; render(); } };
  $("#tcssave").onclick = () => saveAs(false); const sn = $("#tcsnew"); if (sn) sn.onclick = () => saveAs(true); }
function detectNow(){ const s = curSetup(); if (!s) return alert("Save a camera setup first (step 1)."); const f = grab(1920); if (!f) return alert("Start the camera or load a video first.");
  const td = topDown(f, s, 8); const r = findBalls(td.px, td.w, td.h, 8); guessNumbers(r.balls); const cam = camOf(s), T = dims(s.size);
  C.under = tdCanvas(td).toDataURL("image/jpeg", 0.7);
  const balls = r.balls.map((b) => { const p = parallax([b.x, b.y], cam); return { n: b.n, x: +Math.max(R, Math.min(T.L - R, p[0])).toFixed(2), y: +Math.max(R, Math.min(T.W - R, p[1])).toFixed(2) }; });
  C.lay = { id: null, name: "", size: s.size, setup: s.id, balls, paths: (C.lay && C.lay.size === s.size && C.lay.paths) || [] }; C.sel = -1; }
function rLayout(){ const s = curSetup(); let h = `<div class="callout"><b>Step 2: capture the layout.</b> With the balls set and nobody over the table, grab a frame. Balls are found automatically; drag any that are off, tap one to change its number or delete it.</div>`;
  h += srcRow() + `<div class="row"><button class="btn" id="tcdet">${C.lay ? "Re-detect from camera" : "Grab frame and find balls"}</button>${C.lay ? `<label class="tog" style="flex:0 0 auto"><input type="checkbox" id="tcund" ${C.showUnder !== false ? "checked" : ""}> Photo under</label>` : ""}</div>`;
  if (!s) h += `<div class="callout warnc">Save a camera setup first (step 1).</div>`;
  h += `<div id="tced"></div>`; body(h); wireSrc(); $("#tcdet").onclick = () => { detectNow(); rLayout(); }; const u = $("#tcund"); if (u) u.onchange = (e) => { C.showUnder = e.target.checked; editor(); };
  editor(); }
function editor(){ const w = $("#tced"); if (!w || !C.lay) return; const lay = C.lay, b = lay.balls[C.sel];
  let h = diagram(lay, { edit: true, under: C.showUnder !== false }) + `<div class="meta">${lay.balls.length} ball(s) · ${dims(lay.size).name}${C.sel >= 0 && b ? ` · selected ball at ${b.x.toFixed(1)}, ${b.y.toFixed(1)} in from corner 1` : ""}</div>`;
  h += `<div class="row">${b ? `<select id="tcbn">${Array.from({ length: 16 }, (_, n) => `<option value="${n}" ${n === b.n ? "selected" : ""}>${n === 0 ? "Cue ball" : n + " ball"}</option>`).join("")}</select><button class="btn ghost" id="tcbdel">Delete ball</button>` : ""}<button class="btn ghost" id="tcbadd">Add ball</button></div>`;
  h += `<div class="row"><input type="text" id="tclname" placeholder="Layout name, e.g. 7-ball I missed Tuesday" value="${esc(lay.name || "")}"><button class="btn" id="tclsave">Save layout</button></div><div class="row"><button class="btn ghost" id="tctolab">Open in Shot Lab</button><button class="btn ghost" id="tcproj1">📽 Project on table</button><button class="btn ghost" id="tctoshot">Record a shot →</button></div><div class="meta" id="tcmsg"></div>`;
  w.innerHTML = h; wireEditor(w); }
function wireEditor(w){ const lay = C.lay, svg = w.querySelector("svg"); let drag = null;
  svg.addEventListener("pointerdown", (e) => { const g = e.target.closest("[data-bi]"); if (!g) return; const i = +g.dataset.bi; C.sel = i; drag = { i, g, p0: svgPt(svg, e), b0: [lay.balls[i].x, lay.balls[i].y], moved: false }; try { svg.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); });
  svg.addEventListener("pointermove", (e) => { if (!drag) return; const p = svgPt(svg, e), T = dims(lay.size), b = lay.balls[drag.i]; b.x = +Math.max(R, Math.min(T.L - R, drag.b0[0] + p[0] - drag.p0[0])).toFixed(2); b.y = +Math.max(R, Math.min(T.W - R, drag.b0[1] + p[1] - drag.p0[1])).toFixed(2); drag.g.setAttribute("transform", `translate(${b.x},${b.y})`); drag.moved = true; });
  const up = () => { if (drag){ drag = null; editor(); } }; svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
  const bn = $("#tcbn"); if (bn) bn.onchange = (e) => { const n = +e.target.value, o = lay.balls.find((q, k) => q.n === n && k !== C.sel); if (o) o.n = lay.balls[C.sel].n; lay.balls[C.sel].n = n; editor(); };
  const bd = $("#tcbdel"); if (bd) bd.onclick = () => { lay.balls.splice(C.sel, 1); C.sel = -1; editor(); };
  $("#tcbadd").onclick = () => { const T = dims(lay.size), used = new Set(lay.balls.map((q) => q.n)); let n = used.has(0) ? 1 : 0; while (used.has(n) && n < 15) n++; lay.balls.push({ n, x: T.L / 2, y: T.W / 2 }); C.sel = lay.balls.length - 1; editor(); };
  $("#tclsave").onclick = () => { lay.name = $("#tclname").value.trim() || ("Capture " + new Date().toLocaleString()); saveLay(lay); $("#tcmsg").textContent = "Saved ✓ (see Saved)."; };
  $("#tctolab").onclick = () => sendToLab(lay); $("#tcproj1").onclick = () => openProjector(lay); $("#tctoshot").onclick = () => { C.sub = "shot"; render(); }; }
function saveLay(lay){ const all = LS("pt_tc_layouts", []); lay.date = new Date().toISOString(); if (!lay.id) lay.id = uid(); const rec = JSON.parse(JSON.stringify(lay)); const i = all.findIndex((x) => x.id === lay.id); if (i >= 0) all[i] = rec; else all.unshift(rec); return SS("pt_tc_layouts", all); }
function sendToLab(lay){ const sl = toShotLab(lay); SS("pt_lab_cur", sl); SS("pt_lab_pocket", "auto"); stop(); if (ctx){ ctx.st.labtab = "table"; ctx.save(); window.renderLab($, esc, ctx.save, ctx.st); } }
// ---------- shot tracking ----------
function rShot(){ const s = curSetup(); let h = `<div class="callout"><b>Step 3: record a shot.</b> Live: tap Start tracking, shoot, and it stops by itself about 1.5 s after the balls stop. Video file: scrub to just before the stroke, then tap Start; the clip plays at ¼ speed so every frame is measured.</div>`;
  h += srcRow() + `<div class="row"><button class="btn" id="tctrk">${C.running ? "Stop tracking" : "Start tracking"}</button></div><div class="meta" id="tcts"></div><div id="tcpe"></div>`;
  if (!s) h += `<div class="callout warnc">Save a camera setup first (step 1).</div>`;
  body(h); wireSrc(); $("#tctrk").onclick = () => { if (C.running) finishTrack(); else startTrack(); }; pathEditor(); }
function startTrack(){ const s = curSetup(), v = C.video; if (!s) return alert("Save a camera setup first (step 1)."); if (!v || !v.videoWidth) return alert("Start the camera or load a video first.");
  const T = dims(s.size), sc = Math.min(1, 960 / Math.max(v.videoWidth, v.videoHeight)), cw = Math.round(v.videoWidth * sc), ch = Math.round(v.videoHeight * sc), cv = document.createElement("canvas"); cv.width = cw; cv.height = ch; const g = cv.getContext("2d", { willReadFrequently: true });
  const H = Hfor(s, cw, ch); let bx = cw, by = ch, ex = 0, ey = 0; for (const [x, y] of tableCorners(T).map((q) => apply(H, q[0], q[1]))){ bx = Math.min(bx, x); by = Math.min(by, y); ex = Math.max(ex, x); ey = Math.max(ey, y); }
  bx = Math.max(0, Math.floor(bx)); by = Math.max(0, Math.floor(by)); ex = Math.min(cw, Math.ceil(ex)); ey = Math.min(ch, Math.ceil(ey)); const bw = ex - bx, bh = ey - by; if (bw < 20 || bh < 20) return alert("The calibration doesn't match this video. Redo step 1.");
  const ppi = 5, Wp = warpLUT(H, T.L, T.W, ppi, bx, by, bw, bh), out = new Uint8ClampedArray(Wp.w * Wp.h * 4), cam = camOf(s), file = C.src === "file";
  const frame = () => { g.drawImage(v, 0, 0, cw, ch); gather(g.getImageData(bx, by, bw, bh).data, Wp.lut, out); return out; };
  const px0 = frame(), cloth = clothOf(px0, Wp.w, Wp.h), conv = (bs) => bs.map((b) => { const p = parallax([b.x, b.y], cam); return { x: p[0], y: p[1], white: b.white, bright: b.bright, col: b.col, dark: b.dark, hue: b.hue, val: b.val, grp: b.grp }; });
  const init = conv(findBalls(px0, Wp.w, Wp.h, ppi, { cloth }).balls); if (!init.length) return alert("No balls found in the first frame. Check the lighting and calibration.");
  if (C.lay && C.lay.size === s.size && C.lay.balls.length){ init.forEach((b) => { let best = null, bd = 3; C.lay.balls.forEach((q) => { const d = Math.hypot(q.x - b.x, q.y - b.y); if (d < bd){ bd = d; best = q; } }); b.n = best ? best.n : -1; }); const used = new Set(init.map((b) => b.n)); let nx = 1; init.forEach((b) => { if (b.n < 0){ while (used.has(nx)) nx++; used.add(nx); b.n = nx; } }); }
  else { guessNumbers(init); C.lay = { id: null, name: "", size: s.size, setup: s.id, balls: init.map((b) => ({ n: b.n, x: +b.x.toFixed(2), y: +b.y.toFixed(2) })), paths: [] }; }
  const tk = new Tracker(init); C.trk = tk; C.running = true; let n = 0, t0 = performance.now(), m0 = file ? v.currentTime : 0, done = false;
  const stEl = () => $("#tcts");
  const tick = (now, meta) => { if (!C.running || done) return; const t = file ? ((meta && meta.mediaTime) || v.currentTime) - m0 : (performance.now() - t0) / 1000;
    if (t > (n ? tk.t : -1)){ const bs = conv(findBalls(frame(), Wp.w, Wp.h, ppi, { cloth }).balls); tk.step(bs, t); n++; }
    const e = stEl(); if (e) e.textContent = `Tracking… ${n} frames, ${(n / Math.max(0.01, (performance.now() - t0) / 1000)).toFixed(0)} measured/s${tk.lastMotion >= 0 ? ", balls moving" : ", waiting for the shot"}`;
    if ((tk.lastMotion >= 0 && t - tk.lastMotion > 1.5) || t > 25 || (file && v.ended)){ done = true; return finishTrack(); }
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(tick); else requestAnimationFrame(tick); };
  if (file){ v.playbackRate = 0.25; v.play().catch(() => {}); } $("#tctrk").textContent = "Stop tracking";
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(tick); else requestAnimationFrame(tick); }
function finishTrack(){ if (!C.trk) return; C.running = false; const v = C.video; if (C.src === "file" && v){ v.pause(); v.playbackRate = 1; } const ps = C.trk.paths(1.5); C.trk = null; if (!C.lay) return; C.lay.paths = ps.map((p) => ({ n: p.n, pts: cleanPath(p.pts) }));
  if (C.sub === "shot") rShot(); const e = $("#tcts"); if (e) e.textContent = ps.length ? `Recorded ${ps.length} moving ball(s).` : "No ball moved more than 1.5 in. Try again, or check the calibration."; }
function pathEditor(){ const w = $("#tcpe"); if (!w || !C.lay) return; const lay = C.lay;
  let h = diagram(lay, { ptEdit: C.ptEdit }) + `<label class="tog"><input type="checkbox" id="tcpted" ${C.ptEdit ? "checked" : ""}> Tap points to delete them</label>`;
  (lay.paths || []).forEach((p, i) => { const n = p.pts.length, a = p.a || 0, b = p.b == null ? n - 1 : p.b; h += `<div class="card"><div class="t"><span style="color:${PATHC[i % PATHC.length]}">━━</span> ${p.n === 0 ? "Cue ball" : p.n + " ball"} · ${b - a + 1} points</div><label>Start<input type="range" min="0" max="${n - 1}" value="${a}" data-pa="${i}"></label><label>End<input type="range" min="0" max="${n - 1}" value="${b}" data-pb="${i}"></label><div class="row"><button class="btn ghost" data-pcl="${i}">Auto-clean</button><button class="btn ghost" data-pdel="${i}">Delete path</button></div></div>`; });
  if (!(lay.paths || []).length) h += `<div class="meta">No shot paths yet.</div>`;
  h += `<div class="row"><input type="text" id="tclname" placeholder="Layout name" value="${esc(lay.name || "")}"><button class="btn" id="tclsave">Save layout + paths</button></div><div class="row"><button class="btn ghost" id="tcproj1">📽 Project on table</button><button class="btn ghost" id="tctolab">Open in Shot Lab</button></div><div class="meta" id="tcmsg"></div>`;
  w.innerHTML = h;
  $("#tcpted").onchange = (e) => { C.ptEdit = e.target.checked; pathEditor(); };
  w.querySelectorAll("[data-pp]").forEach((c) => c.addEventListener("click", () => { const [pi, k] = c.dataset.pp.split(":").map(Number), p = lay.paths[pi]; p.pts.splice(k, 1); p.a = Math.min(p.a || 0, p.pts.length - 1); if (p.b != null) p.b = Math.min(p.b - (k <= p.b ? 1 : 0), p.pts.length - 1); pathEditor(); }));
  w.querySelectorAll("[data-pa]").forEach((r) => r.oninput = () => { const p = lay.paths[+r.dataset.pa]; p.a = Math.min(+r.value, p.b == null ? p.pts.length - 1 : p.b); pathEditor(); });
  w.querySelectorAll("[data-pb]").forEach((r) => r.oninput = () => { const p = lay.paths[+r.dataset.pb]; p.b = Math.max(+r.value, p.a || 0); pathEditor(); });
  w.querySelectorAll("[data-pcl]").forEach((b) => b.onclick = () => { const p = lay.paths[+b.dataset.pcl], a = p.a || 0, e = p.b == null ? p.pts.length - 1 : p.b; p.pts = cleanPath(p.pts.slice(a, e + 1)); p.a = 0; p.b = null; pathEditor(); });
  w.querySelectorAll("[data-pdel]").forEach((b) => b.onclick = () => { lay.paths.splice(+b.dataset.pdel, 1); pathEditor(); });
  $("#tclsave").onclick = () => { lay.name = $("#tclname").value.trim() || lay.name || ("Capture " + new Date().toLocaleString()); if (saveLay(lay)) $("#tcmsg").textContent = "Saved ✓"; };
  $("#tcproj1").onclick = () => openProjector(lay); $("#tctolab").onclick = () => sendToLab(lay); }
function rSaved(){ const all = LS("pt_tc_layouts", []);
  let h = all.length ? all.map((l, i) => `<div class="card"><div class="t">${esc(l.name || "Capture")}</div><div class="meta">${new Date(l.date).toLocaleString()} · ${esc(dims(l.size).name)} · ${l.balls.length} ball(s) · ${(l.paths || []).length} path(s)</div><div class="dia">${diagram(l, { id: "tcs" + i })}</div><div class="row"><button class="btn" data-sl="${i}">Open</button><button class="btn ghost" data-sp="${i}">📽 Project</button><button class="btn ghost" data-sb="${i}">Shot Lab</button><button class="btn ghost" data-sd="${i}">Delete</button></div></div>`).join("") : `<div class="meta">No captures saved yet.</div>`;
  if (all.length) h += `<div class="row"><button class="btn ghost" id="tcexp">Export all (JSON)</button></div>`;
  body(h); const g = (i) => JSON.parse(JSON.stringify(all[i]));
  document.querySelectorAll("[data-sl]").forEach((b) => b.onclick = () => { C.lay = g(+b.dataset.sl); C.under = ""; C.sel = -1; C.sub = (C.lay.paths || []).length ? "shot" : "layout"; render(); });
  document.querySelectorAll("[data-sp]").forEach((b) => b.onclick = () => openProjector(g(+b.dataset.sp)));
  document.querySelectorAll("[data-sb]").forEach((b) => b.onclick = () => sendToLab(g(+b.dataset.sb)));
  document.querySelectorAll("[data-sd]").forEach((b) => b.onclick = () => { if (confirm("Delete this capture?")){ all.splice(+b.dataset.sd, 1); SS("pt_tc_layouts", all); rSaved(); } });
  const ex = $("#tcexp"); if (ex) ex.onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: "Road Warrior Table Capture", version: 1, setups: setups(), layouts: all }, null, 1)], { type: "application/json" })); a.download = "road-warrior-table-capture.json"; document.body.appendChild(a); a.click(); a.remove(); }; }
function rProj(){ const has = !!LS("pt_tc_projcal", null);
  let h = `<div class="callout"><b>Projector mode.</b> Connect the device to the projector (mirrored), mount the projector overhead about a foot outside the long rail at the side pocket pointing straight down, then open projector mode. The page goes pure black and draws only balls, centers and shot lines.</div>`;
  h += `<div class="row"><button class="btn" id="tcpgrid">${has ? "Open with test grid" : "Calibrate projector"}</button>${C.lay ? `<button class="btn ghost" id="tcpcur">Project current layout</button>` : ""}</div>`;
  h += `<div class="meta">${has ? "Projector corners are saved. Re-check with the test grid whenever the projector or table moves." : "Not calibrated yet: drag the 4 handles onto the table corners."}</div><div class="meta">In projector mode: tap the screen to show or hide the controls; Esc or Exit leaves. On a keyboard, arrow keys nudge the selected corner (Shift for 5 px).</div>`;
  body(h); $("#tcpgrid").onclick = () => openProjector(null); const c = $("#tcpcur"); if (c) c.onclick = () => openProjector(C.lay); }
function rHelp(){ body(`<details open><summary>How to set up Table Capture</summary><div class="inner">
<p><b>Mounting.</b> Put the phone (and later the projector) on the ceiling about a foot outside one long rail, level with the side pocket, pointing straight down. From there the whole table is close to evenly lit and in focus; mounting off an end rail makes the far end dim and stretched. Use the 1x camera, not 0.5x ultra-wide, whose curved edges this app can't correct.</p>
<p><b>Frame rate.</b> Use 60 fps. Live tracking measures as many frames as the phone can process; for the most accurate paths, record in the Camera app at 1080p 60 fps (Settings › Camera › Record Video) and use Load a video, which measures every frame at ¼ speed.</p>
<p><b>Calibration steps.</b> 1) Pick the table size and enter the lens height above the cloth and how far outside the cushion the lens is (used to correct where ball centers appear). 2) Grab a frame and tap the 4 playing-surface corners where the cushion noses meet: 1 and 2 along the rail nearest the camera, then 3 and 4. 3) Drag or nudge each mark until it sits exactly on the corner; check the top-down view. 4) Save the setup. Redo it if the phone or mount moves.</p>
<p><b>Layouts and shots.</b> Grab a frame to find the balls, fix any mistakes, and save. To record a shot, start tracking before you stroke; paths for every ball that moves are saved with the layout. Trim or auto-clean bad points.</p>
<p><b>Projector.</b> Open projector mode, tap Calibrate, drag handles 1–4 onto the same table corners you used for the camera, fine-tune with the arrows, then turn on the test grid: dashed lines should hit the diamonds and the 6-inch grid should look square. Set the balls inside the projected circles and shoot it again.</p>
<p class="meta">Accuracy: with good light and a careful calibration, expect ball positions within about ¼ to ½ inch, usually better near the camera. Touching balls, glare, and a player leaning over the table can confuse detection, so always check and drag to fix.</p></div></details>`); }

document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#tabs [data-v]")){ stop(); if (PJ.on) closeProjector(); } }, true);
root.TableCapture = {
  render(_$, _esc, st, save){ $ = _$; esc = _esc; ctx = { st, save }; render(); },
  stop, project: openProjector, projectShotLab: (Lay) => openProjector(fromShotLab(Lay)), close: closeProjector, toShotLab, fromShotLab
};
})(typeof window !== "undefined" ? window : globalThis);
