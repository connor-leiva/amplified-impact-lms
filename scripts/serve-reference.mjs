// Serves design-reference/ for the compliance harness. A thin wrapper over http-server so the
// port can be overridden (REF_PORT) and the bind address is explicit — on Windows `localhost`
// resolves to ::1 first, which makes an IPv4-only server look absent.
import { spawn } from 'node:child_process';

const port = process.env.REF_PORT ?? '4400';
const args = ['design-reference', '-p', port, '-a', '127.0.0.1', '-s', '-c-1', '--cors'];
spawn('http-server', args, { stdio: 'inherit', shell: true }).on('exit', (c) => process.exit(c ?? 1));
