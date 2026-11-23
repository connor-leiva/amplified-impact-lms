// Connor's skill purchase email, ported as the HTML he sent. The tables, inline styles, colors,
// fonts, spacing, media query and preheader padding stay as he wrote them. Only the values named
// in the call are filled in. React Email is not used here: it would wrap and restyle the document.

import { LIBRARY_ORIGIN } from '@ai/core/accelerator';
import { SUPPORT_EMAIL } from '@ai/core/offer';
import { skillUpsellBody } from '@ai/core/plan-prices';
import type { SkillSet } from '@ai/core/plan-prices';
import { LEARN_ORIGIN } from '@ai/core/skill-guides';
import { absolute, setPasswordPath } from './links';

/** White wordmark on a transparent ground, 180 by 27, from the reversed brand file. */
export const SKILL_EMAIL_LOGO_PATH = '/brand/amplified-impact-wordmark-on-dark.png';
export const SKILL_EMAIL_LOGO_URL = `${LEARN_ORIGIN}${SKILL_EMAIL_LOGO_PATH}`;

/** Amplified Insiders' own page on www. */
export const INSIDERS_PAGE_URL = `${LIBRARY_ORIGIN}/insiders`;

/**
 * The Insiders tile, 64 by 64. Source file: handoff/admin-mockup/logos/program-insiders-tile.svg
 * (the only insiders asset in the repo). Rasterized to PNG because email clients drop SVG.
 */
export const INSIDERS_EMAIL_LOGO_PATH = '/brand/amplified-insiders-tile.png';
export const INSIDERS_EMAIL_LOGO_URL = `${LEARN_ORIGIN}${INSIDERS_EMAIL_LOGO_PATH}`;

const PREHEADER_PAD = '&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;';

export interface SkillPurchaseHtmlInput {
  variant: 'new' | 'ready';
  skillName: string;
  sets: SkillSet;
  firstName: string;
  /** `/skill-library/<page>`, already checked. */
  next: string;
  token?: string | null;
  appUrl?: string | null;
}

const esc = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function skillPurchaseHtml(input: SkillPurchaseHtmlInput): string {
  const greeting = input.firstName ? `Thank you, ${input.firstName}.` : 'Thank you.';
  const skill = esc(input.skillName);
  const preheader =
    input.variant === 'new'
      ? `Set your password to keep ${skill} and its updates for life.`
      : `Sign in to open ${skill}. It is ready in your account.`;
  const skillLine =
    input.variant === 'new'
      ? 'Setting a password keeps your access to this skill and its updates for life.'
      : 'It is ready in your account.';
  const buttonLabel = input.variant === 'new' ? 'Set Your Password' : 'Sign In';
  const buttonHref =
    input.variant === 'new' && input.token
      ? absolute(setPasswordPath(input.token) + `&next=${encodeURIComponent(input.next)}`, input.appUrl)
      : absolute(`/sign-in?next=${encodeURIComponent(input.next)}`, input.appUrl);
  const fine =
    input.variant === 'new'
      ? 'This link works once and expires in 72 hours. Need a new one? Use Forgot Password on the sign-in page.'
      : 'Need a new link? Use Forgot Password on the sign-in page.';
  const upsell = esc(skillUpsellBody(input.skillName, input.sets));

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(greeting)}</title>
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
        Your skill is ready
      </td>
    </tr>
    <tr>
      <td class="ai-pad ai-h1" bgcolor="#0a0d0c" style="background-color:#0a0d0c; padding:16px 40px 40px 40px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:42px; line-height:1.04; font-weight:500; letter-spacing:-0.04em; color:#f5f5f2;">
        ${esc(greeting)}
      </td>
    </tr>
    <tr>
      <td class="ai-pad" style="padding:40px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate; background-color:#f1f0eb; border:1px solid #dad8d0; border-radius:8px;">
          <tr>
            <td bgcolor="#f1f0eb" style="background-color:#f1f0eb; border-radius:8px; padding:24px 24px 24px 24px;">
              <div style="font-family:'Geist Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace; font-size:12px; line-height:17px; letter-spacing:0.16em; text-transform:uppercase; color:#1f4d40;">Your skill</div>
              <div style="padding-top:10px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:26px; line-height:1.15; font-weight:600; letter-spacing:-0.025em; color:#0a0d0c;">${skill}</div>
              <div style="padding-top:10px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:1.55; color:#4d5350;">${skillLine}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="ai-pad" style="padding:28px 40px 0 40px;">
        <table role="presentation" class="ai-btn" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="#0a0d0c" style="background-color:#0a0d0c; border-radius:6px;">
              <a href="${esc(buttonHref)}" target="_blank" style="display:inline-block; padding:15px 28px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:22px; font-weight:500; color:#f1f0eb; text-decoration:none; border-radius:6px;">${buttonLabel}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="ai-pad" style="padding:14px 40px 0 40px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:13px; line-height:1.55; color:#5e6461;">
        ${fine}
      </td>
    </tr>
    <tr>
      <td class="ai-pad" style="padding:44px 40px 0 40px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:22px; line-height:1.2; font-weight:600; letter-spacing:-0.02em; color:#0a0d0c;">
        What You Get
      </td>
    </tr>
    <tr>
      <td class="ai-pad" style="padding:16px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #0a0d0c;">
          <tr>
            <td width="44" valign="top" style="width:44px; padding:16px 0 16px 0; border-bottom:1px solid #dad8d0; font-family:'Geist Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace; font-size:13px; line-height:24px; color:#4d5350;">01</td>
            <td valign="top" style="padding:16px 0 16px 0; border-bottom:1px solid #dad8d0; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:17px; line-height:24px; font-weight:500; letter-spacing:-0.01em; color:#0a0d0c;">Guided Setup</td>
          </tr>
          <tr>
            <td width="44" valign="top" style="width:44px; padding:16px 0 16px 0; border-bottom:1px solid #dad8d0; font-family:'Geist Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace; font-size:13px; line-height:24px; color:#4d5350;">02</td>
            <td valign="top" style="padding:16px 0 16px 0; border-bottom:1px solid #dad8d0; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:17px; line-height:24px; font-weight:500; letter-spacing:-0.01em; color:#0a0d0c;">Claude Version</td>
          </tr>
          <tr>
            <td width="44" valign="top" style="width:44px; padding:16px 0 16px 0; border-bottom:1px solid #dad8d0; font-family:'Geist Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace; font-size:13px; line-height:24px; color:#4d5350;">03</td>
            <td valign="top" style="padding:16px 0 16px 0; border-bottom:1px solid #dad8d0; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:17px; line-height:24px; font-weight:500; letter-spacing:-0.01em; color:#0a0d0c;">ChatGPT Version</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="ai-pad" style="padding:36px 40px 40px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate; background-color:#0a0d0c; border-radius:8px;">
          <tr>
            <td bgcolor="#0a0d0c" style="background-color:#0a0d0c; border-radius:8px; padding:28px 28px 30px 28px;">
              <img src="${INSIDERS_EMAIL_LOGO_URL}" width="64" height="64" alt="Amplified Insiders" style="display:block; width:64px; height:64px; border:0;">
              <div style="padding-top:22px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:26px; line-height:1.12; font-weight:500; letter-spacing:-0.03em; color:#f5f5f2;">You have one skill. Get every one.</div>
              <div style="padding-top:12px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:1.55; color:#a3aba7;">${upsell}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate; margin-top:22px;">
                <tr>
                  <td align="center" style="border:1px solid #5c6762; border-radius:6px;">
                    <a href="${INSIDERS_PAGE_URL}" target="_blank" style="display:inline-block; padding:12px 22px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; line-height:21px; font-weight:500; color:#f5f5f2; text-decoration:none; border-radius:6px;">See Amplified Insiders</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
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

export function skillPurchaseText(input: SkillPurchaseHtmlInput): string {
  const greeting = input.firstName ? `Thank you, ${input.firstName}.` : 'Thank you.';
  const buttonHref =
    input.variant === 'new' && input.token
      ? absolute(setPasswordPath(input.token) + `&next=${encodeURIComponent(input.next)}`, input.appUrl)
      : absolute(`/sign-in?next=${encodeURIComponent(input.next)}`, input.appUrl);
  const skillLine =
    input.variant === 'new'
      ? 'Setting a password keeps your access to this skill and its updates for life.'
      : 'It is ready in your account.';
  const buttonLabel = input.variant === 'new' ? 'Set Your Password' : 'Sign In';
  const fine =
    input.variant === 'new'
      ? 'This link works once and expires in 72 hours. Need a new one? Use Forgot Password on the sign-in page.'
      : 'Need a new link? Use Forgot Password on the sign-in page.';
  return [
    greeting,
    '',
    'Your skill is ready',
    '',
    input.skillName,
    skillLine,
    '',
    `${buttonLabel}: ${buttonHref}`,
    '',
    fine,
    '',
    'What You Get',
    '01 Guided Setup',
    '02 Claude Version',
    '03 ChatGPT Version',
    '',
    'You have one skill. Get every one.',
    skillUpsellBody(input.skillName, input.sets),
    '',
    `See Amplified Insiders: ${INSIDERS_PAGE_URL}`,
    '',
    `Sign In: ${LEARN_ORIGIN}`,
    `Questions? Write to ${SUPPORT_EMAIL}.`,
  ].join('\n');
}
