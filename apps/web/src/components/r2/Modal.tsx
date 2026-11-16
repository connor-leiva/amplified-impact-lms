import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../Icon';
import { Button } from './Button';
import s from './Modal.module.css';

// The R2 modal and confirm (D-160 R2-2): the mockup's `Modal` (a 480px dialog on a scrim, a head with
// its title and Close, a body and a footer of actions) and `Confirm` (a question, a sentence, Cancel
// and the action). Escape and a click on the scrim close it, unless `lock`; focus moves into the
// dialog when it opens and back to where it was when it closes.

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
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const was = document.activeElement as HTMLElement | null;
    // A field first (the mockup autofocuses the title), else the first button.
    const q = (sel: string) => box.current?.querySelector<HTMLElement>(sel) ?? null;
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
  return (
    <div
      className={s.scrim}
      onMouseDown={(e) => {
        if (!lock && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { maxWidth: width } : undefined}
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
  onConfirm: () => void;
  onClose: () => void;
}

export function Confirm({ title, body, cta, danger, onConfirm, onClose }: ConfirmProps) {
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
    </Modal>
  );
}
