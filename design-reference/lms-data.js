// Amplified Impact LMS — mock backend for the prototype: seed data, status model, time zones, icons, helpers.
export const DB_KEY = 'amplified-impact-lms-db';
export const DB_V = 3;
export const DEMO_NOW = Date.parse('2026-12-07T10:42:00-06:00');
const TZ = 'America/Chicago';
const T = s => Date.parse(s.length <= 16 ? s + ':00-06:00' : s);

// Amplified icon language: 24 grid, 1.8 stroke, round caps and joins. Containers use soft corners and stay
// open at the upper right, where a single spark dot sits. Glyph strokes are straight and geometric.
const f2 = n => +(+n).toFixed(2);
const DOT = (x, y) => 'M' + f2(x) + ' ' + f2(y) + 'h.01';
const ARC = (cx, cy, r, a0, a1) => { const p = d => [f2(cx + r * Math.cos(d * Math.PI / 180)), f2(cy + r * Math.sin(d * Math.PI / 180))]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return 'M' + x0 + ' ' + y0 + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + x1 + ' ' + y1; };
const OCS = (cx, cy, r, g = 56) => ARC(cx, cy, r, -45 + g / 2, 315 - g / 2) + ' ' + DOT(cx + r * Math.SQRT1_2, cy - r * Math.SQRT1_2);
const OBS = (x, y, w, h, r = 4.5, g = 3) => 'M' + f2(x + w - r - g) + ' ' + f2(y) + 'H' + f2(x + r) + 'A' + r + ' ' + r + ' 0 0 0 ' + f2(x) + ' ' + f2(y + r) + 'V' + f2(y + h - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + f2(x + r) + ' ' + f2(y + h) + 'H' + f2(x + w - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + f2(x + w) + ' ' + f2(y + h - r) + 'V' + f2(y + r + g) + ' ' + DOT(x + w - 0.293 * r, y + 0.293 * r);
const RB = (x, y, w, h, r) => 'M' + f2(x + r) + ' ' + f2(y) + 'H' + f2(x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f2(x + w) + ' ' + f2(y + r) + 'V' + f2(y + h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f2(x + w - r) + ' ' + f2(y + h) + 'H' + f2(x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f2(x) + ' ' + f2(y + h - r) + 'V' + f2(y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f2(x + r) + ' ' + f2(y) + 'Z';
const CI = (cx, cy, r) => 'M' + f2(cx - r) + ' ' + f2(cy) + 'a' + r + ' ' + r + ' 0 1 0 ' + f2(2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + f2(-2 * r) + ' 0';
const J = (...p) => p.join(' ');
const TRAY = 'M4 14.5v2a3.5 3.5 0 0 0 3.5 3.5h9a3.5 3.5 0 0 0 3.5-3.5v-2';
const DOC = 'M13.5 3.5H8A3.5 3.5 0 0 0 4.5 7v10A3.5 3.5 0 0 0 8 20.5h8a3.5 3.5 0 0 0 3.5-3.5V9.5 M13.5 3.5V7A2.5 2.5 0 0 0 16 9.5h3.5';
const CAL = J(OBS(3.5, 4.5, 17, 16, 4.5, 3), 'M8 3v3.2', 'M13 3v3.2', 'M3.5 9.8H16');
export const ICONS = {
  grid: J(RB(3.5, 3.5, 7, 7, 2.5), RB(3.5, 13.5, 7, 7, 2.5), RB(13.5, 13.5, 7, 7, 2.5), OCS(17, 7, 3.4, 80)),
  radio: J(CI(5.5, 12, 1.6), ARC(5.5, 12, 5, -42, 42), ARC(5.5, 12, 9.5, -42, 42), ARC(5.5, 12, 14, -40, 40)),
  bot: J(RB(4, 8, 16, 12, 5), 'M9.5 13v1.6', 'M14.5 13v1.6', 'M12 8V5.4', DOT(12, 3.2)),
  users: J(CI(9, 8, 3.5), 'M2.8 20a6.2 6.2 0 0 1 12.4 0', CI(17.2, 8.6, 2.6), 'M17 14.4a4.9 4.9 0 0 1 4.3 5.6'),
  archive: J(OBS(3.5, 3.5, 17, 17, 4.5, 3), CI(11, 12, 3.2), 'M14.2 12H17'),
  megaphone: J('M3.5 10.2v3.6a1.7 1.7 0 0 0 1.7 1.7h2.3l7 4V4.5l-7 4H5.2a1.7 1.7 0 0 0-1.7 1.7z', 'M8 15.5l1.2 4.2', ARC(14.5, 12, 3.8, -45, 45), ARC(14.5, 12, 6.6, -35, 35)),
  zap: 'M13.6 3.2 5.4 13.4a.6.6 0 0 0 .5 1H11l-1 6.4a.3.3 0 0 0 .5.2l8.2-10.2a.6.6 0 0 0-.5-1H13l1.1-6.4a.3.3 0 0 0-.5-.2z',
  database: J('M4.5 6a7.5 2.8 0 1 0 15 0a7.5 2.8 0 1 0-15 0', 'M4.5 6v12c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8V6', 'M4.5 12c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8'),
  mic: J(RB(9, 2.8, 6, 11.5, 3), 'M5.5 11a6.5 6.5 0 0 0 13 0', 'M12 17.5v3.2', 'M9 20.7h6'),
  dollar: J(OCS(12, 12, 8.8, 50), 'M14.6 9.3c-.4-1-1.4-1.6-2.6-1.6-1.5 0-2.7.8-2.7 2.05s1.2 1.75 2.7 2.05 2.7.85 2.7 2.15c0 1.2-1.2 2.05-2.7 2.05-1.25 0-2.3-.65-2.7-1.6', 'M12 6.2v1.5', 'M12 16v1.6'),
  workflow: J(RB(3.5, 3.5, 7, 7, 2.5), OBS(13.5, 13.5, 7, 7, 2.5, 1.5), 'M7 10.5V13a3.5 3.5 0 0 0 3.5 3.5h3'),
  home: J('M4 10.8 12 4l8 6.8', 'M6 9.2V18a2.5 2.5 0 0 0 2.5 2.5h7A2.5 2.5 0 0 0 18 18V9.2', 'M10 20.5v-5a2 2 0 0 1 4 0v5'),
  chart: J('M5 20v-5.5', 'M10 20V9.5', 'M15 20v-7', 'M20 20V7.5', DOT(20, 3.8)),
  layers: J(OBS(7.5, 3.5, 13, 10.5, 3.5, 2), 'M4 8v8.5A3.5 3.5 0 0 0 7.5 20h9'),
  pencil: J('M15.2 4.6a2.1 2.1 0 0 1 3 0l1.2 1.2a2.1 2.1 0 0 1 0 3L9 19.2l-4.5 1.3 1.3-4.5z', 'M13.5 6.3l4.2 4.2'),
  calendar: J(CAL, DOT(8.5, 14.5), DOT(12.5, 14.5)),
  calPlus: J(CAL, 'M12 12.8v5', 'M9.5 15.3h5'),
  card: J(OBS(3, 5.5, 18, 13, 3.5, 2.5), 'M3 10h14.5', 'M7 14.5h3.5'),
  shield: J('M15.1 4.9 12 3.6 5.5 6.4v5.2c0 4.4 2.9 7.6 6.5 9.2 3.6-1.6 6.5-4.8 6.5-9.2V8.6', DOT(17.3, 6.2), 'm9.2 12.2 2 2 3.6-3.8'),
  bell: J('M6 16.5V11a6 6 0 0 1 9.4-4.95', 'M18 10.4v6.1', 'M4.5 16.5h15', 'M10.3 20h3.4', DOT(18.2, 5.7)),
  search: J(OCS(10.5, 10.5, 6.8, 60), 'M15.6 15.6 20 20'),
  check: 'M5 12.6l4.4 4.4L19 7.4',
  x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  plus: 'M12 5v14M5 12h14',
  chevR: 'M9.5 6l6 6-6 6', chevL: 'M14.5 6l-6 6 6 6', chevD: 'M6 9.5l6 6 6-6', chevU: 'M6 14.5l6-6 6 6',
  chevUD: 'M7.5 9.5 12 5l4.5 4.5M7.5 14.5 12 19l4.5-4.5',
  arrowR: 'M4.5 12h14.5M13.5 6.5 19 12l-5.5 5.5',
  arrowUR: 'M8 6.5h9.5V16M17.5 6.5 6.5 17.5',
  copy: J(OBS(8.5, 8.5, 12, 12, 3.5, 2), 'M15.5 5.2A2.2 2.2 0 0 0 13.3 3H7A3.5 3.5 0 0 0 3.5 6.5v6.3A2.2 2.2 0 0 0 5.7 15'),
  download: J(TRAY, 'M12 3.5v11', 'M7.8 10.3 12 14.5l4.2-4.2'),
  upload: J(TRAY, 'M12 14.5v-11', 'M7.8 7.7 12 3.5l4.2 4.2'),
  lock: J(RB(4.5, 10.5, 15, 10, 3.5), 'M8 10.5V7.8a4 4 0 0 1 8 0v2.7', 'M12 14.6v2'),
  play: 'M8 5.3v13.4a1 1 0 0 0 1.5.86l10.9-6.7a1 1 0 0 0 0-1.72L9.5 4.44A1 1 0 0 0 8 5.3z',
  pause: J(RB(6.5, 5, 4, 14, 1.6), RB(13.5, 5, 4, 14, 1.6)),
  clock: J(OCS(12, 12, 8.8, 50), 'M12 7.5V12l3 2'),
  ext: J('M18 13.5v3a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 4 16.5v-7A3.5 3.5 0 0 1 7.5 6h3', 'M14.5 3.5h6v6', 'M20.5 3.5 12 12'),
  file: J(DOC, 'M8.5 13h7', 'M8.5 16.5H13'),
  fileCode: J(DOC, 'M10 12.5 8 14.75 10 17', 'M14 12.5l2 2.25-2 2.25'),
  grip: J(CI(9, 6, 1), CI(15, 6, 1), CI(9, 12, 1), CI(15, 12, 1), CI(9, 18, 1), CI(15, 18, 1)),
  eye: J('M2.5 12c2.3-4.1 5.6-6.5 9.5-6.5s7.2 2.4 9.5 6.5c-2.3 4.1-5.6 6.5-9.5 6.5S4.8 16.1 2.5 12z', CI(12, 12, 2.8)),
  send: J('M20.5 3.5 10.2 13.8', 'M20.5 3.5l-6.3 17-4-6.7-6.7-4z', DOT(3.8, 20.2), DOT(6.6, 17.4)),
  chat: J(OBS(3.5, 4, 17, 13, 5, 2.5), 'M8.5 17v3.5l4.4-3.5'),
  headset: J('M4.5 15.5V12a7.5 7.5 0 0 1 15 0v3.5', RB(3.5, 13.5, 3.5, 6, 1.75), RB(17, 13.5, 3.5, 6, 1.75), 'M18.8 19.5v.3a1.7 1.7 0 0 1-1.7 1.7H14'),
  rocket: J('M12 2.8c2.9 2.2 4.4 5.2 4.4 8.6v4.1H7.6v-4.1C7.6 8 9.1 5 12 2.8z', CI(12, 9.8, 1.7), 'M7.6 12.6 5 15.3V18h2.6', 'M16.4 12.6 19 15.3V18h-2.6', 'M10.6 18.8 12 21l1.4-2.2'),
  panel: J(OBS(3.5, 4, 17, 16, 4, 2.5), 'M9.5 4v16'),
  more: J(CI(5.5, 12, 1.1), CI(12, 12, 1.1), CI(18.5, 12, 1.1)),
  reset: J('M4.5 12A7.5 7.5 0 1 0 6.8 6.6', 'M4.5 3.8v4.5H9'),
  mail: J(OBS(3, 5, 18, 14, 4, 2.5), 'M3.6 7.6 12 13.4l5.2-3.6'),
  checkCircle: J(OCS(12, 12, 8.8, 50), 'M8.4 12.3l2.5 2.5 4.7-5'),
  trash: J('M4.5 6.5h15', 'M9.5 6.5V5A1.5 1.5 0 0 1 11 3.5h2A1.5 1.5 0 0 1 14.5 5v1.5', 'M6.5 6.5l.85 11.1a3 3 0 0 0 3 2.9h3.3a3 3 0 0 0 3-2.9l.85-11.1', 'M10.3 10.5v6', 'M13.7 10.5v6'),
  userPlus: J(CI(9, 8, 3.5), 'M2.8 20a6.2 6.2 0 0 1 12.4 0', 'M18.5 8.5v6', 'M15.5 11.5h6'),
  book: J('M12 6.5C10.4 5.1 8.2 4.5 4 4.5v13c4.2 0 6.4.6 8 2', 'M12 6.5c1.6-1.4 3.8-2 8-2v13c-4.2 0-6.4.6-8 2', 'M12 6.5v13'),
  link: J('M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'),
  listChecks: J('m3.5 7 1.8 1.8 3.2-3.3', 'm3.5 16 1.8 1.8 3.2-3.3', 'M12.5 7h8', 'M12.5 12h8', 'M12.5 17h8'),
  code: J('M8.5 7 3.5 12l5 5', 'M15.5 7l5 5-5 5'),
  trend: J('M3.5 17 9 11.5l4 4 7.5-7.5', 'M15.5 8h5v5'),
  alert: J('M10.4 4.4 2.9 17.6A1.9 1.9 0 0 0 4.5 20.5h15a1.9 1.9 0 0 0 1.6-2.9L13.6 4.4a1.85 1.85 0 0 0-3.2 0z', 'M12 9.5v4', DOT(12, 16.9)),
  info: J(OCS(12, 12, 8.8, 50), 'M12 11v5', DOT(12, 7.9)),
  video: J(OBS(2.5, 6, 13.5, 12, 3.5, 2), 'M16 10.5l4.6-3a.6.6 0 0 1 .9.5v8a.6.6 0 0 1-.9.5L16 13.5'),
  cc: J(OBS(3, 5, 18, 14, 4, 2.5), 'M10.4 10.3a2.2 2.2 0 1 0 0 3.4', 'M16.4 10.3a2.2 2.2 0 1 0 0 3.4'),
  maximize: J('M4 9V6.5A2.5 2.5 0 0 1 6.5 4H9', 'M15 4h2.5A2.5 2.5 0 0 1 20 6.5V9', 'M20 15v2.5a2.5 2.5 0 0 1-2.5 2.5H15', 'M9 20H6.5A2.5 2.5 0 0 1 4 17.5V15'),
  volume: J('M4 9.5v5h3.5l5 4v-13l-5 4z', ARC(12.5, 12, 4, -45, 45), ARC(12.5, 12, 7.3, -40, 40)),
  inbox: J('M3.5 13h4.8l1.4 2.5h4.6l1.4-2.5h4.8', 'M5.8 6.2 3.5 13v4a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-4l-2.3-6.8A3 3 0 0 0 15.4 4H8.6a3 3 0 0 0-2.8 2.2z'),
  tag: J('M3.5 4.5v6.3c0 .5.2 1 .6 1.4l8.3 8.3a2 2 0 0 0 2.8 0l5.4-5.4a2 2 0 0 0 0-2.8l-8.3-8.3a2 2 0 0 0-1.4-.6H4.5a1 1 0 0 0-1 1z', DOT(7.5, 8.5)),
  target: J(OCS(12, 12, 8.8, 50), CI(12, 12, 4.8), DOT(12, 12)),
  briefcase: J(OBS(3, 7, 18, 13, 3.5, 2.5), 'M9 7V5.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V7', 'M3 12.5h14'),
  filter: 'M3.5 4.5h17l-6.5 8v6l-4 2v-8z',
  ring: CI(12, 12, 5),
  dot: CI(12, 12, 2.5),
  window: J(OBS(3, 3.5, 18, 17, 4, 2.5), 'M3 9h15'),
  sun: J(CI(12, 12, 4), 'M12 2.5v2', 'M12 19.5v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2.5 12h2', 'M19.5 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'),
  moon: 'M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z',
  menu: 'M4 7h16M4 12h16M4 17h10',
  globe: J(OCS(12, 12, 8.8, 50), 'M3.3 12h17.4', 'M12 3.2c2.3 2.4 3.4 5.3 3.4 8.8s-1.1 6.4-3.4 8.8c-2.3-2.4-3.4-5.3-3.4-8.8S9.7 5.6 12 3.2z'),
  logout: J('M10 20.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5h3', 'M15.5 16.5 20 12l-4.5-4.5', 'M20 12H9.5'),
  lines: 'M4 6.5h16M4 12h12M4 17.5h14',
  spinner: ARC(12, 12, 8.5, 0, 290),
  pauseCircle: J(OCS(12, 12, 8.8, 50), 'M10 9.5v5', 'M14 9.5v5'),
};
export const PROGRAM_TZ = TZ;
export const STEPS = 6;
export const MODULE_ICONS = ['megaphone', 'zap', 'database', 'mic', 'dollar', 'workflow', 'home', 'users', 'target', 'briefcase', 'chat', 'trend'];
export const CATEGORIES = ['MLS & Fair Housing Compliance', 'Lead Generation Scripts', 'Sisu & CRM Webhook Guides', 'TC Automation Workflows'];
export const EXEC_CATEGORIES = ['Organizational SOPs', 'Leadership Meeting Frameworks', 'Finance Tracker Integrations'];
export const TYPES = ['Claude Project', 'Workflow JSON', 'Prompt pack', 'PDF guide', 'Notion template'];
export const STAFF_ROLES = ['Owner', 'Admin', 'Instructor', 'Content Editor', 'Support'];
export const PERMS = [
  ['curriculum', 'Edit curriculum'], ['publish', 'Publish modules'], ['cohorts', 'Manage cohorts & sessions'], ['viewLearners', 'View learners'],
  ['seats', 'Manage learners & seats'], ['announce', 'Send announcements'], ['billing', 'Manage pricing & upgrades'], ['staff', 'Manage staff'],
];
export const PHASES = [
  { id: 'week0', label: 'Week 0', now: T('2026-11-27T10:42') },
  { id: 'live', label: 'Week 2', now: T('2026-12-07T10:42') },
  { id: 'post', label: 'After Cohort', now: T('2027-01-12T10:42') },
];
export const phaseNow = id => (PHASES.find(p => p.id === id) || PHASES[1]).now;

// ---------- Preferences (theme, time zone, demo timeline) ----------
export const PREFS_KEY = 'ai-lms-prefs';
export function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { return {}; } }
export function applyPrefs(p) {
  const d = document.documentElement;
  d.dataset.theme = p.theme === 'dark' ? 'dark' : 'light';
  if (p.accent && p.accent !== 'pine') d.dataset.accent = p.accent; else delete d.dataset.accent;
  if (p.font && p.font !== 'hanken') d.dataset.font = p.font; else delete d.dataset.font;
  setViewerZone(p.tz || null);
}
export function savePrefs(patch) { const p = { ...loadPrefs(), ...patch }; try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) {} applyPrefs(p); return p; }
export const dbKey = phase => DB_KEY + (phase && phase !== 'live' ? ':' + phase : '');
export function loadDb(phase) { let db = null; try { db = JSON.parse(localStorage.getItem(dbKey(phase)) || 'null'); } catch (e) {} if (!db || db.v !== DB_V) db = seed(phase); return db; }
export function saveDb(phase, db) { try { localStorage.setItem(dbKey(phase), JSON.stringify(db)); } catch (e) {} }

// ---------- Time: viewer zone first, program zone (CT) in parentheses ----------
let VIEW_TZ = null;
export function setViewerZone(z) { VIEW_TZ = z || null; }
export const autoZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || TZ; } catch (e) { return TZ; } };
export const viewerZone = () => VIEW_TZ || autoZone();
export const ZONES = [['', 'Auto'], ['America/New_York', 'Eastern'], ['America/Chicago', 'Central'], ['America/Denver', 'Mountain'], ['America/Phoenix', 'Arizona'], ['America/Los_Angeles', 'Pacific'], ['America/Anchorage', 'Alaska'], ['Pacific/Honolulu', 'Hawaii']];
const ABBR = { 'America/New_York': 'ET', 'America/Detroit': 'ET', 'America/Toronto': 'ET', 'America/Indiana/Indianapolis': 'ET', 'America/Kentucky/Louisville': 'ET', 'America/Chicago': 'CT', 'America/Winnipeg': 'CT', 'America/Indiana/Knox': 'CT', 'America/Menominee': 'CT', 'America/Denver': 'MT', 'America/Edmonton': 'MT', 'America/Boise': 'MT', 'America/Phoenix': 'MST', 'America/Los_Angeles': 'PT', 'America/Vancouver': 'PT', 'America/Anchorage': 'AKT', 'Pacific/Honolulu': 'HT' };
export function zoneAbbr(z, t) {
  if (ABBR[z]) return ABBR[z];
  try { return new Intl.DateTimeFormat('en-US', { timeZone: z, timeZoneName: 'short' }).formatToParts(new Date(t || Date.now())).find(p => p.type === 'timeZoneName').value; } catch (e) { return ''; }
}
export const zoneLabel = z => { const f = z && ZONES.find(x => x[0] === z); return f ? f[1] : (z || '').split('/').pop().replace(/_/g, ' '); };
const tOf = (t, z) => new Date(t).toLocaleTimeString('en-US', { timeZone: z, hour: 'numeric', minute: '2-digit' });
const dOf = (t, z, o) => new Date(t).toLocaleDateString('en-US', { timeZone: z, ...o });
const sameClock = (t, a, b) => tOf(t, a) === tOf(t, b) && dOf(t, a, { day: 'numeric' }) === dOf(t, b, { day: 'numeric' });
export const fmt = {
  date: t => dOf(t, viewerZone(), { month: 'short', day: 'numeric' }),
  day: t => dOf(t, viewerZone(), { weekday: 'short', month: 'short', day: 'numeric' }),
  dayPlain: t => dOf(t, viewerZone(), { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ''),
  weekday: t => dOf(t, viewerZone(), { weekday: 'long' }),
  time: t => {
    const v = viewerZone(), prog = `${tOf(t, TZ)} ${zoneAbbr(TZ, t)}`;
    return sameClock(t, v, TZ) ? prog : `${tOf(t, v)} ${zoneAbbr(v, t)} (${prog})`;
  },
  timeOnly: t => `${tOf(t, viewerZone())} ${zoneAbbr(viewerZone(), t)}`,
  when: t => `${fmt.day(t)} · ${fmt.time(t)}`,
  abs: t => `${dOf(t, viewerZone(), { month: 'short', day: 'numeric', year: 'numeric' })}, ${fmt.time(t)}`,
  clock: s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); },
  money: n => '$' + Math.round(n).toLocaleString('en-US'),
  num: n => Math.round(n).toLocaleString('en-US'),
  pct: n => Math.round(n * 100) + '%',
  ago: (t, now) => {
    const d = (now - t) / 60000;
    if (d < 0) return fmt.until(t, now);
    if (d < 1) return 'Just now';
    if (d < 60) return `${Math.floor(d)} min ago`;
    if (d < 1440) { const h = Math.floor(d / 60); return `${h} hour${h === 1 ? '' : 's'} ago`; }
    const days = Math.floor(d / 1440);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 28) { const w = Math.floor(days / 7); return `${w} week${w === 1 ? '' : 's'} ago`; }
    return fmt.date(t);
  },
  agoInline: (t, now) => { const s = fmt.ago(t, now); return /^[A-Z][a-z]{2} \d/.test(s) ? 'on ' + s : s.charAt(0).toLowerCase() + s.slice(1); },
  until: (t, now) => {
    const d = (t - now) / 60000;
    if (d < 60) return `in ${Math.max(1, Math.round(d))} min`;
    if (d < 1440) { const h = Math.round(d / 60); return `in ${h} hour${h === 1 ? '' : 's'}`; }
    const days = Math.round(d / 1440); return days === 1 ? 'tomorrow' : `in ${days} days`;
  },
  initials: n => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(),
  isoDate: t => new Date(t - 6 * 3600e3).toISOString().slice(0, 10),
  isoTime: t => new Date(t - 6 * 3600e3).toISOString().slice(11, 16),
  fromCT: (date, time) => Date.parse(`${date}T${time || '13:00'}:00-06:00`),
};

// ---------- Semantic tones (CSS custom properties defined in each page's helmet) ----------
const tone = k => ({ fg: `var(--${k}-text)`, bg: `var(--${k}-bg)`, bd: `var(--${k}-line)`, dot: `var(--${k})` });
export const TONES = {
  success: tone('status-success'), progress: tone('status-progress'), neutral: tone('status-neutral'),
  attention: tone('status-attention'), locked: tone('access-locked'),
  accent: { fg: 'var(--text-link)', bg: 'var(--action-primary-tint)', bd: 'var(--action-primary-line)', dot: 'var(--action-primary)' },
};
export const STATUS = {
  deployed: { label: 'Deployed', ...TONES.success }, progress: { label: 'In Progress', ...TONES.progress }, none: { label: 'Not Started', ...TONES.neutral },
  locked: { label: 'Team Tier', ...TONES.locked }, soon: { label: 'Opens Soon', ...TONES.neutral }, invited: { label: 'Invited', ...TONES.locked },
};
const AV = [192, 258, 330, 60, 145, 25, 290].map(h => `oklch(0.78 0.08 ${h})`);
export const avatarColor = id => AV[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];

// ---------- Status model: access · build · runtime ----------
export const progressOf = (u, m) => (u && u.progress && u.progress[m.id]) || { steps: [], builtAt: null, deployedAt: null, runtime: null };
export const buildOf = (u, m) => {
  const total = (m.checklist || []).length || STEPS, p = progressOf(u, m), n = Math.min(total, p.steps.length);
  return { state: n >= total ? 'verified' : n ? 'in_progress' : 'not_started', n, total };
};
export const runtimeOf = (u, m) => { const p = progressOf(u, m); return p.deployedAt ? (p.runtime || 'deployed') : 'not_deployed'; };
export const statusOf = (u, m) => { const p = progressOf(u, m); return p.deployedAt ? 'deployed' : p.steps.length ? 'progress' : 'none'; };
export const canAccess = (u, m) => m.tier === 'agent' || (!!u && u.tier === 'team');
export const isOpen = (m, now) => m.status === 'published' || (m.status === 'scheduled' && !!m.opens && now >= m.opens);
export const sortedModules = db => db.modules.slice().sort((a, b) => a.order - b.order);
export const visibleModules = db => sortedModules(db).filter(m => m.status !== 'draft');
export const sessionFor = (db, cohortId, n) => db.sessions.find(s => s.cohortId === cohortId && s.n === n) || null;
export const moduleForSession = (db, s) => db.modules.find(m => m.session === s.n && m.status !== 'draft') || null;
export const sessionEnd = s => s.start + s.mins * 60000;
export const sessionState = (s, now, forceLive) => {
  if (!s) return 'none';
  if (s.live || forceLive) return 'live';
  if (now < s.start) return 'upcoming';
  if (now < sessionEnd(s)) return 'live';
  return s.replay === 'ready' ? 'replay' : 'processing';
};
export const accessibleSessions = (db, u) => {
  const cid = (u && u.cohortId) || 'dec26';
  return db.sessions.filter(s => s.cohortId === cid).filter(s => { const m = moduleForSession(db, s); return !m || canAccess(u, m); }).sort((a, b) => a.start - b.start);
};
export const nextSession = (db, u, now) => accessibleSessions(db, u).find(s => s.live || sessionEnd(s) > now) || null;
export const joinMode = (s, now) => {
  if (!s) return 'disabled';
  const st = sessionState(s, now);
  if (st === 'live') return 'live';
  if (st === 'upcoming' && s.start - now <= 15 * 60000) return 'ready';
  return 'disabled';
};
export const cohortWeek = (co, now) => {
  const d = new Date(co.start - 6 * 3600e3), dow = (d.getUTCDay() + 6) % 7;
  const monday = co.start - dow * 86400e3 - ((co.start - 6 * 3600e3) % 86400e3);
  return Math.floor((now - monday) / (7 * 86400e3)) + 1;
};
export const cohortLine = (co, now) => {
  const w = cohortWeek(co, now), weeks = co.weeks || 6;
  if (w < 1) return `${co.name} Cohort · Starts ${fmt.date(co.start)}`;
  if (w > weeks) return `${co.name} Cohort · Completed`;
  return `${co.name} Cohort · Week ${w} of ${weeks}`;
};

// Next Live Session card: one of five variants
export const VARIANTS = [
  ['scheduled', 'Scheduled'], ['starting_soon', 'Starting Soon'], ['live', 'Live'], ['ended_processing', 'Ended · Processing'], ['replay_ready', 'Replay Ready'],
];
export function cardSession(db, u, now) {
  const list = accessibleSessions(db, u);
  const next = list.find(s => s.live || sessionEnd(s) > now);
  if (next) {
    if (sessionState(next, now) === 'live') return { s: next, variant: 'live' };
    if (next.start - now <= 15 * 60000) return { s: next, variant: 'starting_soon' };
  }
  const recent = list.filter(s => !s.live && sessionEnd(s) <= now && now - sessionEnd(s) < 12 * 3600e3).pop();
  if (recent) return { s: recent, variant: recent.replay === 'ready' ? 'replay_ready' : 'ended_processing' };
  return next ? { s: next, variant: 'scheduled' } : { s: null, variant: 'none' };
}
export function variantNow(s, variant, tick) {
  const end = sessionEnd(s);
  if (variant === 'scheduled') return s.start - (2 * 86400e3 + 2 * 3600e3 + 18 * 60e3) + tick;
  if (variant === 'starting_soon') return s.start - (11 * 60e3 + 40e3) + tick;
  if (variant === 'live') return s.start + 23 * 60e3 + 14e3 + tick;
  if (variant === 'ended_processing') return end + 22 * 60e3 + tick;
  return end + 2 * 3600e3 + tick;
}
export function sessionVM(db, s, variant, now) {
  const m = moduleForSession(db, s), rem = Math.max(0, s.start - now), el = Math.max(0, now - s.start);
  const d = Math.floor(rem / 86400e3), h = Math.floor((rem % 86400e3) / 3600e3), mi = Math.floor((rem % 3600e3) / 60e3), se = Math.floor((rem % 60e3) / 1000);
  const units = [];
  if (d) units.push({ v: String(d).padStart(2, '0'), l: d === 1 ? 'Day' : 'Days' });
  if (d || h) units.push({ v: String(h).padStart(2, '0'), l: h === 1 ? 'Hour' : 'Hours' });
  units.push({ v: String(mi).padStart(2, '0'), l: 'Min' });
  if (rem <= 3600e3) units.push({ v: String(se).padStart(2, '0'), l: 'Sec' });
  const aria = rem > 3600e3 ? `Starts in ${d ? d + (d === 1 ? ' day ' : ' days ') : ''}${h} hour${h === 1 ? '' : 's'}`
    : rem > 600e3 ? `Starts within ${Math.ceil(rem / 600e3) * 10} minutes`
    : rem > 60e3 ? `Starts within ${Math.ceil(rem / 60e3)} minutes` : 'Starts within 1 minute';
  const base = { variant, n: s.n, title: s.title, module: m ? m.name : 'Live session', moduleId: m ? m.id : null, when: fmt.when(s.start), mins: s.mins, instructor: (m && m.instructor) || 'Jordan Hale', zoom: s.zoom, sessionId: s.id };
  const V = {
    scheduled: { kicker: 'Next Live Session', countdown: units, aria, primary: 'calendar', join: 'disabled', hint: 'Opens 15 Min Before' },
    starting_soon: { kicker: 'Starting Soon', countdown: units, aria, primary: 'join', join: 'ready', hint: '' },
    live: { kicker: 'Live Now', live: true, elapsed: fmt.clock(el / 1000), primary: 'join', join: 'live', hint: '' },
    ended_processing: { kicker: 'Session Ended', note: 'Replay processing · usually within 2 hours', primary: 'kit' },
    replay_ready: { kicker: 'Replay Ready', note: 'Chapters and a searchable transcript are up.', primary: 'watch' },
  };
  return { ...base, ...(V[variant] || V.scheduled) };
}

// Employee card view-model (dashboard, States sheet, builder preview)
export function cardVM(db, u, m, now) {
  const locked = !canAccess(u, m), soon = !locked && !isOpen(m, now);
  const b = buildOf(u, m), sess = m.session ? sessionFor(db, (u && u.cohortId) || 'dec26', m.session) : null;
  const sst = sess ? sessionState(sess, now) : 'none';
  const sessLine = !sess ? 'Self-Paced' : `Session ${sess.n} · ` + (sst === 'replay' ? 'Replay Ready' : sst === 'live' ? 'Live Now' : sst === 'processing' ? 'Replay Processing' : fmt.date(sess.start));
  return {
    id: m.id, name: m.name, icon: ICONS[m.icon] || ICONS.bot, outcome: m.outcome || m.tagline || '', locked, soon,
    opensLabel: soon && m.opens ? 'Opens ' + fmt.date(m.opens) : soon ? 'Opens Soon' : '', sessLine, mins: m.build,
    state: b.state, n: b.n, total: b.total, segs: Array.from({ length: b.total }, (_, i) => i < b.n),
    cta: locked ? 'Preview' : soon ? 'View Details' : b.state === 'verified' ? 'Open' : b.state === 'in_progress' ? 'Continue Build' : 'Start Build',
    primary: !locked && !soon && b.state !== 'verified',
  };
}
export const nextIncluded = (db, u, fromId, now) => {
  const list = visibleModules(db).filter(m => canAccess(u, m) && isOpen(m, now));
  const all = visibleModules(db), i = all.findIndex(m => m.id === fromId);
  return all.slice(i + 1).find(m => list.includes(m)) || null;
};
export const log = (db, t, who, what, tone = 'info') => { db.activity.unshift({ id: 'ev' + t + Math.random().toString(36).slice(2, 6), t, who, what, tone }); db.activity = db.activity.slice(0, 40); };

export function skillPreview(f, m) {
  const slug = f.name.replace(/\.(skill\.)?(json|ya?ml)$/i, '');
  const steps = f.steps && f.steps.length ? f.steps : (m.outputs || []);
  if (f.type === 'YAML') return [`name: ${slug}`, 'version: 1.0.0', `employee: "${m.name}"`, 'trigger: manual', 'steps:', ...steps.map(s => `  - "${s}"`), 'checks:', '  - fair_housing_language', '  - no_contact_info_in_public_remarks', 'output: markdown'].join('\n');
  if (f.type === 'JSON') return JSON.stringify({ name: slug, version: '1.0.0', employee: m.name, trigger: 'manual', steps, checks: ['fair_housing_language'], output: 'markdown' }, null, 2);
  return `# ${f.name}\n\nNotion template · Duplicate into your workspace\n\n${steps.map(s => '- [ ] ' + s).join('\n')}`;
}
export function ics(events) {
  const f = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Amplified Impact//LMS//EN'];
  events.forEach(e => L.push('BEGIN:VEVENT', `UID:${e.id}@amplified-impact`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(e.start)}`, `DTEND:${f(e.end)}`, `SUMMARY:${e.title}`, `LOCATION:${e.url || ''}`, `DESCRIPTION:${e.desc || ''}`, 'END:VEVENT'));
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
export const sessionEvent = s => ({ id: s.id, title: `Amplified Impact · Session ${s.n}: ${s.title}`, start: s.start, end: sessionEnd(s), url: s.zoom });
export function upgradeUser(d, uid) {
  const u = d.users.find(x => x.id === uid); if (!u) return null;
  u.tier = 'team';
  if (!u.teamId) {
    const id = 't_' + uid;
    if (!d.teams.find(t => t.id === id)) d.teams.push({ id, name: u.name.split(' ').slice(-1)[0] + ' Team', ownerId: uid, seats: 7 });
    u.teamId = id; u.role = 'Team Owner';
  }
  return u;
}
export function downgradeUser(d, uid) { const u = d.users.find(x => x.id === uid); if (!u) return null; u.tier = 'agent'; u.role = 'Agent'; u.teamId = null; return u; }
export const csv = rows => rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

const S = (text, ch, mins, t, hint = '') => ({ text, ch, mins, t, hint });
const six = arr => arr.map((s, i) => ({ id: 'c' + (i + 1), ...s }));
export const blankModule = order => ({
  id: 'm' + Date.now().toString(36), name: 'New AI Employee', short: 'New', tier: 'agent', icon: 'home', forWho: 'all agents',
  headline: '', outcome: '', outputs: ['', '', ''], platform: 'Claude Project', runLabel: 'Run on an Example', build: 30, session: null, status: 'draft', opens: null, order, dur: 0, transcript: [],
  notes: '', instructor: 'Jordan Hale',
  prompt: '# Role\nYou are the ___ AI Employee for {{TEAM_NAME}}.\n\n# Inputs\n- \n\n# Outputs\n1. \n\n# Rules\n- Follow the Fair Housing Act in every output.\n',
  files: [], resources: [],
  checklist: six([S('Create the Claude Project', 'Create the Project', 3, 240), S('Paste the system prompt into Project Instructions', 'Add the System Prompt', 5, 600), S('Upload your source files', 'Load Your Files', 5, 1100), S('Add the skill files to the project knowledge', 'Add the Skills', 5, 1500), S('Run the test prompt', 'Run the Test', 6, 2200), S('Check the output against the rubric', 'Check the Output', 6, 2800)]),
});

// ---------- Seed ----------
const ids6 = n => Array.from({ length: n }, (_, i) => 'c' + (i + 1));
const built = (at, dep, extra = {}) => ({ steps: ids6(6), builtAt: T(at), deployedAt: dep ? T(dep) : null, runtime: dep ? 'deployed' : null, ...extra });
const wip = n => ({ steps: ids6(n), builtAt: null, deployedAt: null, runtime: null });
const SESSION_TITLES = ['The Autonomous Agent', 'Speed to Lead', 'The Living Database', 'The Meeting That Runs Itself', 'Numbers on Autopilot', 'Contract to Close'];
const mkSessions = (cid, ci, days) => days.map((d, i) => ({
  id: `${cid}-s${i + 1}`, cohortId: cid, n: i + 1, title: SESSION_TITLES[i], start: T(d + 'T13:00'), mins: 75,
  zoom: `https://zoom.us/j/${8841200610 + i * 1371 + ci * 97}`, live: false, attended: null, replay: null, views: 0,
}));
const res = (id, title, desc, cat, type, tier, size, dl, upd, exec = false) => ({ id, title, desc, cat, type, tier, size, dl, updated: T(upd), exec, status: 'published' });

function baseSeed() {
  const sessions = [
    ...mkSessions('dec26', 0, ['2026-12-01', '2026-12-03', '2026-12-09', '2026-12-10', '2026-12-15', '2026-12-17']),
    ...mkSessions('feb27', 1, ['2027-02-02', '2027-02-04', '2027-02-09', '2027-02-11', '2027-02-16', '2027-02-18']),
    ...mkSessions('apr27', 2, ['2027-04-06', '2027-04-08', '2027-04-13', '2027-04-15', '2027-04-20', '2027-04-22']),
  ];
  Object.assign(sessions[0], { attended: 121, replay: 'ready', views: 312 });
  Object.assign(sessions[1], { attended: 109, replay: 'ready', views: 188 });
  sessions[2].movedFrom = T('2026-12-08T13:00');

  const modules = [
    {
      id: 'marketing', name: 'Marketing AI Employee', short: 'Marketing', tier: 'agent', icon: 'megaphone',
      forWho: 'listing agents & marketing coordinators',
      headline: 'Launch every listing in minutes, compliant on every channel.',
      outcome: 'Paste an MLS listing → Fair-Housing-checked description, 5 social posts, 1 email.',
      outputs: ['Fair-Housing-checked MLS description', '5 social posts in your brand voice', '1 just-listed email'],
      platform: 'Claude Project', runLabel: 'Run on a Listing',
      build: 45, session: 1, status: 'published', opens: null, order: 1, dur: 3504, instructor: 'Jordan Hale',
      transcript: [
        [12, "Welcome in. Today we're hiring your first AI employee, and by the end of this session it will be working for you."],
        [95, 'An AI employee is three things: a job description, a set of skills, and a way to check its work.'],
        [300, 'Start by creating a Claude Project. Name it after the job, not the tool.'],
        [390, 'The system prompt is the job description. It tells Claude who it works for, what good looks like, and what it must never do.'],
        [512, 'Notice the compliance section sits at the top. Fair housing rules are not optional, so they come before style.'],
        [1120, 'Upload your last three listing descriptions so it learns your brand voice instead of sounding generic.'],
        [1402, 'The skill files teach it repeatable jobs: the launch packet and the compliance check.'],
        [1935, 'Now paste the test listing. The packet comes back as an MLS description, five social posts and one email.'],
        [2440, 'The compliance check flags steering language, like describing a neighborhood as perfect for young families.'],
        [2610, 'If it flags something, it explains which rule applies and suggests a compliant rewrite.'],
        [2990, "Your checklist is on the page. Don't mark the last step verified until the test listing passes the compliance check."],
        [3260, 'Question from the chat: can this post directly to Instagram? Not yet. That comes in the Operations module.'],
      ],
      notes: 'Run the compliance check on every public-facing output, including social captions. Keep your brand voice file under 2,000 words; longer files dilute the style signal. If your MLS has a character limit, add it to the Output rules section before you test.',
      prompt: `# Role
You are the Marketing AI Employee for {{TEAM_NAME}}, a real estate team in {{MARKET}}.
You produce listing marketing that is accurate, on-brand and compliant.

# Compliance (always first)
- Follow the Fair Housing Act. Describe the property and amenities, never people.
- Flag steering language (e.g. "perfect for young families", "safe neighborhood").
- Follow MLS rules: no contact info in public remarks; stay under {{MLS_CHAR_LIMIT}} characters.

# Inputs
- Listing details: address, price, beds/baths, square footage, features
- Brand voice file: three past listing descriptions
- Weekly market snapshot: inventory, days on market, price changes

# Outputs
1. MLS description that passes the compliance check
2. 5 social posts in the brand voice
3. 1 just-listed email

# Output rules
- Lead with the strongest feature. No exclamation marks.
- Run the compliance check before returning anything. List any flags first.`,
      files: [
        { name: 'listing-launch-packet.skill.json', type: 'JSON', size: '4 KB', desc: 'MLS copy, social posts and email from one listing', steps: ['Extract property facts', 'Draft MLS public remarks', 'Draft 5 social posts', 'Draft just-listed email', 'Run fair-housing-check'] },
        { name: 'fair-housing-check.skill.yaml', type: 'YAML', size: '2 KB', desc: 'Flags steering language and suggests rewrites', steps: ['Scan for protected-class references', 'Flag steering phrases', 'Cite the rule', 'Suggest a compliant rewrite'] },
        { name: 'Brand Voice Intake', type: 'Notion', size: 'Template', desc: 'Tone, phrases to use and phrases to avoid', steps: ['Paste 3 past listing descriptions', 'List 5 words that sound like you', 'List phrases you never use'] },
      ],
      resources: [{ name: 'Session 1 Slides', type: 'PDF', size: '4.2 MB' }, { name: 'Test Listing: 1418 Alder Ct', type: 'PDF', size: '180 KB' }, { name: 'Fair Housing Quick Reference', type: 'PDF', size: '320 KB' }],
      checklist: six([
        S('Create a Claude Project named “Marketing AI Employee”', 'Create the Project', 5, 300, 'Projects keep the prompt and skill files together.'),
        S('Paste the system prompt into Project Instructions', 'Add the System Prompt', 8, 390, 'Replace {{TEAM_NAME}}, {{MARKET}} and {{MLS_CHAR_LIMIT}} first.'),
        S('Upload your last 3 listing descriptions', 'Teach It Your Voice', 8, 1120, 'This becomes the brand voice file.'),
        S('Add both skill files to the project knowledge', 'Add the Skills', 6, 1402),
        S('Run the test prompt with the sample listing', 'Run the Test Listing', 10, 1935, 'Test listing: 1418 Alder Ct, in the build kit.'),
        S('Confirm the compliance check flags the test phrase', 'Check Compliance', 8, 2440, 'Expect a flag on “perfect for young families.”'),
      ]),
      runDemo: {
        input: '1418 Alder Ct · $649,000 · 4 bd · 3 ba · 2,380 sq ft\nUpdated kitchen with quartz counters, vaulted living room, fenced yard backing to the greenbelt. Walk to the Alder Creek trail. Perfect for young families.',
        sections: [
          ['Compliance check', '1 flag fixed. “Perfect for young families” describes people, not the property (Fair Housing Act, familial status). Rewritten as “Room to spread out, with a fenced yard.”'],
          ['MLS description', 'Vaulted ceilings and a quartz kitchen open onto a fenced yard that backs to the greenbelt. Four bedrooms and three baths across 2,380 sq ft, with room to spread out and a short walk to the Alder Creek trail.'],
          ['5 social posts', '1. Just listed: 1418 Alder Ct. Vaulted ceilings, quartz kitchen, greenbelt views.\n2. Morning coffee, trail access, nobody behind you. 1418 Alder Ct is live.\n3. 4 bd · 3 ba · 2,380 sq ft. Fenced yard on the greenbelt. Tour this weekend.\n4. The kitchen was redone top to bottom: quartz, new cabinetry, room for a crowd.\n5. Open house Saturday 11–2 at 1418 Alder Ct. Bring your questions.'],
          ['1 email', 'Subject: Just listed: 1418 Alder Ct\nA greenbelt lot, a renovated kitchen and room to spread out. Reply to book a private tour before Saturday’s open house.'],
        ],
      },
    },
    {
      id: 'sales', name: 'Sales AI Employee', short: 'Sales', tier: 'agent', icon: 'zap', forWho: 'buyer & listing agents',
      headline: 'Answer every new lead in under five minutes.',
      outcome: 'Paste a new lead → a first reply in your voice, 2 objection responses, a consult brief.',
      outputs: ['First reply drafted within 5 minutes', 'Two objection responses: empathetic and direct', 'One-page consultation brief'],
      platform: 'Claude Project + CRM webhook', runLabel: 'Run on a Lead',
      build: 30, session: 2, status: 'published', opens: null, order: 2, dur: 3390, instructor: 'Jordan Hale',
      transcript: [
        [18, 'The first agent to reply usually gets the conversation. Today we make five minutes your default.'],
        [430, 'The responder prompt has one job: a short, human first reply that asks a single question.'],
        [702, 'Match the channel. If they texted, you text. If they came through the portal, reply in the portal.'],
        [1130, 'Paste an objection and you get two replies back: one empathetic, one direct.'],
        [1865, "Consultation prep pulls the lead's activity into a one-page brief with three questions to ask."],
        [2630, 'The webhook is what makes this automatic. Your CRM sends the new lead and Claude drafts the reply.'],
      ],
      notes: 'Most CRMs can send a webhook when a lead is created; the setup guide for each platform is in the Resource Vault. Keep the first reply to one question. Longer first replies get fewer responses.',
      prompt: `# Role
You are the Sales AI Employee for {{AGENT_NAME}} at {{TEAM_NAME}}.
You respond to new leads fast and help the agent win the consultation.

# Speed to lead
- Draft a first response within 5 minutes of a new lead notification.
- Match the channel the lead used (text, email or portal message).
- Ask one qualifying question: timeline, financing or location.

# Objection handling
- When the agent pastes an objection, return 2 replies: one empathetic, one direct.
- Never promise pricing, timelines or outcomes.

# Consultation prep
- Summarize the lead's activity, likely needs and 3 questions to ask.

# Guardrails
- Fair housing applies to every message. Never reference protected classes.
- Hand off to the agent if the lead asks for legal or lending advice.`,
      files: [
        { name: 'speed-to-lead.skill.json', type: 'JSON', size: '3 KB', desc: 'First-reply drafts by channel, under 5 minutes', steps: ['Read lead source and channel', 'Draft first reply', 'Ask one qualifying question', 'Log reply time'] },
        { name: 'objection-library.skill.yaml', type: 'YAML', size: '6 KB', desc: '24 common objections with two reply styles', steps: ['Match objection type', 'Draft empathetic reply', 'Draft direct reply'] },
        { name: 'Buyer Consult Prep', type: 'Notion', size: 'Template', desc: 'One-page pre-call brief', steps: ['Lead summary', 'Likely needs', '3 questions to ask'] },
      ],
      resources: [{ name: 'Session 2 Slides', type: 'PDF', size: '3.8 MB' }, { name: 'Lead Webhook Payload Sample', type: 'JSON', size: '1 KB' }],
      checklist: six([
        S('Create the “Sales AI Employee” Claude Project', 'Create the Project', 3, 240),
        S('Paste the system prompt and set your name and team', 'Add the System Prompt', 5, 430),
        S('Upload your buyer consultation deck', 'Add Your Consult Deck', 4, 980),
        S('Add the objection library skill file', 'Objection Handling', 4, 1130),
        S('Connect the new-lead webhook from your CRM', 'Connect the Webhook', 8, 2630, 'Guide: CRM New-Lead Webhook Setup, in the Resource Vault.'),
        S('Send a test lead and get a reply in under 5 minutes', 'Test Speed to Lead', 6, 2900),
      ]),
      runDemo: {
        input: 'New lead · Zillow · Maya Reyes\n“Is 1418 Alder Ct still available? We’d want to see it this week.”',
        sections: [
          ['First reply', 'Hi Maya, it’s Alex with Northline. 1418 Alder Ct is available and I can show it Thursday or Saturday. Which works better?'],
          ['2 objection responses', 'If “We’re not ready to talk to an agent yet”:\nEmpathetic: Totally fair. I can send the disclosures and recent sales nearby so you can look on your own time.\nDirect: Happy to keep it light. A 15-minute tour is the fastest way to know if it’s worth a second look.'],
          ['Consult brief', 'Viewed 4 listings in Alder Creek this week, all 4 bd under $675k. Likely needs: a yard and trail access. Ask about timeline, pre-approval and must-haves.'],
        ],
      },
    },
    {
      id: 'database', name: 'Database AI Employee', short: 'Database', tier: 'agent', icon: 'database', forWho: 'agents with a sphere of 200+ contacts',
      headline: 'Keep your sphere warm without sounding automated.',
      outcome: 'Upload your contact export → 10 weekly check-ins, a 3-touch reactivation sequence, anniversary notes.',
      outputs: ['10 personal check-ins every week', '3-touch reactivation for quiet contacts', 'Home anniversary notes on schedule'],
      platform: 'Claude Project', runLabel: 'Run on Your Contacts',
      build: 40, session: 3, status: 'published', opens: null, order: 3, dur: 0, instructor: 'Jordan Hale', transcript: [],
      notes: 'Clean your export before the session: remove duplicates and contacts without a close date or last-touch date. The prompt ranks check-ins by time since last touch, so missing dates push contacts to the bottom.',
      prompt: `# Role
You are the Database AI Employee for {{AGENT_NAME}}.
You keep past clients and sphere contacts engaged without sounding automated.

# Inputs
- Contact export (CSV): name, address, close date, last touch, tags
- Personal notes the agent keeps for each contact

# Workflows
1. Reactivation: 3-touch sequence for contacts with no touch in 12+ months
2. Check-ins: 10 personal check-in messages per week, ranked by priority
3. Anniversaries: home anniversary note that offers a value update

# Rules
- Reference one specific detail from the notes in every message.
- Never mention a contact's home value unless they asked for it.
- Output a table: contact, channel, message, send date.`,
      files: [
        { name: 'reactivation-sequence.skill.json', type: 'JSON', size: '5 KB', desc: '3-touch sequence for contacts quiet 12+ months', steps: ['Filter contacts by last touch', 'Draft touch 1', 'Draft touch 2', 'Draft touch 3'] },
        { name: 'anniversary-workflow.skill.yaml', type: 'YAML', size: '3 KB', desc: 'Home anniversary notes scheduled by close date', steps: ['Find anniversaries in the next 30 days', 'Draft note', 'Schedule send date'] },
        { name: 'Sphere Segmentation SOP', type: 'Notion', size: 'Template', desc: 'Tagging rules for A, B and C contacts', steps: ['Define A/B/C criteria', 'Tag contacts', 'Set touch cadence'] },
      ],
      resources: [{ name: 'Session 3 Slides', type: 'PDF', size: 'Posted after the session' }],
      checklist: six([
        S('Export your contacts from your CRM as CSV', 'Export Your Contacts', 6, 240, 'Include close date and last-touch date.'),
        S('Create the “Database AI Employee” Claude Project', 'Create the Project', 3, 600),
        S('Paste the system prompt', 'Add the System Prompt', 5, 840),
        S('Upload your contact export and personal notes', 'Load Your Sphere', 8, 1500),
        S('Add the reactivation and anniversary skill files', 'Add the Skills', 6, 2100),
        S("Generate this week's 10 check-ins and send 2", 'Send your first check-ins', 12, 2700),
      ]),
    },
    {
      id: 'meetings', name: 'Meetings AI Employee', short: 'Meetings', tier: 'team', icon: 'mic', forWho: 'team leaders & ops leads',
      headline: 'Every leadership meeting ends with decisions, owners and next week’s agenda.',
      outcome: 'Paste a meeting transcript → decisions, owners and due dates, next week’s agenda.',
      outputs: ['Decisions, risks and open questions from any transcript', 'Action items with an owner and due date', 'Next week’s agenda, built from open items'],
      platform: 'Claude Project', runLabel: 'Run on a Transcript',
      build: 35, session: 4, status: 'published', opens: null, order: 4, dur: 0, instructor: 'Jordan Hale', transcript: [],
      notes: 'Bring one real leadership meeting transcript to the session. Recorded team meetings work too.',
      prompt: `# Role
You are the Meetings AI Employee for the leadership team at {{TEAM_NAME}}.

# Inputs
- Meeting transcript (any recorder's text export)
- Last week's scorecard and open action items

# Outputs
1. Atomized summary: decisions, open questions, risks
2. Action items: owner, due date, definition of done
3. Next week's agenda, built from open items and scorecard misses

# Rules
- Quote the transcript when recording a decision.
- If an action item has no owner, list it under "Needs an owner".`,
      files: [
        { name: 'transcript-atomizer.skill.json', type: 'JSON', size: '4 KB', desc: 'Decisions, risks and questions from any transcript', steps: ['Split transcript by topic', 'Extract decisions', 'Extract open questions', 'Extract risks'] },
        { name: 'leadership-agenda.skill.yaml', type: 'YAML', size: '2 KB', desc: 'Builds next week’s agenda from open items', steps: ['Pull open action items', 'Add scorecard misses', 'Time-box agenda'] },
        { name: 'Weekly Leadership Meeting', type: 'Notion', size: 'Template', desc: 'Agenda, scorecard and issues list', steps: ['Scorecard', 'Issues', 'Decisions', 'Action items'] },
      ],
      resources: [{ name: 'Session 4 Slides', type: 'PDF', size: 'Posted after the session' }],
      checklist: six([
        S('Create the “Meetings AI Employee” Claude Project', 'Create the Project', 3, 240),
        S('Paste the system prompt', 'Add the System Prompt', 5, 600),
        S('Add the transcript atomizer and agenda skill files', 'Add the Skills', 5, 1100),
        S("Upload last week's meeting transcript", 'Load a real meeting', 6, 1500),
        S('Review decisions and action items against your notes', 'Check the Summary', 8, 2200),
        S("Generate next week's agenda and share it with your team", 'Ship the agenda', 8, 2800),
      ]),
    },
    {
      id: 'finance', name: 'Finance AI Employee', short: 'Finance', tier: 'team', icon: 'dollar', forWho: 'team owners & finance leads',
      headline: 'Know your net commission and margin on every deal.',
      outcome: 'Upload a Sisu export → net commission by agent, categorized expenses, margin flags.',
      outputs: ['Gross and net commission by agent, month to date', 'Expenses mapped to your P&L categories', 'Flags on any deal under your margin threshold'],
      platform: 'Claude Project + Sisu export', runLabel: 'Run on a Sisu Export',
      build: 50, session: 5, status: 'published', opens: null, order: 5, dur: 0, instructor: 'Jordan Hale', transcript: [],
      notes: 'Export closed deals from Sisu for the last 90 days before the session. Have your P&L category list ready.',
      prompt: `# Role
You are the Finance AI Employee for {{TEAM_NAME}}.

# Inputs
- Sisu closed-deal export: agent, side, price, commission, splits
- Monthly expense export from your bookkeeping software

# Outputs
1. Commission tracker: gross and net commission by agent, month to date
2. Expense categorization mapped to your P&L categories
3. Deal margin report: flag any deal under {{MIN_MARGIN}}% net margin

# Rules
- Show your math for every total.
- Never change source numbers. Flag mismatches instead.`,
      files: [
        { name: 'sisu-commission-tracker.skill.json', type: 'JSON', size: '6 KB', desc: 'Gross and net commission by agent', steps: ['Load Sisu export', 'Apply splits', 'Summarize by agent'] },
        { name: 'pnl-categories.skill.yaml', type: 'YAML', size: '3 KB', desc: 'Maps expenses to your P&L categories', steps: ['Load expense export', 'Match categories', 'Flag unknowns'] },
        { name: 'Monthly Close Checklist', type: 'Notion', size: 'Template', desc: 'Month-end close for real estate teams', steps: ['Reconcile commissions', 'Categorize expenses', 'Review margins'] },
      ],
      resources: [{ name: 'Session 5 Slides', type: 'PDF', size: 'Posted after the session' }],
      checklist: six([
        S('Export closed deals from Sisu (last 90 days)', 'Export from Sisu', 6, 240),
        S('Create the “Finance AI Employee” Claude Project', 'Create the Project', 3, 600),
        S('Paste the system prompt and set your margin threshold', 'Add the System Prompt', 6, 900),
        S('Upload your P&L category list and expense export', 'Load Your Books', 10, 1500),
        S("Reconcile last month's commissions against Sisu", 'Reconcile commissions', 15, 2200),
        S('Review the deal margin report and flag 1 deal', 'Review Margins', 10, 2900),
      ]),
    },
    {
      id: 'operations', name: 'Operations AI Employee', short: 'Operations', tier: 'team', icon: 'workflow', forWho: 'ops leads & transaction coordinators',
      headline: 'Nothing slips between contract and close.',
      outcome: 'Upload an executed contract → a deadline timeline, milestone emails, a 30-day onboarding plan.',
      outputs: ['Contract-to-close timeline with every contingency', 'Milestone emails for lender, title and client', '30-day onboarding plan for new agents'],
      platform: 'Claude Project', runLabel: 'Run on a Contract',
      build: 45, session: 6, status: 'scheduled', opens: T('2026-12-14T09:00'), order: 6, dur: 0, instructor: 'Jordan Hale', transcript: [],
      notes: 'Bring one executed purchase contract with personal details redacted.',
      prompt: `# Role
You are the Operations AI Employee for {{TEAM_NAME}}.

# Inputs
- Executed purchase contract (PDF)
- Team transaction checklist and vendor list

# Outputs
1. Contract-to-close timeline with every contingency deadline
2. TC emails for each milestone: lender, title, inspector, client
3. New agent onboarding checklist for the first 30 days

# Rules
- Take dates only from the contract. If a date is missing, ask.
- Cite the contract section for every deadline.`,
      files: [
        { name: 'c2c-timeline.skill.json', type: 'JSON', size: '5 KB', desc: 'Deadline calendar from an executed contract', steps: ['Extract contract dates', 'Build contingency timeline', 'Cite sections'] },
        { name: 'tc-email-templates.skill.yaml', type: 'YAML', size: '4 KB', desc: 'Milestone emails for every party', steps: ['Lender update', 'Title order', 'Inspection scheduling', 'Client update'] },
        { name: 'Agent Onboarding (30 days)', type: 'Notion', size: 'Template', desc: 'First-month plan for new agents', steps: ['Week 1 setup', 'Week 2 shadowing', 'Week 3–4 first leads'] },
      ],
      resources: [{ name: 'Session 6 Slides', type: 'PDF', size: 'Posted after the session' }],
      checklist: six([
        S('Create the “Operations AI Employee” Claude Project', 'Create the Project', 3, 240),
        S('Paste the system prompt', 'Add the System Prompt', 5, 600),
        S('Upload your transaction checklist and vendor list', 'Load Your Checklist', 7, 1100),
        S('Add the timeline and TC email skill files', 'Add the Skills', 5, 1500),
        S('Generate a timeline from a recent contract', 'Build a Timeline', 15, 2200),
        S('Send the first TC milestone email from the draft', 'Send a Milestone Email', 10, 2800),
      ]),
    },
  ];

  const U = (id, name, email, tier, role, teamId, joined, last, progress, status = 'active') => ({ id, name, email, tier, role, teamId, cohortId: 'dec26', joined: T(joined), last: T(last), status, progress });
  const users = [
    U('u_jamie', 'Jamie Ortiz', 'jamie@ortizhomes.com', 'agent', 'Agent', null, '2026-11-18T09:00', '2026-12-07T09:58', {
      marketing: built('2026-12-02T15:05', '2026-12-02T15:20', { lastRun: { at: T('2026-12-05T16:10'), title: 'Listing Launch Packet · 1418 Alder Ct', preview: 'Vaulted ceilings and a quartz kitchen open onto a fenced yard that backs to the greenbelt. Four bedrooms and three baths across 2,380 sq ft…' } }),
      sales: wip(3),
    }),
    U('u_alex', 'Alex Morgan', 'alex@northlinerealty.com', 'team', 'Team Owner', 'northline', '2026-11-12T10:00', '2026-12-07T10:31', {
      marketing: built('2026-12-01T16:50', '2026-12-01T17:05', { lastRun: { at: T('2026-12-06T09:30'), title: 'Listing Launch Packet · 3307 Juniper Ln', preview: 'A corner lot with mature oaks, a chef’s kitchen and a primary suite on the main floor. Five bedrooms across 3,140 sq ft…' } }),
      sales: built('2026-12-04T11:20', '2026-12-04T11:40', { lastRun: { at: T('2026-12-07T08:12'), title: 'First Reply · Zillow Lead, Maya R.', preview: 'Hi Maya, it’s Alex with Northline. 1418 Alder Ct is available and I can show it Thursday or Saturday. Which works better?' } }),
      database: wip(2),
    }),
    U('u_priya', 'Priya Shah', 'priya@northlinerealty.com', 'team', 'Operations Lead', 'northline', '2026-11-13T10:00', '2026-12-07T08:12', { marketing: built('2026-12-02T10:00', '2026-12-02T10:15'), meetings: wip(2) }),
    U('u_sarah', 'Sarah Collins', 'sarah@northlinerealty.com', 'team', 'Sales Agent', 'northline', '2026-11-14T10:00', '2026-12-07T10:04', { marketing: built('2026-12-02T13:10', '2026-12-02T13:30'), database: built('2026-12-07T09:50', '2026-12-07T10:04'), sales: wip(2) }),
    U('u_michael', 'Michael Grant', 'michael@northlinerealty.com', 'team', 'Sales Agent', 'northline', '2026-11-14T10:00', '2026-12-05T16:20', { marketing: wip(4) }),
    U('u_devon', 'Devon Price', 'devon@northlinerealty.com', 'team', 'Sales Agent', 'northline', '2026-11-16T10:00', '2026-12-06T19:45', { marketing: built('2026-12-01T19:50', '2026-12-01T20:10'), sales: built('2026-12-06T19:30', '2026-12-06T19:45', { runtime: 'needs_attention', issue: 'CRM webhook stopped responding' }) }),
    U('u_lena', 'Lena Brooks', 'lena@northlinerealty.com', 'team', 'Sales Agent', 'northline', '2026-11-20T10:00', '2026-11-29T12:00', {}),
    U('u_rosa', 'Rosa Delgado', 'rosa@delgadorealty.com', 'agent', 'Agent', null, '2026-11-15T10:00', '2026-12-07T08:40', { marketing: built('2026-12-01T15:40', '2026-12-01T16:00'), sales: built('2026-12-03T17:40', '2026-12-03T18:00'), database: built('2026-12-07T08:20', '2026-12-07T08:40') }),
    U('u_kenji', 'Kenji Watanabe', 'kenji@watanaberealty.com', 'agent', 'Agent', null, '2026-11-21T10:00', '2026-12-06T16:12', { marketing: built('2026-12-03T09:00', '2026-12-03T09:20'), sales: wip(1) }),
    U('u_natasha', 'Natasha Reed', 'natasha@harborpine.com', 'team', 'Team Owner', 'harbor', '2026-11-10T10:00', '2026-12-07T07:55', { marketing: built('2026-12-01T15:10', '2026-12-01T15:30'), sales: built('2026-12-03T16:50', '2026-12-03T17:10'), database: built('2026-12-06T10:40', '2026-12-06T11:00'), meetings: built('2026-12-07T07:40', '2026-12-07T07:55', { runtime: 'paused' }) }),
    U('u_claire', 'Claire Dubois', 'claire@harborpine.com', 'team', 'Operations Lead', 'harbor', '2026-11-11T10:00', '2026-12-06T14:30', { marketing: built('2026-12-02T08:40', '2026-12-02T09:00'), meetings: built('2026-12-06T14:10', '2026-12-06T14:30') }),
    U('u_omar', 'Omar Haddad', 'omar@haddadhomes.com', 'agent', 'Agent', null, '2026-11-24T10:00', '2026-11-26T12:00', {}),
    U('u_ben', 'Ben Foster', 'ben@fosterproperties.com', 'agent', 'Agent', null, '2026-11-25T10:00', '2026-12-04T13:00', { marketing: wip(2) }),
    U('u_marcus', 'Marcus Lee', 'marcus@keystonecollective.com', 'team', 'Team Owner', 'keystone', '2026-11-19T10:00', '2026-12-05T10:00', { marketing: built('2026-12-02T17:40', '2026-12-02T18:00'), sales: wip(1) }),
  ];

  return {
    v: DB_V,
    cohorts: [
      { id: 'dec26', name: 'December 2026', start: T('2026-12-01T13:00'), end: T('2027-01-08T17:00'), weeks: 6, status: 'live', capacity: 200, enrolled: 148, cadence: 'Tue & Thu · 1:00 PM CT' },
      { id: 'feb27', name: 'February 2027', start: T('2027-02-02T13:00'), end: T('2027-03-12T17:00'), weeks: 6, status: 'enrolling', capacity: 200, enrolled: 37, cadence: 'Tue & Thu · 1:00 PM CT' },
      { id: 'apr27', name: 'April 2027', start: T('2027-04-06T13:00'), end: T('2027-05-14T17:00'), weeks: 6, status: 'draft', capacity: 200, enrolled: 0, cadence: 'Tue & Thu · 1:00 PM CT' },
    ],
    sessions, modules, users,
    teams: [
      { id: 'northline', name: 'Northline Realty Team', ownerId: 'u_alex', seats: 7 },
      { id: 'harbor', name: 'Harbor & Pine Group', ownerId: 'u_natasha', seats: 7 },
      { id: 'keystone', name: 'Keystone Collective', ownerId: 'u_marcus', seats: 7 },
    ],
    resources: [
      res('r1', 'Fair Housing Language Checker', 'Claude Project that flags steering language before anything goes public.', CATEGORIES[0], 'Claude Project', 'agent', '18 KB', 412, '2026-12-01T09:00'),
      res('r2', 'MLS Public Remarks Rules', 'Character limits and prohibited content for 14 major MLS boards.', CATEGORIES[0], 'PDF guide', 'agent', '1.2 MB', 287, '2026-11-28T09:00'),
      res('r3', 'Steering Language Reference', 'Phrases to avoid, why each one is a risk, and compliant rewrites.', CATEGORIES[0], 'PDF guide', 'agent', '640 KB', 356, '2026-11-28T09:00'),
      res('r4', 'Expired & FSBO Outreach Scripts', 'Call, text and letter scripts with a follow-up cadence.', CATEGORIES[1], 'Prompt pack', 'agent', '24 KB', 198, '2026-12-03T09:00'),
      res('r5', 'Open House Follow-up Sequence', '5-touch workflow triggered by sign-in sheet entries.', CATEGORIES[1], 'Workflow JSON', 'agent', '9 KB', 164, '2026-12-03T09:00'),
      res('r6', 'Speed-to-Lead Text Library', 'First replies for portal, website and sign-call leads.', CATEGORIES[1], 'Prompt pack', 'agent', '12 KB', 241, '2026-12-03T09:00'),
      res('r7', 'Sphere Reactivation Scripts', 'Openers for contacts you have not spoken to in a year or more.', CATEGORIES[1], 'Prompt pack', 'agent', '15 KB', 133, '2026-12-05T09:00'),
      res('r8', 'CRM New-Lead Webhook Setup', 'Step-by-step webhook setup for the most common real estate CRMs.', CATEGORIES[2], 'PDF guide', 'agent', '2.1 MB', 219, '2026-12-02T09:00'),
      res('r9', 'Sisu Closed-Deal Export to Claude', 'Workflow that sends closed deals to the Finance AI Employee.', CATEGORIES[2], 'Workflow JSON', 'team', '7 KB', 61, '2026-12-04T09:00'),
      res('r10', 'Sisu Scorecard Webhook', 'Pushes weekly agent scorecards into your leadership agenda.', CATEGORIES[2], 'Workflow JSON', 'team', '6 KB', 48, '2026-12-04T09:00'),
      res('r11', 'Contract-to-Close Timeline Template', 'Claude Project that builds a deadline calendar from a contract.', CATEGORIES[3], 'Claude Project', 'team', '21 KB', 39, '2026-12-05T09:00'),
      res('r12', 'TC Milestone Email Pack', 'Emails for lender, title, inspector and client at each milestone.', CATEGORIES[3], 'Prompt pack', 'agent', '18 KB', 174, '2026-12-05T09:00'),
      res('r13', 'Inspection Deadline Tracker', 'Workflow that alerts the TC 48 hours before each contingency.', CATEGORIES[3], 'Workflow JSON', 'team', '8 KB', 27, '2026-12-06T09:00'),
      res('x1', 'Team Operating System SOP', 'How the team runs: roles, scorecards and meeting cadence.', EXEC_CATEGORIES[0], 'Notion template', 'team', 'Template', 44, '2026-12-01T09:00', true),
      res('x2', 'Agent Accountability SOP', 'Weekly 1:1 structure built on leading indicators.', EXEC_CATEGORIES[0], 'Notion template', 'team', 'Template', 31, '2026-12-01T09:00', true),
      res('x3', 'Weekly Leadership Meeting Framework', '60-minute agenda: scorecard, issues, decisions.', EXEC_CATEGORIES[1], 'Notion template', 'team', 'Template', 52, '2026-12-02T09:00', true),
      res('x4', 'Quarterly Planning Agenda', 'Half-day planning session with pre-work prompts.', EXEC_CATEGORIES[1], 'PDF guide', 'team', '820 KB', 23, '2026-12-02T09:00', true),
      res('x5', 'Sisu to Sheets P&L Sync', 'Workflow that keeps your P&L sheet current from Sisu.', EXEC_CATEGORIES[2], 'Workflow JSON', 'team', '11 KB', 36, '2026-12-04T09:00', true),
      res('x6', 'Commission Split Calculator', 'Claude Project for split, cap and fee scenarios.', EXEC_CATEGORIES[2], 'Claude Project', 'team', '16 KB', 41, '2026-12-04T09:00', true),
    ],
    announcements: [
      { id: 'a1', sessionId: 'dec26-s3', title: 'Session 3 moved to Wed Dec 9 · 1:00 PM CT', body: '', severity: 'warning', action: 'calendar', actionLabel: 'Update Calendar', audience: 'all', channels: ['inapp', 'email'], status: 'sent', at: T('2026-12-06T15:00'), opens: 0.71 },
      { id: 'a2', title: 'Replay is up: Session 2 · Speed to Lead', body: 'The replay, chapters and transcript are on the Sales AI Employee page.', severity: 'info', action: null, actionLabel: '', audience: 'all', channels: ['email'], status: 'sent', at: T('2026-12-03T17:30'), opens: 0.64 },
      { id: 'a3', title: 'Weekly team progress digest', body: 'Who has built, who is stuck, and what to review before Thursday.', severity: 'info', action: null, actionLabel: '', audience: 'owners', channels: ['email'], status: 'scheduled', at: T('2026-12-11T08:00'), opens: null },
    ],
    dismissed: {},
    reminders: [
      { id: 'rm1', label: '24 hours before each live session', channel: 'Email', on: true },
      { id: 'rm2', label: '1 hour before each live session', channel: 'Email + SMS', on: true },
      { id: 'rm3', label: 'Replay is ready', channel: 'Email', on: true },
      { id: 'rm4', label: 'Build not finished 48 hours after its session', channel: 'Email', on: true },
      { id: 'rm5', label: 'Weekly progress digest for team owners', channel: 'Email', on: false },
    ],
    tiers: [
      { id: 'agent', name: 'Agent', price: 995, seats: 1, blurb: 'For individual agents building their own AI Employees.', features: ['Marketing, Sales and Database AI Employees', 'Live sessions and replays', 'System prompts, skill files and checklists', 'Resource & Compliance Vault'] },
      { id: 'team', name: 'Team', price: 4995, seats: 7, blurb: 'For teams that want every seat building, plus the leadership AI Employees.', features: ['All 6 AI Employees', '7 seats: owner, ops lead and up to 5 agents', 'Team Hub with progress tracking', 'Executive Build Vault'] },
    ],
    requests: [
      { id: 'ur1', userId: 'u_kenji', name: 'Kenji Watanabe', email: 'kenji@watanaberealty.com', source: 'Team tier page', at: T('2026-12-06T16:12'), status: 'new' },
      { id: 'ur2', userId: 'u_rosa', name: 'Rosa Delgado', email: 'rosa@delgadorealty.com', source: 'Executive Build Vault', at: T('2026-12-05T09:30'), status: 'contacted' },
      { id: 'ur3', userId: null, name: 'Amara Okafor', email: 'amara@okaforhomegroup.com', source: 'Sales call', at: T('2026-12-02T11:00'), status: 'converted' },
    ],
    staff: [
      { id: 'st1', name: 'Casey Lin', email: 'casey@amplifiedimpact.com', role: 'Owner', last: T('2026-12-07T10:40') },
      { id: 'st2', name: 'Jordan Hale', email: 'jordan@amplifiedimpact.com', role: 'Instructor', last: T('2026-12-07T09:15') },
      { id: 'st3', name: 'Maya Chen', email: 'maya@amplifiedimpact.com', role: 'Content Editor', last: T('2026-12-06T17:20') },
      { id: 'st4', name: 'Luis Romero', email: 'luis@amplifiedimpact.com', role: 'Support', last: T('2026-12-07T08:05') },
    ],
    perms: {
      Owner: { curriculum: 1, publish: 1, cohorts: 1, viewLearners: 1, seats: 1, announce: 1, billing: 1, staff: 1 },
      Admin: { curriculum: 1, publish: 1, cohorts: 1, viewLearners: 1, seats: 1, announce: 1, billing: 1, staff: 0 },
      Instructor: { curriculum: 1, publish: 0, cohorts: 1, viewLearners: 1, seats: 0, announce: 1, billing: 0, staff: 0 },
      'Content Editor': { curriculum: 1, publish: 0, cohorts: 0, viewLearners: 1, seats: 0, announce: 0, billing: 0, staff: 0 },
      Support: { curriculum: 0, publish: 0, cohorts: 0, viewLearners: 1, seats: 1, announce: 0, billing: 0, staff: 0 },
    },
    base: {
      learners: 134, agent: 99, teamSeats: 35, teams: 4,
      mod: { marketing: [88, 27, 19], sales: [54, 38, 42], database: [21, 30, 83], meetings: [6, 9, 20], finance: [2, 5, 28], operations: [0, 0, 35] },
      daily: [0, 41, 78, 102, 131, 158, 171],
    },
    activity: [
      { id: 'e1', t: T('2026-12-07T10:04'), who: 'Sarah Collins', what: 'deployed Database AI Employee', tone: 'success' },
      { id: 'e2', t: T('2026-12-07T08:40'), who: 'Rosa Delgado', what: 'deployed Database AI Employee', tone: 'success' },
      { id: 'e3', t: T('2026-12-07T07:55'), who: 'Natasha Reed', what: 'deployed Meetings AI Employee', tone: 'success' },
      { id: 'e4', t: T('2026-12-06T19:45'), who: 'Devon Price', what: 'deployed Sales AI Employee', tone: 'success' },
      { id: 'e5', t: T('2026-12-06T16:12'), who: 'Kenji Watanabe', what: 'requested a Team tier upgrade', tone: 'warn' },
      { id: 'e6', t: T('2026-12-06T15:00'), who: 'Casey Lin', what: 'moved Session 3 to Wed Dec 9', tone: 'info' },
    ],
  };
}

export function seed(phase = 'live') {
  const db = baseSeed();
  if (phase === 'week0') {
    db.users.forEach(u => { u.progress = {}; u.last = u.joined; });
    db.sessions.forEach(s => { s.attended = null; s.replay = null; s.views = 0; });
    const s3 = db.sessions.find(s => s.id === 'dec26-s3'); s3.start = s3.movedFrom; delete s3.movedFrom;
    db.cohorts[0].status = 'enrolling';
    db.announcements = []; db.requests = db.requests.filter(q => q.status === 'converted');
    db.base.mod = Object.fromEntries(Object.entries(db.base.mod).map(([k, v]) => [k, [0, 0, v[0] + v[1] + v[2]]]));
    db.base.daily = [0];
    db.activity = db.users.slice(0, 6).map((u, i) => ({ id: 'w' + i, t: u.joined, who: u.name, what: 'joined the December 2026 Cohort', tone: 'info' })).sort((a, b) => b.t - a.t);
  }
  if (phase === 'post') {
    const att = [121, 109, 116, 98, 92, 104], views = [402, 311, 287, 164, 151, 173];
    db.sessions.filter(s => s.cohortId === 'dec26').forEach((s, i) => Object.assign(s, { attended: att[i], replay: 'ready', views: views[i] }));
    const durs = { database: 3420, meetings: 3180, finance: 3600, operations: 3300 };
    db.modules.forEach(m => { if (!m.dur) m.dur = durs[m.id] || 3300; if (m.status === 'scheduled') { m.status = 'published'; m.opens = null; } m.resources = m.resources.map(r => /posted after/i.test(r.size) ? { ...r, size: '3.6 MB' } : r); });
    const day = (m, i) => T(`2026-12-${String(2 + i * 3).padStart(2, '0')}T16:00`);
    db.users.forEach(u => {
      if (u.id === 'u_omar') { u.progress = { marketing: wip(2) }; return; }
      if (u.id === 'u_lena') { u.progress = { marketing: wip(5) }; return; }
      db.modules.forEach((m, i) => {
        if (!canAccess(u, m)) return;
        const p = u.progress[m.id];
        if (!p || !p.deployedAt) { const t = new Date(day(m, i)).toISOString().slice(0, 16); u.progress[m.id] = built(t, t); }
        else if (p.runtime === 'paused' || p.runtime === 'needs_attention') { p.runtime = 'deployed'; delete p.issue; }
      });
      u.last = T('2027-01-11T15:00');
    });
    db.cohorts[0].status = 'completed'; db.cohorts[1].enrolled = 112;
    db.announcements = db.announcements.filter(a => a.id !== 'a1').map(a => a.status === 'scheduled' ? { ...a, status: 'sent', opens: 0.58 } : a);
    db.base.mod = { marketing: [118, 8, 8], sales: [101, 17, 16], database: [92, 22, 20], meetings: [28, 4, 3], finance: [25, 6, 4], operations: [22, 8, 5] };
    db.base.daily = Array.from({ length: 43 }, (_, i) => Math.round(386 * (1 - Math.exp(-i / 9))));
    db.activity = [
      { id: 'p1', t: T('2027-01-12T09:40'), who: 'Jamie Ortiz', what: 'ran Marketing AI Employee on a listing', tone: 'info' },
      { id: 'p2', t: T('2027-01-11T15:00'), who: 'Natasha Reed', what: 'resumed Meetings AI Employee', tone: 'success' },
      { id: 'p3', t: T('2027-01-08T17:00'), who: 'Casey Lin', what: 'closed the December 2026 Cohort', tone: 'info' },
      { id: 'p4', t: T('2027-01-06T11:00'), who: 'Alex Morgan', what: 'deployed Operations AI Employee', tone: 'success' },
    ];
  }
  db.phase = phase;
  return db;
}

// Lets a screen file render on its own (opened directly, outside the app shell) with the same data + actions.
export function standalone(comp, lib, role, route) {
  const start = Date.now(), prefs = loadPrefs(); applyPrefs(prefs);
  const phase = prefs.phase || 'live';
  const st = { db: loadDb(phase), role, route };
  const toast = msg => {
    const el = document.createElement('div'); el.textContent = msg;
    el.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:90;max-width:420px;padding:10px 14px;background:var(--bg-inverse);border-radius:10px;color:var(--text-inverse);font:500 13px var(--font-sans);box-shadow:var(--shadow-pop);animation:ai-toast-in 200ms ease-out';
    document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
  };
  const push = () => comp.setState({ sctx: build() });
  const shell = (s, id) => {
    try {
      const r = JSON.parse(sessionStorage.getItem('ai-lms-routes') || 'null') || { agent: { s: 'dashboard' }, owner: { s: 'dashboard' }, admin: { s: 'overview' } };
      r[st.role] = { s, id: id || null };
      sessionStorage.setItem('ai-lms-role', st.role); sessionStorage.setItem('ai-lms-routes', JSON.stringify(r));
    } catch (e) {}
    location.href = new URL('Amplified Impact LMS.dc.html', document.baseURI).href;
  };
  const act = {
    now: () => phaseNow(phase) + (Date.now() - start),
    nav: (s, id) => { if (s === st.route.s) { st.route = { s, id: id || null }; return push(); } shell(s, id); },
    mutate: (fn, msg) => { const d = JSON.parse(JSON.stringify(st.db)); fn(d); st.db = d; saveDb(phase, d); push(); if (msg) toast(msg); },
    toast,
    copy: (text, msg) => { try { navigator.clipboard.writeText(text); } catch (e) {} toast(msg || 'Copied to clipboard'); },
    download: (name, content, type, msg) => {
      try { const url = URL.createObjectURL(new Blob([content], { type: type || 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); } catch (e) {}
      toast(msg || `Downloaded ${name}`);
    },
    celebrate: () => {},
    setRole: r => { st.role = r; push(); },
    openLocked: () => shell('upgrade'),
  };
  function build() {
    const isAdmin = st.role === 'admin';
    const user = isAdmin ? null : st.db.users.find(u => u.id === (st.role === 'agent' ? 'u_jamie' : 'u_alex'));
    const team = user && user.teamId ? st.db.teams.find(t => t.id === user.teamId) : null;
    return { db: st.db, user, staff: st.db.staff[0], team, isTeam: !!user && user.tier === 'team', isAdmin, role: st.role, route: st.route, act, lib, ic: lib.ICONS, now: act.now(), phase, vw: window.innerWidth, forceVariant: null };
  }
  window.addEventListener('storage', e => { if (e.key === dbKey(phase) && e.newValue) { try { st.db = JSON.parse(e.newValue); push(); } catch (x) {} } });
  push();
}
