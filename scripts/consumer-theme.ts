import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ThemeReport } from '../packages/cli/src/doctor-theme.ts';
import type { Run } from './consumer-helpers.ts';

export async function themeSnapshot(app: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const walk = async (folder: string) => {
    for (const item of await readdir(join(app, folder), { withFileTypes: true })) {
      if (['node_modules', '.git', '.next', 'dist'].includes(item.name)) continue;
      const path = join(folder, item.name);
      if (item.isDirectory()) await walk(path);
      else if (item.isFile()) files[path] = createHash('sha256').update(await readFile(join(app, path))).digest('hex');
    }
  };
  await walk('');
  return files;
}

export function themeProofProblems(report: { theme?: ThemeReport; diagnostics?: { severity: string }[] }, expectedDocument = true): string[] {
  const rows = report.theme?.rows ?? [];
  const problems: string[] = [];
  if (report.theme?.schemaVersion !== 1) problems.push('missing theme schema');
  for (const artifact of expectedDocument ? ['css', 'design'] as const : ['css'] as const) {
    if (!rows.some((row) => row.artifact === artifact && row.state === 'match' && row.paths.draft === 'ultima-theme.json' && row.coverage.contentMatches === true)) problems.push(`${artifact} linked comparison did not match`);
  }
  if (!expectedDocument && !rows.some((row) => row.artifact === 'design' && row.state === 'unlinked' && row.paths.artifact === null)) problems.push('missing optional document must be explicitly unlinked');
  if (rows.some((row) => row.state === 'incomplete' || row.state === 'mismatch')) problems.push('incomplete or mismatched theme row');
  if (report.diagnostics?.some((row) => row.severity === 'blocking' || row.severity === 'incomplete')) problems.push('blocking or incomplete diagnostic');
  return problems;
}

export async function installedThemeProof(app: string, output: string, execute: Run, expectedDocument = true): Promise<void> {
  const preload = join(output, 'network-denied.mjs');
  await writeFile(preload, [
    "import net from 'node:net';", "import dns from 'node:dns';", "import http from 'node:http';", "import https from 'node:https';",
    'const deny = () => { process.stderr.write("theme network access\\n"); process.exit(99); };',
    'net.Socket.prototype.connect = deny; dns.lookup = deny; http.request = deny; https.request = deny; globalThis.fetch = deny;',
  ].join('\n'));
  const before = await themeSnapshot(app);
  const stdout = await execute(app, process.execPath, ['--import', preload, join(app, 'node_modules/ultima-design/dist/cli.js'), 'doctor', '--theme', '--json']);
  const after = await themeSnapshot(app);
  await writeFile(join(output, 'doctor-theme.json'), stdout);
  await writeFile(join(output, 'doctor-theme-read-only.json'), `${JSON.stringify({ network: 'denied', before, after }, null, 2)}\n`);
  assert.deepEqual(after, before, 'doctor --theme must leave the consumer tree unchanged');
  assert.deepEqual(themeProofProblems(JSON.parse(stdout), expectedDocument), [], 'packed offline CLI must compare the actual installed linked artifacts');
}
