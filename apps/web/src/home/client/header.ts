// The v2 kit's header script, for the kit's header on the homepage (`../render.ts`'s `homeHeader`).
//
// COPIED FROM `../../kit/client/main.ts`, NOT IMPORTED: that module starts the kit's whole script when it
// loads, and a module both pages' scripts imported would become a shared chunk, which `ai101Inline()`
// refuses (each page keeps exactly one script). `header.test.ts` holds every copy below to the kit's,
// character for character, so the two headers can't drift apart.
//
// What it adds, as on every kit page: the header turning solid once you scroll, Programs opening on hover
// and shutting on Escape, a click outside or a followed link, and the phone menu's button naming itself
// and holding the page still. The theme switch stays hidden here: the homepage is dark only.

const REDUCE = '(prefers-reduced-motion: reduce)';
const HOVER = '(hover: hover) and (pointer: fine)';
const DESKTOP = '(min-width: 1081px)';

const matches = (q: string): boolean => typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
const reducedMotion = (): boolean => matches(REDUCE);

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

/** The kit's `init()`, for the header alone: the same class on <html>, then the header's three parts. */
export function initHeader(root: ParentNode = document): void {
  document.documentElement.classList.add('aiw-js');
  const header = root.querySelector<HTMLElement>('.hp-chrome .hdr');
  if (!header) return;
  initScrolled(header);
  const programs = header.querySelector<HTMLDetailsElement>('details.hdr-programs');
  if (programs) initPrograms(header, programs);
  const phone = header.querySelector<HTMLDetailsElement>('details.hdr-mobile');
  if (phone) initPhoneMenu(header, phone);
}
