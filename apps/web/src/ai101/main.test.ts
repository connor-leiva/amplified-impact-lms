import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE, UI } from './content';
import { renderAi101Body } from './render';

// /ai101's client script against the real markup, in jsdom. What jsdom cannot show — the clipboard
// itself, layout, `:target` — is the e2e spec's (compliance/tests/e2e/ai101.spec.ts).
//
// `main.ts` boots on import, as it does in the page, so each test renders the body and THEN imports
// a fresh copy of the module (`vi.resetModules()`): restore-on-load is part of what is under test.

const VOICE = PAGE.voiceProfile.prompt;
const CAROUSEL = PAGE.carouselCreator.prompt;
const KEY = 'ai101-checklist';

async function boot(search = '') {
  window.history.replaceState(null, '', `/ai101${search}`);
  document.body.innerHTML = renderAi101Body();
  vi.resetModules();
  await import('./main');
}

const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const live = () => $('#ai101-live').textContent;
const copyButton = (promptId: string) => $<HTMLButtonElement>(`[data-prompt="${promptId}"] button[data-copy]`);
const copyLabel = (promptId: string) => copyButton(promptId).querySelector('[data-copy-label]')!.textContent;

/**
 * Properties these tests replace on browser objects (`navigator.clipboard`, `isSecureContext`,
 * `document.execCommand`, `window.localStorage`), put back exactly as they were after each test —
 * jsdom defines some on the instance and some on the prototype, so "delete the override" alone could
 * delete the original.
 */
const replaced: Array<[object, PropertyKey, PropertyDescriptor | undefined]> = [];
function stub(target: object, key: PropertyKey, descriptor: PropertyDescriptor) {
  replaced.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
  Object.defineProperty(target, key, { configurable: true, ...descriptor });
}
const stubValue = (target: object, key: PropertyKey, value: unknown) => stub(target, key, { writable: true, value });

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* a test below replaces it */
  }
});

afterEach(() => {
  for (const [target, key, original] of replaced.splice(0).reverse()) {
    if (original) Object.defineProperty(target, key, original);
    else Reflect.deleteProperty(target, key);
  }
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = '';
});

describe('boot', () => {
  it('does not throw on a page with none of its elements', async () => {
    document.body.innerHTML = '';
    vi.resetModules();
    await expect(import('./main')).resolves.toBeDefined();
  });

  it('keeps going when one feature cannot start', async () => {
    // Storage that throws on every access must cost only the checklist's memory, not the form.
    stub(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
    await boot();
    expect($<HTMLFormElement>('#waitlist-form').noValidate).toBe(true);
    const box = $<HTMLInputElement>('input[data-check-id="create-project"]');
    box.click();
    expect(box.checked).toBe(true);
  });
});

describe('checklist', () => {
  const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>('input[data-check-id]'));
  const checkedIds = () =>
    boxes()
      .filter((b) => b.checked)
      .map((b) => b.dataset.checkId);

  it('restores the saved ticks and ignores ids it does not know', async () => {
    localStorage.setItem(KEY, JSON.stringify(['create-project', 'renamed-long-ago', 'first-idea', 7]));
    await boot();
    expect(checkedIds()).toEqual(['create-project', 'first-idea']);
  });

  it('saves every tick and untick as the list of checked ids, in page order', async () => {
    localStorage.setItem(KEY, JSON.stringify(['renamed-long-ago']));
    await boot();
    $<HTMLInputElement>('input[data-check-id="first-idea"]').click();
    $<HTMLInputElement>('input[data-check-id="design-system"]').click();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['design-system', 'first-idea']);
    $<HTMLInputElement>('input[data-check-id="first-idea"]').click();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['design-system']);
  });

  it.each([['{not json'], ['{"design-system":true}'], ['null'], ['"design-system"']])(
    'reads corrupt storage (%s) as nothing saved, then overwrites it',
    async (raw) => {
      localStorage.setItem(KEY, raw);
      await boot();
      expect(checkedIds()).toEqual([]);
      $<HTMLInputElement>('input[data-check-id="add-voice-profile"]').click();
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['add-voice-profile']);
    },
  );

  it('still ticks when storage refuses to read or write', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await boot();
    const box = $<HTMLInputElement>('input[data-check-id="create-project"]');
    expect(() => box.click()).not.toThrow();
    expect(box.checked).toBe(true);
  });
});

describe('copy', () => {
  let execCommand: ReturnType<typeof vi.fn>;
  /** What the fallback's textarea held when `execCommand('copy')` ran. */
  let buffered: { value: string; readonly: boolean } | null;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    stubValue(window, 'isSecureContext', true);
    buffered = null;
    execCommand = vi.fn(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('textarea.copy-buffer');
      buffered = ta ? { value: ta.value, readonly: ta.readOnly } : null;
      return true;
    });
    stubValue(document, 'execCommand', execCommand);
  });

  const clipboard = (writeText: (text: string) => Promise<void>) => {
    const fn = vi.fn(writeText);
    stubValue(navigator, 'clipboard', { writeText: fn });
    return fn;
  };

  it('writes the prompt text, exactly, through the Clipboard API', async () => {
    const writeText = clipboard(() => Promise.resolve());
    await boot();
    copyButton('voice_profile').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(VOICE.text);
    expect(execCommand).not.toHaveBeenCalled();

    copyButton('carousel_creator').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(writeText).toHaveBeenLastCalledWith(CAROUSEL.text);
  });

  it('says "Copied" for 2000 ms, then "Copy prompt" again', async () => {
    clipboard(() => Promise.resolve());
    await boot();
    const button = copyButton('voice_profile');
    button.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(copyLabel('voice_profile')).toBe(UI.copied);
    expect(button.hasAttribute('data-copied')).toBe(true);
    // Only the pressed button changes.
    expect(copyLabel('carousel_creator')).toBe(UI.copy);

    await vi.advanceTimersByTimeAsync(1999);
    expect(copyLabel('voice_profile')).toBe(UI.copied);
    await vi.advanceTimersByTimeAsync(1);
    expect(copyLabel('voice_profile')).toBe(UI.copy);
    expect(button.hasAttribute('data-copied')).toBe(false);
  });

  it('restarts the 2000 ms when the same button is pressed again', async () => {
    clipboard(() => Promise.resolve());
    await boot();
    copyButton('voice_profile').click();
    await vi.advanceTimersByTimeAsync(1500);
    copyButton('voice_profile').click();
    await vi.advanceTimersByTimeAsync(1500);
    expect(copyLabel('voice_profile')).toBe(UI.copied);
    await vi.advanceTimersByTimeAsync(500);
    expect(copyLabel('voice_profile')).toBe(UI.copy);
  });

  it('announces the copy in the polite live region, and announces a repeat again', async () => {
    clipboard(() => Promise.resolve());
    await boot();
    copyButton('carousel_creator').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(live()).toBe('');
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe(`${CAROUSEL.label} copied`);
    expect(live()).toBe(UI.copiedAnnouncement(CAROUSEL.label));

    // The same message again is emptied first, so assistive tech hears a change.
    copyButton('carousel_creator').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(live()).toBe('');
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe(UI.copiedAnnouncement(CAROUSEL.label));
  });

  it('falls back to a readonly textarea and execCommand when writeText rejects', async () => {
    clipboard(() => Promise.reject(new DOMException('no', 'NotAllowedError')));
    await boot();
    const button = copyButton('voice_profile');
    button.focus();
    button.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(buffered).toEqual({ value: VOICE.text, readonly: true });
    // Gone again, and focus is back on the button.
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(copyLabel('voice_profile')).toBe(UI.copied);
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe(UI.copiedAnnouncement(VOICE.label));
  });

  it('falls back when there is no Clipboard API at all', async () => {
    await boot();
    copyButton('carousel_creator').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(buffered?.value).toBe(CAROUSEL.text);
    expect(copyLabel('carousel_creator')).toBe(UI.copied);
  });

  it('does not call writeText outside a secure context', async () => {
    stubValue(window, 'isSecureContext', false);
    const writeText = clipboard(() => Promise.resolve());
    await boot();
    copyButton('voice_profile').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(writeText).not.toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it.each([
    ['returns false', () => false],
    [
      'throws',
      () => {
        throw new Error('unsupported');
      },
    ],
  ])('selects the prompt and says so when execCommand %s too', async (_how, impl) => {
    clipboard(() => Promise.reject(new Error('denied')));
    stubValue(document, 'execCommand', vi.fn(impl));
    await boot();
    copyButton('voice_profile').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(copyLabel('voice_profile')).toBe(UI.copy);
    expect(copyButton('voice_profile').hasAttribute('data-copied')).toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
    const selection = window.getSelection()!;
    expect(selection.rangeCount).toBe(1);
    expect(selection.getRangeAt(0).toString()).toBe(VOICE.text);
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe(UI.copyFailedAnnouncement(VOICE.label));
  });
});

describe('waitlist form', () => {
  type Reply = { status: number; body?: unknown } | Error;

  /** A `fetch` that answers each call with the next reply, recording what was sent. */
  function api(...replies: Reply[]) {
    const fetch = vi.fn((_url: string, _init: RequestInit) => {
      const reply = replies.shift() ?? { status: 201, body: { ok: true } };
      if (reply instanceof Error) return Promise.reject(reply);
      return Promise.resolve({
        ok: reply.status >= 200 && reply.status < 300,
        status: reply.status,
        json: () =>
          reply.body === undefined ? Promise.reject(new SyntaxError('no body')) : Promise.resolve(reply.body),
      });
    });
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  const form = () => $<HTMLFormElement>('#waitlist-form');
  const input = (name: string) => $<HTMLInputElement>(`#waitlist-form [name="${name}"]`);
  const errorOf = (name: string) => $(`#${name}-error`).textContent;
  const fill = (values: Record<string, string>) => {
    for (const [name, value] of Object.entries(values)) input(name).value = value;
  };
  const submit = () => $<HTMLButtonElement>('#waitlist-form button[type="submit"]').click();
  const sent = (fetch: ReturnType<typeof api>, call = 0) => JSON.parse(String(fetch.mock.calls[call]![1].body));
  const formError = () => $('#waitlist-error');

  it('takes validation over from the browser once it is running', async () => {
    api();
    await boot();
    expect(form().noValidate).toBe(true);
  });

  it('shows the inline errors, marks the fields and focuses the first one, without posting', async () => {
    const fetch = api();
    await boot();
    submit();
    expect(fetch).not.toHaveBeenCalled();
    expect(errorOf('firstName')).toBe(UI.errors.firstName);
    expect(errorOf('email')).toBe(UI.errors.email);
    expect(errorOf('brokerage')).toBe('');
    for (const name of ['firstName', 'email']) {
      expect(input(name).getAttribute('aria-invalid')).toBe('true');
      expect(input(name).getAttribute('aria-describedby')).toBe(`${name}-error`);
    }
    expect(input('brokerage').hasAttribute('aria-invalid')).toBe(false);
    expect(document.activeElement).toBe(input('firstName'));

    // A name, and an address the sign-in rule rejects (no dot-TLD of two letters).
    fill({ firstName: '  Ada ', email: 'ada@example.c' });
    submit();
    expect(fetch).not.toHaveBeenCalled();
    expect(errorOf('firstName')).toBe('');
    expect(input('firstName').hasAttribute('aria-invalid')).toBe(false);
    expect(input('firstName').hasAttribute('aria-describedby')).toBe(false);
    expect(errorOf('email')).toBe(UI.errors.email);
    expect(document.activeElement).toBe(input('email'));
  });

  it('treats a whitespace-only name as empty', async () => {
    const fetch = api();
    await boot();
    fill({ firstName: '   ', email: 'ada@example.com' });
    submit();
    expect(fetch).not.toHaveBeenCalled();
    expect(errorOf('firstName')).toBe(UI.errors.firstName);
  });

  it('clears a field’s error as soon as it is edited', async () => {
    api();
    await boot();
    submit();
    input('email').value = 'a';
    input('email').dispatchEvent(new Event('input', { bubbles: true }));
    expect(errorOf('email')).toBe('');
    expect(input('email').hasAttribute('aria-invalid')).toBe(false);
    expect(errorOf('firstName')).toBe(UI.errors.firstName);
  });

  it('posts trimmed JSON with the honeypot and ?src to the form’s action', async () => {
    const fetch = api({ status: 201, body: { ok: true } });
    await boot('?src=qr');
    fill({ firstName: ' Ada ', email: ' Ada@Example.com ', brokerage: '  eXp Realty  ' });
    submit();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/ai101/waitlist');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect(sent(fetch)).toEqual({
      firstName: 'Ada',
      // Lower-casing is the API's normalisation, not the page's.
      email: 'Ada@Example.com',
      brokerage: 'eXp Realty',
      website: '',
      src: 'qr',
    });
  });

  it('omits src when the URL has none, and sends a filled honeypot as typed', async () => {
    const fetch = api();
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com', website: 'http://spam.example' });
    submit();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body = sent(fetch);
    expect(body).not.toHaveProperty('src');
    expect(body).toEqual({ firstName: 'Ada', email: 'ada@example.com', brokerage: '', website: 'http://spam.example' });
  });

  it('shows "You’re on the list." and focuses it on 201', async () => {
    api({ status: 201, body: { ok: true } });
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com' });
    submit();
    await vi.waitFor(() => expect($('#waitlist').getAttribute('data-state')).toBe('joined'));
    expect(document.activeElement).toBe($('#waitlist-joined'));
    expect($('#waitlist-joined').textContent).toBe(PAGE.waitlist.success);
    expect(formError().hasAttribute('data-shown')).toBe(false);
  });

  it('posts once while a request is in flight, and marks the button busy until it settles', async () => {
    let settle: (value: unknown) => void = () => {};
    const fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          settle = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetch);
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com' });
    const button = $<HTMLButtonElement>('#waitlist-form button[type="submit"]');
    submit();
    submit();
    submit();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    settle({ ok: false, status: 503, json: () => Promise.resolve({}) });
    await vi.waitFor(() => expect(button.hasAttribute('aria-disabled')).toBe(false));
    // Settled, so a retry goes through.
    submit();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('puts a 400 that names a field on that field', async () => {
    api({ status: 400, body: { error: 'Enter a brokerage name under 120 characters.', field: 'brokerage' } });
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com', brokerage: 'x' });
    submit();
    await vi.waitFor(() => expect(errorOf('brokerage')).toBe('Enter a brokerage name under 120 characters.'));
    expect(input('brokerage').getAttribute('aria-invalid')).toBe('true');
    expect(input('brokerage').getAttribute('aria-describedby')).toBe('brokerage-error');
    expect(document.activeElement).toBe(input('brokerage'));
    expect($('#waitlist').hasAttribute('data-state')).toBe(false);
    expect(formError().hasAttribute('data-shown')).toBe(false);
  });

  it('falls back to the field’s own message when a 400 names the field but not the error', async () => {
    api({ status: 400, body: { field: 'email' } });
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com' });
    submit();
    await vi.waitFor(() => expect(errorOf('email')).toBe(UI.errors.email));
  });

  it.each<[string, Reply]>([
    ['a 500', { status: 500, body: { error: 'Internal Server Error' } }],
    ['a 404 (no waitlist route in this environment)', { status: 404, body: { error: 'Not found' } }],
    ['a 429', { status: 429, body: { error: 'Too Many Requests' } }],
    ['a 400 that names no field', { status: 400, body: { error: 'Bad Request' } }],
    ['a 400 whose body is not JSON', { status: 400 }],
    ['a network failure', new TypeError('Failed to fetch')],
  ])('shows the generic form-level error for %s', async (_what, reply) => {
    api(reply);
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com' });
    submit();
    // Shown first, then its text put back a beat later, so `role="alert"` hears a change. (The text
    // is in the markup from the start, for the no-JavaScript path, so it alone proves nothing.)
    await vi.waitFor(() => expect(formError().hasAttribute('data-shown')).toBe(true));
    await vi.waitFor(() => expect(formError().textContent).toBe(UI.errors.generic));
    expect($('#waitlist').hasAttribute('data-state')).toBe(false);
    for (const name of ['firstName', 'email', 'brokerage']) expect(errorOf(name)).toBe('');
    await vi.waitFor(() => expect($('#waitlist-form button[type="submit"]').hasAttribute('aria-disabled')).toBe(false));
  });

  it('hides the form-level error again on the next submit', async () => {
    api({ status: 500, body: {} }, { status: 201, body: { ok: true } });
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com' });
    submit();
    await vi.waitFor(() => expect(formError().hasAttribute('data-shown')).toBe(true));
    await vi.waitFor(() => expect($('#waitlist-form button[type="submit"]').hasAttribute('aria-disabled')).toBe(false));
    submit();
    expect(formError().hasAttribute('data-shown')).toBe(false);
    await vi.waitFor(() => expect($('#waitlist').getAttribute('data-state')).toBe('joined'));
  });
});
