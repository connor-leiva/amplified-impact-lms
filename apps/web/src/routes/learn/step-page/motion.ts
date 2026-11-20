// Reduced motion follows the brand: the OS setting, or .aim-reduced on any ancestor (isReducedMotion in ai-motion.tsx).
import { isReducedMotion } from '@brand/ai-motion';

export const reduceMotion = () => isReducedMotion();
export const scrollBehavior = (): ScrollBehavior => (reduceMotion() ? 'auto' : 'smooth');
/** 0:00 style clock, as the mockup prints chapter and cue times. */
export const clock = (t: number) => { t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
/** Two animation frames: lets the browser paint a "before" state so a transition runs. */
export const afterPaint = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn));
/** The rise-in for content arriving in order (brand .aim-rise): className and style for block i. */
export const rise = (i: number) => ({ className: 'aim-rise', style: { '--i': i } });
