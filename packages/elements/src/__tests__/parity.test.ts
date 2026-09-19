import { describe, expect, test } from 'vitest';

import elementBadge from '../ult-badge.element.ts?raw';
import elementButton from '../ult-button.element.ts?raw';
import elementCard from '../ult-card.element.ts?raw';
import elementCode from '../ult-code.element.ts?raw';
import elementStat from '../ult-stat.element.ts?raw';
import elementTable from '../ult-table.element.ts?raw';
import reactBadge from '../../../ui/src/badge.tsx?raw';
import reactButton from '../../../ui/src/button.tsx?raw';
import reactCard from '../../../ui/src/card.tsx?raw';
import reactCode from '../../../ui/src/code.tsx?raw';
import reactStat from '../../../ui/src/stat.tsx?raw';
import reactTable from '../../../ui/src/table.tsx?raw';

type ElementParity = {
  tag: string;
  element: string;
  react: string;
  axes: Record<string, readonly string[]>;
  parts: readonly string[];
  stateMap: Record<string, string>;
};

const ELEMENTS: ElementParity[] = [
  {
    tag: 'ult-badge',
    element: elementBadge,
    react: reactBadge,
    axes: {
      variant: ['subtle', 'solid'],
      tone: ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'],
    },
    parts: ['root'],
    stateMap: {},
  },
  {
    tag: 'ult-button',
    element: elementButton,
    react: reactButton,
    axes: {
      variant: ['solid', 'outline', 'ghost'],
      size: ['sm', 'md', 'lg'],
      tone: ['accent', 'danger'],
    },
    parts: ['root'],
    stateMap: { 'data-disabled': 'data-disabled' },
  },
  {
    tag: 'ult-card',
    element: elementCard,
    react: reactCard,
    axes: {},
    parts: ['root', 'header', 'title', 'description', 'body', 'footer'],
    stateMap: {},
  },
  {
    tag: 'ult-code',
    element: elementCode,
    react: reactCode,
    axes: { variant: ['inline', 'block'] },
    parts: ['root'],
    stateMap: {},
  },
  {
    tag: 'ult-stat',
    element: elementStat,
    react: reactStat,
    axes: {},
    parts: ['root', 'label', 'value'],
    stateMap: {},
  },
  {
    tag: 'ult-table',
    element: elementTable,
    react: reactTable,
    axes: {},
    parts: ['caption', 'cell', 'head-cell', 'root', 'row', 'scroll'],
    stateMap: { 'data-sort': 'data-sort', 'aria-sort': 'aria-sort' },
  },
];

function stylexTables(source: string): string[] {
  const tables: string[] = [];
  for (const match of source.matchAll(/stylex\.create\(\{/g)) {
    const open = (match.index as number) + match[0].length - 1;
    let depth = 0;
    let end = open;
    for (; end < source.length; end++) {
      if (source[end] === '{') depth++;
      else if (source[end] === '}') {
        depth--;
        if (depth === 0) {
          end++;
          break;
        }
      }
    }
    tables.push(source.slice(open, end));
  }
  return tables;
}

function stylesPartKeys(source: string): string[] {
  const table = stylexTables(source)[0];
  if (!table) return [];
  return [...table.matchAll(/^ {2}(['"]?)([\w-]+)\1:/gm)].map((match) => match[2] as string);
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function tokenReads(source: string): string[] {
  return [...source.matchAll(/\['(--ult-[\w-]+)'\]/g)].map((match) => match[1] as string);
}

function partAttributes(source: string): string[] {
  const inMarkup = [...source.matchAll(/part="([^"]+)"/g)].map((match) => match[1] as string);
  const inCode = [...source.matchAll(/setAttribute\('part',\s*'([^']+)'\)/g)].map(
    (match) => match[1] as string,
  );
  return [...inMarkup, ...inCode];
}

function assertParity(decl: ElementParity): void {
  const elementTables = stylexTables(decl.element).sort();
  const reactTables = stylexTables(decl.react).sort();
  expect(elementTables, `${decl.tag}: stylex tables differ from the React source`).toEqual(reactTables);

  expect(tokenReads(decl.element).sort(), `${decl.tag}: token reads differ`).toEqual(
    tokenReads(decl.react).sort(),
  );

  for (const [axis, values] of Object.entries(decl.axes)) {
    expect(decl.element, `${decl.tag}: axis ${axis} is not read as an attribute`).toContain(
      `getAttribute('${axis}')`,
    );
    expect(decl.react, `${decl.tag}: axis ${axis} is not a React prop`).toMatch(
      new RegExp(`${axis}\\??:`),
    );
    for (const value of values) {
      expect(decl.element, `${decl.tag}: axis value ${axis}=${value} is missing`).toContain(`'${value}'`);
    }
  }

  expect([...new Set(partAttributes(decl.element))].sort(), `${decl.tag}: part= targets differ`).toEqual(
    [...decl.parts].sort(),
  );
  expect(stylesPartKeys(decl.react).map(kebab).sort(), `${decl.tag}: styled parts differ`).toEqual(
    [...decl.parts].sort(),
  );

  for (const [reactState, elementState] of Object.entries(decl.stateMap)) {
    expect(decl.react, `${decl.tag}: ${reactState} is not in the React source`).toContain(reactState);
    expect(decl.element, `${decl.tag}: ${elementState} is not mirrored`).toContain(elementState);
  }
}

describe.each(ELEMENTS)('$tag', (decl) => {
  test('restates the React source', () => {
    assertParity(decl);
  });

  test('fails when a stylex table drifts', () => {
    const token = tokenReads(decl.element)[0] as string;
    const drifted = { ...decl, element: decl.element.replace(token, '--ult-color-surface') };
    expect(() => assertParity(drifted)).toThrow(/stylex tables differ|token reads differ/);
  });

  test.skipIf(Object.keys(decl.axes).length === 0)('fails when an axis drifts', () => {
    const axis = Object.keys(decl.axes)[0] as string;
    const missing = {
      ...decl,
      element: decl.element.replace(`getAttribute('${axis}')`, `getAttribute('bogus')`),
    };
    expect(() => assertParity(missing)).toThrow(
      new RegExp(`axis ${axis} is not read as an attribute`),
    );
  });

  test('fails when a styled part drifts', () => {
    const drifted = {
      ...decl,
      element: decl.element.replace(`setAttribute('part', '${decl.parts[0]}')`, "setAttribute('part', 'base')"),
    };
    expect(() => assertParity(drifted)).toThrow(/part= targets differ/);
  });

  test.skipIf(Object.keys(decl.stateMap).length === 0)('fails when a state selector drifts', () => {
    const elementState = Object.values(decl.stateMap)[0] as string;
    const drifted = { ...decl, element: decl.element.replaceAll(elementState, 'data-inert') };
    expect(() => assertParity(drifted)).toThrow();
  });
});
