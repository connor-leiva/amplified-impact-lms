// D-221: the Week 0 stack card (D-197): the data sources a team plans, what green and yellow mean for each,
// and the made-up example team. The learner's stack page (`/learn/week/0/stack`) draws every field here.

import { useState } from 'react';
import type { StackCardContent, StackExampleRow, StackSource } from '@ai/core/course-types';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { KV, Sel, k } from '../../components/r2/kit';
import type { WeekCardsProps } from './WeekBuilder';
import w from './WeekBuilder.module.css';

const blankSource = (n: number): StackSource => ({ id: `source-${n}`, name: '', green: '', yellow: '' });
const blankRow = (): StackExampleRow => ({ source: '', tool: '', plan: 'green', who: '' });

export function StackCard({ draft, up }: WeekCardsProps) {
  const [open, setOpen] = useState(false);
  if (draft.course.week !== 0) return null;
  const card = draft.course.stackCard;
  const set = (fn: (card: StackCardContent) => void) =>
    up((d) => {
      d.course!.stackCard = d.course!.stackCard ?? { sources: [], exampleLabel: '', exampleTeam: '', example: [] };
      fn(d.course!.stackCard);
    });
  return (
    <Card
      title="Week 0 Stack Card"
      right={
        <Button kind="quiet" onClick={() => setOpen(true)}>
          Edit
        </Button>
      }
    >
      <KV rows={[{ label: 'Sources', value: card ? String(card.sources.length) : <span className={k.mu}>Not set</span> }]} />
      {open ? (
        <div className={w.blocks}>
          {!card ? (
            <Button kind="quiet" onClick={() => set((c) => { c.sources.push(blankSource(1)); })}>
              Add stack card
            </Button>
          ) : (
            <>
              {card.sources.map((source, i) => (
                <fieldset key={i} className={w.blocks}>
                  <legend className={w.legend}>{source.name || `Source ${i + 1}`}</legend>
                  <label>Id <input value={source.id} onChange={(e) => set((c) => { c.sources[i]!.id = e.target.value; })} /></label>
                  <label>Name <input value={source.name} onChange={(e) => set((c) => { c.sources[i]!.name = e.target.value; })} /></label>
                  <label>Green <input value={source.green} onChange={(e) => set((c) => { c.sources[i]!.green = e.target.value; })} /></label>
                  <label>Yellow <input value={source.yellow} onChange={(e) => set((c) => { c.sources[i]!.yellow = e.target.value; })} /></label>
                  <Button kind="quiet" onClick={() => set((c) => { c.sources.splice(i, 1); })}>Remove source</Button>
                </fieldset>
              ))}
              <Button kind="quiet" onClick={() => set((c) => { c.sources.push(blankSource(c.sources.length + 1)); })}>Add source</Button>
              <label>Example label <input value={card.exampleLabel} onChange={(e) => set((c) => { c.exampleLabel = e.target.value; })} /></label>
              <label>Example team <input value={card.exampleTeam} onChange={(e) => set((c) => { c.exampleTeam = e.target.value; })} /></label>
              {card.example.map((row, i) => (
                <fieldset key={i} className={w.blocks}>
                  <legend className={w.legend}>{row.source || `Example ${i + 1}`}</legend>
                  <label>Source <input value={row.source} onChange={(e) => set((c) => { c.example[i]!.source = e.target.value; })} /></label>
                  <label>Tool <input value={row.tool} onChange={(e) => set((c) => { c.example[i]!.tool = e.target.value; })} /></label>
                  <label>
                    Plan
                    <Sel aria-label="Plan" value={row.plan} onChange={(e) => set((c) => { c.example[i]!.plan = e.target.value as StackExampleRow['plan']; })}>
                      <option value="green">Green</option>
                      <option value="yellow">Yellow</option>
                    </Sel>
                  </label>
                  <label>Who <input value={row.who} onChange={(e) => set((c) => { c.example[i]!.who = e.target.value; })} /></label>
                  <Button kind="quiet" onClick={() => set((c) => { c.example.splice(i, 1); })}>Remove example row</Button>
                </fieldset>
              ))}
              <Button kind="quiet" onClick={() => set((c) => { c.example.push(blankRow()); })}>Add example row</Button>
            </>
          )}
          <Button kind="primary" onClick={() => setOpen(false)}>Done</Button>
        </div>
      ) : null}
    </Card>
  );
}
