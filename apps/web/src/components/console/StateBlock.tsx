import { Link } from 'react-router';
import { Icon } from '../Icon';
import { Button } from '../primitives/Button';
import { Skeleton } from '../primitives/Skeleton';
import { StatusBadge } from './StatusBadge';
import type { FullStateCopy, ErrorCopy } from '../../routes/console/console.vm';
import { LOADING_LABEL } from '../../routes/console/console.vm';
import s from './StateBlock.module.css';

// The Console's shared states (D-157, spec § 7). Words come from `routes/console/console.vm.ts`.
//
//   loading   a skeleton the height of a short list, busy for assistive technology
//   empty     one sentence and one action
//   error     `role="alert"`, the failure in words (a 429 says "Too many requests") and Retry
//   full      Denied and the Console 404: a page of its own with its h1 and one way out

export function LoadingBlock({ rows = 5 }: { rows?: number }) {
  return (
    <div className={s.card} role="status" aria-busy="true" aria-label={LOADING_LABEL}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={16} radius={6} width={`${92 - i * 11}%`} />
      ))}
    </div>
  );
}

export function EmptyBlock({ message, action }: { message: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className={s.card}>
      <p className={s.sentence}>{message}</p>
      {action ? <Button onClick={action.onClick}>{action.label}</Button> : null}
    </div>
  );
}

export function ErrorBlock({ copy, onRetry }: { copy: ErrorCopy; onRetry: () => void }) {
  return (
    <div className={s.card} role="alert">
      <StatusBadge label={copy.badge} tone="attention" icon="alert" />
      <div className={s.words}>
        <h2 className={s.h2}>{copy.title}</h2>
        <p className={s.body}>{copy.body}</p>
      </div>
      <Button onClick={onRetry}>{copy.retry}</Button>
    </div>
  );
}

export function FullState({ copy, kind }: { copy: FullStateCopy; kind: 'denied' | 'notFound' }) {
  return (
    <div className={s.page} data-console-state={kind}>
      <div className={s.words}>
        {kind === 'denied' ? (
          <span className={s.eyebrow}>
            <Icon name="lock" size={18} strokeWidth={1.8} />
            {copy.eyebrow}
          </span>
        ) : (
          <span className={`${s.eyebrow} ${s.mono}`}>{copy.eyebrow}</span>
        )}
        <h1 className={s.h1}>{copy.title}</h1>
        <p className={s.body}>{copy.body}</p>
      </div>
      <div className={s.actions}>
        <Link className={s.primary} to={copy.action.to}>
          {copy.action.label}
        </Link>
      </div>
    </div>
  );
}
