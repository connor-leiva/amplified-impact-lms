import { Icon } from './Icon';
import s from './JoinButton.module.css';

// Ported from design-reference/Join Button.dc.html.
//
// This is the ONLY element anywhere that links to Zoom (SCREENS § 5.3). `onJoin` resolves the URL
// at click time, so from phase 08 the server can withhold it until the join window opens and the
// URL is never in the DOM beforehand.

export type JoinMode = 'disabled' | 'ready' | 'live' | 'loading';

export interface JoinButtonProps {
  mode?: JoinMode;
  hint?: string;
  url?: string;
  size?: 'md' | 'lg';
  stack?: boolean;
  /** Renders the button on the video poster, where no surface token applies. */
  onDark?: boolean;
  onJoin?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function JoinButton({
  mode: modeProp,
  hint,
  url,
  size = 'md',
  stack = false,
  onDark = false,
  onJoin,
  force = '',
}: JoinButtonProps) {
  const mode: JoinMode = force === 'disabled' ? 'disabled' : force === 'loading' ? 'loading' : (modeProp ?? 'disabled');
  const off = mode === 'disabled';
  const busy = mode === 'loading';

  const label = busy ? 'Opening Zoom…' : mode === 'live' ? 'Join Now' : 'Join Session';
  const tip = off ? hint || 'Opens 15 Min Before' : url || '';
  const shownHint = off ? hint || '' : '';

  return (
    <div className={s.wrap} data-stack={stack ? 'true' : undefined}>
      <button
        type="button"
        className={s.btn}
        data-mode={mode}
        data-size={size}
        data-dark={onDark ? 'true' : undefined}
        data-force={force === 'hover' || force === 'focus' ? force : undefined}
        aria-disabled={off || busy ? 'true' : undefined}
        title={tip || undefined}
        onClick={(e) => {
          if (off || busy) return;
          onJoin?.(e);
        }}
      >
        {busy ? (
          <Icon name="spinner" size={16} strokeWidth={2.2} className={s.spin} />
        ) : (
          <Icon name="video" size={16} strokeWidth={1.9} />
        )}
        <span>{label}</span>
      </button>
      {shownHint ? <span className={s.hint}>{shownHint}</span> : null}
    </div>
  );
}
