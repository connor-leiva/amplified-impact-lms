import type { CardVM } from '@ai/core';
import { Icon } from './Icon';
import { StatusToken } from './StatusToken';
import s from './EmployeeCard.module.css';

// Ported from design-reference/Employee Card.dc.html. SCREENS § 5.5.
//
// The card renders `cardVM` and computes no business state: `card.cta`, `card.primary`,
// `card.segs`, `card.state` and `card.sessLine` all arrive resolved from @ai/core.

export interface EmployeeCardProps {
  card: CardVM;
  onOpen?: (card: CardVM) => void;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function EmployeeCard({ card, onOpen, force = '' }: EmployeeCardProps) {
  if (force === 'loading') {
    return (
      <div aria-hidden="true" className={s.skeleton}>
        <div className={s.skRow}>
          <span className={`${s.sk} ${s.skTile}`} />
          <span className={`${s.sk} ${s.skToken}`} />
        </div>
        <span className={`${s.sk} ${s.skName}`} />
        <span className={`${s.sk} ${s.skLineA}`} />
        <span className={`${s.sk} ${s.skLineB}`} />
        <span className={`${s.sk} ${s.skCta}`} />
      </div>
    );
  }

  const disabled = force === 'disabled';
  const built = card.state === 'verified';
  const primary = card.primary && !disabled;
  const showSegs = !card.locked && !card.soon;

  const open = () => {
    if (disabled) return;
    onOpen?.(card);
  };
  const click = (e: React.MouseEvent) => {
    e.stopPropagation();
    open();
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${card.name}. ${card.locked ? 'Team tier.' : ''} ${card.cta}`}
      aria-disabled={disabled ? 'true' : undefined}
      className={s.root}
      data-force={force || undefined}
      data-disabled={disabled ? 'true' : undefined}
      data-locked={card.locked ? 'true' : undefined}
      onClick={click}
      onKeyDown={key}
    >
      <div className={s.top}>
        <div className={s.tile} data-tone={card.locked ? 'locked' : built ? 'built' : 'default'}>
          {/* `card.icon` is the SVG path the view-model already resolved out of ICONS, not a name.
              This is the one place a raw path is legitimate: the VM supplies it. */}
          <svg viewBox="0 0 24 24" aria-hidden="true" className={s.tileGlyph}>
            <path d={card.icon} />
          </svg>
        </div>
        {card.locked ? (
          <StatusToken kind="access" state="locked" n={card.n} total={card.total} />
        ) : card.soon ? (
          <StatusToken kind="custom" tone="neutral" icon="clock" label={card.opensLabel} n={card.n} total={card.total} />
        ) : (
          <StatusToken kind="build" state={card.state} n={card.n} total={card.total} />
        )}
      </div>

      <div className={s.head}>
        <div className={s.name}>{card.name}</div>
        <div className={s.outcome}>{card.outcome}</div>
      </div>

      <div className={s.bottom}>
        {showSegs ? (
          <div
            className={s.segs}
            title={`${card.n} of ${card.total} steps verified`}
            data-built={built ? 'true' : undefined}
          >
            {card.segs.map((on, i) => (
              <span key={i} className={s.seg} data-on={on ? 'true' : undefined} />
            ))}
          </div>
        ) : null}
        <div className={s.meta}>
          <span>{card.sessLine}</span>
          <span>{card.mins} Min Build</span>
        </div>
        {/*
          The card itself is the control: role="button", and its aria-label already ends with this
          CTA text. The reference nests a real <button> here with tabIndex={-1}, which axe flags as
          `nested-interactive` — a negative tabindex does not hide a control from assistive
          technology, so a screen-reader user meets two controls for one action. A <span> renders
          identically, keeps one click target, and removes the violation. See DECISIONS.md D-009.
        */}
        <div className={s.ctaRow}>
          <span className={s.cta} data-variant={primary ? 'primary' : 'secondary'}>
            {card.cta}
            <Icon name="arrowR" size={13} strokeWidth={2} />
          </span>
        </div>
      </div>
    </div>
  );
}
