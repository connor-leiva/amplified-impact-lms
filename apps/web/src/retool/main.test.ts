import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRetoolBody } from './render';

// /retool on /ai101's script (D-046, D-049), against the real markup in jsdom: the open screens up to
// the build, the gate part way down with its team size and December box, and the copy-only buttons.
// What the step-through does on its own (the header, Back, the fields, Copy & Open) is
// `src/ai101/main.test.ts`'s; a gate on the first screen is `src/voice/main.test.ts`'s.

async function boot(url = '/retool', before?: () => void): Promise<void> {
  window.history.replaceState(null, '', url);
  document.documentElement.classList.remove('steps-on');
  document.body.innerHTML = renderRetoolBody();
  before?.();
  vi.resetModules();
  await import('../ai101/main');
}

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Nothing matches ${selector}`);
  return el;
};
const current = () =>
  Array.from(document.querySelectorAll('section[data-screen]'))
    .map((s) => s.id)
    .filter((id) => $(`#${id}`).hasAttribute('data-current'));
const nextButton = () => $<HTMLButtonElement>('button[data-next]');
const clickNext = () => nextButton().click();
const type = (selector: string, value: string) => {
  const el = $<HTMLInputElement | HTMLTextAreaElement>(selector);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const submit = () => $('#gate-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const settle = () => new Promise((r) => setTimeout(r, 0));

const replaced: Array<[object, PropertyKey, PropertyDescriptor | undefined]> = [];
function stub(target: object, key: PropertyKey, value: unknown) {
  replaced.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
}

let fetchMock: ReturnType<typeof vi.fn>;
let writeText: ReturnType<typeof vi.fn>;
const respond = (status: number, body: unknown = {}) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );

/** Each `Date.now()` a second after the last, so back-to-back clicks are separate taps. */
let clockMs = 0;

beforeEach(() => {
  clockMs = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => (clockMs += 1000));
  localStorage.clear();
  fetchMock = vi.fn();
  stub(globalThis, 'fetch', fetchMock);
  writeText = vi.fn().mockResolvedValue(undefined);
  stub(navigator, 'clipboard', { writeText });
  stub(window, 'isSecureContext', true);
  stub(window, 'scrollTo', vi.fn());
  stub(Element.prototype, 'scrollIntoView', vi.fn());
});

afterEach(() => {
  for (const [target, key, descriptor] of replaced.splice(0).reverse()) {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.documentElement.classList.remove('steps-on');
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

describe('before the visitor signs up', () => {
  it('walks every open screen, through the build, with no form', async () => {
    await boot();
    expect(current()).toEqual(['welcome']);
    for (const id of ['three-doors', 'run-draft-own', 'audit', 'read-your-map', 'build-steps', 'kit']) {
      clickNext();
      expect(current()).toEqual([id]);
    }
    // Held at the gate: the form's button is the way on.
    expect(nextButton().hidden).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens the audit straight from /retool#audit, the link for the call chat', async () => {
    await boot('/retool#audit');
    expect(current()).toEqual(['audit']);
  });

  it('holds a link past the gate at the gate', async () => {
    await boot('/retool#retool-conversation');
    expect(current()).toEqual(['kit']);
  });
});

describe('the gate: team size and the December box', () => {
  it('asks for the team size, in place, and posts nothing without one', async () => {
    await boot('/retool#kit');
    type('#gate-firstName', 'Pat');
    type('#gate-email', 'pat@example.com');
    submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect($('#teamSize-error').textContent).toBe('Choose your team size.');
    expect($('#gate-teamSize').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe($('#gate-teamSize'));
  });

  it("posts the team size and the December answer to /retool's route, then opens the next screen", async () => {
    await boot('/retool?src=zoom#kit');
    respond(201, { ok: true });
    type('#gate-firstName', ' Pat ');
    type('#gate-email', ' pat@example.com ');
    $<HTMLSelectElement>('#gate-teamSize').value = '26-50';
    $<HTMLInputElement>('#gate-december').checked = true;
    submit();
    await settle();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/retool');
    expect(JSON.parse(String(init.body))).toEqual({
      firstName: 'Pat',
      email: 'pat@example.com',
      brokerage: '',
      teamSize: '26-50',
      decemberInterest: true,
      smsConsent: false,
      website: '',
      src: 'zoom',
    });
    expect(current()).toEqual(['coordinator']);
    expect(localStorage.getItem('retool-unlocked')).toBe('1');
    expect($('#kit').getAttribute('data-state')).toBe('unlocked');
  });

  it('sends the December box as false when it is left unticked', async () => {
    await boot('/retool#kit');
    respond(201, { ok: true });
    type('#gate-firstName', 'Pat');
    type('#gate-email', 'pat@example.com');
    $<HTMLSelectElement>('#gate-teamSize').value = '1-10';
    submit();
    await settle();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).decemberInterest).toBe(false);
  });

  it("shows the API's team size error in place", async () => {
    await boot('/retool#kit');
    respond(400, { error: 'Choose your team size.', field: 'teamSize' });
    type('#gate-firstName', 'Pat');
    type('#gate-email', 'pat@example.com');
    $<HTMLSelectElement>('#gate-teamSize').value = '51+';
    submit();
    await settle();
    await settle();
    expect($('#teamSize-error').textContent).toBe('Choose your team size.');
    expect(current()).toEqual(['kit']);
  });
});

describe('the copy-only buttons', () => {
  it('shows "Copy the Request" with the script, and copies the build request, staying on the page', async () => {
    await boot('/retool#build-steps');
    const button = $<HTMLButtonElement>('#build-steps button[data-copy-prompt]');
    expect(button.hidden).toBe(false);
    button.click();
    await settle();
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0]![0] as string;
    expect(copied.startsWith('Now help me build the first AI employee from the task map above.')).toBe(true);
    expect(copied).toBe($('#build-prompt pre[data-prompt-text]').textContent);
    expect(current()).toEqual(['build-steps']);
  });

  it('copies the script with its four blanks filled from the boxes', async () => {
    await boot('/retool#retool-conversation', () => localStorage.setItem('retool-unlocked', '1'));
    expect(current()).toEqual(['retool-conversation']);
    type('#field-opsName', 'Jordan');
    type('#field-agentsThen', '12');
    type('#field-closingsThen', '15');
    type('#field-hoursTo', 'client experience');
    $<HTMLButtonElement>('button[data-copy-prompt="retool-script"]').click();
    await settle();
    const copied = writeText.mock.calls[0]![0] as string;
    expect(copied.startsWith('Jordan, I want to talk about your seat')).toBe(true);
    expect(copied).toContain('we had 12 agents and 15 closings a month');
    expect(copied).toContain('My vote is client experience.');
  });

  it('fills the audit from the six boxes before Copy & Open copies it', async () => {
    await boot('/retool#audit');
    type('#field-agents', '25');
    type('#field-closings', '30');
    type('#field-crm', 'Follow Up Boss');
    expect($('#audit-prompt pre[data-prompt-text]').textContent).toContain(
      '1. My team: 25 agents, about 30 closings a month, CRM: Follow Up Boss',
    );
  });
});
