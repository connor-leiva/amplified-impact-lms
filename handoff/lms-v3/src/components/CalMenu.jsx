// "Add to calendar": one button with the choices inside it (it replaces three separate links).
// Motion (brand 14): the panel unfolds from its trigger on the spring and leaves faster (.aim-pop, Popover).
// Escape, a click outside, or choosing an item closes it.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';
import { Popover, RollLabel } from '../motion/ai-motion';

export function CalMenu({ label, items, variant = 'wk-btn-secondary', align }) {
  const [open, setOpen] = useState(false);
  const host = useRef(null), btn = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const click = (e) => { if (!host.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('click', click); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('click', click); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <span className="sc-cal" data-align={align} ref={host}>
      <button ref={btn} className={'wk-btn ' + variant} type="button" aria-haspopup="true" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)}>
        <Icon name="calplus" /><RollLabel>{label}</RollLabel><Icon name="chev" />
      </button>
      <Popover open={open} className="sc-menu" label={label}>
        {items.map((it) => (
          <a key={it.label} href={it.href} onClick={(e) => { if (it.href === '#') e.preventDefault(); it.onClick?.(); setOpen(false); }}><Icon name={it.icon} size={16} />{it.label}</a>
        ))}
      </Popover>
    </span>
  );
}
