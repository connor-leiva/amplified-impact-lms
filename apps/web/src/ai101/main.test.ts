import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE } from './content';
import { fillPrompt, normalizePhone } from './main';
import { renderAi101Body } from './render';

// /ai101's one script, the step-through (D-034), against the real markup in jsdom. What jsdom cannot
// show (the clipboard itself, layout, `:target`, a real navigation) is the e2e spec's.
//
// `main.ts` boots on import, as it does in the page, so each test renders the body and THEN imports
// a fresh copy of the module (`vi.resetModules()`): restoring a visitor's place and fields on load is
// part of what is under test. The static import above (for `fillPrompt` and `normalizePhone`) boots
// once on an empty document, where every feature finds nothing and returns.
//
// Where a test pins a value the visitor sees (a toast, an error, a label, a URL), the value is typed
// out here rather than read from `content.ts`, so a change to the copy is a change to this file too.
// `PAGE` is read only for whole prompt templates, where the point is "exactly as written".

const KEY = 'ai101-v2';
const VOICE = PAGE.voicePrompt.text;
const CAROUSEL = PAGE.carouselPrompt.text;
const BRAND = PAGE.brandPrompt.text;

async function boot(url = '/ai101', before?: () => void): Promise<void> {
  window.history.replaceState(null, '', url);
  document.documentElement.classList.remove('steps-on');
  document.body.innerHTML = renderAi101Body();
  before?.();
  vi.resetModules();
  await import('./main');
}

function $<T extends Element = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Nothing matches ${selector}`);
  return el;
}
const $$ = <T extends Element = HTMLElement>(selector: string) => Array.from(document.querySelectorAll<T>(selector));

const live = () => $('#ai101-live').textContent;
const saved = () => JSON.parse(localStorage.getItem(KEY) ?? 'null') as Record<string, unknown> | null;
const save = (state: Record<string, unknown>) => localStorage.setItem(KEY, JSON.stringify(state));

/**
 * Properties these tests replace on browser objects (`navigator.clipboard`, `isSecureContext`,
 * `document.execCommand`, `window.localStorage`, `window.location`, ...), put back exactly as they
 * were after each test: jsdom defines some on the instance and some on the prototype, so "delete the
 * override" alone could delete the original.
 */
const replaced: Array<[object, PropertyKey, PropertyDescriptor | undefined]> = [];
function stub(target: object, key: PropertyKey, descriptor: PropertyDescriptor) {
  replaced.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
  Object.defineProperty(target, key, { configurable: true, ...descriptor });
}
const stubValue = (target: object, key: PropertyKey, value: unknown) => stub(target, key, { writable: true, value });

/**
 * A real click, reporting whether the default action (following the link) was left to happen. A
 * last listener on `window` reads that after every handler of the page has run, then cancels it, so
 * jsdom (which cannot navigate) never tries: a followed `#hash` link would otherwise fire a
 * `hashchange` a moment later, into whichever test is running by then.
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

type FieldName = 'market' | 'clients' | 'niche' | 'hoods' | 'questions' | 'brokerage' | 'profile';
const FIELDS: readonly FieldName[] = ['market', 'clients', 'niche', 'hoods', 'questions', 'brokerage', 'profile'];
const field = (name: FieldName) => $<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${name}"]`);
/** Types into a fill field the way a browser reports it: the value, then an `input` event. */
function type(name: FieldName, value: string) {
  const el = field(name);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

const pre = (blockId: string) => $(`#${blockId} pre[data-prompt-text]`);
const voicePre = () => pre('voice-profile-prompt');
const brandPre = () => pre('carousel-creator-brand-prompt');
const carouselPre = () => pre('carousel-creator-prompt');
const marks = (el: Element) => Array.from(el.querySelectorAll('mark')).map((m) => m.textContent);

/** `window.scrollTo` and `Element#scrollIntoView` (which jsdom does not have), recorded. */
let scrollTo: ReturnType<typeof vi.fn>;
let scrolledIntoView: Element[];

/**
 * The clock the footer's double-tap guard reads. Each `Date.now()` is a second after the last, so
 * the tests' back-to-back clicks are separate taps; the double-tap tests set it by hand.
 */
let clockMs = 0;
let clockStep = 1000;

beforeEach(() => {
  clockMs = 1_000_000;
  clockStep = 1000;
  vi.spyOn(Date, 'now').mockImplementation(() => (clockMs += clockStep));
  try {
    localStorage.clear();
  } catch {
    /* a test below replaces it */
  }
  scrollTo = vi.fn();
  stubValue(window, 'scrollTo', scrollTo);
  scrolledIntoView = [];
  stubValue(Element.prototype, 'scrollIntoView', function (this: Element) {
    scrolledIntoView.push(this);
  });
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
  document.documentElement.classList.remove('steps-on');
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

// ================================================================================================
// The step-through (D-034)
// ================================================================================================

/** Every screen in order, as the header and footer must show it. Typed out: this IS the flow. */
const SCREENS = [
  { anchor: 'welcome', stage: 'Welcome', count: '', next: 'Start Part I', bar: '0%' },
  { anchor: 'voice-profile', stage: 'Part I · Voice Profile', count: '1 of 4', next: "I'm Ready", bar: '9%' },
  {
    anchor: 'voice-profile-copy',
    stage: 'Part I · Voice Profile',
    count: '2 of 4',
    next: 'I Have My Profile',
    bar: '18%',
  },
  { anchor: 'voice-profile-save', stage: 'Part I · Voice Profile', count: '3 of 4', next: 'Saved It', bar: '27%' },
  { anchor: 'voice-profile-test', stage: 'Part I · Voice Profile', count: '4 of 4', next: 'Start Part II', bar: '36%' },
  {
    anchor: 'carousel-creator',
    stage: 'Part II · Carousel Creator',
    count: '1 of 5',
    next: "I'm on My Laptop",
    bar: '45%',
  },
  {
    anchor: 'carousel-creator-checklist',
    stage: 'Part II · Carousel Creator',
    count: '2 of 5',
    next: 'My Brand Is Saved',
    bar: '55%',
  },
  { anchor: 'carousel-creator-about', stage: 'Part II · Carousel Creator', count: '3 of 5', next: 'Next', bar: '64%' },
  {
    anchor: 'carousel-creator-project',
    stage: 'Part II · Carousel Creator',
    count: '4 of 5',
    next: 'Project Is Made',
    bar: '73%',
  },
  {
    anchor: 'carousel-creator-first-idea',
    stage: 'Part II · Carousel Creator',
    count: '5 of 5',
    next: 'How a Week Works',
    bar: '82%',
  },
  { anchor: 'carousel-creator-week', stage: 'Your Week', count: '', next: 'Last Thing', bar: '91%' },
  { anchor: 'waitlist', stage: 'December Waitlist', count: '', next: '', bar: '100%' },
] as const;
const LAST = SCREENS.length - 1;
const indexOf = (anchor: string) => SCREENS.findIndex((s) => s.anchor === anchor);

/** The ids of the screens marked current: exactly one, always, once the script runs. */
const current = () => $$('section[data-current]').map((s) => s.id);
const stage = () => $('[data-stage-label]').textContent;
const count = () => $('[data-count-label]').textContent;
const bar = () => $('[data-bar]').style.width;
const nextLabel = () => $('[data-next-label]').textContent;
const nextButton = () => $<HTMLButtonElement>('button[data-next]');
const backButton = () => $<HTMLButtonElement>('button[data-back]');
const restartButton = () => $<HTMLButtonElement>('button[data-restart]');
const heading = (anchor: string) => $(`#${anchor}-heading`);

describe('boot and resilience', () => {
  it('does not throw on a page with none of its elements, and leaves it alone', async () => {
    document.body.innerHTML = '';
    vi.resetModules();
    await expect(import('./main')).resolves.toBeDefined();
    expect(document.documentElement.classList.contains('steps-on')).toBe(false);
  });

  it.each([
    '[data-stage-label]',
    '[data-count-label]',
    '[data-bar]',
    'button[data-back]',
    'button[data-next]',
    '[data-next-label]',
    'button[data-restart]',
  ])('stays one long page, with no header or footer, when %s is missing', async (selector) => {
    await boot('/ai101', () => $(selector).remove());
    expect(document.documentElement.classList.contains('steps-on')).toBe(false);
    expect($$('[data-steps-chrome]').map((el) => el.hidden)).toEqual([true, true]);
    expect(current()).toEqual([]);
  });

  it('still fills, steps and validates when reading window.localStorage itself throws', async () => {
    stub(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
    await boot();
    expect(current()).toEqual(['welcome']);
    type('market', 'Hartford, CT');
    expect(voicePre().textContent).toContain(`${VOICE_MARKET} Hartford, CT\n${VOICE_CLIENTS}`);
    nextButton().click();
    expect(current()).toEqual(['voice-profile']);
    nextButton().click();
    backButton().click();
    expect(current()).toEqual(['voice-profile']);
    $('button[data-pick="chatgpt"]').click();
    expect($('button[data-pick="chatgpt"]').getAttribute('aria-pressed')).toBe('true');
    expect($<HTMLFormElement>('#waitlist-form').noValidate).toBe(true);
  });

  it('still fills and steps when getItem and setItem throw', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await boot();
    expect(current()).toEqual(['welcome']);
    expect(() => type('niche', 'Luxury condos')).not.toThrow();
    expect(carouselPre().textContent).toContain('- Niche: Luxury condos\n');
    expect(() => nextButton().click()).not.toThrow();
    expect(current()).toEqual(['voice-profile']);
  });

  it.each([
    [''],
    ['{not json'],
    ['null'],
    ['""'],
    ['"ai101"'],
    ['42'],
    ['true'],
    ['[1,2,3]'],
    ['{"i":"3","app":"gpt","market":7,"questions":["a"]}'],
    ['{"i":-1}'],
    ['{"i":2.5}'],
    ['{"i":null,"app":null,"profile":null}'],
  ])('reads a saved state of %j as nothing saved, then writes a well-formed one', async (raw) => {
    localStorage.setItem(KEY, raw);
    await boot();
    expect(current()).toEqual(['welcome']);
    expect($('button[data-pick="claude"]').getAttribute('aria-pressed')).toBe('true');
    for (const name of FIELDS) expect(field(name).value).toBe('');
    expect(voicePre().textContent).toBe(VOICE);
    expect(carouselPre().textContent).toBe(CAROUSEL);
    // Showing the first screen saves the place, which replaces the bad value.
    expect(saved()).toEqual({
      i: 0,
      app: 'claude',
      path: 'samples',
      market: '',
      clients: '',
      niche: '',
      hoods: '',
      questions: '',
      brokerage: '',
      profile: '',
    });
  });

  it('keeps each well-formed key of a partly wrong state, and drops what it does not know', async () => {
    localStorage.setItem(KEY, '{"i":"3","app":"chatgpt","market":"Hartford, CT","clients":5,"extra":"x"}');
    await boot();
    expect(current()).toEqual(['welcome']);
    expect($('button[data-pick="chatgpt"]').getAttribute('aria-pressed')).toBe('true');
    expect(field('market').value).toBe('Hartford, CT');
    expect(field('clients').value).toBe('');
    expect(saved()).not.toHaveProperty('extra');
  });

  /** What the features that did NOT break must still do. */
  function expectTheRestWorks(broken: 'fill' | 'getApp' | 'waitlist') {
    expect(current()).toEqual(['welcome']);
    nextButton().click();
    expect(current()).toEqual(['voice-profile']);
    expect($$('[data-js-only]').every((el) => !el.hidden)).toBe(true);
    $('button[data-pick="chatgpt"]').click();
    expect($('[data-pick-panel="chatgpt"]').hidden).toBe(false);
    if (broken !== 'fill') {
      type('market', 'Hartford, CT');
      expect(voicePre().textContent).toContain(`${VOICE_MARKET} Hartford, CT\n`);
    }
    if (broken !== 'waitlist') expect($<HTMLFormElement>('#waitlist-form').noValidate).toBe(true);
  }

  it.each<['fill' | 'getApp' | 'waitlist', () => void, string]>([
    [
      'fill',
      () =>
        Object.defineProperty($('#field-market'), 'value', {
          configurable: true,
          get: () => '',
          set() {
            throw new Error('fill broke');
          },
        }),
      'fill broke',
    ],
    [
      'getApp',
      () =>
        stub(navigator, 'userAgent', {
          get() {
            throw new Error('user agent broke');
          },
        }),
      'user agent broke',
    ],
    [
      'waitlist',
      () =>
        Object.defineProperty($('#waitlist-form'), 'noValidate', {
          configurable: true,
          get: () => false,
          set() {
            throw new Error('form broke');
          },
        }),
      'form broke',
    ],
  ])(
    'when the %s feature throws, the others still start and the error is reported on a timer',
    async (what, breakIt, message) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      await boot('/ai101', breakIt);
      expectTheRestWorks(what);
      // Not swallowed: rethrown outside boot(), where the browser reports it.
      expect(() => vi.runOnlyPendingTimers()).toThrow(message);
    },
  );
});

describe('the step-through', () => {
  describe('one move per tap', () => {
    it('a double tap on Next moves one screen, not two', async () => {
      await boot();
      clockStep = 100; // two clicks 100 ms apart
      nextButton().click();
      nextButton().click();
      expect(current()).toEqual(['voice-profile']);
      clockStep = 1000; // a deliberate second tap
      nextButton().click();
      expect(current()).toEqual(['voice-profile-copy']);
    });

    it('a double tap on "Last Thing" lands on the waitlist, not back on Welcome via Start Over', async () => {
      save({ i: 10 });
      await boot();
      expect(current()).toEqual(['carousel-creator-week']);
      clockStep = 120;
      nextButton().click();
      // Start Over now sits where Next was; the second click of the double tap lands on it.
      restartButton().click();
      expect(current()).toEqual(['waitlist']);
      expect(saved()).toMatchObject({ i: 11 });
    });

    it('a double tap on Back moves one screen back', async () => {
      save({ i: 5 });
      await boot();
      clockStep = 100;
      backButton().click();
      backButton().click();
      expect(current()).toEqual(['voice-profile-test']);
    });
  });

  it('has the twelve screens, in order', async () => {
    await boot();
    expect($$('section[data-screen]').map((s) => s.id)).toEqual(SCREENS.map((s) => s.anchor));
  });

  it('starts on the first screen when nothing is saved, with the header and footer shown', async () => {
    await boot();
    expect(document.documentElement.classList.contains('steps-on')).toBe(true);
    expect($$('[data-steps-chrome]').map((el) => el.tagName)).toEqual(['HEADER', 'NAV']);
    expect($$('[data-steps-chrome]').map((el) => el.hidden)).toEqual([false, false]);
    expect(current()).toEqual(['welcome']);
    expect(stage()).toBe('Welcome');
    expect(count()).toBe('');
    expect(bar()).toBe('0%');
    expect(nextLabel()).toBe('Start Part I');
    expect(backButton().hidden).toBe(true);
    expect(nextButton().hidden).toBe(false);
    expect(restartButton().hidden).toBe(true);
    // Focus is not moved on load: the visitor has done nothing yet.
    expect(document.activeElement).toBe(document.body);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(saved()).toMatchObject({ i: 0 });
  });

  it('walks every screen with Next: one current screen, its header, bar and button labels, focus and place', async () => {
    await boot();
    SCREENS.forEach((s, k) => {
      expect(current()).toEqual([s.anchor]);
      expect(stage()).toBe(s.stage);
      expect(count()).toBe(s.count);
      expect(bar()).toBe(s.bar);
      expect(nextLabel()).toBe(s.next);
      expect(backButton().hidden).toBe(k === 0);
      expect(nextButton().hidden).toBe(k === LAST);
      expect(restartButton().hidden).toBe(k !== LAST);
      expect(saved()).toMatchObject({ i: k });
      expect(document.activeElement).toBe(k === 0 ? document.body : heading(s.anchor));
      expect(scrollTo).toHaveBeenCalledTimes(k + 1);
      expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
      if (k < LAST) nextButton().click();
    });
  });

  it('Back goes one screen back, focuses its heading and saves the place', async () => {
    save({ i: 4 });
    await boot();
    backButton().click();
    expect(current()).toEqual(['voice-profile-save']);
    expect(stage()).toBe('Part I · Voice Profile');
    expect(count()).toBe('3 of 4');
    expect(nextLabel()).toBe('Saved It');
    expect(document.activeElement).toBe(heading('voice-profile-save'));
    expect(saved()).toMatchObject({ i: 3 });
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    backButton().click();
    backButton().click();
    backButton().click();
    expect(current()).toEqual(['welcome']);
    expect(backButton().hidden).toBe(true);
    // The first screen's heading is its <h1>.
    expect(document.activeElement).toBe($('h1#welcome-heading'));
  });

  it('Start Over, on the last screen, goes back to the first and focuses it', async () => {
    save({ i: LAST });
    await boot();
    expect(current()).toEqual(['waitlist']);
    expect(nextButton().hidden).toBe(true);
    expect(restartButton().hidden).toBe(false);
    expect(restartButton().textContent).toBe('Start Over');
    expect(nextLabel()).toBe('');
    restartButton().click();
    expect(current()).toEqual(['welcome']);
    expect(document.activeElement).toBe($('h1#welcome-heading'));
    expect(saved()).toMatchObject({ i: 0 });
    expect(nextButton().hidden).toBe(false);
    expect(restartButton().hidden).toBe(true);
    expect(nextLabel()).toBe('Start Part I');
    expect(bar()).toBe('0%');
  });

  it('restores a saved screen on load, without moving focus', async () => {
    save({ i: 7 });
    await boot();
    expect(current()).toEqual(['carousel-creator-about']);
    expect(stage()).toBe('Part II · Carousel Creator');
    expect(count()).toBe('3 of 5');
    expect(bar()).toBe('64%');
    expect(nextLabel()).toBe('Next');
    expect(backButton().hidden).toBe(false);
    expect(document.activeElement).toBe(document.body);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it.each([12, 1000])('falls back to the first screen for a saved place (%i) past the last', async (i) => {
    save({ i, market: 'Hartford, CT' });
    await boot();
    expect(current()).toEqual(['welcome']);
    expect(saved()).toMatchObject({ i: 0, market: 'Hartford, CT' });
  });

  describe('a link to a part of the page', () => {
    it.each([
      ['#voice-profile-prompt', 'voice-profile-copy'],
      ['#four-things', 'carousel-creator-week'],
      ['#sprint', 'carousel-creator-week'],
      ['#waitlist-joined', 'waitlist'],
      ['#waitlist-error', 'waitlist'],
      ['#carousel-creator-brand-prompt', 'carousel-creator-checklist'],
      ['#carousel-creator-prompt', 'carousel-creator-project'],
    ])('%s in the address opens %s over the saved place, and scrolls to it', async (hash, anchor) => {
      save({ i: 7 });
      await boot(`/ai101${hash}`);
      expect(current()).toEqual([anchor]);
      expect(scrolledIntoView).toEqual([$(hash)]);
      expect(scrollTo).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(document.body);
      expect(saved()).toMatchObject({ i: indexOf(anchor) });
    });

    it('a hash naming a screen itself opens that screen at its top', async () => {
      save({ i: 2 });
      await boot('/ai101#carousel-creator');
      expect(current()).toEqual(['carousel-creator']);
      expect(scrolledIntoView).toEqual([]);
      expect(scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('decodes a percent-encoded hash', async () => {
      await boot('/ai101#four%2Dthings');
      expect(current()).toEqual(['carousel-creator-week']);
    });

    it.each(['#nope', '#ai101-live', '#'])(
      'a hash (%s) that names no part of any screen falls back to the saved place',
      async (hash) => {
        save({ i: 3 });
        await boot(`/ai101${hash}`);
        expect(current()).toEqual(['voice-profile-save']);
        expect(scrolledIntoView).toEqual([]);
      },
    );

    // A malformed escape in the address once threw after the page had gone one-screen-at-a-time,
    // leaving every screen hidden under a Next button that did nothing.
    it('an undecodable hash (#%) reads as no hash, not a blank page', async () => {
      save({ i: 3 });
      await boot('/ai101#%');
      expect(current()).toEqual(['voice-profile-save']);
      nextButton().click();
      expect(current()).toEqual(['voice-profile-test']);
    });

    it('"Skip to Part II" goes to Part II in this tab and focuses its heading', async () => {
      await boot();
      const skip = $<HTMLAnchorElement>('a[href="#carousel-creator"]');
      expect(skip.textContent).toBe('Already have a voice profile? Skip to Part II');
      expect(click(skip).followed).toBe(false);
      expect(current()).toEqual(['carousel-creator']);
      expect(document.activeElement).toBe(heading('carousel-creator'));
      expect(saved()).toMatchObject({ i: 5 });
      expect(stage()).toBe('Part II · Carousel Creator');
    });

    it('a link to an id the screens do not have is left to the browser', async () => {
      await boot();
      const a = document.createElement('a');
      a.href = '#nope';
      a.textContent = 'nowhere';
      $('#welcome').appendChild(a);
      expect(click(a).followed).toBe(true);
      expect(current()).toEqual(['welcome']);
    });

    it('a hashchange to a known id goes to its screen, focuses it and scrolls to the part', async () => {
      await boot();
      window.history.replaceState(null, '', '/ai101#four-things');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      expect(current()).toEqual(['carousel-creator-week']);
      expect(document.activeElement).toBe(heading('carousel-creator-week'));
      expect(scrolledIntoView).toEqual([$('#four-things')]);
      expect(saved()).toMatchObject({ i: 10 });
    });

    it('a hashchange to an unknown id changes nothing', async () => {
      save({ i: 2 });
      await boot();
      window.history.replaceState(null, '', '/ai101#nope');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      expect(current()).toEqual(['voice-profile-copy']);
      expect(document.activeElement).toBe(document.body);
    });
  });

  describe('taking the hash out of the address on a move', () => {
    it.each<[string, string, () => void, string]>([
      ['Next', '/ai101?src=qr#voice-profile-prompt', () => nextButton().click(), 'voice-profile-save'],
      ['Back', '/ai101?src=qr#voice-profile-prompt', () => backButton().click(), 'voice-profile'],
      ['Start Over', '/ai101?src=qr#waitlist-joined', () => restartButton().click(), 'welcome'],
      [
        'a link',
        '/ai101?src=qr#voice-profile-prompt',
        () => click($('a[href="#carousel-creator"]')),
        'carousel-creator',
      ],
    ])('%s replaces the address without the hash, keeping ?src', async (_what, url, act, anchor) => {
      await boot(url);
      const replaceState = vi.spyOn(window.history, 'replaceState');
      const entries = window.history.length;
      act();
      expect(current()).toEqual([anchor]);
      expect(replaceState).toHaveBeenCalledWith(null, '', '/ai101?src=qr');
      expect(window.location.hash).toBe('');
      expect(window.location.search).toBe('?src=qr');
      expect(window.history.length).toBe(entries);
    });

    it('leaves history alone when there is no hash', async () => {
      await boot('/ai101');
      const replaceState = vi.spyOn(window.history, 'replaceState');
      nextButton().click();
      backButton().click();
      expect(replaceState).not.toHaveBeenCalled();
    });

    it('a reload after moving on resumes from the saved place, not the old link', async () => {
      await boot('/ai101#voice-profile-prompt');
      nextButton().click();
      nextButton().click();
      await boot(`${window.location.pathname}${window.location.search}${window.location.hash}`);
      expect(current()).toEqual(['voice-profile-test']);
    });
  });
});

// ================================================================================================
// Filling the prompts (D-034)
// ================================================================================================

/** The voice prompt's ABOUT ME lines that market and clients fill (D-036). */
const VOICE_MARKET = "My market, and what I'm known for:";
const VOICE_CLIENTS = 'My clients are mostly:';
/** The prompt's own bracketed words: instructions to the AI, never blanks. */
const VOICE_LITERAL = ["[VERIFY: what's needed]", '[VERIFY]'];
const ABOUT_EMPTY =
  'About me:\n' +
  '- Niche: [your niche]\n' +
  '- Neighborhoods: [neighborhoods]\n' +
  '- Questions clients ask me most: [top client questions]\n' +
  'My brokerage: [brokerage name]\n' +
  '\n' +
  'My voice profile:\n' +
  '[paste the profile that starts with "Write as me."]';
const CAROUSEL_HEAD = CAROUSEL.slice(0, CAROUSEL.length - ABOUT_EMPTY.length);
const BRAND_LINE =
  'My brokerage is [brokerage name]. Every design must show it clearly, as real estate advertising rules require.';

describe('filling the prompts', () => {
  it('starts with every prompt exactly as written, each placeholder marked', async () => {
    // The oracles above describe the templates the script starts from.
    expect(VOICE).toContain(`\n${VOICE_MARKET}\n${VOICE_CLIENTS}\n`);
    for (const span of VOICE_LITERAL) expect(VOICE).toContain(span);
    expect(CAROUSEL.endsWith(ABOUT_EMPTY)).toBe(true);
    expect(BRAND).toContain(BRAND_LINE);
    await boot();
    expect(voicePre().textContent).toBe(VOICE);
    expect(carouselPre().textContent).toBe(CAROUSEL);
    expect(brandPre().textContent).toBe(BRAND);
    // No blanks drawn in the voice prompt: its blanks are lines, and its [VERIFY]s are its own words.
    expect(marks(voicePre())).toEqual([]);
    expect(marks(carouselPre())).toEqual([
      '[your niche]',
      '[neighborhoods]',
      '[top client questions]',
      '[brokerage name]',
      '[paste the profile that starts with "Write as me."]',
    ]);
    expect(marks(brandPre())).toEqual(['[brokerage name]']);
    for (const el of $$('pre[data-prompt-text] mark')) expect(el.className).toBe('placeholder');
  });

  it('shows the fields once the script runs', async () => {
    await boot();
    expect($$('.fields').map((el) => el.hidden)).toEqual([false, false]);
  });

  it('fills the voice prompt live from market and clients, after their ABOUT ME lines, as plain text', async () => {
    await boot();
    type('market', 'Farmington, CT');
    expect(voicePre().textContent).toContain(`\n${VOICE_MARKET} Farmington, CT\n${VOICE_CLIENTS}\n`);
    // Only that line changed: the rest of the prompt is exactly as written.
    expect(voicePre().textContent).toBe(VOICE.replace(`\n${VOICE_MARKET}\n`, `\n${VOICE_MARKET} Farmington, CT\n`));
    expect(marks(voicePre())).toEqual([]);

    type('clients', 'buyers');
    expect(voicePre().textContent).toContain(`\n${VOICE_MARKET} Farmington, CT\n${VOICE_CLIENTS} buyers\n`);
    expect(marks(voicePre())).toEqual([]);
  });

  it('trims what is typed, and leaves the line as written when a field is blank or cleared', async () => {
    await boot();
    type('market', '   Hartford  ');
    expect(voicePre().textContent).toContain(`\n${VOICE_MARKET} Hartford\n`);
    type('market', '   ');
    expect(voicePre().textContent).toBe(VOICE);
    type('market', 'Hartford');
    type('market', '');
    expect(voicePre().textContent).toBe(VOICE);
    expect(marks(voicePre())).toEqual([]);
  });

  it("never marks or fills the prompt's own [VERIFY] brackets", async () => {
    await boot();
    for (const name of FIELDS) type(name, 'x');
    const text = voicePre().textContent ?? '';
    for (const span of VOICE_LITERAL) expect(text).toContain(span);
    expect(marks(voicePre())).toEqual([]);
    expect(text).toContain("Write [VERIFY: what's needed] and list each one under the draft.");
  });

  it('fills the Carousel Creator instructions from About you', async () => {
    await boot();
    type('niche', 'First time buyers');
    type('hoods', 'Farmington, Unionville');
    type('questions', 'Should I wait for rates to drop?\nWhat will my payment be?');
    type('brokerage', 'eXp Realty');
    type('profile', '\nWrite as me.\nShort sentences.\n');
    expect(carouselPre().textContent).toBe(
      CAROUSEL_HEAD +
        'About me:\n' +
        '- Niche: First time buyers\n' +
        '- Neighborhoods: Farmington, Unionville\n' +
        '- Questions clients ask me most:\n' +
        '  - Should I wait for rates to drop?\n' +
        '  - What will my payment be?\n' +
        'My brokerage: eXp Realty\n' +
        '\n' +
        'My voice profile:\n' +
        'Write as me.\nShort sentences.',
    );
    expect(marks(carouselPre())).toEqual([]);
  });

  it('writes questions one per line as a list, with no trailing space before the first', async () => {
    await boot();
    type('questions', '  Should I wait for rates to drop?  \n\n   What will my payment be?\r\n\n');
    const text = carouselPre().textContent ?? '';
    expect(text).toContain(
      'Questions clients ask me most:\n  - Should I wait for rates to drop?\n  - What will my payment be?\nMy brokerage: [brokerage name]',
    );
    expect(text).not.toContain('most: \n');
    expect(text).not.toMatch(/ \n/);
  });

  it('writes a single question as a one-item list', async () => {
    await boot();
    type('questions', 'Should I wait for rates to drop?');
    expect(carouselPre().textContent).toContain(
      '- Questions clients ask me most:\n  - Should I wait for rates to drop?\nMy brokerage:',
    );
  });

  it('keeps the questions placeholder, and the space before it, while the questions are blank', async () => {
    await boot();
    type('questions', ' \n \n');
    expect(carouselPre().textContent).toContain('- Questions clients ask me most: [top client questions]\n');
    expect(marks(carouselPre())).toContain('[top client questions]');
  });

  it('fills the brand prompt from the brokerage too', async () => {
    await boot();
    type('brokerage', '  eXp Realty ');
    expect(brandPre().textContent).toContain(
      'My brokerage is eXp Realty. Every design must show it clearly, as real estate advertising rules require.',
    );
    expect(marks(brandPre())).toEqual([]);
    expect(carouselPre().textContent).toContain('\nMy brokerage: eXp Realty\n');
  });

  it('fills only the two ABOUT ME lines it names, and only when the whole line matches', async () => {
    await boot();
    for (const name of FIELDS) type(name, 'x');
    const lines = (voicePre().textContent ?? '').split('\n');
    expect(lines.slice(-7)).toEqual([
      'My name, as I sign it:',
      'What I do:',
      `${VOICE_MARKET} x`,
      `${VOICE_CLIENTS} x`,
      'Where I post or write most:',
      'Who else writes under my name (an assistant, my team, my brokerage or company, a marketing company, AI), or nobody:',
      "Phrases I can't stand:",
    ]);
  });

  it('never treats a bracket the visitor types as a placeholder, even one that matches', async () => {
    await boot();
    type('niche', '[luxury]');
    type('brokerage', '[brokerage name]');
    expect(carouselPre().textContent).toContain('- Niche: [luxury]\n');
    expect(carouselPre().textContent).toContain('\nMy brokerage: [brokerage name]\n');
    expect(marks(carouselPre())).toEqual([
      '[neighborhoods]',
      '[top client questions]',
      '[paste the profile that starts with "Write as me."]',
    ]);
    expect(brandPre().textContent).toContain('My brokerage is [brokerage name]. Every design');
    expect(marks(brandPre())).toEqual([]);
  });

  it('puts typed markup in as text', async () => {
    await boot();
    type('niche', '<img src=x onerror="alert(1)"><b>Luxury</b>');
    expect(carouselPre().querySelector('img, b')).toBeNull();
    expect(carouselPre().textContent).toContain('- Niche: <img src=x onerror="alert(1)"><b>Luxury</b>\n');
  });

  it('saves every field as typed under ai101-v2, and restores the fields and prompts on reload', async () => {
    await boot();
    type('market', '  Hartford, CT ');
    type('questions', 'Should I wait?\nWhat will it cost?');
    type('brokerage', 'eXp Realty');
    expect(saved()).toEqual({
      i: 0,
      app: 'claude',
      path: 'samples',
      market: '  Hartford, CT ',
      clients: '',
      niche: '',
      hoods: '',
      questions: 'Should I wait?\nWhat will it cost?',
      brokerage: 'eXp Realty',
      profile: '',
    });

    await boot();
    expect(field('market').value).toBe('  Hartford, CT ');
    expect(field('questions').value).toBe('Should I wait?\nWhat will it cost?');
    expect(field('brokerage').value).toBe('eXp Realty');
    expect(voicePre().textContent).toContain(`\n${VOICE_MARKET} Hartford, CT\n${VOICE_CLIENTS}\n`);
    expect(carouselPre().textContent).toContain(
      'most:\n  - Should I wait?\n  - What will it cost?\nMy brokerage: eXp Realty\n',
    );
    expect(brandPre().textContent).toContain('My brokerage is eXp Realty.');
  });
});

describe('fillPrompt', () => {
  it('appends a field to a whole line named in lineSlots, trimmed, and leaves the line alone when empty', () => {
    const lineSlots = { 'Market:': 'market', 'Clients:': 'clients' } as const;
    const template = 'Top\nMarket:\nClients:\nNot Market: here\nMarket: already';
    expect(fillPrompt(template, {}, { market: ' Hartford ', clients: '' }, lineSlots)).toEqual([
      { text: 'Top\nMarket: Hartford\nClients:\nNot Market: here\nMarket: already', mark: false },
    ]);
    expect(fillPrompt(template, {}, {}, lineSlots)).toEqual([{ text: template, mark: false }]);
  });

  it('fills the placeholders named in slots, trimmed, and keeps the rest', () => {
    expect(
      fillPrompt(
        'in [a] and [b] and [c].',
        { '[a]': 'market', '[b]': 'clients' },
        { market: ' Hartford ', clients: '' },
      ),
    ).toEqual([
      { text: 'in ', mark: false },
      { text: 'Hartford', mark: false },
      { text: ' and ', mark: false },
      { text: '[b]', mark: true },
      { text: ' and ', mark: false },
      { text: '[c]', mark: true },
      { text: '.', mark: false },
    ]);
  });

  it('keeps a placeholder whose field is missing from the values', () => {
    expect(fillPrompt('[a]', { '[a]': 'niche' }, {})).toEqual([{ text: '[a]', mark: true }]);
  });

  it('writes questions as a list under the label, without the trailing space', () => {
    expect(fillPrompt('most: [q]\nnext', { '[q]': 'questions' }, { questions: ' a \r\n\n b\n' })).toEqual([
      { text: 'most:', mark: false },
      { text: '\n  - a\n  - b', mark: false },
      { text: '\nnext', mark: false },
    ]);
  });

  it('leaves the label alone while there are no questions', () => {
    expect(fillPrompt('most: [q]', { '[q]': 'questions' }, { questions: '\n  \n' })).toEqual([
      { text: 'most: ', mark: false },
      { text: '[q]', mark: true },
    ]);
  });

  it('keeps a typed bracket as text', () => {
    expect(fillPrompt('[a]', { '[a]': 'niche' }, { niche: '[b]' })).toEqual([{ text: '[b]', mark: false }]);
  });

  it('does not call brackets across a line break a placeholder', () => {
    expect(fillPrompt('x [a\nb] y', {}, {})).toEqual([{ text: 'x [a\nb] y', mark: false }]);
  });

  it('returns nothing for an empty template, and one run for a template with no placeholders', () => {
    expect(fillPrompt('', {}, {})).toEqual([]);
    expect(fillPrompt('plain', {}, {})).toEqual([{ text: 'plain', mark: false }]);
  });

  it('gives back the template, piece for piece, when every field is empty', () => {
    const slots = {
      '[your niche]': 'niche',
      '[neighborhoods]': 'hoods',
      '[top client questions]': 'questions',
      '[brokerage name]': 'brokerage',
      '[paste the profile that starts with "Write as me."]': 'profile',
    } as const;
    expect(
      fillPrompt(CAROUSEL, slots, {})
        .map((p) => p.text)
        .join(''),
    ).toBe(CAROUSEL);
  });
});

// ================================================================================================
// Copy & Open, and the starter ideas (D-032, D-034)
// ================================================================================================

/** The clipboard as the tests see it: `writeText` and the legacy `execCommand` path, both recorded. */
function stubClipboard(writeText: (text: string) => Promise<void> = () => Promise.resolve(), legacyWorks = true) {
  stubValue(window, 'isSecureContext', true);
  const written = vi.fn(writeText);
  stubValue(navigator, 'clipboard', { writeText: written });
  const legacy: string[] = [];
  const buffers: HTMLTextAreaElement[] = [];
  const execCommand = vi.fn((command: string) => {
    const ta = document.querySelector<HTMLTextAreaElement>('textarea.copy-buffer');
    if (command === 'copy' && ta) {
      legacy.push(ta.value);
      buffers.push(ta);
    }
    return legacyWorks;
  });
  stubValue(document, 'execCommand', execCommand);
  return { written, legacy, buffers, execCommand };
}

/** A device where nothing can write the clipboard. */
function noClipboard() {
  stubValue(window, 'isSecureContext', true);
  stubValue(navigator, 'clipboard', undefined);
  const execCommand = vi.fn(() => false);
  stubValue(document, 'execCommand', execCommand);
  return { execCommand };
}

function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const selected = () => window.getSelection()?.toString() ?? '';
const twoTaps = () => $('main').setAttribute('data-copy-open-taps', '2');

const CHATGPT = 'a[data-copy-open="voice-profile-prompt"][data-app="ChatGPT"]';
const CLAUDE = 'a[data-copy-open="voice-profile-prompt"][data-app="Claude"]';
const BRAND_LINK = 'a[data-copy-open="carousel-creator-brand-prompt"]';
const PROJECT_LINK = 'a[data-copy-open="carousel-creator-prompt"]';
const label = (selector: string) => $(`${selector} [data-copy-label]`).textContent;

describe('Copy & Open', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  it.each([
    [
      CHATGPT,
      'voice-profile-prompt',
      'Copy & Open ChatGPT',
      'Copied. Paste it into the new ChatGPT chat.',
      `${VOICE_MARKET} Hartford, CT\n${VOICE_CLIENTS} buyers\n`,
    ],
    [
      CLAUDE,
      'voice-profile-prompt',
      'Copy & Open Claude',
      'Copied. Paste it into the new Claude chat.',
      `${VOICE_MARKET} Hartford, CT\n${VOICE_CLIENTS} buyers\n`,
    ],
    [
      BRAND_LINK,
      'carousel-creator-brand-prompt',
      'Copy & Open Claude',
      'Copied. Paste it into the new Claude chat.',
      'My brokerage is eXp Realty.',
    ],
    [
      PROJECT_LINK,
      'carousel-creator-prompt',
      'Copy Instructions & Open Claude',
      'Copied. Make the Project, then paste into Instructions.',
      '- Niche: Luxury\n',
    ],
  ])(
    '%s copies its prompt as filled in right now, both ways, in one tap, and lets the link open',
    async (selector, block, name, toast, filled) => {
      const { written, legacy } = stubClipboard();
      await boot();
      type('market', 'Hartford, CT');
      type('clients', 'buyers');
      type('brokerage', 'eXp Realty');
      type('niche', 'Luxury');
      const link = $(selector);
      expect(label(selector)).toBe(name);
      expect(click(link).followed).toBe(true);
      const text = pre(block).textContent ?? '';
      expect(text).toContain(filled);
      // Both writes started inside the click: the synchronous one has already finished.
      expect(legacy).toEqual([text]);
      expect(written).toHaveBeenCalledTimes(1);
      expect(written).toHaveBeenCalledWith(text);
      expect(document.querySelector('textarea.copy-buffer')).toBeNull();
      await vi.advanceTimersByTimeAsync(100);
      expect(live()).toBe(toast);
      // One tap never relabels the link.
      expect(label(selector)).toBe(name);
      expect(link.hasAttribute('data-armed')).toBe(false);
    },
  );

  it("copies Spring's interview prompt, word for word, from the interview's Copy & Open (D-043)", async () => {
    const { written, legacy } = stubClipboard();
    await boot();
    $('button[data-path="interview"]').click();
    for (const app of ['ChatGPT', 'Claude']) {
      const link = $$('a[data-copy-open="voice-interview-prompt"]').find(
        (a) => a.textContent === `Copy & Open ${app}`,
      )!;
      expect(click(link).followed).toBe(true);
    }
    expect(legacy).toEqual([PAGE.interviewPrompt.text, PAGE.interviewPrompt.text]);
    expect(written).toHaveBeenCalledWith(PAGE.interviewPrompt.text);
  });

  it('copies the template exactly, placeholders and all, when nothing is filled in', async () => {
    const { written, legacy } = stubClipboard();
    await boot();
    click($(CHATGPT));
    expect(legacy).toEqual([VOICE]);
    expect(written).toHaveBeenCalledWith(VOICE);
  });

  it('copies through a readonly, aria-hidden buffer that is gone again in the same tap', async () => {
    const { buffers } = stubClipboard();
    await boot();
    click($(CLAUDE));
    expect(buffers).toHaveLength(1);
    expect(buffers[0]!.readOnly).toBe(true);
    expect(buffers[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(buffers[0]!.isConnected).toBe(false);
  });

  it('shows the toast after a 100 ms beat and clears it after 3200 ms', async () => {
    stubClipboard();
    await boot();
    click($(CHATGPT));
    expect(live()).toBe('');
    await vi.advanceTimersByTimeAsync(99);
    expect(live()).toBe('');
    await vi.advanceTimersByTimeAsync(1);
    expect(live()).toBe('Copied. Paste it into the new ChatGPT chat.');
    await vi.advanceTimersByTimeAsync(3199);
    expect(live()).toBe('Copied. Paste it into the new ChatGPT chat.');
    await vi.advanceTimersByTimeAsync(1);
    expect(live()).toBe('');
  });

  it('empties the toast before a second copy, so the same words are announced again', async () => {
    stubClipboard();
    await boot();
    click($(CLAUDE));
    await vi.advanceTimersByTimeAsync(1000);
    expect(live()).toBe('Copied. Paste it into the new Claude chat.');
    click($(CLAUDE));
    expect(live()).toBe('');
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe('Copied. Paste it into the new Claude chat.');
    // The first toast's timer no longer runs: 3200 ms from the SECOND.
    await vi.advanceTimersByTimeAsync(3199);
    expect(live()).toBe('Copied. Paste it into the new Claude chat.');
    await vi.advanceTimersByTimeAsync(1);
    expect(live()).toBe('');
  });

  it('when only writeText can copy, the link opens at once and says Copied once the write lands', async () => {
    const write = deferred();
    const { written } = stubClipboard(() => write.promise, false);
    await boot();
    expect(click($(CHATGPT)).followed).toBe(true);
    expect(written).toHaveBeenCalledWith(VOICE);
    await vi.advanceTimersByTimeAsync(500);
    expect(live()).toBe('');
    write.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(live()).toBe('');
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe('Copied. Paste it into the new ChatGPT chat.');
  });

  it('when only writeText can copy and it rejects, the link opens and never says Copied', async () => {
    const write = deferred();
    stubClipboard(() => write.promise, false);
    await boot();
    expect(click($(CLAUDE)).followed).toBe(true);
    write.reject(new DOMException('denied', 'NotAllowedError'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(live()).toBe('');
    expect(label(CLAUDE)).toBe('Copy & Open Claude');
  });

  it('does not use writeText outside a secure context', async () => {
    const { written, legacy } = stubClipboard();
    stubValue(window, 'isSecureContext', false);
    await boot();
    expect(click($(CHATGPT)).followed).toBe(true);
    expect(written).not.toHaveBeenCalled();
    expect(legacy).toEqual([VOICE]);
    await vi.advanceTimersByTimeAsync(100);
    expect(live()).toBe('Copied. Paste it into the new ChatGPT chat.');
  });

  it.each<[string, () => void]>([
    ['there is no clipboard at all', () => noClipboard()],
    [
      'writeText throws instead of rejecting',
      () =>
        stubClipboard(() => {
          throw new TypeError('not supported');
        }, false),
    ],
  ])(
    'when %s: the first tap stays, opens and selects the prompt and says so; the next tap opens',
    async (_how, setup) => {
      setup();
      await boot();
      type('market', 'Hartford, CT');
      const link = $(CHATGPT);
      const details = voicePre().closest('details')!;
      expect(details.open).toBe(false);

      expect(click(link).followed).toBe(false);
      expect(details.open).toBe(true);
      const selection = window.getSelection()!;
      expect(selection.rangeCount).toBe(1);
      expect(selection.getRangeAt(0).commonAncestorContainer).toBe(voicePre());
      expect(selected()).toBe(voicePre().textContent);
      expect(selected()).toContain(`${VOICE_MARKET} Hartford, CT\n`);
      await vi.advanceTimersByTimeAsync(100);
      expect(live()).toBe("Couldn't copy automatically. The prompt is selected below: copy it, then tap again.");
      // Never "Copied" when nothing was.
      expect(label(CHATGPT)).toBe('Copy & Open ChatGPT');
      expect(link.hasAttribute('data-armed')).toBe(true);

      // The visitor is never left without the app.
      expect(click(link).followed).toBe(true);
      expect(link.hasAttribute('data-armed')).toBe(false);
      // And the tap after that tries to copy again.
      expect(click(link).followed).toBe(false);
    },
  );

  it('a failed copy stays ready to open for 10 s, then tries to copy again', async () => {
    noClipboard();
    await boot();
    const link = $(CLAUDE);
    click(link);
    await vi.advanceTimersByTimeAsync(9999);
    expect(link.hasAttribute('data-armed')).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(link.hasAttribute('data-armed')).toBe(false);
    expect(click(link).followed).toBe(false);
  });

  it('hands focus back to where it was', async () => {
    stubClipboard();
    await boot();
    const link = $<HTMLAnchorElement>(CHATGPT);
    link.focus();
    click(link);
    expect(document.activeElement).toBe(link);

    // Typing in a field, then tapping: focus goes back to the field.
    field('market').focus();
    click($(CLAUDE));
    expect(document.activeElement).toBe(field('market'));

    (document.activeElement as HTMLElement).blur();
    click($(BRAND_LINK));
    expect(document.activeElement).toBe(document.body);
  });

  it('hands focus back after a failed copy too', async () => {
    noClipboard();
    await boot();
    const link = $<HTMLAnchorElement>(PROJECT_LINK);
    link.focus();
    click(link);
    expect(document.activeElement).toBe(link);
  });

  describe('two-tap mode (main[data-copy-open-taps="2"])', () => {
    it('the first tap copies and stays, reading "Copied. Open ChatGPT"; the second opens', async () => {
      const { written, execCommand } = stubClipboard();
      await boot('/ai101', twoTaps);
      const link = $(CHATGPT);
      expect(click(link).followed).toBe(false);
      expect(written).toHaveBeenCalledWith(VOICE);
      await vi.advanceTimersByTimeAsync(0);
      expect(label(CHATGPT)).toBe('Copied. Open ChatGPT');
      expect(link.hasAttribute('data-armed')).toBe(true);
      // writeText worked, so the legacy path was never needed.
      expect(execCommand).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(100);
      expect(live()).toBe('Copied. Paste it into the new ChatGPT chat.');

      expect(click(link).followed).toBe(true);
      expect(label(CHATGPT)).toBe('Copy & Open ChatGPT');
      expect(link.hasAttribute('data-armed')).toBe(false);
      expect(written).toHaveBeenCalledTimes(1);
    });

    it('names the right app on each link', async () => {
      stubClipboard();
      await boot('/ai101', twoTaps);
      click($(PROJECT_LINK));
      await vi.advanceTimersByTimeAsync(0);
      expect(label(PROJECT_LINK)).toBe('Copied. Open Claude');
    });

    it('disarms after 10 s, so a late tap copies again rather than opening', async () => {
      const { written } = stubClipboard();
      await boot('/ai101', twoTaps);
      const link = $(CLAUDE);
      click(link);
      await vi.advanceTimersByTimeAsync(9999);
      expect(label(CLAUDE)).toBe('Copied. Open Claude');
      await vi.advanceTimersByTimeAsync(1);
      expect(label(CLAUDE)).toBe('Copy & Open Claude');
      expect(link.hasAttribute('data-armed')).toBe(false);
      expect(click(link).followed).toBe(false);
      expect(written).toHaveBeenCalledTimes(2);
    });

    it('a failed copy selects the prompt and says so, and the second tap still opens', async () => {
      stubClipboard(() => Promise.reject(new DOMException('denied', 'NotAllowedError')), false);
      await boot('/ai101', twoTaps);
      const link = $(CHATGPT);
      expect(click(link).followed).toBe(false);
      await vi.advanceTimersByTimeAsync(100);
      expect(selected()).toBe(VOICE);
      expect(voicePre().closest('details')!.open).toBe(true);
      expect(live()).toBe("Couldn't copy automatically. The prompt is selected below: copy it, then tap again.");
      expect(label(CHATGPT)).toBe('Copy & Open ChatGPT');
      expect(click(link).followed).toBe(true);
    });

    it('never relabels a link that has already been opened', async () => {
      const write = deferred();
      stubClipboard(() => write.promise);
      await boot('/ai101', twoTaps);
      const link = $(CLAUDE);
      click(link);
      expect(click(link).followed).toBe(true);
      write.resolve();
      await vi.advanceTimersByTimeAsync(200);
      expect(label(CLAUDE)).toBe('Copy & Open Claude');
    });
  });
});

const STARTERS = [
  'A buyer asked if they should wait for rates to drop.',
  "Here's a market stat I want to explain:",
  'A lesson from my week:',
  'My take on this industry news:',
];

describe('starter ideas', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  const chips = () => $$<HTMLButtonElement>('button[data-copy-chip]');

  it('each chip copies exactly its own words, and says so', async () => {
    const { written } = stubClipboard();
    await boot();
    expect(chips()).toHaveLength(4);
    for (const [k, chip] of chips().entries()) {
      chip.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(written).toHaveBeenLastCalledWith(STARTERS[k]);
      await vi.advanceTimersByTimeAsync(100);
      expect(live()).toBe('Copied. Paste it into the Project chat and finish the thought.');
    }
    // Never the "Copy" tag beside the words.
    expect(written).toHaveBeenCalledTimes(4);
  });

  it('falls back to the legacy copy when writeText rejects', async () => {
    const { legacy } = stubClipboard(() => Promise.reject(new DOMException('denied', 'NotAllowedError')));
    await boot();
    chips()[2]!.click();
    await vi.advanceTimersByTimeAsync(100);
    expect(legacy).toEqual(['A lesson from my week:']);
    expect(live()).toBe('Copied. Paste it into the Project chat and finish the thought.');
  });

  it.each<[string, () => void]>([
    ['there is no clipboard at all', () => noClipboard()],
    ['writeText rejects and execCommand fails', () => stubClipboard(() => Promise.reject(new Error('denied')), false)],
  ])('when %s, selects the words and says how to copy them', async (_how, setup) => {
    setup();
    await boot();
    chips()[0]!.click();
    await vi.advanceTimersByTimeAsync(100);
    expect(selected()).toBe('A buyer asked if they should wait for rates to drop.');
    expect(live()).toBe("Couldn't copy automatically. The words are selected: copy them from your device's menu.");
  });
});

// ================================================================================================
// Save it, Get the app, Send This to My Laptop (D-032)
// ================================================================================================

describe('Save it: Claude or ChatGPT', () => {
  const pressed = () =>
    $$('button[data-pick]').map((b) => [b.getAttribute('data-pick'), b.getAttribute('aria-pressed')]);
  const shown = () =>
    $$('[data-pick-panel]')
      .filter((p) => !p.hidden)
      .map((p) => p.getAttribute('data-pick-panel'));

  it('shows the switch, set to Claude, with only the Claude panel', async () => {
    await boot();
    expect($('.picker').hidden).toBe(false);
    expect(pressed()).toEqual([
      ['claude', 'true'],
      ['chatgpt', 'false'],
    ]);
    expect(shown()).toEqual(['claude']);
  });

  it('switches panels and aria-pressed, and remembers the choice', async () => {
    await boot();
    $('button[data-pick="chatgpt"]').click();
    expect(pressed()).toEqual([
      ['claude', 'false'],
      ['chatgpt', 'true'],
    ]);
    expect(shown()).toEqual(['chatgpt']);
    expect(saved()).toMatchObject({ app: 'chatgpt' });

    await boot();
    expect(shown()).toEqual(['chatgpt']);
    expect(pressed()).toEqual([
      ['claude', 'false'],
      ['chatgpt', 'true'],
    ]);

    $('button[data-pick="claude"]').click();
    expect(shown()).toEqual(['claude']);
    expect(saved()).toMatchObject({ app: 'claude' });
  });
});

describe('Samples or interview (D-043)', () => {
  const shownPaths = () =>
    $$('[data-path-panel]')
      .filter((p) => !p.hidden)
      .map((p) => `${p.closest('section')?.id}:${p.getAttribute('data-path-panel')}`);
  const pressedPath = () =>
    $$('button[data-path]').map((b) => [b.getAttribute('data-path'), b.getAttribute('aria-pressed')]);

  it('starts on samples: step 1 shows what to gather, step 2 the samples prompt and its blanks', async () => {
    await boot();
    expect(pressedPath()).toEqual([
      ['samples', 'true'],
      ['interview', 'false'],
    ]);
    expect(shownPaths()).toEqual(['voice-profile:samples', 'voice-profile-copy:samples']);
  });

  it('switches both steps to the interview, remembers it, and switches back', async () => {
    await boot();
    $('button[data-path="interview"]').click();
    expect(pressedPath()).toEqual([
      ['samples', 'false'],
      ['interview', 'true'],
    ]);
    expect(shownPaths()).toEqual(['voice-profile:interview', 'voice-profile-copy:interview']);
    expect(saved()).toMatchObject({ path: 'interview' });
    // Step 2 then offers the interview prompt, and the samples prompt's blanks are out of sight.
    expect($('#voice-interview-prompt').closest('[data-path-panel]')?.hasAttribute('hidden')).toBe(false);
    expect($('#voice-profile-prompt').closest('[data-path-panel]')?.hasAttribute('hidden')).toBe(true);

    await boot();
    expect(shownPaths()).toEqual(['voice-profile:interview', 'voice-profile-copy:interview']);

    $('button[data-path="samples"]').click();
    expect(shownPaths()).toEqual(['voice-profile:samples', 'voice-profile-copy:samples']);
    expect(saved()).toMatchObject({ path: 'samples' });
  });

  it("reads a path it does not know as samples, and leaves Save's switch alone", async () => {
    save({ i: 0, app: 'chatgpt', path: 'podcast' });
    await boot();
    expect(shownPaths()).toEqual(['voice-profile:samples', 'voice-profile-copy:samples']);
    expect($('[data-pick-panel="chatgpt"]').hidden).toBe(false);
  });
});

describe('Get the app', () => {
  const hrefs = () => $$<HTMLAnchorElement>('a[data-get-app]').map((a) => a.getAttribute('href'));
  const as = (userAgent: string, maxTouchPoints = 0) => {
    stubValue(navigator, 'userAgent', userAgent);
    stubValue(navigator, 'maxTouchPoints', maxTouchPoints);
  };
  const APP_STORE = [
    'https://apps.apple.com/app/chatgpt/id6448311069',
    'https://apps.apple.com/us/app/claude-by-anthropic/id6473753684',
  ];

  it('sends Android to Google Play', async () => {
    as('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36', 5);
    await boot();
    expect(hrefs()).toEqual([
      'https://play.google.com/store/apps/details?id=com.openai.chatgpt',
      'https://play.google.com/store/apps/details?id=com.anthropic.claude',
    ]);
  });

  it('sends an iPhone to the App Store', async () => {
    as('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', 5);
    await boot();
    expect(hrefs()).toEqual(APP_STORE);
  });

  it('treats a "Macintosh" with touch as the iPad it is', async () => {
    as('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 5);
    await boot();
    expect(hrefs()).toEqual(APP_STORE);
  });

  it.each([
    [
      'a Mac with no touch',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      0,
    ],
    ['Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36', 10],
  ])('leaves the web apps on a desktop: %s', async (_what, ua, touch) => {
    as(ua, touch);
    await boot();
    expect(hrefs()).toEqual(['https://chatgpt.com/', 'https://claude.ai/']);
  });
});

describe('Send This to My Laptop', () => {
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
      get pathname() {
        return real.pathname;
      },
      get search() {
        return real.search;
      },
    };
    stub(window, 'location', { get: () => fake });
    return assigned;
  }
  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  const shareLink = () => $<HTMLAnchorElement>('a[data-share]');

  it('opens the share sheet with the Part II link, in place of the email', async () => {
    const share = vi.fn(() => Promise.resolve());
    stubValue(navigator, 'share', share);
    await boot();
    const assigned = watchNavigation();
    expect(click(shareLink()).followed).toBe(false);
    expect(share).toHaveBeenCalledWith({
      title: 'AI 101 for Agents: Part II (do this on your laptop)',
      url: 'https://www.amplifiedimpact.io/ai101#carousel-creator',
    });
    await flush();
    expect(assigned).toEqual([]);
  });

  it('ignores the AbortError of a share sheet that was closed', async () => {
    stubValue(
      navigator,
      'share',
      vi.fn(() => Promise.reject(new DOMException('closed', 'AbortError'))),
    );
    await boot();
    const assigned = watchNavigation();
    click(shareLink());
    await flush();
    expect(assigned).toEqual([]);
  });

  it.each<[string, () => Promise<void>]>([
    ['rejects for another reason', () => Promise.reject(new DOMException('no', 'NotAllowedError'))],
    ['rejects with nothing', () => Promise.reject(undefined)],
    [
      'throws',
      () => {
        throw new TypeError('share is not allowed here');
      },
    ],
  ])('falls back to the email link when the share sheet %s', async (_how, impl) => {
    stubValue(navigator, 'share', vi.fn(impl));
    await boot();
    const assigned = watchNavigation();
    expect(click(shareLink()).followed).toBe(false);
    await flush();
    expect(assigned).toEqual([shareLink().href]);
    expect(assigned[0]).toMatch(/^mailto:\?subject=/);
  });

  it('leaves the email link alone where there is no share sheet', async () => {
    stubValue(navigator, 'share', undefined);
    await boot();
    const assigned = watchNavigation();
    expect(click(shareLink()).followed).toBe(true);
    await flush();
    expect(assigned).toEqual([]);
  });
});

// ================================================================================================
// The waitlist (D-033, D-034)
// ================================================================================================

const ERRORS = {
  firstName: 'Enter your first name.',
  email: 'Enter a valid email address.',
  phone: 'Enter a valid mobile number.',
  phoneForTexts: 'Add your mobile number to get texts.',
  generic: 'Something went wrong. Try again.',
};

describe('the waitlist', () => {
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
  const submitButton = () => $<HTMLButtonElement>('#waitlist-form button[type="submit"]');
  const submit = () => submitButton().click();
  const sent = (fetch: ReturnType<typeof api>, call = 0) =>
    JSON.parse(String(fetch.mock.calls[call]![1].body)) as Record<string, unknown>;
  const formError = () => $('#waitlist-error');
  const edit = (name: string, value: string) => {
    input(name).value = value;
    input(name).dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('takes validation over from the browser once it is running', async () => {
    api();
    await boot();
    expect(form().noValidate).toBe(true);
  });

  it('starts with the SMS box unticked, whatever was saved', async () => {
    save({ i: 11, app: 'chatgpt', brokerage: 'eXp Realty' });
    await boot();
    expect(input('smsConsent').type).toBe('checkbox');
    expect(input('smsConsent').checked).toBe(false);
  });

  it('shows the inline errors, marks the fields and focuses the first, without posting', async () => {
    const fetch = api();
    await boot();
    submit();
    expect(fetch).not.toHaveBeenCalled();
    expect(errorOf('firstName')).toBe(ERRORS.firstName);
    expect(errorOf('email')).toBe(ERRORS.email);
    expect(errorOf('phone')).toBe('');
    expect(errorOf('brokerage')).toBe('');
    for (const name of ['firstName', 'email']) {
      expect(input(name).getAttribute('aria-invalid')).toBe('true');
      expect(input(name).getAttribute('aria-describedby')).toBe(`${name}-error`);
    }
    expect(input('phone').hasAttribute('aria-invalid')).toBe(false);
    expect(document.activeElement).toBe(input('firstName'));

    // A name, and an address the sign-in rule rejects (no dot-TLD of two letters).
    fill({ firstName: '  Ada ', email: 'ada@example.c' });
    submit();
    expect(fetch).not.toHaveBeenCalled();
    expect(errorOf('firstName')).toBe('');
    expect(input('firstName').hasAttribute('aria-invalid')).toBe(false);
    expect(input('firstName').hasAttribute('aria-describedby')).toBe(false);
    expect(errorOf('email')).toBe(ERRORS.email);
    expect(document.activeElement).toBe(input('email'));
  });

  it('treats a whitespace-only name as empty', async () => {
    const fetch = api();
    await boot();
    fill({ firstName: '   ', email: 'ada@example.com' });
    submit();
    expect(fetch).not.toHaveBeenCalled();
    expect(errorOf('firstName')).toBe(ERRORS.firstName);
  });

  it('takes no phone number at all', async () => {
    const fetch = api();
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com', phone: '   ' });
    submit();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(errorOf('phone')).toBe('');
    expect(sent(fetch)).not.toHaveProperty('phone');
  });

  it('rejects a number that is not a mobile number, on the phone field', async () => {
    const fetch = api();
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com', phone: '555-1234' });
    submit();
    expect(fetch).not.toHaveBeenCalled();
    expect(errorOf('phone')).toBe(ERRORS.phone);
    expect(input('phone').getAttribute('aria-invalid')).toBe('true');
    expect(input('phone').getAttribute('aria-describedby')).toBe('phone-error');
    expect(document.activeElement).toBe(input('phone'));
  });

  it('asks for a number when the SMS box is ticked without one, and focuses the phone field', async () => {
    const fetch = api();
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com' });
    input('smsConsent').click();
    expect(input('smsConsent').checked).toBe(true);
    submit();
    expect(fetch).not.toHaveBeenCalled();
    expect(errorOf('phone')).toBe(ERRORS.phoneForTexts);
    expect(input('phone').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input('phone'));
  });

  it('says the number is invalid, rather than missing, when the box is ticked with a bad one', async () => {
    api();
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com', phone: '+12' });
    input('smsConsent').click();
    submit();
    expect(errorOf('phone')).toBe(ERRORS.phone);
  });

  it('clears an error as soon as its field is edited, and the phone error when the box changes', async () => {
    api();
    await boot();
    submit();
    edit('email', 'a');
    expect(errorOf('email')).toBe('');
    expect(input('email').hasAttribute('aria-invalid')).toBe(false);
    expect(input('email').hasAttribute('aria-describedby')).toBe(false);
    expect(errorOf('firstName')).toBe(ERRORS.firstName);

    fill({ firstName: 'Ada', email: 'ada@example.com' });
    input('smsConsent').click();
    submit();
    expect(errorOf('phone')).toBe(ERRORS.phoneForTexts);
    input('smsConsent').click();
    expect(errorOf('phone')).toBe('');
    expect(input('phone').hasAttribute('aria-invalid')).toBe(false);

    fill({ phone: '555' });
    submit();
    expect(errorOf('phone')).toBe(ERRORS.phone);
    edit('phone', '5551');
    expect(errorOf('phone')).toBe('');
  });

  it('posts trimmed JSON with the phone, SMS consent, honeypot and ?src to the form action', async () => {
    const fetch = api({ status: 201, body: { ok: true } });
    await boot('/ai101?src=qr#waitlist');
    fill({ firstName: ' Ada ', email: ' Ada@Example.com ', brokerage: '  eXp Realty  ', phone: ' (860) 555-1234 ' });
    input('smsConsent').click();
    submit();
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/ai101/waitlist');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect((init.headers as Record<string, string>).accept).toBe('application/json');
    expect(sent(fetch)).toEqual({
      firstName: 'Ada',
      // Lower-casing the email and normalizing the phone are the API's, not the page's.
      email: 'Ada@Example.com',
      brokerage: 'eXp Realty',
      phone: '(860) 555-1234',
      smsConsent: true,
      website: '',
      src: 'qr',
    });
  });

  it('sends smsConsent false, no phone and no src when there are none, and a filled honeypot as typed', async () => {
    const fetch = api();
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com', website: 'http://spam.example' });
    submit();
    expect(sent(fetch)).toEqual({
      firstName: 'Ada',
      email: 'ada@example.com',
      brokerage: '',
      smsConsent: false,
      website: 'http://spam.example',
    });
  });

  it('sends a phone without SMS consent when the box is not ticked', async () => {
    const fetch = api();
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com', phone: '860 555 1234' });
    submit();
    expect(sent(fetch)).toMatchObject({ phone: '860 555 1234', smsConsent: false });
  });

  it('on success, shows "You\'re on the list." and focuses it', async () => {
    api({ status: 201, body: { ok: true } });
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com' });
    submit();
    await vi.waitFor(() => expect($('#waitlist').getAttribute('data-state')).toBe('joined'));
    expect(document.activeElement).toBe($('#waitlist-joined'));
    expect($('#waitlist-joined').textContent).toBe(
      "You're on the list. We'll email you about the December agent track.",
    );
    expect(formError().hasAttribute('data-shown')).toBe(false);
  });

  it("puts a 400 that names the phone on the phone field, with the API's words", async () => {
    api({ status: 400, body: { error: 'That number cannot receive texts.', field: 'phone' } });
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com', phone: '8605551234' });
    input('smsConsent').click();
    submit();
    await vi.waitFor(() => expect(errorOf('phone')).toBe('That number cannot receive texts.'));
    expect(input('phone').getAttribute('aria-invalid')).toBe('true');
    expect(input('phone').getAttribute('aria-describedby')).toBe('phone-error');
    expect(document.activeElement).toBe(input('phone'));
    expect($('#waitlist').hasAttribute('data-state')).toBe(false);
    expect(formError().hasAttribute('data-shown')).toBe(false);
  });

  it.each([
    ['phone', ERRORS.phone],
    ['email', ERRORS.email],
    ['firstName', ERRORS.firstName],
    ['brokerage', ERRORS.generic],
  ])('falls back to its own message when a 400 names %s but gives no error', async (name, message) => {
    api({ status: 400, body: { field: name } });
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com' });
    submit();
    await vi.waitFor(() => expect(errorOf(name)).toBe(message));
  });

  it.each<[string, Reply]>([
    ['a 400 that names no field', { status: 400, body: { error: 'Bad Request' } }],
    [
      'a 400 that names a field the form does not show',
      { status: 400, body: { error: 'Bad Request', field: 'smsConsent' } },
    ],
    ['a 400 whose body is not JSON', { status: 400 }],
    ['a 500', { status: 500, body: { error: 'Internal Server Error' } }],
    ['a 429', { status: 429, body: { error: 'Too Many Requests' } }],
    ['a network failure', new TypeError('Failed to fetch')],
  ])('shows the generic form-level error for %s', async (_what, reply) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    api(reply);
    await boot();
    fill({ firstName: 'Ada', email: 'ada@example.com' });
    submit();
    await vi.advanceTimersByTimeAsync(0);
    // Shown and emptied first, then its text put back a beat later, so `role="alert"` hears a
    // change. (The text is in the markup from the start, for the no-JavaScript path.)
    expect(formError().getAttribute('role')).toBe('alert');
    expect(formError().hasAttribute('data-shown')).toBe(true);
    expect(formError().textContent).toBe('');
    await vi.advanceTimersByTimeAsync(100);
    expect(formError().textContent).toBe(ERRORS.generic);
    expect($('#waitlist').hasAttribute('data-state')).toBe(false);
    for (const name of ['firstName', 'email', 'phone', 'brokerage']) expect(errorOf(name)).toBe('');
    expect(submitButton().hasAttribute('aria-disabled')).toBe(false);
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
    submit();
    submit();
    submit();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(submitButton().getAttribute('aria-disabled')).toBe('true');
    settle({ ok: false, status: 503, json: () => Promise.resolve({}) });
    await vi.waitFor(() => expect(submitButton().hasAttribute('aria-disabled')).toBe(false));
    // Settled, so a retry goes through, and hides the old error.
    submit();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(formError().hasAttribute('data-shown')).toBe(false);
  });
});

describe('normalizePhone', () => {
  it.each([
    ['(860) 555-1234', '+18605551234'],
    ['860-555-1234', '+18605551234'],
    ['  860.555.1234  ', '+18605551234'],
    ['1 860 555 1234', '+18605551234'],
    ['+1 (860) 555-1234', '+18605551234'],
    ['+44 20 7946 0958', '+442079460958'],
    ['+12345678', '+12345678'],
    ['+123456789012345', '+123456789012345'],
  ])('reads %j as %s', (input, e164) => {
    expect(normalizePhone(input)).toBe(e164);
  });

  it.each([
    ['555-1234'],
    ['+12'],
    [''],
    ['   '],
    ['2 860 555 1234'],
    ['860 555 12345'],
    ['+1234567'],
    ['+1234567890123456'],
    ['not a number'],
  ])('rejects %j', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});
