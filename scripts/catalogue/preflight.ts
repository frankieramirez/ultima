/**
 * Runs `pnpm catalogue:check` before a command that consumes the generated wiring, then the command.
 * It never generates, so a stale projection fails here instead of being repaired and hidden. The
 * command inherits ULTIMA_CATALOGUE_FRESH, so the nested package scripts it starts skip the check.
 *
 *   node --experimental-strip-types scripts/catalogue/preflight.ts "<command>"
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const FRESH = 'ULTIMA_CATALOGUE_FRESH';

if (process.env[FRESH] !== '1') {
  const checked = spawnSync(process.execPath, ['--experimental-strip-types', join(root, 'scripts/catalogue/generate.ts'), 'check'], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (checked.status !== 0) process.exit(checked.status ?? 1);
}

const [command] = process.argv.slice(2);
if (command) {
  const run = spawnSync(command, { stdio: 'inherit', shell: true, env: { ...process.env, [FRESH]: '1' } });
  process.exit(run.status ?? 1);
}
