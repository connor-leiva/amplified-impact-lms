// The Library's role tabs: the ARIA tabs pattern. A click or Enter shows a role's skills; the arrow keys
// move between roles and show each (automatic activation), Home and End jump to the first and last.

export function initTabs(root: HTMLElement): void {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls') ?? ''));

  const select = (i: number, focus: boolean) => {
    tabs.forEach((t, j) => {
      const on = j === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      t.classList.toggle('is-on', on);
      const panel = panels[j];
      if (panel) panel.hidden = !on;
    });
    if (focus) tabs[i]!.focus();
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i, false));
    t.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const to =
        e.key === 'ArrowRight' || e.key === 'ArrowDown'
          ? (i + 1) % n
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
            ? (i - 1 + n) % n
            : e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? n - 1
                : -1;
      if (to < 0) return;
      e.preventDefault();
      select(to, true);
    });
  });
}
