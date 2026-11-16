import s from './StatusToken.module.css';

// Ported from design-reference/Status Token.dc.html. The glyph paths and the pie arc maths are
// verbatim — a 16 viewBox set, distinct from the 24-grid ICONS used everywhere else.

export type TokenKind = 'access' | 'build' | 'runtime' | 'step' | 'custom';
export type TokenTone = 'success' | 'progress' | 'neutral' | 'attention' | 'locked' | 'accent' | 'live';
export type TokenGlyph = 'check' | 'ring' | 'pie' | 'lock' | 'signal' | 'pause' | 'alert' | 'minus' | 'clock' | 'dot' | 'info';
export type TokenSize = 'sm' | 'md';

export interface StatusTokenProps {
  kind?: TokenKind;
  state?: string;
  n?: number;
  total?: number;
  compact?: boolean;
  size?: TokenSize;
  label?: string;
  tone?: TokenTone | '';
  icon?: TokenGlyph | '';
  title?: string;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

const O = 'M8 1.75a6.25 6.25 0 1 0 0 12.5a6.25 6.25 0 1 0 0-12.5';

/** The filled wedge for `n of total`. Copied from the reference, including the large-arc flag. */
function pie(n: number, total: number): string {
  if (n >= total) return 'M8 4.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 1 0 0-7.2';
  const a = (2 * Math.PI * n) / total;
  const x = (8 + 3.6 * Math.sin(a)).toFixed(2);
  const y = (8 - 3.6 * Math.cos(a)).toFixed(2);
  return n ? `M8 8L8 4.4A3.6 3.6 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}Z` : '';
}

/** [strokePath, fillPath] per glyph. */
function glyphPaths(icon: TokenGlyph, n: number, total: number): [string, string] {
  const IC: Record<string, [string, string]> = {
    check: [O + 'M5.4 8.3l1.8 1.8 3.5-3.7', ''],
    ring: [O, ''],
    pie: [O, pie(n, total)],
    lock: ['M4.5 7.5h7a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM5.75 7.5V5.6a2.25 2.25 0 0 1 4.5 0v1.9', ''],
    signal: ['M4.3 4.3a5.2 5.2 0 0 0 0 7.4M11.7 4.3a5.2 5.2 0 0 1 0 7.4', 'M8 5.8a2.2 2.2 0 1 0 0 4.4a2.2 2.2 0 1 0 0-4.4'],
    pause: [O + 'M6.6 5.9v4.2M9.4 5.9v4.2', ''],
    alert: ['M8 2.2l6.2 11H1.8zM8 6.4v3.1', 'M8 10.5a.85.85 0 1 0 0 1.7a.85.85 0 1 0 0-1.7'],
    minus: [O + 'M5.5 8h5', ''],
    clock: [O + 'M8 4.9V8l2.1 1.4', ''],
    dot: ['', 'M8 4.8a3.2 3.2 0 1 0 0 6.4a3.2 3.2 0 1 0 0-6.4'],
    info: [O + 'M8 7.4v3.6', 'M8 4.6a.85.85 0 1 0 0 1.7a.85.85 0 1 0 0-1.7'],
  };
  return IC[icon] ?? IC.dot!;
}

interface Resolved {
  tone: TokenTone;
  icon: TokenGlyph;
  label: string;
  short: string;
  tip: string;
}

/** kind + state -> label, short label, tone, glyph and tooltip. SCREENS § 5.1. */
export function resolveToken(p: StatusTokenProps): Resolved {
  const kind = p.kind ?? 'custom';
  const state = p.state ?? '';
  const n = Number(p.n) || 0;
  const total = Number(p.total) || 6;

  let tone: TokenTone = 'neutral';
  let icon: TokenGlyph = 'ring';
  let label = '';
  let short = '';
  let tip = '';

  if (kind === 'access') {
    if (state === 'locked') {
      tone = 'locked';
      icon = 'lock';
      label = short = 'Team Tier';
      tip = 'Included in Team tier';
    } else {
      tone = 'neutral';
      icon = 'check';
      label = short = 'Included';
      tip = 'Included in your tier';
    }
  } else if (kind === 'build') {
    if (state === 'verified') {
      tone = 'success';
      icon = 'check';
      label = short = 'Built';
      tip = `Built · all ${total} steps verified`;
    } else if (state === 'in_progress') {
      tone = 'progress';
      icon = 'pie';
      label = `${n} of ${total} Steps`;
      short = `${n}/${total}`;
      tip = `In progress · ${n} of ${total} steps verified`;
    } else {
      tone = 'neutral';
      icon = 'ring';
      label = 'Not Started';
      short = `0/${total}`;
      tip = `Not started · 0 of ${total} steps verified`;
    }
  } else if (kind === 'runtime') {
    const R: Record<string, [TokenTone, TokenGlyph, string]> = {
      deployed: ['success', 'signal', 'Deployed'],
      paused: ['neutral', 'pause', 'Paused'],
      needs_attention: ['attention', 'alert', 'Needs Attention'],
      not_deployed: ['neutral', 'minus', 'Not Deployed'],
    };
    [tone, icon, label] = R[state] ?? R.not_deployed!;
    short = label;
    tip = label;
  } else if (kind === 'step') {
    if (state === 'verified') {
      tone = 'success';
      icon = 'check';
      label = short = 'Verified';
    } else {
      tone = 'neutral';
      icon = 'ring';
      label = short = 'Not Verified';
    }
    tip = label;
  } else {
    tone = (p.tone as TokenTone) || 'neutral';
    icon = (p.icon as TokenGlyph) || 'dot';
    label = short = p.label ?? '';
    tip = p.label ?? '';
  }

  // An explicit label or tone overrides the resolved one, except for `custom` which already used them.
  if (p.label && kind !== 'custom') label = p.label;
  if (p.tone && kind !== 'custom') tone = p.tone as TokenTone;

  return { tone, icon, label, short, tip };
}

export function StatusToken(props: StatusTokenProps) {
  const { kind = 'custom', n = 0, total = 6, compact = false, size = 'sm', force = '' } = props;
  const { tone, icon, label, short, tip } = resolveToken(props);
  const title = props.title || tip;

  if (force === 'loading') {
    const skW = compact ? 36 : size === 'md' ? 96 : 76;
    const h = compact ? 16 : size === 'md' ? 26 : 22;
    return <span aria-hidden="true" className={s.skeleton} data-phone="token" style={{ width: skW, height: h }} />;
  }

  const [sp, fp] = glyphPaths(icon, n, total);
  const text = compact ? short : label;

  return (
    <span
      className={s.pill}
      data-phone="token"
      data-tone={tone}
      data-size={size}
      data-compact={compact ? 'true' : undefined}
      data-kind={kind}
      title={title || undefined}
    >
      {tone === 'live' ? (
        <span aria-hidden="true" className={s.pulse} />
      ) : (
        <svg viewBox="0 0 16 16" aria-hidden="true" className={s.glyph}>
          <path d={sp} className={s.stroke} />
          <path d={fp} className={s.fill} />
        </svg>
      )}
      <span>{text}</span>
    </span>
  );
}
