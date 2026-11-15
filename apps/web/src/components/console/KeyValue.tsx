import s from './KeyValue.module.css';

// Label and value pairs (D-157): two columns where there is room, one under 480px (a phone, or the
// detail drawer on one). A `pre` value is a JSON block, kept as written; a `mono` one is an id.

export interface KeyValuePair {
  label: string;
  value: string;
  mono?: boolean;
  pre?: boolean;
}

export function KeyValue({ pairs }: { pairs: KeyValuePair[] }) {
  return (
    <div className={s.wrap}>
      <dl className={s.kv}>
        {pairs.map((p) => (
          <div key={p.label} className={s.pair}>
            <dt className={s.dt}>{p.label}</dt>
            <dd className={`${s.dd}${p.mono ? ` ${s.mono}` : ''}`}>{p.pre ? <pre className={s.pre}>{p.value}</pre> : p.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
