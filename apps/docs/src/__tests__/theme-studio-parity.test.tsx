import * as stylex from '@stylexjs/stylex';
import {
  resolveDraft,
  presetDraft,
  THEME_PRESETS,
  shuffleDraft,
  stockDraft,
  toCss,
  toStylex,
  type ResolvedDraft,
  type ThemeDraft,
} from '@ultima/tokens';
import { expect, onTestFinished, test } from 'vitest';
import { cdp, commands } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { ThemeStudioPreview } from '../theme-studio-preview';
import '../styles.css';

declare module 'vitest/internal/browser' {
  interface BrowserCommands {
    compileStylexModule: (source: string) => Promise<{
      code: string;
      rules: [string, { ltr: string | null; rtl: string | null }, number][];
    }>;
  }
}

const MODES = ['dark', 'light'] as const;
type Mode = (typeof MODES)[number];
type StylexArg = Parameters<typeof stylex.props>[number];

type CompiledExports = {
  colorScheme: Record<Mode, StylexArg>;
  ultimaTheme: Record<Mode, StylexArg[]>;
};

// The collapse is a fixed contract (docs/spec/theme-studio.md, Motion): drafts scale the
// default durations and reduced motion never follows them.
const REDUCED_MOTION: [string, string][] = [
  ['--ult-motion-fast', '1ms'],
  ['--ult-motion-base', '1ms'],
  ['--ult-motion-slow', '1ms'],
  ['--ult-motion-loop', '0s'],
];

function shuffledDraft(): ThemeDraft {
  const result = shuffleDraft(stockDraft(), 'global', 'broad', 20260920);
  if (result.kind !== 'applied') throw new Error(`the seeded corpus shuffle was ${result.kind}`);
  return result.draft;
}

function guidedDraft(): ThemeDraft {
  const draft = stockDraft();
  draft.typography = {
    sans: "Georgia, 'Times New Roman', serif",
    mono: "'Courier New', ui-monospace, monospace",
    baseSizePx: 18,
    scale: 1.333,
    leading: 'loose',
    tracking: 'compact',
  };
  draft.density = 0.75;
  draft.shape = 'sharp';
  draft.elevation = 0;
  draft.motion = 2;
  return draft;
}

function overriddenDraft(): ThemeDraft {
  const draft = stockDraft();
  draft.elevation = 1.5;
  draft.motion = 0.6;
  draft.overrides.dark['--ult-color-accent'] = '#ff00aa';
  draft.overrides.light['--ult-color-accent'] = '#00aa55';
  draft.overrides.dark['--ult-space-10'] = '3rem';
  draft.overrides.light['--ult-space-10'] = '3rem';
  draft.overrides.dark['--ult-shadow-md'] = '0 2px 4px rgba(0,0,0,.5)';
  draft.overrides.light['--ult-font-sans'] = 'Papyrus, fantasy';
  return draft;
}

function failingDraft(): ThemeDraft {
  const tables = resolveDraft(stockDraft());
  const draft = stockDraft();
  for (const mode of MODES) {
    draft.overrides[mode]['--ult-color-text'] = tables[mode]['--ult-color-surface']!;
  }
  return draft;
}

const CORPUS: { name: string; draft: ThemeDraft }[] = [
  ...THEME_PRESETS.flatMap(({ id, label }) => ([1, 2] as const).map((revision) => ({ name: `the ${label} preset revision ${revision}`, draft: presetDraft({ id, revision }) }))),
  { name: 'the stock draft', draft: stockDraft() },
  { name: 'a seeded broad shuffle', draft: shuffledDraft() },
  { name: 'guided parameters at their edges', draft: guidedDraft() },
  { name: 'per-mode token overrides', draft: overriddenDraft() },
  { name: 'a draft failing the pairing gate', draft: failingDraft() },
];

// The fixture applies artifacts in a shadow root: StyleX names theme classes by content hash,
// so the app's own compiled themes would match them by name and win on specificity. A shadow
// boundary keeps document rules out while the injected artifact still applies.
function fixture(options: {
  css?: string;
  className?: string;
  attributes?: Record<string, string>;
}): HTMLElement {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  if (options.css) {
    const style = document.createElement('style');
    style.textContent = options.css;
    root.append(style);
  }
  const el = document.createElement('div');
  if (options.className) el.className = options.className;
  for (const [name, value] of Object.entries(options.attributes ?? {})) el.setAttribute(name, value);
  root.append(el);
  document.body.append(host);
  onTestFinished(() => host.remove());
  return el;
}

function readToken(el: Element, token: string): string {
  return getComputedStyle(el).getPropertyValue(token).trim();
}

function blockAfter(css: string, marker: string, from = 0): string {
  const start = css.indexOf(marker, from);
  expect(start, `stylesheet contains ${marker}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

function declarations(block: string): [string, string][] {
  return [...block.matchAll(/(--ult-[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
    match[1]!,
    match[2]!.trim(),
  ]);
}

function modeBlocks(css: string): Record<Mode, string[]> {
  return {
    dark: [blockAfter(css, ':root {'), blockAfter(css, '[data-theme="dark"] {')],
    light: [
      blockAfter(css, ':root {', css.indexOf('prefers-color-scheme: light')),
      blockAfter(css, '[data-theme="light"] {'),
    ],
  };
}

function reducedMotionBlock(css: string): string {
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion'));
  return blockAfter(reduced, '[data-theme="light"] {');
}

async function withReducedMotion(run: () => void | Promise<void>): Promise<void> {
  const session = cdp() as unknown as {
    send: (method: string, params?: unknown) => Promise<unknown>;
  };
  const features = (value: string) => [{ name: 'prefers-reduced-motion', value }];
  await session.send('Emulation.setEmulatedMedia', { features: features('reduce') });
  try {
    await run();
  } finally {
    await session.send('Emulation.setEmulatedMedia', { features: features('') });
  }
}

function evaluateModule(code: string): CompiledExports {
  const body = code
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('import '))
    .join('\n')
    .replaceAll('export const', 'const');
  return new Function(`${body}\nreturn { colorScheme, ultimaTheme };`)() as CompiledExports;
}

function tableTokens(tables: ResolvedDraft, mode: Mode): [string, string][] {
  return Object.entries(tables[mode]);
}

for (const { name, draft } of CORPUS) {
  test(`${name}: stylesheet declarations equal the preview boundary's computed values`, async () => {
    const css = toCss(draft);
    const tables = resolveDraft(draft);
    const screen = await render(
      <ThemeStudioPreview identity={name} mode="compare" onModeChange={() => {}} tables={tables} />,
    );
    const panes: Record<Mode, Element> = {
      dark: screen.getByRole('region', { name: 'Dark preview' }).element(),
      light: screen.getByRole('region', { name: 'Light preview' }).element(),
    };

    for (const mode of MODES) {
      for (const block of modeBlocks(css)[mode]) {
        for (const [token, value] of declarations(block)) {
          expect(readToken(panes[mode], token), `${token} in the ${mode} sheet`).toBe(value);
        }
      }
      for (const [token, value] of tableTokens(tables, mode)) {
        expect(readToken(panes[mode], token), `${token} on the ${mode} boundary`).toBe(value);
      }
    }

    for (const [token, value] of declarations(reducedMotionBlock(css))) {
      const fixed = REDUCED_MOTION.find(([fixedToken]) => fixedToken === token)?.[1];
      expect(value, `${token} carries its fixed reduced-motion value`).toBe(fixed);
    }
  });

  test(`${name}: the stylesheet resolves the same values on a consumer element`, async () => {
    const css = toCss(draft);
    const tables = resolveDraft(draft);

    for (const mode of MODES) {
      const el = fixture({ css, attributes: { 'data-theme': mode } });
      for (const [token, value] of tableTokens(tables, mode)) {
        expect(readToken(el, token), `${token} under data-theme=${mode}`).toBe(value);
      }
    }

    await withReducedMotion(async () => {
      for (const mode of MODES) {
        const el = fixture({ css, attributes: { 'data-theme': mode } });
        for (const [token, value] of REDUCED_MOTION) {
          expect(readToken(el, token), `${token} under reduced motion (${mode})`).toBe(value);
        }
      }
    });
  });

  test(`${name}: the compiled StyleX module resolves the same values in a fixture application`, async () => {
    const tables = resolveDraft(draft);
    const { code, rules } = await commands.compileStylexModule(toStylex(draft));
    const css = rules
      .map(([, rule]) => rule.ltr)
      .filter(Boolean)
      .join('\n');
    const module = evaluateModule(code);

    for (const mode of MODES) {
      const props = stylex.props(module.colorScheme[mode], ...module.ultimaTheme[mode]);
      const el = fixture({ css, className: props.className });
      if (props.style) Object.assign(el.style, props.style);
      for (const [token, value] of tableTokens(tables, mode)) {
        expect(readToken(el, token), `${token} under the compiled ${mode} themes`).toBe(value);
      }
    }

    await withReducedMotion(async () => {
      for (const mode of MODES) {
        const props = stylex.props(...module.ultimaTheme[mode]);
        const el = fixture({ css, className: props.className });
        for (const [token, value] of REDUCED_MOTION) {
          expect(readToken(el, token), `${token} under reduced motion (${mode})`).toBe(value);
        }
      }
    });
  });
}
