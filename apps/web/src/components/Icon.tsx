import { ICONS, type IconName } from '@ai/core';

export type { IconName };

/**
 * The only way icons are rendered. 24 viewBox, fill none, stroke currentColor, stroke-width 1.8,
 * round caps and joins. Never import an icon library (enforced by eslint + scripts/check-no-icon-libs.mjs).
 *
 * `filled` covers the two glyphs the reference fills instead of strokes: `play` (in buttons and on
 * the poster) and `pause`.
 */
export function Icon({
  name,
  size = 16,
  color = 'currentColor',
  strokeWidth = 1.8,
  filled = false,
  label,
  className,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        flex: 'none',
        fill: filled ? color : 'none',
        stroke: filled ? 'none' : color,
        strokeWidth: filled ? undefined : strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}
