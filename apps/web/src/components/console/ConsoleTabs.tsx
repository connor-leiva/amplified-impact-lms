import { Tabs } from '../primitives/Tabs';
import s from './ConsoleTabs.module.css';

// The Console's tabs (D-158, spec § 8 "ConsoleTabs"): underline tabs where there is room, and one
// 44px select where there is not (under 768px, or in a container under 680px, such as beside the
// sidebar at 768 to 1023), so a record's five tabs never scroll sideways. Both drive the same value;
// only one is shown, and the hidden one is out of the accessibility tree (`display: none`).

export interface ConsoleTab {
  id: string;
  label: string;
}

export interface ConsoleTabsProps {
  tabs: ConsoleTab[];
  value: string;
  onChange: (id: string) => void;
  /** The tab list's and the select's accessible name. */
  label: string;
}

export function ConsoleTabs({ tabs, value, onChange, label }: ConsoleTabsProps) {
  return (
    <div className={s.wrap}>
      <div className={s.tabs}>
        <Tabs tabs={tabs} value={value} onChange={onChange} label={label} />
      </div>
      <select className={s.select} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {tabs.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
