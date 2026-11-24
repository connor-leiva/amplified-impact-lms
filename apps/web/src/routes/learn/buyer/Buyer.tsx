// D-241: the $37 skill buyer inside the LMS (Connor, Nov 24, 2026). A learner who bought a skill and holds no plan and
// no access group (`skillOnlyBuyer`) gets the members' shell (the LMS v3 `AppShell`: sidebar, top bar, account menu)
// with their skills first and the rest of the LMS shown locked, each with the one plan that opens it. The design is
// `handoff/lms-mockup/buyer.html`; the pages are `pages.tsx`.
//
// Shown whatever VITE_LEARNER_V2 and VITE_LMS_V3 say (Connor: "Show them now"): only a buyer ever sees it, so no member's
// screen moves. Light only, as the v3 member pages are (D-226; Connor: "Light only is fine"). The guided setup of a skill
// they hold and the Account page are today's pages, inside the shell, as the members' v3 frame draws them.
import '../../../styles/r2.css';
import '../../../styles/learner-v2.css';
import '../../../components/motion/ai-motion.css';
import '../lms-v3/frame.css';
import '../lms-v3/lms.tokens.css';
import '../lms-v3/lms.css';
import './buyer.css';
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { learnerOf } from '@ai/core/learner';
import { Menu } from '../../../components/r2/Menu';
import type { MenuEntry, MenuGroup } from '../../../components/r2/Menu';
import { ToasterProvider, useToaster } from '../../../components/primitives/Toaster';
import { useDb, useNow, useViewer } from '../../../data/hooks';
import { SIGN_OUT_FAILED, signOut as endSession } from '../../../data/session';
import { useAppReady } from '../../../shell/hooks';
import { themeVM } from '../../../shell/learner/shell.vm';
import { useLearnerPrefs } from '../../../shell/learner/useLearnerPrefs';
import { paymentLinks, startSkillCheckout } from '../../library/SkillPurchase';
import { LearnProvider } from '../data';
import type { LearnContext } from '../data';
import { LABELS } from '../learn.vm';
import { AppShell } from '../lms-v3/AppShell';
import { Icon, IconSprite } from '../lms-v3/Icons';
import { LOGOS } from '../lms-v3/logos';
import { KEEP_TAP, NO_TAP, TODAY_TAP } from '../lms-v3/tap';
import { LEARN_ROOT, learnAccount, learnHome, learnSkills } from '../routes';
import { useGuide, useSkills } from '../skills-data';
import { RollLabel } from '@brand/ai-motion';
import { buyerCurrent, buyerHere, buyerShell, buyerSkills, buyerView, initialsOf, isSkillBuyer, outlineOf, ownedOf, stripOf, v3PageOf } from './buyer.vm';
import type { BuyerSkill, OutlineWeek } from './buyer.vm';
import { Accelerator, Home, Library, LockedSkill, Office, Training } from './pages';
import type { Checkout, Links } from './pages';

const ACCOUNT = '.sh-acct';

// The members' pages the frame draws as they are (a held skill's guided setup, the Account page), loaded when one is
// shown, so the buyer's own pages never load theirs.
const SkillPage = lazy(() => import('../Skill'));
const Account = lazy(() => import('../Account'));
const LINKS_KEY = ['offer', 'payment-links'] as const;
const OUTLINE_KEY = ['buyer', 'course-outline'] as const;

/** The AI Accelerator's weeks, as `GET /api/course` outlines them for a buyer (a 403 with `outline`). Any failure: none. */
async function fetchOutline(): Promise<OutlineWeek[]> {
  try {
    const res = await fetch('/api/course', { credentials: 'include', headers: { accept: 'application/json' } });
    return outlineOf(await res.json());
  } catch {
    return [];
  }
}

/** Where the account menu opens: under the account button, as the members' v3 frame places it. */
function useAnchor(open: boolean): CSSProperties | null {
  const [at, setAt] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = document.querySelector(ACCOUNT)?.getBoundingClientRect();
      setAt(r ? { position: 'fixed', top: r.bottom, left: r.right, width: 0, height: 0, zIndex: 40 } : null);
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);
  return open ? at : null;
}

function Strip({ owned }: { owned: readonly BuyerSkill[] }) {
  const st = stripOf(owned);
  if (!st) return null;
  return (
    <>
      <span className="sh-live">
        <Icon name="book" size={16} />
        {st.label}
      </span>
      <b>{st.title}</b>
      {st.more ? <span className="sh-mut">{st.more}</span> : null}
      <a className="wk-btn wk-btn-ghost wk-btn-sm" href={st.href}>
        <RollLabel>{st.action}</RollLabel>
      </a>
    </>
  );
}

/** A locked skill's page: its guide's step titles (what www shows anyone) and the $37 checkout. */
function Locked({ s, links }: { s: BuyerSkill; links: Links }) {
  const guide = useGuide(s.slug);
  const [checkout, setCheckout] = useState<Checkout>({ kind: 'idle' });
  const buy = useCallback(() => {
    setCheckout({ kind: 'busy' });
    void startSkillCheckout(s.id).then((ok) => {
      if (!ok) setCheckout({ kind: 'failed' });
    });
  }, [s.id]);
  return <LockedSkill s={s} preview={guide.kind === 'ready' ? guide.answer.preview : null} links={links} checkout={checkout} onBuy={buy} />;
}

function Frame({ skills }: { skills: BuyerSkill[] }) {
  const db = useDb();
  const viewer = useViewer();
  const now = useNow(60_000);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToaster();
  const prefs = useLearnerPrefs(viewer);
  const theme = themeVM(prefs.theme);
  const linksQ = useQuery({ queryKey: LINKS_KEY, queryFn: paymentLinks, staleTime: Infinity });
  const links = (linksQ.data ?? {}) as Links;
  const outlineQ = useQuery({ queryKey: OUTLINE_KEY, queryFn: fetchOutline, staleTime: Infinity });
  const weeks = outlineQ.data ?? [];
  const [account, setAccount] = useState(false);
  const anchor = useAnchor(account);
  // Ready once the outline is in, so the sidebar's weeks and Home's rows draw in one frame.
  useAppReady(outlineQ.isFetched);

  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const name = me?.name ?? '';
  const owned = ownedOf(skills);
  const view = buyerView(location.pathname);
  const skill = view.kind === 'skill' ? (skills.find((x) => x.slug === view.slug) ?? null) : null;

  // A new page starts at the top, as the mockup's links do; a week's address scrolls to its row.
  useEffect(() => {
    if (view.kind === 'accelerator' && view.week > 0) document.getElementById(`wk-row-${view.week}`)?.scrollIntoView({ block: 'start' });
    else if ((document.scrollingElement?.scrollTop ?? 0) > 0) window.scrollTo(0, 0);
  }, [location.pathname]);

  const signOut = useCallback(() => {
    void endSession().then((ok) => {
      if (!ok) toast(SIGN_OUT_FAILED, 'warn');
    });
  }, [toast]);
  const menu: (MenuEntry | MenuGroup)[] = [
    { label: LABELS.accountPage, onSelect: () => navigate(learnAccount()) },
    'separator',
    { group: theme.label, items: theme.choices.map((c) => ({ label: c.label, icon: c.icon, checked: c.checked, onSelect: () => prefs.set({ theme: c.value }) })) },
    'separator',
    { label: LABELS.signOut, onSelect: signOut },
  ];

  // The shell's links are anchors: an in-app address goes through the router (the members' v3 frame does the same).
  const onClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith(LEARN_ROOT)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    },
    [navigate],
  );

  if (view.kind === 'other') return <Navigate to={learnHome()} replace />;
  if (view.kind === 'skill' && !skill) return <Navigate to={learnSkills()} replace />;

  const v3 = v3PageOf(view, skill?.open ?? false);
  const ctx: LearnContext = { course: { kind: 'locked' }, db, viewer, now };
  const page =
    view.kind === 'home' ? (
      <Home skills={skills} weeks={weeks} first={name.split(/\s+/)[0] ?? ''} hour={new Date(now).getHours()} links={links} />
    ) : view.kind === 'library' ? (
      <Library skills={skills} links={links} />
    ) : view.kind === 'skill' && skill ? (
      skill.open ? (
        <SkillPage slug={skill.slug} />
      ) : (
        <Locked s={skill} links={links} />
      )
    ) : view.kind === 'training' ? (
      <Training skills={skills} links={links} />
    ) : view.kind === 'office' ? (
      <Office owned={owned} links={links} />
    ) : view.kind === 'accelerator' ? (
      <Accelerator weeks={weeks} />
    ) : (
      <LearnProvider value={ctx}>
        <Account />
      </LearnProvider>
    );

  const shell = buyerShell({
    owned,
    weeks,
    initials: initialsOf(name),
    here: buyerHere(view, skill?.title ?? null),
    logo: LOGOS.app,
    account: { open: account, onClick: () => setAccount((o) => !o) },
  });

  return (
    <div data-lms-v3="" data-buyer="" onClick={onClick} style={KEEP_TAP}>
      <IconSprite />
      <div style={NO_TAP}>
        <AppShell
          shell={shell}
          current={buyerCurrent(view)}
          hideNext={view.kind === 'home'}
          defaultCollapsed={prefs.sidebar === 'rail'}
          onCollapse={(on) => prefs.set({ sidebar: on ? 'rail' : 'full' })}
          strip={<Strip owned={owned} />}
        >
          {v3 ? (
            <div data-ai={view.kind}>{page}</div>
          ) : (
            <div data-r2-scope="" data-learner-v2="" data-lv-theme={prefs.theme} style={TODAY_TAP}>
              <Suspense fallback={null}>{page}</Suspense>
            </div>
          )}
        </AppShell>
      </div>
      {anchor ? (
        <div data-r2-scope="" data-learner-v2="" data-lv-theme={prefs.theme} style={anchor}>
          <Menu
            label={LABELS.account}
            items={menu}
            trigger={() => null}
            control={{ open: account, onOpenChange: setAccount, anchor: () => document.querySelector<HTMLElement>(ACCOUNT) }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** The buyer's LMS, once `GET /api/skills` says this is a buyer (the gates ask first). */
export function Buyer() {
  const load = useSkills();
  const skills = useMemo(() => (load.kind === 'ready' ? buyerSkills(load.payload) : null), [load]);
  if (load.kind === 'loading') return null;
  if (load.kind !== 'ready' || !isSkillBuyer(load.payload) || !skills) return <Navigate to="/" replace />;
  return (
    <ToasterProvider>
      <Frame skills={skills} />
    </ToasterProvider>
  );
}

export const Component = Buyer;
export default Buyer;
