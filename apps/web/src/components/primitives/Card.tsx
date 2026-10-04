import clsx from 'clsx';
import s from './Card.module.css';

// SCREENS § 1.2. The section wrapper every screen builds from:
//
//   radius 14 · 1px solid --line-default · --bg-surface · flex column
//   padding  default 18px 20px · aside 16px · list 16px 10px 10px · none
//   title    h2 16/600, or 14/600 on an aside card
//
// The reference's admin cards (Overview, Team Hub, Announcements) use radius 12 for the same
// pattern, so `radius` is a prop. The column gap is 10, 12, 14 or 16 per card, so it is a prop too
// and rides inline as a custom property.

export type CardPad = 'default' | 'aside' | 'list' | 'none';

export interface CardProps {
  children?: React.ReactNode;
  /** The section title. Renders an h2 in a title row. */
  title?: React.ReactNode;
  /** Trailing content on the title row: a caption or an action. */
  titleAside?: React.ReactNode;
  /** Padding preset. SCREENS § 1.2. */
  pad?: CardPad;
  /** Corner radius in px. */
  radius?: 12 | 14;
  /** Gap between the title row and the body, in px. */
  gap?: number;
  /** Gap inside the title row, in px. */
  titleGap?: number;
  id?: string;
  titleId?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({
  children,
  title,
  titleAside,
  pad = 'default',
  radius = 14,
  gap = 14,
  titleGap = 12,
  id,
  titleId,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  style,
}: CardProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      data-pad={pad}
      data-radius={radius}
      className={clsx(s.card, className)}
      style={
        {
          '--card-gap': `${gap}px`,
          '--card-title-gap': `${titleGap}px`,
          ...style,
        } as React.CSSProperties
      }
    >
      {title !== undefined && (
        <div className={s.titleRow}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          {titleAside}
        </div>
      )}
      {children}
    </section>
  );
}
