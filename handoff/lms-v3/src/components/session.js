// Session timing, shared by the top bar, the Schedule and the locked-week page. Pure functions of a session and "now",
// so the LMS can call them from its view-model or pass the answer in (`next.mode`, `session.state`) and skip them.
//   session  { start (ISO), minutes, joinBefore (minutes the join window opens ahead), replayAt? (ISO) }
export const sessionEnd = (x) => Date.parse(x.start) + x.minutes * 60000;
/** The next session's mode: 'wait' (Add to calendar) | 'join' (the join window is open) | 'live'. */
export const sessionMode = (x, t) => (t >= Date.parse(x.start) ? 'live' : Math.floor((Date.parse(x.start) - t) / 60000) < x.joinBefore ? 'join' : 'wait');
/** A session's line on the Schedule: 'wait' | 'join' | 'live' | 'processing' | 'replay' | 'ended'. */
export const sessionState = (x, t) => (t >= sessionEnd(x) ? (x.replayAt ? (t >= Date.parse(x.replayAt) ? 'replay' : 'processing') : 'ended') : sessionMode(x, t));
/** Minutes -> [[11, 'days'], [21, 'hr']] | [[3, 'hr'], [0, 'min']] | [[9, 'min']] */
export const countdown = (mins) => { const m = Math.max(0, mins), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d ? [[d, d === 1 ? 'day' : 'days'], [h, 'hr']] : h ? [[h, 'hr'], [m % 60, 'min']] : [[m, 'min']]; };
/** 1 -> "Add to calendar", 2 -> "Add both to calendar", 3+ -> "Add all to calendar" (the LMS's addLabel) */
export const addLabel = (n) => (n === 1 ? 'Add to calendar' : n === 2 ? 'Add both to calendar' : 'Add all to calendar');
