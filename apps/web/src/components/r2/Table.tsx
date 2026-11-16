import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import type { IconName } from '@ai/core';
import { Icon } from '../Icon';
import { useViewportWidth } from '../../shell/hooks';
import { Button } from './Button';
import { Empty } from './Empty';
import { Menu } from './Menu';
import type { MenuEntry } from './Menu';
import { k } from './kit';
import { fit } from './table';
import type { FitColumn } from './table';

// The R2 table (D-160 R2-1c): the mockup's `Table`, grid rows in a card. Columns fit the card's own
// width (BUILD-SPEC § 2: a `hideLap` column drops when the table can't hold it at laptop width, and
// `minmax` tracks tighten after that); headers sort; a row opens on click; a "…" menu holds its
// actions; `select` adds checkboxes and the bulk bar. On a phone each row is a card of label and
// value pairs, the first column its title.

export interface CellFit {
  drop: boolean;
  phone: boolean;
}

export interface Column<R> extends FitColumn {
  key: string;
  label: string;
  /** Right-aligned tabular figures (`num`). */
  num?: boolean;
  mono?: boolean;
  /** Not sortable (`ns`). */
  noSort?: boolean;
  /** The sort value, and the cell when there is no `cell`. */
  value: (r: R) => string | number;
  cell?: (r: R, f: CellFit) => ReactNode;
}

export interface TableProps<R> {
  cols: readonly Column<R>[];
  rows: readonly R[];
  rowKey: (r: R) => string;
  /** The table's accessible name. */
  label: string;
  /** Where a row opens: its first column becomes a link to it, and a click anywhere on it goes there. */
  rowHref?: (r: R) => string;
  onRow?: (r: R) => void;
  menu?: (r: R) => readonly MenuEntry[];
  /** Checkboxes, and what the bulk bar offers for the selected keys. */
  bulk?: (keys: string[], clear: () => void) => ReactNode;
  empty: { icon: IconName; title: string; body?: string };
  /** The rows are empty because of filters: "No matches". */
  filtered?: boolean;
  loading?: boolean;
  /** Below the rows: "Load more". */
  footer?: ReactNode;
}

export function Table<R>({
  cols,
  rows,
  rowKey,
  label,
  rowHref,
  onRow,
  menu,
  bulk,
  empty,
  filtered,
  loading,
  footer,
}: TableProps<R>) {
  const vw = useViewportWidth();
  const phone = vw < 768;
  const laptop = vw >= 768 && vw < 1200;
  const box = useRef<HTMLElement | null>(null);
  const [tw, setTw] = useState(9999);
  const [sort, setSort] = useState<{ i: number; dir: 1 | -1 } | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setTw(el.clientWidth);
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const select = !!bulk;
  const actions = menu ? '32px' : null;
  const f = fit(cols, tw, { select, actions, laptop, phone });
  const cellFit: CellFit = { drop: f.drop, phone };
  const open = (r: R) => (onRow ? onRow(r) : undefined);
  const click = (e: MouseEvent, r: R) => {
    if (!(e.target as HTMLElement).closest('button,a,input,select,label')) open(r);
  };
  const keys = rows.map(rowKey);
  const chosen = keys.filter((x) => picked[x]);
  const clear = () => setPicked({});
  const data = sort
    ? [...rows].sort((a, b) => {
        const c = f.visible[sort.i]!;
        const x = c.value(a);
        const y = c.value(b);
        return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
      })
    : rows;

  const cell = (c: Column<R>, r: R): ReactNode => (c.cell ? c.cell(r, cellFit) : c.value(r));
  const more = (r: R, i: number, up: boolean) =>
    menu ? (
      <Menu
        label={`Actions for ${String(cols[0]!.value(r))}`}
        items={menu(r)}
        placement={up ? 'above' : 'below-right'}
        trigger={(t) => (
          <button type="button" className={k.ib} aria-label="More actions" {...t.props} onClick={t.toggle}>
            <Icon name="r2More" size={16} strokeWidth={2.6} />
          </button>
        )}
      />
    ) : null;

  const head = !phone ? (
    <div className={k.th} role="row" style={{ gridTemplateColumns: f.template }}>
      {select ? (
        <span role="columnheader" className={k.box1}>
          <input
            type="checkbox"
            className={k.chk}
            aria-label="Select all"
            checked={rows.length > 0 && keys.every((x) => picked[x])}
            onChange={(e) => setPicked(e.target.checked ? Object.fromEntries(keys.map((x) => [x, true])) : {})}
          />
        </span>
      ) : null}
      {f.visible.map((c, i) => (
        <span
          key={c.key}
          role="columnheader"
          className={c.num ? k.r : undefined}
          aria-sort={sort && sort.i === i ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined}
        >
          {c.noSort ? (
            c.label
          ) : (
            <button
              type="button"
              className={k.sort}
              onClick={() => setSort({ i, dir: sort && sort.i === i ? (-sort.dir as 1 | -1) : 1 })}
            >
              {c.label}
              <span className={clsx(k.ar, sort && sort.i === i && k.on)}>
                <Icon name={sort && sort.i === i && sort.dir < 0 ? 'r2Down' : 'r2Up'} size={12} strokeWidth={1.75} />
              </span>
            </button>
          )}
        </span>
      ))}
      {menu ? (
        <span role="columnheader">
          <span className={k.srOnly}>Actions</span>
        </span>
      ) : null}
    </div>
  ) : null;

  const wrap = (body: ReactNode) => (
    <section className={k.cd} ref={box} aria-label={label}>
      {body}
      {footer}
    </section>
  );

  if (loading)
    return wrap(
      <div role="status" aria-busy="true" aria-label="Loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={k.tr} style={{ gridTemplateColumns: phone ? '1fr' : f.template }}>
            {(phone ? [0] : f.template.split(' ')).map((_, j) => (
              <div key={j} className={k.sk} style={{ width: `${40 + ((i * 7 + j * 13) % 50)}%` }} />
            ))}
          </div>
        ))}
      </div>,
    );
  if (!rows.length)
    return wrap(
      filtered ? (
        <Empty icon="r2Search" title="No matches" body="Try a different search or clear the filters." />
      ) : (
        <Empty icon={empty.icon} title={empty.title} body={empty.body} />
      ),
    );

  const bulkBar =
    bulk && chosen.length > 0 ? (
      <div className={clsx(k.li, k.bulk)}>
        <span className={k.w5}>{chosen.length} selected</span>
        <span className={k.sp} />
        {bulk(chosen, clear)}
        <Button kind="quiet" onClick={clear}>
          Clear
        </Button>
      </div>
    ) : null;

  if (phone)
    return wrap(
      <div>
        {bulkBar}
        {data.map((r, i) => {
          const id = rowKey(r);
          return (
            <div key={id} className={k.pc} onClick={(e) => click(e, r)}>
              <div className={clsx(k.row, k.nw, k.pcHead)}>
                {select ? (
                  <label className={k.pick}>
                    <input
                      type="checkbox"
                      className={k.chk}
                      checked={!!picked[id]}
                      readOnly
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <input
                      type="checkbox"
                      className={k.hit}
                      aria-label="Select row"
                      checked={!!picked[id]}
                      onChange={(e) => setPicked({ ...picked, [id]: e.target.checked })}
                    />
                  </label>
                ) : null}
                <div className={clsx(k.w6, cols[0]!.mono && k.mo, k.pcTitle)}>{cell(cols[0]!, r)}</div>
                {menu ? <span className={k.pcMenu}>{more(r, i, data.length > 3 && i >= data.length - 2)}</span> : null}
              </div>
              {cols.slice(1).map((c) => (
                <div key={c.key} className={k.pcR}>
                  <span className={k.mu}>{c.label}</span>
                  <span className={c.mono ? k.mo : undefined}>{cell(c, r)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>,
    );

  return wrap(
    <div>
      {bulkBar}
      <div role="table" aria-label={label}>
        {head}
        {data.map((r, i) => {
          const id = rowKey(r);
          return (
            <div
              key={id}
              role="row"
              className={clsx(k.tr, (onRow || rowHref) && k.ck, picked[id] && k.sel)}
              style={{ gridTemplateColumns: f.template }}
              onClick={(e) => click(e, r)}
            >
              {select ? (
                <span role="cell" className={k.box1}>
                  <input
                    type="checkbox"
                    className={k.chk}
                    aria-label="Select row"
                    checked={!!picked[id]}
                    onChange={(e) => setPicked({ ...picked, [id]: e.target.checked })}
                  />
                </span>
              ) : null}
              {f.visible.map((c, j) => (
                <div key={c.key} role="cell" className={clsx(k.cl, c.mono && k.mo, c.num && k.r, c.num && k.tn)}>
                  {j === 0 && rowHref && !c.cell ? (
                    <Link to={rowHref(r)} className={clsx(k.lk, k.el, c.mono && k.mo)}>
                      {cell(c, r)}
                    </Link>
                  ) : (
                    cell(c, r)
                  )}
                </div>
              ))}
              {menu ? (
                <div role="cell" className={k.ra}>
                  {more(r, i, data.length > 5 && i >= data.length - 2)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>,
  );
}
