import { draftFingerprint, serializeDraft } from './codec.ts';
import { resolveDraft, type ThemeDraft, type TokenTable } from './draft.ts';
import { gate } from './gate.ts';

export const STUDIO_VERSION = 1;

const GROUPS = ['color', 'space', 'text', 'font', 'radius', 'shadow', 'motion'] as const;
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
  const lines = [`/* ${artifactHeader(draft)} */`];
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
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
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

export function toRegistryItem(draft: ThemeDraft): string {
  return `${JSON.stringify(
    {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json',
      name: 'ultima-theme',
      type: 'registry:item',
      title: 'Ultima theme',
      description: artifactHeader(draft),
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
      ],
    },
    null,
    2,
  )}\n`;
}
