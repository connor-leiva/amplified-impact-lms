// How the R2 table fits its columns into its own width (D-160 R2-1c, BUILD-SPEC § 2): the mockup's
// `Table` measures the card it sits in (`tw`) and, from each column's track, decides whether a
// lower-priority column (`hide: 'lap'`) drops and whether the `minmax(Npx, …)` tracks tighten to
// `minmax(0, …)`. Pure, so the rule is tested without a browser.

export interface FitColumn {
  /** The grid track: `minmax(170px,1.3fr)`, `132px`; none is `minmax(0,1fr)`. */
  width?: string;
  /** Drops at laptop width, or under 800px, when the table can't fit it (the mockup's `hide: 'lap'`). */
  hideLap?: boolean;
}

export interface FitOptions {
  /** A checkbox column. */
  select?: boolean;
  /** An actions column (a "…" menu), with its track width (32px by default). */
  actions?: string | null;
  /** The viewport is a laptop (768–1199px). */
  laptop: boolean;
  phone: boolean;
}

/** The width a column asks for: its first px number, or 120 (`need`'s fallback), plus the 16px gap. */
const ask = (c: FitColumn): number =>
  Number.parseInt((/(\d+)px/.exec(c.width ?? '') ?? [0, '120'])[1] as string, 10) + 16;

/** The width the columns need: theirs, the row's 40px padding, the checkbox's 32 and the actions'. */
export function need(cols: readonly FitColumn[], o: Pick<FitOptions, 'select' | 'actions'>): number {
  return (
    cols.reduce((a, c) => a + ask(c), 0) +
    40 +
    (o.select ? 32 : 0) +
    (o.actions != null ? Number.parseInt(o.actions || '32', 10) + 16 : 0)
  );
}

export interface Fit<C> {
  /** The columns that show. */
  visible: C[];
  /** A `hide: 'lap'` column dropped; its value folds into another cell. */
  drop: boolean;
  /** Even so, the columns don't fit: their minimums relax. */
  tight: boolean;
  /** The grid template for the header and every row. */
  template: string;
}

/** The mockup's `drop`, `vis`, `tight` and `tpl`, for a table `tw` px wide. */
export function fit<C extends FitColumn>(cols: readonly C[], tw: number, o: FitOptions): Fit<C> {
  const drop = !o.phone && need(cols, o) > tw && (o.laptop || tw < 800);
  const visible = cols.filter((c) => !(c.hideLap && drop));
  const tight = need(visible, o) > tw;
  const tracks = visible.map((c) =>
    (c.width ?? 'minmax(0,1fr)').replace(/minmax\(\d+px,/, (m) => (tight ? 'minmax(0,' : m)),
  );
  const template = [...(o.select ? ['16px'] : []), ...tracks, ...(o.actions != null ? [o.actions || '32px'] : [])].join(
    ' ',
  );
  return { visible, drop, tight, template };
}
