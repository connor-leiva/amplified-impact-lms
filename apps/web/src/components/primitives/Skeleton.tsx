import clsx from 'clsx';
import s from './Skeleton.module.css';

// SCREENS § 1.9: `--bg-hover` with `ai-skeleton 1.4s ease-in-out infinite`, at the same height as
// the content it replaces. Width, height and radius are per instance, so they are set as CSS
// custom properties inline rather than enumerated in the stylesheet.
//
// Reference sizes, for call sites: Employee Card uses 38x38/r10, 70x22/r999, 70%x14/r6, 95%x10/r6,
// 80%x10/r6 and 120x34/r8; Nav Item uses 16x16/r5 and flex-1 x10/r5.

export interface SkeletonProps {
  /** Any CSS length. A number is px. */
  width?: number | string;
  /** Any CSS length. A number is px. */
  height?: number | string;
  /** Corner radius in px. */
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
}

const len = (v: number | string | undefined, fallback: string) =>
  v === undefined ? fallback : typeof v === 'number' ? `${v}px` : v;

export function Skeleton({ width, height, radius = 6, className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx(s.sk, className)}
      style={
        {
          '--sk-w': len(width, '100%'),
          '--sk-h': len(height, '10px'),
          '--sk-r': `${radius}px`,
          ...style,
        } as React.CSSProperties
      }
    />
  );
}
