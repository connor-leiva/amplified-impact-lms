import { createContext, useContext, useId } from 'react';
import clsx from 'clsx';
import s from './Field.module.css';

// Ported from the form fields in design-reference/Admin *.dc.html, Portal Team Hub.dc.html and
// Portal Workspace.dc.html (SCREENS § 1.5).
//
// The reference uses an implicit `<label>` wrapper that is itself the `flex-direction: column;
// gap: 6px` stack, so the label, the optional helper line, the control and the error each sit on
// their own row 6px apart. `<Field>` reproduces that stack with an explicit `htmlFor`/`id` pair so
// the association survives axe, and wires `aria-describedby` to the helper and error lines.
//
// Two variants exist because the reference keeps each screen as it is drawn (SCREENS § 1.5):
//   surface — `1px solid var(--line-strong)` on `--bg-surface`. Admin Module Builder, Portal
//             Workspace, Employee detail, Sessions, Team Tier, Dashboard.
//   sunken  — `1px solid var(--line-default)` on `--bg-sunken`. Admin Overview, Curriculum,
//             Cohorts, Learners, Vault, Announcements, Tiers, Staff, Portal Team Hub and Vault.

export type FieldVariant = 'surface' | 'sunken';

interface FieldContextValue {
  id: string;
  variant: FieldVariant;
  describedBy: string | undefined;
  invalid: boolean;
  disabled: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps {
  /** Label text, 13/500 `--text-secondary`, above the control. */
  label?: string;
  /** Optional helper line after the label, 13/400 `--text-tertiary`. */
  helper?: string;
  /** Validation error under the control, 13px `--access-locked-text`. */
  error?: string;
  /** Supplied when the control already has an id; generated otherwise. */
  id?: string;
  variant?: FieldVariant;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Field({
  label,
  helper,
  error,
  id: idProp,
  variant = 'surface',
  disabled = false,
  className,
  children,
  force = '',
}: FieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = [helper ? helperId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  return (
    <FieldContext.Provider
      value={{ id, variant, describedBy, invalid: Boolean(error), disabled: disabled || force === 'disabled' }}
    >
      <div className={clsx(s.field, className)} data-force={force || undefined}>
        {label ? (
          <label className={s.label} htmlFor={id}>
            {label}
          </label>
        ) : null}
        {helper ? (
          <span className={s.helper} id={helperId}>
            {helper}
          </span>
        ) : null}
        {children}
        {error ? (
          <div className={s.error} id={errorId}>
            {error}
          </div>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

/** Reads the enclosing `<Field>`, so a control inherits its id, variant and described-by wiring. */
function useField(variant: FieldVariant | undefined, force: string, disabled: boolean | undefined) {
  const ctx = useContext(FieldContext);
  return {
    id: ctx?.id,
    variant: variant ?? ctx?.variant ?? 'surface',
    describedBy: ctx?.describedBy,
    invalid: ctx?.invalid ?? false,
    disabled: disabled ?? ctx?.disabled ?? false,
    loading: force === 'loading',
  };
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  variant?: FieldVariant;
  className?: string;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Input({ variant, className, force = '', id, disabled, ...rest }: InputProps) {
  const f = useField(variant, force, disabled);
  if (f.loading) return <span aria-hidden="true" className={s.skeleton} data-kind="input" />;
  return (
    <input
      {...rest}
      id={id ?? f.id}
      disabled={f.disabled || undefined}
      aria-describedby={rest['aria-describedby'] ?? f.describedBy}
      aria-invalid={rest['aria-invalid'] ?? (f.invalid || undefined)}
      className={clsx(s.input, className)}
      data-variant={f.variant}
      data-force={force || undefined}
    />
  );
}

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  variant?: FieldVariant;
  className?: string;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Textarea({ variant, className, force = '', id, disabled, ...rest }: TextareaProps) {
  const f = useField(variant, force, disabled);
  if (f.loading) return <span aria-hidden="true" className={s.skeleton} data-kind="textarea" />;
  return (
    <textarea
      {...rest}
      id={id ?? f.id}
      disabled={f.disabled || undefined}
      aria-describedby={rest['aria-describedby'] ?? f.describedBy}
      aria-invalid={rest['aria-invalid'] ?? (f.invalid || undefined)}
      className={clsx(s.textarea, className)}
      data-variant={f.variant}
      data-force={force || undefined}
    />
  );
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  variant?: FieldVariant;
  className?: string;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Select({ variant, className, force = '', id, disabled, children, ...rest }: SelectProps) {
  const f = useField(variant, force, disabled);
  if (f.loading) return <span aria-hidden="true" className={s.skeleton} data-kind="input" />;
  return (
    <select
      {...rest}
      id={id ?? f.id}
      disabled={f.disabled || undefined}
      aria-describedby={rest['aria-describedby'] ?? f.describedBy}
      aria-invalid={rest['aria-invalid'] ?? (f.invalid || undefined)}
      className={clsx(s.select, className)}
      data-variant={f.variant}
      data-force={force || undefined}
    >
      {children}
    </select>
  );
}
