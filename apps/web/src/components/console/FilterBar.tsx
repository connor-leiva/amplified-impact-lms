import s from './FilterBar.module.css';

// The Console's filters (D-157): a row that wraps on a wide screen and stacks, full width, on a phone.
// Each control is named for assistive technology; its first option ("Any Actor") says what it filters.

export function FilterBar({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={s.bar} role="group" aria-label={label}>
      {children}
    </div>
  );
}

export interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <select className={`${s.control} ${s.select}`} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FilterSearch({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="search"
      className={`${s.control} ${s.search}`}
      aria-label={label}
      placeholder={label}
      value={value}
      maxLength={100}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
