import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderVoiceBody } from './render';

// /voice-profile on /ai101's script (D-040), against the real markup in jsdom: the gate holds the
// step-through until the visitor signs up, then it runs exactly as /ai101's Part I does. What the
// step-through does on its own (the header, Back, the fields, Copy & Open) is
// `src/ai101/main.test.ts`'s; this file is what the gate adds, and that this page keeps its own place.

async function boot(url = '/voice-profile', before?: () => void): Promise<void> {
  window.history.replaceState(null, '', url);
  document.documentElement.classList.remove('steps-on');
  document.body.innerHTML = renderVoiceBody();
  before?.();
  vi.resetModules();
  await import('../ai101/main');
}

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Nothing matches ${selector}`);
  return el;
};
const current = () => Array.from(document.querySelectorAll('section[data-current]')).map((s) => s.id);
const nextButton = () => $<HTMLButtonElement>('button[data-next]');
const nextLabel = () => $('[data-next-label]').textContent;
const stage = () => $('[data-stage-label]').textContent;
const clickNext = () => nextButton().click();

function fill(firstName: string, email: string) {
  $<HTMLInputElement>('#gate-firstName').value = firstName;
  $<HTMLInputElement>('#gate-email').value = email;
}
const submit = () => $('#gate-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const settle = () => new Promise((r) => setTimeout(r, 0));

const replaced: Array<[object, PropertyKey, PropertyDescriptor | undefined]> = [];
function stub(target: object, key: PropertyKey, value: unknown) {
  replaced.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
}

let fetchMock: ReturnType<typeof vi.fn>;
const respond = (status: number, body: unknown = {}) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );

/** Each `Date.now()` a second after the last, so back-to-back clicks are separate taps (see /ai101's). */
let clockMs = 0;

beforeEach(() => {
  clockMs = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => (clockMs += 1000));
  localStorage.clear();
  fetchMock = vi.fn();
  stub(globalThis, 'fetch', fetchMock);
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
  it('starts on the gate, one screen at a time, with no Next: the form is the way on', async () => {
    await boot();
    expect(document.documentElement.classList.contains('steps-on')).toBe(true);
    expect(current()).toEqual(['welcome']);
    expect(stage()).toBe('Welcome');
    expect(nextButton().hidden).toBe(true);
    expect($('#welcome').hasAttribute('data-state')).toBe(false);
  });

  it('holds a link to a later screen at the gate', async () => {
    await boot('/voice-profile#voice-profile-copy');
    expect(current()).toEqual(['welcome']);
  });

  it('holds a saved place past the gate at the gate', async () => {
    await boot('/voice-profile', () => localStorage.setItem('voice-profile-v1', JSON.stringify({ i: 3 })));
    expect(current()).toEqual(['welcome']);
  });

  it('holds a click on a link to a later screen at the gate', async () => {
    await boot();
    const link = document.createElement('a');
    link.href = '#voice-profile-save';
    $('#welcome').appendChild(link);
    link.click();
    expect(current()).toEqual(['welcome']);
  });

  it('shows each bad field in place and posts nothing', async () => {
    await boot();
    fill(' ', 'nope');
    submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect($('#firstName-error').textContent).toBe('Enter your first name.');
    expect($('#email-error').textContent).toBe('Enter a valid email address.');
    expect(document.activeElement).toBe($('#gate-firstName'));
    expect(current()).toEqual(['welcome']);
  });

  it('stays at the gate when the API refuses, with the error in place', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await boot();
    respond(500);
    fill('Pat', 'pat@example.com');
    submit();
    await vi.runAllTimersAsync();
    expect($('#guide-error').hasAttribute('data-shown')).toBe(true);
    expect($('#guide-error').textContent).toBe('Something went wrong. Try again.');
    expect(current()).toEqual(['welcome']);
    expect(localStorage.getItem('vp-unlocked')).toBeNull();
  });
});

describe('signing up', () => {
  it('posts to its own route, then opens the next screen, focuses it and remembers the device', async () => {
    await boot('/voice-profile?src=ig');
    respond(201, { ok: true });
    fill(' Pat ', ' pat@example.com ');
    submit();
    await settle();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/voice-profile');
    // /ai101's sign-up sender, so the waitlist's shape: no phone, the SMS box unticked, no brokerage.
    // The route ignores a phone or SMS answer from a guide anyway (D-038).
    expect(JSON.parse(String(init.body))).toEqual({
      firstName: 'Pat',
      email: 'pat@example.com',
      brokerage: '',
      smsConsent: false,
      website: '',
      src: 'ig',
    });

    // Straight to step 1: there is no sign-in step (D-044).
    expect(current()).toEqual(['voice-profile']);
    expect(document.activeElement).toBe($('#voice-profile-heading'));
    expect(stage()).toBe('Voice Profile');
    expect(nextButton().hidden).toBe(false);
    expect(nextLabel()).toBe("I'm Ready");
    expect(localStorage.getItem('vp-unlocked')).toBe('1');
    expect($('#welcome').getAttribute('data-state')).toBe('unlocked');
  });

  it("keeps its place under its own key, never /ai101's", async () => {
    await boot();
    respond(201, { ok: true });
    fill('Pat', 'pat@example.com');
    submit();
    await settle();
    clickNext();
    expect(current()).toEqual(['voice-profile-copy']);
    expect(JSON.parse(localStorage.getItem('voice-profile-v1') ?? '{}').i).toBe(2);
    expect(localStorage.getItem('ai101-v2')).toBeNull();
  });
});

describe('a visitor who has signed up before', () => {
  const unlocked = () => localStorage.setItem('vp-unlocked', '1');

  it('sees "You\'re in" on the welcome screen, and Start takes them on', async () => {
    await boot('/voice-profile', unlocked);
    expect(current()).toEqual(['welcome']);
    expect($('#welcome').getAttribute('data-state')).toBe('unlocked');
    expect(nextButton().hidden).toBe(false);
    expect(nextLabel()).toBe('Start');
    clickNext();
    expect(current()).toEqual(['voice-profile']);
  });

  it('goes straight to a linked screen, or the saved place', async () => {
    await boot('/voice-profile#voice-profile-copy', unlocked);
    expect(current()).toEqual(['voice-profile-copy']);
  });

  it("walks the four steps to the test, where Start Over takes Next's place", async () => {
    await boot('/voice-profile', () => {
      unlocked();
      localStorage.setItem('voice-profile-v1', JSON.stringify({ i: 1 }));
    });
    expect(current()).toEqual(['voice-profile']);
    for (const [anchor, label] of [
      ['voice-profile-copy', 'I Have My Profile'],
      ['voice-profile-save', 'Saved It'],
    ] as const) {
      clickNext();
      expect(current()).toEqual([anchor]);
      expect(nextLabel()).toBe(label);
    }
    clickNext();
    expect(current()).toEqual(['voice-profile-test']);
    expect(nextButton().hidden).toBe(true);
    expect($<HTMLButtonElement>('button[data-restart]').hidden).toBe(false);
    $<HTMLButtonElement>('button[data-restart]').click();
    expect(current()).toEqual(['welcome']);
  });

  it("fills the prompt's ABOUT ME lines from the two blanks, as on /ai101", async () => {
    await boot('/voice-profile#voice-profile-copy', unlocked);
    const market = $<HTMLInputElement>('[data-field="market"]');
    market.value = 'Farmington, CT';
    market.dispatchEvent(new Event('input', { bubbles: true }));
    expect($('#voice-profile-prompt pre[data-prompt-text]').textContent).toContain(
      "My market, and what I'm known for: Farmington, CT",
    );
  });
});
