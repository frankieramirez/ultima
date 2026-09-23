import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { exitCode, print } from './diagnostic.ts';
import { type Target, doctor } from './doctor.ts';
import { printStatus, status } from './status.ts';

const COMMANDS = ['doctor', 'status', 'diff', 'check', 'install', 'uninstall'];
const USAGE = `usage: ultima <${COMMANDS.join('|')}> [--json] [--cwd <dir>] [--target vite|next] [--project <tsconfig>]`;

export async function run(argv: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const invocation = parseInvocation(argv);
  if ('usage' in invocation) return usageError(invocation);
  if (invocation.command === 'status') {
    const result = await status(invocation.root, { project: invocation.project });
    if ('diagnostics' in result) {
      const report = { command: 'status', ...result };
      return { code: exitCode(report), stdout: print(report, invocation.json), stderr: '' };
    }
    return { code: 0, stdout: invocation.json ? `${JSON.stringify(result, null, 2)}\n` : printStatus(result), stderr: '' };
  }
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
):
  | { usage: string }
  | { command: 'doctor'; root: string; target: Target | undefined; json: boolean }
  | { command: 'status'; root: string; project: string | undefined; json: boolean } {
  let args;
  try {
    args = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { json: { type: 'boolean' }, cwd: { type: 'string' }, target: { type: 'string' }, project: { type: 'string' } },
    });
  } catch (error) {
    return { usage: (error as Error).message };
  }
  const [command, ...rest] = args.positionals;
  if (!command) return { usage: 'no command given' };
  if (!COMMANDS.includes(command)) return { usage: `unknown command ${command}` };
  if (command !== 'doctor' && command !== 'status') return { usage: `${command} is not available in this build` };
  if (rest.length > 0) return { usage: `${command} takes no arguments, got ${rest.join(' ')}` };
  const { target, project, json = false } = args.values;
  if (command === 'status' ? target !== undefined : project !== undefined) {
    return { usage: `${command} takes no --${command === 'status' ? 'target' : 'project'}` };
  }
  if (target !== undefined && target !== 'vite' && target !== 'next') {
    return { usage: `--target takes vite or next, got ${target}` };
  }
  const root = resolve(args.values.cwd ?? '.');
  if (!existsSync(join(root, 'package.json'))) {
    return { usage: `${root} holds no package.json; pass --cwd with the project root` };
  }
  return command === 'status' ? { command, root, project, json } : { command, root, target, json };
}
