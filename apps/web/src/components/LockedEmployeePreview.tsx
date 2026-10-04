import { Icon } from './Icon';
import { StatusToken } from './StatusToken';
import s from './LockedEmployeePreview.module.css';

// Ported from design-reference/Locked Employee Preview.dc.html (SCREENS § 5.7).
//
// The modal every locked entry point opens. It sells the Team tier by showing what the locked AI
// Employee produces; the tabs move between all of them without closing. It renders only what the
// caller resolved — it never decides what is locked.

export interface LockedItem {
  id: string;
  /** The tab label. Falls back to `name` when empty. */
  short: string;
  name: string;
  headline: string;
  outputs: string[];
  /** A resolved 24-grid SVG path, supplied by the caller from the employee's icon. */
  icon: string;
  sessLine: string;
}

export interface LockedEmployeePreviewProps {
  items: LockedItem[];
  index: number;
  onIndex?: (i: number) => void;
  onClose?: () => void;
  onCta?: (item: LockedItem) => void;
  /**
   * Renders a forced state statically, for the /__states contract sheet. The reference gives this
   * component hover and focus affordances only, so `disabled` and `loading` have no visual.
   */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

const EMPTY: LockedItem = { id: '', short: '', name: '', headline: '', outputs: [], icon: '', sessLine: '' };

export function LockedEmployeePreview({
  items,
  index,
  onIndex,
  onClose,
  onCta,
  force = '',
}: LockedEmployeePreviewProps) {
  // The reference's clamp, verbatim: a bad index lands on the first or the last tab, never off the end.
  const i = Math.min(Math.max(0, Number(index) || 0), Math.max(0, items.length - 1));
  const item = items[i] ?? EMPTY;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      className={s.root}
      data-force={force || undefined}
    >
      <div className={s.top}>
        <div role="tablist" className={s.track}>
          {items.map((x, k) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={k === i}
              className={s.tab}
              data-selected={k === i ? 'true' : undefined}
              onClick={() => onIndex?.(k)}
            >
              {x.short || x.name}
            </button>
          ))}
        </div>
        <button type="button" className={s.close} aria-label="Close" onClick={() => onClose?.()}>
          <Icon name="x" size={16} strokeWidth={2} />
        </button>
      </div>

      <div className={s.body}>
        <div className={s.head}>
          <div className={s.tile}>
            {/* `item.icon` is a path the caller resolved, not an ICONS name, so it cannot go
                through <Icon>. It is the one place a 24-grid path is rendered directly. */}
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" className={s.glyph}>
              <path d={item.icon} />
            </svg>
          </div>
          <StatusToken kind="access" state="locked" label="Included in Team tier" />
        </div>

        <div className={s.copy}>
          <div className={s.headline}>{item.headline}</div>
          <div className={s.sub}>
            {item.name} · {item.sessLine}
          </div>
        </div>

        <div className={s.outputs}>
          {item.outputs.map((o) => (
            <div key={o} className={s.output}>
              <Icon name="check" size={16} strokeWidth={2.2} className={s.check} />
              {o}
            </div>
          ))}
        </div>
      </div>

      <div className={s.footer}>
        <span className={s.note}>Your Agent tier progress carries over.</span>
        <button type="button" className={s.cta} onClick={() => onCta?.(item)}>
          See Team Tier
          <Icon name="arrowR" size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
