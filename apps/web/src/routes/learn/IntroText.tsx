// D-253: an intake intro as staff typed it, in its paragraphs, lists and bold (`introBlocks`). React elements only:
// every run is text, so nothing staff type is read as markup. Used by the intake page and the v3 form drawer.
// One paragraph of one line renders as it did before: the same <p>, the same class, the words as typed.
// The spacing is inline so it holds in the v3 drawer, whose stylesheet is the package's, byte for byte (D-225).

import type { CSSProperties, ReactNode } from 'react';
import { introBlocks } from '@ai/core/intake';
import type { IntroRun } from '@ai/core/intake';

const STACK: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };
const FLAT: CSSProperties = { margin: 0 };
const LIST: CSSProperties = { margin: 0, paddingLeft: 20, listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: 4 };
const BOLD: CSSProperties = { fontWeight: 600 };

function runs(list: IntroRun[]): ReactNode[] {
  return list.map((r, i) => (r.bold ? <strong key={i} style={BOLD}>{r.text}</strong> : r.text));
}

function lines(list: IntroRun[][]): ReactNode[] {
  return list.flatMap((line, i) => (i ? [<br key={`br${i}`} />, ...runs(line)] : runs(line)));
}

export function IntroText({ text, className, style }: { text: string | undefined; className?: string; style?: CSSProperties }) {
  const blocks = introBlocks(text);
  if (!blocks.length) return null;
  const [only] = blocks;
  if (blocks.length === 1 && only?.kind === 'paragraph') {
    return (
      <p className={className} style={style}>
        {lines(only.lines)}
      </p>
    );
  }
  return (
    <div className={className} style={{ ...style, ...STACK }}>
      {blocks.map((b, i) =>
        b.kind === 'paragraph' ? (
          <p key={i} style={FLAT}>
            {lines(b.lines)}
          </p>
        ) : (
          <ul key={i} style={LIST}>
            {b.items.map((item, n) => (
              <li key={n}>{runs(item)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
