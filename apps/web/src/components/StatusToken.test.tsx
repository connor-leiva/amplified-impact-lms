import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusToken, resolveToken } from './StatusToken';

describe('StatusToken @g3', () => {
  it('build token shows label + tooltip, never color alone', () => {
    render(<StatusToken kind="build" state="in_progress" n={3} total={6} />);
    expect(screen.getByText('3 of 6 Steps')).toBeInTheDocument();
    expect(screen.getByTitle('In progress · 3 of 6 steps verified')).toBeInTheDocument();
  });

  it('compact build token uses the short label', () => {
    render(<StatusToken kind="build" state="in_progress" n={3} total={6} compact />);
    expect(screen.getByText('3/6')).toBeInTheDocument();
  });

  it('pairs every state with a text label', () => {
    const cases: [Parameters<typeof resolveToken>[0], string][] = [
      [{ kind: 'access', state: 'included' }, 'Included'],
      [{ kind: 'access', state: 'locked' }, 'Team Tier'],
      [{ kind: 'build', state: 'not_started' }, 'Not Started'],
      [{ kind: 'build', state: 'in_progress', n: 3 }, '3 of 6 Steps'],
      [{ kind: 'build', state: 'verified' }, 'Built'],
      [{ kind: 'runtime', state: 'deployed' }, 'Deployed'],
      [{ kind: 'runtime', state: 'paused' }, 'Paused'],
      [{ kind: 'runtime', state: 'needs_attention' }, 'Needs Attention'],
      [{ kind: 'runtime', state: 'not_deployed' }, 'Not Deployed'],
      [{ kind: 'step', state: 'verified' }, 'Verified'],
      [{ kind: 'step', state: 'pending' }, 'Not Verified'],
    ];
    for (const [props, label] of cases) expect(resolveToken(props).label, JSON.stringify(props)).toBe(label);
  });

  it('maps each kind to its tone and glyph', () => {
    expect(resolveToken({ kind: 'access', state: 'locked' })).toMatchObject({ tone: 'locked', icon: 'lock' });
    expect(resolveToken({ kind: 'build', state: 'in_progress', n: 1 })).toMatchObject({ tone: 'progress', icon: 'pie' });
    expect(resolveToken({ kind: 'build', state: 'verified' })).toMatchObject({ tone: 'success', icon: 'check' });
    expect(resolveToken({ kind: 'runtime', state: 'deployed' })).toMatchObject({ tone: 'success', icon: 'signal' });
    expect(resolveToken({ kind: 'runtime', state: 'needs_attention' })).toMatchObject({ tone: 'attention', icon: 'alert' });
    expect(resolveToken({ kind: 'runtime', state: 'not_deployed' })).toMatchObject({ tone: 'neutral', icon: 'minus' });
  });

  it('falls back to not_deployed for an unknown runtime state', () =>
    expect(resolveToken({ kind: 'runtime', state: 'nonsense' })).toMatchObject({ label: 'Not Deployed', icon: 'minus' }));

  it('lets an explicit label and tone override a resolved kind', () => {
    const r = resolveToken({ kind: 'build', state: 'verified', label: 'Shipped', tone: 'accent' });
    expect(r.label).toBe('Shipped');
    expect(r.tone).toBe('accent');
  });

  it('renders a custom token from its own label, tone and icon', () => {
    render(<StatusToken kind="custom" tone="neutral" icon="clock" label="Opens Dec 14" />);
    expect(screen.getByText('Opens Dec 14')).toBeInTheDocument();
  });

  it('uses a pulsing dot instead of a glyph for the live tone', () => {
    const { container } = render(<StatusToken kind="custom" tone="live" label="Live Now" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('Live Now')).toBeInTheDocument();
  });

  it('draws the pie wedge in proportion to the steps verified', () => {
    const d = (n: number) => {
      const { container } = render(<StatusToken kind="build" state="in_progress" n={n} total={6} />);
      return container.querySelectorAll('path')[1]!.getAttribute('d') ?? '';
    };
    expect(d(0)).toBe(''); // nothing verified yet: no wedge
    expect(d(3)).toContain('M8 8L8 4.4A3.6 3.6 0 0 1'); // half turn, small-arc flag
    expect(d(5)).toContain('A3.6 3.6 0 1 1'); // past halfway, large-arc flag
    // A full ring, not a wedge, once every step is verified.
    const { container } = render(<StatusToken kind="build" state="in_progress" n={6} total={6} />);
    expect(container.querySelectorAll('path')[1]!.getAttribute('d')).toBe('M8 4.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 1 0 0-7.2');
  });

  it('renders a skeleton at the same height when loading', () => {
    const { container } = render(<StatusToken kind="build" state="in_progress" n={3} force="loading" />);
    const sk = container.firstElementChild as HTMLElement;
    expect(sk.getAttribute('aria-hidden')).toBe('true');
    expect(sk.style.height).toBe('22px');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('honours an explicit title over the default tooltip', () => {
    render(<StatusToken kind="build" state="verified" title="Marketing AI Employee · Built" />);
    expect(screen.getByTitle('Marketing AI Employee · Built')).toBeInTheDocument();
  });
});
