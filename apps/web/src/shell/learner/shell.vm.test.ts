import { describe, expect, it } from 'vitest';
import { DESKTOP, PHONE, SHELL_LABELS, sidebarVM, themeVM } from './shell.vm';

// D-185: the learner shell's sidebar form by width and the account menu's Theme group.

describe('the learner shell’s sidebar (D-185)', () => {
  it('is the drawer on a phone and the automatic rail on a laptop, with no toggle @parity:MO-3', () => {
    for (const w of [390, PHONE - 1]) expect(sidebarVM(w, 'full')).toEqual({ form: 'drawer', toggle: null });
    for (const w of [PHONE, 1024, DESKTOP - 1])
      for (const chosen of ['full', 'rail'] as const)
        expect(sidebarVM(w, chosen)).toEqual({ form: 'rail', toggle: null });
  });

  it('on a desktop, is what the person chose, with the toggle to the other @parity:SH-6 @parity:MO-3', () => {
    expect(sidebarVM(DESKTOP, 'full')).toEqual({ form: 'full', toggle: { label: 'Collapse sidebar', next: 'rail' } });
    expect(sidebarVM(1440, 'rail')).toEqual({ form: 'rail', toggle: { label: 'Expand sidebar', next: 'full' } });
  });
});

describe('the account menu’s Theme (D-185)', () => {
  it('offers Light and Dark, each with its icon and word, the one in use checked @parity:SH-5', () => {
    expect(themeVM('dark')).toEqual({
      label: SHELL_LABELS.theme,
      choices: [
        { value: 'light', label: 'Light', icon: 'sun', checked: false },
        { value: 'dark', label: 'Dark', icon: 'moon', checked: true },
      ],
    });
    expect(themeVM('light').choices.map((c) => c.checked)).toEqual([true, false]);
  });
});
