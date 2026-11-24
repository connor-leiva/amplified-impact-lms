// Connor's skill purchase email, ported as the HTML he sent. The tables, inline styles, colors,
// fonts, spacing, media query and preheader padding stay as he wrote them. Only the values named
// in the call are filled in. React Email is not used here: it would wrap and restyle the document.
// D-247: the document's shell and its card, button and small print are `branded-html.ts` (cut from
// this file unchanged), so Resend Invite and Send Nudge share the design; this email renders exactly
// as before.

import { LIBRARY_ORIGIN } from '@ai/core/accelerator';
import { skillUpsellBody } from '@ai/core/plan-prices';
import type { SkillSet } from '@ai/core/plan-prices';
import { LEARN_ORIGIN } from '@ai/core/skill-guides';
import { SUPPORT_EMAIL } from '@ai/core/offer';
import { brandedEmailHtml, buttonRow, cardRow, esc, fineRow } from './branded-html';
import { absolute, setPasswordPath } from './links';

export { SKILL_EMAIL_LOGO_PATH, SKILL_EMAIL_LOGO_URL } from './branded-html';

/** Amplified Insiders' own page on www. */
export const INSIDERS_PAGE_URL = `${LIBRARY_ORIGIN}/insiders`;

/**
 * The Insiders tile. Source file: handoff/admin-mockup/logos/program-insiders-tile.svg
 * (the only insiders asset in the repo). The PNG stays 64 by 64 so a 36px display size is sharp.
 * Rasterized because email clients drop SVG.
 */
export const INSIDERS_EMAIL_LOGO_PATH = '/brand/amplified-insiders-tile.png';
export const INSIDERS_EMAIL_LOGO_URL = `${LEARN_ORIGIN}${INSIDERS_EMAIL_LOGO_PATH}`;

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

/** The purchase email's own rows: What You Get, and the Insiders upsell. */
const whatYouGetAndUpsell = (upsell: string): string => `    <tr>
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
              <div style="padding-top:22px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:26px; line-height:1.12; font-weight:500; letter-spacing:-0.03em; color:#f5f5f2;">You have one skill. Get every one.</div>
              <div style="padding-top:12px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:1.55; color:#a3aba7;">${upsell}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate; margin-top:22px;">
                <tr>
                  <td valign="middle" style="padding:0 12px 0 0;">
                    <img src="${INSIDERS_EMAIL_LOGO_URL}" width="36" height="36" alt="Amplified Insiders" style="display:block; width:36px; height:36px; border:0;">
                  </td>
                  <td valign="middle" align="center" style="border:1px solid #5c6762; border-radius:6px;">
                    <a href="${INSIDERS_PAGE_URL}" target="_blank" style="display:inline-block; padding:12px 22px; font-family:'Geist', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; line-height:21px; font-weight:500; color:#f5f5f2; text-decoration:none; border-radius:6px;">See Amplified Insiders</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

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

  return brandedEmailHtml({
    title: esc(greeting),
    preheader,
    eyebrow: 'Your skill is ready',
    heading: esc(greeting),
    rows: [cardRow('Your skill', skill, skillLine), buttonRow(buttonLabel, buttonHref), fineRow(fine), whatYouGetAndUpsell(upsell)].join('\n'),
  });
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
