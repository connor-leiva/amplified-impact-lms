// The kit's one script: a same-origin module file (`/assets/<page>-[hash].js`), never inlined, so the
// CSP's `script-src 'self'` admits it. It only adds to a page that already reads and works in full
// without it (every menu is a <details>, every figure is printed, every seat drawn).
//
// Self-contained on purpose: it imports nothing the homepage's script imports, so the build never
// splits a chunk the two would share (`ai101Inline()` refuses a page script that imports another).

const REDUCE = '(prefers-reduced-motion: reduce)';
const HOVER = '(hover: hover) and (pointer: fine)';
const DESKTOP = '(min-width: 1081px)';
const THEME_KEY = 'aiw-theme';

type Theme = 'dark' | 'light';

const matches = (q: string): boolean => typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
export const reducedMotion = (): boolean => matches(REDUCE);

/** Reads the theme saved on this browser, if any (storage can be blocked: then there is none). */
export function savedTheme(): Theme | null {
  try {
    const t = window.localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

function saveTheme(t: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, t);
  } catch {
    // A private window or blocked storage: the switch still works for this page.
  }
}

/**
 * The theme switch: shown (it is `hidden` in the markup, since it can't work without a script), named by
 * the theme it switches to, and kept on this browser. The new theme spreads from the button like a
 * ripple where the browser has view transitions and motion is allowed; otherwise it simply changes.
 */
export function initTheme(page: HTMLElement): void {
  const saved = savedTheme();
  if (saved) page.dataset.theme = saved;
  const btn = page.querySelector<HTMLButtonElement>('.theme-btn');
  if (!btn) return;
  const label = () => {
    const next: Theme = page.dataset.theme === 'light' ? 'dark' : 'light';
    const name = btn.dataset[next === 'light' ? 'labelLight' : 'labelDark'] ?? '';
    btn.setAttribute('aria-label', name);
    btn.title = name;
  };
  label();
  btn.hidden = false;
  btn.addEventListener('click', () => {
    const next: Theme = page.dataset.theme === 'light' ? 'dark' : 'light';
    const apply = () => {
      page.dataset.theme = next;
      label();
    };
    saveTheme(next);
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };
    if (!doc.startViewTransition || reducedMotion()) {
      apply();
      return;
    }
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
    const root = document.documentElement;
    root.classList.add('aiw-vt');
    const vt = doc.startViewTransition(apply);
    vt.finished.finally(() => root.classList.remove('aiw-vt'));
    vt.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${radius}px at ${cx}px ${cy}px)`] },
          { duration: 760, easing: 'cubic-bezier(.2,.7,.2,1)', pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => undefined);
  });
}

/** The header turns solid once the page has scrolled past its first 24px. */
export function initScrolled(header: HTMLElement): void {
  let frame = 0;
  const update = () => {
    frame = 0;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  update();
  window.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
}

/** Closes a <details> menu, letting its panel slide shut first unless motion is reduced. */
function close(menu: HTMLDetailsElement, ms: number): void {
  if (!menu.open || menu.classList.contains('is-closing')) return;
  if (!ms || reducedMotion()) {
    menu.open = false;
    return;
  }
  menu.classList.add('is-closing');
  window.setTimeout(() => {
    menu.classList.remove('is-closing');
    menu.open = false;
  }, ms);
}

/**
 * Programs: opens on hover where there's a mouse (after a moment, so passing over it does nothing),
 * shuts when the pointer leaves the header, on Escape (back to Programs), on a click outside, and when a
 * link inside is followed. A click on Programs itself still opens and shuts it, as with no script.
 */
export function initPrograms(header: HTMLElement, menu: HTMLDetailsElement): void {
  const trigger = menu.querySelector<HTMLElement>('summary');
  let timer = 0;
  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, ms);
  };
  const shut = () => close(menu, 500);
  trigger?.addEventListener('click', (e) => {
    if (!menu.open) return;
    e.preventDefault();
    shut();
  });
  trigger?.addEventListener('mouseenter', () => {
    if (matches(HOVER)) later(() => (menu.open = true), 90);
  });
  menu.querySelector('.pm')?.addEventListener('mouseenter', () => window.clearTimeout(timer));
  header.addEventListener('mouseleave', () => {
    if (matches(HOVER)) later(shut, 240);
  });
  for (const el of header.querySelectorAll('.hdr-nav > a, .hdr-actions')) {
    el.addEventListener('mouseenter', () => {
      if (matches(HOVER)) later(shut, 240);
    });
  }
  menu.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) close(menu, 0);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.open) {
      shut();
      trigger?.focus();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (menu.open && !header.contains(e.target as Node)) shut();
  });
}

/**
 * The phone menu: its button says "Open menu" or "Close menu", the page behind it holds still while
 * it's open, and Escape, a followed link or a screen grown to desktop width shut it.
 */
export function initPhoneMenu(header: HTMLElement, menu: HTMLDetailsElement): void {
  const btn = menu.querySelector<HTMLElement>('summary');
  const root = document.documentElement;
  const sync = () => {
    header.classList.toggle('is-open', menu.open);
    root.style.overflow = menu.open ? 'hidden' : '';
    const name = btn?.dataset[menu.open ? 'labelClose' : 'labelOpen'];
    if (btn && name) btn.setAttribute('aria-label', name);
  };
  menu.addEventListener('toggle', sync);
  menu.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) menu.open = false;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.open) {
      menu.open = false;
      btn?.focus();
    }
  });
  if (typeof window.matchMedia === 'function') {
    const wide = window.matchMedia(DESKTOP);
    const onWide = () => {
      if (wide.matches) menu.open = false;
    };
    if (typeof wide.addEventListener === 'function') wide.addEventListener('change', onWide);
  }
  sync();
}

/** Calls `onEnter` once, the first time `el` comes into view. */
function onView(el: Element, onEnter: () => void, { rootMargin = '0px', threshold = 0 } = {}): void {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        onEnter();
      }
    },
    { rootMargin, threshold },
  );
  io.observe(el);
}

/**
 * What moves as you scroll: `.rv` blocks below the fold rise in, `[data-count]` figures count up, the
 * seat meter's marks pop in, and the footer's signature draws up with its ripple. Under reduced motion,
 * or with no IntersectionObserver, everything is simply shown, as the markup already has it.
 */
export function initInView(root: ParentNode): void {
  const still = reducedMotion() || !('IntersectionObserver' in window);
  const arrive = (el: Element) => {
    el.classList.add('is-in');
    el.querySelector('.rp')?.classList.add('rp-intro');
  };
  for (const el of root.querySelectorAll('.seatm, .foot-mark')) {
    if (still) el.classList.add('is-in');
    else onView(el, () => arrive(el), { rootMargin: '0px 0px -15% 0px' });
  }
  if (still) return;
  for (const el of root.querySelectorAll<HTMLElement>('.rv')) {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) continue;
    el.classList.add('rv-wait');
    onView(el, () => el.classList.remove('rv-wait'), { rootMargin: '0px 0px -8% 0px' });
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-count]')) {
    const to = Number(el.dataset.count);
    if (!Number.isFinite(to) || el.getBoundingClientRect().top < window.innerHeight) continue;
    el.textContent = '0';
    onView(
      el,
      () => {
        let start = 0;
        const step = (t: number) => {
          if (!start) start = t;
          const k = Math.min(1, (t - start) / 1500);
          el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString('en-US');
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
  }
}

export function init(): void {
  document.documentElement.classList.add('aiw-js');
  const page = document.querySelector<HTMLElement>('.aiw');
  if (!page) return;
  initTheme(page);
  const header = page.querySelector<HTMLElement>('.hdr');
  if (header) {
    initScrolled(header);
    const programs = header.querySelector<HTMLDetailsElement>('details.hdr-programs');
    if (programs) initPrograms(header, programs);
    const phone = header.querySelector<HTMLDetailsElement>('details.hdr-mobile');
    if (phone) initPhoneMenu(header, phone);
  }
  initInView(page);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
