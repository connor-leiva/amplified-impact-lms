// D-196: the Week 0 Intake card. Questions are the draft's. Removing operator, ai, plan or google asks first.

import { useState } from 'react';
import clsx from 'clsx';
import type { CourseIntake, IntakeQuestion, IntakeSection } from '@ai/core/course-types';
import { isLockedIntakeId } from '@ai/core/intake';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Confirm } from '../../components/r2/Modal';
import { KV, Sel, k } from '../../components/r2/kit';
import type { WeekCardsProps } from './WeekBuilder';
import w from './WeekBuilder.module.css';

const blank = (): IntakeQuestion => ({ id: '', label: '', kind: 'short' });

export function IntakeCard({ draft, up }: WeekCardsProps) {
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<{ s: number; i: number; id: string } | null>(null);
  if (draft.course.week !== 0) return null;
  const form = draft.course.intake;
  const set = (fn: (form: CourseIntake) => void) =>
    up((d) => {
      d.course!.intake = d.course!.intake ?? { sections: [] };
      fn(d.course!.intake);
    });
  const remove = (s: number, i: number) =>
    set((f) => {
      f.sections[s]!.questions.splice(i, 1);
    });
  return (
    <Card
      title="Week 0 Intake"
      right={
        <Button kind="quiet" onClick={() => setOpen(true)}>
          Edit
        </Button>
      }
    >
      <KV rows={[{ label: 'Questions', value: form ? String(form.sections.reduce((n, s) => n + s.questions.length, 0)) : <span className={k.mu}>Not set</span> }]} />
      {open ? (
        <div className={w.blocks}>
          {!form ? (
            <Button kind="quiet" onClick={() => up((d) => { d.course!.intake = { intro: '', sections: [{ title: 'You and Your Team', questions: [blank()] }] }; })}>
              Add intake
            </Button>
          ) : (
            <>
              <label>
                Intro
                <textarea value={form.intro ?? ''} onChange={(e) => set((f) => { f.intro = e.target.value; })} />
              </label>
              {form.sections.map((section, s) => (
                <Section key={s} section={section} onTitle={(title) => set((f) => { f.sections[s]!.title = title; })} onAsk={(i, q) => set((f) => { f.sections[s]!.questions[i] = q; })} onRemove={(i) => {
                  const id = section.questions[i]?.id ?? '';
                  if (isLockedIntakeId(id)) setDrop({ s, i, id });
                  else remove(s, i);
                }} onAdd={() => set((f) => { f.sections[s]!.questions.push(blank()); })} />
              ))}
              <Button kind="quiet" onClick={() => set((f) => { f.sections.push({ title: 'Section', questions: [blank()] }); })}>Add section</Button>
            </>
          )}
          <Button kind="primary" onClick={() => setOpen(false)}>Done</Button>
        </div>
      ) : null}
      {drop ? (
        <Confirm
          title={`Remove ${drop.id}?`}
          body="Personalization reads this id. Removing it means that rule does nothing."
          cta="Remove"
          danger
          onClose={() => setDrop(null)}
          onConfirm={() => remove(drop.s, drop.i)}
        />
      ) : null}
    </Card>
  );
}

function Section({ section, onTitle, onAsk, onRemove, onAdd }: { section: IntakeSection; onTitle: (v: string) => void; onAsk: (i: number, q: IntakeQuestion) => void; onRemove: (i: number) => void; onAdd: () => void }) {
  return (
    <fieldset className={w.blocks}>
      <legend className={w.legend}>{section.title || 'Section'}</legend>
      <label>
        Title
        <input value={section.title} onChange={(e) => onTitle(e.target.value)} />
      </label>
      {section.questions.map((q, i) => (
        <div key={i} className={w.blocks}>
          <label>Id <input value={q.id} onChange={(e) => onAsk(i, { ...q, id: e.target.value })} /></label>
          <label>Label <input value={q.label} onChange={(e) => onAsk(i, { ...q, label: e.target.value })} /></label>
          <label>
            Kind
            <Sel aria-label="Kind" value={q.kind} onChange={(e) => onAsk(i, { ...q, kind: e.target.value as IntakeQuestion['kind'] })}>
              <option value="short">Short</option>
              <option value="long">Long</option>
              <option value="choice">Choice</option>
              <option value="multi">Multi</option>
            </Sel>
          </label>
          {/* B-16 (D-229): Submit refuses until a required question has an answer. */}
          <label className={clsx(k.row, k.nw, w.check)}>
            <input type="checkbox" checked={!!q.required} onChange={(e) => onAsk(i, { ...q, required: e.target.checked || undefined })} />
            Required
          </label>
          {q.kind === 'choice' || q.kind === 'multi' ? (
            <label>
              Choices, one per line
              <textarea value={(q.options ?? []).join('\n')} onChange={(e) => onAsk(i, { ...q, options: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} />
            </label>
          ) : null}
          <Button kind="quiet" onClick={() => onRemove(i)}>Remove question</Button>
        </div>
      ))}
      <Button kind="quiet" onClick={onAdd}>Add question</Button>
    </fieldset>
  );
}
