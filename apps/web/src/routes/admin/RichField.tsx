// The Week Builder's editor (D-209). The field itself shows the styling. What it stores is sanitized
// JSON; the plain string beside it is what the copy rules read.

import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import History from '@tiptap/extension-history';
import { TextStyle, Color, FontFamily, FontSize } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { useState } from 'react';
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

function wash(color: string): string {
  return `color-mix(in srgb, ${color} 35%, transparent)`;
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
  const [custom, setCustom] = useState('#1f4d40');
  const [size, setSize] = useState('22');
  const [, bump] = useState(0);
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
  if (!editor) return null;
  const chain = () => editor.chain().focus();
  return (
    <div className={w.editor}>
      <div className={w.btool} role="toolbar" aria-label={label}>
        <select aria-label={`${label} font`} defaultValue="" onChange={(e) => { if (e.target.value) chain().setFontFamily(e.target.value).run(); else chain().unsetFontFamily().run(); }}>
          <option value="">Font</option>
          {RICH_FONTS.map((f) => <option key={f.label} value={f.id}>{f.brand ? f.label : f.label}</option>)}
        </select>
        <select aria-label={`${label} size`} defaultValue="" onChange={(e) => { if (e.target.value) chain().setFontSize(`${e.target.value}px`).run(); else chain().unsetFontSize().run(); }}>
          <option value="">Size</option>
          {RICH_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <input className={w.sizeN} aria-label={`${label} custom size`} inputMode="numeric" value={size} onChange={(e) => setSize(e.target.value.replace(/[^\d]/g, '').slice(0, 2))} onBlur={() => { const n = Number(size); if (n >= 8 && n <= 96) chain().setFontSize(`${n}px`).run(); }} />
        <span className={w.tsep} />
        {BRAND_COLORS.map((c) => (
          <button key={c.id} type="button" className={w.swatch} data-c={c.id} aria-label={`${label} color ${c.label}`} aria-pressed={editor.isActive('textStyle', { color: c.value })} onClick={() => chain().setColor(c.value).run()} />
        ))}
        <input className={w.picker} type="color" aria-label={`${label} custom color`} value={custom} onChange={(e) => { setCustom(e.target.value); chain().setColor(e.target.value).run(); }} />
        <span className={w.tsep} />
        {BRAND_COLORS.map((c) => (
          <button key={`h-${c.id}`} type="button" className={w.swatch} data-c={c.id} aria-label={`${label} highlight ${c.label}`} aria-pressed={editor.isActive('highlight', { color: wash(c.value) })} onClick={() => chain().toggleHighlight({ color: wash(c.value) }).run()} />
        ))}
        <input className={w.picker} type="color" aria-label={`${label} custom highlight`} value={custom} onChange={(e) => { setCustom(e.target.value); chain().setHighlight({ color: wash(e.target.value) }).run(); }} />
        <span className={w.tsep} />
        <button type="button" className={w.tb} aria-label={`${label} bold`} aria-pressed={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}><b>B</b></button>
        <button type="button" className={w.tb} aria-label={`${label} italic`} aria-pressed={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}><i>I</i></button>
      </div>
      <EditorContent editor={editor} className={w.prose} aria-label={label} />
    </div>
  );
}
