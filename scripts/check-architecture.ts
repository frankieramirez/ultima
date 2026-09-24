// pnpm check:architecture [--format text|json]: the static architecture check over the whole workspace.
// docs/spec/agent-infrastructure.md, Engine and command. Exit 0 clean, 1 violations, 2 invalid
// invocation or an incomplete run.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { check, exitCode, formatJson, formatText, workspaceScope } from '../packages/analysis/src/index.ts';
import { diskFiles } from './catalogue/files.ts';

const USAGE = 'Usage: pnpm check:architecture [--format text|json]';

function main(argv: string[]): number {
  let format: string;
  try {
    const { values } = parseArgs({ args: argv, options: { format: { type: 'string', default: 'text' } }, strict: true, allowPositionals: false });
    format = values.format as string;
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n${USAGE}\n`);
    return 2;
  }
  if (format !== 'text' && format !== 'json') {
    process.stderr.write(`Unknown format "${format}".\n${USAGE}\n`);
    return 2;
  }
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const report = check(workspaceScope(diskFiles(root)));
  process.stdout.write(format === 'json' ? formatJson(report) : formatText(report));
  return exitCode(report);
}

process.exitCode = main(process.argv.slice(2).filter((argument, index) => !(index === 0 && argument === '--')));
