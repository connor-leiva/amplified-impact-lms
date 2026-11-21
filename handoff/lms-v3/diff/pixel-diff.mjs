// Pixel diff: renders a TARGET page and the REFERENCE mockup in the same Chrome, in the same states, at the same
// moment (the clock is pinned), and compares screenshots with pixelmatch.
//
//   node diff/pixel-diff.mjs                                   # harness vs mockup, whole page (serves both locally)
//   node diff/pixel-diff.mjs --target <week url> --target-schedule <schedule url> --storage-state auth.json
//                            [--target-community <url>] [--target-thread <url of the sample thread 2>]
//                            [--target-locked <url of locked Week 1>] [--target-turnin <step url> --turnin-button <css>]
//                            [--assume s7|s8|deployed] [--assume-form new|submitted] [--assume-clock soon|live|ended|nextday]
//                            [--assume-turnin report|checkpoint|turned] [--assume-logo full] [--assume-as cl] [--selector '[data-ai="schedule"]']
//                                                              # deployed pages vs the mockup (acceptance test)
//   pass:    no different pixel in any check (pixelmatch threshold 0.1, anti-aliasing ignored) and the same size.
//   options: --states default,sched-default   --match '^(cm|th|ti)-'   --viewports desktop-1440   --tag d1 (names the
//            report file, for a run in parts)   --out results/   --chrome /usr/bin/google-chrome
//
// Five views: the week overview (#week-0), the Schedule (#schedule), the Community (#community), a thread
// (#thread-2) and a locked week (#week-1). All sit in the same shell (side nav + top bar), and the shell is part of the comparison.
// Against deployed pages the mockup's black MOCKUP bar is hidden and the whole page is compared, shell included.
// --selector compares one piece only (for a rollout in stages: '[data-ai="week"]', '[data-ai="schedule"]'); the
// mockup's sidebar is then resized so both pieces get the same width.
// The clock is pinned to 2026-11-20 3:18 PM CT ("Starts in 11 days 21 hr"). The states around a live session use the
// MOCKUP bar's Clock (9 min before, live, just ended, next day): both pages stand still at that moment. For a deployed
// page the browser's clock is pinned to the same moment, which moves everything the page works out in the browser
// (the countdown, the join window). What the server decides (a week opening, a replay being ready) has to be seeded:
// --assume-clock live says "this target's data is seeded for that moment". Never run those against production.
// Turn in opens from the step's button, so against a deployed site its drawer is compared on its own: --target-turnin
// is the step's page, --turnin-button the button that opens it; only the drawer panel is compared.
// A deployed page has one learner in one state. By default that is the mockup's "1 of 8" preview (step 1 done, step 3
// in progress, step 5 waiting on step 6). For a learner with only step 5 left pass --assume s7; with all 8 done --assume s8;
// for a deployed week --assume deployed.
// Nothing here clicks "Mark as deployed" on a deployed target, follows a calendar or Zoom link, or types into,
// submits or downloads a form there: a deployed page gets the form drawer opened, scrolled, hovered and closed only.
import { chromium } from 'playwright-core';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../harness/serve.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const here = fileURLToPath(new URL('.', import.meta.url));
const OUT = arg('out', here + '../results/');
const PORT = 4179;
const remote = !!arg('target');
const srv = await serve(PORT);
const target = arg('target', `http://localhost:${PORT}/harness/`);
const reference = arg('reference', `http://localhost:${PORT}/mockup/index.html`);
const targetSchedule = arg('target-schedule', remote ? null : target), targetCommunity = arg('target-community', remote ? null : target), targetThread = arg('target-thread', remote ? null : target);
const targetLocked = arg('target-locked', remote ? null : target), targetTurnin = arg('target-turnin', remote ? null : target), turninButton = arg('turnin-button', '[data-act="turnin"]');
const storage = arg('storage-state');
const selector = arg('selector', null);
const NOW = '2026-11-20T21:18:00Z';
// the MOCKUP bar's Clock moments (mockup/index.html › CLOCKS). A deployed target's browser clock is pinned to the same moment.
const CLOCK_AT = { soon: '2026-12-02T18:51:00Z', live: '2026-12-02T19:12:00Z', ended: '2026-12-02T21:00:00Z', nextday: '2026-12-03T16:00:00Z' };
const assume = arg('assume', 's1'), assumeForm = arg('assume-form', 'draft'), assumeTurnin = arg('assume-turnin', null), assumeClock = arg('assume-clock', 'today'), assumeLogo = arg('assume-logo', 'app'), assumeAs = arg('assume-as', 'am');
const onlyVp = arg('viewports')?.split(',');   // e.g. --viewports phone-390, to run one half at a time
const VIEWPORTS = [{ name: 'desktop-1440', width: 1440, height: 900 }, { name: 'phone-390', width: 390, height: 844 }].filter((v) => !onlyVp || onlyVp.includes(v.name));
const wait = (pg, ms) => pg.waitForTimeout(ms);
const SETTLE = 800;   // springs settle in 560 ms
const into = (pg, sel) => pg.evaluate((s) => { const h = document.documentElement; h.style.scrollBehavior = 'auto'; document.querySelector(s).scrollIntoView({ block: 'center' }); h.style.scrollBehavior = ''; }, sel);
const hover = async (pg, sel) => { await into(pg, sel); await pg.hover(sel); await wait(pg, SETTLE); };
const away = async (pg) => { await pg.mouse.move(2, 400); await wait(pg, SETTLE); };
// preview: the learner state the check needs (s1 unless said). full: whole page, pointer away. desktop: skipped at 390 (no hover).
// phone: only at 390. view: 'schedule' opens the Schedule. clock: the MOCKUP bar's Clock. local: only for the local harness.
// turnin: the Turn in drawer this check opens (report | checkpoint | turned). week: the locked week of view L.
const S = 'schedule', C = 'community', T = 'thread', L = 'locked';
const PANEL = '#up-host .aim-drawer__panel';
const FILES = [{ name: 'Seat card (made up).pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(184000) }, { name: 'First run (made up).png', mimeType: 'image/png', buffer: Buffer.alloc(2400000) }];
const click = async (pg, sel, ms = SETTLE) => { await pg.click(sel); await wait(pg, ms); };
const openForm = async (pg) => { await into(pg, '[data-act="form"]'); await pg.click('[data-act="form"]'); await wait(pg, 1500); };   // the drawer and its contents have arrived
const bottom = async (pg) => { await pg.evaluate(() => document.querySelector('.fm-body').scrollTo(0, 1e6)); await wait(pg, 400); };
const fillRequired = async (pg) => { await pg.click('[data-field="plan"] .fm-chip:nth-child(3)'); await pg.click('[data-field="google"] .fm-chip:nth-child(1)'); await wait(pg, 1800); };
const compose = async (pg) => { await click(pg, '#cm-start', 1500); await pg.click('.cm-drawer .fm-chip:nth-child(2)'); await pg.fill('#cm-f-title', 'Does the time baseline count weekends?'); await pg.fill('#cm-f-details', 'We log calls on Saturdays.\n\nDo those go in the baseline?'); await wait(pg, 400); };
// open the Turn in drawer: the step's button on a deployed page; the MOCKUP bar's "Open turn in" otherwise (the bar is hidden on the reference of a deployed run)
const openAsk = async (pg, k, env) => { if (env.live) { await into(pg, turninButton); await pg.click(turninButton); } else if (remote) await pg.evaluate((x) => window.__wk.launchTurnIn(x), k); else await pg.click(`[data-turnin="${k}"]`); await wait(pg, 1500); };
const fillAsk = async (pg, env) => { await openAsk(pg, 'checkpoint', env); await pg.setInputFiles('.up-pick input', FILES); await wait(pg, 2400); await pg.fill('#up-min', 'about 20 a day'); await pg.fill('#up-note', 'First run was Tuesday. (Made-up note.)'); await wait(pg, 300); };
const menu = async (pg, vp) => { if (vp.width <= 900) await click(pg, '#sh-menu'); };   // on phones the nav sits behind Menu
const STATES = {
  default: { full: true, run: async () => {} },
  'filter-owner': { full: true, run: async (pg) => { await pg.click('#wk-seg [data-role="owner"]'); await wait(pg, 1400); await away(pg); } },
  'filter-operator': { full: true, run: async (pg) => { await pg.click('#wk-seg [data-role="operator"]'); await wait(pg, 1400); await away(pg); } },
  'reference-open': { full: true, run: async (pg) => { for (const s of await pg.$$('.wk-acc summary')) { await s.click(); await wait(pg, 150); } await wait(pg, SETTLE); await away(pg); } },
  'hover-go': { desktop: true, run: (pg) => hover(pg, '#wk-go') },
  'hover-step-next': { desktop: true, run: (pg) => hover(pg, '.wk-step[data-n="2"]') },
  'hover-step': { desktop: true, run: (pg) => hover(pg, '.wk-step[data-n="4"]') },
  'hover-filter': { desktop: true, run: (pg) => hover(pg, '#wk-seg [data-role="operator"]') },
  'hover-kit-row': { desktop: true, run: (pg) => hover(pg, '#wk-kit .wk-kit-a') },
  'hover-kit-button': { desktop: true, run: (pg) => hover(pg, '#wk-kit [data-act="copy"]') },
  'hover-library': { desktop: true, run: (pg) => hover(pg, '.wk-kit-foot .wk-btn') },
  'acc-open-hover': { run: async (pg) => { await into(pg, '#wk-accs'); await pg.click('.wk-acc summary'); await wait(pg, SETTLE); await pg.hover('.wk-acc summary'); await wait(pg, SETTLE); } },
  'hover-next-week': { desktop: true, run: (pg) => hover(pg, '#wk-nextweek') },
  'one-left': { preview: 's7', full: true, run: async () => {} },
  'one-left-hover-step': { preview: 's7', desktop: true, run: (pg) => hover(pg, '.wk-step[data-n="5"]') },
  'all-done': { preview: 's8', full: true, run: async () => {} },
  'all-done-hover': { preview: 's8', desktop: true, run: (pg) => hover(pg, '#wk-deploy') },
  deployed: { preview: 'deployed', full: true, run: async () => {} },
  'deployed-hover-undo': { preview: 'deployed', desktop: true, run: (pg) => hover(pg, '#wk-undo') },
  'deploy-click': { preview: 's8', local: true, full: true, run: async (pg) => { await pg.click('#wk-deploy'); await wait(pg, 1800); await away(pg); } },
  'deploy-undo': { preview: 'deployed', local: true, full: true, run: async (pg) => { await pg.click('#wk-undo'); await wait(pg, 1400); await away(pg); } },
  // ---- shell: side nav and top bar ----
  'nav-hover-link': { desktop: true, run: (pg) => hover(pg, '.sh-link[data-nav="schedule"]') },
  'nav-hover-week': { desktop: true, run: (pg) => hover(pg, '#sh-weeks li:nth-child(4) .sh-link') },
  'nav-hover-current': { desktop: true, run: (pg) => hover(pg, '.sh-link[aria-current="page"]') },
  'nav-hover-group': { desktop: true, run: (pg) => hover(pg, '#sh-group') },
  'nav-group-closed': { full: true, run: async (pg, vp) => { await menu(pg, vp); await click(pg, '#sh-group'); await away(pg); } },
  'nav-collapsed': { desktop: true, full: true, run: async (pg) => { await click(pg, '#sh-collapse', 1200); await away(pg); } },
  'nav-collapsed-hover': { desktop: true, run: async (pg) => { await click(pg, '#sh-collapse', 1200); await hover(pg, '#sh-weeks li:nth-child(3) .sh-link'); } },
  'nav-expanded-again': { desktop: true, full: true, run: async (pg) => { await click(pg, '#sh-collapse', 1200); await click(pg, '#sh-collapse', 1200); await away(pg); } },
  'nav-menu-open': { phone: true, full: true, run: async (pg) => { await click(pg, '#sh-menu'); } },
  // the collapse travels (380 ms to close, the icons and numbers gliding for the last 240; 560 ms to open): these check where it lands
  'nav-collapse-interrupted': { desktop: true, local: true, full: true, run: async (pg) => { await pg.click('#sh-collapse'); await wait(pg, 60); await click(pg, '#sh-collapse', 1400); await away(pg); } },   // while the labels fade
  'nav-collapse-interrupted-late': { desktop: true, local: true, full: true, run: async (pg) => { await pg.click('#sh-collapse'); await wait(pg, 260); await click(pg, '#sh-collapse', 1400); await away(pg); } },   // while the icons glide
  'nav-expand-interrupted': { desktop: true, local: true, full: true, run: async (pg) => { await click(pg, '#sh-collapse', 1200); await pg.click('#sh-collapse'); await wait(pg, 150); await click(pg, '#sh-collapse', 1400); await away(pg); } },
  'nav-collapsed-group-closed': { desktop: true, full: true, run: async (pg) => { await click(pg, '#sh-group'); await click(pg, '#sh-collapse', 1200); await away(pg); } },
  'nav-hover-logo': { desktop: true, run: (pg) => hover(pg, '.sh-logo') },
  // the other lockup the open sidebar can carry (the MOCKUP bar's Logo; --assume-logo full on a deployed page)
  'nav-logo-full': { logo: 'full', full: true, run: async () => {} },
  'nav-logo-full-collapsed': { logo: 'full', desktop: true, full: true, run: async (pg) => { await click(pg, '#sh-collapse', 1200); await away(pg); } },
  'nav-logo-full-menu': { logo: 'full', phone: true, full: true, run: async (pg) => { await click(pg, '#sh-menu'); } },
  'top-cal-open': { run: async (pg) => { await click(pg, '#sh-next .sc-cal button'); await away(pg); } },
  'top-cal-hover-item': { desktop: true, run: async (pg) => { await click(pg, '#sh-next .sc-cal button'); await pg.hover('#sh-next .sc-menu a:nth-child(2)'); await wait(pg, SETTLE); } },
  'top-cal-closed': { run: async (pg) => { await click(pg, '#sh-next .sc-cal button'); await pg.keyboard.press('Escape'); await wait(pg, SETTLE); await away(pg); } },
  'top-hover-account': { desktop: true, run: (pg) => hover(pg, '.sh-acct') },
  'nav-to-schedule': { local: true, full: true, run: async (pg, vp) => { await menu(pg, vp); await click(pg, '.sh-link[data-nav="schedule"]', 1600); await away(pg); } },
  'nav-to-week': { view: S, local: true, full: true, run: async (pg, vp) => { await menu(pg, vp); await click(pg, '.sh-link[data-nav="week-0"]', 1600); await away(pg); } },
  'nav-s7': { preview: 's7', run: async () => {} },
  // ---- Schedule ----
  'sched-default': { view: S, full: true, run: async () => {} },
  'sched-hover-add': { view: S, desktop: true, run: (pg) => hover(pg, '#sc-hero .sc-cal button') },
  'sched-hover-what': { view: S, desktop: true, run: (pg) => hover(pg, '#sc-what') },
  'sched-cal-open': { view: S, run: async (pg) => { await click(pg, '#sc-hero .sc-cal button'); await away(pg); } },
  'sched-cal-hover-item': { view: S, desktop: true, run: async (pg) => { await click(pg, '#sc-hero .sc-cal button'); await pg.hover('#sc-hero .sc-menu a:nth-child(1)'); await wait(pg, SETTLE); } },
  'sched-hover-add-all': { view: S, desktop: true, run: (pg) => hover(pg, '#sc-all') },
  'sched-hover-view': { view: S, desktop: true, run: (pg) => hover(pg, '#sc-view a:nth-of-type(2)') },
  'sched-hover-week-0': { view: S, desktop: true, run: (pg) => hover(pg, '.sc-week[data-week="0"]') },
  'sched-hover-week-1': { view: S, desktop: true, run: (pg) => hover(pg, '.sc-week[data-week="1"]') },
  'sched-hover-week-6': { view: S, desktop: true, run: (pg) => hover(pg, '.sc-week[data-week="6"]') },
  'sched-one-left': { view: S, preview: 's7', full: true, run: async () => {} },
  'sched-all-done': { view: S, preview: 's8', full: true, run: async () => {} },
  'sched-deployed': { view: S, preview: 'deployed', full: true, run: async () => {} },
  // ---- form drawer (Week 0 Intake, opened from the kit). The seeded learner's intake is the "draft" sample
  //      (src/forms/week-0-intake.samples.json). Checks that type, choose or submit are local: on a deployed page they
  //      would write to a profile and to GHL.
  'form-row-hover': { desktop: true, run: (pg) => hover(pg, '[data-act="form"]') },
  'form-open': { run: openForm },
  'form-bottom': { run: async (pg) => { await openForm(pg); await bottom(pg); } },
  'form-hover-chip': { desktop: true, run: async (pg) => { await openForm(pg); await pg.hover('[data-field="operator"] .fm-chip:nth-child(1)'); await wait(pg, SETTLE); } },
  'form-hover-close': { desktop: true, run: async (pg) => { await openForm(pg); await pg.hover('.fm-close'); await wait(pg, SETTLE); } },
  'form-hover-submit': { desktop: true, run: async (pg) => { await openForm(pg); await pg.hover('.fm-submit'); await wait(pg, SETTLE); } },
  'form-hover-pdf': { desktop: true, run: async (pg) => { await openForm(pg); await pg.hover('.fm-pdf'); await wait(pg, SETTLE); } },
  'form-focus': { run: async (pg) => { await openForm(pg); await click(pg, '#fm-size'); } },
  'form-closed': { full: true, run: async (pg) => { await openForm(pg); await pg.keyboard.press('Escape'); await wait(pg, SETTLE); await away(pg); } },
  'form-typed-saved': { local: true, run: async (pg) => { await openForm(pg); await pg.fill('#fm-one-on-ones', 'Yes. I run them every other week.'); await wait(pg, 2200); await away(pg); } },
  'form-choice': { local: true, run: async (pg) => { await openForm(pg); await pg.click('[data-field="invited"] .fm-chip:nth-child(2)'); await wait(pg, 1600); await away(pg); } },
  'form-errors': { local: true, run: async (pg) => { await openForm(pg); await bottom(pg); await click(pg, '.fm-submit', 1400); await away(pg); } },
  'form-errors-fixed-one': { local: true, run: async (pg) => { await openForm(pg); await click(pg, '.fm-submit', 1200); await pg.click('[data-field="plan"] .fm-chip:nth-child(3)'); await wait(pg, 2200); await away(pg); } },
  'form-submit-busy': { local: true, run: async (pg) => { await openForm(pg); await fillRequired(pg); await pg.click('.fm-submit'); await wait(pg, 450); } },
  'form-submitted-now': { local: true, run: async (pg) => { await openForm(pg); await fillRequired(pg); await click(pg, '.fm-submit', 4200); await away(pg); } },
  'form-pdf-done': { local: true, run: async (pg) => { await openForm(pg); await pg.click('.fm-pdf'); await wait(pg, 1900); await away(pg); } },
  'form-edit-then-close': { local: true, full: true, run: async (pg) => { await openForm(pg); await pg.fill('#fm-one-on-ones', 'Yes. I run them every other week.'); await click(pg, '.fm-close', 1600); await away(pg); } },
  'form-submit-then-close': { local: true, full: true, run: async (pg) => { await openForm(pg); await fillRequired(pg); await click(pg, '.fm-submit', 4200); await click(pg, '.fm-done', 1200); await away(pg); } },
  'form-new-row': { form: 'new', full: true, run: async () => {} },
  'form-new-open': { form: 'new', run: openForm },
  'form-submitted-row': { form: 'submitted', full: true, run: async () => {} },
  'form-submitted-open': { form: 'submitted', run: openForm },
  'form-submitted-bottom': { form: 'submitted', run: async (pg) => { await openForm(pg); await bottom(pg); } },
  // ---- Community (#community, #thread-N). Checks that post, edit, delete, pin or hide are local: they write.
  'cm-list': { view: C, full: true, run: async () => {} },
  'cm-hover-row': { view: C, desktop: true, run: (pg) => hover(pg, '.cm-row[data-thread="2"] .cm-a') },
  'cm-hover-start': { view: C, desktop: true, run: (pg) => hover(pg, '#cm-start') },
  'cm-hover-space': { view: C, desktop: true, run: (pg) => hover(pg, '#cm-spaces .fm-chip:nth-child(3)') },
  'cm-space-week': { view: C, full: true, run: async (pg) => { await click(pg, '#cm-spaces .fm-chip:nth-child(3)'); await away(pg); } },
  'cm-space-wins': { view: C, full: true, run: async (pg) => { await click(pg, '#cm-spaces .fm-chip:nth-child(4)'); await away(pg); } },
  'cm-compose-open': { view: C, run: async (pg) => { await click(pg, '#cm-start', 1500); await away(pg); } },
  'cm-compose-space-kept': { view: C, run: async (pg) => { await click(pg, '#cm-spaces .fm-chip:nth-child(4)'); await click(pg, '#cm-start', 1500); await away(pg); } },
  'cm-compose-errors': { view: C, local: true, run: async (pg) => { await click(pg, '#cm-start', 1500); await click(pg, '.cm-drawer .aim-async', 1200); await away(pg); } },
  'cm-compose-busy': { view: C, local: true, run: async (pg) => { await compose(pg); await pg.click('.cm-drawer .aim-async'); await wait(pg, 350); } },
  'cm-compose-posted': { view: C, local: true, full: true, run: async (pg) => { await compose(pg); await click(pg, '.cm-drawer .aim-async', 3200); await away(pg); } },
  'cm-posted-then-list': { view: C, local: true, full: true, run: async (pg) => { await compose(pg); await click(pg, '.cm-drawer .aim-async', 3200); await click(pg, '.wk-crumbs a', 1600); await away(pg); } },
  'cm-list-staff': { view: C, as: 'cl', full: true, run: async () => {} },
  'th-open': { view: T, full: true, run: async () => {} },
  'th-own': { view: T, thread: 3, full: true, run: async () => {} },
  'th-pinned': { view: T, thread: 1, full: true, run: async () => {} },
  'th-hover-act': { view: T, desktop: true, run: (pg) => hover(pg, '[data-post="23"] [data-do="edit"]') },
  'th-edit': { view: T, local: true, run: async (pg) => { await into(pg, '[data-post="23"]'); await click(pg, '[data-post="23"] [data-do="edit"]'); await away(pg); } },
  'th-edit-saved': { view: T, local: true, full: true, run: async (pg) => { await click(pg, '[data-post="23"] [data-do="edit"]'); await pg.fill('[data-post="23"] textarea', 'Same here. Ours sends an export on the 5th.'); await click(pg, '[data-post="23"] [data-do="save"]'); await away(pg); } },
  'th-delete-ask': { view: T, local: true, run: async (pg) => { await into(pg, '[data-post="23"]'); await click(pg, '[data-post="23"] [data-do="delete"]'); await away(pg); } },
  'th-delete-yes': { view: T, local: true, full: true, run: async (pg) => { await click(pg, '[data-post="23"] [data-do="delete"]'); await click(pg, '[data-post="23"] [data-do="delete-yes"]'); await away(pg); } },
  'th-delete-thread': { view: T, thread: 3, local: true, full: true, run: async (pg) => { await click(pg, '[data-post="31"] [data-do="delete"]'); await click(pg, '[data-post="31"] [data-do="delete-yes"]', 1600); await away(pg); } },
  'th-reply-error': { view: T, local: true, run: async (pg) => { await into(pg, '#cm-replybox'); await click(pg, '#cm-replybox .aim-async', 1200); await away(pg); } },
  'th-reply-posted': { view: T, local: true, full: true, run: async (pg) => { await pg.fill('#cm-replybox textarea', 'Thanks. Sending the card back today.'); await click(pg, '#cm-replybox .aim-async', 2200); await away(pg); } },
  'th-staff': { view: T, as: 'cl', full: true, run: async () => {} },
  'th-staff-pin': { view: T, as: 'cl', local: true, full: true, run: async (pg) => { await click(pg, '[data-do="pin"]'); await away(pg); } },
  'th-staff-hide-reply': { view: T, as: 'cl', local: true, full: true, run: async (pg) => { await click(pg, '[data-post="23"] [data-do="hide"]'); await away(pg); } },
  'th-staff-hide-thread': { view: T, as: 'cl', local: true, full: true, run: async (pg) => { await click(pg, '[data-do="hide-thread"]'); await away(pg); } },
  'th-staff-hidden-thread': { view: T, thread: 5, as: 'cl', full: true, run: async () => {} },
  // ---- Turn in: the upload drawer. It opens from the step's button (here: the MOCKUP bar's "Open turn in").
  //      Uploads are played; checks that upload or turn in are local.
  'ti-open-report': { turnin: 'report', clip: PANEL, run: (pg, vp, env) => openAsk(pg, 'report', env) },
  'ti-open-checkpoint': { turnin: 'checkpoint', clip: PANEL, run: (pg, vp, env) => openAsk(pg, 'checkpoint', env) },
  'ti-hover-choose': { turnin: 'report', clip: PANEL, desktop: true, run: async (pg, vp, env) => { await openAsk(pg, 'report', env); await pg.hover('.up-pick'); await wait(pg, SETTLE); } },
  'ti-files-held': { turnin: 'checkpoint', local: true, run: async (pg, vp, env) => { await pg.evaluate(() => { window.__holdUploads = 0.42; }); await openAsk(pg, 'checkpoint', env); await pg.setInputFiles('.up-pick input', FILES); await wait(pg, 1500); await away(pg); } },
  'ti-files-done': { turnin: 'checkpoint', local: true, run: async (pg, vp, env) => { await openAsk(pg, 'checkpoint', env); await pg.setInputFiles('.up-pick input', FILES); await wait(pg, 2400); await away(pg); } },
  'ti-file-removed': { turnin: 'checkpoint', local: true, run: async (pg, vp, env) => { await openAsk(pg, 'checkpoint', env); await pg.setInputFiles('.up-pick input', FILES); await wait(pg, 2400); await click(pg, '.up-file:first-child .up-x'); await away(pg); } },
  'ti-bad-file': { turnin: 'report', local: true, run: async (pg, vp, env) => { await openAsk(pg, 'report', env); await pg.setInputFiles('.up-pick input', [{ name: 'notes.zip', mimeType: 'application/zip', buffer: Buffer.alloc(10) }]); await wait(pg, 1200); await away(pg); } },
  'ti-submit-empty': { turnin: 'report', local: true, run: async (pg, vp, env) => { await openAsk(pg, 'report', env); await pg.click('.up-submit', { force: true }); await wait(pg, 1200); await away(pg); } },   // aria-disabled until a file is in: the click still answers
  'ti-submit-busy': { turnin: 'checkpoint', local: true, run: async (pg, vp, env) => { await fillAsk(pg, env); await pg.click('.up-submit'); await wait(pg, 400); } },
  'ti-sent-now': { turnin: 'checkpoint', local: true, run: async (pg, vp, env) => { await fillAsk(pg, env); await click(pg, '.up-submit', 3600); await away(pg); } },
  'ti-sent-then-closed': { turnin: 'checkpoint', local: true, full: true, run: async (pg, vp, env) => { await fillAsk(pg, env); await click(pg, '.up-submit', 3600); await click(pg, '.up-drawer [data-do="done"]', 1200); await away(pg); } },
  'ti-view-sent': { turnin: 'turned', clip: PANEL, run: (pg, vp, env) => openAsk(pg, 'turned', env) },
  'ti-new-version': { turnin: 'turned', clip: PANEL, run: async (pg, vp, env) => { await openAsk(pg, 'turned', env); await click(pg, '.up-drawer [data-do="new"]', 1500); await away(pg); } },
  'ti-closed': { turnin: 'report', local: true, full: true, run: async (pg, vp, env) => { await openAsk(pg, 'report', env); await pg.keyboard.press('Escape'); await wait(pg, SETTLE); await away(pg); } },
  // ---- a session starting, live and over: the top bar on every page, and the Schedule ----
  'top-soon': { clock: 'soon', full: true, run: async () => {} },
  'top-soon-hover-join': { clock: 'soon', desktop: true, run: (pg) => hover(pg, '#sh-join') },
  'top-live': { clock: 'live', full: true, run: async () => {} },
  'top-live-hover-join': { clock: 'live', desktop: true, run: (pg) => hover(pg, '#sh-join') },
  'top-ended': { clock: 'ended', run: async () => {} },
  'top-ended-cal-open': { clock: 'ended', run: async (pg) => { await click(pg, '#sh-next .sc-cal button'); await away(pg); } },
  'top-nextday': { clock: 'nextday', full: true, run: async () => {} },
  'top-live-community': { view: C, clock: 'live', run: async () => {} },
  'top-live-thread': { view: T, clock: 'live', run: async () => {} },
  'top-live-nav-collapsed': { clock: 'live', desktop: true, full: true, run: async (pg) => { await click(pg, '#sh-collapse', 1200); await away(pg); } },
  'top-live-menu-open': { clock: 'live', phone: true, full: true, run: async (pg) => { await click(pg, '#sh-menu'); } },
  'sched-soon': { view: S, clock: 'soon', full: true, run: async () => {} },
  'sched-soon-hover-join': { view: S, clock: 'soon', desktop: true, run: (pg) => hover(pg, '#sc-join') },
  'sched-live': { view: S, clock: 'live', full: true, run: async () => {} },
  'sched-live-hover-week': { view: S, clock: 'live', desktop: true, run: (pg) => hover(pg, '.sc-week[data-week="1"]') },
  'sched-ended': { view: S, clock: 'ended', full: true, run: async () => {} },
  'sched-ended-cal-open': { view: S, clock: 'ended', run: async (pg) => { await click(pg, '#sc-hero .sc-cal button'); await away(pg); } },
  'sched-nextday': { view: S, clock: 'nextday', full: true, run: async () => {} },
  'sched-nextday-hover-replay': { view: S, clock: 'nextday', desktop: true, run: (pg) => hover(pg, '.sc-replay') },
  'sched-nextday-hover-what': { view: S, clock: 'nextday', desktop: true, run: (pg) => hover(pg, '#sc-what') },
  'sched-clock-back': { view: S, clock: 'live', local: true, full: true, run: async (pg) => { await click(pg, '[data-clock="today"]', 1200); await away(pg); } },
  // ---- locked weeks: the nav rows, and the page a locked week opens (#week-N) ----
  'lk-week-1': { view: L, week: 1, full: true, run: async () => {} },
  'lk-week-2': { view: L, week: 2, full: true, run: async () => {} },
  'lk-week-7': { view: L, week: 7, full: true, run: async () => {} },
  'lk-week-8': { view: L, week: 8, full: true, run: async () => {} },
  'lk-hover-cal': { view: L, week: 1, desktop: true, run: (pg) => hover(pg, '#lk-cal') },
  'lk-hover-back': { view: L, week: 1, desktop: true, run: (pg) => hover(pg, '#lk-back') },
  'lk-hover-crumb': { view: L, week: 1, desktop: true, run: (pg) => hover(pg, '.wk-crumbs a') },
  'lk-hover-row': { view: L, week: 1, desktop: true, run: (pg) => hover(pg, '.lk-row') },
  'lk-nav-hover-locked': { desktop: true, run: (pg) => hover(pg, '#sh-weeks li:nth-child(6) .sh-link') },
  'lk-nav-collapsed': { view: L, week: 3, desktop: true, full: true, run: async (pg) => { await click(pg, '#sh-collapse', 1200); await away(pg); } },
  'lk-nav-menu-open': { view: L, week: 1, phone: true, full: true, run: async (pg) => { await click(pg, '#sh-menu'); } },
  'lk-week-2-ended': { view: L, week: 2, clock: 'ended', full: true, run: async () => {} },
  'lk-from-nav': { local: true, full: true, run: async (pg, vp) => { await menu(pg, vp); await click(pg, '.sh-link[data-nav="week-4"]', 1600); await away(pg); } },
  'lk-from-schedule': { view: S, local: true, full: true, run: async (pg) => { await into(pg, '.sc-week[data-week="2"]'); await click(pg, '.sc-week[data-week="2"] .sc-a', 1600); await away(pg); } },
  'lk-from-next-week': { local: true, full: true, run: async (pg) => { await into(pg, '#wk-nextweek'); await click(pg, '#wk-nextweek', 1600); await away(pg); } },
  'lk-back-to-week': { view: L, week: 1, local: true, full: true, run: async (pg) => { await click(pg, '#lk-back', 1600); await away(pg); } },
  'lk-opens-while-open': { view: L, week: 1, local: true, full: true, run: async (pg) => { await click(pg, '[data-clock="live"]', 1600); await away(pg); } },   // the week opened: the mockup goes to the Schedule
  'sched-nav-collapsed': { view: S, desktop: true, full: true, run: async (pg) => { await click(pg, '#sh-collapse', 1200); await away(pg); } },
};
const only = arg('states')?.split(','), match = arg('match') && new RegExp(arg('match'));   // --match '^(cm|th|ti)-' runs one part
const browser = await chromium.launch({ executablePath: arg('chrome', '/usr/bin/google-chrome'), args: ['--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars'] });
mkdirSync(OUT, { recursive: true });

async function open(url, vp, useStorage, at = NOW) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...(useStorage && storage ? { storageState: storage } : {}) });
  const pg = await ctx.newPage();
  await pg.clock.setFixedTime(new Date(at));
  pg.on('pageerror', (e) => console.log('  page error:', url, e.message));
  await pg.goto(url, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  return { ctx, pg };
}
const top = async (pg) => { for (let i = 0; i < 20; i++) { if (await pg.evaluate(() => { const h = document.documentElement; h.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); h.style.scrollBehavior = ''; return scrollY === 0; })) return; await wait(pg, 50); } };
async function shot(base, vp, name, isTarget, sideWidth) {
  const st = STATES[name];
  const live = isTarget && remote;
  const url = live ? base : base + (st.view === S ? '#schedule' : st.view === C ? '#community' : st.view === T ? `#thread-${st.thread ?? 2}` : st.view === L ? `#week-${st.week}` : '#week-0');
  const { ctx, pg } = await open(url, vp, isTarget, live && st.clock ? CLOCK_AT[st.clock] : NOW);
  await wait(pg, 1200);   // the page's arrival rise (560 ms + stagger) is over
  const preview = st.preview ?? 's1';
  if (preview !== 's1' && !live) { await pg.click(`[data-preview="${preview}"]`); await wait(pg, 1600); }
  if (st.form && !live) { await pg.click(`[data-form="${st.form}"]`); await wait(pg, 600); }
  if (st.logo && !live) { if (remote) await pg.evaluate((k) => window.__wk.setLogo(k), st.logo); else await pg.click(`.wkx-prev [data-logo="${st.logo}"]`); await wait(pg, 600); }
  if (st.clock && !live) { if (remote) await pg.evaluate((k) => window.__wk.setClock(k), st.clock); else await pg.click(`[data-clock="${st.clock}"]`); await wait(pg, 1200); }
  if (st.as && !live) { await pg.click(`[data-as="${st.as}"]`); await wait(pg, 1400); }
  if (!isTarget && remote) { await pg.addStyleTag({ content: `.wkx-flag{display:none!important}${sideWidth != null ? `#sh-app{--sh-w:${sideWidth}px!important}` : ''}` }); await wait(pg, 300); }   // the MOCKUP bar isn't part of a deployed page
  await top(pg);
  await st.run(pg, vp, { live });
  if (st.full) { await top(pg); await wait(pg, 400); await top(pg); }
  let opts = { fullPage: !!st.full, animations: 'disabled', caret: 'hide' };
  const sel = selector || (remote && st.clip);   // against a deployed site a drawer that opens from another page is compared on its own
  if (sel) {
    const r = await pg.evaluate((s) => { const b = [...document.querySelectorAll(s)].find((e) => e.offsetParent)?.getBoundingClientRect(); return b && { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; }, sel);
    if (!r) { await ctx.close(); return null; }
    opts = { ...opts, fullPage: true, clip: r };
  }
  const png = PNG.sync.read(await pg.screenshot(opts));
  await ctx.close();
  return png;
}
function pad(img, w, h) {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h }); out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, Math.min(img.width, w), Math.min(img.height, h), 0, 0); return out;
}
const report = []; const skipped = [];
for (const vp of VIEWPORTS) {
  // --selector on a deployed page: give the mockup's sidebar the width that makes the compared piece the same width
  let side = null;
  if (remote && selector && vp.width > 900) {
    const { ctx, pg } = await open(target, vp, true);
    const w = await pg.evaluate((s) => [...document.querySelectorAll(s)].find((e) => e.offsetParent)?.getBoundingClientRect().width, selector);
    await ctx.close();
    if (w) side = Math.max(0, vp.width - Math.round(w));
  }
  for (const [name, st] of Object.entries(STATES)) {
    if ((only && !only.includes(name)) || (match && !match.test(name))) continue;
    if (st.desktop && vp.width <= 640) continue;
    if (st.phone && vp.width > 640) continue;
    const tgt = st.turnin && remote ? (st.clip && st.turnin === assumeTurnin ? targetTurnin : null) : st.view === S ? targetSchedule : st.view === C ? targetCommunity : st.view === T ? (!remote || (st.thread ?? 2) === 2 ? targetThread : null) : st.view === L ? (!remote || st.week === 1 ? targetLocked : null) : target;
    if (remote && (st.local || (st.preview ?? 's1') !== assume || (st.form ?? 'draft') !== assumeForm || (st.clock ?? 'today') !== assumeClock || (st.logo ?? 'app') !== assumeLogo || (st.as ?? 'am') !== assumeAs || !tgt)) { skipped.push(`${vp.name}-${name}`); continue; }
    const [a, b] = await Promise.all([shot(tgt, vp, name, true, null), shot(reference, vp, name, false, side)]);   // two contexts, each with its own pointer
    if (!a || !b) { skipped.push(`${vp.name}-${name}`); continue; }   // --selector is not on this view
    const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
    const A = pad(a, w, h), B = pad(b, w, h), D = new PNG({ width: w, height: h });
    const diff = pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.1, includeAA: false });
    const strict = pixelmatch(A.data, B.data, null, w, h, { threshold: 0, includeAA: true });
    const tag = `${vp.name}-${name}`;
    writeFileSync(`${OUT}${tag}-target.png`, PNG.sync.write(a)); writeFileSync(`${OUT}${tag}-reference.png`, PNG.sync.write(b)); writeFileSync(`${OUT}${tag}-diff.png`, PNG.sync.write(D));
    const row = { viewport: vp.name, state: name, size: { target: [a.width, a.height], reference: [b.width, b.height] }, diffPixels: diff, pct: +(100 * diff / (w * h)).toFixed(4), strictPixels: strict, strictPct: +(100 * strict / (w * h)).toFixed(4) };
    report.push(row); console.log(`${tag.padEnd(38)} ${String(row.pct).padStart(8)}%  (strict ${row.strictPct}%)  target ${a.width}x${a.height} ref ${b.width}x${b.height}`);
  }
}
writeFileSync(`${OUT}report${arg('tag') ? '.' + arg('tag') : onlyVp ? '.' + onlyVp.join('+') : ''}.json`, JSON.stringify({ target, targetSchedule, reference, selector, clock: NOW, assume: remote ? assume : undefined, when: new Date().toISOString(), threshold: 0.1, report, skipped }, null, 2));
await browser.close(); srv.close();
if (skipped.length) console.log(`skipped ${skipped.length} checks that need another learner state (--assume), another URL (--target-schedule) or the local harness: ${[...new Set(skipped.map((s) => s.replace(/^(desktop-1440|phone-390)-/, '')))].join(', ')}`);
if (!report.length) { console.log('FAIL: nothing was compared'); process.exit(1); }
const worst = Math.max(...report.map((r) => r.pct)), worstPx = Math.max(...report.map((r) => r.diffPixels));
const sizes = report.every((r) => r.size.target[0] === r.size.reference[0] && r.size.target[1] === r.size.reference[1]);
const MAX_PX = +arg('max-px', 0);   // no different pixel passes: a missing 6px status dot is only 15 pixels. --max-px N is for finding out how far off a page is, never for accepting it
const ok = worst < 0.1 && worstPx <= MAX_PX && sizes;
console.log(ok ? `PASS: ${report.length} checks, ${MAX_PX ? `every one within ${MAX_PX} pixels (worst ${worstPx} px)` : 'no different pixel in any of them'}` : `FAIL: worst ${worstPx} px, ${worst}%${sizes ? '' : ', and some screenshots differ in size'} (pass: ${MAX_PX ? `at most ${MAX_PX} different pixels a check` : 'no different pixel'}, same size)`);
process.exit(ok ? 0 : 1);
