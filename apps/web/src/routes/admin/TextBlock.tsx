// The Week Builder's paragraph (piece 5). The toolbar is the polish mockup's, and the preview is the
// same paragraph the learner page draws.

import { useRef } from 'react';
import { TEXT_SIZES, cleanLook, isTextColor, toggleRange } from '@ai/core/text-look';
import type { TextColor, TextFont, TextSize } from '@ai/core/text-look';
import type { ContentBlock } from '@ai/core/course-types';
import { TextParagraph } from '../learn/parts';
import w from './WeekBuilder.module.css';

const SWATCH: { id: TextColor; label: string }[] = [
  { id: 'ink', label: 'Ink' },
  { id: 'muted', label: 'Muted' },
  { id: 'forest', label: 'Forest' },
  { id: 'energy', label: 'Energy' },
  { id: 'mint', label: 'Mint' },
];

type Block = Extract<ContentBlock, { type: 'text' }>;

export function TextBlock({ block, label, onChange }: { block: Block; label: string; onChange: (b: Block) => void }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const look = block.look;
  const write = (text: string, next = look) => {
    const cleaned = cleanLook(next, text);
    onChange(cleaned ? { type: 'text', text, look: cleaned } : { type: 'text', text });
  };
  const setLook = (patch: Partial<NonNullable<Block['look']>>) => write(block.text, { ...look, ...patch });
  const highlight = () => {
    const el = area.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (end <= start) return;
    write(block.text, { ...look, highlight: toggleRange(look?.highlight, start, end, block.text.length) });
  };
  const custom = look?.color && !isTextColor(look.color) ? look.color : '#1f4d40';
  return (
    <div className={w.builder}>
      <div className={w.bfield}>
        <div className={w.btool} role="toolbar" aria-label="Text styles">
          <select aria-label="Font" value={look?.font ?? ''} onChange={(e) => setLook({ font: (e.target.value || undefined) as TextFont | undefined })}>
            <option value="">Font</option>
            <option value="sans">Geist</option>
            <option value="mono">Geist Mono</option>
          </select>
          <select aria-label="Size" value={look?.size ?? ''} onChange={(e) => setLook({ size: e.target.value ? (Number(e.target.value) as TextSize) : undefined })}>
            <option value="">Size</option>
            {TEXT_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className={w.tsep} />
          {SWATCH.map((sw) => (
            <button key={sw.id} type="button" className={w.swatch} data-c={sw.id} aria-label={sw.label} aria-pressed={look?.color === sw.id} onClick={() => setLook({ color: look?.color === sw.id ? undefined : sw.id })} />
          ))}
          <input className={w.picker} type="color" aria-label="Custom color" value={custom} onChange={(e) => setLook({ color: e.target.value })} />
          <span className={w.tsep} />
          <button type="button" className={w.tb} aria-label="Highlight" aria-pressed={!!look?.highlight?.length} onClick={highlight}><mark>H</mark></button>
        </div>
        <textarea ref={area} className={w.barea} aria-label={label} rows={6} value={block.text} onChange={(e) => write(e.target.value)} />
      </div>
      <div className={w.bfield}>
        <div className={w.btool}><span className={w.previewK}>Live preview</span></div>
        <div className={w.bprev}><TextParagraph text={block.text} look={look} /></div>
      </div>
    </div>
  );
}
