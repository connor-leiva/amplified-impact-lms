// The GHL scripts (D-134), run by hand. See the README's "GoHighLevel" section.
//
//   pnpm --filter @ai/api ghl:status                 counts per kind and the rows that need a look
//   pnpm --filter @ai/api ghl:setup  [--apply]       pipeline, tags and fields in the NEW location
//
// setup is a dry run without --apply. Its location comes from variables set only for the run, never
// from code: GHL_TO_TOKEN and GHL_TO_LOCATION_ID (the new sub-account). Nothing here prints a token or
// a contact.

import { ScriptStopped, setupLocation } from './ghl-location';

function need(name: string): string {
  const v = (process.env[name] ?? '').trim();
  if (!v) throw new ScriptStopped(`Set ${name} for this run (it is never read from code or printed).`);
  return v;
}

async function status(): Promise<void> {
  const { crmSyncReport } = await import('../routes/crm-sync');
  const r = await crmSyncReport();
  console.log(`Sync: ${r.sync}. Custom fields set: ${r.fields.join(', ') || 'none'}. Pipeline: ${r.pipeline ? `set (${r.stages.join(', ')})` : 'not set'}.`);
  for (const [kind, c] of Object.entries(r.counts)) console.log(`  ${kind.padEnd(8)} total ${c.total}, synced ${c.synced}, waiting ${c.waiting}, retrying ${c.retrying}, gave up ${c.gaveUp}`);
  for (const p of r.problems) console.log(`  ${p.state.padEnd(8)} ${p.kind} ${p.id} attempts ${p.attempts} ${p.error ?? ''}`);
}

async function main(): Promise<void> {
  const [command, ...flags] = process.argv.slice(2);
  const apply = flags.includes('--apply');
  const print = (line: string) => console.log(line);
  if (command === 'status') return status();
  if (command === 'setup') {
    const result = await setupLocation({ config: { token: need('GHL_TO_TOKEN'), locationId: need('GHL_TO_LOCATION_ID') }, apply, print });
    console.log(apply ? '\nPaste these into Railway (the variable names are in the README):' : '\nAfter --apply, these are the Railway variables to set:');
    for (const [name, id] of Object.entries(result.env)) console.log(`${name}=${id}`);
    if (!apply) console.log('\nDry run: nothing was created. Run again with --apply.');
    return;
  }
  throw new ScriptStopped('Usage: ghl-cli status | setup [--apply]');
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    // A ScriptStopped says what to do. Anything else is the database or the network; its message names
    // no contact (the client never puts a response body in an error).
    console.error(err instanceof ScriptStopped ? err.message : `The GHL script stopped: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  },
);
