// D-250: the session reminders in the learner emails' design, as a note from Connor. The copy rules are held here:
// warm and first person, signed "Connor", Title Case heading and button, no em dashes, "MT" after the time, never the
// word "operator", and no number the product doesn't have.
import { describe, expect, it } from 'vitest';
import { SESSION_REMINDER_COPY, sessionReminderHtml, sessionReminderText } from './session-reminder-html';
import type { SessionReminderKind } from './session-reminder-html';
import { brandedEmailHtml } from './branded-html';
import { whenFor } from './recipient';

const APP = 'https://learn.amplifiedimpact.test';
/** Wed, Dec 2, 2026, 12:00 PM MT: the first live build. */
const BUILD = Date.parse('2026-12-02T12:00:00-07:00');
const KINDS: SessionReminderKind[] = ['session-24h', 'session-1h'];

const input = (over: Partial<Parameters<typeof sessionReminderHtml>[1]> = {}) => ({
  label: 'Session 1',
  title: 'Map Your Spend Live Build',
  when: whenFor(BUILD, null),
  firstName: 'Dana',
  appUrl: APP,
  ...over,
});

/** Every word a reader sees in the HTML, with the markup and the preheader's padding taken out. */
const words = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#847;|&zwnj;|&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

describe('the session reminders (D-250)', () => {
  for (const kind of KINDS) {
    const html = sessionReminderHtml(kind, input());
    const text = sessionReminderText(kind, input());
    const c = SESSION_REMINDER_COPY[kind];

    it(`${kind}: the branded document, with Connor's note, the session, its time and the button`, () => {
      // The design's parts: the white wordmark on the dark band, the dark button, the footer.
      expect(html).toContain('/brand/amplified-impact-wordmark-on-dark.png');
      expect(html).toContain('bgcolor="#0a0d0c"');
      expect(html).toContain('Questions? Write to');
      expect(html).toContain(`<title>${c.heading}</title>`);
      expect(html).toContain('Hi Dana,');
      expect(html).toContain('>Session 1</div>');
      expect(html).toContain('>Map Your Spend Live Build</div>');
      expect(html).toContain('Wed, Dec 2 · 12:00 PM MT');
      expect(html).toContain(`>${c.button}</a>`);
      expect(html).toContain(`href="${APP}/sessions"`);
      expect(html).toContain(`${c.closing}<br>`);
      expect(html).toContain('<span style="font-weight:500;">Connor</span>');
    });

    it(`${kind}: follows the copy rules`, () => {
      for (const out of [words(html), text]) {
        expect(out).not.toMatch(/[–—]/);
        expect(out).not.toMatch(/operator/i);
        // Every clock time carries its zone.
        for (const m of out.matchAll(/\d{1,2}:\d{2} [AP]M(?! [A-Z]{2})/g)) throw new Error(`a time with no zone: "${m[0]}"`);
      }
      // Title Case: every word of the heading and the button starts with a capital, but the short ones.
      const small = new Set(['a', 'an', 'the', 'in', 'to', 'of', 'and', 'or', 'for', 'on', 'at']);
      for (const phrase of [c.heading, c.button]) {
        for (const w of phrase.split(' ').slice(1)) if (!small.has(w)) expect(w[0], `${phrase}: "${w}"`).toBe(w[0]!.toUpperCase());
      }
      // The only number in the copy is the product's own join window ("Opens 15 Min Before").
      expect(`${c.note} ${c.fine} ${c.closing}`.match(/\d+/g) ?? []).toEqual(c.fine.includes('15') ? ['15'] : []);
    });

    it(`${kind}: never carries a Zoom link, and every link is absolute`, () => {
      expect(html).not.toContain('zoom.us');
      for (const m of html.matchAll(/\shref="([^"]*)"/g)) expect(m[1]).toMatch(/^(https:\/\/|mailto:)/);
    });

    it(`${kind}: the plain-text part says the same`, () => {
      expect(text).toContain('Hi Dana,');
      expect(text).toContain('Session 1 · Map Your Spend Live Build');
      expect(text).toContain('Wed, Dec 2 · 12:00 PM MT');
      expect(text).toContain(`${c.button}: ${APP}/sessions`);
      expect(text.split('\n')).toEqual(expect.arrayContaining([c.closing, 'Connor']));
    });
  }

  it('says "Hi," with no name, and escapes what staff typed', () => {
    const html = sessionReminderHtml('session-24h', input({ firstName: '  ', title: 'Leads <&> Spend', label: 'Week 2' }));
    expect(html).toContain('>Hi,</div>');
    expect(html).toContain('>Leads &lt;&amp;&gt; Spend</div>');
    expect(html).toContain('>Week 2</div>');
    expect(html).not.toContain('Leads <&> Spend');
  });

  it('shows a reader’s saved zone first, with Mountain Time in parentheses', () => {
    const html = sessionReminderHtml('session-1h', input({ when: whenFor(BUILD, 'America/New_York') }));
    expect(html).toContain('Wed, Dec 2 · 2:00 PM ET (12:00 PM MT)');
  });

  it('leaves the shared document as it was: the new rows are its own', () => {
    // `branded-html.test.ts` pins the purchase email byte for byte; this only checks the two new rows are not in it.
    const doc = brandedEmailHtml({ title: 't', preheader: 'p', eyebrow: 'e', heading: 'h', rows: '' });
    expect(doc).not.toContain('font-weight:500;">Connor');
  });
});
