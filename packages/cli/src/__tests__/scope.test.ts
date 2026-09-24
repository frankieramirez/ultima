import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { consumerScope } from '../scope.ts';
import { project } from './fixtures.ts';

const components = JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' } });

describe('consumerScope', () => {
  it("honours a Vite project's tsconfig.app.json through project references", () => {
    const root = project({
      'components.json': components,
      'tsconfig.json': JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }] }),
      'tsconfig.app.json': '{\n  // create-vite ships JSONC\n  "extends": "./tsconfig.paths.json",\n  "include": ["src"]\n}\n',
      'tsconfig.paths.json': JSON.stringify({ compilerOptions: { moduleResolution: 'bundler', paths: { '@/*': ['./src/*'] } } }),
      'src/components/ui/button.tsx': 'export const Button = 1;\n',
      'src/App.tsx': "import { Button } from '@/components/ui/button';\n",
    });
    const scope = consumerScope(root);
    if ('incomplete' in scope) throw new Error(scope.incomplete.message);
    expect(scope.aliases).toEqual({ ui: '@/components/ui', lib: '@/lib' });
    expect(scope.directories).toEqual({ ui: join(root, 'src/components/ui'), lib: join(root, 'src/lib') });
    expect(scope.resolveFile('@/components/ui/button', join(root, 'src/App.tsx'))).toBe(join(root, 'src/components/ui/button.tsx'));
  });

  it('takes --project over tsconfig.json', () => {
    const root = project({
      'components.json': components,
      'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
      'tsconfig.web.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./web/*'] } } }),
    });
    const scope = consumerScope(root, { project: 'tsconfig.web.json' });
    if ('incomplete' in scope) throw new Error(scope.incomplete.message);
    expect(scope.tsconfig).toBe(join(root, 'tsconfig.web.json'));
    expect(scope.directories.ui).toBe(join(root, 'web/components/ui'));
  });

  it.each([
    ['components.json', { 'tsconfig.json': '{}' }],
    ['components.json', { 'components.json': '{ nope', 'tsconfig.json': '{}' }],
    ['tsconfig.json', { 'components.json': components }],
    ['tsconfig.json', { 'components.json': components, 'tsconfig.json': '{ "extends": "./missing.json" }' }],
  ])('is incomplete and names %s when it is missing or unparseable', (file, files) => {
    const scope = consumerScope(project(files));
    expect(scope).toMatchObject({ incomplete: { severity: 'incomplete', file } });
  });

  it('never guesses an alias that no tsconfig path maps', () => {
    const scope = consumerScope(project({ 'components.json': components, 'tsconfig.json': '{}' }));
    expect(scope).toMatchObject({ incomplete: { severity: 'incomplete', file: 'components.json' } });
    expect('incomplete' in scope && scope.incomplete.message).toMatch(/@\/components\/ui/);
  });
});
