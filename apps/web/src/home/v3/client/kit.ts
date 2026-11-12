// The v2 kit's script, the parts homepage v3 uses, COPIED from `../../../kit/client/main.ts`, NOT
// IMPORTED: that module starts the kit's whole script when it loads (the theme switch included, which
// `/` keeps hidden), and a module two pages' scripts both imported would become a shared chunk, which
// `ai101Inline()` refuses. `kit.test.ts` holds every copy below to the kit's, character for character.
//
// What they do, as on every kit page: the header turning solid as you scroll, Programs and the phone
// menu, the `.rv` reveal that never holds back a buy button, seat counter or proof line (NEVER_HIDDEN),
// the seat meter's and footer mark's arrival (`is-in`), and the hero's exit progress (`--p`).

const REDUCE = '(prefers-reduced-motion: reduce)';
const HOVER = '(hover: hover) and (pointer: fine)';
const DESKTOP = '(min-width: 1081px)';

const matches = (q: string): boolean => typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
export const reducedMotion = (): boolean => matches(REDUCE);

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
 * AMPY'S RULE: no buy button, alternate payment link, seat counter or proof line may ever start
 * hidden. A `.rv` block that is one of these, or holds one, is never held back below the fold.
 */
export const NEVER_HIDDEN = [
  '.proof-line',
  '.plan-actions',
  '.act-link',
  '.seatm',
  '[data-seats]',
  '[data-left]',
  'a[href*="buy.stripe.com"]',
].join(', ');

/** Whether `el` is, or holds, something that may never start hidden (`NEVER_HIDDEN`). */
export const holdsBuying = (el: Element): boolean =>
  el.matches(NEVER_HIDDEN) || el.querySelector(NEVER_HIDDEN) !== null;

/**
 * What moves as you scroll: `.rv` blocks below the fold rise in, `[data-count]` figures count up, the
 * footer's Logo 1 draws up with its ripple, and any `[data-in]` drawing (a page's chart) gets `is-in`
 * as it arrives. A block holding a buy button, a payment link, a seat
 * counter or the proof line is never held back (`NEVER_HIDDEN`), and the seat meter's marks are drawn
 * from the start. Under reduced motion, or with no IntersectionObserver, everything is simply shown,
 * as the markup already has it.
 */
export function initInView(root: ParentNode): void {
  const still = reducedMotion() || !('IntersectionObserver' in window);
  const arrive = (el: Element) => {
    el.classList.add('is-in');
    el.querySelector('.rp')?.classList.add('rp-intro');
  };
  for (const el of root.querySelectorAll('.seatm, .foot-mark, [data-in]')) {
    if (still) el.classList.add('is-in');
    else onView(el, () => arrive(el), { rootMargin: '0px 0px -15% 0px' });
  }
  if (still) return;
  for (const el of root.querySelectorAll<HTMLElement>('.rv')) {
    if (holdsBuying(el)) continue;
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

/** `[data-scroll="exit"]`: writes how far the block has scrolled off the top (0 to 1) as `--p`, once a frame. */
export function initScrollExit(root: ParentNode): void {
  if (reducedMotion()) return;
  const els = [...root.querySelectorAll<HTMLElement>('[data-scroll="exit"]')];
  if (!els.length) return;
  let frame = 0;
  const update = () => {
    frame = 0;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--p', Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))).toFixed(4));
    }
  };
  update();
  const later = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', later, { passive: true });
  window.addEventListener('resize', later);
}
