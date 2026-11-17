import clsx from 'clsx';
import { Card } from '../r2/Card';
import { k } from '../r2/kit';
import { MASQ_COPY } from '../../routes/console/masquerade.vm';

/** The mockup's "Rules for every session" card: five numbered rows, verbatim (D-162 3b). */
export function Rules() {
  return (
    <Card title={MASQ_COPY.rules.title} pad={false}>
      {MASQ_COPY.rules.items.map((t, i) => (
        <div key={t} className={k.li} style={{ alignItems: 'flex-start' }}>
          <span className={clsx(k.me, k.tn)} style={{ width: 12, paddingTop: 2 }}>
            {i + 1}
          </span>
          <span style={{ flex: 1 }}>{t}</span>
        </div>
      ))}
    </Card>
  );
}
