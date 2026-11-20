// The Week Builder's editor (D-209). The field itself shows the styling, in the same type as a v6
// learner step paragraph. What it stores is sanitized JSON; the plain string is what the copy rules read.

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import History from '@tiptap/extension-history';
import { TextStyle, Color, FontFamily, FontSize } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { BRAND_COLORS, RICH_FONTS, RICH_SIZES, plainDoc, sanitizeRich, storedRich, stripRich } from '@ai/core/rich-text';
import type { RichText } from '@ai/core/rich-text';
import w from './WeekBuilder.module.css';

const extensions = [
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  History,
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  Highlight.configure({ multicolor: true }),
];

const DEFAULT_FONT = RICH_FONTS[0].id;
function wash(color: string): string {
  return `color-mix(in srgb, ${color} 35%, transparent)`;
}

function Swatches({
  label,
  onPick,
  onCustom,
}: {
  label: string;
  onPick: (color: string) => void;
  onCustom: (color: string) => void;
}) {
  return (
    <div className={w.pop} role="dialog" aria-label={label}>
      {BRAND_COLORS.map((c) => (
        <button key={c.id} type="button" className={w.swatch} data-c={c.id} aria-label={c.label} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(c.value)} />
      ))}
      <label className={w.plus}>
        +
        <input type="color" aria-label={`Custom ${label}`} defaultValue="#1f4d40" onChange={(e) => onCustom(e.target.value)} />
      </label>
    </div>
  );
}

export function RichField({
  label,
  plain,
  rich,
  onChange,
}: {
  label: string;
  plain: string;
  rich?: RichText;
  onChange: (plain: string, rich?: RichText) => void;
}) {
  const [open, setOpen] = useState<'color' | 'highlight' | null>(null);
  const [baseSize, setBaseSize] = useState('16');
  const [, bump] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions,
    content: rich ?? plainDoc(plain),
    immediatelyRender: false,
    editorProps: { attributes: { 'aria-label': label } },
    onUpdate: ({ editor: ed }) => {
      const clean = sanitizeRich(ed.getJSON());
      onChange(clean ? stripRich(clean) : '', storedRich(clean));
    },
    onSelectionUpdate: () => bump((n) => n + 1),
  });
  useEffect(() => {
    if (!editor) return;
    const n = Math.round(parseFloat(getComputedStyle(editor.view.dom).fontSize));
    if (n) setBaseSize(String(n));
  }, [editor]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  if (!editor) return null;
  const chain = () => editor.chain().focus();
  const style = editor.getAttributes('textStyle') as { fontFamily?: string; fontSize?: string; color?: string };
  const fontNow = style.fontFamily || DEFAULT_FONT;
  const sizeNow = (style.fontSize || '').replace('px', '') || baseSize;
  const sizes = [...new Set([sizeNow, ...RICH_SIZES.map(String)])];
  return (
    <div className={w.editor} ref={root}>
      <div className={w.btool} role="toolbar" aria-label={label}>
        <select aria-label={`${label} font`} value={fontNow} onChange={(e) => { if (e.target.value === DEFAULT_FONT) chain().unsetFontFamily().run(); else chain().setFontFamily(e.target.value).run(); }}>
          {RICH_FONTS.map((f) => <option key={f.label} value={f.id}>{f.label}</option>)}
        </select>
        <select aria-label={`${label} size`} value={sizeNow} onChange={(e) => { if (e.target.value === baseSize) chain().unsetFontSize().run(); else chain().setFontSize(`${e.target.value}px`).run(); }}>
          {sizes.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <input className={w.sizeN} aria-label={`${label} custom size`} inputMode="numeric" value={sizeNow} onChange={(e) => {
          const n = e.target.value.replace(/[^\d]/g, '').slice(0, 2);
          const num = Number(n);
          if (num >= 8 && num <= 96) chain().setFontSize(`${num}px`).run();
        }} />
        <span className={w.tsep} />
        <span className={w.slot}>
          <button type="button" className={w.tb} aria-label={`${label} text color`} aria-expanded={open === 'color'} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(open === 'color' ? null : 'color')}>
            <span className={w.letter}>A<span className={w.bar} style={{ background: style.color || 'var(--r2-ink)' }} /></span>
          </button>
          {open === 'color' ? <Swatches label="Text color" onPick={(color) => { chain().setColor(color).run(); setOpen(null); }} onCustom={(color) => chain().setColor(color).run()} /> : null}
        </span>
        <span className={w.slot}>
          <button type="button" className={w.tb} aria-label={`${label} highlight`} aria-expanded={open === 'highlight'} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(open === 'highlight' ? null : 'highlight')}>
            <span className={w.marker} aria-hidden="true" />
          </button>
          {open === 'highlight' ? <Swatches label="Highlight" onPick={(color) => { chain().toggleHighlight({ color: wash(color) }).run(); setOpen(null); }} onCustom={(color) => chain().setHighlight({ color: wash(color) }).run()} /> : null}
        </span>
        <span className={w.tsep} />
        <button type="button" className={w.tb} aria-label={`${label} bold`} aria-pressed={editor.isActive('bold')} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().toggleBold().run()}><b>B</b></button>
        <button type="button" className={w.tb} aria-label={`${label} italic`} aria-pressed={editor.isActive('italic')} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().toggleItalic().run()}><i>I</i></button>
        <button type="button" className={w.tb} aria-label={`${label} clear formatting`} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().unsetAllMarks().run()}>Clear</button>
      </div>
      <EditorContent editor={editor} className={w.prose} />
    </div>
  );
}
