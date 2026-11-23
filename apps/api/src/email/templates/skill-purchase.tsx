// The email a $37 skill buyer gets, only while SKILL_GUEST_CHECKOUT is on.
// The other templates stay in the plain § 8.1 shell. This one is the branded note: a wordmark,
// a greeting, the skill, what it includes, one button, then the fine print and a footer.
// Tables and inline hex, because Gmail and Outlook drop stylesheets. The button is a table cell
// with the label centered on the line, not React Email's button (its inner span sits at the top).

import { Body, Head, Html, Preview } from '@react-email/components';
import type { CSSProperties } from 'react';
import { insidersSentence } from '@ai/core/plan-prices';
import type { SkillSet } from '@ai/core/plan-prices';
import { SUPPORT_EMAIL } from '@ai/core/offer';
import { EMAIL_FONT_STACK, EMAIL_TOKENS } from '../tokens';
import { absolute, setPasswordPath } from './links';
import { CONTENT_WIDTH } from './layout';

const T = EMAIL_TOKENS;

export interface SkillPurchaseEmailProps {
  subject: string;
  /** `new` sets a password. `ready` signs in to a skill the buyer already has an account for. */
  variant: 'new' | 'ready';
  skillName: string;
  /** Which set the skill belongs to. Decides the Insiders sentence. */
  sets: SkillSet;
  /** The buyer's first name. Empty means the greeting is "Thank you" on its own. */
  firstName: string;
  /** `/skill-library/<page>`, already checked. */
  next: string;
  /** The set-password token. Only the new-account variant uses it. */
  token?: string | null;
  appUrl?: string | null;
}

const font = EMAIL_FONT_STACK;

const page: CSSProperties = {
  margin: 0,
  padding: '32px 16px',
  backgroundColor: T['bg-canvas'],
  color: T['text-primary'],
  fontFamily: font,
};

const card: CSSProperties = {
  width: `${CONTENT_WIDTH}px`,
  maxWidth: `${CONTENT_WIDTH}px`,
  borderRadius: '16px',
  border: `1px solid ${T['line-default']}`,
  backgroundColor: T['bg-surface'],
};

const header: CSSProperties = {
  padding: '20px 32px',
  backgroundColor: T['bg-inverse'],
  borderRadius: '16px 16px 0 0',
};

const wordmark: CSSProperties = {
  margin: 0,
  fontFamily: font,
  fontSize: '18px',
  lineHeight: '24px',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: T['text-inverse'],
};

const bodyPad: CSSProperties = { padding: '32px' };

const greeting: CSSProperties = {
  margin: 0,
  fontFamily: font,
  fontSize: '26px',
  lineHeight: '32px',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: T['text-primary'],
};

const highlight: CSSProperties = {
  marginTop: '20px',
  padding: '16px 18px',
  backgroundColor: T['action-primary-tint'],
  border: `1px solid ${T['action-primary-line']}`,
  borderRadius: '12px',
};

const skillNameStyle: CSSProperties = {
  margin: 0,
  fontFamily: font,
  fontSize: '20px',
  lineHeight: '28px',
  fontWeight: 600,
  color: T['text-primary'],
};

const para: CSSProperties = {
  margin: '16px 0 0',
  fontFamily: font,
  fontSize: '14px',
  lineHeight: '20px',
  fontWeight: 400,
  color: T['text-secondary'],
};

const listItem: CSSProperties = {
  margin: 0,
  padding: '4px 0',
  fontFamily: font,
  fontSize: '14px',
  lineHeight: '20px',
  color: T['text-primary'],
};

const button: CSSProperties = {
  boxSizing: 'border-box',
  display: 'inline-block',
  height: '40px',
  lineHeight: '38px',
  padding: '0 16px',
  borderRadius: '8px',
  border: '1px solid transparent',
  backgroundColor: T['action-primary'],
  color: T['action-on-primary'],
  fontFamily: font,
  fontSize: '14px',
  fontWeight: 600,
  textAlign: 'center',
  textDecoration: 'none',
};

const fine: CSSProperties = {
  margin: '16px 0 0',
  fontFamily: font,
  fontSize: '12px',
  lineHeight: '18px',
  color: T['text-tertiary'],
};

const footer: CSSProperties = {
  padding: '16px 32px 20px',
  backgroundColor: T['bg-sunken'],
  borderTop: `1px solid ${T['line-default']}`,
  borderRadius: '0 0 16px 16px',
};

const footerLine: CSSProperties = {
  margin: 0,
  fontFamily: font,
  fontSize: '12px',
  lineHeight: '18px',
  color: T['text-tertiary'],
};

const footerLink: CSSProperties = {
  color: T['text-link'],
  textDecoration: 'underline',
};

const WHAT_YOU_GET = ['Guided Setup', 'Claude Version', 'ChatGPT Version'] as const;

export function SkillPurchaseEmail({ subject, variant, skillName, sets, firstName, next, token, appUrl }: SkillPurchaseEmailProps) {
  const hello = firstName ? `Thank you, ${firstName}.` : 'Thank you.';
  const href =
    variant === 'new' && token
      ? absolute(setPasswordPath(token) + `&next=${encodeURIComponent(next)}`, appUrl)
      : absolute(`/sign-in?next=${encodeURIComponent(next)}`, appUrl);
  const label = variant === 'new' ? 'Set Your Password' : 'Sign In';
  const owned = variant === 'new' ? 'Setting a password keeps your access to this skill and its updates for life.' : 'It is ready in your account.';
  const finePrint =
    variant === 'new'
      ? 'This link works once and expires in 72 hours. Need a new one? Use Forgot Password on the sign-in page.'
      : 'Need a new link? Use Forgot Password on the sign-in page.';
  return (
    <Html lang="en">
      <Head>
        <title>{subject}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" />
      </Head>
      <Preview>{subject}</Preview>
      <Body style={page}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={card} align="center">
          <tbody>
            <tr>
              <td style={header}>
                <span style={wordmark}>Amplified Impact</span>
              </td>
            </tr>
            <tr>
              <td style={bodyPad}>
                <h1 style={greeting}>{hello}</h1>
                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={highlight}>
                  <tbody>
                    <tr>
                      <td>
                        <span style={skillNameStyle}>{skillName}</span>
                        <p style={{ ...para, marginTop: '8px' }}>{owned}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p style={para}>What You Get</p>
                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                  <tbody>
                    {WHAT_YOU_GET.map((item) => (
                      <tr key={item}>
                        <td style={{ ...listItem, width: '16px', color: T['action-primary'] }}>•</td>
                        <td style={listItem}>{item}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={para}>{insidersSentence(sets)}</p>
                <table role="presentation" cellPadding={0} cellSpacing={0} align="center" style={{ marginTop: '24px' }}>
                  <tbody>
                    <tr>
                      <td align="center" valign="middle" style={{ backgroundColor: T['action-primary'], borderRadius: '8px' }}>
                        <a href={href} style={button}>
                          {label}
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p style={fine}>{finePrint}</p>
              </td>
            </tr>
            <tr>
              <td style={footer}>
                <p style={footerLine}>
                  <a href={absolute('/sign-in', appUrl)} style={footerLink}>
                    Sign In
                  </a>
                </p>
                <p style={{ ...footerLine, marginTop: '6px' }}>
                  Questions? Write to{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}
