import clsx from 'clsx';
import { avatarColor, fmt } from '@ai/core';
import s from './Avatar.module.css';

// SCREENS § 1.9. A circle filled with `avatarColor(id)` — a 7-hue oklch palette from @ai/core —
// with the initials in `--ink-900` at 600.
//
//   22 inline · 30 table · 32 sidebar · 34 aside · 36 menu · 40 drawer
//   font-size 12 up to 34, 13 at 36, 14 at 40 (the reference's values)
//
// An invited person has no colour yet: transparent fill with a 1.5px dashed --access-locked border.
//
// `avatarColor` returns an `oklch(…)` string, which is per-instance data, so it is set inline as a
// custom property. It must never be hard-coded in the stylesheet.

export interface AvatarProps {
  /** The person's id. Hashed by `avatarColor` into the fill. */
  id: string;
  /** The person's full name. `fmt.initials` reduces it to one or two letters. */
  name: string | null | undefined;
  /** Diameter in px. The reference uses 22, 30, 32, 34, 36 and 40. */
  size?: number;
  /** An invited person: transparent fill, dashed --access-locked border. */
  invited?: boolean;
  title?: string;
  className?: string;
}

export function Avatar({ id, name, size = 32, invited = false, title, className }: AvatarProps) {
  return (
    <span
      title={title}
      data-size={size}
      data-invited={invited ? 'true' : undefined}
      className={clsx(s.avatar, className)}
      style={
        {
          '--av-size': `${size}px`,
          '--av-fill': avatarColor(id),
        } as React.CSSProperties
      }
    >
      {fmt.initials(name)}
    </span>
  );
}
