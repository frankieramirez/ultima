import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { exitCode, print } from './diagnostic.ts';
import { type Target, doctor } from './doctor.ts';

const COMMANDS = ['doctor', 'status', 'diff', 'check', 'install', 'uninstall'];
const USAGE = `usage: ultima <${COMMANDS.join('|')}> [--json] [--cwd <dir>] [--target vite|next]`;

export function run(argv: string[]): { code: number; stdout: string; stderr: string } {
  const invocation = parseInvocation(argv);
  if ('usage' in invocation) return usageError(invocation);
  const result = doctor(invocation.root, invocation.target);
  if ('usage' in result) return usageError(result);
  const report = { command: invocation.command, ...result };
  return { code: exitCode(report), stdout: print(report, invocation.json), stderr: '' };
}

function usageError(result: { usage: string }) {
  return { code: exitCode(result), stdout: '', stderr: `ultima: ${result.usage}\n${USAGE}\n` };
}

function parseInvocation(
  argv: string[],
): { usage: string } | { command: 'doctor'; root: string; target: Target | undefined; json: boolean } {
  let args;
  try {
    args = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { json: { type: 'boolean' }, cwd: { type: 'string' }, target: { type: 'string' } },
    });
  } catch (error) {
    return { usage: (error as Error).message };
  }
  const [command, ...rest] = args.positionals;
  if (!command) return { usage: 'no command given' };
  if (!COMMANDS.includes(command)) return { usage: `unknown command ${command}` };
  if (command !== 'doctor') return { usage: `${command} is not available in this build` };
  if (rest.length > 0) return { usage: `doctor takes no arguments, got ${rest.join(' ')}` };
  const { target, json = false } = args.values;
  if (target !== undefined && target !== 'vite' && target !== 'next') {
    return { usage: `--target takes vite or next, got ${target}` };
  }
  const root = resolve(args.values.cwd ?? '.');
  if (!existsSync(join(root, 'package.json'))) {
    return { usage: `${root} holds no package.json; pass --cwd with the project root` };
  }
  return { command, root, target, json };
}
