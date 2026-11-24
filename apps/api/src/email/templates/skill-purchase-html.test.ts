import { describe, expect, it } from 'vitest';
import {
  INSIDERS_EMAIL_LOGO_URL,
  INSIDERS_PAGE_URL,
  SKILL_EMAIL_LOGO_URL,
  skillPurchaseHtml,
  skillPurchaseText,
} from './skill-purchase-html';

const APP = 'https://app.amplifiedimpact.test';

const sample = {
  variant: 'new' as const,
  skillName: 'Team P&L Review',
  sets: 'owner_ops' as const,
  firstName: 'Alex',
  next: '/skill-library/team-pnl-review',
  token: 'tok_skill_1',
  appUrl: APP,
};

describe('skill purchase email · Connor’s HTML', () => {
  const html = skillPurchaseHtml(sample);

  it('keeps the document, the media query and the preheader padding', () => {
    expect(html.startsWith('<!DOCTYPE html>\n<html lang="en"')).toBe(true);
    expect(html).toContain('@media only screen and (max-width:620px)');
    expect(html).toContain('.ai-h1 { font-size:34px !important; }');
    expect(html).toContain('.ai-btn a { display:block !important; }');
    expect(html).toContain('family=Geist:wght@400;500;600&family=Geist+Mono');
    expect(html).toContain('<o:PixelsPerInch>96</o:PixelsPerInch>');
    expect(html).toContain(
      'Set your password to keep Team P&amp;L Review and its updates for life.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;',
    );
    expect(html).not.toContain('data:image');
    expect(html).not.toContain('Logo slot');
    expect(html).not.toContain('var(--');
  });

  it('fills the greeting, the skill, the hosted wordmark and the set-password link', () => {
    expect(html).toContain('<title>Thank you, Alex.</title>');
    expect(html).toContain('Thank you, Alex.');
    expect(html).toContain('>Team P&amp;L Review</div>');
    expect(html).toContain('Setting a password keeps your access to this skill and its updates for life.');
    expect(html).toContain(
      `<a href="https://learn.amplifiedimpact.io" style="text-decoration:none;"><img src="${SKILL_EMAIL_LOGO_URL}" width="180" height="27" alt="Amplified Impact"`,
    );
    expect(SKILL_EMAIL_LOGO_URL).toBe('https://learn.amplifiedimpact.io/brand/amplified-impact-wordmark-on-dark.png');
    expect(html).toContain(
      `href="${APP}/set-password?token=tok_skill_1&amp;next=%2Fskill-library%2Fteam-pnl-review"`,
    );
    expect(html).toContain('>Set Your Password</a>');
    expect(html).toContain('This link works once and expires in 72 hours. Need a new one? Use Forgot Password on the sign-in page.');
  });

  it('puts the Insiders tile in the upsell slot and links the button to the Insiders page', () => {
    expect(html).toContain(
      `<img src="${INSIDERS_EMAIL_LOGO_URL}" width="36" height="36" alt="Amplified Insiders" style="display:block; width:36px; height:36px; border:0;">`,
    );
    expect(html).toContain('padding:0 12px 0 0;');
    expect(html).not.toMatch(/<img[^>]+alt="Amplified Insiders"[^>]*>\s*<div style="padding-top:22px/);
    expect(INSIDERS_EMAIL_LOGO_URL).toBe('https://learn.amplifiedimpact.io/brand/amplified-insiders-tile.png');
    expect(html).toContain('You have one skill. Get every one.');
    expect(html).toContain(
      'Team P&amp;L Review is one skill in the library. Amplified Insiders opens all of them for $169/Month, so the next job you want AI to handle already has a skill waiting.',
    );
    expect(html).toContain(`href="${INSIDERS_PAGE_URL}"`);
    expect(INSIDERS_PAGE_URL).toBe('https://www.amplifiedimpact.io/insiders');
    expect(html).toContain('>See Amplified Insiders</a>');
    expect(html).toContain('href="https://learn.amplifiedimpact.io" style="color:#1f4d40; text-decoration:underline;">Sign In</a>');
    expect(html).toContain('href="mailto:support@amplifiedimpact.io"');
  });

  it('names Insiders for Agents on an agent skill', () => {
    const agent = skillPurchaseHtml({ ...sample, sets: 'agent', skillName: 'Appointment Follow-Up' });
    expect(agent).toContain(
      'Appointment Follow-Up is one agent skill in the library. Amplified Insiders for Agents opens every agent skill for $79/Month, so the next job you want AI to handle already has a skill waiting.',
    );
    const both = skillPurchaseHtml({ ...sample, sets: 'both' });
    expect(both).toContain('Amplified Insiders opens all of them for $169/Month');
    expect(both).not.toContain('for Agents');
  });

  it('drops the name when there is none', () => {
    const bare = skillPurchaseHtml({ ...sample, firstName: '' });
    expect(bare).toContain('<title>Thank you.</title>');
    expect(bare).not.toContain('Thank you, .');
  });

  it('uses the existing-account lines', () => {
    const ready = skillPurchaseHtml({ ...sample, variant: 'ready', firstName: 'Pat', token: null });
    expect(ready).toContain('<title>Thank you, Pat.</title>');
    expect(ready).toContain('Your skill is ready');
    expect(ready).toContain('It is ready in your account.');
    expect(ready).toContain('>Sign In</a>');
    expect(ready).toContain(`href="${APP}/sign-in?next=%2Fskill-library%2Fteam-pnl-review"`);
    expect(ready).toContain('Need a new link? Use Forgot Password on the sign-in page.');
    expect(ready).not.toContain('This link works once');
    expect(ready).toContain('Sign in to open Team P&amp;L Review. It is ready in your account.');
  });

  it('writes a plain-text alternative with the same facts', () => {
    const text = skillPurchaseText(sample);
    expect(text).toContain('Thank you, Alex.');
    expect(text).toContain('Team P&L Review');
    expect(text).toContain(`${APP}/set-password?token=tok_skill_1&next=%2Fskill-library%2Fteam-pnl-review`);
    expect(text).toContain('01 Guided Setup');
    expect(text).toContain('https://www.amplifiedimpact.io/insiders');
    expect(text).toContain('support@amplifiedimpact.io');
    const ready = skillPurchaseText({ ...sample, variant: 'ready' });
    expect(ready).toContain('It is ready in your account.');
    expect(ready).toContain(`${APP}/sign-in?next=%2Fskill-library%2Fteam-pnl-review`);
  });
});
