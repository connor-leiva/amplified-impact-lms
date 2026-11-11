// The GHL script (D-134), run by hand. See the README's "GoHighLevel" section.
//
//   pnpm --filter @ai/api ghl:status                 counts per kind and the rows that need a look
//
// Nothing here prints a token or a contact.

// A module, so `status` below is this file's own and not the DOM's global of the same name.
export {};

class ScriptStopped extends Error {}

async function status(): Promise<void> {
  const { crmSyncReport } = await import('../routes/crm-sync');
  const r = await crmSyncReport();
  console.log(`Sync: ${r.sync}. Custom fields set: ${r.fields.join(', ') || 'none'}. Pipeline: ${r.pipeline ? `set (${r.stages.join(', ')})` : 'not set'}.`);
  for (const [kind, c] of Object.entries(r.counts)) console.log(`  ${kind.padEnd(8)} total ${c.total}, synced ${c.synced}, waiting ${c.waiting}, retrying ${c.retrying}, gave up ${c.gaveUp}`);
  for (const p of r.problems) console.log(`  ${p.state.padEnd(8)} ${p.kind} ${p.id} attempts ${p.attempts} ${p.error ?? ''}`);
}

async function main(): Promise<void> {
  const [command] = process.argv.slice(2);
  if (command === 'status') return status();
  throw new ScriptStopped('Usage: ghl-cli status');
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
