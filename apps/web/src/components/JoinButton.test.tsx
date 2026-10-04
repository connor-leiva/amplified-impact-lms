import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinButton } from './JoinButton';

describe('JoinButton @g3', () => {
  it('disabled join cannot fire and explains why', async () => {
    const onJoin = vi.fn();
    render(<JoinButton mode="disabled" hint="Opens 15 Min Before" onJoin={onJoin} />);
    const btn = screen.getByRole('button', { name: /Join Session/ });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(btn).catch(() => {});
    expect(onJoin).not.toHaveBeenCalled();
    expect(screen.getByText('Opens 15 Min Before')).toBeVisible();
  });

  it('labels itself by mode', () => {
    const { unmount } = render(<JoinButton mode="ready" />);
    expect(screen.getByRole('button', { name: /Join Session/ })).toBeInTheDocument();
    unmount();
    render(<JoinButton mode="live" />);
    expect(screen.getByRole('button', { name: /Join Now/ })).toBeInTheDocument();
  });

  it('shows the Zoom progress label while opening and blocks a second click', async () => {
    const onJoin = vi.fn();
    render(<JoinButton mode="loading" onJoin={onJoin} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Opening Zoom…');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(btn).catch(() => {});
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('fires onJoin when the window is open', async () => {
    const onJoin = vi.fn();
    render(<JoinButton mode="ready" onJoin={onJoin} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it('keeps the Zoom URL out of the DOM until the window opens', () => {
    const { container, unmount } = render(<JoinButton mode="disabled" url="https://zoom.us/j/123" hint="Opens 15 Min Before" />);
    expect(container.innerHTML).not.toContain('zoom.us');
    unmount();
    // Once open, the URL is only a tooltip; onJoin still resolves it at click time.
    render(<JoinButton mode="ready" url="https://zoom.us/j/123" />);
    expect(screen.getByTitle('https://zoom.us/j/123')).toBeInTheDocument();
  });

  it('shows the hint only while the window is shut', () => {
    const { unmount } = render(<JoinButton mode="ready" hint="Opens 15 Min Before" />);
    expect(screen.queryByText('Opens 15 Min Before')).toBeNull();
    unmount();
    render(<JoinButton mode="disabled" hint="Opens 15 Min Before" />);
    expect(screen.getByText('Opens 15 Min Before')).toBeVisible();
  });

  it('force overrides the mode for the states sheet', () => {
    const { unmount } = render(<JoinButton mode="ready" force="disabled" hint="Opens 15 Min Before" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    unmount();
    render(<JoinButton mode="ready" force="loading" />);
    expect(screen.getByRole('button')).toHaveTextContent('Opening Zoom…');
  });
});
