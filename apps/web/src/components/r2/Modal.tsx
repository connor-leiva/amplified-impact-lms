import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import clsx from 'clsx';
import { Icon } from '../Icon';
import { Button } from './Button';
import { k } from './kit';
import s from './Modal.module.css';

// The R2 modal and confirm (D-160 R2-2): the mockup's `Modal` (a 480px dialog on a scrim, a head with
// its title and Close, a body and a footer of actions) and `Confirm` (a question, a sentence, Cancel
// and the action). Escape and a click on the scrim close it, unless `lock`; focus moves into the
// dialog when it opens and back to where it was when it closes. R2-1c part 2: Tab and Shift+Tab stay
// inside (`useDialog`, which the ⌘K palette shares), the mockup's `scrim top0` (`.top`) for the
// palette, and `Confirm`'s `audited`, the mockup's "This action is audit-logged." for an action that
// writes an audit row.

/** The dialog's own styles, for a dialog the mockup builds from them directly (the ⌘K palette). */
export { s as modalStyles };

const TABBABLE = 'button, [href], input, select, textarea, [tabindex]';

/**
 * A modal dialog's focus and keys: focus moves in when it opens (a field first, as the mockup
 * autofocuses one, else the first button) and back to where it was when it closes; Escape closes it
 * unless `lock`; Tab and Shift+Tab wrap inside it. Put `ref` and `onKeyDown` on the `[role="dialog"]`.
 */
export function useDialog(onClose: () => void, lock?: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const was = document.activeElement as HTMLElement | null;
    const q = (sel: string) => ref.current?.querySelector<HTMLElement>(sel) ?? null;
    (q('[autofocus]') ?? q('input, textarea, select') ?? q('button'))?.focus();
    return () => was?.focus?.();
  }, []);
  useEffect(() => {
    if (lock) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lock, onClose]);
  const onKeyDown = useCallback((e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab' || !ref.current) return;
    const list = Array.from(ref.current.querySelectorAll<HTMLElement>(TABBABLE)).filter(
      (el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled,
    );
    const first = list[0];
    const last = list.at(-1);
    if (!first || !last) return;
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  }, []);
  return { ref, onKeyDown };
}

export interface ModalProps {
  title: string;
  children: ReactNode;
  foot?: ReactNode;
  onClose: () => void;
  /** Must be answered: no Close, no Escape, no scrim click. */
  lock?: boolean;
  /** Max width, when not 480px. */
  width?: number;
}

export function Modal({ title, children, foot, onClose, lock, width }: ModalProps) {
  const { ref, onKeyDown } = useDialog(onClose, lock);
  return (
    <div
      className={s.scrim}
      onMouseDown={(e) => {
        if (!lock && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { maxWidth: width } : undefined}
        onKeyDown={onKeyDown}
      >
        <div className={s.mh}>
          <h2 className={s.title}>{title}</h2>
          {!lock ? (
            <button type="button" className={s.close} aria-label="Close" onClick={onClose}>
              <Icon name="r2X" size={16} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
        <div className={s.mb}>{children}</div>
        {foot ? <div className={s.mf}>{foot}</div> : null}
      </div>
    </div>
  );
}

export interface ConfirmProps {
  title: string;
  body: string;
  cta: string;
  danger?: boolean;
  /** The action writes an audit row: end with the mockup's "This action is audit-logged.". */
  audited?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const AUDITED = 'This action is audit-logged.';

export function Confirm({ title, body, cta, danger, audited, onConfirm, onClose }: ConfirmProps) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      foot={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            kind={danger ? 'primary-danger' : 'primary'}
            onClick={() => {
              onClose();
              onConfirm();
            }}
          >
            {cta}
          </Button>
        </>
      }
    >
      <p className={s.body}>{body}</p>
      {audited ? <p className={clsx(k.p, k.me)}>{AUDITED}</p> : null}
    </Modal>
  );
}
