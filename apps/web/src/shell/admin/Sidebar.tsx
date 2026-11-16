import type { Ref } from 'react';
import { Icon } from '../../components/Icon';
import { Menu } from '../../components/r2/Menu';
import { initials } from '../../data/admin-shell';
import type { AdminShellData } from '../../data/admin-shell';
import type { AdminNavGroup, R2Group } from './adminNav';
import { Wordmark } from './Wordmark';
import s from './AdminShell.module.css';

// The admin sidebar (D-160 R2-1b, BUILD-SPEC § 4): the mockup's `Sidebar`, in its three forms.
//   full    244px: the wordmark, the cohort switcher, the groups (each folds), the rail toggle, the
//           signed-in staff member.
//   rail    64px (768–1199px by default): the wordmark's first glyph, the switcher's tile, one icon
//           per group with a flyout of its pages, the toggle, the avatar.
//   drawer  the phone's 300px drawer: the full sidebar with a Close button and no toggle.

export type SidebarMode = 'full' | 'rail' | 'drawer';

export interface SidebarProps {
  mode: SidebarMode;
  data: AdminShellData;
  groups: readonly AdminNavGroup[];
  go: (to: string) => void;
  onToggleGroup: (group: R2Group, active: boolean) => void;
  onToggleRail: () => void;
  onProfile: () => void;
  profileOpen: boolean;
  onClose?: () => void;
  closeRef?: Ref<HTMLButtonElement>;
}

export function Sidebar({
  mode,
  data,
  groups,
  go,
  onToggleGroup,
  onToggleRail,
  onProfile,
  profileOpen,
  onClose,
  closeRef,
}: SidebarProps) {
  const rail = mode === 'rail';
  const switcherName = `${data.program} · ${data.cohort}`;

  return (
    <aside aria-label="Primary" className={s.sidebar} data-mode={mode}>
      <div className={s.top}>
        <Wordmark short={rail} />
        {mode === 'drawer' ? (
          <>
            <span className={s.spacer} />
            <button ref={closeRef} type="button" className={s.iconButton} aria-label="Close menu" onClick={onClose}>
              <Icon name="r2X" size={20} strokeWidth={1.75} />
            </button>
          </>
        ) : null}
      </div>

      <Menu
        label="Cohorts"
        placement="below-left"
        items={[
          { label: data.cohort, checked: true, onSelect: () => {} },
          'separator',
          { label: 'All cohorts', onSelect: () => go('/admin/cohorts') },
        ]}
        trigger={(t) => (
          <button
            type="button"
            className={s.switcher}
            aria-label={`Switch cohort. ${data.program}, ${data.cohort}`}
            title={rail ? switcherName : undefined}
            onClick={t.toggle}
            {...t.props}
          >
            <span className={s.tile}>{initials(data.program)}</span>
            {rail ? null : (
              <>
                <span className={s.switcherText}>
                  <span className={`${s.program} ${s.ellipsis}`}>{data.program}</span>
                  <span className={`${s.cohort} ${s.ellipsis}`}>{data.cohort}</span>
                </span>
                <span className={s.muted}>
                  <Icon name="r2Updown" size={14} strokeWidth={1.75} />
                </span>
              </>
            )}
          </button>
        )}
      />

      <nav className={s.nav} aria-label="Admin">
        {groups.map((g) =>
          rail ? (
            <Menu
              key={g.label}
              label={g.label}
              placement="right"
              className={s.railMenu}
              items={g.rows.map((r) => ({ label: r.label, icon: r.icon, checked: r.active, onSelect: () => go(r.to) }))}
              trigger={(t) => (
                <button
                  type="button"
                  className={s.row}
                  data-on={g.active ? 'true' : undefined}
                  title={g.label}
                  aria-label={`${g.label} menu`}
                  onClick={t.toggle}
                  {...t.props}
                >
                  <Icon name={g.icon} size={16} strokeWidth={1.75} />
                </button>
              )}
            />
          ) : (
            <div key={g.label}>
              <button
                type="button"
                className={s.groupHead}
                aria-expanded={g.open}
                onClick={() => onToggleGroup(g.label, g.active)}
              >
                <Icon name="r2Chev" size={12} strokeWidth={2.2} />
                {g.label}
                {g.alert ? <span className={s.alert}>{g.alert}</span> : null}
              </button>
              {g.open
                ? g.rows.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={s.row}
                      data-on={r.active ? 'true' : undefined}
                      aria-current={r.active ? 'page' : undefined}
                      onClick={() => go(r.to)}
                    >
                      <Icon name={r.icon} size={16} strokeWidth={1.75} />
                      <span className={s.ellipsis}>{r.label}</span>
                      {r.badge ? <span className={s.count}>{r.badge}</span> : null}
                    </button>
                  ))
                : null}
            </div>
          ),
        )}
      </nav>

      <div className={s.footer}>
        {mode === 'drawer' ? null : (
          <button
            type="button"
            className={s.row}
            title={rail ? 'Expand sidebar' : undefined}
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={onToggleRail}
          >
            <Icon name="r2Panel" size={16} strokeWidth={1.75} />
            {rail ? null : 'Collapse sidebar'}
          </button>
        )}
        <button
          type="button"
          className={s.user}
          title={rail ? `${data.viewer.name} · ${data.viewer.role}` : undefined}
          aria-label={`${data.viewer.name}, ${data.viewer.role}. Profile and settings`}
          aria-haspopup="dialog"
          aria-expanded={profileOpen}
          onClick={onProfile}
        >
          <span className={s.avatar}>{initials(data.viewer.name)}</span>
          {rail ? null : (
            <span className={s.who}>
              <span className={s.name}>{data.viewer.name}</span>
              <span className={s.role}>{data.viewer.role}</span>
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
