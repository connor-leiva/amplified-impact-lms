// The $37 skill purchase email's design (Connor's HTML), as parts any learner email can share
// (D-247, H-9: Resend Invite and Send Nudge use it). Every table, inline style, color, font, spacing,
// the media query and the preheader padding are his, cut from `skill-purchase-html.ts` without a
// character changed: that email is built from these parts and renders exactly as before (its tests,
// and a byte-for-byte check in `branded-html.test.ts`). React Email is not used: it would wrap and
// restyle the document.
//
// Every argument is HTML already: the caller escapes what a person typed (`esc`), except `buttonRow`'s
// `href`, which it escapes itself.

import { SUPPORT_EMAIL } from '@ai/core/offer';
import { LEARN_ORIGIN } from '@ai/core/skill-guides';

/** White wordmark on a transparent ground, 180 by 27, from the reversed brand file. */
export const SKILL_EMAIL_LOGO_PATH = '/brand/amplified-impact-wordmark-on-dark.png';
export const SKILL_EMAIL_LOGO_URL = `${LEARN_ORIGIN}${SKILL_EMAIL_LOGO_PATH}`;

const PREHEADER_PAD = '&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;';

/** Escapes text for the document. */
export const esc = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface BrandedEmailParts {
  /** The document's `<title>`. */
  title: string;
  /** The inbox preview line, before the padding. */
  preheader: string;
  /** The green mono line above the heading, on the dark band. */
  eyebrow: string;
  /** The large heading on the dark band. */
  heading: string;
  /** The rows between the dark band and the footer: `cardRow`, `buttonRow`, `fineRow`, or an email's own. */
  rows: string;
}

/** The light card: a mono label, a large title and a line. */
export const cardRow = (label: string, title: string, line: string): string => `    <tr>
      <td class="ai-pad" style="padding:40px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate; background-color:#f1f0eb; border:1px solid #dad8d0; border-radius:8px;">
          <tr>
            <td bgcolor="#f1f0eb" style="background-color:#f1f0eb; border-radius:8px; padding:24px 24px 24px 24px;">
              <div style="font-family:'Geist Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace; font-size:12px; line-height:17px; letter-spacing:0.16em; text-transform:uppercase; color:#1f4d40;">${label}</div>
              <div style="padding-top:10px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:26px; line-height:1.15; font-weight:600; letter-spacing:-0.025em; color:#0a0d0c;">${title}</div>
              <div style="padding-top:10px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:1.55; color:#4d5350;">${line}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

/** The dark button. `href` is escaped here. */
export const buttonRow = (label: string, href: string): string => `    <tr>
      <td class="ai-pad" style="padding:28px 40px 0 40px;">
        <table role="presentation" class="ai-btn" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="#0a0d0c" style="background-color:#0a0d0c; border-radius:6px;">
              <a href="${esc(href)}" target="_blank" style="display:inline-block; padding:15px 28px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:22px; font-weight:500; color:#f1f0eb; text-decoration:none; border-radius:6px;">${label}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

/** The small print under the button. */
export const fineRow = (text: string): string => `    <tr>
      <td class="ai-pad" style="padding:14px 40px 0 40px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:13px; line-height:1.55; color:#5e6461;">
        ${text}
      </td>
    </tr>`;

/**
 * The space the purchase email leaves under its last section before the footer (its upsell's 40px bottom
 * padding), for an email whose last row is the small print. A fixed-height cell, as email clients need.
 */
export const spacerRow = (px = 40): string => `    <tr>
      <td class="ai-pad" height="${px}" style="height:${px}px; padding:0 40px 0 40px; font-size:0; line-height:0;">&nbsp;</td>
    </tr>`;

/**
 * D-250: a short letter on the panel, one paragraph per item (HTML already), in the card's type at the ink color. The
 * session reminders open with it, from Connor.
 */
export const letterRow = (paragraphs: readonly string[]): string => `    <tr>
      <td class="ai-pad" style="padding:40px 40px 0 40px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:1.6; color:#0a0d0c;">
${paragraphs.map((p, i) => `        <div style="padding-top:${i === 0 ? 0 : 14}px;">${p}</div>`).join('\n')}
      </td>
    </tr>`;

/** D-250: the letter's close and the name under it ("See you there," / "Connor"), both HTML already. */
export const signoffRow = (closing: string, name: string): string => `    <tr>
      <td class="ai-pad" style="padding:28px 40px 0 40px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:1.6; color:#0a0d0c;">
        ${closing}<br>
        <span style="font-weight:500;">${name}</span>
      </td>
    </tr>`;

/** The whole document: the head, the preheader, the dark band (wordmark, eyebrow, heading), the rows and the footer. */
export function brandedEmailHtml(parts: BrandedEmailParts): string {
  const { title, preheader, eyebrow, heading, rows } = parts;
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${title}</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; width:100%; background-color:#f1f0eb; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
  a { color:#1f4d40; }
  @media only screen and (max-width:620px) {
    .ai-wrap { padding:0 !important; }
    .ai-panel { width:100% !important; border-left:0 !important; border-right:0 !important; border-radius:0 !important; }
    .ai-pad { padding-left:24px !important; padding-right:24px !important; }
    .ai-h1 { font-size:34px !important; }
    .ai-btn a { display:block !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f1f0eb;">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#f1f0eb; opacity:0;">${preheader}${PREHEADER_PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f0eb" style="background-color:#f1f0eb;">
<tr>
<td class="ai-wrap" align="center" style="padding:32px 16px;">
  <table role="presentation" class="ai-panel" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#fafaf7; border:1px solid #dad8d0; border-radius:8px; overflow:hidden;">
    <tr>
      <td class="ai-pad" bgcolor="#0a0d0c" style="background-color:#0a0d0c; padding:36px 40px 0 40px;">
        <a href="${LEARN_ORIGIN}" style="text-decoration:none;"><img src="${SKILL_EMAIL_LOGO_URL}" width="180" height="27" alt="Amplified Impact" style="display:block; width:180px; height:27px; border:0;"></a>
      </td>
    </tr>
    <tr>
      <td class="ai-pad" bgcolor="#0a0d0c" style="background-color:#0a0d0c; padding:44px 40px 0 40px; font-family:'Geist Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace; font-size:12px; line-height:17px; letter-spacing:0.16em; text-transform:uppercase; color:#6fd3a5;">
        ${eyebrow}
      </td>
    </tr>
    <tr>
      <td class="ai-pad ai-h1" bgcolor="#0a0d0c" style="background-color:#0a0d0c; padding:16px 40px 40px 40px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:42px; line-height:1.04; font-weight:500; letter-spacing:-0.04em; color:#f5f5f2;">
        ${heading}
      </td>
    </tr>
${rows}
    <tr>
      <td class="ai-pad" style="padding:0 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-top:1px solid #dad8d0; padding:20px 0 28px 0; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:13px; line-height:1.7; color:#5e6461;">
              <a href="${LEARN_ORIGIN}" style="color:#1f4d40; text-decoration:underline;">Sign In</a><br>
              Questions? Write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#1f4d40; text-decoration:underline;">${SUPPORT_EMAIL}</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</td>
</tr>
</table>
</body>
</html>
`;
}
