import { expect, test } from 'vitest';

/**
 * The enforceable half of two rules under Docs site / The line between a component and page
 * layout: a docs file may not paint a surface, and may not hide a native scrollbar without
 * painting a replacement. `scrollbarWidth` belongs to the same gate because it is the same kind
 * of thing, a property a docs file writes that only a component should.
 */

const FORBIDDEN = [
  /^background(?:Color)?$/,
  /^boxShadow$/,
  /^border$/,
  /^border(?:[A-Z][A-Za-z]*)?Color$/,
  /^border(?:[A-Z][A-Za-z]*)?Width$/,
  /^border(?:[A-Z][A-Za-z]*)?Radius$/,
  /^scrollbarWidth$/,
];

const forbidden = (property: string) => FORBIDDEN.some((pattern) => pattern.test(property));

const KEY = /(?:^|[{,])\s*['"]?([A-Za-z][A-Za-z0-9]*)['"]?\s*:/g;

const CREATE = 'stylex.create(';

const IDENTIFIER = /^[A-Za-z][A-Za-z0-9]*$/;

/** Returns `source` with the same length and the same braces, and every literal's content blanked. */
function redact(source: string): string {
  const out = source.split('');
  let index = 0;

  const blank = (from: number, to: number) => {
    for (let i = from; i < to && i < out.length; i += 1) if (out[i] !== '\n') out[i] = ' ';
  };
  const closingQuote = (quote: string, from: number) => {
    for (let i = from; i < source.length; i += 1) {
      if (source[i] === '\\') i += 1;
      else if (source[i] === quote) return i;
    }
    return source.length;
  };
  /** `'backgroundColor': red` is a declaration, so a quoted key survives where its value does not. */
  const isKey = (content: string, end: number) =>
    IDENTIFIER.test(content) && /^\s*:/.test(source.slice(end + 1));

  while (index < source.length) {
    const char = source[index] as string;
    const next = source[index + 1];

    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index);
      const stop = end === -1 ? source.length : end;
      blank(index, stop);
      index = stop;
    } else if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(index, stop);
      index = stop;
    } else if (char === "'" || char === '"') {
      const end = closingQuote(char, index + 1);
      if (!isKey(source.slice(index + 1, end), end)) blank(index + 1, end);
      index = end + 1;
    } else if (char === '`') {
      const end = closingQuote(char, index + 1);
      blank(index + 1, end);
      index = end + 1;
    } else {
      index += 1;
    }
  }

  return out.join('');
}

function createCalls(redacted: string): string[] {
  const calls: string[] = [];
  let from = redacted.indexOf(CREATE);

  while (from !== -1) {
    let depth = 0;
    let index = from + CREATE.length - 1;
    for (; index < redacted.length; index += 1) {
      if (redacted[index] === '(') depth += 1;
      else if (redacted[index] === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    calls.push(redacted.slice(from + CREATE.length, index));
    from = redacted.indexOf(CREATE, index);
  }

  return calls;
}

/** Every forbidden property a `stylex.create` call in this source declares, in source order. */
export function findForbiddenDeclarations(source: string): string[] {
  const found: string[] = [];
  for (const call of createCalls(redact(source))) {
    for (const [, property = ''] of call.matchAll(KEY)) {
      if (forbidden(property)) found.push(property);
    }
  }
  return found;
}

const SPEC_NAMED = ['src/copy-button.tsx', 'src/swatch.tsx'];
const STUDIO_CHROME = ['src/routes/theme-studio.tsx', 'src/theme-studio-preview.tsx'];
const SITE_CHROME = ['src/header.tsx'];
const SPECIMEN_PAPER = ['src/demo.tsx'];
// The catalogue cards restate Card's own surface at surface-hover through the style slot (#375).
const CARD_HOVER = ['src/routes/components.tsx'];
const STATED_EXCEPTIONS = [...SPEC_NAMED, ...STUDIO_CHROME, ...SITE_CHROME, ...SPECIMEN_PAPER, ...CARD_HOVER];

const sources = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const files = Object.entries(sources)
  .map(([path, source]) => [path.replace(/^\.\./, 'src'), source] as const)
  .filter(([path]) => !path.startsWith('src/demos/'))
  .sort(([a], [b]) => a.localeCompare(b));

test('the gate reads the docs source outside demos', () => {
  expect(files.length).toBeGreaterThan(20);
  expect(files.map(([path]) => path)).toEqual(expect.arrayContaining(STATED_EXCEPTIONS));
});

test('no docs file outside demos paints a surface', () => {
  const painted = files
    .filter(([path]) => !STATED_EXCEPTIONS.includes(path))
    .map(([path, source]) => [path, findForbiddenDeclarations(source)] as const)
    .filter(([, declarations]) => declarations.length > 0)
    .map(([path, declarations]) => `${path}: ${declarations.join(', ')}`);

  expect(painted).toEqual([]);
});

test('the gate catches each of the four painting properties', () => {
  const source = `
    const styles = stylex.create({
      panel: {
        backgroundColor: color['--ult-color-surface-raised'],
        borderRadius: radius['--ult-radius-lg'],
        borderTopWidth: border.hairline,
        borderInlineStartColor: color['--ult-color-border'],
        boxShadow: shadow['--ult-shadow-md'],
        borderStyle: 'solid',
        padding: space['--ult-space-6'],
      },
    });
  `;

  expect(findForbiddenDeclarations(source)).toEqual([
    'backgroundColor',
    'borderRadius',
    'borderTopWidth',
    'borderInlineStartColor',
    'boxShadow',
  ]);
});

test('the gate reads a stylex.create below a JSX closing tag', () => {
  const source = `
    const a = stylex.create({ one: { backgroundColor: 'red' } });
    function C() { return (<div className="x"><svg viewBox="0 0 1 1" /></div>); }
    const b = stylex.create({ two: { borderRadius: 'r', borderColor: 'c' } });
  `;

  expect(findForbiddenDeclarations(source)).toEqual([
    'backgroundColor',
    'borderRadius',
    'borderColor',
  ]);
});

test('the gate catches a hidden native scrollbar', () => {
  const source = `stylex.create({ column: { scrollbarWidth: 'none' } });`;

  expect(findForbiddenDeclarations(source)).toEqual(['scrollbarWidth']);
});

test('the gate catches a quoted key and a shorthand', () => {
  const source = `stylex.create({ card: { 'backgroundColor': 'red', border: '1px solid red' } });`;

  expect(findForbiddenDeclarations(source)).toEqual(['backgroundColor', 'border']);
});

test('the gate reads the live declarations of a real docs file', () => {
  const swatch = files.find(([path]) => path === 'src/swatch.tsx');
  expect(swatch).toBeDefined();
  expect(findForbiddenDeclarations(swatch?.[1] ?? '')).toContain('backgroundColor');
});

test('the gate ignores a painting property that is not a live declaration', () => {
  const source = [
    "const example = `stylex.create({ card: { backgroundColor: 'red' } })`;",
    "const css = ':root { background-color: red; border-radius: 4px }';",
    '// borderRadius: radius.lg,',
    '/* boxShadow: shadow.md, */',
    'const styles = stylex.create({',
    "  row: { transitionProperty: 'background-color, border-color', outline: '1px solid red' },",
    '});',
  ].join('\n');

  expect(findForbiddenDeclarations(source)).toEqual([]);
});
