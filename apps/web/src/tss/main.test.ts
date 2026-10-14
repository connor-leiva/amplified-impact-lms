import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validate } from './main';
import { renderTssBody } from './render';

// /task-sync-starter's script (D-038), against the real markup in jsdom. `main.ts` boots on import,
// so each test renders the body and then imports a fresh copy (`vi.resetModules()`). What jsdom
// cannot show (`:target`, a real download, the in-app browser itself) is for the browser check.

const KEY = 'tss-unlocked';

async function boot(url = '/task-sync-starter', before?: () => void): Promise<void> {
  window.history.replaceState(null, '', url);
  document.body.innerHTML = renderTssBody();
  before?.();
  vi.resetModules();
  await import('./main');
}

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Nothing matches ${selector}`);
  return el;
};
const card = () => $('#get-the-kit');
const unlocked = () => card().getAttribute('data-state') === 'unlocked';

function fill(firstName: string, email: string) {
  $<HTMLInputElement>('#tss-firstName').value = firstName;
  $<HTMLInputElement>('#tss-email').value = email;
}
const submit = () => $('#tss-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
/** Lets the fetch chain's promises settle. */
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

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  stub(globalThis, 'fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  for (const [target, key, descriptor] of replaced.splice(0).reverse()) {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else delete (target as Record<PropertyKey, unknown>)[key];
  }
});

describe('validate', () => {
  it("applies the API's rules, with the page's words", () => {
    expect(validate({ firstName: 'Pat', email: 'pat@example.com' })).toEqual({});
    expect(validate({ firstName: '', email: 'pat@' })).toEqual({
      firstName: 'Enter your first name.',
      email: 'Enter a valid email address.',
    });
    expect(validate({ firstName: 'x'.repeat(81), email: 'pat@example.c' })).toEqual({
      firstName: 'Enter your first name.',
      email: 'Enter a valid email address.',
    });
  });
});

describe('the opt-in', () => {
  it('takes over validation from the browser once it runs', async () => {
    await boot();
    expect($<HTMLFormElement>('#tss-form').noValidate).toBe(true);
    expect(unlocked()).toBe(false);
  });

  it('shows each bad field in place, focuses the first, and posts nothing', async () => {
    await boot();
    fill(' ', 'nope');
    submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect($('#firstName-error').textContent).toBe('Enter your first name.');
    expect($('#email-error').textContent).toBe('Enter a valid email address.');
    expect($('#tss-firstName').getAttribute('aria-invalid')).toBe('true');
    expect($('#tss-firstName').getAttribute('aria-describedby')).toBe('firstName-error');
    expect(document.activeElement).toBe($('#tss-firstName'));

    // Typing clears that field's error.
    $('#tss-firstName').dispatchEvent(new Event('input'));
    expect($('#firstName-error').textContent).toBe('');
    expect($('#tss-firstName').hasAttribute('aria-invalid')).toBe(false);
  });

  it('posts JSON with the trimmed fields and the link tag, then unlocks the download and remembers', async () => {
    await boot('/task-sync-starter?src=ig');
    respond(201, { ok: true });
    fill('  Pat ', ' pat@example.com ');
    submit();
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/task-sync-starter');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect(JSON.parse(String(init.body))).toEqual({
      firstName: 'Pat',
      email: 'pat@example.com',
      website: '',
      src: 'ig',
    });

    expect(unlocked()).toBe(true);
    expect(document.activeElement).toBe($('#download'));
    expect(localStorage.getItem(KEY)).toBe('1');
  });

  it('sends no src at all when the link had none', async () => {
    await boot();
    respond(201, { ok: true });
    fill('Pat', 'pat@example.com');
    submit();
    await settle();
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({
      firstName: 'Pat',
      email: 'pat@example.com',
      website: '',
    });
  });

  it("shows the API's 400 under the field it names, and stays locked", async () => {
    await boot();
    respond(400, { field: 'email', error: 'Enter a valid email address.' });
    fill('Pat', 'pat@example.com');
    submit();
    await settle();
    await settle();
    expect($('#email-error').textContent).toBe('Enter a valid email address.');
    expect(document.activeElement).toBe($('#tss-email'));
    expect(unlocked()).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('shows the general error on a server error or a dropped connection, and can be tried again', async () => {
    vi.useFakeTimers();
    await boot();
    respond(500);
    fill('Pat', 'pat@example.com');
    submit();
    await vi.runAllTimersAsync();
    expect($('#tss-error').hasAttribute('data-shown')).toBe(true);
    expect($('#tss-error').textContent).toBe('Something went wrong. Try again.');
    expect(unlocked()).toBe(false);

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    submit();
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect($('#tss-error').textContent).toBe('Something went wrong. Try again.');

    respond(201, { ok: true });
    submit();
    await vi.runAllTimersAsync();
    expect($('#tss-error').hasAttribute('data-shown')).toBe(false);
    expect(unlocked()).toBe(true);
  });

  it('sends one request for a double tap', async () => {
    await boot();
    let finish: (r: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (finish = r)));
    fill('Pat', 'pat@example.com');
    submit();
    submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect($('#tss-form button').getAttribute('aria-disabled')).toBe('true');
    finish(new Response('{"ok":true}', { status: 201 }));
    await settle();
    expect($('#tss-form button').hasAttribute('aria-disabled')).toBe(false);
  });
});

describe('a returning visitor', () => {
  it('sees the download straight away, without focus moving', async () => {
    await boot('/task-sync-starter', () => localStorage.setItem(KEY, '1'));
    expect(unlocked()).toBe(true);
    expect(document.activeElement).not.toBe($('#download'));
  });

  it('still gets the form, and a working one, when storage throws', async () => {
    stub(window, 'localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    await boot();
    expect(unlocked()).toBe(false);
    respond(201, { ok: true });
    fill('Pat', 'pat@example.com');
    submit();
    await settle();
    expect(unlocked()).toBe(true);
  });
});

describe('the in-app browser hint', () => {
  it("shows in Instagram's browser, where a PDF opens instead of saving", async () => {
    stub(
      navigator,
      'userAgent',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 350.0.0',
    );
    await boot();
    expect($('[data-in-app]').hidden).toBe(false);
  });

  it('stays hidden in an ordinary browser', async () => {
    stub(
      navigator,
      'userAgent',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    );
    await boot();
    expect($('[data-in-app]').hidden).toBe(true);
  });
});
