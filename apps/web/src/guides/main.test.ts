import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validate } from './main';
import { guideFor, renderGuideBody } from './render';

// The free guides' one script (D-038, D-039, D-045), against the real markup in jsdom. `main.ts` boots on
// import, so each test renders a guide's body and then imports a fresh copy (`vi.resetModules()`).
// What jsdom cannot show (`:target`, a real download, the in-app browser itself) is for the browser
// check. Most tests use the Task Sync Starter Kit; the later groups show the script takes what differs
// (the route, the unlock key) from the page, so The Ops Time Audit works the same, and what the Reel
// Editor adds (copy buttons, the share sheet, arriving on `#download`).

async function boot(url = '/task-sync-starter', before?: () => void, slug = 'task-sync-starter'): Promise<void> {
  window.history.replaceState(null, '', url);
  document.body.innerHTML = renderGuideBody(guideFor(slug));
  before?.();
  vi.resetModules();
  await import('./main');
}

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Nothing matches ${selector}`);
  return el;
};
const card = () => $('[data-unlock-key]');
const unlocked = () => card().getAttribute('data-state') === 'unlocked';

function fill(firstName: string, email: string) {
  $<HTMLInputElement>('#guide-firstName').value = firstName;
  $<HTMLInputElement>('#guide-email').value = email;
}
const submit = () => $('#guide-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
/** Lets the fetch chain's promises settle. */
const settle = () => new Promise((r) => setTimeout(r, 0));

const replaced: Array<[object, PropertyKey, PropertyDescriptor | undefined]> = [];
function stubWith(target: object, key: PropertyKey, descriptor: PropertyDescriptor) {
  replaced.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
  Object.defineProperty(target, key, { configurable: true, ...descriptor });
}
const stub = (target: object, key: PropertyKey, value: unknown) => stubWith(target, key, { writable: true, value });

/**
 * A real click, reporting whether the default action (following the link) was left to happen. A last
 * listener on `window` reads that after the page's own handlers, then cancels it, so jsdom (which
 * cannot navigate) never tries. /ai101's test helper, as is.
 */
function click(el: Element): { followed: boolean } {
  let followed = false;
  const last = (event: Event) => {
    followed = !event.defaultPrevented;
    event.preventDefault();
  };
  window.addEventListener('click', last);
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  window.removeEventListener('click', last);
  return { followed };
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
    expect($<HTMLFormElement>('#guide-form').noValidate).toBe(true);
    expect(unlocked()).toBe(false);
  });

  it('shows each bad field in place, focuses the first, and posts nothing', async () => {
    await boot();
    fill(' ', 'nope');
    submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect($('#firstName-error').textContent).toBe('Enter your first name.');
    expect($('#email-error').textContent).toBe('Enter a valid email address.');
    expect($('#guide-firstName').getAttribute('aria-invalid')).toBe('true');
    expect($('#guide-firstName').getAttribute('aria-describedby')).toBe('firstName-error');
    expect(document.activeElement).toBe($('#guide-firstName'));

    // Typing clears that field's error.
    $('#guide-firstName').dispatchEvent(new Event('input'));
    expect($('#firstName-error').textContent).toBe('');
    expect($('#guide-firstName').hasAttribute('aria-invalid')).toBe(false);
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
    expect(localStorage.getItem('tss-unlocked')).toBe('1');
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
    expect(document.activeElement).toBe($('#guide-email'));
    expect(unlocked()).toBe(false);
    expect(localStorage.getItem('tss-unlocked')).toBeNull();
  });

  it('shows the general error on a server error or a dropped connection, and can be tried again', async () => {
    vi.useFakeTimers();
    await boot();
    respond(500);
    fill('Pat', 'pat@example.com');
    submit();
    await vi.runAllTimersAsync();
    expect($('#guide-error').hasAttribute('data-shown')).toBe(true);
    expect($('#guide-error').textContent).toBe('Something went wrong. Try again.');
    expect(unlocked()).toBe(false);

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    submit();
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect($('#guide-error').textContent).toBe('Something went wrong. Try again.');

    respond(201, { ok: true });
    submit();
    await vi.runAllTimersAsync();
    expect($('#guide-error').hasAttribute('data-shown')).toBe(false);
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
    expect($('#guide-form button').getAttribute('aria-disabled')).toBe('true');
    finish(new Response('{"ok":true}', { status: 201 }));
    await settle();
    expect($('#guide-form button').hasAttribute('aria-disabled')).toBe(false);
  });
});

describe('a returning visitor', () => {
  it('sees the download straight away, without focus moving', async () => {
    await boot('/task-sync-starter', () => localStorage.setItem('tss-unlocked', '1'));
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

describe('The Ops Time Audit, through the same script (D-039)', () => {
  it("posts to its own route and remembers under its own key, which the other guide's never opens", async () => {
    await boot('/ops-time-audit?src=ig', undefined, 'ops-time-audit');
    respond(201, { ok: true });
    fill('Pat', 'pat@example.com');
    submit();
    await settle();
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe('/api/ops-time-audit');
    expect(unlocked()).toBe(true);
    expect(localStorage.getItem('ota-unlocked')).toBe('1');
    expect(localStorage.getItem('tss-unlocked')).toBeNull();
  });

  it('stays locked for a visitor who only got the other guide', async () => {
    await boot('/ops-time-audit', () => localStorage.setItem('tss-unlocked', '1'), 'ops-time-audit');
    expect(unlocked()).toBe(false);
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

describe('The Reel Editor, through the same script (D-045)', () => {
  const bootReel = (url = '/reel-editor', before?: () => void) => boot(url, before, 'reel-editor');
  const chip = () => $<HTMLButtonElement>('#download .setup button[data-copy]');
  const toast = () => $('#guide-live').textContent;

  /** The clipboard as the tests see it: `writeText` and the legacy `execCommand` path, both recorded. */
  function stubClipboard(writeText: (text: string) => Promise<void> = () => Promise.resolve(), legacyWorks = true) {
    stub(window, 'isSecureContext', true);
    const written = vi.fn(writeText);
    stub(navigator, 'clipboard', { writeText: written });
    const legacy: string[] = [];
    stub(
      document,
      'execCommand',
      vi.fn((command: string) => {
        const buffer = document.querySelector<HTMLTextAreaElement>('textarea.copy-buffer');
        if (command === 'copy' && buffer) legacy.push(buffer.value);
        return legacyWorks;
      }),
    );
    return { written, legacy };
  }

  it("posts to its own route and remembers under its own key, which no other guide's opens", async () => {
    await bootReel('/reel-editor?src=ig', () => localStorage.setItem('tss-unlocked', '1'));
    expect(unlocked()).toBe(false);
    respond(201, { ok: true });
    fill('Pat', 'pat@example.com');
    submit();
    await settle();
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe('/api/reel-editor');
    expect(unlocked()).toBe(true);
    expect(document.activeElement).toBe($('#download'));
    expect(localStorage.getItem('re-unlocked')).toBe('1');
  });

  it('keeps the setup showing for a visitor who arrives on #download, without remembering it', async () => {
    // The link "Send This to My Computer" sends. `:target` shows the card; this keeps it once another
    // link on the page changes the address.
    await bootReel('/reel-editor#download');
    expect(unlocked()).toBe(true);
    expect(document.activeElement).not.toBe($('#download'));
    expect(localStorage.getItem('re-unlocked')).toBeNull();
  });

  it('copies the words with a tap and says so, then clears the toast', async () => {
    vi.useFakeTimers();
    const { written, legacy } = stubClipboard();
    await bootReel('/reel-editor', () => localStorage.setItem('re-unlocked', '1'));
    click(chip());
    await vi.advanceTimersByTimeAsync(150);
    expect(written).toHaveBeenCalledWith('Edit this into a Reel');
    expect(legacy).toEqual([]);
    expect(toast()).toBe('Copied. Paste it into Claude.');
    await vi.advanceTimersByTimeAsync(3200);
    expect(toast()).toBe('');
  });

  it('copies every one of "What to say" as its own words', async () => {
    const { written } = stubClipboard();
    await bootReel();
    for (const button of Array.from(document.querySelectorAll('section.prompts button[data-copy]'))) click(button);
    await settle();
    expect(written.mock.calls.map(([words]) => words)).toEqual([
      'Edit this into a Reel',
      'Make this more engaging with animations, sound effects and music',
      'Make my voice louder',
      'Turn the sound effects down',
      'No music',
      'Move the graphics lower',
      'Make it look more like a creator edited it',
      'Cleaner, less busy',
    ]);
  });

  it('falls back to the legacy copy where writeText is refused, and leaves no buffer behind', async () => {
    vi.useFakeTimers();
    const { legacy } = stubClipboard(() => Promise.reject(new Error('denied')));
    await bootReel();
    click(chip());
    await vi.advanceTimersByTimeAsync(150);
    expect(legacy).toEqual(['Edit this into a Reel']);
    expect(document.querySelector('textarea.copy-buffer')).toBeNull();
    expect(toast()).toBe('Copied. Paste it into Claude.');
  });

  it('selects the words and says how to copy them when nothing can write the clipboard', async () => {
    vi.useFakeTimers();
    stub(window, 'isSecureContext', true);
    stub(navigator, 'clipboard', undefined);
    stub(
      document,
      'execCommand',
      vi.fn(() => false),
    );
    await bootReel();
    click(chip());
    await vi.advanceTimersByTimeAsync(150);
    expect(toast()).toBe("Couldn't copy automatically. The words are selected: copy them from your device's menu.");
    expect(window.getSelection()?.toString()).toBe('Edit this into a Reel');
  });

  describe('Copy & Open Claude (D-070)', () => {
    const open = () => $<HTMLAnchorElement>('#download a[data-copy-open]');

    it('copies the step’s words inside the tap, says so, and lets the link open Claude', async () => {
      vi.useFakeTimers();
      const { written, legacy } = stubClipboard();
      await bootReel('/reel-editor', () => localStorage.setItem('re-unlocked', '1'));
      expect(click(open()).followed).toBe(true);
      // Both paths start inside the click, so the words are on the clipboard before the app opens.
      expect(legacy).toEqual(['Edit this into a Reel']);
      expect(written).toHaveBeenCalledWith('Edit this into a Reel');
      await vi.advanceTimersByTimeAsync(150);
      expect(toast()).toBe('Copied. Paste it into Claude.');
    });

    it('when nothing can copy, stays put once and selects the words, then opens on the next tap', async () => {
      vi.useFakeTimers();
      stub(window, 'isSecureContext', false);
      stubClipboard(undefined, false);
      stub(window, 'isSecureContext', false);
      await bootReel('/reel-editor', () => localStorage.setItem('re-unlocked', '1'));
      expect(click(open()).followed).toBe(false);
      await vi.advanceTimersByTimeAsync(150);
      expect(toast()).toMatch(/Couldn't copy automatically/);
      expect(window.getSelection()?.toString()).toBe('Edit this into a Reel');
      expect(click(open()).followed).toBe(true);
    });
  });

  describe('one step at a time (D-070)', () => {
    const steps = () => Array.from(document.querySelectorAll<HTMLElement>('#download .setup-step'));
    const current = () => steps().findIndex((li) => li.hasAttribute('data-current')) + 1;
    const progress = () => $('#download [data-guided-progress]');
    const button = (name: 'back' | 'next' | 'restart') => $<HTMLButtonElement>(`#download [data-guided-${name}]`);

    it('shows the first step with "Step 1 of 4" and Next, and Back and Start Over hidden', async () => {
      await bootReel('/reel-editor', () => localStorage.setItem('re-unlocked', '1'));
      expect($('#download [data-guided]').hasAttribute('data-guided-on')).toBe(true);
      expect(current()).toBe(1);
      expect(steps().filter((li) => li.hasAttribute('data-current'))).toHaveLength(1);
      expect(progress().hidden).toBe(false);
      expect(progress().textContent).toBe('Step 1 of 4');
      expect($('#download [data-guided-nav]').hidden).toBe(false);
      expect([button('back').hidden, button('next').hidden, button('restart').hidden]).toEqual([true, false, true]);
    });

    it('moves with Next and Back, focuses the step’s heading, and remembers the place for next time', async () => {
      await bootReel('/reel-editor', () => localStorage.setItem('re-unlocked', '1'));
      button('next').click();
      button('next').click();
      expect(current()).toBe(3);
      expect(progress().textContent).toBe('Step 3 of 4');
      expect(document.activeElement).toBe(steps()[2]!.querySelector('h3'));
      button('back').click();
      expect(current()).toBe(2);
      expect(localStorage.getItem('re-unlocked-step-claude')).toBe('2');
      // A new visit opens where this one left off.
      await bootReel('/reel-editor', () => localStorage.setItem('re-unlocked', '1'));
      expect(current()).toBe(2);
    });

    it('ends on the last step with Start Over, which goes back to step 1', async () => {
      await bootReel('/reel-editor', () => {
        localStorage.setItem('re-unlocked', '1');
        localStorage.setItem('re-unlocked-step-claude', '9');
      });
      // A saved place past the end is the last step, not nothing.
      expect(current()).toBe(4);
      expect([button('back').hidden, button('next').hidden, button('restart').hidden]).toEqual([false, true, false]);
      button('restart').click();
      expect(current()).toBe(1);
    });
  });

  describe('Send This to My Computer', () => {
    /** `window.location`, with assignments to `href` recorded instead of followed. */
    function watchNavigation(): string[] {
      const real = window.location;
      const assigned: string[] = [];
      const fake = {
        get href() {
          return real.href;
        },
        set href(value: string) {
          assigned.push(value);
        },
        get hash() {
          return real.hash;
        },
        get search() {
          return real.search;
        },
      };
      stubWith(window, 'location', { get: () => fake });
      return assigned;
    }
    const shareLink = () => $<HTMLAnchorElement>('a[data-share]');

    it('opens the share sheet with the link to the setup, in place of the email', async () => {
      const share = vi.fn(() => Promise.resolve());
      stub(navigator, 'share', share);
      await bootReel();
      const assigned = watchNavigation();
      expect(click(shareLink()).followed).toBe(false);
      expect(share).toHaveBeenCalledWith({
        title: 'Reel Editor: add it to Claude on your computer',
        url: 'https://www.amplifiedimpact.io/reel-editor#download',
      });
      await settle();
      expect(assigned).toEqual([]);
    });

    it('ignores the AbortError of a share sheet that was closed', async () => {
      stub(
        navigator,
        'share',
        vi.fn(() => Promise.reject(new DOMException('closed', 'AbortError'))),
      );
      await bootReel();
      const assigned = watchNavigation();
      click(shareLink());
      await settle();
      expect(assigned).toEqual([]);
    });

    it('falls back to the email link when the share sheet fails another way', async () => {
      stub(
        navigator,
        'share',
        vi.fn(() => Promise.reject(new DOMException('no', 'NotAllowedError'))),
      );
      await bootReel();
      const assigned = watchNavigation();
      expect(click(shareLink()).followed).toBe(false);
      await settle();
      expect(assigned).toEqual([shareLink().href]);
      expect(assigned[0]).toMatch(/^mailto:\?subject=/);
    });

    it('leaves the email link to work as written where there is no share sheet', async () => {
      stub(navigator, 'share', undefined);
      await bootReel();
      expect(click(shareLink()).followed).toBe(true);
    });
  });
});
