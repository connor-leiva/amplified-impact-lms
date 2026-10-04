import { useEffect, useState } from 'react';
import { ZONES, autoZone, fmt, zoneAbbr, zoneLabel } from '@ai/core';
import { Icon } from '../components/Icon';
import { Popover } from '../components/primitives/Popover';
import { Segmented } from '../components/primitives/Segmented';
import { loadPrefs, savePrefs, type Prefs } from '../lib/prefs';
import s from './ProfileMenu.module.css';

// Ported from the `profileOpen` block of design-reference/Amplified Impact LMS.dc.html and its
// `tz` / `themes` / `pm` values in `renderVals()`. SCREENS § 2.3.
//
// The menu owns no business state: the caller resolves who "me" is and which session supplies the
// sample time, and every preference is read and written through src/lib/prefs.ts, which calls
// `setViewerZone` and dispatches `ai-prefs` so every rendered time updates at once.

/** The reference's `pm`: fixed offsets per sidebar mode. */
const AT = {
  full: { left: 10, bottom: 64 },
  rail: { left: 72, bottom: 12 },
  drawer: { left: 12, bottom: 76 },
} as const;

const THEMES = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
] as const satisfies readonly { value: NonNullable<Prefs['theme']>; label: string; icon: 'sun' | 'moon' }[];

export interface ProfileMenuProps {
  /**
   * The signed-in person, already resolved by the shell. `avatarColor` is the `avatarColor(id)`
   * string and `initials` is `fmt.initials(name)` — the menu renders them, it does not derive them.
   */
  me: { name: string; email: string; initials: string; avatarColor: string };
  /** The session whose start time the zone hint and the per-zone abbreviations are sampled from. */
  sampleStart: number;
  /** Which sidebar the menu hangs off, which is what positions it. */
  mode: 'full' | 'rail' | 'drawer';
  onClose: () => void;
  onSignOut: () => void;
}

/** Preferences, re-read on the `ai-prefs` event so a choice here takes effect immediately. */
function usePrefs(): Prefs {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  useEffect(() => {
    const onPrefs = () => setPrefs(loadPrefs());
    window.addEventListener('ai-prefs', onPrefs);
    return () => window.removeEventListener('ai-prefs', onPrefs);
  }, []);
  return prefs;
}

export function ProfileMenu({ me, sampleStart, mode, onClose, onSignOut }: ProfileMenuProps) {
  const prefs = usePrefs();
  const [tzOpen, setTzOpen] = useState(false);

  // The reference's `tz`, verbatim: a stored zone shows its own label, Auto shows the resolved one.
  const stored = prefs.tz || '';
  const auto = autoZone();
  const autoName = zoneLabel(auto) || auto;
  const label = stored ? zoneLabel(stored) : `Auto (${autoName})`;

  return (
    <>
      {/* The reference's click-catcher: the whole viewport, behind the panel, closes on click. */}
      <div className={s.catcher} onClick={onClose} />
      <Popover
        open
        onClose={onClose}
        // Not role="menu": the panel holds a radiogroup and a segmented control, so axe rightly
        // reports aria-required-children. The reference has the same violation (verified against
        // the prototype). A dialog is what this actually is, and nothing moves visually. DECISIONS D-011.
        role="dialog"
        label="Profile and settings"
        mode="fixed"
        at={AT[mode]}
        width="min(300px, calc(100vw - 24px))"
        pad={6}
        radius={12}
      >
        <div className={s.identity}>
          {/* Not <Avatar>: the caller hands over a resolved colour and initials, not an id. */}
          <span className={s.avatar} style={{ '--pm-av': me.avatarColor } as React.CSSProperties}>
            {me.initials}
          </span>
          <div className={s.who}>
            <div className={s.name}>{me.name}</div>
            <div className={s.email}>{me.email}</div>
          </div>
        </div>

        <div className={s.divider} />

        <div className={s.zone}>
          <div className={s.zoneRow}>
            <span className={s.zoneLabel}>
              {'Time Zone: '}
              <span className={s.zoneValue}>{label}</span>
            </span>
            <button type="button" className={s.link} onClick={() => setTzOpen((v) => !v)}>
              {tzOpen ? 'Done' : 'Change'}
            </button>
          </div>

          {tzOpen && (
            <div role="radiogroup" aria-label="Time zone" className={s.picker}>
              {ZONES.map(([z, name]) => {
                const on = stored === z;
                return (
                  <button
                    key={z || 'auto'}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-on={on ? 'true' : undefined}
                    className={s.option}
                    onClick={() => savePrefs({ tz: z || null })}
                  >
                    <span className={s.ring}>
                      <span className={s.dot} />
                    </span>
                    {z ? `${name} · ${zoneAbbr(z, sampleStart)}` : `Auto · ${autoName}`}
                  </button>
                );
              })}
            </div>
          )}

          <div className={s.hint}>{`Session Times Show as ${fmt.time(sampleStart)}`}</div>
        </div>

        <div className={s.theme}>
          <span className={s.themeLabel}>Theme</span>
          <Segmented
            options={THEMES}
            value={prefs.theme ?? 'light'}
            onChange={(theme) => savePrefs({ theme })}
            label="Theme"
            height={26}
            pad={10}
            radius={6}
            iconSize={13}
            iconStrokeWidth={1.9}
          />
        </div>

        <div className={s.divider} />

        <button type="button" className={s.signOut} onClick={onSignOut}>
          <Icon name="logout" size={15} strokeWidth={1.8} />
          Sign Out
        </button>
      </Popover>
    </>
  );
}
