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
      $<HTMLInputElement>('input[data-check-id="about-you"]').click();
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['about-you']);
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
    expect(live()).toBe('Copied to clipboard.');
    expect(live()).toBe(UI.copiedAnnouncement);

    // The same message again is emptied first, so assistive tech hears a change.
    copyButton('carousel_creator').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(live()).toBe('');
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe(UI.copiedAnnouncement);
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
    expect(document.querySelector('textarea.copy-buffer')).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(copyLabel('voice_profile')).toBe(UI.copied);
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe(UI.copiedAnnouncement);
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
    expect(document.querySelector('textarea.copy-buffer')).toBeNull();
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

// ================================================================================================
// The click paths (D-032)
// ================================================================================================

/** The clipboard as the tests see it: `writeText` and the legacy `execCommand` path, both recorded. */
function stubClipboard(writeText: (text: string) => Promise<void> = () => Promise.resolve()) {
  stubValue(window, 'isSecureContext', true);
  const written = vi.fn(writeText);
  stubValue(navigator, 'clipboard', { writeText: written });
  const legacy: string[] = [];
  const execCommand = vi.fn(() => {
    const ta = document.querySelector<HTMLTextAreaElement>('textarea.copy-buffer');
    if (ta) legacy.push(ta.value);
    return true;
  });
  stubValue(document, 'execCommand', execCommand);
  return { written, legacy, execCommand };
}

/** A real click, reporting whether the default action (following the link) was left to happen. */
function click(el: Element): { followed: boolean } {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return { followed: !event.defaultPrevented };
}

const carouselPre = () => $('[data-prompt="carousel_creator"] pre[data-prompt-text]');
const field = (name: string) => $<HTMLInputElement | HTMLTextAreaElement>(`[data-about-field="${name}"]`);
const type = (name: string, value: string) => {
  const el = field(name);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const marks = () => Array.from(carouselPre().querySelectorAll('mark.placeholder')).map((m) => m.textContent);

const ORIGINAL_LAST = 'About me: [niche, neighborhoods, and the questions clients ask me most]. My brokerage: [brokerage name].';
const CAROUSEL_HEAD = CAROUSEL.text.slice(0, CAROUSEL.text.lastIndexOf('\n') + 1);

describe('About you (D-032)', () => {
  it('shows itself once the script runs; the instructions start exactly as written', async () => {
    await boot();
    expect($('[data-about]').hidden).toBe(false);
    expect(carouselPre().textContent).toBe(CAROUSEL.text);
    expect(CAROUSEL.text.endsWith(ORIGINAL_LAST)).toBe(true);
    // The highlight is unchanged too: the two original placeholders.
    expect(marks()).toEqual(['[niche, neighborhoods, and the questions clients ask me most]', '[brokerage name]']);
  });

  it('leaves the last line untouched while the first four fields are empty', async () => {
    await boot();
    type('niche', '   ');
    expect(carouselPre().textContent).toBe(CAROUSEL.text);
  });

  it('writes a partial About me, keeping a bracket for each empty field', async () => {
    await boot();
    type('niche', ' first-time buyers ');
    type('questions', 'Should I wait for rates?\n\n  Can I buy with 3% down?  \n');
    expect(carouselPre().textContent).toBe(
      CAROUSEL_HEAD +
        'About me:\n' +
        '- Niche: first-time buyers\n' +
        '- Neighborhoods: [your neighborhoods]\n' +
        '- Questions clients ask me most: Should I wait for rates?; Can I buy with 3% down?\n' +
        'My brokerage: [brokerage name]',
    );
    expect(marks()).toEqual(['[your neighborhoods]', '[brokerage name]']);
  });

  it('writes the full block, then the voice profile after a blank line', async () => {
    await boot();
    type('niche', 'relocation');
    type('neighborhoods', 'Highlands, Wash Park');
    type('questions', 'What do closing costs look like?');
    type('brokerage', 'Northline Realty, LLC');
    type('voice', '\nWrite as me.\nShort sentences.\n');
    expect(carouselPre().textContent).toBe(
      CAROUSEL_HEAD +
        'About me:\n' +
        '- Niche: relocation\n' +
        '- Neighborhoods: Highlands, Wash Park\n' +
        '- Questions clients ask me most: What do closing costs look like?\n' +
        'My brokerage: Northline Realty, LLC\n' +
        '\n' +
        'My voice profile:\n' +
        'Write as me.\nShort sentences.',
    );
    expect(marks()).toEqual([]);
  });

  it('appends a voice profile to the ORIGINAL line when the first four are empty', async () => {
    await boot();
    type('voice', 'Write as me.');
    expect(carouselPre().textContent).toBe(`${CAROUSEL.text}\n\nMy voice profile:\nWrite as me.`);
  });

  it('never treats a bracket the visitor typed as a placeholder', async () => {
    await boot();
    type('niche', '[luxury]');
    expect(marks()).toEqual(['[your neighborhoods]', '[top client questions]', '[brokerage name]']);
    expect(carouselPre().textContent).toContain('- Niche: [luxury]\n');
  });

  it('copies exactly what is shown, through both Copy prompt and Copy & open Claude Projects', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { written } = stubClipboard();
    await boot();
    type('brokerage', 'Northline Realty');
    copyButton('carousel_creator').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(written).toHaveBeenLastCalledWith(carouselPre().textContent);
    click($('a[data-copy-open="carousel-creator-prompt"]'));
    expect(written).toHaveBeenLastCalledWith(carouselPre().textContent);
    expect(carouselPre().textContent).toContain('My brokerage: Northline Realty');
  });

  it('remembers the fields across a reload', async () => {
    await boot();
    type('niche', 'luxury');
    type('voice', 'Write as me.');
    await boot();
    expect(field('niche').value).toBe('luxury');
    expect(carouselPre().textContent).toContain('- Niche: luxury\n');
    expect(carouselPre().textContent).toContain('My voice profile:\nWrite as me.');
  });

  it('Clear empties the fields and storage and restores the original instructions', async () => {
    await boot();
    type('niche', 'luxury');
    type('brokerage', 'Northline');
    $<HTMLButtonElement>('[data-about-clear]').click();
    expect(field('niche').value).toBe('');
    expect(field('brokerage').value).toBe('');
    expect(carouselPre().textContent).toBe(CAROUSEL.text);
    expect(localStorage.getItem('ai101-about-you')).toBeNull();
    await boot();
    expect(carouselPre().textContent).toBe(CAROUSEL.text);
  });

  it('still assembles when storage refuses to read or write', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await boot();
    expect(() => type('niche', 'luxury')).not.toThrow();
    expect(carouselPre().textContent).toContain('- Niche: luxury\n');
  });

  it('reads corrupt storage as empty', async () => {
    localStorage.setItem('ai101-about-you', '{not json');
    await boot();
    expect(field('niche').value).toBe('');
    expect(carouselPre().textContent).toBe(CAROUSEL.text);
  });
});

describe('Copy & open (D-032)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  it('copies the prompt in the SAME tap, before the link opens, and lets the link open', async () => {
    const { written, legacy } = stubClipboard();
    await boot();
    const link = $('a[data-copy-open][data-app="ChatGPT"]');
    const { followed } = click(link);
    expect(followed).toBe(true);
    // Both writes started inside the click: the synchronous one has already finished.
    expect(legacy).toEqual([VOICE.text]);
    expect(written).toHaveBeenCalledWith(VOICE.text);
    expect(link.querySelector('[data-copy-label]')!.textContent).toBe('Copied');
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe('Copied to clipboard.');
    await vi.advanceTimersByTimeAsync(2000);
    expect(link.querySelector('[data-copy-label]')!.textContent).toBe('Copy & open ChatGPT');
  });

  it('opens a blank Claude chat after copying the voice profile prompt', async () => {
    const { written } = stubClipboard();
    await boot();
    const link = $<HTMLAnchorElement>('a[data-copy-open][data-app="Claude"]');
    expect(click(link).followed).toBe(true);
    expect(written).toHaveBeenCalledWith(VOICE.text);
    expect(link.getAttribute('href')).toBe('https://claude.ai/new');
  });

  it('two-tap mode: the first tap copies and says "Copied. Open ChatGPT", the second opens', async () => {
    const { written } = stubClipboard();
    window.history.replaceState(null, '', '/ai101');
    document.body.innerHTML = renderAi101Body();
    $('main').setAttribute('data-copy-open-taps', '2');
    vi.resetModules();
    await import('./main');
    const link = $('a[data-copy-open][data-app="ChatGPT"]');
    expect(click(link).followed).toBe(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(written).toHaveBeenCalledWith(VOICE.text);
    expect(link.querySelector('[data-copy-label]')!.textContent).toBe('Copied. Open ChatGPT');
    expect(click(link).followed).toBe(true);
    expect(link.querySelector('[data-copy-label]')!.textContent).toBe('Copy & open ChatGPT');
  });

  it('two-tap mode disarms after a while, so a late tap copies again rather than opening', async () => {
    stubClipboard();
    window.history.replaceState(null, '', '/ai101');
    document.body.innerHTML = renderAi101Body();
    $('main').setAttribute('data-copy-open-taps', '2');
    vi.resetModules();
    await import('./main');
    const link = $('a[data-copy-open][data-app="Claude"]');
    click(link);
    await vi.advanceTimersByTimeAsync(10000);
    expect(link.querySelector('[data-copy-label]')!.textContent).toBe('Copy & open Claude');
    expect(click(link).followed).toBe(false);
  });

  it('with no clipboard at all, the first tap stays and selects the prompt; the next tap opens', async () => {
    stubValue(window, 'isSecureContext', true);
    stubValue(navigator, 'clipboard', undefined);
    stubValue(document, 'execCommand', vi.fn(() => false));
    await boot();
    const link = $('a[data-copy-open][data-app="ChatGPT"]');
    expect(click(link).followed).toBe(false);
    expect(window.getSelection()?.toString()).toBe(VOICE.text);
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe(UI.copyFailedAnnouncement(VOICE.label));
    // Never "Copied" when nothing was.
    expect(link.querySelector('[data-copy-label]')!.textContent).toBe('Copy & open ChatGPT');
    // The visitor is never left without the app.
    expect(click(link).followed).toBe(true);
  });

  it('when only writeText can copy, the link opens at once and says Copied once the write lands', async () => {
    const { written, execCommand } = stubClipboard();
    execCommand.mockImplementation(() => false);
    await boot();
    const link = $('a[data-copy-open][data-app="Claude"]');
    expect(click(link).followed).toBe(true);
    expect(written).toHaveBeenCalledWith(VOICE.text);
    expect(link.querySelector('[data-copy-label]')!.textContent).toBe('Copy & open Claude');
    await vi.advanceTimersByTimeAsync(100);
    expect(link.querySelector('[data-copy-label]')!.textContent).toBe('Copied');
    expect(live()).toBe('Copied to clipboard.');
  });

  it('when both writes fail after the link has opened, it never claims Copied', async () => {
    const { execCommand } = stubClipboard(() => Promise.reject(new DOMException('denied', 'NotAllowedError')));
    execCommand.mockImplementation(() => false);
    await boot();
    const link = $('a[data-copy-open][data-app="Claude"]');
    expect(click(link).followed).toBe(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(link.querySelector('[data-copy-label]')!.textContent).toBe('Copy & open Claude');
    expect(live()).toBe('');
  });

  it('hands focus back to where it was: the link if it had it, the page if not', async () => {
    stubClipboard();
    await boot();
    const link = $<HTMLAnchorElement>('a[data-copy-open][data-app="ChatGPT"]');
    link.focus();
    click(link);
    expect(document.activeElement).toBe(link);
    link.blur();
    click($('a[data-copy-open][data-app="Claude"]'));
    expect(document.activeElement).toBe(document.body);
    // The buffer is gone either way.
    expect(document.querySelector('textarea.copy-buffer')).toBeNull();
  });

  it('holds its width while "Copied" shows, so the button beside it does not slide under the pointer', async () => {
    stubClipboard();
    await boot();
    const link = $('a[data-copy-open][data-app="ChatGPT"]');
    vi.spyOn(link, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 187.5, 44));
    click(link);
    expect(link.style.minWidth).toBe('187.5px');
    await vi.advanceTimersByTimeAsync(2000);
    expect(link.style.minWidth).toBe('');
  });

  it('two-tap mode: a failed copy selects the prompt, and the second tap still opens', async () => {
    stubValue(window, 'isSecureContext', true);
    stubValue(navigator, 'clipboard', undefined);
    stubValue(document, 'execCommand', vi.fn(() => false));
    window.history.replaceState(null, '', '/ai101');
    document.body.innerHTML = renderAi101Body();
    $('main').setAttribute('data-copy-open-taps', '2');
    vi.resetModules();
    await import('./main');
    const link = $('a[data-copy-open][data-app="ChatGPT"]');
    expect(click(link).followed).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(window.getSelection()?.toString()).toBe(VOICE.text);
    expect(live()).toBe(UI.copyFailedAnnouncement(VOICE.label));
    expect(click(link).followed).toBe(true);
  });
});

describe('starter chips (D-032)', () => {
  it('copies the chip’s own words, says Copied, and reveals the hint', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { written } = stubClipboard();
    await boot();
    expect($('.starters .hint').hidden).toBe(false);
    const chip = document.querySelectorAll<HTMLButtonElement>('button[data-copy-chip]')[0]!;
    chip.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(written).toHaveBeenCalledWith('A buyer asked if they should wait for rates to drop.');
    expect(chip.textContent).toBe('Copied');
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe('Copied to clipboard.');
    await vi.advanceTimersByTimeAsync(2000);
    expect(chip.textContent).toBe('A buyer asked if they should wait for rates to drop.');
  });
});

describe('Get the app (D-032)', () => {
  const hrefs = () =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[data-get-app]')).map((a) => a.getAttribute('href'));
  const as = (userAgent: string, maxTouchPoints = 0) => {
    stubValue(navigator, 'userAgent', userAgent);
    stubValue(navigator, 'maxTouchPoints', maxTouchPoints);
  };

  it('sends an iPhone to the App Store', async () => {
    as('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', 5);
    await boot();
    expect(hrefs()).toEqual([
      'https://apps.apple.com/app/chatgpt/id6448311069',
      'https://apps.apple.com/us/app/claude-by-anthropic/id6473753684',
    ]);
  });

  it('treats a "Macintosh" with touch as the iPad it is', async () => {
    as('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 5);
    await boot();
    expect(hrefs()[0]).toBe('https://apps.apple.com/app/chatgpt/id6448311069');
  });

  it('sends Android to Google Play', async () => {
    as('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36', 5);
    await boot();
    expect(hrefs()).toEqual([
      'https://play.google.com/store/apps/details?id=com.openai.chatgpt',
      'https://play.google.com/store/apps/details?id=com.anthropic.claude',
    ]);
  });

  it('leaves the download pages on a desktop, including a Mac with no touch', async () => {
    as('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 0);
    await boot();
    expect(hrefs()).toEqual(['https://chatgpt.com/download', 'https://claude.com/download']);
  });
});

describe('Send this to my laptop (D-032)', () => {
  it('opens the share sheet with the page’s Step 2 link', async () => {
    const share = vi.fn(() => Promise.resolve());
    stubValue(navigator, 'share', share);
    await boot();
    expect(click($('a[data-share]')).followed).toBe(false);
    expect(share).toHaveBeenCalledWith({
      title: 'AI 101 for Agents: Carousel Creator setup',
      url: 'https://www.amplifiedimpact.io/ai101#carousel-creator',
    });
  });

  it('ignores the AbortError of a closed share sheet', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('closed', 'AbortError')));
    stubValue(navigator, 'share', share);
    await boot();
    const before = window.location.href;
    click($('a[data-share]'));
    await Promise.resolve();
    await Promise.resolve();
    expect(window.location.href).toBe(before);
  });

  it('leaves the mailto: link alone where there is no share sheet', async () => {
    stubValue(navigator, 'share', undefined);
    await boot();
    expect(click($('a[data-share]')).followed).toBe(true);
  });
});
