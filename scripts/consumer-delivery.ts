import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { draftFingerprint, parseDraft, serializeDraft } from '../packages/tokens/src/theme/codec.ts';
import { toCss, toRegistryItem, toStylex } from '../packages/tokens/src/theme/export.ts';
import type { ThemeDraft } from '../packages/tokens/src/theme/draft.ts';
import type { Run } from './consumer-helpers.ts';
import type { ConsumerLayout, DeliveryPath } from './consumer-report.ts';
import { CONSUMER_RULES } from '../packages/analysis/src/consumer.ts';
import { setupItems } from '../registry/items.config.ts';

export async function installTheme(app: string, registryFolder: string, url: string, draft: ThemeDraft, layout: ConsumerLayout, path: DeliveryPath, execute: Run, directCss = false): Promise<string> {
  const item = toRegistryItem(draft);
  if (!directCss) {
    await writeFile(join(registryFolder, 'r/proof-theme.json'), item);
    await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', `${url}/r/proof-theme.json`, '--yes', '--overwrite']);
  } else {
    await writeFile(join(app, 'ultima-theme.json'), serializeDraft(draft));
    await writeFile(join(app, 'ultima-theme.css'), toCss(draft));
  }
  const installed = await readFile(join(app, 'ultima-theme.json'), 'utf8');
  const parsed = parseDraft(installed);
  assert.ok(parsed.ok, 'installed draft must decode');
  assert.equal(serializeDraft(parsed.draft), serializeDraft(draft));
  assert.equal(draftFingerprint(parsed.draft), draftFingerprint(draft));
  assert.equal(await readFile(join(app, 'ultima-theme.css'), 'utf8'), toCss(draft));
  assert.ok(item.includes(draftFingerprint(draft)), 'downloaded item must identify the installed draft');
  if (path === 'stylex-subtree') {
    const module = join(app, layout === 'next-app' ? 'lib/ultima-theme' : 'src/lib/ultima-theme');
    await writeFile(`${module}.js`, toStylex(draft));
    await writeFile(`${module}.d.ts`, `import type * as stylex from '@stylexjs/stylex';
export const ultimaTheme: Record<'dark' | 'light', ReturnType<typeof stylex.createTheme>[]>;
export const colorScheme: Record<'dark' | 'light', stylex.StyleXStyles>;
`);
  }
  return installed;
}

export function cliReportProblems(report: unknown, command: 'doctor' | 'check', layout: ConsumerLayout): string[] {
  if (!report || typeof report !== 'object') return ['missing CLI report'];
  const value = report as Record<string, unknown>;
  const record = (row: unknown): Record<string, unknown> => row && typeof row === 'object' ? row as Record<string, unknown> : {};
  const failures: string[] = [];
  if (value.command !== command || !Array.isArray(value.diagnostics) || value.diagnostics.some((row) => record(row).severity !== 'advisory')) failures.push('CLI diagnostics are missing or blocking/incomplete');
  if (!Array.isArray(value.unsupported) || value.unsupported.some((row) => typeof record(row).step !== 'string' || typeof record(row).reason !== 'string')) failures.push('CLI unsupported-analysis inventory is missing');
  if (command === 'doctor') {
    const target = layout === 'vite' ? 'vite' : 'next';
    const expected = setupItems[`setup-${target}`].handSteps.filter((step) => step.unverifiable)
      .map((step) => ({ step: step.prose, reason: step.unverifiable }));
    const actual = Array.isArray(value.unsupported)
      ? value.unsupported.map((row) => ({ step: record(row).step, reason: record(row).reason })) : null;
    if (value.target !== target || JSON.stringify(actual) !== JSON.stringify(expected)) failures.push('doctor did not complete the layout setup checks');
  } else {
    const scopes = Array.isArray(value.scopes) ? value.scopes : [];
    const rules = Array.isArray(value.rules) ? value.rules : [];
    if (value.status !== 'clean' || record(value.counts).errors !== 0 || record(value.counts).incomplete !== 0 || !scopes.some((scope) => record(scope).kind === 'app' && Number(record(scope).files) > 0) || CONSUMER_RULES.some((id) => !rules.some((rule) => record(rule).id === id && ['blocking', 'advisory'].includes(String(record(rule).status))))) failures.push('check did not complete the consumer scope and rules');
  }
  return failures;
}

export async function cliProof(app: string, output: string, layout: ConsumerLayout, execute: Run) {
  const files = { doctor: 'doctor.json', check: 'check.json' };
  for (const command of ['doctor', 'check'] as const) {
    const json = await execute(app, 'npx', ['--no-install', 'ultima-design', command, '--json']);
    await writeFile(join(output, files[command]), json);
    assert.deepEqual(cliReportProblems(JSON.parse(json), command, layout), [], `${command} must produce a complete successful report`);
  }
  return files;
}
