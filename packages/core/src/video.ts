// D-191: chapters, captions, and how much of a video was actually watched.
//
// Pure. The Week Builder parses chapter lines with these functions, the player asks which chapter
// and which caption cue are current, and `saveVideoProgress` asks which checklist items a video
// has just crossed. Nothing here reads the clock or the network.
//
// A block without chapters, a poster or a transcript never reaches this file, so it stays the
// video it was.

import type { VideoBlock, VideoChapter } from './course-types';
import { isVideoUpload } from './course-types';
import type { Step } from './types';

/** The id a video is saved and resumed under: the block's id, else its upload key, else its link. */
export function videoIdOf(block: VideoBlock): string {
  const id = block.id?.trim();
  if (id) return id;
  return isVideoUpload(block.source) ? block.source.upload : block.source.url;
}

// --- chapters ------------------------------------------------------------------------------------

/** `0:47`, `0:47.1`, `1:02:03` or a number of seconds. Null when it is not a time. */
export function parseClock(raw: string): number | null {
  const s = raw.trim();
  if (/^\d+(?:\.\d+)?$/.test(s)) {
    const n = Number(s);
    return n >= 0 && n <= 86_400 ? n : null;
  }
  const m = /^(?:(\d+):)?(\d{1,3}):(\d{1,2}(?:\.\d+)?)$/.exec(s);
  if (!m) return null;
  const hour = m[1] !== undefined;
  const h = hour ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const sec = Number(m[3]);
  if ((hour && min > 59) || sec >= 60) return null;
  const n = h * 3600 + min * 60 + sec;
  return n <= 86_400 ? n : null;
}

/** A chapter's time as staff type it back (`0:47`, `0:47.1`, `1:02:03`). */
export function formatClock(t: number): string {
  const s = Math.max(0, t);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round((s % 60) * 10) / 10;
  const secText = Number.isInteger(sec) ? String(sec).padStart(2, '0') : sec.toFixed(1).padStart(4, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${secText}` : `${m}:${secText}`;
}

export interface ChapterParse {
  chapters: VideoChapter[];
  /** Set when a line cannot be a chapter. The chapters are then empty, so a bad line is not saved. */
  error: string | null;
}

/**
 * One chapter per line: `0:47 | Map Your Spend self-test | s4c-mys`.
 * The item id is optional. Lines must be in time order.
 */
export function parseChapters(text: string): ChapterParse {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const chapters: VideoChapter[] = [];
  let prev = -1;
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i]!.split('|').map((p) => p.trim());
    const where = `Line ${i + 1}`;
    if (parts.length < 2 || !parts[1]) return { chapters: [], error: `${where}: use time | label, like 0:47 | Map Your Spend self-test.` };
    const t = parseClock(parts[0] ?? '');
    if (t === null) return { chapters: [], error: `${where}: "${parts[0]}" is not a time.` };
    if (t < prev) return { chapters: [], error: `${where}: chapters go in time order.` };
    prev = t;
    const item = parts[2] || undefined;
    if (item && !/^[A-Za-z0-9_-]+$/.test(item)) return { chapters: [], error: `${where}: "${item}" is not a checklist id.` };
    chapters.push(item ? { t, label: parts[1]!, item } : { t, label: parts[1]! });
  }
  return { chapters, error: null };
}

/** The lines `parseChapters` reads back. */
export function chapterText(chapters: readonly VideoChapter[]): string {
  return chapters.map((c) => (c.item ? `${formatClock(c.t)} | ${c.label} | ${c.item}` : `${formatClock(c.t)} | ${c.label}`)).join('\n');
}

/** The chapter playing at `time`: the last one whose start is at or before it. -1 when none is. */
export function activeChapterIndex(chapters: readonly { t: number }[], time: number): number {
  let at = -1;
  for (let i = 0; i < chapters.length; i++) if (chapters[i]!.t <= time + 1e-3) at = i;
  return at;
}

/** What a save refuses for one video's chapters. `itemIds` is the step's checklist ids, or null for Media. */
export function chapterProblems(block: VideoBlock, itemIds: readonly string[] | null): string[] {
  const out: string[] = [];
  let prev = -1;
  let order = false;
  (block.chapters ?? []).forEach((c, i) => {
    const n = i + 1;
    if (!(c.t >= 0)) out.push(`Chapter ${n} needs a time of 0 or more.`);
    else if (c.t < prev) order = true;
    if (c.t >= 0) prev = c.t;
    if (!c.label.trim()) out.push(`Chapter ${n} needs a label.`);
    if (c.item && itemIds && !itemIds.includes(c.item)) out.push(`Chapter ${n} names ${c.item}, which is not a checklist item on this step.`);
  });
  if (order) out.push('Put chapters in time order.');
  return out;
}

// --- captions ------------------------------------------------------------------------------------

export interface CaptionCue {
  start: number;
  end: number;
  text: string;
}

const CUE_STAMP = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})[.](\d{1,3})$/;

function cueSeconds(token: string): number | null {
  const m = CUE_STAMP.exec(token.trim());
  if (!m) return null;
  const min = Number(m[2]);
  const sec = Number(m[3]);
  if (min > 59 || sec > 59) return null;
  const frac = m[4]!.padEnd(3, '0').slice(0, 3);
  return Number(m[1] ?? 0) * 3600 + min * 60 + sec + Number(frac) / 1000;
}

const stripTags = (line: string): string => line.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

/**
 * WebVTT cues with their start and end, for the transcript drawer and the caption highlight.
 * Settings after the end time are ignored. A bad file returns no cues and a short reason;
 * a file that is only a header returns no cues and no error.
 */
export function parseCaptionCues(vtt: string): { cues: CaptionCue[]; error: string | null } {
  if (typeof vtt !== 'string') return { cues: [], error: 'Not a WebVTT document.' };
  const lines = vtt.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n').split('\n');
  const head = (lines[0] ?? '').trim();
  if (!(head === 'WEBVTT' || head.startsWith('WEBVTT ') || head.startsWith('WEBVTT\t'))) return { cues: [], error: 'Not a WebVTT document.' };
  const cues: CaptionCue[] = [];
  let i = 1;
  while (i < lines.length) {
    while (i < lines.length && (lines[i] ?? '').trim() === '') i += 1;
    if (i >= lines.length) break;
    const start = i;
    const block: string[] = [];
    while (i < lines.length && (lines[i] ?? '').trim() !== '') block.push(lines[i++] ?? '');
    const first = (block[0] ?? '').trim();
    if (first === 'NOTE' || first.startsWith('NOTE ') || first.startsWith('NOTE\t') || first === 'STYLE' || first === 'REGION') continue;
    const arrow = block.findIndex((l) => l.includes('-->'));
    if (arrow < 0 || arrow > 1) return { cues: [], error: `A cue near line ${start + 1} has no timing.` };
    const timing = block[arrow] ?? '';
    const at = timing.indexOf('-->');
    const startS = cueSeconds(timing.slice(0, at));
    const endS = cueSeconds((timing.slice(at + 3).trim().split(/\s+/)[0] ?? ''));
    if (startS === null || endS === null || endS < startS) return { cues: [], error: `A cue near line ${start + arrow + 1} has a time that cannot be read.` };
    const text = block.slice(arrow + 1).map(stripTags).filter(Boolean).join('\n');
    if (text) cues.push({ start: startS, end: endS, text });
  }
  return { cues, error: null };
}

/** The cue being spoken at `time`, or -1 between cues. */
export function activeCueIndex(cues: readonly { start: number; end: number }[], time: number): number {
  return cues.findIndex((c) => time >= c.start && time < c.end);
}

// --- watched seconds -----------------------------------------------------------------------------

export interface WatchedSpan {
  start: number;
  end: number;
}

/** Add one played stretch and merge anything it overlaps, including a stretch that only touches. */
export function mergeSpans(spans: readonly WatchedSpan[], next: WatchedSpan): WatchedSpan[] {
  if (!(next.end > next.start)) return spans.map((s) => ({ ...s }));
  const all = [...spans.map((s) => ({ ...s })), { start: next.start, end: next.end }].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: WatchedSpan[] = [];
  for (const s of all) {
    const last = out[out.length - 1];
    if (!last || s.start > last.end) out.push(s);
    else last.end = Math.max(last.end, s.end);
  }
  return out;
}

export const spanSeconds = (spans: readonly WatchedSpan[]): number => spans.reduce((n, s) => n + Math.max(0, s.end - s.start), 0);

/** The share of `duration` the spans cover, from 0 to 1. A seek that was not played adds nothing. */
export function watchedFraction(spans: readonly WatchedSpan[], duration: number): number {
  if (!(duration > 0)) return 0;
  return Math.min(1, spanSeconds(spans) / duration);
}

/**
 * `at` as a fraction of the video. 0.9 and 90 both mean most of it: a value above 1 is a percent.
 */
export function watchThreshold(at: number): number {
  if (!Number.isFinite(at) || at <= 0) return 1;
  return at > 1 ? Math.min(1, at / 100) : Math.min(1, at);
}

/** True the one time `next` first reaches `at`, coming up from `prev`. */
export const crossesWatch = (prev: number, next: number, at: number): boolean => prev < at && next >= at;

/** Where to resume, or null within 5 seconds of the end (or before the start). */
export function resumeAt(last: number, duration: number): number | null {
  if (!(last > 0) || !Number.isFinite(duration) || duration <= 0) return null;
  if (duration - last <= 5) return null;
  return last;
}

// --- which checklist items a video checks --------------------------------------------------------

export interface AutoTarget {
  stepId: string;
  itemId: string;
  /** A fraction of the video. */
  at: number;
}

/**
 * Checklist items on a step whose path holds `videoId`, with `auto` for that video.
 * An item that names a video matches that one. An item that names none matches the first video
 * on its path.
 */
export function autoTargets(steps: readonly Step[], videoId: string): AutoTarget[] {
  const out: AutoTarget[] = [];
  const seen = new Set<string>();
  for (const step of steps) {
    for (const which of ['claude', 'chatgpt'] as const) {
      const blocks = step.paths?.[which]?.blocks ?? [];
      const ids = blocks.flatMap((b) => (b.type === 'video' ? [videoIdOf(b)] : []));
      if (!ids.includes(videoId)) continue;
      for (const b of blocks) {
        if (b.type !== 'check' || !b.auto) continue;
        const named = b.auto.id || b.playAt?.video;
        if (named ? named !== videoId : ids[0] !== videoId) continue;
        const key = `${step.id}:${b.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ stepId: step.id, itemId: b.id, at: watchThreshold(b.auto.at) });
      }
    }
  }
  return out;
}
