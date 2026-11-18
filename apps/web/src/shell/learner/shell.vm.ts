// D-185: the learner shell's theme switch and desktop sidebar toggle, restored from the current portal
// (`../ProfileMenu.tsx`'s Theme, `../AppShell.tsx`'s Collapse Sidebar), in the learner portal v2's words.
//
// The sidebar has three forms by width, as before: the drawer on a phone (under 768px), the 64px rail on a
// laptop (768 to 1199px, automatic, no toggle), and on a desktop (1200px and wider) the full sidebar or the
// rail, as the person last chose with the toggle.

export const SHELL_LABELS = {
  theme: 'Theme',
  light: 'Light',
  dark: 'Dark',
  collapseSidebar: 'Collapse sidebar',
  expandSidebar: 'Expand sidebar',
} as const;

/** The widths the shell changes form at (the mockup's phone and laptop frames). */
export const PHONE = 768;
export const DESKTOP = 1200;

export type SidebarForm = 'drawer' | 'rail' | 'full';
export type Theme = 'light' | 'dark';

export interface SidebarVM {
  form: SidebarForm;
  /** The desktop toggle, or null where there is none (a phone, a laptop). */
  toggle: { label: string; next: 'full' | 'rail' } | null;
}

/** The sidebar's form at a width, from the person's own choice (which counts only on a desktop). */
export function sidebarVM(width: number, chosen: 'full' | 'rail'): SidebarVM {
  if (width < PHONE) return { form: 'drawer', toggle: null };
  if (width < DESKTOP) return { form: 'rail', toggle: null };
  return chosen === 'rail'
    ? { form: 'rail', toggle: { label: SHELL_LABELS.expandSidebar, next: 'full' } }
    : { form: 'full', toggle: { label: SHELL_LABELS.collapseSidebar, next: 'rail' } };
}

export interface ThemeChoiceVM {
  value: Theme;
  label: string;
  icon: 'sun' | 'moon';
  checked: boolean;
}

/** The account menu's Theme group: Light and Dark, the one in use checked. */
export function themeVM(theme: Theme): { label: string; choices: ThemeChoiceVM[] } {
  return {
    label: SHELL_LABELS.theme,
    choices: [
      { value: 'light', label: SHELL_LABELS.light, icon: 'sun', checked: theme === 'light' },
      { value: 'dark', label: SHELL_LABELS.dark, icon: 'moon', checked: theme === 'dark' },
    ],
  };
}
