// D-246 (H-9): the $37 skill email's design as shared parts. The purchase email must render exactly as
// it did before the parts were cut from it, and Resend Invite's and Send Nudge's emails must be the same
// document: the same head, the dark band and wordmark, the card, the button and the footer.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SKILL_EMAIL_LOGO_URL, brandedEmailHtml, buttonRow, cardRow, esc, fineRow } from './branded-html';
import { learnerInviteHtml, learnerInviteText, learnerNudgeHtml, learnerNudgeText } from './learner-emails-html';
import { skillPurchaseHtml, skillPurchaseText } from './skill-purchase-html';

const APP = 'https://app.amplifiedimpact.test';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('the purchase email renders byte for byte as on main 1d23037', () => {
  // Hashes of `skillPurchaseHtml` and `skillPurchaseText` for these three inputs, taken on main before
  // the shell was cut out (Nov 24, 2026). A change to one character of the purchase email fails here.
  const cases = [
    {
      input: { variant: 'new' as const, skillName: 'Team P&L Review', sets: 'owner_ops' as const, firstName: 'Alex', next: '/skill-library/team-pnl-review', token: 'tok_skill_1', appUrl: APP },
      html: 'fa6999f9a9044e3b071f64c0d38b3d0ebabf96f65c16b93429ffe79f2a683de7',
      text: 'bb7edd38d708f2209b1a48059ac7813f1c55aa409cad8c7ceef8875e1fee953f',
    },
    {
      input: { variant: 'ready' as const, skillName: 'Speed <to> "Lead"', sets: 'agent' as const, firstName: '', next: '/skill-library/speed-to-lead', appUrl: APP },
      html: '07b262dc8f5a1f5456c158fc75d0a24cc95a7ca48b901cc428ab72df80f069d4',
      text: '89e188cbdd2d8b3c6c738bf3d0d33fef3ecff53c562f722af2cf04e17c931a3d',
    },
    {
      input: { variant: 'new' as const, skillName: 'Both', sets: 'both' as const, firstName: 'Jo', next: '/skill-library/x', token: null, appUrl: APP },
      html: '4118280949c7e22d0b2b04c0c6fcfb96ffb22a4ffd6ebf0258a7f5c1d2b07a4d',
      text: 'b98c357a8b4867591612e32e412418d58dbfdc8488da918cc0b0a3448a7f070b',
    },
  ];
  for (const [i, c] of cases.entries()) {
    it(`case ${i + 1}`, () => {
      expect(sha(skillPurchaseHtml(c.input))).toBe(c.html);
      expect(sha(skillPurchaseText(c.input))).toBe(c.text);
    });
  }
});

describe('Resend Invite’s and Send Nudge’s emails are the purchase email’s document', () => {
  const purchase = skillPurchaseHtml(cases0());
  const invite = learnerInviteHtml({ firstName: 'Ana', email: 'ana@example.test', token: 'tok_inv_1', appUrl: APP });
  const nudge = learnerNudgeHtml({ firstName: 'Ana', appUrl: APP });
  /** Everything up to the eyebrow's text but the title and the preheader: the head, the panel and the wordmark. */
  const shellOf = (html: string) =>
    html.slice(html.indexOf('<meta charset'), html.indexOf('<title>')) +
    html.slice(html.indexOf('</title>'), html.indexOf('opacity:0;">')) +
    html.slice(html.indexOf('<table role="presentation" width="100%"'), html.indexOf('text-transform:uppercase; color:#6fd3a5;'));

  it('shares the head, the panel, the dark band and the wordmark', () => {
    expect(shellOf(invite)).toBe(shellOf(purchase));
    expect(shellOf(nudge)).toBe(shellOf(purchase));
    for (const html of [invite, nudge]) {
      expect(html).toContain(`<img src="${SKILL_EMAIL_LOGO_URL}" width="180" height="27" alt="Amplified Impact"`);
      expect(html).toContain('@media only screen and (max-width:620px)');
      expect(html).toContain('Questions? Write to <a href="mailto:');
      expect(html).not.toContain('var(--');
    }
  });

  it('the invite: a set-password link for the address they sign in with', () => {
    expect(invite).toContain('<title>Welcome, Ana.</title>');
    expect(invite).toContain('Your account is ready');
    expect(invite).toContain('>Your login</div>');
    expect(invite).toContain('><span style="word-break:break-all;">ana@example.test</span></div>');
    expect(invite).toContain('Choose a password, and you’re signed in.');
    expect(invite).toContain(`href="${APP}/set-password?token=tok_inv_1"`);
    expect(invite).toContain('>Set Your Password</a>');
    expect(invite).toContain('This link works once and expires in 72 hours. Need a new one? Use Forgot Password on the sign-in page.');
    expect(invite).toContain('Set your password to sign in to Amplified Impact.&#847;');
    expect(learnerInviteText({ firstName: '', email: 'b@example.test', token: 't', appUrl: APP })).toContain(`Welcome.\n\nYour account is ready\n\nYour login\nb@example.test`);
  });

  it('the nudge: a short note and the sign-in page', () => {
    expect(nudge).toContain('<title>Hi, Ana.</title>');
    expect(nudge).toContain('A quick nudge');
    expect(nudge).toContain('>Pick up where you left off</div>');
    expect(nudge).toContain('Sign in to see your next step.');
    expect(nudge).toContain(`href="${APP}/sign-in"`);
    expect(nudge).toContain('>Sign In</a>');
    expect(learnerNudgeText({ firstName: 'Ana', appUrl: APP })).toContain(`Sign In: ${APP}/sign-in`);
  });

  it('escapes what a person typed', () => {
    const html = learnerInviteHtml({ firstName: '<b>', email: 'a&b@example.test', token: 't"x', appUrl: APP });
    expect(html).toContain('Welcome, &lt;b&gt;.');
    expect(html).toContain('>a&amp;b@example.test</span></div>');
    expect(html).toContain('token=t%22x');
    expect(esc('"<&>')).toBe('&quot;&lt;&amp;&gt;');
  });

  it('builds a document from the parts', () => {
    const html = brandedEmailHtml({ title: 'T', preheader: 'P', eyebrow: 'E', heading: 'H', rows: [cardRow('L', 'Ti', 'Li'), buttonRow('B', 'https://x.test/?a=1&b=2'), fineRow('F')].join('\n') });
    expect(html.startsWith('<!DOCTYPE html>\n<html lang="en"')).toBe(true);
    expect(html).toContain('href="https://x.test/?a=1&amp;b=2"');
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });
});

function cases0() {
  return { variant: 'new' as const, skillName: 'Team P&L Review', sets: 'owner_ops' as const, firstName: 'Alex', next: '/skill-library/team-pnl-review', token: 'tok_skill_1', appUrl: APP };
}
