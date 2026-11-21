// D-225: the mockup's own control heights on these surfaces (D-210 item 4's exemption, extended). The app's global
// `styles/lms.css` gives every button and field a phone floor through `--tap` (44px, 48px for the primary) on `:root`.
// Neither stylesheet changes: around the package's markup `--tap` is `auto` (the initial value of `min-width` and
// `min-height`; a 0 would let a flex item shrink), and today's pages under the shell get the page's value back.
// A module of its own, with no stylesheet, so a route can use it without loading the frame's.
import type { CSSProperties } from 'react';

export const KEEP_TAP = { '--v3-tap': 'var(--tap)', '--v3-tap-primary': 'var(--tap-primary)' } as CSSProperties;
export const NO_TAP = { '--tap': 'auto', '--tap-primary': 'auto' } as CSSProperties;
export const TODAY_TAP = { '--tap': 'var(--v3-tap)', '--tap-primary': 'var(--v3-tap-primary)' } as CSSProperties;
