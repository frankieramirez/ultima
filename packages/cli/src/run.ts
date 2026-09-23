import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { exitCode, print } from './diagnostic.ts';
import { type Target, doctor } from './doctor.ts';
import { HARNESSES, type Harness, install, printPlan, uninstall } from './install.ts';
import { printStatus, status } from './status.ts';

const COMMANDS = ['doctor', 'status', 'diff', 'check', 'install', 'uninstall'];
const USAGE = `usage: ultima <${COMMANDS.join('|')}> [--json] [--cwd <dir>] [--target vite|next] [--project <tsconfig>] [--harness <name>]... [--dry-run] [--force]`;
const FLAGS: Record<string, string[]> = { doctor: ['target'], status: ['project'], install: ['harness', 'dry-run', 'force'], uninstall: [] };

export async function run(argv: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const invocation = parseInvocation(argv);
  if ('usage' in invocation) return usageError(invocation);
  if (invocation.command === 'install' || invocation.command === 'uninstall') {
    const result =
      invocation.command === 'install'
        ? install(invocation.root, { harnesses: invocation.harnesses, dryRun: invocation.dryRun, force: invocation.force })
        : uninstall(invocation.root);
    const stdout = invocation.json
      ? `${JSON.stringify({ command: invocation.command, ...result }, null, 2)}\n`
      : printPlan(invocation.command, result);
    return { code: 0, stdout, stderr: '' };
  }
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

type Invocation = { root: string; json: boolean } & (
  | { command: 'doctor'; target: Target | undefined }
  | { command: 'status'; project: string | undefined }
  | { command: 'install'; harnesses: Harness[] | undefined; dryRun: boolean; force: boolean }
  | { command: 'uninstall' }
);

function parseInvocation(argv: string[]): { usage: string } | Invocation {
  let args;
  try {
    args = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        json: { type: 'boolean' },
        cwd: { type: 'string' },
        target: { type: 'string' },
        project: { type: 'string' },
        harness: { type: 'string', multiple: true },
        'dry-run': { type: 'boolean' },
        force: { type: 'boolean' },
      },
    });
  } catch (error) {
    return { usage: (error as Error).message };
  }
  const [command, ...rest] = args.positionals;
  if (!command) return { usage: 'no command given' };
  if (!COMMANDS.includes(command)) return { usage: `unknown command ${command}` };
  const own = FLAGS[command];
  if (!own) return { usage: `${command} is not available in this build` };
  if (rest.length > 0) return { usage: `${command} takes no arguments, got ${rest.join(' ')}` };
  const { target, project, harness, json = false } = args.values;
  const foreign = Object.keys(args.values).find((flag) => flag !== 'json' && flag !== 'cwd' && !own.includes(flag));
  if (foreign) return { usage: `${command} takes no --${foreign}` };
  if (target !== undefined && target !== 'vite' && target !== 'next') {
    return { usage: `--target takes vite or next, got ${target}` };
  }
  const unknown = harness?.find((name) => !(HARNESSES as string[]).includes(name));
  if (unknown !== undefined) return { usage: `--harness takes ${HARNESSES.join(', ')}, got ${unknown}` };
  const root = resolve(args.values.cwd ?? '.');
  if (!existsSync(join(root, 'package.json'))) {
    return { usage: `${root} holds no package.json; pass --cwd with the project root` };
  }
  if (command === 'status') return { command, root, project, json };
  if (command === 'uninstall') return { command, root, json };
  if (command === 'install') {
    return { command, root, json, harnesses: harness as Harness[] | undefined, dryRun: args.values['dry-run'] ?? false, force: args.values.force ?? false };
  }
  return { command: 'doctor', root, target, json };
}
