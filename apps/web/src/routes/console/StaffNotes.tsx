// Staff notes on a workspace or a user (D-158, spec § 7.3): internal, immutable, newest first. Any
// Console role writes one; only the Owner deletes, with a reason, as a soft delete. Markup only: every
// word comes from StaffNotes.vm.ts.

import { useCallback, useEffect, useId, useState } from 'react';
import type { StaffNote, StaffNoteTarget } from '@ai/core';
import { ConfirmDialog } from '../../components/console/ConfirmDialog';
import { ErrorBlock, LoadingBlock } from '../../components/console/StateBlock';
import { Button } from '../../components/primitives/Button';
import { useToaster } from '../../components/primitives/Toaster';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { errorCopy } from './console.vm';
import { RECORD_COPY } from './records.vm';
import { NOTES_COPY, canDeleteNotes, canSaveNote, canWriteNotes, noteVM, notesFailure, reasonReady } from './StaffNotes.vm';
import s from './records.module.css';

type State = { kind: 'loading' } | { kind: 'error'; failure: ConsoleFailure } | { kind: 'ready'; notes: StaffNote[] };

const failureOf = (e: unknown): ConsoleFailure => (e instanceof ConsoleError ? e.kind : 'failed');
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : '');

export function StaffNotes({ api, role, targetType, targetId, internal }: { api: ConsoleApi; role: string; targetType: StaffNoteTarget; targetId: string; internal: string }) {
  const { toast } = useToaster();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<StaffNote | null>(null);
  const [busy, setBusy] = useState(false);
  const fieldId = useId();
  const countId = useId();

  useEffect(() => {
    let alive = true;
    setState({ kind: 'loading' });
    api.notes(targetType, targetId).then(
      (notes) => alive && setState({ kind: 'ready', notes }),
      (e: unknown) => alive && setState({ kind: 'error', failure: failureOf(e) }),
    );
    return () => {
      alive = false;
    };
  }, [api, targetType, targetId, attempt]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const note = await api.addNote(targetType, targetId, draft);
      setState((st) => (st.kind === 'ready' ? { kind: 'ready', notes: [note, ...st.notes] } : st));
      setDraft('');
      toast(NOTES_COPY.saved, 'success');
    } catch (e) {
      toast(notesFailure(failureOf(e), messageOf(e)), 'warn');
    } finally {
      setSaving(false);
    }
  }, [api, draft, targetId, targetType, toast]);

  const remove = useCallback(
    async (reason: string) => {
      if (!deleting) return;
      setBusy(true);
      try {
        await api.deleteNote(deleting.id, reason);
        setState((st) => (st.kind === 'ready' ? { kind: 'ready', notes: st.notes.filter((n) => n.id !== deleting.id) } : st));
        setDeleting(null);
        toast(NOTES_COPY.deleted, 'success');
      } catch (e) {
        toast(notesFailure(failureOf(e), messageOf(e)), 'warn');
      } finally {
        setBusy(false);
      }
    },
    [api, deleting, toast],
  );

  const mayDelete = canDeleteNotes(role);
  const length = draft.trim().length;

  return (
    <div className={s.card}>
      <p className={s.muted}>{internal}</p>
      {canWriteNotes(role) ? (
        <form
          className={s.noteForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (canSaveNote(draft) && !saving) void save();
          }}
        >
          <label htmlFor={fieldId} className={s.label}>
            {NOTES_COPY.add}
          </label>
          <textarea
            id={fieldId}
            className={s.textarea}
            rows={3}
            maxLength={2200}
            placeholder={NOTES_COPY.placeholder}
            aria-describedby={countId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <span id={countId} className={s.muted}>
            {NOTES_COPY.count(length)}
          </span>
          <div className={s.row}>
            <Button type="submit" variant="primary" disabled={!canSaveNote(draft) || saving} aria-busy={saving || undefined}>
              {saving ? NOTES_COPY.saving : NOTES_COPY.save}
            </Button>
          </div>
        </form>
      ) : null}

      {state.kind === 'loading' ? (
        <LoadingBlock rows={3} />
      ) : state.kind === 'error' ? (
        <ErrorBlock copy={errorCopy(state.failure)} onRetry={() => setAttempt((n) => n + 1)} />
      ) : state.notes.length === 0 ? (
        <p className={s.sentence}>{NOTES_COPY.empty}</p>
      ) : (
        <ul className={s.notes} aria-label={NOTES_COPY.list}>
          {state.notes.map((n) => {
            const vm = noteVM(n);
            return (
              <li key={vm.key} className={s.note}>
                <div className={s.noteHead}>
                  <span className={s.strong}>{vm.author}</span>
                  <span className={s.mono}>{vm.when}</span>
                  {mayDelete ? (
                    <Button variant="ghost" size="sm" className={s.noteDelete} aria-label={NOTES_COPY.deleteLabel(vm.author, vm.when)} onClick={() => setDeleting(n)}>
                      {NOTES_COPY.delete}
                    </Button>
                  ) : null}
                </div>
                <p className={s.noteBody}>{vm.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={NOTES_COPY.deleteTitle}
        body={NOTES_COPY.deleteBody}
        confirm={NOTES_COPY.deleteCta}
        busyLabel={NOTES_COPY.deleting}
        cancel={NOTES_COPY.cancel}
        footnote={RECORD_COPY.audited}
        danger
        reason={{ label: NOTES_COPY.reason, help: NOTES_COPY.reasonHelp, ready: reasonReady }}
        busy={busy}
        onConfirm={(r) => void remove(r)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
