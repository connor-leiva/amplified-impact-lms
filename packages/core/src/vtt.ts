// WebVTT to transcript, and back — docs/phases/08-integrations.md § 8.3.
//
// § 8.3: "Admin `publishReplay` takes `{ playbackUrl, durationSec, transcriptVtt? }`. Parse WebVTT
// into `transcript: [seconds, text][]`." That array is exactly the shape `AIEmployee.transcript`
// already holds, and three places read it: the caption line over the player, the searchable
// transcript panel (SCREENS § 3.2) and `58:24 · 6 chapters from the build steps · transcript
// indexed` in the Module Builder preview. Chapters are unrelated — they stay `checklist[i].t`.
//
// This lives in core, pure, because the failure it guards against is invisible at the moment it
// happens: a parser that drops a cue produces a transcript that still looks healthy in the admin
// console and is only discovered wrong weeks later, when a learner searches a replay for a line
// that was definitely said. So every ambiguity below resolves to "keep the line" or "throw", never
// to "skip it quietly". The four decisions a reader will want to check:
//
//   1. **Malformed input throws** `VttError`, carrying the 1-based line number. `publishReplay` is
//      an admin action with the file in hand, so a 422 that names the bad line is recoverable,
//      while a half-parsed transcript is not. `parseVtt` returns `[]` only for a file that
//      genuinely contains no cues — never as a way of reporting that it gave up.
//   2. **Inline tags are stripped**, voice tags included: `<v Jordan Hale>Welcome in` parses to
//      `Welcome in`, not `Jordan Hale: Welcome in`. The transcript renders as plain text, so the
//      markup would show literally and would also pollute the transcript search. Synthesising a
//      `Speaker:` prefix was the alternative and it is not ours to invent — CLAUDE.md: "Never add
//      features, screens, copy or UI the mockup doesn't have." Our own sessions are single-voice
//      ('with Jordan Hale' is already on the card), so nothing is lost today; if a multi-speaker
//      replay ever needs attribution it is a product decision plus a DECISIONS.md entry, not a
//      quiet change here.
//   3. **Stripping happens before entity decoding**, so `&lt;i&gt;` survives as the literal text
//      `<i>` while `<i>` is removed as markup. Decoding first would delete text an author escaped
//      on purpose.
//   4. **Times keep millisecond precision.** `parseVtt` sums integer milliseconds and divides once;
//      `toVtt` rounds back. So `parseVtt(toVtt(t))` deep-equals `t` for any transcript whose
//      entries carry text, which is the Gate 8 checklist item ("The WebVTT parser round-trips the
//      Marketing transcript fixture") and the central test in `test/vtt.test.ts`.
//
// Pure: no clock, no RNG, no DOM. `parseVtt` and `toVtt` are total over their declared inputs
// except for the documented throws, and neither mutates what it is given.

/**
 * One transcript entry: `[seconds, text]`. Structurally identical to a member of
 * `AIEmployee.transcript`, so a parsed transcript is assignable to the field without a cast.
 */
export type TranscriptCue = [number, string];

/** A transcript to serialise. Accepts `AIEmployee.transcript` and any readonly view of it. */
export type ReadonlyTranscript = readonly (readonly [number, string])[];

/**
 * Why a WebVTT document could not be parsed. `line` is the 1-based line number in the input, or 0
 * when the complaint is about the file as a whole (a missing header). The message already names the
 * line, so a route can surface `err.message` directly.
 */
export class VttError extends Error {
  line: number;
  constructor(msg: string, line = 0) {
    super(line > 0 ? `${msg} (line ${line})` : msg);
    this.name = 'VttError';
    this.line = line;
  }
}

// ---------------------------------------------------------------------------
// Timestamps
// ---------------------------------------------------------------------------

/**
 * `HH:MM:SS.mmm` or `MM:SS.mmm`, the two forms WebVTT defines. Hours are two **or more** digits
 * (the spec allows a long cohort recording to run past 99 h), minutes and seconds are two digits
 * each and below 60, and the fraction is exactly three digits.
 *
 * Deliberately strict in two places. A comma — `00:01:02,500`, the SRT separator that sloppy
 * converters leave behind — does not match, and neither does a one- or two-digit fraction. Both
 * throw instead of being guessed at, because guessing whether `.1` means 100 ms or 1 ms is how a
 * transcript ends up quietly 99 ms out on every line.
 */
const TIMESTAMP = /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/;

/** Total milliseconds, as an integer, or `null` when the token is not a WebVTT timestamp. */
function millisOf(token: string): number | null {
  const m = TIMESTAMP.exec(token);
  if (!m) return null;
  const [, h, mm, ss, ms] = m;
  return Number(h ?? '0') * 3_600_000 + Number(mm) * 60_000 + Number(ss) * 1_000 + Number(ms);
}

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** The inverse of {@link millisOf}: always the full `HH:MM:SS.mmm` form, hours never abbreviated. */
function stamp(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  return `${pad(Math.floor(ms / 3_600_000), 2)}:${pad(Math.floor(ms / 60_000) % 60, 2)}:${pad(Math.floor(ms / 1000) % 60, 2)}.${pad(ms % 1000, 3)}`;
}

// ---------------------------------------------------------------------------
// Cue text
// ---------------------------------------------------------------------------

/**
 * The three non-printing characters WebVTT names as entities, by char code rather than as a literal
 * or a \u escape — for the same reason as `BOM` below: an invisible character sitting inside a
 * string literal is one no reviewer can see and no diff can show.
 */
const NBSP = String.fromCharCode(0x00a0);
const LRM = String.fromCharCode(0x200e);
const RLM = String.fromCharCode(0x200f);

/**
 * The entities WebVTT defines for cue text. Decoded in one left-to-right pass, so `&amp;lt;`
 * becomes the literal `&lt;` rather than being decoded twice into `<`.
 */
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': NBSP,
  '&lrm;': LRM,
  '&rlm;': RLM,
};

/** Any `<…>` span: `<v Jordan Hale>`, `</v>`, `<i>`, `<c.yellow>`, a `<00:00:12.000>` cue timing. */
const TAG = /<[^>]*>/g;

/**
 * Cue payload to transcript text: tags out first (decision 2), then entities in (decision 3).
 *
 * A lone `<` with no closing `>` is left alone rather than swallowing the rest of the line — the
 * conformant spelling is `&lt;`, and eating text to the end of the line would be the silent loss
 * this module exists to prevent.
 */
const textOf = (payload: string): string =>
  payload.replace(TAG, '').replace(/&(?:amp|lt|gt|nbsp|lrm|rlm);/g, (e) => ENTITIES[e] ?? e);

/** The inverse. `>` is escaped too, so no payload line can ever contain the cue separator `-->`. */
const escapeText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/**
 * The byte-order mark, U+FEFF. Spelled with a char code rather than a `\u` escape so it cannot be
 * mistaken for ordinary text in a diff, and stripped by comparison rather than by a regex for the
 * same reason. Zoom's `.vtt` export opens with one.
 *
 * Measured, so nobody has to guess: this strip is belt-and-braces, not load-bearing. The header
 * check compares `lines[0].trim()`, and `String.prototype.trim` already treats U+FEFF as
 * whitespace, so a BOM parses correctly with or without this line — deleting it leaves the whole
 * suite green. It stays because "the first line is `WEBVTT`" should not quietly depend on a trim
 * absorbing a non-printing character, and because the next reader of `blocksOf` should find the BOM
 * handled where the other line-ending quirks are.
 */
const BOM = String.fromCharCode(0xfeff);

const stripBom = (s: string): string => (s.startsWith(BOM) ? s.slice(1) : s);

/** A run of non-blank lines, with `at` = the 1-based input line number of `lines[0]`. */
interface Block {
  lines: string[];
  at: number;
}

/**
 * Split a document into blocks on blank lines, normalising what real files arrive with: a UTF-8
 * BOM (Zoom writes one), CRLF or lone-CR endings, and runs of several blank lines, which separate
 * exactly as one does. A line of spaces or tabs counts as blank, per the spec.
 */
function blocksOf(vtt: string): Block[] {
  const lines = stripBom(vtt)
    .replace(/\r\n|\r/g, '\n')
    .split('\n');
  const out: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i] ?? '').trim() === '') continue;
    const at = i + 1;
    const body: string[] = [];
    while (i < lines.length && (lines[i] ?? '').trim() !== '') body.push(lines[i++] ?? '');
    out.push({ lines: body, at });
    // `i` now sits on the blank line that ended the block (or past the end); the loop steps over it.
  }
  return out;
}

/** The line index inside `block` that holds `-->`, or -1. Used both to find cues and to catch loss. */
const arrowAt = (block: Block): number => block.lines.findIndex((l) => l.includes('-->'));

/**
 * Every line index inside `block` that holds `-->`.
 *
 * `arrowAt` finds only the FIRST one, which is enough to locate a cue's timing line but blind to
 * the one shape that loses data silently: two cues with the blank line between them missing. The
 * second cue's timing line then sits inside the first cue's payload, and a parser that only looked
 * at the first arrow would return one cue carrying the other's timestamp as text — eleven cues for
 * a twelve-cue file, with nothing to show anything had gone wrong. Neither a cue payload nor a cue
 * identifier may contain `-->` under the spec, so a second arrow is always malformed input.
 *
 * Counted with multiplicity, so `00:00:01.000 --> 00:00:02.000 --> 00:00:03.000` is caught too —
 * the same blind spot on one line, where the trailing arrow would otherwise be swallowed as cue
 * settings. Each entry is the line index of one occurrence.
 */
const arrowsIn = (block: Block): number[] =>
  block.lines.flatMap((l, i) => Array.from({ length: l.split('-->').length - 1 }, () => i));

/** `NOTE`, `NOTE some comment`, `STYLE` and `REGION` open a block that carries no cue. */
function isMetadataBlock(block: Block): boolean {
  const head = (block.lines[0] ?? '').trim();
  return head === 'NOTE' || head.startsWith('NOTE ') || head.startsWith('NOTE\t') || head === 'STYLE' || head === 'REGION';
}

// ---------------------------------------------------------------------------

/**
 * A WebVTT document as `[seconds, text]` pairs, in file order — the shape
 * `AIEmployee.transcript` holds.
 *
 * Accepted, because providers emit all of it: the `WEBVTT` header with or without a trailing
 * title and with or without `Kind:`/`Language:` metadata lines; `NOTE`, `STYLE` and `REGION`
 * blocks; an optional cue identifier line before the timing line; both `HH:MM:SS.mmm` and
 * `MM:SS.mmm`; cue settings after the end timestamp (`line:0 align:start position:50%`), which are
 * ignored rather than parsed into the text; multi-line payloads, joined with `\n`; CRLF or CR
 * endings, a BOM and blank-line runs. Inline tags are stripped and entities decoded — see decisions
 * 2 and 3 at the top of this file.
 *
 * A cue whose payload is empty or whitespace-only is dropped: it carries no transcript line, and
 * `toVtt` drops such an entry in the same way, so the two stay inverse.
 *
 * **Throws {@link VttError}** rather than skipping, for: a missing or misspelled `WEBVTT` header; a
 * header not separated from the first cue by a blank line; a block with no `-->` at all; a block
 * whose `-->` is not on its first or second line; an unparsable start or end timestamp; and a
 * `NOTE`/`STYLE`/`REGION` block that contains a `-->` line, which means a cue was glued onto a
 * comment and would otherwise vanish. Every one of those is a cue this function would have had to
 * lose, and the whole point of the strictness is that it never loses one.
 *
 * `[]` is therefore a real answer — a file with a header and no cues — and never a report of
 * failure.
 */
export function parseVtt(vtt: string): TranscriptCue[] {
  if (typeof vtt !== 'string') throw new VttError('not a WebVTT document: expected a string');

  const blocks = blocksOf(vtt);
  const header = blocks[0];
  const head = (header?.lines[0] ?? '').trim();
  // The spec allows `WEBVTT`, `WEBVTT<space|tab>anything` and nothing else on that first line.
  if (!header || !(head === 'WEBVTT' || head.startsWith('WEBVTT ') || head.startsWith('WEBVTT\t')))
    throw new VttError('not a WebVTT document: the first line must be the WEBVTT header');
  // Without the blank line the first cue is part of the header block, and a lenient parser would
  // drop it without a word. The rest of the header block is metadata (`Kind:`, `Language:`,
  // `X-TIMESTAMP-MAP`) and is ignored.
  if (arrowAt(header) >= 0)
    throw new VttError('malformed WebVTT: a blank line must separate the WEBVTT header from the first cue', header.at);

  const out: TranscriptCue[] = [];

  for (const block of blocks.slice(1)) {
    const arrow = arrowAt(block);

    if (isMetadataBlock(block)) {
      // A comment may not contain `-->`; if one does, a cue lost its blank line and is hiding here.
      if (arrow >= 0)
        throw new VttError(
          `malformed WebVTT: a ${(block.lines[0] ?? '').trim().split(/[\s\t]/)[0]} block contains a cue timing line`,
          block.at + arrow,
        );
      continue;
    }

    if (arrow < 0) throw new VttError('malformed WebVTT: a block with no "-->" timing line', block.at);
    // Line 0 is the timing line, or line 1 is and line 0 is the cue identifier. Anything further
    // down means the block is not a cue at all, so refusing to read it keeps the error honest.
    if (arrow > 1)
      throw new VttError('malformed WebVTT: the "-->" timing line must be the first or second line of a cue', block.at + arrow);
    // A SECOND arrow below the payload start is the shape that used to lose a cue: two cues with
    // the blank line between them missing parsed as one, the second one's timing line swallowed as
    // text. Refuse the block instead, which is what this function's documented throw-list promises.
    const arrows = arrowsIn(block);
    if (arrows.length > 1)
      throw new VttError(
        arrows[1] === arrows[0]
          ? 'malformed WebVTT: two "-->" on one cue timing line'
          : 'malformed WebVTT: a second "-->" inside a cue — a blank line between two cues is missing',
        block.at + (arrows[1] ?? 0),
      );

    const timing = block.lines[arrow] ?? '';
    const split = timing.indexOf('-->');
    const startMs = millisOf(timing.slice(0, split).trim());
    // Everything after the end timestamp is cue settings, which this transcript has no use for.
    const endMs = millisOf(timing.slice(split + 3).trim().split(/\s+/)[0] ?? '');
    if (startMs === null || endMs === null)
      throw new VttError(`malformed WebVTT: unreadable cue timing "${timing.trim()}"`, block.at + arrow);

    // Payload lines are trimmed and joined with `\n`; a line that is empty after trimming cannot
    // exist inside a cue (it would have ended the block), so there is nothing to preserve.
    const text = block.lines
      .slice(arrow + 1)
      .map((l) => textOf(l).trim())
      .filter((l) => l !== '')
      .join('\n');

    if (text !== '') out.push([startMs / 1000, text]);
  }

  return out;
}

/**
 * How long the final cue is given, in seconds. Every other cue ends where the next one starts, but
 * the transcript shape records no durations, so the last line needs an invented end. WebVTT
 * requires an end strictly after the start, and `parseVtt` reads only the start, so the value is
 * arbitrary; five seconds is roughly a spoken sentence and keeps the file plausible in a player
 * that honours cue ends.
 */
const TAIL_CUE_SEC = 5;

/**
 * The inverse of {@link parseVtt}: a transcript as a conformant WebVTT document.
 *
 * Order is preserved exactly, never sorted, because `parseVtt(toVtt(t))` must deep-equal `t`.
 * Each cue ends where the next one starts, or {@link TAIL_CUE_SEC} later when that would not be
 * strictly after its own start (the last entry, or a duplicated timestamp). No cue identifiers are
 * written — `parseVtt` ignores them, and the file is smaller without.
 *
 * Text is escaped (`&`, `<` and `>`), so a line containing `-->` or markup survives the round trip
 * as literal text. Blank payload lines are dropped and an entry with no text at all is skipped,
 * since WebVTT ends a cue at the first blank line and `parseVtt` drops an empty cue to match.
 *
 * **Throws {@link VttError}** for a time that is negative or not finite. A transcript keyed to a
 * nonsense second is a bug upstream, and `00:00:00.000` would hide it.
 */
export function toVtt(transcript: ReadonlyTranscript): string {
  const lines: string[] = ['WEBVTT', ''];

  transcript.forEach(([t, text], i) => {
    if (!Number.isFinite(t) || t < 0) throw new VttError(`cannot serialise a transcript cue at ${String(t)} seconds`);

    const payload = text
      .split('\n')
      .map((l) => escapeText(l).trim())
      .filter((l) => l !== '');
    if (payload.length === 0) return;

    const next = transcript[i + 1]?.[0];
    const end = next !== undefined && next > t ? next : t + TAIL_CUE_SEC;
    lines.push(`${stamp(t)} --> ${stamp(end)}`, ...payload, '');
  });

  return lines.join('\n');
}
