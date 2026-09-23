import { describe, expect, it } from 'vitest';

import { contentHash, readStamp, stampLine, withStamp } from '../stamp.ts';

const staged = `'use client';

import { Button as Primitive } from '@base-ui/react/button';
import * as stylex from '@stylexjs/stylex';

import type { StyleSlot } from '@/registry/ultima/lib/component';
import { color } from '@/registry/ultima/lib/tokens.stylex';
import { Spinner } from '@/registry/ultima/ui/spinner';

/** The one action a surface asks for. */
export function Button({ busy, style, children }: { busy?: boolean; style?: StyleSlot; children: React.ReactNode }) {
  const label = busy ? 'Working' : null;
  return (
    <Primitive {...stylex.props(styles.base, style)}>
      {/* the spinner replaces nothing */}
      {busy && <Spinner label={label} />}
      {children}
    </Primitive>
  );
}

const styles = stylex.create({
  base: { color: color.text, padding: 8 },
});
`;

// What shadcn writes for a Vite consumer (import rewrite and RSC transform), then a
// formatter pass with other quote and wrap choices, CRLF endings, and a comment added.
const installed = [
  "import { Button as Primitive } from \"@base-ui/react/button\"",
  'import * as stylex from "@stylexjs/stylex"',
  '',
  'import type { StyleSlot } from "@/lib/component"',
  'import { color } from "@/lib/tokens.stylex"',
  'import { Spinner } from "@/components/ui/spinner"',
  '',
  '// Our copy: keep the spinner.',
  'export function Button({',
  '  busy,',
  '  style,',
  '  children,',
  '}: {',
  '  busy?: boolean',
  '  style?: StyleSlot',
  '  children: React.ReactNode',
  '}) {',
  '  const label = busy ? "Working" : null',
  '',
  '  return (',
  '    <Primitive {...stylex.props(styles.base, style)}>',
  '      {busy && <Spinner label={label} />}',
  '      {children}',
  '    </Primitive>',
  '  )',
  '}',
  '',
  'const styles = stylex.create({',
  '  base: {',
  '    color: color.text,',
  '    padding: 8,',
  '  },',
  '})',
  '',
].join('\r\n');

const aliases = { ui: '@/components/ui', lib: '@/lib' };

describe('contentHash c1', () => {
  it('hashes a staged file and its installed, reformatted, annotated copy equal', async () => {
    const hash = await contentHash(staged, 'c1');
    expect(hash).toMatch(/^c1:[0-9a-f]{16}$/);
    expect(await contentHash(installed, 'c1', aliases)).toBe(hash);
  });

  it('hashes a change that moves code differently', async () => {
    const moved = staged.replace('padding: 8', 'padding: 12');
    expect(await contentHash(moved, 'c1')).not.toBe(await contentHash(staged, 'c1'));
  });

  it('keeps a consumer alias distinct when no aliases are given', async () => {
    expect(await contentHash(installed, 'c1')).not.toBe(await contentHash(staged, 'c1'));
  });
});

describe('the stamp line', () => {
  it('sits on the last line and reads back, and hashes as a comment', async () => {
    const hash = await contentHash(staged, 'c1');
    const stamped = withStamp(staged, stampLine('button', '2086dc80e7af', hash, 'ts'));
    expect(stamped.endsWith(`});\n// @ultima/button 2086dc80e7af ${hash}\n`)).toBe(true);
    expect(readStamp(stamped)).toEqual({ item: 'button', revision: '2086dc80e7af', scheme: 'c1', hash: hash.slice(3) });
    expect(await contentHash(stamped, 'c1')).toBe(hash);
  });

  it('survives the RSC transform and a formatter adding trailing blank lines', () => {
    const stamped = withStamp(staged, stampLine('button', 'local', 'c1:0123456789abcdef', 'ts'));
    expect(readStamp(`${stamped.replace("'use client';\n", '')}\n\n`)?.hash).toBe('0123456789abcdef');
  });

  it('is absent from a file that carries none, or carries one out of position', () => {
    expect(readStamp(staged)).toBeNull();
    expect(readStamp(`${stampLine('button', 'local', 'c1:0123456789abcdef', 'ts')}\n${staged}`)).toBeNull();
  });
});

describe('contentHash b1', () => {
  const bundle = 'const sheet = 1;\r\ncustomElements.define("ult-button", class {});\r\n';

  it('ignores CRLF and its own stamp line, and nothing else', async () => {
    const hash = await contentHash(bundle, 'b1');
    const stamped = withStamp(bundle.replace(/\r\n/g, '\n'), stampLine('ult-button', 'local', hash, 'css'));
    expect(stamped.endsWith(`});\n/* @ultima/ult-button local ${hash} */\n`)).toBe(true);
    expect(await contentHash(stamped, 'b1')).toBe(hash);
    expect(await contentHash(`${bundle} `, 'b1')).not.toBe(hash);
  });
});
