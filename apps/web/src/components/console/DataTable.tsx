import { Button } from '../primitives/Button';
import s from './DataTable.module.css';

// The Console's table (D-157, spec § 8). One markup for both layouts: a table on a wide screen, and
// below 768px (or in a container under 600px, such as the 768-1023 range beside the sidebar) a card
// per row, each cell after the first labelled with its column's own header text (`data-label`), as
// D-156 did for the admin screens. Nothing scrolls sideways.
//
// The first column can open the row (`onOpen`): it is then a button, named by `openLabel`. A list
// with more pages shows Load More under the rows.

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  /** Geist Mono: ids, actions, addresses. */
  mono?: boolean;
  /** Keep on one line in the table layout (times, badges). */
  nowrap?: boolean;
}

export interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onOpen?: (row: T) => void;
  openLabel?: (row: T) => string;
  loadMore?: { label: string; busy: boolean; busyLabel: string; onClick: () => void } | null;
}

export function DataTable<T>({ caption, columns, rows, rowKey, onOpen, openLabel, loadMore }: DataTableProps<T>) {
  return (
    <div className={s.wrap}>
      <div className={s.frame}>
        <table className={s.table}>
          <caption className={s.srOnly}>{caption}</caption>
          <thead className={s.thead}>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className={s.row}>
                {columns.map((c, i) => {
                  const content = c.render(row);
                  const cls = [i === 0 ? s.lead : '', c.mono ? s.mono : '', c.nowrap ? s.nowrap : ''].filter(Boolean).join(' ') || undefined;
                  return (
                    <td key={c.key} className={cls} data-label={i === 0 ? undefined : c.label}>
                      {i === 0 && onOpen ? (
                        <button type="button" className={s.open} aria-label={openLabel?.(row)} onClick={() => onOpen(row)}>
                          {content}
                        </button>
                      ) : (
                        <span className={s.value}>{content}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loadMore ? (
        <div className={s.more}>
          <Button onClick={loadMore.onClick} disabled={loadMore.busy} aria-busy={loadMore.busy || undefined}>
            {loadMore.busy ? loadMore.busyLabel : loadMore.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
