// Gate 8: the WebVTT suite — docs/phases/08-integrations.md § 8.3.
//
// The Gate 8 checklist item is one line: "The WebVTT parser round-trips the Marketing transcript
// fixture." That is the first test below and it is the one that matters, because `publishReplay`
// writes whatever this parser returns straight into `AIEmployee.transcript`, which is what a
// learner searches when they go back to a replay for something that was said. A parser that drops
// a cue is invisible everywhere else: the admin console shows a transcript, the player shows
// captions, and only the missing line is wrong.
//
// So the rest of the file is mostly about loss. Each case names the real-world producer that emits
// the shape, and the malformed cases pin the documented contract — `parseVtt` THROWS, with a line
// number, rather than returning a shorter transcript. The one answer that would be wrong is a
// silent `[]`, and `never answers a broken file with an empty transcript` asserts exactly that.
//
// Nothing here needs a database, a video host or a provider account: § 8.3's parsing is a pure core
// function, which is why it can ship while the routes that will call it cannot.
import { describe, it, expect } from 'vitest';
import * as core from '../src';
import type { AIEmployee, TranscriptCue } from '../src';

const { parseVtt, toVtt, VttError } = core;

/** The Gate 8 fixture: Session 1, 58:24, twelve transcript lines. */
const marketing = (): AIEmployee => core.seed('live').modules.find((m) => m.id === 'marketing')!;

/** Every seeded AI Employee that actually has a transcript (Marketing and Sales). */
const withTranscript = (): AIEmployee[] => core.seed('live').modules.filter((m) => m.transcript.length > 0);

/**
 * A minimal document, so each case below shows only the shape it is about: a bare `WEBVTT` header
 * and then each block separated by one blank line, which is how the line numbers in the malformed
 * cases are counted (line 1 is the header, line 2 blank, line 3 the first block's first line).
 */
const doc = (...blocks: string[]): string => ['WEBVTT', '', ...blocks.flatMap((b) => [b, ''])].join('\n');

// ---------------------------------------------------------------------------
// The Gate 8 checklist item
// ---------------------------------------------------------------------------

describe('§8.3 the Marketing transcript fixture round-trips @g8', () => {
  it('parseVtt(toVtt(t)) is the identical array, cue for cue @g8', () => {
    const t = marketing().transcript;
    // Guards the fixture itself: if the seed's Marketing transcript is ever edited down, the
    // round trip below would still pass on a shorter array and prove nothing.
    expect(t).toHaveLength(12);
    expect(t[0]).toEqual([
      12,
      "Welcome in. Today we're hiring your first AI employee, and by the end of this session it will be working for you.",
    ]);

    const back: TranscriptCue[] = parseVtt(toVtt(t));

    // `toEqual` on the whole array, not a length check plus spot checks: this is the assertion that
    // catches a dropped cue, a reordered cue, a time that came back 1 ms out and text that lost a
    // curly apostrophe to an over-eager entity pass.
    expect(back).toEqual(t);
  });

  it('serialises that fixture as a conformant document a player would accept @g8', () => {
    const out = toVtt(marketing().transcript);
    const lines = out.split('\n');

    expect(lines[0]).toBe('WEBVTT');
    expect(lines[1]).toBe('');
    // Cue 1 starts at 12 s and ends where cue 2 begins (95 s), in the full HH:MM:SS.mmm form.
    expect(lines[2]).toBe('00:00:12.000 --> 00:01:35.000');
    expect(lines[3]).toBe(
      "Welcome in. Today we're hiring your first AI employee, and by the end of this session it will be working for you.",
    );
    expect(lines[4]).toBe('');
    // Twelve cues, no cue identifiers, and nothing else that looks like a timing line.
    expect(out.match(/-->/g)).toHaveLength(12);
    // The last cue is at 3260 s and gets the documented five-second tail.
    expect(out).toContain('00:54:20.000 --> 00:54:25.000');
  });

  it('round-trips every seeded transcript, not just the one the checklist names @g8', () => {
    const modules = withTranscript();
    expect(modules.map((m) => m.id)).toEqual(['marketing', 'sales']);
    for (const m of modules) expect(parseVtt(toVtt(m.transcript))).toEqual(m.transcript);
  });

  it('keeps millisecond precision through both directions @g8', () => {
    // 12.345 s is the case floating point could break: `toVtt` multiplies by 1000 and rounds,
    // `parseVtt` sums integer milliseconds and divides once, so the two must land on the same
    // double. A naive `h*3600 + m*60 + s + ms/1000` sum does not.
    const t: TranscriptCue[] = [
      [0, 'zero'],
      [12.345, 'twelve and a bit'],
      [3661.999, 'past the hour'],
    ];
    expect(toVtt(t)).toContain('00:00:12.345 --> 01:01:01.999');
    expect(parseVtt(toVtt(t))).toEqual(t);
  });
});

// ---------------------------------------------------------------------------
// Headers and non-cue blocks
// ---------------------------------------------------------------------------

describe('§8.3 the WEBVTT header and the blocks that carry no cue @g8', () => {
  const ONE = ['00:00:01.000 --> 00:00:02.000', 'only line'].join('\n');

  it('accepts a bare header, a header with a trailing title, and header metadata @g8', () => {
    // All three are conformant and all three are emitted in the wild: `WEBVTT` from ffmpeg,
    // `WEBVTT - Session 1` from hand-written files, the `Kind:`/`Language:` pair from browsers
    // and HLS packagers.
    expect(parseVtt(['WEBVTT', '', ONE].join('\n'))).toEqual([[1, 'only line']]);
    expect(parseVtt(['WEBVTT - Session 1 · Marketing', '', ONE].join('\n'))).toEqual([[1, 'only line']]);
    expect(parseVtt(['WEBVTT', 'Kind: captions', 'Language: en-US', '', ONE].join('\n'))).toEqual([[1, 'only line']]);
    expect(parseVtt(['WEBVTT', 'X-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:900000', '', ONE].join('\n'))).toEqual([
      [1, 'only line'],
    ]);
  });

  it('returns [] for a header with no cues, and that is a real answer @g8', () => {
    expect(parseVtt('WEBVTT')).toEqual([]);
    expect(parseVtt('WEBVTT\n')).toEqual([]);
    expect(parseVtt('WEBVTT\n\nNOTE nothing was said\n')).toEqual([]);
  });

  it('skips NOTE, STYLE and REGION blocks without reading them as cues @g8', () => {
    const out = parseVtt(
      doc(
        'NOTE\nThis replay was imported from Zoom.\nTwo lines of comment.',
        'STYLE\n::cue { color: #fff }',
        'REGION\nid:speaker\nwidth:40%',
        ONE,
        'NOTE a trailing comment',
      ),
    );
    // One cue in, one cue out: the comment body never becomes transcript text, and the CSS inside
    // STYLE never becomes a line a learner can search.
    expect(out).toEqual([[1, 'only line']]);
  });

  it('does not mistake a cue identifier of "NOTES" for a comment block @g8', () => {
    // `NOTE` opens a comment only as the whole word; `NOTES` is just an identifier.
    expect(parseVtt(doc(['NOTES', '00:00:03.000 --> 00:00:04.000', 'kept'].join('\n')))).toEqual([[3, 'kept']]);
  });
});

// ---------------------------------------------------------------------------
// Cue shapes
// ---------------------------------------------------------------------------

describe('§8.3 cue identifiers, timestamp forms, settings and payloads @g8', () => {
  it('ignores a cue identifier before the timing line, numeric or named @g8', () => {
    // Numeric identifiers come from SRT conversions, named ones from editing tools.
    expect(parseVtt(doc(['1', '00:00:05.000 --> 00:00:06.000', 'first'].join('\n')))).toEqual([[5, 'first']]);
    expect(parseVtt(doc(['intro-line', '00:00:05.000 --> 00:00:06.000', 'first'].join('\n')))).toEqual([[5, 'first']]);
  });

  it('reads both HH:MM:SS.mmm and MM:SS.mmm @g8', () => {
    expect(parseVtt(doc(['01:02:03.400 --> 01:02:04.000', 'long form'].join('\n')))).toEqual([[3723.4, 'long form']]);
    expect(parseVtt(doc(['02:03.400 --> 02:04.000', 'short form'].join('\n')))).toEqual([[123.4, 'short form']]);
    // Hours may run past two digits for a very long recording.
    expect(parseVtt(doc(['100:00:00.000 --> 100:00:01.000', 'day five'].join('\n')))).toEqual([[360_000, 'day five']]);
  });

  it('ignores cue settings instead of parsing them into the text @g8', () => {
    // This is the case that would be visible to a learner: `line:0 align:start` appended to a
    // transcript line, or a caption reading "position:50%".
    const out = parseVtt(
      doc(['00:00:07.000 --> 00:00:08.000 line:0 align:start position:50% size:80% vertical:rl', 'clean text'].join('\n')),
    );
    expect(out).toEqual([[7, 'clean text']]);
    expect(out[0]?.[1]).not.toContain('align');
  });

  it('joins a multi-line payload with \\n and keeps every line @g8', () => {
    const out = parseVtt(doc(['00:00:09.000 --> 00:00:12.000', 'first half', 'second half', 'third half'].join('\n')));
    expect(out).toEqual([[9, 'first half\nsecond half\nthird half']]);
    // And a multi-line entry survives serialisation, because each line becomes a payload line.
    expect(parseVtt(toVtt(out))).toEqual(out);
  });

  it('drops a cue whose payload is empty or only whitespace @g8', () => {
    // An empty cue carries no transcript line, so there is nothing to lose. `toVtt` drops an empty
    // entry the same way, which is what keeps the two functions inverse.
    expect(parseVtt(doc('00:00:01.000 --> 00:00:02.000', ['00:00:03.000 --> 00:00:04.000', 'kept'].join('\n')))).toEqual([
      [3, 'kept'],
    ]);
    expect(toVtt([[1, ''], [2, '   '], [3, 'kept']])).toBe(['WEBVTT', '', '00:00:03.000 --> 00:00:08.000', 'kept', ''].join('\n'));
  });

  it('survives CRLF endings, a lone CR, a BOM and runs of blank lines @g8', () => {
    // Zoom writes a BOM, Windows tooling writes CRLF, and an old Mac export writes lone CRs. All
    // three must parse identically to the LF form, or an imported replay loses its whole transcript.
    // A real U+FEFF, by char code: written as a six-character escape this fixture can degrade into
    // the literal text of the escape itself and leave the BOM case untested while still passing.
    const BOM = String.fromCharCode(0xfeff);
    const crlf = `${BOM}WEBVTT\r\n\r\n\r\n00:00:01.000 --> 00:00:02.000\r\none\r\n\r\n\r\n\r\n00:00:02.000 --> 00:00:03.000\r\ntwo\r\n`;
    const cr = `${BOM}WEBVTT\r\r00:00:01.000 --> 00:00:02.000\rone\r\r00:00:02.000 --> 00:00:03.000\rtwo\r`;
    const expected: TranscriptCue[] = [
      [1, 'one'],
      [2, 'two'],
    ];
    expect(parseVtt(crlf)).toEqual(expected);
    expect(parseVtt(cr)).toEqual(expected);
    // A line of spaces counts as blank, per the spec, so it separates rather than joins.
    expect(parseVtt('WEBVTT\n   \n00:00:01.000 --> 00:00:02.000\none\n')).toEqual([[1, 'one']]);
  });
});

// ---------------------------------------------------------------------------
// Inline tags and entities — decisions 2 and 3 in src/vtt.ts
// ---------------------------------------------------------------------------

describe('§8.3 inline tags are stripped and entities decoded @g8', () => {
  it('strips voice, class, style and timestamp tags down to the spoken text @g8', () => {
    const out = parseVtt(
      doc(
        [
          '00:00:01.000 --> 00:00:04.000',
          '<v Jordan Hale>Start by creating a <i>Claude Project</i>.</v>',
          '<c.yellow>Name it after the job</c>, <b>not</b> the tool.',
          '<00:00:03.000><c>Karaoke timing goes too.</c>',
        ].join('\n'),
      ),
    );
    // The speaker name goes with the tag. That is the documented decision: the transcript renders
    // as plain text and "Jordan Hale: " would be copy the mockup does not have.
    expect(out).toEqual([
      [1, ['Start by creating a Claude Project.', 'Name it after the job, not the tool.', 'Karaoke timing goes too.'].join('\n')],
    ]);
    expect(out[0]?.[1]).not.toContain('Jordan Hale');
    expect(out[0]?.[1]).not.toContain('<');
  });

  it('decodes the WebVTT entities, and only after stripping @g8', () => {
    const out = parseVtt(
      doc(
        [
          '00:00:01.000 --> 00:00:02.000',
          'Fair&nbsp;Housing &amp; the MLS: 5 &lt; 10 &gt; 2',
          'Escaped markup stays text: &lt;i&gt;',
          '&amp;lt; is a literal &lt;, not a tag',
        ].join('\n'),
      ),
    );
    // U+00A0 by char code, for the same reason as `BOM` in src/vtt.ts: an invisible character in
    // an expectation is one nobody can review.
    const NBSP = String.fromCharCode(0x00a0);
    expect(out[0]?.[1]).toBe(
      [`Fair${NBSP}Housing & the MLS: 5 < 10 > 2`, 'Escaped markup stays text: <i>', '&lt; is a literal <, not a tag'].join(
        '\n',
      ),
    );
  });

  it('escapes &, < and > on the way out, so markup-looking text round-trips @g8', () => {
    // The `>` escape is what stops a payload line from ever containing `-->`, which is invalid
    // WebVTT and would turn a transcript line into a second timing line in a stricter parser.
    const t: TranscriptCue[] = [
      [1, 'Use <i>italics</i> & mean it'],
      [2, 'The arrow --> points right'],
    ];
    const out = toVtt(t);
    expect(out).toContain('Use &lt;i&gt;italics&lt;/i&gt; &amp; mean it');
    expect(out).toContain('The arrow --&gt; points right');
    expect(out.match(/-->/g)).toHaveLength(2); // the two timing lines, and nothing else
    expect(parseVtt(out)).toEqual(t);
  });

  it('leaves a lone "<" alone rather than swallowing the rest of the line @g8', () => {
    // A greedy `<.*` would eat "10 and rising" and nobody would know.
    expect(parseVtt(doc(['00:00:01.000 --> 00:00:02.000', 'Reply in < 10 and rising'].join('\n')))).toEqual([
      [1, 'Reply in < 10 and rising'],
    ]);
  });
});

// ---------------------------------------------------------------------------
// Malformed input — the documented contract is: throw, never shorten
// ---------------------------------------------------------------------------

describe('§8.3 malformed input throws VttError with a line number @g8', () => {
  it('rejects a document with no WEBVTT header @g8', () => {
    expect(() => parseVtt('')).toThrow(VttError);
    expect(() => parseVtt('00:00:01.000 --> 00:00:02.000\nno header')).toThrow(/first line must be the WEBVTT header/);
    // Case matters, and so does the missing separator: `WEBVTTX` is not the header.
    expect(() => parseVtt('webvtt\n\n00:00:01.000 --> 00:00:02.000\nx')).toThrow(VttError);
    expect(() => parseVtt('WEBVTTX\n\n00:00:01.000 --> 00:00:02.000\nx')).toThrow(VttError);
  });

  it('rejects a header glued to the first cue, which would otherwise swallow it @g8', () => {
    // The whole first block would be read as header metadata, and cue 1 would vanish silently.
    const err = catchVtt(() => parseVtt('WEBVTT\n00:00:01.000 --> 00:00:02.000\nfirst\n'));
    expect(err.message).toMatch(/blank line must separate/);
    expect(err.line).toBe(1);
  });

  it('rejects two cues that lost the blank line between them, rather than merging them @g8', () => {
    // The shape that used to lose data silently, and the reason this module exists: the second
    // cue's timing line sat inside the first cue's payload, so `parseVtt` returned ONE cue whose
    // text was "first\n00:00:03.000 --> 00:00:04.000\nsecond". Eleven cues for a twelve-cue file,
    // with nothing on screen to suggest a seek point had gone. A header glued to cue 1 and a NOTE
    // glued to a cue were already guarded; this third, structurally identical shape was not.
    const err = catchVtt(() =>
      parseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nfirst\n00:00:03.000 --> 00:00:04.000\nsecond\n'),
    );
    expect(err.message).toMatch(/a second "-->" inside a cue/);
    expect(err.line).toBe(5);
  });

  it('rejects two timing arrows on one line @g8', () => {
    // The same blind spot within a single line. It used to parse as [[1, 'x']], the trailing
    // arrow swallowed as cue settings — the start time happened to be right, which is exactly
    // what makes it the kind of bug nobody finds.
    const err = catchVtt(() => parseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000 --> 00:00:03.000\nx\n'));
    expect(err.message).toMatch(/two "-->" on one cue timing line/);
    expect(err.line).toBe(3);
  });

  it('rejects a block with no timing line at all @g8', () => {
    const err = catchVtt(() => parseVtt(doc(['00:00:01.000 --> 00:00:02.000', 'fine'].join('\n'), 'stray text\nmore stray text')));
    expect(err.message).toMatch(/no "-->" timing line/);
    expect(err.line).toBe(6);
  });

  it('rejects a timing line buried below a cue identifier @g8', () => {
    const err = catchVtt(() => parseVtt(doc(['id', 'something else', '00:00:01.000 --> 00:00:02.000', 'text'].join('\n'))));
    expect(err.message).toMatch(/must be the first or second line/);
    expect(err.line).toBe(5);
  });

  it('rejects an unreadable timestamp instead of guessing at it @g8', () => {
    // SRT commas, a two-digit fraction, a missing fraction, minutes over 59 and a missing end.
    for (const timing of [
      '00:00:01,000 --> 00:00:02,000',
      '00:00:01.00 --> 00:00:02.00',
      '00:00:01 --> 00:00:02',
      '00:75:01.000 --> 00:75:02.000',
      '00:00:01.000 -->',
      '--> 00:00:02.000',
    ]) {
      const err = catchVtt(() => parseVtt(doc([timing, 'text'].join('\n'))));
      expect(err.message).toMatch(/unreadable cue timing/);
      expect(err.line).toBe(3);
    }
  });

  it('rejects a NOTE block that has a cue timing line hiding in it @g8', () => {
    // This is the exact shape of a lost line: the blank line after the comment went missing, so a
    // lenient parser skips the comment block and the cue inside it with no complaint.
    const err = catchVtt(() => parseVtt(doc('NOTE imported from Zoom\n00:00:01.000 --> 00:00:02.000\nfirst')));
    expect(err.message).toMatch(/NOTE block contains a cue timing line/);
    expect(err.line).toBe(4);
  });

  it('never answers a broken file with an empty transcript @g8', () => {
    // The one wrong answer. Each of these has readable text in it, so returning [] would report
    // "this replay has no transcript" about a file that plainly has one.
    for (const bad of [
      '00:00:01.000 --> 00:00:02.000\nsomething was said',
      'WEBVTT\n00:00:01.000 --> 00:00:02.000\nsomething was said',
      doc('just a paragraph of text'),
      doc('00:00:01,000 --> 00:00:02,000\nsomething was said'),
    ]) {
      expect(() => parseVtt(bad)).toThrow(VttError);
    }
  });

  it('refuses a non-string, which is what a JSON request body can hand a route @g8', () => {
    // TypeScript rules this out, but `transcriptVtt?` arrives from a JSON body, so the guard is
    // reachable from JavaScript. Without it a `null` throws a bare TypeError from inside the
    // splitter, with no line number and nothing saying the input was not a WebVTT document.
    for (const bad of [undefined, null, 42, {}, ['WEBVTT']]) {
      expect(() => parseVtt(bad as unknown as string)).toThrow(/expected a string/);
    }
  });

  it('refuses to serialise a cue at a negative or non-finite second @g8', () => {
    expect(() => toVtt([[-1, 'before the start']])).toThrow(/cannot serialise a transcript cue/);
    expect(() => toVtt([[Number.NaN, 'nowhere']])).toThrow(VttError);
    expect(() => toVtt([[Number.POSITIVE_INFINITY, 'forever']])).toThrow(VttError);
  });
});

// ---------------------------------------------------------------------------
// Purity — packages/core is pure, and these two are no exception
// ---------------------------------------------------------------------------

describe('§8.3 both directions are pure @g8', () => {
  it('does not mutate the transcript it serialises @g8', () => {
    const t = marketing().transcript;
    const before = structuredClone(t);
    toVtt(t);
    expect(t).toEqual(before);
  });

  it('keeps file order, and an out-of-order transcript proves it @g8', () => {
    // The seed transcript is already ascending, so the test above cannot fail:
    // `transcript.sort((a, b) => a[0] - b[0])` inside `toVtt` — the most plausible well-meaning
    // change, and the exact one this module says must never happen because `parseVtt(toVtt(t))`
    // has to deep-equal `t` — is a no-op on sorted input and left the whole suite green. This
    // fixture is descending, so a sort is visible both in the output and in the caller's array.
    const descending: [number, string][] = [
      [9, 'last in time, first in the file'],
      [4, 'earlier in time, later in the file'],
    ];
    const before = structuredClone(descending);

    const vtt = toVtt(descending);
    expect(vtt.indexOf('last in time')).toBeLessThan(vtt.indexOf('earlier in time'));
    expect(parseVtt(vtt)).toEqual(descending);
    expect(descending).toEqual(before);
  });

  it('is deterministic: the same input twice gives deep-equal output @g8', () => {
    const t = marketing().transcript;
    expect(toVtt(t)).toBe(toVtt(t));
    const vtt = toVtt(t);
    expect(parseVtt(vtt)).toEqual(parseVtt(vtt));
  });

  it('hands back a fresh array of fresh tuples every call @g8', () => {
    const vtt = toVtt(marketing().transcript);
    const a = parseVtt(vtt);
    const b = parseVtt(vtt);
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
  });
});

/** `expect(...).toThrow` cannot read `err.line`, and the line number is half the contract. */
function catchVtt(run: () => unknown): core.VttError {
  try {
    run();
  } catch (e) {
    expect(e).toBeInstanceOf(VttError);
    return e as core.VttError;
  }
  throw new Error('expected parseVtt to throw a VttError');
}
