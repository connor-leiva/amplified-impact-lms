import { describe, expect, it } from 'vitest';
import { AGREEMENT, AGREEMENT_EFFECTIVE, AGREEMENT_VERSION } from './agreement';
import { renderLegal, renderLegalBody, renderLegalHead } from './render';

// The subscription agreement (D-073). The words below are the November 23, 2026 text Connor and
// Spring approved. A dollar price does not belong on this page.

const page = () =>
  new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><head>${renderLegalHead(AGREEMENT)}</head>` +
      `<body>${renderLegalBody(AGREEMENT)}</body></html>`,
    'text/html',
  );

const itemText = (root: ParentNode, heading: string) =>
  [...root.querySelectorAll('li')]
    .map((li) => li.textContent ?? '')
    .filter((text) => text.startsWith(heading));

describe('the subscription agreement', () => {
  const doc = page();
  const text = doc.body.textContent ?? '';

  it('records November 23, 2026, and names the Agent Plan in the description', () => {
    expect(AGREEMENT_VERSION).toBe('2026-11-23');
    expect(AGREEMENT_EFFECTIVE).toEqual({ iso: '2026-11-23', label: 'November 23, 2026' });
    expect(renderLegal('agreement').head).toContain(
      'The terms of the Amplified Skill Library, the Amplified AI Accelerator, Amplified Insiders, the Amplified Agent Plan and the Amplified Team Plan.',
    );
    expect(doc.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-23');
    expect(doc.querySelector('time')?.textContent).toBe('November 23, 2026');
    expect(doc.querySelector('.version')?.textContent).toBe('Version 2026-11-23');
  });

  it('names the minimum in the notice, and Section 4 in the contents', () => {
    expect(doc.querySelector('.notice')?.textContent).toBe(
      'This agreement renews automatically for plans with a monthly charge. Some plans have a three month minimum, as Section 4 explains. You can cancel a monthly charge as Section 5 explains. Payments are not refundable, as Section 6 explains.',
    );
    const link = [...doc.querySelectorAll('nav.toc a')].find((a) => a.getAttribute('href') === '#minimum');
    expect(link?.textContent).toBe('4. Minimum Terms');
    expect(doc.querySelector('#minimum h2')?.textContent).toBe('4. Minimum Terms');
  });

  it('lists the four plans added on November 23', () => {
    const plans = doc.querySelector('#plans')!;
    expect(itemText(plans, 'Amplified Agent Plan.')).toEqual([
      'Amplified Agent Plan. Every agent skill, a weekly live agent training and weekly office hours.',
    ]);
    expect(itemText(plans, 'Amplified Insiders for Team Leaders.')).toEqual([
      'Amplified Insiders for Team Leaders. The owner and operations skills, plus the new skills released while your membership is paid, and weekly office hours.',
    ]);
    expect(itemText(plans, 'Amplified Insiders for Agents.')).toEqual([
      'Amplified Insiders for Agents. Every agent skill and weekly office hours. No weekly live training.',
    ]);
    expect(itemText(plans, 'Single Skill.')).toEqual(['Single Skill. One skill of your choice, bought once.']);
  });

  it('states the new charges, the May 4 rollover, and the grandfathered Agent Plan price', () => {
    const billing = doc.querySelector('#billing')!;
    expect(itemText(billing, 'Amplified Agent Plan.')).toEqual([
      'Amplified Agent Plan. Nothing today for buyers in the free period. The monthly membership starting on the first paid charge (Monday, January 4, 2027 for current trial buyers), each month until you cancel, subject to Section 4. The yearly option is one payment for one year.',
    ]);
    expect(itemText(billing, 'Amplified Insiders for Team Leaders and for Agents.')).toEqual([
      'Amplified Insiders for Team Leaders and for Agents. The monthly membership starting at checkout, each month until you cancel, subject to Section 4. The yearly option for Team Leaders is one payment for one year, then the monthly membership each month until you cancel.',
    ]);
    expect(itemText(billing, 'Single Skill.')).toEqual(['Single Skill. One payment at checkout. It does not renew.']);
    expect(itemText(billing, 'Amplified Insiders for Team Leaders.')).toEqual([
      'Amplified Insiders for Team Leaders. When the Amplified AI Accelerator’s 90 included days end, you continue as an Amplified Insiders for Team Leaders member automatically: the monthly membership, starting Tuesday, May 4, 2027 for cohort one, each month until you cancel. If you bought Amplified Insiders by the year, you continue the same way, on the monthly membership, when your year ends.',
    ]);
    expect(text).toContain(
      'Members who joined the Amplified Agent Plan before November 23, 2026 keep their monthly price while their membership stays active.',
    );
    expect(text).not.toContain('May 3, 2027');
    expect(text).not.toContain('The Amplified Team Plan Minimum');
  });

  it('states the three-payment minimum from the first paid charge', () => {
    expect(doc.querySelector('#minimum p')?.textContent).toBe(
      'These monthly plans have a minimum term of three monthly payments: the Amplified Agent Plan, Amplified Insiders for Team Leaders and Amplified Insiders for Agents. The Amplified Team Plan has the same minimum, starting January 26, 2027. The minimum term counts from your first paid charge. For the Amplified Agent Plan, the first paid charge for current trial buyers is Monday, January 4, 2027. To cancel before the third payment, write to admin@amplifiedimpact.io. Cancelling before then does not end the payments due for the minimum term. After the third payment, you can cancel in the billing portal as Section 5 explains.',
    );
  });

  it('states no dollar price', () => {
    expect(text).not.toMatch(/\$/);
    expect(renderLegal('agreement').head).not.toMatch(/\$/);
  });
});
