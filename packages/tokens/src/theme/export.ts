import { draftFingerprint, serializeDraft } from './codec.ts';
import { presetLabel, resolveDraft, type ResolvedDraft, type ThemeDraft, type TokenTable } from './draft.ts';
import { gate } from './gate.ts';
import { defaultProvenance, draftProvenance, generatedRegion, provenanceComment, type ThemeProvenance } from './provenance.ts';

export const STUDIO_VERSION = 1;

const GROUPS = ['color', 'space', 'text', 'font', 'radius', 'shadow', 'filter', 'motion'] as const;
const MODES = ['dark', 'light'] as const;
const REDUCED_MOTION = {
  '--ult-motion-fast': '1ms',
  '--ult-motion-base': '1ms',
  '--ult-motion-slow': '1ms',
  '--ult-motion-loop': '0s',
} as const;

type Mode = (typeof MODES)[number];
type Group = (typeof GROUPS)[number];

function artifactHeader(draft: ThemeDraft): string {
  return `Ultima theme studio v${STUDIO_VERSION} · draft v${draft.version} · fingerprint ${draftFingerprint(draft)}`;
}

function pairingFailed(draft: ThemeDraft): boolean {
  return gate(resolveDraft(draft)).some((row) => !row.dark.pass || !row.light.pass);
}

function comments(draft: ThemeDraft): string {
  const lines = [`/* ${artifactHeader(draft)} */`, provenanceComment(draftProvenance(draft))];
  if (pairingFailed(draft)) lines.push('/* Source draft failed token-contrast pairings. */');
  return lines.join('\n');
}

function tokenNames(table: TokenTable, group: Group): string[] {
  const prefix = `--ult-${group}-`;
  return Object.keys(table)
    .filter((name) => name.startsWith(prefix))
    .sort();
}

function declarations(table: TokenTable): string[] {
  return GROUPS.flatMap((group) =>
    tokenNames(table, group).map((name) => `${name}: ${table[name]};`),
  );
}

function block(selector: string, mode: Mode, lines: string[], indent = ''): string {
  const body = [`color-scheme: ${mode};`, ...lines].map((line) => `${indent}  ${line}`);
  return [`${indent}${selector} {`, ...body, `${indent}}`].join('\n');
}

export function toCss(draft: ThemeDraft): string {
  const tables = resolveDraft(draft);
  const reduced = Object.entries(REDUCED_MOTION).map(([name, value]) => `    ${name}: ${value};`);
  const sections = [
    comments(draft),
    block(':root', 'dark', declarations(tables.dark)),
    [`@media (prefers-color-scheme: light) {`, block(':root', 'light', declarations(tables.light), '  '), '}'].join(
      '\n',
    ),
    block('[data-theme="dark"]', 'dark', declarations(tables.dark)),
    block('[data-theme="light"]', 'light', declarations(tables.light)),
    [
      '@media (prefers-reduced-motion: reduce) {',
      '  :root,',
      '  [data-theme="dark"],',
      '  [data-theme="light"] {',
      ...reduced,
      '  }',
      '}',
    ].join('\n'),
  ];
  return `${sections.join('\n\n')}\n`;
}

function jsString(value: string): string {
  return JSON.stringify(value);
}

function themeObject(table: TokenTable, group: Group): string {
  const lines = tokenNames(table, group).map((name) => {
    const value = table[name] ?? '';
    if (group !== 'motion') return `  ${jsString(name)}: ${jsString(value)},`;
    const reduced = name === '--ult-motion-loop' ? '0s' : '1ms';
    return `  ${jsString(name)}: { default: ${jsString(value)}, '@media (prefers-reduced-motion: reduce)': ${jsString(reduced)} },`;
  });
  return `{\n${lines.join('\n')}\n}`;
}

function themeConst(mode: Mode, group: Group): string {
  return `${mode}${group[0]?.toUpperCase()}${group.slice(1)}`;
}

export function toStylex(draft: ThemeDraft): string {
  const tables = resolveDraft(draft);
  const themes = MODES.flatMap((mode) =>
    GROUPS.map((group) => {
      const name = themeConst(mode, group);
      return `const ${name} = stylex.createTheme(${group}, ${themeObject(tables[mode], group)});`;
    }),
  );
  const modeThemes = MODES.map((mode) => {
    const members = GROUPS.map((group) => themeConst(mode, group)).join(', ');
    return `  ${mode}: [${members}],`;
  });
  return `${[
    comments(draft),
    `import * as stylex from '@stylexjs/stylex';`,
    `import { ${GROUPS.join(', ')} } from '@/lib/tokens.stylex';`,
    '',
    'export const colorScheme = stylex.create({',
    `  dark: { colorScheme: 'dark' },`,
    `  light: { colorScheme: 'light' },`,
    '});',
    '',
    ...themes,
    '',
    'export const ultimaTheme = {',
    ...modeThemes,
    '};',
  ].join('\n')}\n`;
}

function markdownValue(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[\\`*_\[\]|]/g, '\\$&');
}

function designDocument(tables: ResolvedDraft, title: string, header: string, intro: string, warning: boolean, provenance: ThemeProvenance): string {
  const rows = (group: Group) => tokenNames(tables.dark, group).map((name) =>
    `| \`${name}\` | ${markdownValue(tables.dark[name] ?? '')} | ${markdownValue(tables.light[name] ?? '')} |`,
  );
  const table = (group: Group) => [
    '| Semantic token | Dark | Light |',
    '| --- | --- | --- |',
    ...rows(group),
  ].join('\n');
  const sections = [
    provenanceComment(provenance, 'markdown'),
    `<!-- ${header} -->`,
    ...(warning ? ['> This source draft failed token-contrast pairings. Review the colors before use.'] : []),
    `# Design System: ${title}`,
    intro,
    '## Visual theme',
    'Use semantic roles for surfaces, text, borders, actions, and status. The theme supplies complete dark and light values. With the CSS export, set `data-theme="dark"` or `data-theme="light"` on the root to pin a mode; omit it to follow the system. With the Studio StyleX export, apply `ultimaTheme.dark` or `ultimaTheme.light` and the matching `colorScheme` style through `stylex.props` on the theme boundary. Mount portals inside that boundary so popups inherit the same values.',
    '## Color palette and roles',
    'Surface roles establish depth. Text roles provide hierarchy. Accent and action roles distinguish emphasis and prominent actions; success, warning, and danger communicate status. Use the contrast tokens on their matching fills.',
    table('color'),
    '## Typography',
    'Use the semantic font and text tokens for type size, family, weight, line height, and tracking. Font stacks name preferred faces and fallbacks; the theme does not load font files.',
    table('font'),
    table('text'),
    '## Component styling',
    'Use Ultima components and their documented variants for controls. Pass StyleX styles through the component’s `style` prop, and read semantic color, radius, and shadow tokens when composing application layouts. Keep focus and interaction states visible in both modes. Read [Ultima conventions and component APIs](https://ultima.systems/llms.txt) before adding or changing components.',
    table('radius'),
    table('shadow'),
    '## Layout and motion',
    'Use the space scale for gaps and padding. Honor reduced motion: fast, base, and slow durations collapse to 1ms, and looping motion stops.',
    table('space'),
    table('motion'),
    table('filter'),
  ];
  return `${generatedRegion(`${sections.join('\n\n')}\n`)}\n`;
}

export function toDesignMd(draft: ThemeDraft): string {
  return designDocument(
    resolveDraft(draft),
    draft.version === 1 ? 'Ultima' : presetLabel(draft),
    artifactHeader(draft),
    'This document describes an Ultima theme. In Theme Studio, `ultima-theme.json` is the editable draft and the CSS and StyleX exports carry the values applications render. Regenerate this file after changing the theme.',
    pairingFailed(draft),
    draftProvenance(draft),
  );
}

export function toDefaultDesignMd(tables: ResolvedDraft): string {
  return designDocument(
    tables,
    'Ultima',
    'Ultima default design tokens. Generated from the compiled StyleX token values.',
    'This document describes the default Ultima token values. The token CSS and StyleX sources determine what applications render. If you change the theme in Theme Studio, export a new DESIGN.md for those values.',
    false,
    defaultProvenance(tables),
  );
}

export function toRegistryItem(draft: ThemeDraft): string {
  return `${JSON.stringify(
    {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json',
      name: 'ultima-theme',
      type: 'registry:item',
      title: 'Ultima theme',
      description: artifactHeader(draft),
      meta: { ultimaTheme: draftProvenance(draft) },
      files: [
        {
          path: 'ultima-theme.css',
          type: 'registry:file',
          target: '~/ultima-theme.css',
          content: toCss(draft),
        },
        {
          path: 'ultima-theme.json',
          type: 'registry:file',
          target: '~/ultima-theme.json',
          content: serializeDraft(draft),
        },
        {
          path: 'DESIGN.md',
          type: 'registry:file',
          target: '~/DESIGN.md',
          content: toDesignMd(draft),
        },
      ],
    },
    null,
    2,
  )}\n`;
}
