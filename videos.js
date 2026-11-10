// Watch-example videos per step. [label, source, startSeconds, kind]. kind: "read" = page/PDF, "none" = no video found, "rest" = rest break.
const R = [["Rest break: no video needed", "", 0, "rest"]];
const BACKV = ["Back stretches (Dr. Dave + PTs, lower back)", "fxTGIsYFiOo", 512];
const STEPV = {
  Mon: [
    [BACKV, ["Vision-center drill (Dr. Dave, VEPP I)", "680o8EChP_o"]],
    [["Mighty X (Margaret Fefilova Styer)", "Oj7lku_wO94"], ["Mighty X (Corey Deuel)", "FXig0vMXug8"], ["Up-downs (Joe Tucker)", "Ii_0HHIiK_c"]],
    R,
    [["Vision-center drill (Dr. Dave)", "680o8EChP_o"], ["Contact-point aiming on cuts (Sharivari)", "yjxs0r3sAbE"], ["BU F1 cut drill (use for the 10 + 10)", "jHAJ9NQEvZg", 29]],
    [["BU F1 progressive cut-shot drill", "jHAJ9NQEvZg", 29], ["Dr. Dave shot-making drills (page)", "/faq/drill/shot-making/", 0, "read"]],
    R,
    [["Basic 9-ball pattern drill (Darren Appleton)", "GGm08omfgwA"], ["Nick Varner 9-ball drill", "89Uwd6j2g0c", 21]],
    R,
    [["3-ball strategy and tips (Dr. Dave)", "IfINkQtiivM"], ["3-ball drill rules (page)", "/faq/drill/3-ball/", 0, "read"]],
    [BACKV],
  ],
  Tue: [
    [BACKV, ["Find your vision center (Dr. Dave)", "5vgY89yDrjE", 181]],
    [["Rail, tees and mirror stroke tests (Dr. Dave)", "D3oj9lte_5o"], ["MOFUDAT (Dr. Dave)", "bCiDMcTxW8A"]],
    [["Stop, follow and draw drill (Dr. Dave)", "xUA1lsGKEAc", 31], ["Stop shot (Jasmin Ouschan)", "ehjFxcW0Lz4"]],
    R,
    [["Yo-Yo drill (Niels Feijen)", "6mZfpxNtMJ4"], ["Speed control drill (PDF)", "/resource_files/speed_control_drill.pdf", 0, "read"]],
    R,
    [["8-ball pattern drills (Tor Lowry)", "V0dAZInUiTE"], ["8-ball pattern drill (Darren Appleton)", "XsJndhiMy3M"]],
    R,
    [["Wagon wheel drill (Dr. Dave, VEPP II)", "-b42018ceoE"]],
    [BACKV],
  ],
  Wed: [
    [BACKV, ["Vision-center drill (Dr. Dave)", "680o8EChP_o"], ["Diamond system: 2-to-1 line (Dr. Dave)", "4QWcQhytefI", 39]],
    [["Cue steering: 6 causes", "fV-8PgqJm8g"], ["Elbow or shoulder out of line (Jasmin Ouschan)", "dTIEeGBT6ys"], ["Shoulder rotation for alignment (Barton)", "1m1Xv-DX7z8"]],
    [["Jewett five-minute drills: no video found", "", 0, "none"], ["Jewett five-minute drills (PDF)", "/resource_files/Jewett_five-minute_drills.pdf", 0, "read"]],
    R,
    [["Diamond system (Dr. Dave)", "4QWcQhytefI", 39], ["One-rail kicks (Sharivari)", "gti0C2gS6mI"], ["One-rail banks (Sharivari)", "8vJlX5wHZzw", 16]],
    R,
    [["One-pocket ghost (Niels Feijen)", "ffUmof-KLl4"], ["One-pocket ghost (Tony Chohan)", "Dbnvlysqcns"], ["Bank to all pockets (Dr. Dave)", "tVpfIgPC6F8"]],
    R,
    [["Big Brother Little Brother (Niels Feijen)", "9dAO28LIO3Q"], ["BU safety drill (Dr. Dave, for Exam VI weeks)", "5bPdwQtHvcE"]],
    [BACKV],
  ],
  Thu: [
    [BACKV, ["Dominant-eye alignment check (Ekkes)", "qQv2R2ijkVg"]],
    [["Contact-point aiming on cuts (Sharivari)", "yjxs0r3sAbE"], ["Extreme cut shots (Tor Lowry)", "clB9sotjL9M"], ["Vision center for cut shots (Pool Buddy Ankit)", "vArP5F1tLHY"]],
    [["Line-up drill (Pool School)", "dcp2BovsPl4"]],
    R,
    [["Skillful square (Niels Feijen)", "HPDJ4OmoHN4"], ["Stun back and stun through (Dr. Dave)", "LpoCliLo5Tg", 129]],
    R,
    [["14.1 practice drill (Mick Hill)", "81rtFDFdBIk"], ["10-ball T drill (Darren Appleton)", "7fFFD8QovCU"]],
    R,
    [["Equal Offense vs the ghost (Shortstop On Pool)", "VMHvv7toICw"], ["Equal Offense rules (page)", "/faq/drill/equal-offense/", 0, "read"]],
    [BACKV],
  ],
  Fri: [
    [["Get-in-stroke drill (Corey Deuel)", "pLfJh_6YDVw"], ["Vision-center drill (Dr. Dave)", "680o8EChP_o"]],
    [["3-step pre-shot routine (Jasmin Ouschan)", "VSHni6W1y6M"]],
    [["BU Exam I overview", "DIARJtj4WF8"], ["FARGO the game (Mike Page)", "CHj6KUw8xzE"], ["BU Exam II overview", "uouJ7LRgVgo"], ["Equal Offense example", "VMHvv7toICw"]],
    [["BU F1 progressive cut drill", "jHAJ9NQEvZg", 29], ["BU Exam I cut drill walkthrough", "2Z6lOEAElwo"]],
    [["Hamstring stretch (Dr. Dave + PTs)", "fxTGIsYFiOo", 720]],
    [["Break training manual (Jasmin Ouschan)", "s27mZsTiXs8"]],
    [["9-ball ghost challenge (Darren Appleton)", "ooWkBTztEHw"], ["Playing the ghost (FX Billiards)", "tjaBWoqA3C0"]],
    [BACKV],
  ],
};
const BENCHV = [
  [["BU Exam I overview", "DIARJtj4WF8"], ["Shane Van Boening takes BU Exam I", "-xW7Mb97HjM"]],
  [["BU Exam II overview", "uouJ7LRgVgo"], ["Shane Van Boening takes BU Exam II", "7dAkzcMux5k"]],
  [["FARGO the game (Mike Page)", "CHj6KUw8xzE"]],
  [["Equal Offense vs the ghost", "VMHvv7toICw"]],
  [["3-ball strategy and tips (Dr. Dave)", "IfINkQtiivM"]],
  [["9-ball ghost challenge (Darren Appleton)", "ooWkBTztEHw"]],
  [["BU F1 progressive cut drill", "jHAJ9NQEvZg", 29], ["BU Exam I cut drill walkthrough", "2Z6lOEAElwo"]],
  [["Colenso test demo (Dr. Dave, Top 10 drills video)", "D3oj9lte_5o"], ["Colenso test rules (page)", "/faq/drill/shot-making/", 0, "read"]],
  [["Vision-center drill (Dr. Dave)", "680o8EChP_o"]],
];
const PROGV = [
  [["Vision center", "680o8EChP_o"], ["Pre-shot routine", "VSHni6W1y6M"], ["Mighty X", "Oj7lku_wO94"], ["Stop shot", "ehjFxcW0Lz4"]],
  [["Yo-Yo speed drill", "6mZfpxNtMJ4"], ["Stun shots", "LpoCliLo5Tg", 129], ["Skillful square", "HPDJ4OmoHN4"], ["8-ball patterns", "V0dAZInUiTE"], ["One-rail kicks", "gti0C2gS6mI"], ["Safety drill", "9dAO28LIO3Q"]],
  [["9-ball ghost", "ooWkBTztEHw"], ["BU Exam IX", "gYysMaumgsA", 109], ["Break manual", "s27mZsTiXs8"]],
];
const BACKNV = [
  [BACKV],
  [["Hamstring stretch (Dr. Dave + PTs)", "fxTGIsYFiOo", 720]],
  [["Lower-back technique changes (Dr. Dave + PTs)", "fxTGIsYFiOo", 512], ["Vision-center drill", "680o8EChP_o"]],
  [["Mechanical bridge (Mike Sigel)", "X3y1dgdIXug"]],
  [["No video: see a clinician for persistent pain", "", 0, "none"]],
];
const LONGERV = [["Bowliards", "52pEyFjgRGM"], ["Golf pool", "vCFV9I5DNvE"], ["Equal Offense", "VMHvv7toICw"], ["9-ball ghost", "ooWkBTztEHw"], ["One-pocket ghost", "ffUmof-KLl4"], ["Killer", "a7Zmh6KhMYw"]];
