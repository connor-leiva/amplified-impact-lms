// A form in a drawer: the Week 0 Intake (src/forms/week-0-intake.json).
// It replaces the intake page (/learn/week/0/intake) and "download a PDF and fill it in". Answers save as you go;
// Submit checks the required ones; Download PDF.
//
//   const f = useForm({ form, initial, onSave, onSubmit, onDownloadPdf });
//   <FormDrawer f={f} open={open} onClose={() => setOpen(false)} />
//   f.row    { meta, label }: the kit row's line ("8 of 22 answered") and its button's label
//
//   form            { id, ui, intake }. `intake` is the LMS's CourseIntake (intro, sections[] of questions[]: id, label,
//                   help, kind 'short' | 'long' | 'choice' | 'multi', options) plus `required` on a question. `ui` holds
//                   the drawer's own words.
//   initial         { status: 'new' | 'draft' | 'submitted', answers, savedLabel?, submittedShort? }
//   onSave(a)       → Promise. Called 700 ms after the last keystroke, at once for a choice, and on close.
//   onSubmit(a)     → Promise. Called once the required answers are in.
//   onDownloadPdf() → Promise. Resolves when the download has started.
//
// Motion (Amplified Impact Motion v1): the brand's Drawer (05) slides in on the spring and its contents follow in
// order; fields focus as brand 07 (the ring tightens in, the border firms to ink; an error shakes); Submit and
// Download are brand 03 (idle → the hairline sweep → the mark lands); chips press (02).
// D-225: `handoff/lms-v3/src/components/FormDrawer.jsx`, converted to TSX. D-236 adds three things the seat card needs
// (Connor, Nov 22): `locked`, the same drawer with every answer shown and locked, where only Close and Download PDF
// work (an agent's view); `ui.submittedLabel`, the finished state's word ("Signed", "Ready"); and a refusal: a save or
// a submit the server refuses (a `FormRefusal`) stops, the button shakes back, and the foot says why, where a refused
// save once hung on "Saving". With none of them in play the drawer is the package's. D-247 (H-10) adds `refuse`, the
// same foot words for what no save gave (the intake that didn't load, shown with the drawer locked).
// D-246 adds one more, the same way: `ui.submittedPdfLabel`, a download button on the submitted banner (the intake's
// "Download Your Answers (PDF)"). It shares Download PDF's state and action, so one file is made at a time.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Icon } from './Icons';
import { Drawer, HairlineSweep, RollLabel, SignalMark, isReducedMotion, restartAnimation } from '@brand/ai-motion';
import type { AsyncState, MotionStyle } from '@brand/ai-motion';
import type { FormAnswers, FormDef, FormInitial, FormQuestion, FormStatus } from './types';

type Answer = FormAnswers[string] | undefined;
interface FormState {
  status: FormStatus; answers: FormAnswers; rowAnswers: FormAnswers; saved: string; short: string;
  save: 'idle' | 'saving' | 'saved'; errors: Record<string, boolean>; submit: AsyncState; pdf: AsyncState; attempt: number;
  /** D-236: why the server refused the last save or submit, in its words ('' for none). */
  failure: string;
}

/** D-236: a save or a submit the server refused, with the words the drawer's foot shows. */
export class FormRefusal extends Error {}
const refusalOf = (err: unknown): string => (err instanceof FormRefusal ? err.message : '');
export interface UseFormArgs {
  form: FormDef;
  initial: FormInitial;
  onSave?: (a: FormAnswers) => Promise<unknown> | void;
  onSubmit?: (a: FormAnswers) => Promise<unknown> | void;
  onDownloadPdf?: () => Promise<unknown> | void;
}

const picks = (f: FormQuestion) => f.kind === 'choice' || f.kind === 'multi';
const has = (v: Answer) => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');
const stamp = (o: Intl.DateTimeFormatOptions) => new Date().toLocaleString('en-US', o);
const count = (fields: FormQuestion[], a: FormAnswers) => fields.filter((f) => has(a[f.id])).length;

export function useForm({ form, initial, onSave, onSubmit, onDownloadPdf }: UseFormArgs) {
  const fields = useMemo(() => form.intake.sections.flatMap((s) => s.questions), [form]);
  const start = (i: FormInitial): FormState => ({ status: i.status, answers: i.answers, rowAnswers: i.answers, saved: i.savedLabel || '', short: i.submittedShort || '', save: i.savedLabel ? 'saved' : 'idle', errors: {}, submit: 'idle', pdf: 'idle', attempt: 0, failure: '' });
  const [s, setS] = useState(() => start(initial));
  const ref = useRef(s); ref.current = s;
  const timer = useRef(0 as unknown as ReturnType<typeof setTimeout>), pending = useRef(false), run = useRef(0);
  const set = (patch: Partial<FormState> | ((p: FormState) => Partial<FormState>)) => setS((p) => ({ ...p, ...(typeof patch === 'function' ? patch(p) : patch) }));

  const save = useCallback(async () => {
    pending.current = false; const id = ++run.current, a = ref.current.answers;
    set({ save: 'saving' });
    try {
      await onSave?.(a);
    } catch (err) {
      if (id === run.current) set({ save: 'idle', failure: refusalOf(err) });
      return;
    }
    if (id !== run.current) return;   // a newer save, or a submit, took over
    set((p) => ({ status: p.status === 'new' ? 'draft' : p.status, saved: 'Saved ' + stamp({ hour: 'numeric', minute: '2-digit' }), save: 'saved', rowAnswers: a }));
  }, [onSave]);

  const change = (f: FormQuestion, value: FormAnswers[string]) => {
    set((p) => { const errors = { ...p.errors }; delete errors[f.id]; return { answers: { ...p.answers, [f.id]: value }, errors, failure: '' }; });
    pending.current = true; clearTimeout(timer.current);
    timer.current = setTimeout(save, picks(f) ? 0 : 700);
  };
  const submit = async () => {
    const p = ref.current; if (p.submit === 'busy' || p.submit === 'done') return null;
    const errors: Record<string, boolean> = {};
    fields.forEach((f) => { if (f.required && !has(p.answers[f.id])) errors[f.id] = true; });
    const bad = fields.find((f) => errors[f.id]);
    if (bad) { set({ errors, submit: 'error', attempt: p.attempt + 1 }); return bad; }
    clearTimeout(timer.current); pending.current = false; run.current++;
    set({ errors, submit: 'busy', failure: '' });
    try {
      await onSubmit?.(p.answers);
    } catch (err) {
      set({ submit: 'error', attempt: p.attempt + 1, failure: refusalOf(err) });
      return null;
    }
    set({ status: 'submitted', submit: 'done', save: 'saved', rowAnswers: p.answers, saved: (form.ui.submittedLabel ?? 'Submitted') + ' ' + stamp({ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), short: stamp({ month: 'short', day: 'numeric' }) });
    setTimeout(() => set({ submit: 'idle' }), 1400);
    return null;
  };
  const download = async () => {
    if (ref.current.pdf !== 'idle') return;
    set({ pdf: 'busy' }); await onDownloadPdf?.(); set({ pdf: 'done' }); setTimeout(() => set({ pdf: 'idle' }), 1600);
  };
  /** On close: an edit that hasn't been saved yet is saved now. */
  const flush = () => {
    if (!pending.current) return;
    clearTimeout(timer.current); pending.current = false; const a = ref.current.answers; onSave?.(a);
    set((p) => ({ status: p.status === 'new' ? 'draft' : p.status, rowAnswers: a }));
  };
  const reset = (i: FormInitial) => { clearTimeout(timer.current); pending.current = false; run.current++; setS(start(i)); };
  /** H-10 (D-247): words for the foot that no save or submit gave (the intake that didn't load), as a refusal shows. */
  const refuse = (message: string) => set({ failure: message });

  const n = count(fields, s.rowAnswers);
  const row = {
    meta: s.status === 'submitted' ? `Submitted ${s.short}` : n ? `${n} of ${fields.length} answered` : `${fields.length} questions`,
    label: s.status === 'submitted' ? 'View' : n ? 'Continue' : 'Fill in',
  };
  return { form, fields, ...s, submitState: s.submit, answered: count(fields, s.answers), row, change, submit, download, flush, reset, refuse };
}
export type FormApi = ReturnType<typeof useForm>;

function Field({ f, fm, locked }: { f: FormQuestion; fm: FormApi; locked: boolean }) {
  const v = fm.answers[f.id], id = 'fm-' + f.id, err = fm.errors[f.id], ui = fm.form.ui;
  const opt = f.required ? null : <span className="fm-opt">{ui.optional}</span>;
  const hint = f.help ? <p className="fm-hint" id={id + '-hint'}>{f.help}</p> : null;
  const msg = err ? <p className="fm-msg" id={id + '-msg'}>{picks(f) ? ui.needChoice : ui.needText}</p> : null;
  if (picks(f)) {
    const multi = f.kind === 'multi', list = (v || []) as string[];
    return (
      <div className="fm-field" data-field={f.id} data-kind={f.kind} data-state={err ? 'error' : undefined} role={multi ? 'group' : 'radiogroup'} aria-labelledby={id + '-l'}>
        <p className="fm-label" id={id + '-l'}>{f.label}{opt}</p>{hint}
        <div className="fm-opts">
          {f.options!.map((o) => (
            <label className="fm-chip" key={o}>
              <input type={multi ? 'checkbox' : 'radio'} name={f.id} value={o} checked={multi ? list.includes(o) : v === o} disabled={locked || undefined}
                onChange={() => fm.change(f, multi ? f.options!.filter((x) => (x === o ? !list.includes(o) : list.includes(x))) : o)} />
              {multi && <><Icon name="plus" /><Icon name="check" /></>}{o}
            </label>
          ))}
        </div>
        {msg}
      </div>
    );
  }
  const p = { className: 'fm-input', id, name: f.id, 'aria-describedby': f.help ? id + '-hint' : undefined, 'aria-invalid': err ? true : undefined, readOnly: locked || undefined, value: v || '', onChange: (e: ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => fm.change(f, e.target.value) };
  return (
    <div className="fm-field" data-field={f.id} data-kind={f.kind} data-state={err ? 'error' : undefined}>
      <label className="fm-label" htmlFor={id}>{f.label}{opt}</label>{hint}
      {f.kind === 'long' ? <textarea {...p} rows={3} /> : <input {...p} type="text" />}
      {msg}
    </div>
  );
}

/** D-246: the banner's download sits under its words, the banner's own 12 px gap away. */
const BANNER_PDF = { marginTop: 12 } as const;

function AsyncBtn({ cls, state, icon, label, done, onClick, attempt }: { cls: string; state: AsyncState; icon?: string; label: string; done: string; onClick: () => void; attempt?: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (state === 'error' && attempt) restartAnimation(ref.current); }, [state, attempt]);
  return (
    <button ref={ref} className={`wk-btn ${cls}`} type="button" data-state={state} aria-busy={state === 'busy' || undefined} onClick={onClick}>
      <span className="aim-async__label">{icon && <Icon name={icon} />}<RollLabel>{label}</RollLabel></span>
      <HairlineSweep />
      <span className="aim-async__done"><SignalMark />{done}</span>
    </button>
  );
}

export function FormDrawer({ f: fm, open, onClose, locked = false }: { f: FormApi; open: boolean; onClose: () => void; locked?: boolean }) {
  const { ui, intake } = fm.form, body = useRef<HTMLFormElement>(null), wasSubmitted = useRef(fm.status === 'submitted');
  const close = () => { fm.flush(); onClose(); };
  const submit = async () => { const bad = await fm.submit(); if (bad) body.current?.querySelector<HTMLElement>(`[data-field="${bad.id}"] :is(input,textarea)`)?.focus(); };
  useEffect(() => {   // the banner arrives at the top: bring it into view
    if (fm.status === 'submitted' && !wasSubmitted.current) body.current?.scrollTo({ top: 0, behavior: isReducedMotion() ? 'auto' : 'smooth' });
    wasSubmitted.current = fm.status === 'submitted';
  }, [fm.status]);
  const errs = Object.keys(fm.errors).length;
  const done = fm.status === 'submitted' && fm.submitState === 'idle';
  return (
    <div data-ai="form" id="fm-host" data-drawer={open ? 'open' : undefined}>
      <Drawer open={open} onClose={close} label={ui.title} className="fm-drawer">
        <header className="fm-head aim-in" style={{ '--i': 0 } as MotionStyle}>
          <div><p className="fm-kick">{ui.kicker}</p><h2 className="fm-title">{ui.title}</h2><p className="fm-sub">{ui.sub}</p></div>
          <button className="fm-close" type="button" onClick={close}>Close</button>
          <div className="fm-meter">
            <span className="sc-bar" style={{ '--v': fm.answered / fm.fields.length } as MotionStyle} />
            <span className="fm-count">{`${fm.answered} of ${fm.fields.length} answered`}</span>
            <span className="fm-save" role="status">
              {fm.save === 'saving' ? <><HairlineSweep />Saving</> : fm.save === 'saved' ? <><Icon name="check" />{fm.saved}</> : null}
            </span>
          </div>
        </header>
        <form className="fm-body" noValidate ref={body} onSubmit={(e) => e.preventDefault()}>
          {fm.status === 'submitted' && (
            <div className="fm-banner aim-rise"><SignalMark play /><div><b>{ui.submittedTitle}</b><p>{ui.submittedText}</p>
              {ui.submittedPdfLabel ? <div style={BANNER_PDF}><AsyncBtn cls="wk-btn-secondary aim-async fm-banner-pdf" state={fm.pdf} icon="down" label={ui.submittedPdfLabel} done="Downloaded" onClick={fm.download} /></div> : null}
            </div></div>
          )}
          {intake.intro && <p className="fm-intro aim-in" style={{ '--i': 1 } as MotionStyle}>{intake.intro}</p>}
          {intake.sections.map((x, i) => (
            <section className="fm-sec aim-in" style={{ '--i': i + 2 } as MotionStyle} key={x.title}>
              <div className="fm-sec-h"><h3 className="fm-sec-t"><span className="fm-no">{String(i + 1).padStart(2, '0')}</span>{x.title}</h3>{x.intro && <p className="fm-sec-d">{x.intro}</p>}</div>
              {x.questions.map((f) => <Field key={f.id} f={f} fm={fm} locked={locked} />)}
            </section>
          ))}
        </form>
        <footer className="fm-foot aim-in" style={{ '--i': intake.sections.length + 2 } as MotionStyle}>
          {locked ? null : done
            ? <button className="wk-btn wk-btn-primary fm-done" type="button" onClick={close}><RollLabel>Done</RollLabel></button>
            : <AsyncBtn cls="wk-btn-primary aim-async fm-submit" state={fm.submitState} label={ui.submitLabel} done={ui.submittedLabel ?? 'Submitted'} onClick={submit} attempt={fm.attempt} />}
          <AsyncBtn cls="wk-btn-secondary aim-async fm-pdf" state={fm.pdf} icon="down" label="Download PDF" done="Downloaded" onClick={fm.download} />
          <p className="fm-note" role="alert">{errs ? `${errs} answer${errs > 1 ? 's' : ''} still needed` : fm.failure || null}</p>
        </footer>
      </Drawer>
    </div>
  );
}
