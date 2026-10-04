import { createContext, useContext } from 'react';

/**
 * What a screen may ask of the shell.
 *
 * The Locked Employee Preview lives in the shell, because it opens from the sidebar, from the
 * dashboard cards, from the vault and from a guarded route — and it must never navigate
 * (SCREENS § 2.4). Screens call `openLocked(moduleId)` rather than owning a modal each.
 */
export interface ShellApi {
  /** Open the Locked Employee Preview on the given AI Employee. Never navigates. */
  openLocked: (moduleId: string) => void;
  /** Whether the sidebar is currently a drawer, a rail, or in flow. Drives responsive screen bits. */
  sidebarMode: 'full' | 'rail' | 'drawer';
  /** Viewport width, tracked by the shell so screens do not each add a resize listener. */
  vw: number;
}

const Ctx = createContext<ShellApi>({
  openLocked: () => {},
  sidebarMode: 'full',
  vw: 1440,
});

export const ShellProvider = Ctx.Provider;
export const useShell = (): ShellApi => useContext(Ctx);
