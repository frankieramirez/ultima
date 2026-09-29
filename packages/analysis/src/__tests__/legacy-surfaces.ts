// The docs surface scanner that apps/docs/src/__tests__/surfaces.test.ts ran until ULT-DOCS-001 replaced
// it, copied verbatim and kept only as the oracle docs.test.ts compares the new rule against. It reads
// text, not syntax. docs/spec/agent-infrastructure.md, Adoption and maintenance: a replaced scanner is
// retired in the change that proves its replacement covers it, and the comparison stays as that proof.
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

/** The old scanner's whole-file allowlist, for the inventory test. */
const SPEC_NAMED = ['src/copy-button.tsx', 'src/swatch.tsx'];
const STUDIO_CHROME = ['src/routes/theme-studio.tsx', 'src/theme-studio-preview.tsx'];
const SITE_CHROME = ['src/header.tsx'];
const SPECIMEN_PAPER: string[] = [];
// The catalogue cards restate Card's own surface at surface-hover through the style slot (#375).
const CARD_HOVER: string[] = [];
export const STATED_EXCEPTIONS = [...SPEC_NAMED, ...STUDIO_CHROME, ...SITE_CHROME, ...SPECIMEN_PAPER, ...CARD_HOVER];
