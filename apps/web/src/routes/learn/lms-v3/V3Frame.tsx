// D-226: the learner frame when v3 draws (`v3On`): the package's `AppShell` around the page, fed by `shellProps`.
// Wiring only. The markup and the CSS are the package's; what this file adds draws nothing of its own:
//   - the package's links are plain anchors (the mockup is one page), so a click on an in-app address is handed to
//     the router here instead of reloading the app; a calendar menu's Google and Outlook links open a new tab, as
//     today's do; the Join link asks the join route for the Zoom URL at click time, as `Join` does today;
//   - the account button opens today's account `Menu` (C-01), whose panel is not in the mockup and keeps its styles;
//   - a page that isn't a v3 page (Home, Skill library, Team Hub, Resource vault, an AI Employee: Q-09) keeps
//     today's frame tokens around it, so it draws as it does today, inside the new shell.
// Loaded lazily from `LearnerShell`, so its stylesheets reach only a learner v3 draws for: `lms.tokens.css` sets
// `interpolate-size` on `:root`, which would change today's pages' transitions.
import './lms.tokens.css';
import './lms.css';
import { useCallback, useLayoutEffect, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Menu } from '../../../components/r2/Menu';
import type { MenuEntry, MenuGroup } from '../../../components/r2/Menu';
import { useToaster } from '../../../components/primitives/Toaster';
import { useJoin } from '../../../data/join';
import { saveIcs } from '../ics';
import { LABELS, icsEvents } from '../learn.vm';
import { learnSchedule, LEARN_ROOT } from '../routes';
import { AppShell } from './AppShell';
import { IconSprite } from './Icons';
import { LOGOS } from './logos';
import { currentOf, joinOfHref, shellProps } from './shell.vm';
import type { ShellInput } from './shell.vm';

export interface V3FrameProps {
  input: Omit<ShellInput, 'logos' | 'account' | 'saveIcs'>;
  pathname: string;
  /** The person's stored sidebar choice (D-185) and how to store a new one (B-43). */
  collapsed: boolean;
  onCollapse: (on: boolean) => void;
  /** Today's account menu, as `LearnerShell` builds it. */
  menu: readonly (MenuEntry | MenuGroup)[];
  /** The page under the shell is a v3 page: it carries its own `[data-ai]` frame. */
  v3Page: boolean;
  theme: 'light' | 'dark';
  children: ReactNode;
}

const ACCOUNT = '.sh-acct';

// D-225: the mockup's own control heights on these surfaces (D-210 item 4's exemption, extended). The app's global
// `styles/lms.css` gives every button and field a phone floor through `--tap` (44px, 48px for the primary) on `:root`.
// Neither stylesheet changes: the frame keeps the page's `--tap` aside, sets it to nothing for the package's markup,
// and hands it back to today's pages under the shell, which keep their floor.
const KEEP_TAP = { '--v3-tap': 'var(--tap)', '--v3-tap-primary': 'var(--tap-primary)' } as CSSProperties;
// `auto`, not 0: the rule is `min-width` and `min-height`, and `auto` is their initial value (a 0 would let a flex item shrink).
const NO_TAP = { '--tap': 'auto', '--tap-primary': 'auto' } as CSSProperties;
const TODAY_TAP = { '--tap': 'var(--v3-tap)', '--tap-primary': 'var(--v3-tap-primary)' } as CSSProperties;

/** Where today's account menu opens: under the account button, its right edge on the button's (`below-right`). */
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

export function V3Frame({ input, pathname, collapsed, onCollapse, menu, v3Page, theme, children }: V3FrameProps) {
  const navigate = useNavigate();
  const join = useJoin();
  const { toast } = useToaster();
  const [account, setAccount] = useState(false);
  const anchor = useAnchor(account);
  const shell = shellProps({
    ...input,
    logos: LOGOS,
    account: { open: account, onClick: () => setAccount((o) => !o) },
    saveIcs: (s) => saveIcs(icsEvents([s]), input.now),
  });

  const onClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) {
        // A calendar menu's Google Calendar and Outlook: a new tab, as today's calendar links open.
        if (a.closest('.sc-menu') && /^https?:$/.test(url.protocol)) {
          e.preventDefault();
          window.open(url.href, '_blank', 'noopener');
        }
        return;
      }
      const sessionId = joinOfHref(url.pathname);
      if (sessionId) {
        e.preventDefault();
        const title = input.sessions.find((s) => s.id === sessionId)?.title ?? '';
        void join(sessionId, () => toast(`Opening Zoom · ${title}`, 'info'));
        return;
      }
      // Downloads and feeds (`/api/…`, `/calendar/…`) are the browser's; a hash on this page scrolls as it does.
      if (!url.pathname.startsWith(LEARN_ROOT)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    },
    [input.sessions, join, navigate, toast],
  );

  return (
    <div data-lms-v3="" onClick={onClick} style={KEEP_TAP}>
      <div style={NO_TAP}>
        <AppShell
          shell={shell}
          current={currentOf(pathname)}
          hideNext={pathname === learnSchedule()}
          now={() => input.now}
          defaultCollapsed={collapsed}
          onCollapse={onCollapse}
        >
          {v3Page ? (
            children
          ) : (
            // Today's page, with today's frame tokens. The shell's icons are the package's sprite, which a v3 page
            // draws itself; under today's page the frame draws it (it draws nothing on its own).
            <>
              <IconSprite />
              <div data-r2-scope="" data-learner-v2="" data-lv-theme={theme} style={TODAY_TAP}>
                {children}
              </div>
            </>
          )}
        </AppShell>
      </div>
      {anchor ? (
        <div data-r2-scope="" data-learner-v2="" data-lv-theme={theme} style={anchor}>
          <Menu
            label={LABELS.account}
            items={menu}
            trigger={() => null}
            control={{
              open: account,
              onOpenChange: setAccount,
              anchor: () => document.querySelector<HTMLElement>(ACCOUNT),
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default V3Frame;
