// Adaptive plan: profile, skill tests, plan engine, warm-up, ratings cards.
(function(){
const BU = "https://billiarduniversity.org";
const BUDOC = (f) => BU + "/documents/" + f + ".pdf";
// BU Rating Comparisons chart (billiarduniversity.org/documents/BU_Rating_Comparisons.pdf). APA columns intentionally left out.
const BUCHART = [
  [185,200,"world-class pro",770,9999,"A++ / AAAA","10","≥ 2050","10"],
  [175,184,"semipro / pro",730,769,"A+ / AAA","10","2000–2049","10"],
  [165,174,"upper shortstop",690,729,"A / AA","9, 10","1950–1999","9, 10"],
  [155,164,"lower shortstop",650,689,"A- / A","9, 10","1875–1949","9, 10"],
  [140,154,"upper advanced",600,649,"B+","8, 9","1825–1874","8, 9"],
  [125,139,"mid advanced",550,599,"B","8, 9","1750–1824","6, 7"],
  [110,124,"lower advanced",500,549,"B-","7, 8","1700–1749","4, 5"],
  [95,109,"upper intermediate",450,499,"C+","7, 8","1625–1699","2, 3"],
  [70,94,"mid intermediate",400,449,"C","6, 7","1550–1624","1, 0, 1"],
  [55,69,"lower intermediate",350,399,"C-","5, 6","1500–1549","-2, -3"],
  [40,54,"upper beginner",300,349,"D+","4, 5","1425–1499","-4, -5"],
  [30,39,"mid beginner",250,299,"D","4, 5","1350–1424","-6, -7"],
  [20,29,"lower beginner",200,249,"D-","3, 4","1300–1349","-8, -9"],
  [0,19,"novice",0,199,"D--","2","< 1300","-10"]];
const buRow = (f) => BUCHART.find((r) => f >= r[3] && f <= r[4]) || BUCHART[BUCHART.length-1];
// Smooth BU total (out of 200) vs Fargo, through the middle of each band.
const BUPTS = [[100,10],[225,25],[275,35],[325,47],[375,62],[425,82],[475,102],[525,117],[575,132],[625,147],[670,160],[710,170],[750,180],[800,193]];
const interp = (pts, x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [a,b] = pts[i-1], [c,d] = pts[i]; return b + (d-b)*(x-a)/(c-a); } return pts[pts.length-1][1]; };
const CURVES = {
  bu: (f, max) => interp(BUPTS, f) / 200 * max,
  // Colenso bands (Dr. Dave shot-making page): C 30–44, B 45–59, A 60–69, pro 70–79; letters mapped to Fargo with the BU chart.
  colenso: (f, max) => interp([[150,12],[275,25],[425,37],[575,52],[710,65],[780,75]], f) / 80 * max,
  // Hopkins Q-Skill bands: D 30–60, C 60–90, B 90–120, A 121–160, AA 160–180, AAA 180–200.
  hq: (f) => interp([[150,20],[275,45],[425,75],[575,105],[710,140],[760,170],[800,190]], f),
  // Straight-pool high run (Dan White via AZB, on Dr. Dave's page): D 14, C 28, B 35, A 56, Pro 98.
  sp: (f) => interp([[150,7],[275,14],[425,28],[575,35],[710,56],[780,98]], f)
};
const LV = (f) => f < 350 ? "B" : f < 500 ? "I" : f < 650 ? "E" : "P";
const LVN = { B: "Beginner", I: "Intermediate", E: "Expert", P: "Professional" };
const SELF_F = { B: 300, I: 425, E: 560, P: 700 };
const AREAS = {
  aimR: "Aiming: right cuts", aimL: "Aiming: left cuts", aim: "Aiming / pocketing", stroke: "Stroke", cbc: "Cue ball control (stop/follow/draw/speed)",
  pos: "Position", banks: "Banks", kicks: "Kicks", safe: "Safeties", brk: "Break", pat: "Patterns / run-outs", long: "Long shots", jm: "Jump / massé (optional)", mental: "Mental / pressure" };
const V = (l, id) => [l, id];
const AV = {
  aimR: [V("BU F1 progressive cut drill", "jHAJ9NQEvZg")], aimL: [V("BU F1 progressive cut drill", "jHAJ9NQEvZg")], aim: [V("BU F1 progressive cut drill", "jHAJ9NQEvZg")],
  stroke: [V("Mighty X (Margaret Fefilova Styer)", "Oj7lku_wO94"), V("How to stroke straight (Max Eberle)", "V2QO6J84GOc"), V("Up-downs (Joe Tucker)", "Ii_0HHIiK_c")],
  cbc: [V("Stop, follow and draw drill (Dr. Dave)", "xUA1lsGKEAc"), V("Stop shot (Jasmin Ouschan)", "ehjFxcW0Lz4"), V("How to master the draw shot (Dr. Dave)", "e8X15F-6w4s")],
  pos: [V("BU Exam I overview (wagon wheel, target drills)", "DIARJtj4WF8"), V("Top 10 pattern play principles (Dr. Dave)", "DMlQGu_pRNU")],
  banks: [V("Bank to all pockets (Dr. Dave)", "tVpfIgPC6F8"), V("How to make more bank shots (Niels Feijen)", "lCoIBHzy8YE")],
  kicks: [V("Kicking master class (Dr. Dave)", "RGnLsOXp2U4"), V("One-rail kicks (Sharivari)", "gti0C2gS6mI")],
  safe: [V("Big Brother Little Brother (Niels Feijen)", "9dAO28LIO3Q")],
  brk: [V("Break shot technique (Dr. Dave)", "Av2DNdWzziA"), V("Break training manual (Jasmin Ouschan)", "s27mZsTiXs8"), V("Break strategy 8/9/10-ball (Dr. Dave)", "jJXSs5KGx9k")],
  pat: [V("Top 10 pattern play principles (Dr. Dave)", "DMlQGu_pRNU"), V("Basic 9-ball pattern drill (Darren Appleton)", "GGm08omfgwA"), V("Equal Offense vs the ghost (Shortstop On Pool)", "VMHvv7toICw")],
  long: [V("How to shoot a long stop shot (FX Billiards)", "urWaiWeM7xE"), V("Long potting masterclass (Stephen Hendry)", "WUPpPKA8Oy0")],
  jm: [V("Jump shot: everything you need to know (Dr. Dave)", "NFd9tUgFbFE"), V("Massé and swerve shots (Dr. Dave)", "rIjchLs7p4c")],
  mental: [V("3 tools to deal with pressure (Niels Feijen)", "FmLIxmbPVv4"), V("3-step pre-shot routine (Jasmin Ouschan)", "VSHni6W1y6M")]
};
const DRILL = {
  aimR: "Right-cut ladder: BU F1 set up as a right cut, then 10 right and 10 left cuts from mirrored spots. Mark each miss thick or thin. Use the Right-Cut Fix checklist in Plan.",
  aimL: "Left-cut ladder: BU F1 set up as a left cut, then 10 left and 10 right cuts from mirrored spots. Mark each miss thick or thin.",
  aim: "Shot-making: Colenso-style pots (any 8 of the 16) or BU F6 pocketing; one attempt each, full pre-shot routine.",
  stroke: "Mighty X or up-downs, then 10 straight-back strokes (cue ball to the far rail and back to the tip).",
  cbc: "Stop / follow / draw / stun ladders (BU F2–F5). Then a speed ladder: stop the cue ball at each diamond in turn.",
  pos: "Wagon wheel (BU F7) and target drill (BU F8); then 3-ball run-outs with ball in hand.",
  banks: "Cross-side and cross-corner banks from 5 cue-ball spots; say thick/thin on each miss.",
  kicks: "One-rail kicks off the long rail (BU S6 setup), then two-rail kicks with the diamond system.",
  safe: "Big Brother Little Brother, then BU S5 hide-behind-target safeties.",
  brk: "10 breaks: score each on the BU S10 five points (no scratch, CB off rail, CB in center zone, ball made, 3+ balls up table).",
  pat: "Ghost games or Equal Offense: play out racks and plan the pattern before the first shot.",
  long: "Long straight-ins and long stop shots: cue ball near the head string, object ball near the foot spot.",
  jm: "Optional: 10 jumps over a blocker half a diamond away, then 10 small massé curves. Skip if your back or the room rules say no.",
  mental: "Pressure ladder: you must make 5 in a row of a medium cut before moving on; full pre-shot routine on every shot."
};
// Tests. basis: sourced = the source gives levels for this test; derived = the app maps a source's level bands to Fargo; estimate = app estimate only.
const TESTS = [
  { id: "f1r", area: "aimR", name: "BU F1 cut shot, set up as a RIGHT cut", max: 10, curve: "bu", basis: "derived", how: "Progressive drill, 10 shots. Start at CB position 4; move up one after a make, down one after a miss (stay at 1 or 7). Score = final position + 1 bonus per make at 7, max 10.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("BU F1 progressive cut drill", "jHAJ9NQEvZg")] },
  { id: "f1l", area: "aimL", name: "BU F1 cut shot, set up as a LEFT cut", max: 10, curve: "bu", basis: "derived", how: "Same as above from the mirrored side of the table, so you can compare left and right.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("BU F1 progressive cut drill", "jHAJ9NQEvZg")] },
  { id: "colr", area: "aimR", name: "Colenso test: right-cut half (8 pots)", max: 40, curve: "colenso", basis: "derived", how: "Shoot the 8 Colenso pots that cut to the right; 5 points per pot. Full test bands: C 30–44, B 45–59, A 60–69, pro 70–79 (out of 80).", src: [["Colenso test (Dr. Dave)", "/faq/drill/shot-making/"]], vids: [] },
  { id: "coll", area: "aimL", name: "Colenso test: left-cut half (8 pots)", max: 40, curve: "colenso", basis: "derived", how: "The 8 Colenso pots that cut to the left; 5 points per pot.", src: [["Colenso test (Dr. Dave)", "/faq/drill/shot-making/"]], vids: [] },
  { id: "f6", area: "aim", name: "BU F6 ball pocketing", max: 10, curve: "bu", basis: "derived", how: "10 fixed shots, one attempt each, no scratches. Score = balls pocketed.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("BU Exam I overview", "DIARJtj4WF8")] },
  { id: "stk", area: "stroke", name: "Straight-stroke self-test", max: 10, curve: "bu", basis: "estimate", how: "Cue ball on the head spot. Shoot it straight up table to the foot rail at medium speed so it comes back to your tip. 10 shots; 1 point if it returns within one ball width of the starting line.", src: [], vids: [V("How to stroke straight (Max Eberle)", "V2QO6J84GOc")] },
  { id: "f2", area: "cbc", name: "BU F2 stop shot", max: 10, curve: "bu", basis: "derived", how: "Progressive (like F1). The OB must drop and the stopped CB must overlap the ghost-ball spot.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("Stop shot (Jasmin Ouschan)", "ehjFxcW0Lz4")] },
  { id: "f3", area: "cbc", name: "BU F3 follow shot", max: 10, curve: "bu", basis: "derived", how: "Progressive. OB in, CB ends in or touching the paper target (8.5×11 frame).", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("Stop, follow and draw drill (Dr. Dave)", "xUA1lsGKEAc")] },
  { id: "f4", area: "cbc", name: "BU F4 draw shot", max: 10, curve: "bu", basis: "derived", how: "Progressive. OB in, CB center ends inside the 2×1-diamond box by the side pocket.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("How to master the draw shot (Dr. Dave)", "e8X15F-6w4s")] },
  { id: "f5", area: "cbc", name: "BU F5 stun shot", max: 10, curve: "bu", basis: "derived", how: "Progressive. The target moves; positions 5–7 need a rebound off the end rail.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("Stop, follow and draw drill (Dr. Dave)", "xUA1lsGKEAc")] },
  { id: "spd", area: "cbc", name: "Lag-speed self-test", max: 10, curve: "bu", basis: "estimate", how: "10 lags (head rail to foot rail and back). 1 point each time the cue ball stops within one ball width of the head rail without touching it twice.", src: [["How to win the lag (PoolDawg)", "https://www.pooldawg.com/article/starting-strong-how-to-win-the-lag/"]], vids: [V("NO LAG CAN STOP ME FROM WINNING (Slivovich)", "FMjdnBUrvS8")] },
  { id: "f7", area: "pos", name: "BU F7 wagon wheel", max: 20, curve: "bu", basis: "derived", how: "Score per the BU Exam I sheet (20 max).", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")], ["BU Exam I score sheet (PDF)", BUDOC("BU_Exam-I_Score_Sheet")]], vids: [V("BU Exam I overview", "DIARJtj4WF8")] },
  { id: "f8", area: "pos", name: "BU F8 target pocketing", max: 20, curve: "bu", basis: "derived", how: "Score per the BU Exam I sheet (20 max).", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")], ["BU Exam I score sheet (PDF)", BUDOC("BU_Exam-I_Score_Sheet")]], vids: [V("BU Exam I overview", "DIARJtj4WF8")] },
  { id: "bu1", area: "", name: "BU Exam I total (F1–F8)", max: 100, curve: "bu", basis: "derived", how: "Add F1–F8 (100 max). BU uses it to pick your Exam II level: 0–49 Bachelors, 50–69 Masters, 70–100 Doctorate. The BU chart rates Exam I + Exam II together (out of 200); this app assumes half of that.", src: [["BU exams page", BU + "/testing/exams/"], ["BU rating comparisons (PDF)", BU + "/documents/BU_Rating_Comparisons.pdf"]], vids: [V("BU Exam I overview", "DIARJtj4WF8")], overall: true },
  { id: "s7", area: "banks", name: "BU S7 bank shots (Bachelors)", max: 3, curve: "bu", basis: "derived", how: "CB in hand; bank each of 3 balls cross side. 1 point each.", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Bank to all pockets (Dr. Dave)", "tVpfIgPC6F8")] },
  { id: "bk10", area: "banks", name: "10-bank self-test", max: 10, curve: "bu", basis: "estimate", how: "10 cross-side banks with ball in hand, different angles each time. 1 point per make.", src: [], vids: [V("How to make more bank shots (Niels Feijen)", "lCoIBHzy8YE")] },
  { id: "s6", area: "kicks", name: "BU S6 kick shots (Bachelors)", max: 3, curve: "bu", basis: "derived", how: "Kick at each of 3 OBs off the same long rail from the same CB spot. 1 point per legal hit (no scratch, ball to rail).", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("One-rail kicks (Sharivari)", "gti0C2gS6mI")] },
  { id: "s5", area: "safe", name: "BU S5 hide-behind-target safety", max: 6, curve: "bu", basis: "derived", how: "Two tries from each of 3 CB spots. 1 point per snooker that leaves the cluster inside the target.", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Big Brother Little Brother (Niels Feijen)", "9dAO28LIO3Q")] },
  { id: "bu6", area: "safe", name: "BU Exam VI safety challenge (enter the score out of 100)", max: 100, curve: "bu", basis: "estimate", how: "20 safety layouts, 2 tries each (40 shots). Score = 2.5 × (40 − misses).", src: [["BU Exam VI safety challenge (PDF)", BUDOC("BU_Exam-VI_Safety_Challenge")]], vids: [V("Big Brother Little Brother (Niels Feijen)", "9dAO28LIO3Q")] },
  { id: "s10", area: "brk", name: "BU S10 break drill", max: 5, curve: "bu", basis: "derived", how: "3 breaks, each scored 0–5 (no scratch; CB not to a rail; CB stays in the center zone; ball made; 3+ balls up table). Score = the middle of the three.", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Break shot technique (Dr. Dave)", "Av2DNdWzziA")] },
  { id: "s3", area: "pat", name: "BU S3 9-ball patterns", max: 10, curve: "bu", basis: "derived", how: "Three layouts; add the two lowest scores (10 max).", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Basic 9-ball pattern drill (Darren Appleton)", "GGm08omfgwA")] },
  { id: "s4", area: "pat", name: "BU S4 8-ball patterns", max: 10, curve: "bu", basis: "derived", how: "Three layouts; add the two lowest scores (10 max).", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Top 10 pattern play principles (Dr. Dave)", "DMlQGu_pRNU")] },
  { id: "eo", area: "pat", name: "Equal Offense (10 innings)", max: 200, curve: "bu", basis: "estimate", how: "10 innings, up to 20 points each (200 max). The source gives no level bands, so the benchmark here is an app estimate.", src: [["Equal Offense (Dr. Dave)", "/faq/drill/equal-offense/"]], vids: [V("Equal Offense vs the ghost (Shortstop On Pool)", "VMHvv7toICw")] },
  { id: "hq", area: "pat", name: "Hopkins Q-Skill (10 innings)", max: 200, curve: "hq", basis: "derived", how: "Score per the Hopkins Q-Skills rules. Bands: 30–60 D, 60–90 C, 90–120 B, 121–160 A, 160–180 AA, 180–200 AAA.", src: [["Hopkins Q-Skills (Dr. Dave)", "/faq/rating/hopkins-q-skills/"]], vids: [] },
  { id: "sp", area: "pat", name: "Straight-pool high run", max: 100, curve: "sp", basis: "derived", how: "Your best run in a practice session. Typical high runs by class: D 14 or less, C 28, B 35, A 56, pro 98.", src: [["Straight-pool high runs (Dr. Dave / AZB)", "/faq/rating/straight-pool/"]], vids: [] },
  { id: "lng", area: "long", name: "Long-shot self-test", max: 10, curve: "bu", basis: "estimate", how: "CB a diamond behind the head string, OB near the foot spot, 10 straight-ins and slight cuts into the corners. 1 point per make.", src: [], vids: [V("Long potting masterclass (Stephen Hendry)", "WUPpPKA8Oy0")] },
  { id: "s9", area: "jm", name: "BU S9 jump or massé", max: 3, curve: "bu", basis: "derived", optional: true, how: "3 attempts over or around a blocker. 1 point per pot without touching the blocker.", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Jump shot (Dr. Dave)", "NFd9tUgFbFE")] },
  { id: "prs", area: "mental", name: "Pressure self-test: longest streak", max: 10, curve: "bu", basis: "estimate", how: "10 medium cuts set up the same way, full pre-shot routine on each. Score = your longest run of makes (10 max).", src: [], vids: [V("3 tools to deal with pressure (Niels Feijen)", "FmLIxmbPVv4")] }
];
const Lg = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const Sg = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const DEFPROF = { fargo: 500, useFargo: true, self: "E", hand: "R", eye: "R", cross: true, days: 5, hours: 3, games: ["8","9","10","sp"], weak: ["aimR"], jm: false, mode: "built", tbl: 9 };
const prof = () => Object.assign({}, DEFPROF, Lg("pt_profile", {}));
const fOf = (p) => p.useFargo ? +p.fargo || 500 : SELF_F[p.self] || 500;
const scores = () => Lg("pt_tests", {}); // id -> [{d, raw}]
const latest = (id) => { const a = scores()[id]; return a && a.length ? a[a.length-1] : null; };
const bench = (t, f) => t.curve === "hq" ? CURVES.hq(f) : t.curve === "sp" ? Math.min(100, CURVES.sp(f)) : CURVES[t.curve](f, t.max);
const norm = (t, raw) => Math.max(0, Math.min(100, Math.round(raw / t.max * 100)));
const BASIS = { sourced: "Sourced benchmark", derived: "Derived from a sourced chart", estimate: "App estimate" };
function areaStats(p){
  const f = fOf(p), out = {};
  Object.keys(AREAS).forEach((a) => {
    if (a === "jm" && !p.jm) return;
    const ts = TESTS.filter((t) => t.area === a);
    const got = ts.map((t) => ({ t, l: latest(t.id) })).filter((x) => x.l);
    const nextF = Math.min(800, f + 75);
    const tgt = ts.length ? ts.reduce((s, t) => s + norm(t, bench(t, nextF)), 0) / ts.length : 60;
    const exp = ts.length ? ts.reduce((s, t) => s + norm(t, bench(t, f)), 0) / ts.length : 50;
    let sc = null, when = null;
    if (got.length) { sc = got.reduce((s, x) => s + norm(x.t, x.l.raw), 0) / got.length; when = got.map((x) => x.l.d).sort().pop(); }
    let gap = sc == null ? (tgt - exp) * 0.8 + 6 : tgt - sc;
    if (p.weak.includes(a)) gap += 15;
    out[a] = { name: AREAS[a], score: sc == null ? null : Math.round(sc), exp: Math.round(exp), tgt: Math.round(tgt), gap, when, tested: got.length };
  });
  // left vs right split: if one side is clearly worse, push it up
  const r = out.aimR, l = out.aimL;
  if (r && l && r.score != null && l.score != null) { if (r.score + 8 < l.score) r.gap += 8; if (l.score + 8 < r.score) l.gap += 8; }
  return out;
}
const DAYSETS = { 1: ["Sat"], 2: ["Tue","Sat"], 3: ["Mon","Wed","Fri"], 4: ["Mon","Tue","Thu","Fri"], 5: ["Mon","Tue","Wed","Thu","Fri"], 6: ["Mon","Tue","Wed","Thu","Fri","Sat"], 7: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] };
const GAMESN = { "8": "8-ball", "9": "9-ball", "10": "10-ball", sp: "straight pool", op: "one-pocket", bk: "bank pool", sn: "snooker", us: "UK 8-ball" };
const GAMEV = { "9": [V("Basic 9-ball pattern drill (Darren Appleton)", "GGm08omfgwA")], "10": [V("Basic 9-ball pattern drill (Darren Appleton)", "GGm08omfgwA")], "8": [V("Top 10 pattern play principles (Dr. Dave)", "DMlQGu_pRNU")], sp: [V("Equal Offense vs the ghost (Shortstop On Pool)", "VMHvv7toICw")], bk: [V("Bank to all pockets (Dr. Dave)", "tVpfIgPC6F8")] };
const hm = (m) => Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0");
function generate(p, keep){
  const A = areaStats(p), days = DAYSETS[Math.max(1, Math.min(7, +p.days || 5))], total = Math.max(30, Math.round((+p.hours || 3) * 60));
  const short = total < 60, wmin = short ? 10 : 15, cmin = short ? 5 : 10;
  const estBreaks = Math.max(0, Math.floor((total - 40) / 55));
  const free = Math.max(0, total - wmin - cmin - estBreaks * 5 - (total >= 60 ? 15 : 0));
  const fun = free >= 45 ? Math.min(Math.max(15, Math.round(free * 0.22 / 5) * 5), 120) : 0;
  const focusPerDay = Math.max(0, free - fun);
  const ranked = Object.entries(A).sort((a, b) => b[1].gap - a[1].gap);
  const pos = ranked.filter(([, s]) => s.gap > 0);
  const weights = (pos.length ? pos : ranked.slice(0, 3)).map(([k, s]) => [k, Math.max(4, s.gap)]);
  const wsum = weights.reduce((s, x) => s + x[1], 0);
  const chunks = Math.floor(focusPerDay * days.length / 15);
  const capA = Math.max(1, Math.min(Math.round(chunks * 0.35), 3 * days.length));
  let alloc = weights.map(([k, w]) => [k, Math.min(capA, Math.max(1, Math.round(w / wsum * chunks)))]);
  let over = alloc.reduce((s, x) => s + x[1], 0) - chunks;
  while (over > 0 && alloc.length) { alloc.sort((a, b) => b[1] - a[1]); if (alloc[alloc.length-1][1] > 1 || alloc.length === 1) alloc[0][1]--; else alloc.pop(); over--; }
  // spare chunks go to the next-weakest areas (capped)
  let spare = chunks - alloc.reduce((s, x) => s + x[1], 0), gi = 0;
  while (spare > 0 && gi < 200) { const x = alloc[gi % alloc.length]; if (x && x[1] < capA) { x[1]++; spare--; } gi++; if (alloc.every((y) => y[1] >= capA)) break; }
  const pool = []; alloc.sort((a, b) => b[1] - a[1]).forEach(([k, n]) => { for (let i = 0; i < n; i++) pool.push(k); });
  const per = Math.floor(focusPerDay / 15);
  const plan = days.map((d) => ({ day: d, items: [] }));
  // locked blocks stay where they were
  const locked = (keep && keep.days) ? keep.days.map((d) => (d.blocks || []).filter((b) => b.lock)) : [];
  plan.forEach((d, i) => { const lk = (locked[i] || []).filter((b) => b.kind === "focus"); lk.forEach((b) => { const j = pool.indexOf(b.area); for (let n = 0; n < b.min / 15; n++) { const jj = pool.indexOf(b.area); if (jj >= 0) pool.splice(jj, 1); } d.items.push(Object.assign({}, b)); }); });
  // round-robin: spread each area across days, at most 3 focus areas per day (blocks of 15–45 min)
  const cap = per * 15, MAXA = Math.max(1, Math.min(6, Math.round(focusPerDay / 40)));
  let di = 0, guard = 0;
  while (pool.length && guard++ < 500) {
    const d = plan[di % plan.length]; di++;
    const used = d.items.reduce((s, b) => s + b.min, 0);
    if (used + 15 > cap) { if (plan.every((x) => x.items.reduce((s, b) => s + b.min, 0) + 15 > cap)) break; continue; }
    const areasIn = d.items.map((b) => b.area);
    let k = areasIn.length < MAXA ? pool.findIndex((a) => !areasIn.includes(a)) : -1;
    if (k < 0) k = pool.findIndex((a) => d.items.some((b) => b.area === a && !b.lock && b.min < 45));
    if (k < 0) { if (plan.every((x) => x.items.length >= MAXA && !pool.some((a) => x.items.some((b) => b.area === a && !b.lock && b.min < 45)))) break; continue; }
    const a = pool.splice(k, 1)[0];
    const ex = d.items.find((b) => b.area === a && !b.lock);
    if (ex) ex.min += 15; else d.items.push({ kind: "focus", area: a, min: 15 });
  }
  const gl = p.games && p.games.length ? p.games : ["9"];
  const retestDue = TESTS.filter((t) => !t.overall && (!t.optional || p.jm) && t.area && A[t.area]).filter((t) => { const l = latest(t.id); return !l || (Date.now() - new Date(l.d).getTime()) / 864e5 >= (A[t.area] && ranked.slice(0, 3).some((r) => r[0] === t.area) ? 14 : 28); });
  const out = { made: new Date().toISOString(), total, days: [] };
  plan.forEach((d, i) => {
    const bl = [];
    const cross = p.cross || p.eye !== p.hand;
    bl.push({ kind: "warm", min: wmin, t: "Warm-up", txt: "Back-friendly stretch (general, not medical advice), then 10 easy straight-ins." + (cross ? " Cross-dominance check: find your vision center (Dr. Dave VEPP) on 5 straight-ins before you start." : ""), vids: [V("Get-in-stroke drill (Corey Deuel)", "pLfJh_6YDVw")], why: "Same start every day for consistency." + (cross ? " You are cross-dominant, so head position is checked first." : "") });
    if (total >= 60) bl.push({ kind: "fund", min: 15, t: "Fundamentals: stroke", txt: DRILL.stroke, vids: AV.stroke, why: "Kept every day, whatever your scores, because stroke supports every other skill." });
    const lk = (locked[i] || []).filter((b) => b.kind !== "focus");
    d.items.sort((a, b) => (A[b.area] ? A[b.area].gap : 0) - (A[a.area] ? A[a.area].gap : 0)).forEach((b) => {
      const s = A[b.area] || {};
      const why = b.why || (s.score == null ? `${AREAS[b.area]}: not tested yet. Expected about ${s.exp}/100 at your level; next-level target ${s.tgt}.` : `${AREAS[b.area]}: your latest score ${s.score}/100 vs ${s.tgt} next-level target (expected ${s.exp} at your level).`) + (p.weak.includes(b.area) ? " You marked this as a weakness." : "");
      bl.push(Object.assign({ t: "Focus: " + AREAS[b.area], txt: DRILL[b.area] + (b.area.startsWith("aim") && p.hand === "L" ? " (Left-handed: set the drill up from the other side if it is easier to reach.)" : ""), vids: AV[b.area], why }, b));
    });
    if (fun) { const g = gl[i % gl.length], g2 = gl[(i + 1) % gl.length]; const parts = fun > 60 ? [Math.ceil(fun / 2 / 5) * 5, fun - Math.ceil(fun / 2 / 5) * 5] : [fun];
      parts.forEach((m, pi) => { const gg = pi ? g2 : g; bl.push({ kind: "fun", min: m, t: "Game: " + (GAMESN[gg] || gg), txt: `Play ${GAMESN[gg] || gg} against the ghost or a friend. Keep it fun; note one pattern mistake per rack.`, vids: GAMEV[gg] || AV.pat, why: "About a fifth of the session is a real game so practice stays fun and carries over to matches." }); }); }
    if (i === plan.length - 1 && retestDue.length) { const tt = retestDue.slice(0, 3); const last = bl.filter((b) => b.kind === "focus" && !b.lock).pop(); if (last) { last.min = Math.max(last.min, 30); last.t = "Retest: " + tt.map((t) => t.name.replace(", set up as a ", " ").split(" (")[0]).join(" · "); last.txt = "Run these tests and enter the scores in Tests. The plan updates from your new scores."; last.kind = "retest"; last.vids = tt.flatMap((t) => t.vids).slice(0, 2); last.why = "These tests are due (top weaknesses every 2 weeks, the rest every 4 weeks)."; } }
    lk.forEach((b) => bl.push(b));
    // fill or trim to the time budget (before breaks and cool-down)
    const brkN = (m) => Math.max(0, Math.floor((m - 1) / 55));
    const need = () => total - cmin - bl.reduce((s, b) => s + b.min, 0) - brkN(bl.reduce((s, b) => s + b.min, 0)) * 5;
    let guard2 = 0;
    while (need() >= 5 && guard2++ < 200) { const f = bl.filter((b) => (b.kind === "focus") && !b.lock && b.min < 45).sort((a, b) => a.min - b.min)[0]; if (f) { f.min += 5; continue; } const fr = bl.find((b) => b.kind === "free" && b.min < 45); if (fr) fr.min += 5; else bl.push({ kind: "free", min: 5, t: "Free practice", txt: "Pick any drill or game from the Library (or repeat today's weakest drill).", vids: [], why: "Extra time after the focus blocks are full (max 45 min each)." }); }
    guard2 = 0;
    while (need() < 0 && guard2++ < 200) { const f = bl.filter((b) => (b.kind === "focus" || b.kind === "fun" || b.kind === "free") && !b.lock && b.min > 15).sort((a, b) => b.min - a.min)[0]; if (!f) break; f.min -= 5; }
    const seq = []; let tmin = 0, since = 0;
    bl.forEach((b, j) => { if (j > 0 && since >= 45 && since + b.min > 65) { seq.push({ kind: "brk", min: 5, t: "Break", txt: "Stand, walk, light stretch, water.", why: "A short break about every hour, kind to your back." }); since = 0; } seq.push(b); since += b.min; });
    seq.push({ kind: "cool", min: cmin, t: "Cool-down", txt: "Gentle stretch and log today's scores.", why: "Logging scores is how the plan adapts." });
    let diff = total - seq.reduce((s, b) => s + b.min, 0);
    for (const b of seq) { if (!diff) break; if ((b.kind === "focus" || b.kind === "fun" || b.kind === "free") && !b.lock) { const c = diff > 0 ? diff : Math.max(diff, 10 - b.min); b.min += c; diff -= c; } }
    seq.forEach((b) => { b.range = hm(tmin) + "–" + hm(tmin + b.min); tmin += b.min; });
    out.days.push({ day: d.day, blocks: seq });
  });
  const top = ranked.slice(0, 3).map(([k, s]) => `${s.name}${s.score == null ? " (not tested)" : " (" + s.score + "/100)"}`);
  out.why = `Level ${LVN[LV(fOf(p))]} (Fargo ${fOf(p)}${p.useFargo ? "" : ", self-rated"}). Biggest gaps to the next level: ${top.join("; ")}. Weekly time: ${days.length} days × ${hm(total)} h. Fundamentals and a fun game block are kept every day.`;
  out.weekMin = {}; out.days.forEach((d) => d.blocks.forEach((b) => { if (b.area) out.weekMin[b.area] = (out.weekMin[b.area] || 0) + b.min; }));
  out.retest = retestDue.map((t) => t.id);
  return out;
}
const getPlan = () => { const p = prof(); let pl = Lg("pt_aplan", null); if (!pl) { pl = generate(p); Sg("pt_aplan", pl); } return pl; };

// ---------- Warm-up ----------
const WU = {
  steps: [
    ["stroke", "Stroke and speed", "Slow practice strokes, then lag-length speed shots: stop the cue ball near the far rail.", [V("Get-in-stroke drill (Corey Deuel)", "pLfJh_6YDVw")]],
    ["sfd", "Stop, follow, draw", "Short straight-ins: 3 stops, 3 follows, 3 draws. Feel the tip contact.", [V("Stop, follow and draw drill (Dr. Dave)", "xUA1lsGKEAc")]],
    ["long", "Long-shot alignment", "3–5 long straight-ins; check you stay down and finish straight.", [V("How to shoot a long stop shot (FX Billiards)", "urWaiWeM7xE")]],
    ["weak", "Light pass at your weakest area", "", []],
    ["conf", "Confidence shots", "Easy shots you like to make, at match speed, with your full pre-shot routine.", [V("3-step pre-shot routine (Jasmin Ouschan)", "VSHni6W1y6M")]],
    ["brk", "Break (if the room allows)", "2–3 breaks at 80–90% power; focus on a square hit and a cue ball that stays in the middle.", [V("Break shot technique (Dr. Dave)", "Av2DNdWzziA")]],
    ["lag", "Lag", "3 lags: aim to stop within a ball width of the head rail.", [V("NO LAG CAN STOP ME FROM WINNING (Slivovich)", "FMjdnBUrvS8")]]],
  mins: { 10: [2,2,1,1,1,2,1], 20: [3,4,3,3,2,3,2], 30: [5,5,4,5,4,4,3] }
};
function warmSteps(len, variant, p){
  const A = areaStats(p); const wk = Object.entries(A).sort((a, b) => b[1].gap - a[1].gap)[0];
  if (variant === "none") return [
    ["Off-table stroke", "20 slow shadow strokes with a pause at the back and a full finish (cue in hand, no table).", Math.round(len * 0.3), []],
    ["Visualize", "Picture 5 shots from your weakest area (" + (wk ? wk[1].name : "") + ") going in, including the stance and head position.", Math.round(len * 0.3), [V("3 tools to deal with pressure (Niels Feijen)", "FmLIxmbPVv4")]],
    ["Routine and breathing", "Walk through your pre-shot routine 5 times; slow breath out before each imaginary stroke.", len - 2 * Math.round(len * 0.3), [V("3-step pre-shot routine (Jasmin Ouschan)", "VSHni6W1y6M")]]];
  const m = WU.mins[len].slice(); let st = WU.steps.map((s, i) => [s[1], s[0] === "weak" ? (wk ? `${wk[1].name}: ${DRILL[wk[0]]} (keep it light, a few shots only)` : "") : s[2], m[i], s[0] === "weak" ? (wk ? AV[wk[0]].slice(0, 1) : []) : s[3], s[0]]);
  if (variant === "nobreak" || variant === "shared") { const b = st.find((s) => s[4] === "brk"); const c = st.find((s) => s[4] === "conf"); c[2] += b[2]; st = st.filter((s) => s[4] !== "brk"); }
  if (variant === "shared") { st = st.map((s) => s[4] === "long" ? [s[0] + " (skip if the table is busy)", s[1], s[2], s[3], s[4]] : s); st.unshift(["Shared table note", "Take turns: shoot 2 shots each, and let the other player have the lag spot first.", 0, [], "note"]); }
  return st.map((s) => s.slice(0, 4));
}

// ---------- Ratings cards (no APA) ----------
const CSI = [[721,9999,"A++","10"],[650,720,"A+","9"],[600,649,"A","9"],[550,599,"A−","8"],[500,549,"B+","8"],[450,499,"B","7"],[400,449,"B−","6"],[350,399,"C+","5"],[300,349,"C","4"],[250,299,"D+","3"],[0,249,"D","2"]];
const csiRow = (f) => CSI.find((r) => f >= r[0] && f <= r[1]);
const UPLSTART = [[0,300,300],[301,350,350],[351,400,400],[401,450,450],[451,515,500],[516,550,550],[551,615,600],[616,650,650],[651,9999,700]];
function ratings(f){
  const bu = buRow(f), c = csiRow(f), u = UPLSTART.find((r) => f >= r[0] && f <= r[1]);
  const napa = (+c[3]) * 10, tap = Math.max(2, Math.min(7, Math.round(napa / 10 - 2)));
  return [
    { n: "FargoRate", what: "The most widely used US rating. Pros are mostly 700–800; most league players are 200–700. A 100-point gap means about 2-to-1 odds in games.", you: `${f} (${bu[2]} on the BU chart)`, basis: "From FargoRate's FAQ", src: [["FargoRate FAQ", "https://fargorate.com/faq/"]], rules: ["WPA rules (FargoRate has no rulebook; most Fargo-rated events use WPA or league rules)", "https://wpapool.com/rules/"] },
    { n: "UPL: Ultimate Pool League (Ultimate Pool USA)", what: "Uses UPScore. New players with no data start at 400; players with a Fargo start from this chart. Handicap: 40-point gap = 1 game, 80 = 2, 120 = 3, 180 = 4 (521+).", you: `UPScore start ≈ ${u[2]}`, basis: "Sourced (UPL manual starting chart)", src: [["UPL manual (PDF)", "https://league.ultimatepoolusa.com/docs/uplmanual.pdf"], ["UPL Indianapolis", "https://www.uplindy.com/"], ["UPScore calculator (UPL Indy)", "https://www.uplindy.com/upscore-calculator.html"]], rules: ["UPL manual (rules and UPScore)", "https://league.ultimatepoolusa.com/docs/uplmanual.pdf"] },
    { n: "USA Pool League (USAPL, a CSI league)", what: "Also called UPL. Run by CSI and uses FargoRate ratings directly.", you: `Fargo ${f}`, basis: "From FargoRate's FAQ and CSI", src: [["FargoRate FAQ", "https://fargorate.com/faq/"]], rules: ["CSI USAPL rules", "https://www.playcsipool.com/usapl-rules.html"] },
    { n: "BCA / CSI (BCAPL)", what: "CSI runs BCAPL and the BCA Pool League events. CSI's own chart maps Fargo to a CSI letter and the BCAPL 10-point skill level.", you: `CSI ${c[2]}, BCAPL ${c[3]} (BU chart: BCAPL 9-ball ${bu[8]})`, basis: "Sourced (CSI comparison chart; BU chart)", src: [["CSI rating comparison (PDF)", "https://www.playcsipool.com/uploads/7/3/5/9/7359673/rating_systems_comparisons_bcapl.pdf"], ["BU rating comparisons (PDF)", "https://billiarduniversity.org/documents/BU_Rating_Comparisons.pdf"]], rules: ["CSI BCAPL rules", "https://www.playcsipool.com/bcapl-rules.html"], rules2: ["BCA rules and specifications", "https://bca-pool.com/page/54"] },
    { n: "VNEA", what: "VNEA leagues use their own handicaps; the BU chart lists one combined BCAPL/VNEA 8-ball column.", you: `BCAPL/VNEA 8-ball ≈ ${bu[6]}`, basis: "Sourced (BU chart; varies by league)", src: [["BU rating comparisons (PDF)", "https://billiarduniversity.org/documents/BU_Rating_Comparisons.pdf"]], rules: ["VNEA rules", "https://www.vnea.com/rules"], rules2: ["VNEA 8-ball rules 2025 (PDF)", "https://www.vnea.com/Data/Sites/1/media/8-ball_rules_only_2025.pdf"] },
    { n: "NAPA (North American Poolshooters Association)", what: "CueSpeed Elo-style rating. Classes: Grandmaster 110+, Master 90–109, A 70–89, B 50–69, C 30–49, D 10–29, E 9 and under. New men start at 50, women at 40. NAPA says BCAPL n ≈ NAPA n×10.", you: `≈ ${napa} (from BCAPL ${c[3]})`, basis: "Derived (NAPA's own conversion applied to the CSI chart)", src: [["NAPA about / ratings", "https://www.poolshooters.com/about.php"]], rules: ["NAPA rules", "https://rules.napaleagues.com/index.php?ball=8-ball"] },
    { n: "TAP (The American Poolplayers league)", what: "Handicaps 2–7; new players start at 4; teams follow the 25 Rule. NAPA lists TAP 2–7 as NAPA 40–90.", you: `≈ TAP ${tap}`, basis: "Derived (NAPA's TAP mapping applied to the line above)", src: [["TAP documents", "https://www.tapleague.com/documents"]], rules: ["TAP rules and documents", "https://www.tapleague.com/documents"] },
    { n: "IBA TruSpot (International Billiards Association)", what: "A player skill rating run by the International Billiards Association (not related to the IPA below). TruSpot bands: 0–29 beginner; 30–59 runs a rack about once a season; 60–89 league player; 90–119 good local; 120–149 good regional; 150–179 top regional; 180–209 grand master; 210–269 top national.", you: "No published Fargo conversion, so the app does not guess.", basis: "Sourced bands only", src: [["IBA TruSpot", "https://www.ibapool.com/TruSpot"]], rules: ["IBA has no public rules page (its rules link is a question form). Its site:", "https://www.ibapool.com/"] },
    { n: "IPA: International Pool Association (UK Blackball pro tour)", what: "The WPA-recognized professional body for Blackball (English 8-ball: reds, yellows and a black on a 6–7 ft table). It runs the IPA Tour, Amateur Series, World Championships and Masters. Events use WPA Blackball rules plus IPA's own tour rules, which IPA says apply at all IPA events and replace WPA rules where they differ (for example a 3-point break and a 30 s shot clock). The recent events on IPA's Cuescore page are all labelled Blackball, and IPA's pages and rule documents mention no 9-ball or other formats. Rankings are by tour points, not a Fargo-style skill rating, so there is no conversion to Fargo.", you: "No skill rating to convert: IPA uses tour ranking points.", basis: "Sourced (IPA site)", src: [["IPA home", "https://ipapool.com/"], ["IPA rankings", "https://ipapool.com/rankings/"], ["IPA professional ranking (points)", "https://ipapool.com/rankings/professional/"], ["IPA rules and regulations", "https://ipapool.com/about/rules-regulations/"], ["IPA Tour Tournament Specific Rules (.docx)", "https://ipapool.com/wp-content/uploads/2026/09/IPA-Tour-Tournament-Specific-Rules.docx"], ["IPA Blackball rules (older copy, PDF)", "https://roundrobin.ch/PDF/Regeln/Pool/IPA-Blackball-Rules.pdf"], ["IPA on Cuescore", "https://cuescore.com/ipapool"]], rules: ["WPA Rules of Play, effective 2026-10-21 (Blackball is section 8)", "https://wpapool.com/wp-content/uploads/2026/10/WPA-Rules-2026-10-21-211.pdf"], rules2: ["IPA rules and regulations", "https://ipapool.com/about/rules-regulations/"],
      diffT: "How IPA differs from Ultimate Pool (UK)", diffNote: "Here 'Ultimate Pool' means the UK's Ultimate Pool Group (English 8-ball), not the US Ultimate Pool League (UPL). Ultimate Pool's own rules folder holds the same International Eightball Rules Rev 2d document the IEPF uses, so Ultimate Pool and International Rules match on the core rules; the differences are Ultimate Pool's televised-event add-ons (Golden Break, 6-Reds Shootout, match clocks). For a full side-by-side, open More → Rules Compare.",
      diff: [
        ["Rulebook: Ultimate Pool uses International Eightball Rules v2d ('endorsed by IEPF and Ultimate Pool'). The IPA uses WPA Blackball (section 8) plus IPA Tour rules.", [["Ultimate Pool rules", "https://www.ultimatepoolgroup.com/rules"], ["International Rules v2d", "https://epa.org.uk/rules/international_2d.php"], ["IPA rules and regulations", "https://ipapool.com/about/rules-regulations/"]]],
        ["Break: both now need 3 points (1 per ball potted, 1 per ball past the centre line). But at IPA a failed break is a foul, giving the opponent the foul-break options. Under International Rules it's a re-rack, and the opponent chooses who breaks.", [["IPA Tour rules: Three-Point Rule", "https://ipapool.com/wp-content/uploads/2026/09/IPA-Tour-Tournament-Specific-Rules.docx"], ["International Rules 4f–4g", "https://epa.org.uk/rules/international_2d.php"]]],
        ["Foul penalty: at IPA (WPA Blackball) the opponent gets one free shot (any ball first; cue ball as it lies or from baulk). Under International Rules the opponent gets one visit with the cue ball in hand anywhere on the table.", [["WPA rules 8.1, 8.13", "https://wpapool.com/wp-content/uploads/2026/10/WPA-Rules-2026-10-21-211.pdf"], ["International Rules 6e", "https://epa.org.uk/rules/international_2d.php"]]],
        ["Potting an opponent's ball without one of your own: a foul at IPA. Under International Rules it's only loss of turn.", [["WPA rule 8.13(a)", "https://wpapool.com/wp-content/uploads/2026/10/WPA-Rules-2026-10-21-211.pdf"], ["International Rules 6d", "https://epa.org.uk/rules/international_2d.php"]]],
        ["Last group ball + black on the same shot: a win at IPA (WPA 8.14(b)). Loss of frame under International Rules.", [["WPA rule 8.14(b)", "https://wpapool.com/wp-content/uploads/2026/10/WPA-Rules-2026-10-21-211.pdf"], ["International Rules 6f(4)", "https://epa.org.uk/rules/international_2d.php"]]],
        ["Shot clock: IPA gives 30 s with one 30 s extension per frame. International Rules give 45 s with one 15 s extension.", [["IPA Tour Shot Clock Rules", "https://ipapool.com/wp-content/uploads/2026/09/IPA-Tour-Shotclock-Rules.docx"], ["International Rules 6j", "https://epa.org.uk/rules/international_2d.php"]]],
        ["Words: International Rules use 'frozen' only for a ball touching a cushion (6h), and 'touching ball' for ball-on-ball (6o). WPA Blackball says 'touching balls' (8.9).", [["International Rules 6h, 6o", "https://epa.org.uk/rules/international_2d.php"], ["WPA rule 8.9", "https://wpapool.com/wp-content/uploads/2026/10/WPA-Rules-2026-10-21-211.pdf"]]]
      ] },
    { n: "ACS (American CueSports Alliance)", what: "Runs leagues and national events under the World Standardized Rules. No single public player-rating scale to convert.", you: "n/a", basis: "", src: [], rules: ["ACS World Standardized Rules", "https://americancuesports.org/world-standardized-rules/"] },
    { n: "WPA (World Pool-Billiard Association)", what: "The world governing body for rules; it does not publish amateur ratings. Most pro and many amateur events use WPA rules.", you: "n/a", basis: "", src: [], rules: ["WPA rules", "https://wpapool.com/rules/"], rules2: ["WPA rules (PDF)", "https://wpapool.com/wp-content/uploads/2024/01/WPA_New_Rules_01MAR2016-fixed-spelling.pdf"] },
    { n: "BU exam score and Compusport CSR", what: "Billiard University's chart lines up BU exam scores (Exam I + II, out of 200), Fargo, ABCD letters and Compusport CSR.", you: `BU ${bu[0]}–${bu[1]} · ABCD ${bu[5]} · CSR ${bu[7]}`, basis: "Sourced (BU chart)", src: [["BU rating comparisons (PDF)", "https://billiarduniversity.org/documents/BU_Rating_Comparisons.pdf"], ["BU exams", "https://billiarduniversity.org/testing/exams/"]], rules: null }
  ];
}

// ---------- UI ----------
function A_ui($, esc, url, vbtns, save, st, rerender){
  const srcBtns = (list) => (list || []).map(([l, u]) => `<a class="btn ghost2" href="${esc(url(u))}" target="_blank" rel="noopener">📄 ${esc(l)}</a>`).join("");
  const vb = (list) => vbtns((list || []).map(([l, id]) => [l, id]));
  function renderProfile(){
    const p = prof();
    $("#title").textContent = "Profile & Settings";
    $("#headx").innerHTML = "";
    const g = (k) => p.games.includes(k) ? "checked" : "";
    const w = (k) => p.weak.includes(k) ? "checked" : "";
    let h = `<div class="callout">These settings drive the adaptive plan, the tests' level targets and the warm-up. They start with Scott's settings; change anything.</div>
    <div class="card"><div class="t">Level</div>
      <label class="tog"><input type="checkbox" id="pf_uf" ${p.useFargo ? "checked" : ""}> I know my Fargo rating</label>
      <div id="pf_fw" ${p.useFargo ? "" : "hidden"}><input type="number" id="pf_f" min="100" max="850" step="1" value="${esc(p.fargo)}"></div>
      <div id="pf_sw" ${p.useFargo ? "hidden" : ""}><select id="pf_s">${Object.entries(LVN).map(([k, v]) => `<option value="${k}" ${p.self===k?"selected":""}>${v}</option>`).join("")}</select></div>
      <div class="meta" id="pf_lv"></div></div>
    <div class="card"><div class="t">Handedness and eyes</div>
      <div class="row"><label>Shoots<select id="pf_h"><option value="R" ${p.hand==="R"?"selected":""}>Right-handed</option><option value="L" ${p.hand==="L"?"selected":""}>Left-handed</option></select></label>
      <label>Dominant eye<select id="pf_e"><option value="R" ${p.eye==="R"?"selected":""}>Right eye</option><option value="L" ${p.eye==="L"?"selected":""}>Left eye</option><option value="N" ${p.eye==="N"?"selected":""}>Not sure / neither</option></select></label></div>
      <label class="tog"><input type="checkbox" id="pf_c" ${p.cross ? "checked" : ""}> Cross-dominant (e.g. left-handed but right-eye dominant, or the eye is on the other side from the cue)</label></div>
    <div class="card"><div class="t">Time budget</div><div class="row">
      <label>Days per week<select id="pf_d">${[1,2,3,4,5,6,7].map((n) => `<option ${+p.days===n?"selected":""}>${n}</option>`).join("")}</select></label>
      <label>Hours per day<select id="pf_hr">${[0.5,1,1.5,2,2.5,3,4,5,6,8].map((n) => `<option value="${n}" ${+p.hours===n?"selected":""}>${n}</option>`).join("")}</select></label></div></div>
    <div class="card"><div class="t">Games you play</div><div class="ckgrid">${Object.entries(GAMESN).map(([k, v]) => `<label><input type="checkbox" class="pf_g" value="${k}" ${g(k)}> ${v}</label>`).join("")}</div></div>
    <div class="card"><div class="t">Known weaknesses</div><div class="ckgrid">${Object.entries(AREAS).map(([k, v]) => `<label><input type="checkbox" class="pf_w" value="${k}" ${w(k)}> ${v}</label>`).join("")}</div>
      <label class="tog"><input type="checkbox" id="pf_jm" ${p.jm ? "checked" : ""}> Include jump / massé (optional)</label></div>
    <div class="card"><div class="t">Which plan shows on Today</div>
      <label class="tog"><input type="radio" name="pf_m" value="built" ${p.mode!=="adaptive"?"checked":""}> Built 3 h × 5 day plan (Scott's original)</label>
      <label class="tog"><input type="radio" name="pf_m" value="adaptive" ${p.mode==="adaptive"?"checked":""}> Adaptive plan (from these settings and your test scores)</label></div>
    <div class="row"><button class="btn" id="pf_save">Save and rebuild the adaptive plan</button><button class="btn ghost" id="pf_reset">Reset to Scott's defaults</button></div>`;
    $("#main").innerHTML = h;
    const lv = () => { const f = $("#pf_uf").checked ? +$("#pf_f").value || 500 : SELF_F[$("#pf_s").value]; const r = buRow(f); $("#pf_lv").textContent = `App level: ${LVN[LV(f)]} · BU chart: ${r[2]} (BU ${r[0]}–${r[1]} of 200)`; };
    $("#pf_uf").onchange = () => { $("#pf_fw").hidden = !$("#pf_uf").checked; $("#pf_sw").hidden = $("#pf_uf").checked; lv(); };
    $("#pf_f").oninput = lv; $("#pf_s").onchange = lv; lv();
    $("#pf_save").onclick = () => {
      const n = { fargo: +$("#pf_f").value || 500, useFargo: $("#pf_uf").checked, self: $("#pf_s").value, hand: $("#pf_h").value, eye: $("#pf_e").value, cross: $("#pf_c").checked, days: +$("#pf_d").value, hours: +$("#pf_hr").value,
        games: [...document.querySelectorAll(".pf_g:checked")].map((x) => x.value), weak: [...document.querySelectorAll(".pf_w:checked")].map((x) => x.value), jm: $("#pf_jm").checked, mode: (document.querySelector("[name=pf_m]:checked") || {}).value || "built" };
      Sg("pt_profile", n); Sg("pt_aplan", generate(Object.assign({}, DEFPROF, n), Lg("pt_aplan", null)));
      $("#pf_save").textContent = "Saved ✓"; setTimeout(() => { const b = $("#pf_save"); if (b) b.textContent = "Save and rebuild the adaptive plan"; }, 1500);
    };
    $("#pf_reset").onclick = () => { if (!confirm("Reset the profile to Scott's defaults? Test scores are kept.")) return; localStorage.removeItem("pt_profile"); Sg("pt_aplan", generate(DEFPROF)); renderProfile(); };
  }
  function renderTests(){
    const p = prof(), f = fOf(p), A = areaStats(p), sc = scores();
    $("#title").textContent = "Skill Tests";
    const sel = st.tarea || "all";
    $("#headx").innerHTML = `<div class="chips"><button class="chip ${sel==="all"?"on":""}" data-ta="all">All</button>${Object.entries(AREAS).filter(([k]) => k !== "jm" || p.jm).map(([k, v]) => `<button class="chip ${sel===k?"on":""}" data-ta="${k}">${esc(v.split(" (")[0])}</button>`).join("")}</div>`;
    document.querySelectorAll("[data-ta]").forEach((b) => b.onclick = () => { st.tarea = b.dataset.ta; renderTests(); });
    let h = `<div class="callout">Each test gives a 0–100 score. The level marks come from the Billiard University rating chart and other sources; each card says whether its benchmark is sourced, derived from a sourced chart, or an app estimate. Your level: <b>${LVN[LV(f)]}</b> (Fargo ${f}). <a href="#" id="t_prof">Change in Profile</a></div>`;
    const rows = Object.entries(A).sort((a, b) => b[1].gap - a[1].gap);
    h += `<details ${sel==="all"?"open":""}><summary>Your areas, weakest first</summary><div class="inner"><table><tr><th>Area</th><th>Score</th><th>Your level</th><th>Next level</th></tr>${rows.map(([k, s]) => `<tr><td>${esc(s.name)}</td><td>${s.score == null ? "—" : s.score}</td><td>${s.exp}</td><td>${s.tgt}</td></tr>`).join("")}</table>`;
    if (A.aimR && A.aimL && A.aimR.score != null && A.aimL.score != null) h += `<div class="meta">Right vs left cuts: ${A.aimR.score} vs ${A.aimL.score} (${A.aimR.score < A.aimL.score ? "right side weaker" : A.aimR.score > A.aimL.score ? "left side weaker" : "even"}).</div>`;
    h += `<div class="meta">"—" means not tested yet. Tests due for a retest are marked ⏰ below.</div></div></details>`;
    const pl = Lg("pt_aplan", null), due = pl && pl.retest ? pl.retest : [];
    TESTS.filter((t) => (!t.optional || p.jm) && (sel === "all" || t.area === sel)).forEach((t) => {
      const l = latest(t.id), b = norm(t, bench(t, f)), bn = norm(t, bench(t, Math.min(800, f + 75)));
      const hist = (sc[t.id] || []).slice(-5);
      const ra = l ? new Date(new Date(l.d).getTime() + (rows.slice(0, 3).some((r) => r[0] === t.area) ? 14 : 28) * 864e5).toISOString().slice(0, 10) : null;
      h += `<div class="card" id="test-${t.id}"><div class="t">${due.includes(t.id) ? "⏰ " : ""}${esc(t.name)}</div><div class="meta">${esc(t.area ? AREAS[t.area] : "Overall")} · max ${t.max} · <span class="pill ${t.basis}">${BASIS[t.basis]}</span></div>
      <div class="desc">${esc(t.how)}</div>
      <div class="meta">At your level expect about ${b}/100 (raw ≈ ${Math.round(bench(t, f) * 10) / 10}); next level ≈ ${bn}/100.</div>
      ${l ? `<div class="meta">Latest: ${l.raw}/${t.max} = <b>${norm(t, l.raw)}/100</b> on ${esc(l.d)}${hist.length > 1 ? " · last " + hist.length + ": " + hist.map((x) => norm(t, x.raw)).join(", ") : ""}${ra ? " · retest around " + ra : ""}</div>` : `<div class="meta">Not tested yet.</div>`}
      <div class="row"><input type="number" min="0" max="${t.max}" step="${t.max >= 100 ? 1 : 0.5}" placeholder="Score (0–${t.max})" data-tin="${t.id}"><button class="btn" data-tsave="${t.id}">Save score</button></div>
      <div class="vids">${srcBtns(t.src)}</div>${vb(t.vids)}</div>`;
    });
    h += `<div class="callout">Also useful but not scored here: the <a href="${esc(url("/faq/drill/fargo/"))}" target="_blank" rel="noopener">Fargo rating drill (Mike Page)</a> and the full <a href="${BU}/testing/exams/" target="_blank" rel="noopener">BU exam set</a>.</div>`;
    $("#main").innerHTML = h;
    $("#t_prof").onclick = (e) => { e.preventDefault(); st.view = "prof"; save(); rerender(); };
    document.querySelectorAll("[data-tsave]").forEach((b) => b.onclick = () => {
      const id = b.dataset.tsave, t = TESTS.find((x) => x.id === id), inp = document.querySelector(`[data-tin="${id}"]`), v = parseFloat(inp.value);
      if (isNaN(v) || v < 0 || v > t.max) { inp.focus(); inp.style.borderColor = "#d55"; return; }
      const s = scores(); (s[id] = s[id] || []).push({ d: new Date().toISOString().slice(0, 10), raw: v }); Sg("pt_tests", s);
      Sg("pt_aplan", generate(prof(), Lg("pt_aplan", null)));
      renderTests(); const c = document.getElementById("test-" + id); if (c) c.scrollIntoView();
    });
  }
  function planHTML(pl, interactive){
    return pl.days.map((d, di) => `<div class="card"><div class="t">${esc(d.day)}</div>${d.blocks.map((b, bi) => `<div class="block ${b.lock ? "locked" : ""}"><div style="flex:1"><div class="t">${esc(b.range)} ${esc(b.t)}${b.lock ? " 🔒" : ""}</div><div class="muted">${esc(b.txt)}</div>${b.why ? `<div class="why">Why: ${esc(b.why)}</div>` : ""}${vb(b.vids)}</div>${interactive && (b.kind === "focus" || b.kind === "fun" || b.kind === "retest") ? `<button class="btn ghost lockb" data-lk="${di}:${bi}" aria-label="Lock">${b.lock ? "Unlock" : "Lock"}</button>` : ""}</div>`).join("")}</div>`).join("");
  }
  function renderAPlan(container){
    const p = prof(), pl = getPlan();
    let h = `<div class="callout"><b>Why this plan:</b> ${esc(pl.why)}</div>`;
    h += `<div class="row"><button class="btn" id="ap_re">Regenerate (keeps locked blocks)</button><button class="btn ghost" id="ap_mode">${p.mode === "adaptive" ? "Today shows this plan ✓" : "Show this plan on Today"}</button></div>`;
    h += `<details><summary>Weekly minutes by area</summary><div class="inner"><table>${Object.entries(pl.weekMin).sort((a, b) => b[1] - a[1]).map(([k, m]) => `<tr><td>${esc(AREAS[k])}</td><td>${m} min</td></tr>`).join("")}</table><div class="meta">Plus warm-up, stroke fundamentals, a game block, breaks and cool-down every day.</div></div></details>`;
    if (pl.retest && pl.retest.length) h += `<div class="callout">⏰ Tests due: ${pl.retest.slice(0, 6).map((id) => esc(TESTS.find((t) => t.id === id).name.split(" (")[0])).join(", ")}${pl.retest.length > 6 ? " and " + (pl.retest.length - 6) + " more" : ""}. One retest block is in the last day of the week.</div>`;
    h += planHTML(pl, true);
    container.innerHTML = h;
    $("#ap_re").onclick = () => { Sg("pt_aplan", generate(prof(), Lg("pt_aplan", null))); renderAPlan(container); };
    $("#ap_mode").onclick = () => { const q = prof(); q.mode = q.mode === "adaptive" ? "built" : "adaptive"; Sg("pt_profile", q); renderAPlan(container); };
    container.querySelectorAll("[data-lk]").forEach((b) => b.onclick = () => { const [di, bi] = b.dataset.lk.split(":").map(Number); const q = Lg("pt_aplan", null); const bl = q.days[di].blocks[bi]; bl.lock = !bl.lock; Sg("pt_aplan", q); renderAPlan(container); });
  }
  function todayAdaptive(){ const pl = getPlan(); const dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()]; return { day: pl.days.find((d) => d.day === dow), pl, html: (d) => planHTML({ days: [d] }, false) }; }
  function renderWarm(){
    const p = prof();
    $("#title").textContent = "Pre-Match Warm-Up";
    const len = st.wlen || 20, varn = st.wvar || "full";
    $("#headx").innerHTML = `<div class="chips">${[10,20,30].map((n) => `<button class="chip ${len===n?"on":""}" data-wl="${n}">${n} min</button>`).join("")}</div><div class="chips">${[["full","Full table"],["nobreak","No break allowed"],["shared","Shared / limited table"],["none","No table (off-table)"]].map(([k, l]) => `<button class="chip ${varn===k?"on":""}" data-wv="${k}">${l}</button>`).join("")}</div>`;
    document.querySelectorAll("[data-wl]").forEach((b) => b.onclick = () => { st.wlen = +b.dataset.wl; stopT(); renderWarm(); });
    document.querySelectorAll("[data-wv]").forEach((b) => b.onclick = () => { st.wvar = b.dataset.wv; stopT(); renderWarm(); });
    const steps = warmSteps(len, varn, p).filter((s) => s[2] > 0 || s[0].includes("note"));
    const run = steps.filter((s) => s[2] > 0);
    const WK = "warm:" + len + ":" + varn;
    let h = window.StepTimer ? window.StepTimer.panel(WK, "Pre-match warm-up (" + len + " min)", "warm", run.map((s) => ({ t: s[0], sec: s[2] * 60 }))) : "";
    h += steps.map((s, i) => `<div class="card wstep" data-ws="${i}"><div class="t">${s[2] ? s[2] + " min · " : ""}${esc(s[0])}</div><div class="muted">${esc(s[1])}</div>${vb(s[3])}</div>`).join("");
    h += `<div class="meta">Built from Corey Deuel's get-in-stroke routine, Dr. Dave's stop/follow/draw drill and the BU break scoring. The weakest-area step comes from your test scores (Profile and Tests). Back care notes are general, not medical advice.</div>`;
    $("#main").innerHTML = h;
    if (window.StepTimer) { document.querySelectorAll("#main .wstep").forEach((el) => { const k = run.indexOf(steps[+el.dataset.ws]); if (k >= 0) window.StepTimer.mark(el, WK, k); }); window.StepTimer.refresh(); }
  }
  const stopT = () => { if (window._wT) { clearInterval(window._wT); window._wT = null; } };
  function renderRatings(){
    const p = prof(), f = fOf(p);
    $("#title").textContent = "Ratings & Rules";
    $("#headx").innerHTML = `<div class="meta">Showing conversions for Fargo ${f}${p.useFargo ? "" : " (from your self-rated level)"} · <a href="#" id="r_prof">change</a></div>`;
    let h = `<div class="callout">Conversions between systems are rough; the sources say they vary a lot by league and region. APA is not included.</div>`;
    h += ratings(f).map((r) => `<div class="card"><div class="t">${esc(r.n)}</div><div class="desc">${esc(r.what)}</div><div class="meta"><b>You:</b> ${esc(r.you)}${r.basis ? ` · <span class="pill ${/Derived/.test(r.basis) ? "derived" : "sourced"}">${esc(r.basis)}</span>` : ""}</div>
      <div class="vids">${r.rules ? `<a class="btn" href="${esc(r.rules[1])}" target="_blank" rel="noopener">📘 Official rules: ${esc(r.rules[0])}</a>` : ""}${r.rules2 ? `<a class="btn ghost2" href="${esc(r.rules2[1])}" target="_blank" rel="noopener">📘 ${esc(r.rules2[0])}</a>` : ""}${srcBtns(r.src)}</div>${r.diff ? `<details class="diffd"><summary>${esc(r.diffT)}</summary><div class="inner"><div class="meta">${esc(r.diffNote)}</div><ul>${r.diff.map((d) => `<li>${esc(d[0])}<div class="vids">${srcBtns(d[1])}</div></li>`).join("")}</ul></div></details>` : ""}</div>`).join("");
    h += `<details><summary>BU rating chart (Fargo, ABCD, BCAPL/VNEA, CSR)</summary><div class="inner"><table><tr><th>BU</th><th>Level</th><th>Fargo</th><th>ABCD</th><th>BCAPL/VNEA 8</th><th>CSR</th><th>BCAPL 9</th></tr>${BUCHART.map((r) => `<tr class="${f >= r[3] && f <= r[4] ? "hl" : ""}"><td>${r[0]}–${r[1]}</td><td>${r[2]}</td><td>${r[4] > 5000 ? "≥ " + r[3] : r[3] === 0 ? "< 200" : r[3] + "–" + r[4]}</td><td>${r[5]}</td><td>${r[6]}</td><td>${r[7]}</td><td>${r[8]}</td></tr>`).join("")}</table><div class="meta">Source: <a href="https://billiarduniversity.org/documents/BU_Rating_Comparisons.pdf" target="_blank" rel="noopener">BU Rating Comparisons (PDF)</a>. APA columns omitted.</div></div></details>`;
    $("#main").innerHTML = h;
    $("#r_prof").onclick = (e) => { e.preventDefault(); st.view = "prof"; save(); rerender(); };
  }
  return { renderProfile, renderTests, renderAPlan, renderWarm, renderRatings, todayAdaptive, stopT };
}
window.Adaptive = { TESTS, AREAS, BUCHART, generate, areaStats, prof, DEFPROF, ratings, warmSteps, ui: A_ui, fOf, bench, norm };
})();
