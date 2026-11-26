// D-257: an intake intro renders in the lines staff typed, as React elements, and one paragraph renders as before.
import { render } from '@testing-library/react';
import { IntroText } from './IntroText';

const html = (text: string | undefined, className = 'x') => render(<IntroText text={text} className={className} />).container.innerHTML;

describe('IntroText (D-257)', () => {
  it('renders a one-paragraph intro exactly as the page did: one <p>, its class, the words', () => {
    const intro = "The goal of this intake is that we know your team before we build anything with you. Short answers are fine.";
    expect(html(intro)).toBe(render(<p className="x">{intro}</p>).container.innerHTML);
  });

  it('renders nothing for no intro', () => {
    expect(html(undefined)).toBe('');
    expect(html('  \n ')).toBe('');
  });

  it('renders paragraphs, a line break, a bulleted list and bold', () => {
    const view = render(<IntroText text={'Welcome.\nShort answers are fine.\n\nThree words you’ll see a lot:\n- **AI Implementer.** Sets it up.\n- **Draft.** Nothing sends.'} className="x" />);
    const root = view.container.firstElementChild!;
    expect(root.tagName).toBe('DIV');
    expect(root).toHaveClass('x');
    expect([...root.children].map((c) => c.tagName)).toEqual(['P', 'P', 'UL']);
    expect(root.children[0]!.innerHTML).toBe('Welcome.<br>Short answers are fine.');
    const items = [...root.querySelectorAll('li')];
    expect(items.map((li) => li.textContent)).toEqual(['AI Implementer. Sets it up.', 'Draft. Nothing sends.']);
    expect(items.map((li) => li.querySelector('strong')?.textContent)).toEqual(['AI Implementer.', 'Draft.']);
  });

  it('renders HTML as text, never as markup', () => {
    const view = render(<IntroText text={'<b>Hi</b> <img src="x" onerror="alert(1)"> <a href="https://example.com">link</a>'} />);
    expect(view.container.querySelector('b, img, a, script')).toBeNull();
    expect(view.container.textContent).toBe('<b>Hi</b> <img src="x" onerror="alert(1)"> <a href="https://example.com">link</a>');
  });
});
