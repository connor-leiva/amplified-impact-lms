import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * The Built moment. Fires once when an AI Employee becomes Built: 110 pieces in the five brand
 * colours, 1.5-2.6s, pointer-events none, aria-hidden.
 *
 * Ported from the shell's `confettiEl`, including its seeded PRNG — the burst is deterministic for
 * a given seed, which keeps it out of the way of pixel comparison. Skipped entirely when the
 * viewer prefers reduced motion (DESIGN.md › Motion).
 */

const COLORS = [
  'var(--action-primary)',
  'var(--status-success)',
  'var(--access-locked)',
  'var(--status-progress)',
  'var(--ink-300)',
];

interface ConfettiApi {
  celebrate: () => void;
}
const Ctx = createContext<ConfettiApi>({ celebrate: () => {} });
export const useConfetti = () => useContext(Ctx);

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export function ConfettiProvider({ children }: { children: ReactNode }) {
  const [burst, setBurst] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const celebrate = useCallback(() => {
    if (prefersReducedMotion()) return;
    clearTimeout(timer.current);
    setBurst(Date.now());
    timer.current = setTimeout(() => setBurst(0), 2800);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const api = useMemo(() => ({ celebrate }), [celebrate]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {burst ? <Burst seed={burst} /> : null}
    </Ctx.Provider>
  );
}

function Burst({ seed }: { seed: number }) {
  const pieces = useMemo(() => {
    let s = seed % 9973;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    return Array.from({ length: 110 }, (_, i) => ({
      key: i,
      left: `${38 + rnd() * 24}%`,
      width: `${5 + rnd() * 6}px`,
      height: `${3 + rnd() * 5}px`,
      background: COLORS[i % COLORS.length]!,
      borderRadius: rnd() > 0.7 ? '50%' : '1px',
      dx: `${(rnd() - 0.5) * 90}vw`,
      dy: `${-(35 + rnd() * 50)}vh`,
      r: `${(rnd() - 0.5) * 1440}deg`,
      animation: `ai-confetti ${1500 + rnd() * 1100}ms cubic-bezier(.15,.6,.35,1) ${Math.round(rnd() * 140)}ms forwards`,
    }));
  }, [seed]);

  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 85, overflow: 'hidden' }}>
      {pieces.map((p) => (
        <span
          key={p.key}
          style={
            {
              position: 'absolute',
              left: p.left,
              bottom: '70px',
              width: p.width,
              height: p.height,
              background: p.background,
              borderRadius: p.borderRadius,
              animation: p.animation,
              opacity: 0,
              '--dx': p.dx,
              '--dy': p.dy,
              '--r': p.r,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
