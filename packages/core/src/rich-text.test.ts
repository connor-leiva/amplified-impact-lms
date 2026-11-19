import { describe, expect, it } from 'vitest';
import type { GlossarySpan } from './glossary';
import { paintRich, sanitizeRich, storedRich, stripRich } from './rich-text';
import type { RichText } from './rich-text';

const doc: RichText = {
  type: 'doc',
  content: [{
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Your ' },
      { type: 'text', text: 'operator', marks: [{ type: 'textStyle', attrs: { color: 'var(--r2-for)', fontFamily: 'Georgia, serif' } }, { type: 'bold' }] },
      { type: 'text', text: ' reads it.' },
    ],
  }],
};

describe('rich text', () => {
  it('drops marks and nodes the editor is not allowed to store', () => {
    const clean = sanitizeRich({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Keep', marks: [{ type: 'bold' }, { type: 'script' }, { type: 'textStyle', attrs: { color: 'red', fontSize: '22px', fontFamily: 'Comic Sans' } }] },
          { type: 'image', attrs: { src: 'https://evil.example' } },
        ],
      }, { type: 'heading', content: [{ type: 'text', text: 'No' }] }],
    });
    expect(clean).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Keep', marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { fontSize: '22px' } }] }] }],
    });
  });

  it('stores a styled doc and skips a plain one-line paragraph', () => {
    expect(stripRich(doc)).toBe('Your operator reads it.');
    expect(storedRich(doc)?.content[0]?.content?.[1]?.marks).toHaveLength(2);
    expect(storedRich({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] })).toBeUndefined();
  });

  it('keeps a glossary term on the styled word', () => {
    const spans: GlossarySpan[] = [
      { kind: 'text', text: 'Your ' },
      { kind: 'term', text: 'operator', id: 'operator' },
      { kind: 'text', text: ' reads it.' },
    ];
    const [line] = paintRich(doc, spans);
    expect(line?.[1]).toMatchObject({ text: 'operator', termId: 'operator' });
    expect(line?.[1]?.marks.map((m) => m.type)).toEqual(['textStyle', 'bold']);
  });
});
