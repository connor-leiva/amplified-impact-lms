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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';
import { Drawer, HairlineSweep, RollLabel, SignalMark, isReducedMotion, restartAnimation } from '../motion/ai-motion';

const picks = (f) => f.kind === 'choice' || f.kind === 'multi';
const has = (v) => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');
const stamp = (o) => new Date().toLocaleString('en-US', o);
const count = (fields, a) => fields.filter((f) => has(a[f.id])).length;

export function useForm({ form, initial, onSave, onSubmit, onDownloadPdf }) {
  const fields = useMemo(() => form.intake.sections.flatMap((s) => s.questions), [form]);
  const start = (i) => ({ status: i.status, answers: i.answers, rowAnswers: i.answers, saved: i.savedLabel || '', short: i.submittedShort || '', save: i.savedLabel ? 'saved' : 'idle', errors: {}, submit: 'idle', pdf: 'idle', attempt: 0 });
  const [s, setS] = useState(() => start(initial));
  const ref = useRef(s); ref.current = s;
  const timer = useRef(0), pending = useRef(false), run = useRef(0);
  const set = (patch) => setS((p) => ({ ...p, ...(typeof patch === 'function' ? patch(p) : patch) }));

  const save = useCallback(async () => {
    pending.current = false; const id = ++run.current, a = ref.current.answers;
    set({ save: 'saving' });
    await onSave?.(a);
    if (id !== run.current) return;   // a newer save, or a submit, took over
    set((p) => ({ status: p.status === 'new' ? 'draft' : p.status, saved: 'Saved ' + stamp({ hour: 'numeric', minute: '2-digit' }), save: 'saved', rowAnswers: a }));
  }, [onSave]);

  const change = (f, value) => {
    set((p) => { const errors = { ...p.errors }; delete errors[f.id]; return { answers: { ...p.answers, [f.id]: value }, errors }; });
    pending.current = true; clearTimeout(timer.current);
    timer.current = setTimeout(save, picks(f) ? 0 : 700);
  };
  const submit = async () => {
    const p = ref.current; if (p.submit === 'busy' || p.submit === 'done') return null;
    const errors = {};
    fields.forEach((f) => { if (f.required && !has(p.answers[f.id])) errors[f.id] = true; });
    const bad = fields.find((f) => errors[f.id]);
    if (bad) { set({ errors, submit: 'error', attempt: p.attempt + 1 }); return bad; }
    clearTimeout(timer.current); pending.current = false; run.current++;
    set({ errors, submit: 'busy' });
    await onSubmit?.(p.answers);
    set({ status: 'submitted', submit: 'done', save: 'saved', rowAnswers: p.answers, saved: 'Submitted ' + stamp({ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), short: stamp({ month: 'short', day: 'numeric' }) });
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
  const reset = (i) => { clearTimeout(timer.current); pending.current = false; run.current++; setS(start(i)); };

  const n = count(fields, s.rowAnswers);
  const row = {
    meta: s.status === 'submitted' ? `Submitted ${s.short}` : n ? `${n} of ${fields.length} answered` : `${fields.length} questions`,
    label: s.status === 'submitted' ? 'View' : n ? 'Continue' : 'Fill in',
  };
  return { form, fields, ...s, submitState: s.submit, answered: count(fields, s.answers), row, change, submit, download, flush, reset };
}

function Field({ f, fm }) {
  const v = fm.answers[f.id], id = 'fm-' + f.id, err = fm.errors[f.id], ui = fm.form.ui;
  const opt = f.required ? null : <span className="fm-opt">{ui.optional}</span>;
  const hint = f.help ? <p className="fm-hint" id={id + '-hint'}>{f.help}</p> : null;
  const msg = err ? <p className="fm-msg" id={id + '-msg'}>{picks(f) ? ui.needChoice : ui.needText}</p> : null;
  if (picks(f)) {
    const multi = f.kind === 'multi', list = v || [];
    return (
      <div className="fm-field" data-field={f.id} data-kind={f.kind} data-state={err ? 'error' : undefined} role={multi ? 'group' : 'radiogroup'} aria-labelledby={id + '-l'}>
        <p className="fm-label" id={id + '-l'}>{f.label}{opt}</p>{hint}
        <div className="fm-opts">
          {f.options.map((o) => (
            <label className="fm-chip" key={o}>
              <input type={multi ? 'checkbox' : 'radio'} name={f.id} value={o} checked={multi ? list.includes(o) : v === o}
                onChange={() => fm.change(f, multi ? f.options.filter((x) => (x === o ? !list.includes(o) : list.includes(x))) : o)} />
              {multi && <><Icon name="plus" /><Icon name="check" /></>}{o}
            </label>
          ))}
        </div>
        {msg}
      </div>
    );
  }
  const p = { className: 'fm-input', id, name: f.id, 'aria-describedby': f.help ? id + '-hint' : undefined, 'aria-invalid': err ? true : undefined, value: v || '', onChange: (e) => fm.change(f, e.target.value) };
  return (
    <div className="fm-field" data-field={f.id} data-kind={f.kind} data-state={err ? 'error' : undefined}>
      <label className="fm-label" htmlFor={id}>{f.label}{opt}</label>{hint}
      {f.kind === 'long' ? <textarea {...p} rows={3} /> : <input {...p} type="text" />}
      {msg}
    </div>
  );
}

function AsyncBtn({ cls, state, icon, label, done, onClick, attempt }) {
  const ref = useRef(null);
  useEffect(() => { if (state === 'error' && attempt) restartAnimation(ref.current); }, [state, attempt]);
  return (
    <button ref={ref} className={`wk-btn ${cls}`} type="button" data-state={state} aria-busy={state === 'busy' || undefined} onClick={onClick}>
      <span className="aim-async__label">{icon && <Icon name={icon} />}<RollLabel>{label}</RollLabel></span>
      <HairlineSweep />
      <span className="aim-async__done"><SignalMark />{done}</span>
    </button>
  );
}

export function FormDrawer({ f: fm, open, onClose }) {
  const { ui, intake } = fm.form, body = useRef(null), wasSubmitted = useRef(fm.status === 'submitted');
  const close = () => { fm.flush(); onClose(); };
  const submit = async () => { const bad = await fm.submit(); if (bad) body.current?.querySelector(`[data-field="${bad.id}"] :is(input,textarea)`)?.focus(); };
  useEffect(() => {   // the banner arrives at the top: bring it into view
    if (fm.status === 'submitted' && !wasSubmitted.current) body.current?.scrollTo({ top: 0, behavior: isReducedMotion() ? 'auto' : 'smooth' });
    wasSubmitted.current = fm.status === 'submitted';
  }, [fm.status]);
  const errs = Object.keys(fm.errors).length;
  const done = fm.status === 'submitted' && fm.submitState === 'idle';
  return (
    <div data-ai="form" id="fm-host" data-drawer={open ? 'open' : undefined}>
      <Drawer open={open} onClose={close} label={ui.title} className="fm-drawer">
        <header className="fm-head aim-in" style={{ '--i': 0 }}>
          <div><p className="fm-kick">{ui.kicker}</p><h2 className="fm-title">{ui.title}</h2><p className="fm-sub">{ui.sub}</p></div>
          <button className="fm-close" type="button" onClick={close}>Close</button>
          <div className="fm-meter">
            <span className="sc-bar" style={{ '--v': fm.answered / fm.fields.length }} />
            <span className="fm-count">{`${fm.answered} of ${fm.fields.length} answered`}</span>
            <span className="fm-save" role="status">
              {fm.save === 'saving' ? <><HairlineSweep />Saving</> : fm.save === 'saved' ? <><Icon name="check" />{fm.saved}</> : null}
            </span>
          </div>
        </header>
        <form className="fm-body" noValidate ref={body} onSubmit={(e) => e.preventDefault()}>
          {fm.status === 'submitted' && (
            <div className="fm-banner aim-rise"><SignalMark play /><div><b>{ui.submittedTitle}</b><p>{ui.submittedText}</p></div></div>
          )}
          {intake.intro && <p className="fm-intro aim-in" style={{ '--i': 1 }}>{intake.intro}</p>}
          {intake.sections.map((x, i) => (
            <section className="fm-sec aim-in" style={{ '--i': i + 2 }} key={x.title}>
              <div className="fm-sec-h"><h3 className="fm-sec-t"><span className="fm-no">{String(i + 1).padStart(2, '0')}</span>{x.title}</h3>{x.intro && <p className="fm-sec-d">{x.intro}</p>}</div>
              {x.questions.map((f) => <Field key={f.id} f={f} fm={fm} />)}
            </section>
          ))}
        </form>
        <footer className="fm-foot aim-in" style={{ '--i': intake.sections.length + 2 }}>
          {done
            ? <button className="wk-btn wk-btn-primary fm-done" type="button" onClick={close}><RollLabel>Done</RollLabel></button>
            : <AsyncBtn cls="wk-btn-primary aim-async fm-submit" state={fm.submitState} label={ui.submitLabel} done="Submitted" onClick={submit} attempt={fm.attempt} />}
          <AsyncBtn cls="wk-btn-secondary aim-async fm-pdf" state={fm.pdf} icon="down" label="Download PDF" done="Downloaded" onClick={fm.download} />
          <p className="fm-note" role="alert">{errs ? `${errs} answer${errs > 1 ? 's' : ''} still needed` : null}</p>
        </footer>
      </Drawer>
    </div>
  );
}
