// A glossary term on a course step (D-193). The first use is a dotted underline. Hover and focus show
// the short meaning; a tap pins it. "More in the glossary" opens a drawer with the long meaning.
// The drawer traps focus and Escape closes it. Markup only: the spans come from the view-model.

import { createContext, useContext, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { GlossaryTerm } from '@ai/core/course-types';
import type { GlossarySpan } from '@ai/core/glossary';
import { paintRich } from '@ai/core/rich-text';
import type { RichMark, RichText } from '@ai/core/rich-text';
import { Icon } from '../../components/Icon';
import { useDialog } from '../../components/r2/Modal';
import d from '../../components/r2/Drawer.module.css';
import { STEP } from './Step.vm';
import s from './Glossary.module.css';

const Ctx = createContext<{ terms: ReadonlyMap<string, GlossaryTerm>; open: (id: string) => void }>({
  terms: new Map(),
  open: () => undefined,
});

/** The step's glossary, so a term can show its short line and open its long one. */
export function GlossaryProvider({ terms, children }: { terms: readonly GlossaryTerm[]; children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const map = useMemo(() => new Map(terms.map((t) => [t.id, t])), [terms]);
  const term = id ? map.get(id) : undefined;
  return (
    <Ctx.Provider value={{ terms: map, open: setId }}>
      {children}
      {term ? <GlossaryDrawer term={term} onClose={() => setId(null)} /> : null}
    </Ctx.Provider>
  );
}

function TermMark({ text, id }: { text: string; id: string }) {
  const { terms, open } = useContext(Ctx);
  const term = terms.get(id);
  const [pinned, setPinned] = useState(false);
  const tipId = useId();
  if (!term) return text;
  return (
    <span className={s.wrap} data-open={pinned ? 'true' : undefined}>
      <button
        type="button"
        className={s.term}
        aria-describedby={tipId}
        aria-expanded={pinned}
        onClick={() => setPinned((p) => !p)}
      >
        {text}
      </button>
      <span className={s.tip} id={tipId} role="tooltip">
        <span>{term.short}</span>
        <button
          type="button"
          className={s.more}
          onClick={(e) => {
            e.stopPropagation();
            open(term.id);
          }}
        >
          {STEP.moreGlossary}
        </button>
      </span>
    </span>
  );
}

/** A string, with its first-use terms underlined. No spans: the text, unchanged. */
export function Marked({ text, spans }: { text: string; spans?: readonly GlossarySpan[] }) {
  if (!spans?.some((span) => span.kind === 'term')) return text;
  return (
    <>
      {spans.map((span, i) =>
        span.kind === 'term' ? (
          <TermMark key={`${span.id}:${i}`} text={span.text} id={span.id} />
        ) : (
          <span key={i}>{span.text}</span>
        ),
      )}
    </>
  );
}

function styled(node: ReactNode, marks: readonly RichMark[]): ReactNode {
  let out = node;
  if (marks.some((m) => m.type === 'bold')) out = <strong>{out}</strong>;
  if (marks.some((m) => m.type === 'italic')) out = <em>{out}</em>;
  const style = marks.filter((m) => m.type === 'textStyle').reduce<NonNullable<RichMark['attrs']>>((acc, m) => ({ ...acc, ...m.attrs }), {});
  if (style?.color || style?.fontFamily || style?.fontSize) {
    out = (
      <span
        data-size={style.fontSize ? '' : undefined}
        style={{
          ...(style.color ? { color: style.color } : {}),
          ...(style.fontFamily ? { fontFamily: style.fontFamily } : {}),
          ...(style.fontSize ? { ['--rt-size' as string]: style.fontSize } : {}),
        }}
      >
        {out}
      </span>
    );
  }
  const wash = marks.find((m) => m.type === 'highlight')?.attrs?.color;
  if (marks.some((m) => m.type === 'highlight')) out = <mark className={s.hl} style={wash ? { background: wash } : undefined}>{out}</mark>;
  return out;
}

/** A stored document. A plain string never comes here. Glossary terms keep their offsets in the stripped text. */
export function RichTextView({ doc, spans }: { doc: RichText; spans?: readonly GlossarySpan[] }) {
  return (
    <div className={s.rich}>
      {paintRich(doc, spans).map((line, i) => (
        <p key={i}>
          {line.map((run, j) => (
            <span key={j}>{styled(run.termId ? <TermMark text={run.text} id={run.termId} /> : run.text, run.marks)}</span>
          ))}
        </p>
      ))}
    </div>
  );
}

/** The checklist card: the item's title, then each named term and its short line. */
export function KnowCard({
  titleId,
  title,
  spans,
  titleClass,
  rowClass,
  chips,
  terms,
}: {
  titleId: string;
  title: string;
  spans?: readonly GlossarySpan[];
  titleClass: string;
  rowClass: string;
  chips?: ReactNode;
  terms: readonly { id: string; term: string; short: string }[];
}) {
  return (
    <section className={s.know} aria-labelledby={titleId}>
      <div className={rowClass}>
        <h3 id={titleId} className={`${titleClass} ${s.knowTitle}`}>
          <Marked text={title} spans={spans} />
        </h3>
        {chips}
      </div>
      <dl className={s.defs}>
        {terms.map((t) => (
          <div key={t.id} className={s.def}>
            <dt>{t.term}</dt>
            <dd>{t.short}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function GlossaryDrawer({ term, onClose }: { term: GlossaryTerm; onClose: () => void }) {
  const { ref, onKeyDown } = useDialog(onClose);
  return (
    <div
      className={d.scrim}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={d.panel}
        role="dialog"
        aria-modal="true"
        aria-label={term.term}
        data-drawer="open"
        style={{ width: 'min(440px, 100%)' }}
        onKeyDown={onKeyDown}
      >
        <div className={d.head}>
          <div className={d.titles}>
            <h2 className={d.title}>{term.term}</h2>
          </div>
          <button type="button" className={d.close} aria-label="Close" onClick={onClose}>
            <Icon name="r2X" size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className={d.body}>
          <p>{term.long}</p>
        </div>
      </div>
    </div>
  );
}
