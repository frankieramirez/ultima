import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { generateScales, SCALE_NAMES, STOCK_SEEDS, type ScaleSeeds } from '../theme/recipe.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const PALETTE_PY = join(root, 'packages/tokens/scripts/palette.py');

function pythonScales(seeds: ScaleSeeds): Record<string, Record<'dark' | 'light', string[]>> {
  const script = `
import copy, json, runpy, sys
p = runpy.run_path(sys.argv[1])
orig_peak = copy.deepcopy(p['PEAK'])
p['PIN'].clear()
seeds = json.loads(sys.argv[2])
for name, seed in seeds.items():
    p['HUE'][name] = seed['hue']
    for mode in ('dark', 'light'):
        p['PEAK'][name][mode] = orig_peak[name][mode] * seed['saturation']
print(json.dumps(p['build']()))
`;
  const stdout = execFileSync(
    'python3',
    ['-c', script, PALETTE_PY, JSON.stringify(seeds)],
    { encoding: 'utf8' },
  );
  return JSON.parse(stdout) as Record<string, Record<'dark' | 'light', string[]>>;
}

function stockWith(scale: (typeof SCALE_NAMES)[number], hue: number, saturation: number): ScaleSeeds {
  return { ...STOCK_SEEDS, [scale]: { hue, saturation } };
}

const corpus: ScaleSeeds[] = [
  STOCK_SEEDS,
  ...SCALE_NAMES.flatMap((name) =>
    [0, 47, 90, 180, 275, 359].map((hue) => stockWith(name, hue, 1)),
  ),
  Object.fromEntries(SCALE_NAMES.map((name) => [name, { hue: STOCK_SEEDS[name].hue, saturation: 0 }])) as ScaleSeeds,
  Object.fromEntries(SCALE_NAMES.map((name) => [name, { hue: STOCK_SEEDS[name].hue, saturation: 1.5 }])) as ScaleSeeds,
  {
    mithril: { hue: 0, saturation: 1.5 },
    arcane: { hue: 90, saturation: 1.5 },
    mana: { hue: 180, saturation: 0.5 },
    verdant: { hue: 120, saturation: 1.2 },
    ember: { hue: 45, saturation: 1.5 },
    ruin: { hue: 0, saturation: 1.5 },
  },
];

test('generateScales matches palette.py hex for identical seeds with pins disabled', () => {
  for (const seeds of corpus) {
    expect(generateScales(seeds)).toEqual(pythonScales(seeds));
  }
});
