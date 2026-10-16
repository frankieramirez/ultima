import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { RECIPES } from '../recipe.ts';
import { SHADCN, SHADCN_ADD, SHADCN_VERSION } from '../shadcn.ts';

const ROOT = join(import.meta.dirname, '../../../..');

// Records of past runs and decisions quote the commands they saw, and these fixtures exercise
// unrelated rendering with a sample command, so none of them prints guidance.
const EXEMPT = [
  /^docs\/(evidence|research|adr)\//,
  /^CONTEXT\.md$/,
  /\.pen$/,
  /^apps\/docs\/public\/theme-studio-prototype\.html$/,
  /^apps\/docs\/src\/__tests__\/prose\.test\.tsx$/,
  /^packages\/ui\/src\/__tests__\/code\.test\.tsx$/,
  /^scripts\/catalogue\/model\.test\.ts$/,
  // A stand-in recipe proves init builds its commands from the recipe's version.
  /^packages\/cli\/src\/__tests__\/init\.test\.ts$/,
  // This file, whose comment spells out the shapes it rejects.
  /^packages\/cli\/src\/__tests__\/shadcn-version\.test\.ts$/,
];

// `npx shadcn add`, `npx -y shadcn@latest add`, `pnpm dlx shadcn@x add`, `bunx shadcn add`, and `'shadcn@x'` as an argument.
const COMMAND = /(?:npx(?: -y| --yes)?|pnpm dlx|bunx) shadcn(@[\w.-]+)? add|'shadcn@([\w.-]+)'/g;

test('init pins the one shadcn version', () => {
  expect(SHADCN).toBe(`shadcn@${SHADCN_VERSION}`);
  expect(SHADCN_ADD).toBe(`npx shadcn@${SHADCN_VERSION} add`);
  for (const recipe of RECIPES) expect(recipe.shadcn).toEqual({ package: 'shadcn', version: SHADCN_VERSION });
});

test('every printed shadcn command names the version init pins', () => {
  const files = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((path) => path && !EXEMPT.some((pattern) => pattern.test(path)));
  const stale: string[] = [];
  for (const path of files) {
    let text: string;
    try {
      text = readFileSync(join(ROOT, path), 'utf8');
    } catch {
      continue;
    }
    if (!text.includes('shadcn')) continue;
    for (const match of text.matchAll(COMMAND)) {
      const version = match[1] ?? (match[2] === undefined ? undefined : `@${match[2]}`);
      if (version !== `@${SHADCN_VERSION}`) stale.push(`${path}: ${match[0]}`);
    }
  }
  expect(stale).toEqual([]);
});
