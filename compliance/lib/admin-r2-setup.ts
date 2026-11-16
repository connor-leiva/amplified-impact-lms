import { rmSync } from 'node:fs';
import { OUT_DIR } from './admin-r2';

/** Start every `parity:admin-r2` run from an empty report folder, so no stale cell is ever read. */
export default function setup() {
  rmSync(OUT_DIR, { recursive: true, force: true });
}
