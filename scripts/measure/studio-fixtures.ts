/**
 * The settled Studio draft fixtures of Production Studio measurements: stock, a
 * customized draft with guided values and per-mode overrides, the largest override
 * set the editor accepts, and a failing-contrast draft. They are constructed rather
 * than drawn, so their seed is the construction itself and their content hash names
 * them.
 */
import { serializeDraft } from '../../packages/tokens/src/theme/codec.ts';
import { resolveDraft, stockDraft, type ThemeDraft } from '../../packages/tokens/src/theme/draft.ts';
import { gate } from '../../packages/tokens/src/theme/gate.ts';
import { shuffleDraft } from '../../packages/tokens/src/theme/shuffle.ts';
import { sha256 } from './identity.ts';

/** Restates groupTokens in apps/docs/src/theme-studio-draft.ts: the tokens an editor row can override. */
const EDITABLE_PREFIXES = ['--ult-color-', '--ult-text-', '--ult-font-', '--ult-space-', '--ult-radius-', '--ult-shadow-', '--ult-motion-'];
const FIXED_TOKENS = new Set(['--ult-color-surface-overlay', '--ult-radius-full']);

export const OVERRIDE_TOKEN = '--ult-color-accent';

function customized(): ThemeDraft {
  const draft = stockDraft();
  return {
    ...draft,
    color: { ...draft.color, arcane: { hue: 250, saturation: 0.9 }, mana: { hue: 190, saturation: 1 } },
    typography: { ...draft.typography, scale: 1.2, leading: 'loose' },
    density: 1,
    shape: 'round',
    elevation: 1.5,
    motion: 0.6,
    overrides: {
      dark: { [OVERRIDE_TOKEN]: '#7a88ff', '--ult-radius-md': '0.75rem' },
      light: { [OVERRIDE_TOKEN]: '#3d4cc7', '--ult-radius-md': '0.75rem' },
    },
  };
}

function maxOverrides(): ThemeDraft {
  const base = customized();
  const resolved = resolveDraft(base);
  const pick = (mode: 'dark' | 'light') =>
    Object.fromEntries(
      Object.entries(resolved[mode]).filter(
        ([name]) => !FIXED_TOKENS.has(name) && EDITABLE_PREFIXES.some((prefix) => name.startsWith(prefix)),
      ),
    );
  return { ...base, overrides: { dark: pick('dark'), light: pick('light') } };
}

function failingContrast(): ThemeDraft {
  const draft = stockDraft();
  const resolved = resolveDraft(draft);
  return {
    ...draft,
    overrides: {
      dark: { '--ult-color-text-subtle': resolved.dark['--ult-color-surface']! },
      light: { '--ult-color-text-subtle': resolved.light['--ult-color-surface']! },
    },
  };
}

export type FixtureId = 'stock' | 'customized' | 'max-overrides' | 'failing-contrast';

const failing = (draft: ThemeDraft) =>
  gate(resolveDraft(draft)).filter((result) => !result.dark.pass || !result.light.pass).length;

export function studioFixtures() {
  const drafts: Record<FixtureId, ThemeDraft> = {
    stock: stockDraft(),
    customized: customized(),
    'max-overrides': maxOverrides(),
    'failing-contrast': failingContrast(),
  };
  const fixtures = Object.fromEntries(
    Object.entries(drafts).map(([id, draft]) => {
      const text = serializeDraft(draft);
      return [
        id,
        {
          text,
          sha256: sha256(text),
          overrides: Object.keys(draft.overrides.dark).length + Object.keys(draft.overrides.light).length,
          failingPairings: failing(draft),
        },
      ];
    }),
  ) as Record<FixtureId, { text: string; sha256: string; overrides: number; failingPairings: number }>;

  const problems: string[] = [];
  if (fixtures.customized.failingPairings !== 0) problems.push('customized must pass the contrast gate');
  if (fixtures['max-overrides'].failingPairings !== 0) problems.push('max-overrides must pass the contrast gate');
  if (fixtures['failing-contrast'].failingPairings === 0) problems.push('failing-contrast must fail the gate');
  if (shuffleDraft(drafts['failing-contrast'], 'global', 'broad', 1).kind !== 'exhausted') {
    problems.push('failing-contrast must exhaust Shuffle');
  }
  if (problems.length > 0) throw new Error(`fixture contract broken: ${problems.join('; ')}`);
  return { fixtures, setSha256: sha256(Object.values(fixtures).map((fixture) => fixture.sha256).join('\n')) };
}
