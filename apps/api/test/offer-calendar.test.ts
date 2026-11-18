// The welcome page's calendar files (Ampy's offer-pages brief, Nov 11) and the tokens that link them.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUILDS_ICS_URL, OFFICE_HOURS_ICS_URL, buildsIcs, chicagoStamp, officeHoursIcs } from '../src/routes/offer-calendar';
import { curriculumSeed } from '@ai/core/seed/curriculum';
import { welcomeValues } from '../src/routes/offer';
import { readOfferConfig } from '../src/billing/config';

// The files are built from the cohort's sessions as the database holds them (D-173); these are the
// seed's, which is what a database the seed made holds until staff edit a session.
const SEEDED = curriculumSeed();
const INSTRUCTOR = new Map(SEEDED.modules.map((m) => [m.id, m.instructor]));
const BUILDS_ICS = buildsIcs(SEEDED.sessions, (s) => INSTRUCTOR.get(s.moduleId!));
const OFFICE_HOURS_ICS = officeHoursIcs(SEEDED.sessions);

/** RFC 5545 unfolding: a CRLF followed by one space joins the next line on. */
const unfold = (ics: string): string[] => ics.replace(/\r\n /g, '').split('\r\n').filter(Boolean);
const events = (ics: string) => {
  const out: Record<string, string>[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of unfold(ics)) {
    if (line === 'BEGIN:VEVENT') cur = {};
    else if (line === 'END:VEVENT') {
      out.push(cur!);
      cur = null;
    } else if (cur) {
      const i = line.indexOf(':');
      cur[line.slice(0, i)] = line.slice(i + 1);
    }
  }
  return out;
};

const BUILDS = ['20261202', '20261209', '20261216', '20270106', '20270113', '20270120', '20270127', '20270203'];
const THURSDAYS = ['20261203', '20261210', '20261217', '20270107', '20270114', '20270121', '20270128', '20270204'];

describe('the builds calendar (/calendar/builds.ics)', () => {
  const ev = events(BUILDS_ICS);

  it('has the eight Wednesday builds, 1:00 to 2:30 PM Central (90 minutes), and no others', () => {
    expect(ev.map((e) => e['DTSTART;TZID=America/Chicago'])).toEqual(BUILDS.map((d) => `${d}T130000`));
    expect(ev.map((e) => e['DTEND;TZID=America/Chicago'])).toEqual(BUILDS.map((d) => `${d}T143000`));
    for (const d of BUILDS) expect(new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T12:00:00Z`).getUTCDay(), d).toBe(3);
  });

  it('names each as an Amplified AI Accelerator live build, with Connor Leiva', () => {
    expect(ev[0]!.SUMMARY).toBe('Amplified AI Accelerator Live Build\\, Week 1: Lead-Source ROI');
    expect(ev[1]!.SUMMARY).toBe('Amplified AI Accelerator Live Build\\, Week 2: Morning Brief');
    expect(ev.every((e) => e.DESCRIPTION!.includes('Connor Leiva'))).toBe(true);
  });
});

describe('the office hours calendar (/calendar/office-hours.ics)', () => {
  const ev = events(OFFICE_HOURS_ICS);

  it('has the eight Thursdays, 1:00 to 2:00 PM Central (60 minutes), and no others', () => {
    expect(ev.map((e) => e['DTSTART;TZID=America/Chicago'])).toEqual(THURSDAYS.map((d) => `${d}T130000`));
    expect(ev.map((e) => e['DTEND;TZID=America/Chicago'])).toEqual(THURSDAYS.map((d) => `${d}T140000`));
  });

  it('titles Dec 10 and Dec 17 as the goal planning sessions, on the same hour, not a second one', () => {
    expect(ev[1]!.SUMMARY).toBe('Year-End AI Goal Planning Session');
    expect(ev[1]!.DESCRIPTION).toMatch(/Every buyer is invited.*short segment of this call/);
    expect(ev[2]!.SUMMARY).toBe('Second Goal Planning Session\\, Agents Invited');
    expect(ev[2]!.DESCRIPTION).toMatch(/agents are invited.*short segment of this call/);
    expect(ev.filter((e) => e.SUMMARY === 'Amplified Impact Office Hours')).toHaveLength(6);
  });
});

describe('both files', () => {
  it('skip the holidays: nothing on Dec 23, 24, 30 or 31', () => {
    for (const ics of [BUILDS_ICS, OFFICE_HOURS_ICS]) expect(ics).not.toMatch(/2026122[34]|2026123[01]/);
  });

  it('carry no join link: no Zoom or Meet URL, no "TBA", no URL at all; the link comes by email and is in the LMS', () => {
    for (const ics of [BUILDS_ICS, OFFICE_HOURS_ICS]) {
      expect(ics).not.toMatch(/zoom|meet\.google|TBA|https?:\/\//i);
      expect(unfold(ics).filter((l) => l.startsWith('DESCRIPTION:')).every((l) => l.includes('learn.amplifiedimpact.io'))).toBe(true);
    }
  });

  it('are valid iCalendar: Central time with its VTIMEZONE, CRLF lines folded at 75 octets, a stable UID each', () => {
    for (const ics of [BUILDS_ICS, OFFICE_HOURS_ICS]) {
      const lines = ics.split('\r\n');
      expect(ics.endsWith('\r\n')).toBe(true);
      expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
      expect(lines.every((l) => Buffer.byteLength(l, 'utf8') <= 75)).toBe(true);
      const logical = unfold(ics);
      expect(logical.slice(0, 2)).toEqual(['BEGIN:VCALENDAR', 'VERSION:2.0']);
      expect(logical).toContain('BEGIN:VTIMEZONE');
      expect(logical).toContain('TZID:America/Chicago');
      expect(logical.at(-1)).toBe('END:VCALENDAR');
      const uids = events(ics).map((e) => e.UID);
      expect(new Set(uids).size).toBe(8);
      expect(uids.every((u) => u!.endsWith('@amplifiedimpact.io'))).toBe(true);
    }
  });
});

describe('the files are the sessions the database holds (D-173)', () => {
  // Captured from main's served files, whose every line ends in CRLF (RFC 5545). The repository stores
  // text with LF (.gitattributes: `* text=auto eol=lf`), so the CRLF is put back here; a bare LF in the
  // served file would still fail the comparison.
  const fixture = (name: string): string =>
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8').replace(/\r?\n/g, '\r\n');

  it('are byte for byte the files main served before the move, from the seeded sessions', () => {
    expect(BUILDS_ICS).toBe(fixture('builds-v1.ics'));
    expect(OFFICE_HOURS_ICS).toBe(fixture('office-hours-v1.ics'));
  });

  it('follow a session staff move, and name its new title', () => {
    const moved = SEEDED.sessions.map((s) => (s.id === 'dec26-s2' ? { ...s, start: s.start + 86_400_000, title: 'Leads That Pay Live Build' } : s));
    const ev = events(buildsIcs(moved, () => undefined));
    const week2 = ev.find((e) => e.UID === 'accelerator-build-week2-dec26@amplifiedimpact.io')!;
    expect(week2['DTSTART;TZID=America/Chicago']).toBe(chicagoStamp(SEEDED.sessions.find((s) => s.id === 'dec26-s2')!.start + 86_400_000));
    expect(week2.SUMMARY).toBe('Amplified AI Accelerator Live Build\\, Week 2: Leads That Pay');
  });
});

describe('the welcome page links them', () => {
  const config = readOfferConfig({});
  const values = (plan: 'cohort' | 'membership' | 'agents' | 'agent_plan') =>
    welcomeValues({ state: 'confirmed', plan, sessionId: 'cs_test_x', now: Date.parse('2026-11-12T09:00:00-06:00'), config });

  it('fills both calendar buttons with the files on www, and says links', () => {
    for (const plan of ['cohort', 'membership', 'agents', 'agent_plan'] as const) {
      expect(values(plan)).toMatchObject({
        'calendar-builds': 'https://www.amplifiedimpact.io/calendar/builds.ics',
        'calendar-office-hours': 'https://www.amplifiedimpact.io/calendar/office-hours.ics',
        'calendar-state': 'links',
      });
    }
    expect([BUILDS_ICS_URL, OFFICE_HOURS_ICS_URL]).toEqual(['https://www.amplifiedimpact.io/calendar/builds.ics', 'https://www.amplifiedimpact.io/calendar/office-hours.ics']);
  });

  it('keeps a CALENDAR_URL_* override, and leaves the intake link empty, so its button hides, when no form is set', () => {
    const override = readOfferConfig({ CALENDAR_URL_OFFICE_HOURS: 'https://cal.example.com/oh' });
    const v = welcomeValues({ state: 'confirmed', plan: 'membership', sessionId: 'cs_test_x', now: 0, config: override });
    expect(v['calendar-office-hours']).toBe('https://cal.example.com/oh');
    expect(values('membership')).toMatchObject({ 'intake-url': '', 'intake-state': 'email' });
  });
});
