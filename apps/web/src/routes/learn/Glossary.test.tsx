// D-193: the underline, the tooltip, and the glossary drawer.
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GlossaryTerm } from '@ai/core/course-types';
import { GlossaryProvider, KnowCard, Marked } from './Glossary';

const owner: GlossaryTerm = {
  id: 'owner',
  term: 'Owner',
  short: 'The team leader.',
  long: 'The team leader who decides what goes out.',
  aliases: [],
};

describe('a glossary term (D-193)', () => {
  it('underlines the first use, shows the short line, and opens the long line in a drawer', () => {
    render(
      <GlossaryProvider terms={[owner]}>
        <p>
          <Marked
            text="The owner decides."
            spans={[
              { kind: 'text', text: 'The ' },
              { kind: 'term', text: 'owner', id: 'owner' },
              { kind: 'text', text: ' decides.' },
            ]}
          />
        </p>
      </GlossaryProvider>,
    );
    const word = screen.getByRole('button', { name: 'owner' });
    expect(word).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('tooltip')).toHaveTextContent('The team leader.');
    fireEvent.click(screen.getByRole('button', { name: 'More in the glossary' }));
    const dialog = screen.getByRole('dialog', { name: 'Owner' });
    expect(dialog).toHaveAttribute('data-drawer', 'open');
    expect(dialog).toHaveTextContent('The team leader who decides what goes out.');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a card lists the terms it was given, titled by the checklist item', () => {
    render(
      <KnowCard
        titleId="know"
        title="Know these"
        titleClass="t"
        rowClass="r"
        terms={[{ id: 'owner', term: 'Owner', short: 'The team leader.' }]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Know these' })).toBeInTheDocument();
    expect(screen.getByText('The team leader.')).toBeInTheDocument();
  });

  it('uses tokens, a 44px tap target under 640px, and no motion to honor', () => {
    const css = readFileSync('src/routes/learn/Glossary.module.css', 'utf8');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(css).toMatch(/max-width:\s*639px/);
    expect(css).toMatch(/min-height:\s*44px/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
