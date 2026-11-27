// The runtime code of a source file with its comments blanked (strings kept), line for line, for the checks that read
// what the code says and not what its comments say (`check-cohort-hardcodes.mjs`, `check-admin-zone.mjs`).

/** The source with every comment blanked (strings kept), line for line. */
export function code(src) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (quote) {
      out += c;
      // A quote or a double quote never spans a line (a regex literal that holds one ends this guess at the line).
      if (c === '\n' && quote !== '`') {
        quote = null;
        i += 1;
        continue;
      }
      if (c === '\\') {
        out += n ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      continue;
    }
    if (c === '/' && n === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += '  ';
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    out += c;
    i += 1;
  }
  return out;
}
