// The catalogue and token names `check` reads offline, embedded at build from the CLI's own commit:
// docs/spec/ultima.md, Consumer CLI, Package and engine, Build.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import exceptions from '../../analysis/exceptions.ts';
import { diskFiles } from '../../../scripts/catalogue/files.ts';
import { stagedSources } from '../../../scripts/catalogue/staging.ts';

/** One file an item installs under `aliases.ui` or `aliases.lib`. */
export type BundledFile = { item: string; folder: 'ui' | 'lib'; name: string };

export function bundledCatalogue(repository: string): BundledFile[] {
  return stagedSources(diskFiles(repository)).sources.map(({ item, staged }) => {
    const [, folder, name] = staged.split('/') as [string, 'ui' | 'lib', string];
    return { item, folder, name };
  });
}

/** The token source, so a project that reads the tokens only as CSS still has their names. */
export function bundledTokens(repository: string): string {
  return readFileSync(join(repository, 'packages/tokens/src/tokens.stylex.ts'), 'utf8');
}

/** A value Ultima's own typed exceptions authorize in a component, which its installed copy keeps. */
export type Authorized = { item: string; ruleId: string; symbol: string; target: string; selector?: string; expression?: string };

export function bundledAuthorized(): Authorized[] {
  return exceptions.flatMap(({ rule, path, symbol, target, selector, expression }) => {
    const item = /^packages\/ui\/src\/([^/]+)\.tsx$/.exec(path)?.[1];
    if (rule !== 'ULT-TOKEN-001' || item === undefined) return [];
    return [{ item, ruleId: 'ULT-APP-PAINT-001', symbol, target, ...(selector !== undefined && { selector }), ...(expression !== undefined && { expression }) }];
  });
}
