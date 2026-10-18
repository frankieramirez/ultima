import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { describe, expect, it } from 'vitest';

import { UNMARKED_NEUTRAL_HASHES } from '../base-theme.ts';
import { type BaseCatalogue, installedBase } from '../base.ts';
import { SOURCE, contentHash, stampLine } from '../stamp.ts';
import type { Row } from '../status.ts';

const scope = { aliases: { ui: '@/components/ui', lib: '@/lib' }, components: { rsc: false } } as Parameters<typeof installedBase>[2];

function tokens(names: string[], source: string): BaseCatalogue {
  return { source, items: [{ name: 'tokens', type: 'registry:lib', files: names.map((name) => ({ path: `ultima/lib/${name}` })) }], fetched: new Map() };
}

function row(file: string, revision: string, hash: string): Row {
  return { item: 'tokens', file: `src/lib/${file}`, state: 'diverged', installed: { revision, hash }, local: 'c1:0000000000000000', served: 'c1:1111111111111111' };
}

describe('installedBase', () => {
  it('rebuilds tokens with the base-theme marker and renders it as installed, leading comments dropped', async () => {
    const authored = "// Authored header.\nimport { palette } from '@ultima/tokens/palette';\n\nexport const x = palette;\n";
    const server = createServer((_request, response) => response.writeHead(200).end(authored));
    await new Promise<void>((listening) => server.listen(0, '127.0.0.1', listening));
    server.unref();
    const raw = `http://127.0.0.1:${(server.address() as AddressInfo).port}/{revision}/{path}`;
    const hash = await contentHash("import { palette } from '@/registry/ultima/lib/palette';\n\nexport const x = palette;\n", 'c1');

    expect(await installedBase(row('tokens.stylex.ts', 'aaaaaaaaaaaa', hash), tokens(['tokens.stylex.ts'], raw), scope)).toEqual({
      text: [
        "import { palette } from '@/lib/palette';",
        '',
        'export const x = palette;',
        '// @ultima-base neutral-tight',
        stampLine('tokens', 'aaaaaaaaaaaa', hash, 'ts'),
        '',
      ].join('\n'),
    });
  });
});

// Networked: reads the public repository, and is skipped when raw.githubusercontent.com cannot be reached.
const online = await fetch(SOURCE.raw.replace('{revision}', 'e2f9db14c886').replace('{path}', 'package.json'), { method: 'HEAD', signal: AbortSignal.timeout(5_000) }).then(
  (response) => response.ok,
  () => false,
);

describe.skipIf(!online)('installedBase against the public repository [network]', () => {
  it('rebuilds the four c1 hashes base-theme.ts pins from e2f9db14', async () => {
    const files = ['palette.ts', 'themes.ts', 'tokens-json.ts', 'tokens.stylex.ts'];
    const pinned = UNMARKED_NEUTRAL_HASHES.filter((hash) => hash.startsWith('c1:'));
    expect(pinned).toHaveLength(4);
    const catalogue = tokens(files, SOURCE.raw);
    const bases = await Promise.all(files.map((file, index) => installedBase(row(file, 'e2f9db14c886', pinned[index] as string), catalogue, scope)));
    expect(bases.map((base) => ('text' in base ? 'verified' : base.reason))).toEqual(['verified', 'verified', 'verified', 'verified']);
  }, 60_000);
});
