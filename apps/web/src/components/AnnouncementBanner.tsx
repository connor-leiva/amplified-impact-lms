import { Icon } from './Icon';
import s from './AnnouncementBanner.module.css';

// Ported from design-reference/Announcement Banner.dc.html (SCREENS § 5.6).
//
// Warning is an `alert` (it interrupts: a session moved), info is a `status` (it can wait).
// The icon, the surface and the line all change with the severity, but the text never carries the
// meaning through colour alone — the glyph and the copy do.

export type BannerSeverity = 'info' | 'warning';

export interface AnnouncementBannerProps {
  severity: BannerSeverity;
  title: string;
  body?: string;
  when: string;
  /** The absolute timestamp, shown as the tooltip on the relative `when`. */
  abs?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** The dismiss button exists only when there is somewhere to record the dismissal. */
  onDismiss?: () => void;
  /**
   * Renders a forced state statically, for the /__states contract sheet. The reference gives this
   * component hover and focus affordances only, so `disabled` and `loading` have no visual.
   */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function AnnouncementBanner({
  severity,
  title,
  body = '',
  when,
  abs = '',
  actionLabel = '',
  onAction,
  onDismiss,
  force = '',
}: AnnouncementBannerProps) {
  const warn = severity === 'warning';

  return (
    <div
      role={warn ? 'alert' : 'status'}
      className={s.root}
      data-severity={severity}
      data-force={force || undefined}
    >
      <Icon name={warn ? 'alert' : 'megaphone'} size={17} strokeWidth={1.8} className={s.icon} />
      <div className={s.mid}>
        <span className={s.title}>{title}</span>
        <span className={s.when} title={abs}>
          {when}
        </span>
        {body ? <div className={s.body}>{body}</div> : null}
      </div>
      {actionLabel ? (
        <button type="button" className={s.action} onClick={() => onAction?.()}>
          {actionLabel}
        </button>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          className={s.dismiss}
          aria-label="Dismiss"
          title="Dismiss"
          onClick={() => onDismiss()}
        >
          <Icon name="x" size={15} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
