// The curriculum builder's rules (D-174): the copy rules every course save is checked against, and
// the field-diff summary each audited save records. Pure: no clock, no random source, no I/O, so the
// builder runs the same checks in the browser (inline, while staff type) that the API runs on save.
//
// THE COPY RULES (the learner build brief's hard rules, "enforced in the builder's validation"):
//   1. No em dashes, anywhere a learner reads.
//   2. Never the banned team-size and homes-a-year line ("a 100-agent team closing 700+ homes a year").
//   3. Hire copy never says the hire sends, posts, updates the CRM or touches the books. Hire copy is
//      what describes the AI employee itself: its outcome, headline and outputs, the promise and the
//      flagship, the seat card (except "Can't do", which is where those limits are said), the sample
//      output and the status labels. Steps and course pages talk to the owner and the operator, who
//      may well send a brief; they are not hire copy.
//   4. A time of day is shown in Mountain Time with "MT" ("12:00 PM MT", "12:00 to 1:00 PM MT").
//
// ONLY WHAT A SAVE CHANGES IS CHECKED. The course's first copy predates these rules (the seed is
// `main`'s course, word for word), so checking every string on every save would block an unrelated
// edit over a sentence nobody touched. A string that is new or edited must pass; the rest are listed
// by `copyIssues` for the builder to show, not to refuse.

import type { AIEmployee, Cohort, CopyString } from './types';
import { checklistIssueLines } from './checklist';
import type { CohortCourse, MediaItem, ModuleCourse, PathBlock, VideoBlock } from './course-types';
import { isVideoUpload } from './course-types';

export type CopyRule = 'em_dash' | 'banned_line' | 'hire_claim' | 'time_zone';

/** One learner-facing string: where it lives (a stable path), what the builder calls it, its text. */
export interface CopyField {
  path: string;
  label: string;
  text: string;
  /** Hire copy: what describes the AI employee itself (rule 3). */
  hire?: boolean;
}

export interface CopyIssue {
  path: string;
  label: string;
  rule: CopyRule;
  message: string;
}

export const COPY_RULE_MESSAGES: Readonly<Record<CopyRule, string>> = {
  em_dash: 'Use a comma, a colon or a period instead of an em dash.',
  banned_line: 'Leave out the team-size and homes-a-year line.',
  hire_claim: 'Hire copy can’t say the hire sends, posts, updates the CRM or touches the books.',
  time_zone: 'Show times in Mountain Time with “MT”, like 12:00 PM MT.',
};

const EM_DASH = /—/;
const BANNED = [/\b100[\s-]agent\b/i, /\b700\+?\s*homes\b/i];
const HIRE_CLAIMS = [
  /\b(send|sends|sending|sent)\b/i,
  /\b(post|posts|posting|posted)\b/i,
  /\bupdat(e|es|ed|ing)\s+(the\s+|your\s+)?crm\b/i,
  /\btouch(es|ed|ing)?\s+(the\s+|your\s+)?books\b/i,
];
/** A time of day: `12:00 PM`, `1 pm`, `9:30a.m.`. */
const TIME = /\b(1[0-2]|0?[1-9])(?::[0-5]\d)?\s?(?:[ap]\.?m\.?)(?![a-z])/gi;
/** What may follow a time: `MT`, or a range whose end carries `MT` ("12:00 PM to 1:00 PM MT"). */
const FOLLOWED_BY_MT = /^\s*MT\b/;
const RANGE_TO_MT = /^\s*(?:to|until|-|–)\s*(1[0-2]|0?[1-9])(?::[0-5]\d)?\s?(?:[ap]\.?m\.?)\s*MT\b/i;

function timesWithoutMt(text: string): boolean {
  for (const m of text.matchAll(TIME)) {
    const rest = text.slice((m.index ?? 0) + m[0].length);
    if (!FOLLOWED_BY_MT.test(rest) && !RANGE_TO_MT.test(rest)) return true;
  }
  return false;
}

/** Every rule one string breaks. */
export function rulesBroken(f: CopyField): CopyRule[] {
  const out: CopyRule[] = [];
  if (EM_DASH.test(f.text)) out.push('em_dash');
  if (BANNED.some((r) => r.test(f.text))) out.push('banned_line');
  if (f.hire && HIRE_CLAIMS.some((r) => r.test(f.text))) out.push('hire_claim');
  if (timesWithoutMt(f.text)) out.push('time_zone');
  return out;
}

/** Every issue in a list of strings, in order. */
export function copyIssues(fields: readonly CopyField[]): CopyIssue[] {
  return fields.flatMap((f) => rulesBroken(f).map((rule) => ({ path: f.path, label: f.label, rule, message: COPY_RULE_MESSAGES[rule] })));
}

/** The strings in `next` that are new or differ from `prev` at the same path. */
export function changedFields(prev: readonly CopyField[], next: readonly CopyField[]): CopyField[] {
  const before = new Map(prev.map((f) => [f.path, f.text]));
  return next.filter((f) => before.get(f.path) !== f.text);
}

/** One issue as the builder prints it: "Step 3 · Done when: Show times in Mountain Time…". */
export const issueLine = (i: CopyIssue): string => `${i.label}: ${i.message}`;

// --- where the strings are -----------------------------------------------------------------------

const push = (out: CopyField[], path: string, label: string, text: string | undefined, hire = false): void => {
  if (typeof text === 'string' && text.trim()) out.push({ path, label, text, ...(hire ? { hire: true } : {}) });
};
const pushAll = (out: CopyField[], path: string, label: string, list: readonly string[] | undefined, hire = false): void =>
  (list ?? []).forEach((t, i) => push(out, `${path}[${i}]`, `${label} ${i + 1}`, t, hire));

function blockFields(out: CopyField[], path: string, label: string, blocks: readonly PathBlock[] | undefined, hire = false): void {
  (blocks ?? []).forEach((b, i) => {
    const p = `${path}[${i}]`;
    const l = `${label}, block ${i + 1}`;
    if (b.type === 'text') push(out, `${p}.text`, l, b.text, hire);
    // D-188: a video's title is learner-facing copy; its source is an address, not copy.
    else if (b.type === 'video') push(out, `${p}.title`, l, b.title, hire);
    else if (b.type === 'copy') {
      push(out, `${p}.label`, l, b.label, hire);
      push(out, `${p}.text`, l, b.text, hire);
    } else if (b.type === 'list') pushAll(out, `${p}.items`, `${l}, item`, b.items, hire);
    else if (b.type === 'table') {
      pushAll(out, `${p}.head`, `${l}, heading`, b.head, hire);
      b.rows.forEach((r, j) => pushAll(out, `${p}.rows[${j}]`, `${l}, row ${j + 1}, cell`, r, hire));
    } else if (b.type === 'check') {
      // D-190: every learner-facing string on a checklist item. Ids, routes and kit ids are not copy.
      push(out, `${p}.title`, `${l}, checklist`, b.title, hire);
      push(out, `${p}.detail`, `${l}, detail`, b.detail, hire);
      push(out, `${p}.collapsedNote`, `${l}, collapsed note`, b.collapsedNote, hire);
      pushAll(out, `${p}.clickPath`, `${l}, click path`, b.clickPath, hire);
      for (const sub of b.subchecks ?? []) push(out, `${p}.subchecks.${sub.id}`, `${l}, task`, sub.label, hire);
      const a = b.action;
      if (a?.type === 'copy') {
        push(out, `${p}.action.label`, `${l}, button`, a.label, hire);
        push(out, `${p}.action.text`, `${l}, text to copy`, a.text, hire);
      } else if (a?.type === 'invite') push(out, `${p}.action.label`, `${l}, button`, a.label, hire);
      else if (a?.type === 'link') push(out, `${p}.action.label`, `${l}, button`, a.label, hire);
      else if (a?.type === 'form') push(out, `${p}.action.label`, `${l}, button`, a.label, hire);
    } else if (b.type === 'callout') push(out, `${p}.text`, `${l}, callout`, b.text, hire);
    else {
      push(out, `${p}.title`, `${l}, reference`, b.title, hire);
      pushAll(out, `${p}.body`, `${l}, paragraph`, b.body, hire);
      pushAll(out, `${p}.table.head`, `${l}, heading`, b.table?.head, hire);
      (b.table?.rows ?? []).forEach((r, j) => pushAll(out, `${p}.table.rows[${j}]`, `${l}, row ${j + 1}, cell`, r, hire));
      push(out, `${p}.link.label`, `${l}, link`, b.link?.label, hire);
    }
  });
}

/** A week's Media: a line at `course.media[i]`, as before, and (D-188) a video's title at `course.media[i].title`. */
function mediaFields(out: CopyField[], media: readonly MediaItem[]): void {
  media.forEach((m, i) => {
    if (typeof m === 'string') push(out, `course.media[${i}]`, `Media ${i + 1}`, m);
    else push(out, `course.media[${i}].title`, `Media ${i + 1}`, m.title);
  });
}

/** A week's words, every learner-facing string with its path (`course.` paths are the week's JSONB). */
function courseFields(out: CopyField[], c: ModuleCourse): void {
  push(out, 'course.title', 'Week title', c.title);
  push(out, 'course.question', 'Question', c.question);
  pushAll(out, 'course.why', 'Why', c.why);
  push(out, 'course.owner', 'Owner line', c.owner);
  push(out, 'course.operator', 'Operator line', c.operator);
  push(out, 'course.time.owner', 'Owner time', c.time.owner);
  push(out, 'course.time.operator', 'Operator time', c.time.operator);
  c.skills.forEach((s, i) => push(out, `course.skills[${i}].use`, `Skill ${i + 1}, use`, s.use));
  c.setup.forEach((s, i) => push(out, `course.setup[${i}].text`, `Setup step ${i + 1}`, s.text));
  if (c.liveBuild) {
    const lb = c.liveBuild;
    lb.agenda.forEach((a, i) => {
      push(out, `course.liveBuild.agenda[${i}].activity`, `Run of show ${i + 1}`, a.activity);
      push(out, `course.liveBuild.agenda[${i}].why`, `Run of show ${i + 1}, why`, a.why);
    });
    push(out, 'course.liveBuild.lesson', 'Live build lesson', lb.lesson);
    push(out, 'course.liveBuild.exercise', 'Live build exercise', lb.exercise);
    push(out, 'course.liveBuild.required', 'Required outcome', lb.required);
    push(out, 'course.liveBuild.advanced', 'Advanced option', lb.advanced);
    push(out, 'course.liveBuild.ownerApproval', 'Owner approval', lb.ownerApproval);
    pushAll(out, 'course.liveBuild.workingAtEnd', 'Working at the end', lb.workingAtEnd);
  }
  if (c.officeHours) {
    const oh = c.officeHours;
    push(out, 'course.officeHours.title', 'Office hours title', oh.title);
    push(out, 'course.officeHours.note', 'Office hours note', oh.note);
    (oh.format ?? []).forEach((a, i) => {
      push(out, `course.officeHours.format[${i}].activity`, `Office hours ${i + 1}`, a.activity);
      push(out, `course.officeHours.format[${i}].why`, `Office hours ${i + 1}, why`, a.why);
    });
    pushAll(out, 'course.officeHours.outputs', 'Office hours output', oh.outputs);
  }
  pushAll(out, 'course.homework.byWeekEnd', 'By week’s end', c.homework.byWeekEnd);
  pushAll(out, 'course.homework.assignment', 'Assignment', c.homework.assignment);
  pushAll(out, 'course.homework.acceptance', 'Checkpoint', c.homework.acceptance);
  push(out, 'course.homework.useEvidence', 'Use evidence', c.homework.useEvidence);
  mediaFields(out, c.media);
  pushAll(out, 'course.materials', 'Material', c.materials);
  // The builder's cards.
  push(out, 'course.promise', 'Promise', c.promise, true);
  push(out, 'course.flagship', 'Flagship', c.flagship, true);
  pushAll(out, 'course.tools', 'Tool', c.tools, true);
  if (c.seatCard) {
    const sc = c.seatCard;
    const seat: [keyof typeof sc, string][] = [
      ['seat', 'Seat'],
      ['reportsTo', 'Reports to'],
      ['runs', 'Runs'],
      ['pulls', 'Pulls'],
      ['applies', 'Applies'],
      ['produces', 'Produces'],
      ['tookOver', 'Took over'],
      ['firstRun', 'First run'],
    ];
    for (const [k, l] of seat) push(out, `course.seatCard.${k}`, `Seat card, ${l}`, sc[k], true);
    // "Can't do" is where the limits are said, so it may name sending or posting.
    push(out, 'course.seatCard.cantDo', 'Seat card, Can’t do', sc.cantDo);
  }
  if (c.playbookCard) {
    const pc = c.playbookCard;
    push(out, 'course.playbookCard.name', 'Playbook card, name', pc.name);
    push(out, 'course.playbookCard.question', 'Playbook card, question', pc.question);
    push(out, 'course.playbookCard.play', 'Playbook card, play', pc.play);
    push(out, 'course.playbookCard.source', 'Playbook card, source', pc.source);
  }
  if (c.sampleOutput) {
    push(out, 'course.sampleOutput.title', 'Sample output, title', c.sampleOutput.title, true);
    push(out, 'course.sampleOutput.madeUpLabel', 'Sample output, made-up label', c.sampleOutput.madeUpLabel);
    blockFields(out, 'course.sampleOutput.blocks', 'Sample output', c.sampleOutput.blocks, true);
  }
  if (c.lockedCopy) {
    push(out, 'course.lockedCopy.headline', 'Locked, headline', c.lockedCopy.headline);
    push(out, 'course.lockedCopy.line', 'Locked, line', c.lockedCopy.line);
    push(out, 'course.lockedCopy.opens', 'Locked, opens', c.lockedCopy.opens);
  }
  for (const [k, v] of Object.entries(c.statusLabels ?? {})) push(out, `course.statusLabels.${k}`, `Status label (${k})`, v, true);
}

/** Every learner-facing string of a module: its own columns, its steps and, for a week, its words. */
export function moduleCopyFields(m: AIEmployee): CopyField[] {
  const out: CopyField[] = [];
  push(out, 'name', 'Name', m.name, true);
  push(out, 'headline', 'Outcome headline', m.headline, true);
  push(out, 'outcome', 'Summary', m.outcome, true);
  pushAll(out, 'outputs', 'Output', m.outputs, true);
  push(out, 'forWho', 'For', m.forWho);
  push(out, 'platform', 'Platform', m.platform);
  push(out, 'runLabel', 'Run button label', m.runLabel);
  m.checklist.forEach((s, i) => {
    const p = `checklist[${i}]`;
    const l = `Step ${i + 1}`;
    push(out, `${p}.text`, l, s.text);
    push(out, `${p}.hint`, `${l}, hint`, s.hint);
    push(out, `${p}.who`, `${l}, who`, s.who);
    push(out, `${p}.timeLabel`, `${l}, time`, s.timeLabel);
    push(out, `${p}.doneWhen`, `${l}, done when`, s.doneWhen);
    blockFields(out, `${p}.paths.claude.blocks`, `${l}, Claude path`, s.paths?.claude?.blocks);
    blockFields(out, `${p}.paths.chatgpt.blocks`, `${l}, ChatGPT path`, s.paths?.chatgpt?.blocks);
  });
  if (m.course) courseFields(out, m.course);
  return out;
}

/** Every learner-facing string of the cohort: its name and cadence, and what its weeks share. */
export function cohortCopyFields(c: Pick<Cohort, 'name' | 'cadence' | 'course'>): CopyField[] {
  const out: CopyField[] = [];
  push(out, 'name', 'Cohort name', c.name);
  push(out, 'cadence', 'Cadence', c.cadence);
  const cc: CohortCourse | undefined = c.course;
  if (!cc) return out;
  push(out, 'course.intro.title', 'Course title', cc.intro.title);
  push(out, 'course.intro.sub', 'Course subtitle', cc.intro.sub);
  pushAll(out, 'course.intro.how', 'How it works', cc.intro.how);
  push(out, 'course.intro.roles.owner', 'Owner role', cc.intro.roles.owner);
  push(out, 'course.intro.roles.operator', 'Operator role', cc.intro.roles.operator);
  push(out, 'course.intro.scope', 'Scope', cc.intro.scope);
  push(out, 'course.intro.support', 'Support', cc.intro.support);
  push(out, 'course.intro.holiday', 'Holiday note', cc.intro.holiday);
  push(out, 'course.intro.join.label', 'Join label', cc.intro.join.label);
  push(out, 'course.intro.join.note', 'Join note', cc.intro.join.note);
  pushAll(out, 'course.shared.officeHoursRules', 'Office hours rule', cc.shared.officeHoursRules);
  cc.shared.issueForm.forEach((x, i) => {
    push(out, `course.shared.issueForm[${i}].label`, `Issue form ${i + 1}`, x.label);
    push(out, `course.shared.issueForm[${i}].hint`, `Issue form ${i + 1}, hint`, x.hint);
  });
  cc.shared.evidence.forEach((x, i) => {
    push(out, `course.shared.evidence[${i}].label`, `Evidence ${i + 1}`, x.label);
    push(out, `course.shared.evidence[${i}].hint`, `Evidence ${i + 1}, hint`, x.hint);
  });
  cc.shared.rubric.forEach((x, i) => {
    push(out, `course.shared.rubric[${i}].label`, `Rubric ${i + 1}`, x.label);
    push(out, `course.shared.rubric[${i}].meets`, `Rubric ${i + 1}, meets`, x.meets);
  });
  cc.shared.rubricScale.forEach((x, i) => push(out, `course.shared.rubricScale[${i}].label`, `Rubric score ${x.score}`, x.label));
  pushAll(out, 'course.shared.rubricRules', 'Rubric rule', cc.shared.rubricRules);
  cc.shared.readiness.forEach((x, i) => push(out, `course.shared.readiness[${i}].text`, `Readiness (${x.gate})`, x.text));
  cc.shared.paths.forEach((x, i) => {
    push(out, `course.shared.paths[${i}].label`, `Path ${i + 1}`, x.label);
    push(out, `course.shared.paths[${i}].text`, `Path ${i + 1}, text`, x.text);
  });
  push(out, 'course.shared.missedAWeek', 'Missed a week', cc.shared.missedAWeek);
  push(out, 'course.shared.estimateNote', 'Estimate note', cc.shared.estimateNote);
  pushAll(out, 'course.before.intake', 'Intake', cc.before.intake);
  pushAll(out, 'course.before.orientation.topics', 'Orientation topic', cc.before.orientation.topics);
  push(out, 'course.before.orientation.media', 'Orientation media', cc.before.orientation.media);
  cc.before.dataPack.forEach((x, i) => {
    push(out, `course.before.dataPack[${i}].input`, `Data pack ${i + 1}`, x.input);
    push(out, `course.before.dataPack[${i}].preferred`, `Data pack ${i + 1}, preferred`, x.preferred);
    push(out, `course.before.dataPack[${i}].minimum`, `Data pack ${i + 1}, minimum`, x.minimum);
  });
  push(out, 'course.before.practiceSetNote', 'Practice set note', cc.before.practiceSetNote);
  pushAll(out, 'course.before.safeSharing', 'Safe sharing', cc.before.safeSharing);
  cc.before.lanes.forEach((x, i) => {
    push(out, `course.before.lanes[${i}].label`, `Lane ${i + 1}`, x.label);
    push(out, `course.before.lanes[${i}].text`, `Lane ${i + 1}, text`, x.text);
  });
  pushAll(out, 'course.after.graduation', 'Graduation', cc.after.graduation);
  push(out, 'course.after.graduationNote', 'Graduation note', cc.after.graduationNote);
  cc.after.paths.forEach((x, i) => {
    push(out, `course.after.paths[${i}].label`, `After path ${i + 1}`, x.label);
    push(out, `course.after.paths[${i}].text`, `After path ${i + 1}, text`, x.text);
  });
  push(out, 'course.after.noPaywall', 'No paywall', cc.after.noPaywall);
  cc.after.pilotQuestions.forEach((x, i) => {
    push(out, `course.after.pilotQuestions[${i}].label`, `Pilot question ${i + 1}`, x.label);
    push(out, `course.after.pilotQuestions[${i}].text`, `Pilot question ${i + 1}, text`, x.text);
  });
  return out;
}

// --- D-188: a video block's source ----------------------------------------------------------------

/** Longest video address a block keeps: the same bound as a session's replay link. */
export const VIDEO_URL_MAX = 2048;

export const VIDEO_SOURCE_MESSAGE = 'Use an http or https link for a video, or upload an mp4.';

/** Whether an address is an http(s) URL, the only kind a video link may be. */
export function isHttpUrl(raw: string): boolean {
  if (raw.length > VIDEO_URL_MAX) return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Whether a video block's source is usable: an uploaded mp4 with its key, or an http(s) link. */
export function videoSourceOk(b: VideoBlock): boolean {
  const src = b.source;
  if (isVideoUpload(src)) return src.upload.trim() !== '' && src.type === 'video/mp4';
  return typeof src.url === 'string' && isHttpUrl(src.url);
}

/** Every video in a module, with where it is and what the builder calls it (its paths, then its week's Media). */
export function moduleVideos(m: AIEmployee): { path: string; label: string; block: VideoBlock }[] {
  const out: { path: string; label: string; block: VideoBlock }[] = [];
  m.checklist.forEach((s, i) => {
    for (const which of ['claude', 'chatgpt'] as const) {
      (s.paths?.[which]?.blocks ?? []).forEach((b, j) => {
        if (b.type === 'video') out.push({ path: `checklist[${i}].paths.${which}.blocks[${j}]`, label: `Step ${i + 1}, ${which === 'claude' ? 'Claude' : 'ChatGPT'} path, block ${j + 1}`, block: b });
      });
    }
  });
  (m.course?.media ?? []).forEach((x, i) => {
    if (typeof x !== 'string') out.push({ path: `course.media[${i}]`, label: `Media ${i + 1}`, block: x });
  });
  return out;
}

/** The lines a save is refused with for a video whose source isn't usable ("Step 2, Claude path, block 1: …"). */
export const videoIssues = (m: AIEmployee): string[] => moduleVideos(m).filter((v) => !videoSourceOk(v.block)).map((v) => `${v.label}: ${VIDEO_SOURCE_MESSAGE}`);

/** D-190: a checklist item's id, its dependencies and its link, on top of the copy rules. */
export const checklistIssues = (m: AIEmployee): string[] => checklistIssueLines(m.checklist);

/** A copy string as a field. */
export const copyStringField = (c: CopyString): CopyField => ({ path: `copy.${c.key}`, label: c.key, text: c.value });

// --- the field-diff summary an audit row records -------------------------------------------------

/** At most this many paths in one row; the count says how many more there were. */
export const DIFF_PATH_LIMIT = 40;

/**
 * The paths that differ between two JSON values, in a stable order: `course.question`,
 * `checklist[2].doneWhen`, `course.seatCard` (added whole). Arrays compare by index; a length change
 * is reported at the array's own path. Values are never included, only where they changed.
 */
export function changedPaths(before: unknown, after: unknown, base = ''): string[] {
  if (Object.is(before, after)) return [];
  const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (Array.isArray(before) && Array.isArray(after)) {
    const out: string[] = [];
    if (before.length !== after.length) out.push(base || '(root)');
    const n = Math.min(before.length, after.length);
    for (let i = 0; i < n; i++) out.push(...changedPaths(before[i], after[i], `${base}[${i}]`));
    return out;
  }
  if (isObj(before) && isObj(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((k) => changedPaths(before[k], after[k], base ? `${base}.${k}` : k));
  }
  return [base || '(root)'];
}

/** The summary an audited save records: the first paths and how many changed in all. */
export function diffSummary(before: unknown, after: unknown): { changed: string[]; count: number } {
  const all = changedPaths(before, after);
  return { changed: all.slice(0, DIFF_PATH_LIMIT), count: all.length };
}
