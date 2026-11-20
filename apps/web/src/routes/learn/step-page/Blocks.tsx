// D-210: a path's content blocks on the v6 page, in the mockup's own long-step styles ("Text styles for long steps"
// in handoff/step-page-v6/mockup/step-2.html): consecutive paragraphs, lists, tables and copy blocks share one
// `.prose` article; a list is the numbered `.rt-steps`; a copy block is the `.copyblock` with its Copy button; a
// table is `.rt-table`. A video in the content is the course video player, with its progress, between articles.
import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RollLabel } from '@brand/ai-motion';
import type { GlossarySpan } from '@ai/core/glossary';
import type { PathBlock, VideoBlock } from '@ai/core/course-types';
import { Marked, RichTextView } from '../Glossary';
import { VideoView } from '../Video';
import type { VideoWatch } from '../Video';
import { Icon } from './Icons';
import { RtTable } from './Reference';
import type { SpLabels } from './types';

function CopyBlock({ text, label, labels }: { text: string; label?: string; labels: SpLabels }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <div className="copyblock">
      <header>
        <span>{label ?? ''}</span>
        <button className="btn btn-secondary btn-sm" type="button" data-copy aria-label={label ? `${labels.copy}: ${label}` : labels.copy}
          onClick={() => {
            navigator.clipboard?.writeText(text).catch(() => {});
            setCopied(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 1400);
          }}>
          <Icon name="copy" size={14} /><RollLabel>{copied ? labels.copied : labels.copy}</RollLabel>
        </button>
      </header>
      <pre>{text}</pre>
    </div>
  );
}

/** One content block inside the article. */
function Piece({ b, spans, labels }: { b: Exclude<PathBlock, VideoBlock>; spans?: readonly GlossarySpan[]; labels: SpLabels }) {
  if (b.type === 'text') return b.rich ? <RichTextView doc={b.rich} spans={spans} /> : <p><Marked text={b.text} spans={spans} /></p>;
  if (b.type === 'list') return <ol className="rt-steps">{b.items.map((item, i) => <li key={i}><span>{item}</span></li>)}</ol>;
  if (b.type === 'copy') return <CopyBlock text={b.text} label={b.label} labels={labels} />;
  if (b.type === 'table') return <RtTable t={b} />;
  return null;
}

const CONTENT = new Set(['text', 'list', 'copy', 'table']);

/** The blocks, grouped: each run of paragraphs, lists, tables and copy blocks is one article; a video stands alone. */
export function ProseBlocks({ blocks, marks, labels, watch }: { blocks: readonly PathBlock[]; marks?: readonly (GlossarySpan[] | undefined)[]; labels: SpLabels; watch?: VideoWatch }) {
  const out: ReactNode[] = [];
  let run: ReactNode[] = [];
  const flush = (key: number) => {
    if (run.length) out.push(<article key={`a${key}`} className="prose">{run}</article>);
    run = [];
  };
  blocks.forEach((b, i) => {
    if (b.type === 'video') {
      flush(i);
      out.push(<div key={`v${i}`} className="xvideo"><VideoView block={b} watch={watch} /></div>);
      return;
    }
    if (!CONTENT.has(b.type)) return;
    run.push(<Fragment key={i}><Piece b={b as Exclude<PathBlock, VideoBlock>} spans={marks?.[i]} labels={labels} /></Fragment>);
  });
  flush(blocks.length);
  return out.length ? <div className="xblocks">{out}</div> : null;
}
