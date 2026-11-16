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
//
// R2-2 adds the rest of the mockup's `Table`: `onMove` (a drag handle per row, Alt with an arrow key
// on it, and Move up / Move down in the phone menu), `quick` (icon buttons that show on hover or
// focus), `primary` (an always-visible control beside the "…"), `actionsWidth` (`aw`), a card head
// (`title`, `right`) and `card` (a screen's own phone card).

export interface CellFit {
  drop: boolean;
  phone: boolean;
  /** The table's own width (`tw`), for a cell that changes with it (R2-2). */
  tw: number;
}

/** A hover action (`quick`): an icon button with its name. */
export interface QuickAction {
  label: string;
  icon: IconName;
  onClick: () => void;
}

export interface Column<R> extends FitColumn {
  key: string;
  label: string;
  /** Right-aligned tabular figures (`num`). */
  num?: boolean;
  mono?: boolean;
  /** Not sortable (`ns`). */
  noSort?: boolean;
  /** The cell may draw past its column (`ov`), as a pill's menu does (R2-2). */
  overflow?: boolean;
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
  /** Reorder: a row moved from `from` to `to` (R2-2). Headers do not sort while rows can move. */
  onMove?: (from: number, to: number) => void;
  /** Icon buttons shown on hover or focus, before the "…" (R2-2). */
  quick?: (r: R) => readonly QuickAction[];
  /** An always-visible control in the actions cell, or null (R2-2). */
  primary?: (r: R) => ReactNode;
  /** The actions track (the mockup's `aw`): 32px by default. */
  actionsWidth?: string;
  /** A card head: the title and what sits at its right (R2-2). */
  title?: string;
  right?: ReactNode;
  /** A screen's own phone card: the row, its index, its phone menu and whether that opens upward (R2-2). */
  card?: (r: R, i: number, items: readonly MenuEntry[], up: boolean) => ReactNode;
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
  onMove,
  quick,
  primary,
  actionsWidth,
  title,
  right,
  card,
}: TableProps<R>) {
  const vw = useViewportWidth();
  const phone = vw < 768;
  const laptop = vw >= 768 && vw < 1200;
  const box = useRef<HTMLElement | null>(null);
  const [tw, setTw] = useState(9999);
  const [sort, setSort] = useState<{ i: number; dir: 1 | -1 } | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

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
  const hasActions = !!(menu || quick || primary);
  const actions = hasActions ? (actionsWidth ?? '32px') : null;
  const f = fit(cols, tw, { select, actions, laptop, phone, move: !!onMove });
  const cellFit: CellFit = { drop: f.drop, phone, tw };
  const open = (r: R) => (onRow ? onRow(r) : undefined);
  const click = (e: MouseEvent, r: R) => {
    if (!(e.target as HTMLElement).closest('button,a,input,select,label')) open(r);
  };
  const keys = rows.map(rowKey);
  const chosen = keys.filter((x) => picked[x]);
  const clear = () => setPicked({});
  const data =
    sort && !onMove
      ? [...rows].sort((a, b) => {
          const c = f.visible[sort.i]!;
          const x = c.value(a);
          const y = c.value(b);
          return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
        })
      : rows;

  const cell = (c: Column<R>, r: R): ReactNode => (c.cell ? c.cell(r, cellFit) : c.value(r));
  /** The phone's one menu (the mockup's `pm`): the hover actions, Move up / Move down, then `menu`. */
  const phoneItems = (r: R, i: number): MenuEntry[] => [
    ...(quick ? quick(r).map((q) => ({ label: q.label, icon: q.icon, onSelect: q.onClick })) : []),
    ...(onMove && i > 0 ? [{ label: 'Move up', icon: 'r2Up' as const, onSelect: () => onMove(i, i - 1) }] : []),
    ...(onMove && i < rows.length - 1
      ? [{ label: 'Move down', icon: 'r2Down' as const, onSelect: () => onMove(i, i + 1) }]
      : []),
    ...(onMove && menu ? (['separator'] as const) : []),
    ...(menu ? menu(r) : []),
  ];
  const more = (r: R, i: number, up: boolean, items: readonly MenuEntry[] | null = menu ? menu(r) : null) =>
    items && items.length ? (
      <Menu
        label={`Actions for ${String(cols[0]!.value(r))}`}
        items={items}
        placement={up ? 'above' : 'below-right'}
        trigger={(t) => (
          <button type="button" className={k.ib} aria-label="More actions" {...t.props} onClick={t.toggle}>
            <Icon name="r2More" size={16} strokeWidth={2.6} />
          </button>
        )}
      />
    ) : items ? (
      // Nothing this row can do (R2-2b): the "…" is drawn and does nothing, as the mockup draws it.
      <button type="button" className={k.ib} aria-label="More actions" aria-disabled="true" title="Not available yet">
        <Icon name="r2More" size={16} strokeWidth={2.6} />
      </button>
    ) : null;

  const head = !phone ? (
    <div className={k.th} role="row" style={{ gridTemplateColumns: f.template }}>
      {onMove ? (
        <span role="columnheader">
          <span className={k.srOnly}>Order</span>
        </span>
      ) : null}
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
          {c.noSort || onMove ? (
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
      {hasActions ? (
        <span role="columnheader">
          <span className={k.srOnly}>Actions</span>
        </span>
      ) : null}
    </div>
  ) : null;

  const wrap = (body: ReactNode) => (
    <section className={k.cd} ref={box} aria-label={label}>
      {title ? (
        <div className={k.cdh}>
          <h2 className={clsx(k.h2, k.sp)}>{title}</h2>
          {right}
        </div>
      ) : null}
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

  if (phone && card)
    return wrap(
      <div>
        {data.map((r, i) => (
          <div key={rowKey(r)} className={k.pc}>
            {card(r, i, phoneItems(r, i), data.length > 3 && i >= data.length - 2)}
          </div>
        ))}
      </div>,
    );

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
                {menu || onMove ? (
                  <span className={k.pcMenu}>
                    {more(r, i, data.length > 3 && i >= data.length - 2, phoneItems(r, i))}
                  </span>
                ) : null}
              </div>
              {cols.slice(1).map((c) => (
                <div key={c.key} className={k.pcR}>
                  <span className={k.mu}>{c.label}</span>
                  <span className={c.mono ? k.mo : undefined}>{cell(c, r)}</span>
                </div>
              ))}
              {primary && primary(r) ? <div className={clsx(k.row, k.pcPrimary)}>{primary(r)}</div> : null}
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
              className={clsx(
                k.tr,
                (onRow || rowHref) && k.ck,
                picked[id] && k.sel,
                drag === i && k.drg,
                over === i && drag !== null && drag !== i && k.over,
              )}
              style={{ gridTemplateColumns: f.template }}
              onClick={(e) => click(e, r)}
              onDragOver={
                onMove
                  ? (e) => {
                      e.preventDefault();
                      setOver(i);
                    }
                  : undefined
              }
              onDrop={
                onMove
                  ? () => {
                      if (drag !== null && drag !== i) onMove(drag, i);
                      setDrag(null);
                      setOver(null);
                    }
                  : undefined
              }
            >
              {onMove ? (
                <span role="cell" className={k.box1}>
                  <button
                    type="button"
                    className={k.grip}
                    draggable
                    aria-label={`Reorder row ${i + 1}. Alt plus arrow keys move it.`}
                    title="Drag to reorder"
                    onDragStart={() => setDrag(i)}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver(null);
                    }}
                    onKeyDown={(e) => {
                      if (!e.altKey) return;
                      if (e.key === 'ArrowUp' && i > 0) {
                        e.preventDefault();
                        onMove(i, i - 1);
                      }
                      if (e.key === 'ArrowDown' && i < data.length - 1) {
                        e.preventDefault();
                        onMove(i, i + 1);
                      }
                    }}
                  >
                    <Icon name="r2Grip" size={14} strokeWidth={2.6} />
                  </button>
                </span>
              ) : null}
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
                <div
                  key={c.key}
                  role="cell"
                  className={clsx(k.cl, c.mono && k.mo, c.num && k.r, c.num && k.tn, c.overflow && k.ov)}
                >
                  {j === 0 && rowHref && !c.cell ? (
                    <Link to={rowHref(r)} className={clsx(k.lk, k.el, c.mono && k.mo)}>
                      {cell(c, r)}
                    </Link>
                  ) : (
                    cell(c, r)
                  )}
                </div>
              ))}
              {hasActions ? (
                <div role="cell" className={k.ra}>
                  {quick ? (
                    <span className={k.hv}>
                      {quick(r).map((q) => (
                        <button
                          key={q.label}
                          type="button"
                          className={k.ib}
                          aria-label={q.label}
                          title={q.label}
                          onClick={q.onClick}
                        >
                          <Icon name={q.icon} size={16} strokeWidth={1.75} />
                        </button>
                      ))}
                    </span>
                  ) : null}
                  {primary ? primary(r) : null}
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
