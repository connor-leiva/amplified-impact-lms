// The 30-day authority sprint as an iCalendar file, for /ai101's "Apple or Outlook" link.
// DECISIONS.md D-032.
//
// SERVED, NOT GENERATED IN THE BROWSER. iOS offers "Add to Calendar" for a `text/calendar` response
// it navigates to; it does nothing useful with a blob URL. So this is a real URL with a real content
// type, `GET /ai101/carousel-sprint.ics`, registered beside the page (routes/ai101.ts).
//
// FLOATING TIMES. Every DTSTART and DTEND is a local time with no `Z` and no TZID, on purpose: 9:00 AM
// means 9:00 AM wherever the agent lives, including across the November 1 clock change. A UTC time
// would put the block at 3 AM for someone in Honolulu, and one TZID would be wrong for everyone else.
//
// RFC 5545, BY HAND. No iCalendar library (no new dependencies): the format is lines, and the two rules
// that matter are the ones applied below — CRLF line endings, and lines folded at 75 octets with a
// single leading space on each continuation. `apps/api/test/ai101.test.ts` unfolds the file and
// compares it with the logical content, line for line.

const CRLF = '\r\n';
/** RFC 5545 § 3.1: "Lines of text SHOULD NOT be longer than 75 octets, excluding the line break." */
const FOLD_OCTETS = 75;

/** The four Mondays, one pillar each: the same rotation the page shows. */
const WEEKS = [
  { n: 1, date: '20261012', pillar: 'Market' },
  { n: 2, date: '20261019', pillar: 'Method' },
  { n: 3, date: '20261026', pillar: 'Me' },
  { n: 4, date: '20261102', pillar: 'Market' },
] as const;

/** DTSTAMP is when the file was written, fixed, so every request serves identical bytes. */
const DTSTAMP = '20261007T120000Z';

/**
 * The file's logical lines, before folding. The DESCRIPTION's commas are escaped (`\,`), as TEXT
 * values require; the URL in it has no characters that need escaping.
 */
export function sprintCalendarLines(): string[] {
  const events = WEEKS.flatMap(({ n, date, pillar }) => [
    'BEGIN:VEVENT',
    `UID:ai101-sprint-week${n}-2026@amplifiedimpact.io`,
    `DTSTAMP:${DTSTAMP}`,
    `DTSTART:${date}T090000`,
    `DTEND:${date}T093000`,
    `SUMMARY:Carousel Creator: ${pillar} week`,
    `DESCRIPTION:30-minute approval block. Open your Carousel Creator Project at https://claude.ai/projects\\, send one ${pillar} idea\\, approve the slide copy\\, then post. Track conversations started\\, not likes.`,
    'END:VEVENT',
  ]);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Amplified Impact//AI 101 Carousel Sprint//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ];
}

/**
 * Folds one logical line: the first physical line is at most 75 octets, and each continuation is a
 * space plus at most 74 more. Counted in UTF-8 octets, never splitting a multi-byte character — every
 * line here is ASCII today, but the rule is octets, not characters.
 */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  let limit = FOLD_OCTETS;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, 'utf8');
    if (octets + size > limit) {
      parts.push(current);
      current = ' ';
      octets = 1;
      limit = FOLD_OCTETS;
    }
    current += ch;
    octets += size;
  }
  parts.push(current);
  return parts.join(CRLF);
}

/** The file as served: every line folded, CRLF after every line including the last. */
export const SPRINT_ICS = sprintCalendarLines().map(foldLine).join(CRLF) + CRLF;

/** Its URL, which content.ts's "Apple or Outlook" link points at. */
export const SPRINT_ICS_PATH = '/ai101/carousel-sprint.ics';
