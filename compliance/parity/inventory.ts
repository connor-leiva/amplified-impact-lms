// Reading `portal-parity-inventory.md`, the source of truth for which learner-portal behaviors the parity
// suite must cover (Connor's parity brief § 3). The file is kept verbatim; this module only reads it.
//
// A row is any table line whose first cell is an inventory ID (`R-1`, `SH-5`, `U-4`, ...). The ranked
// summary at the top numbers its rows (`| 1 |`) and the counts table names statuses, so neither matches.
// A row's status is the first status word in its last cell, the inventory's own counting rule ("KEPT (…);
// CHANGED look" counts as KEPT).

export type InventoryStatus = 'KEPT' | 'MISSING' | 'CHANGED' | 'N/A' | 'New' | 'unverified';

export interface InventoryRow {
  id: string;
  /** The heading the row sits under, without its number: "Routes and pages (what URL shows what)". */
  section: string;
  /** The row's cells, trimmed, markdown left as written. */
  cells: string[];
  status: InventoryStatus | null;
  /** 1-based line number in the inventory file. */
  line: number;
}

export const ID_PATTERN = /^[A-Z]{1,2}-\d+$/;
const ROW = /^\|\s*([A-Z]{1,2}-\d+)\s*\|/;
const SECTION = /^##\s+(?:\d+\.\s+)?(.+?)\s*$/;
const STATUS = /\b(KEPT|MISSING|CHANGED|N\/A|New|unverified)\b/;

export function parseInventory(markdown: string): InventoryRow[] {
  const rows: InventoryRow[] = [];
  let section = '';
  markdown.split(/\r?\n/).forEach((text, i) => {
    const heading = SECTION.exec(text);
    if (heading) {
      section = heading[1]!;
      return;
    }
    const m = ROW.exec(text);
    if (!m) return;
    const cells = text
      .replace(/^\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((c) => c.trim());
    const status = STATUS.exec(cells[cells.length - 1] ?? '');
    rows.push({ id: m[1]!, section, cells, status: (status?.[1] as InventoryStatus | undefined) ?? null, line: i + 1 });
  });
  return rows;
}

/** The inventory's IDs, in file order. */
export const inventoryIds = (markdown: string): string[] => parseInventory(markdown).map((r) => r.id);
