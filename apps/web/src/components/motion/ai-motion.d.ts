// GENERATED from ai-motion.tsx (the brand file, unchanged) by `tsc --declaration --emitDeclarationOnly` with the
// brand's own strictness. The LMS typechecks with noUncheckedIndexedAccess, which the brand file was not written
// for, and the brand file may not be edited (HANDOFF §3), so tsc reads these types and Vite bundles the .tsx
// (the `@brand/ai-motion` alias in tsconfig.json, vite.config.ts and vitest.config.ts). ai-motion.test.ts checks both.
import * as React from 'react';
/** Inline style that also takes custom properties, e.g. { '--i': 2 }. */
export type MotionStyle = React.CSSProperties & Record<`--${string}`, string | number>;
/** True when the OS asks for less motion, or `el` (default: the page) sits inside `.aim-reduced`. */
export declare function isReducedMotion(el?: Element | null): boolean;
/** Re-renders when the OS setting changes. Use it for motion you drive from JavaScript. */
export declare function useReducedMotion(): boolean;
export type Presence = 'open' | 'closing';
/** Keeps an element mounted for `exitMs` after `open` turns false, so its exit can play.
 *  Render while `mounted`; put `state` on data-state. */
export declare function usePresence(open: boolean, exitMs?: number): {
    mounted: boolean;
    state: Presence;
};
/** cubic-bezier(x1, y1, x2, y2) as a function of progress 0–1. */
export declare function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number;
/** The system's curve, cubic-bezier(.2, .7, .2, 1). */
export declare const easeBrand: (x: number) => number;
/** Counts from the last shown value to `value` on the brand curve, in step with a filling bar.
 *  Returns a float: round it when you render. */
export declare function useCountUp(value: number, durationMs?: number): number;
/** Calls `onDone` after `ms` while `running`. Hover and focus call pause and resume. */
export declare function useTimer(ms: number, onDone: () => void, running?: boolean): {
    pause: () => void;
    resume: () => void;
};
/** Plays an element's CSS animation again, such as the shake on a second failed submit. */
export declare function restartAnimation(el: Element | null): void;
/** Measures the element with aria-current="page" inside `listRef`, for .aim-nav__marker. */
export declare function useMarker(listRef: React.RefObject<HTMLElement | null>, activeKey: unknown): MotionStyle;
/** The label twice, for .aim-roll. The copy is hidden from screen readers. */
export declare function RollLabel({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
/** The dot inside a ring. `play` lands the dot and draws the ring when it mounts;
 *  `wave` adds the single ring that travels out (module complete). */
export declare function SignalMark({ size, play, wave, className }: {
    size?: number;
    play?: boolean;
    wave?: boolean;
    className?: string;
}): React.JSX.Element;
/** The hairline sweep, the one loader. It takes the text color. */
export declare function HairlineSweep({ className, style }: {
    className?: string;
    style?: React.CSSProperties;
}): React.JSX.Element;
export type AsyncState = 'idle' | 'busy' | 'done' | 'error';
export interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    state: AsyncState;
    /** Shown beside the mark when the work is done, e.g. "Signed In". */
    doneLabel?: React.ReactNode;
    size?: 'lg' | 'md' | 'sm';
    fullWidth?: boolean;
}
export declare function AsyncButton({ state, doneLabel, size, fullWidth, className, children, onClick, ...rest }: AsyncButtonProps): React.JSX.Element;
/** The page loader on the header's hairline. Put it inside the header.
 *  Leave `progress` undefined to sweep, pass 0–1 to fill. When `active` turns false it fills and fades. */
export declare function HeaderLoader({ active, progress }: {
    active: boolean;
    progress?: number;
}): React.JSX.Element | null;
export interface DrawerProps {
    open: boolean;
    onClose: () => void;
    /** Accessible name, e.g. "Lesson outline". */
    label: string;
    children: React.ReactNode;
    className?: string;
}
/** A side panel that springs in from the right. Escape and the scrim close it; focus stays inside
 *  while it's open and goes back where it was when it closes. Mark content blocks with
 *  className="aim-in" and style={{ '--i': n }} so they arrive in order. */
export declare function Drawer({ open, onClose, label, children, className }: DrawerProps): React.JSX.Element | null;
/** Holds toasts in the bottom-right corner and announces them politely. Render it once. */
export declare function ToastRegion({ children }: {
    children?: React.ReactNode;
}): React.JSX.Element;
export interface ToastProps {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    meta?: React.ReactNode;
    /** A quiet action, such as an Undo text link. */
    action?: React.ReactNode;
    /** How long it stays, in ms. Hover and focus pause it. */
    duration?: number;
}
export declare function Toast({ open, onClose, title, meta, action, duration }: ToastProps): React.JSX.Element | null;
export interface MotionFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: React.ReactNode;
    hint?: React.ReactNode;
    /** Replaces the hint, darkens the border and shakes the field. */
    error?: React.ReactNode;
    /** Draws a check. Pass text to show a confirmation in place of the hint. */
    valid?: boolean | React.ReactNode;
    /** Bump on every submit so a repeated error shakes again. */
    attempt?: number;
}
/** The system's TextField markup with focus, error and valid motion. */
export declare function MotionField({ label, hint, error, valid, attempt, id, className, ...input }: MotionFieldProps): React.JSX.Element;
/** The Academy splash. Pass the Wordmark (or Monogram) as children: it plays the system's logo
 *  intro, holds, then lifts away. Render what comes next (with .aim-rise) once onDone fires. */
export declare function Splash({ children, holdMs, onDone }: {
    children: React.ReactNode;
    holdMs?: number;
    onDone?: () => void;
}): React.JSX.Element | null;
export declare function Skeleton({ variant, style }: {
    variant?: 'title' | 'figure' | 'short' | 'block';
    style?: React.CSSProperties;
}): React.JSX.Element;
export interface NavItem {
    key: string;
    label: string;
    href?: string;
    /** Render the system's Icon; `active` paints its dot signal. */
    icon: (active: boolean) => React.ReactNode;
}
export declare function SideNav({ items, current, onSelect, label }: {
    items: NavItem[];
    current: string;
    onSelect?: (key: string) => void;
    label?: string;
}): React.JSX.Element;
export declare function LessonCheck({ title, minutes, checked, onChange }: {
    title: React.ReactNode;
    minutes: number;
    checked: boolean;
    onChange: (checked: boolean) => void;
}): React.JSX.Element;
export declare function ModuleProgress({ label, done, total }: {
    label: React.ReactNode;
    done: number;
    total: number;
}): React.JSX.Element;
/** One segment per week; `weeks` holds each week's progress, 0–1. */
export declare function WeekTrack({ weeks }: {
    weeks: number[];
}): React.JSX.Element;
/** Module complete: the mark lands and sends one ring out, then the words rise in. */
export declare function ModuleComplete({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
/** Pass the system's Icon as children: <Icon name="notifications" active={unread} />.
 *  When `unread` turns true the dot lands and one ring goes out, once. */
export declare function NotificationBell({ unread, onClick, children, size }: {
    unread: boolean;
    onClick?: () => void;
    children: React.ReactNode;
    size?: number;
}): React.JSX.Element;
/** A panel that unfolds from its trigger (the notifications list). */
export declare function Popover({ open, children, className, label }: {
    open: boolean;
    children: React.ReactNode;
    className?: string;
    label: string;
}): React.JSX.Element | null;
/** A Geist Mono status that rolls to each step, with a caret and the hairline sweep.
 *  When `done`, the sweep gives way to the mark and `doneLabel`. */
export declare function AiRun({ steps, step, done, doneLabel }: {
    steps: string[];
    step: number;
    done: boolean;
    doneLabel: string;
}): React.JSX.Element;
/** Drag state and handlers for a drop zone: spread `props` on the .aim-drop element. */
export declare function useDropZone(onFiles: (files: File[]) => void): {
    drag: boolean;
    props: {
        'data-drag': true | undefined;
        onDragEnter: (e: React.DragEvent) => void;
        onDragOver: (e: React.DragEvent) => void;
        onDragLeave: () => void;
        onDrop: (e: React.DragEvent) => void;
    };
};
export declare function FileRow({ name, size, progress, index }: {
    name: string;
    size: string;
    progress: number;
    index?: number;
}): React.JSX.Element;
