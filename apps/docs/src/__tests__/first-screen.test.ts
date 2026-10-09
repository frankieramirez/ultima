import { expect, test } from 'vitest';
import { presetDraft, seedFromSrgb, THEME_PRESETS } from '@ultima/tokens';

import brief from '../../../../docs/evidence/first-screen/brief.md?raw';
import { LAYOUTS, briefBrand, verdict } from '../../../../scripts/first-screen-record.ts';
import { scenario } from '../../../../scripts/verification/register.ts';

type RunRecord = Parameters<typeof verdict>[0] & {
  runId: string;
  layout: string;
  brief: { sha256: string; brand: string };
  source: { head: string | null; manifest: string | null; registryManifest: string; cliTarball: { packed: string; served: string }; draftDigest: string | null };
  verdict: ReturnType<typeof verdict>;
};
const records = Object.entries(import.meta.glob<RunRecord>('../../../../docs/evidence/first-screen/runs/*.json', { eager: true, import: 'default' }));
const hue = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

test('the brief and every retained first-screen run record keep the exercise contract', scenario('first-screen.agent-runs', 'docs-vitest', async () => {
  const brand = briefBrand(brief);
  const seed = seedFromSrgb(brand, 'arcane', presetDraft('neutral').color.arcane);
  // A brand color no preset provides: a chromatic accent at least 30 degrees from every chromatic preset hue.
  expect(seed.saturation).toBeGreaterThan(0.5);
  for (const { id } of THEME_PRESETS) {
    for (const scale of ['arcane', 'mana'] as const) {
      const preset = presetDraft(id).color[scale];
      if (preset.saturation > 0) expect(hue(seed.hue, preset.hue), `${id} ${scale}`).toBeGreaterThanOrEqual(30);
    }
  }
  for (const phrase of ['required **Item name** field', 'portalled select', 'dialog', 'dark and light mode', 'phone width', 'StyleX lint']) expect(brief).toContain(phrase);

  expect(records.length).toBeGreaterThan(0);
  for (const [path, record] of records) {
    expect(path.endsWith(`/${record.runId}.json`), path).toBe(true);
    expect(Object.keys(LAYOUTS)).toContain(record.layout);
    expect(record.brief.brand).toBe(brand);
    for (const value of [record.source.head, record.source.manifest, record.source.registryManifest, record.source.cliTarball.packed, record.source.cliTarball.served]) expect(value, `${record.runId} source identity`).toMatch(/^[0-9a-f]{40,64}$/);
    // The stored verdict is the one its evidence gives: no condition is waived or edited into a pass.
    expect(record.verdict, record.runId).toEqual(verdict(record));
    if (record.verdict.status === 'passed') expect(record.review, record.runId).toBeTruthy();
  }
}));
