import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { installed } from './fixtures.ts';

const cli = join(dirname(fileURLToPath(import.meta.url)), '../../dist/cli.js');

function ultima(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

describe('the built binary', () => {
  it('starts with a shebang', () => {
    expect(readFileSync(cli, 'utf8').split('\n')[0]).toBe('#!/usr/bin/env node');
  });

  it('exits 0 on a correct Vite install', () => {
    const result = ultima('doctor', '--cwd', installed('vite'));
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('links the spec at the commit it was built from', () => {
    const result = ultima('doctor', '--json', '--cwd', installed('vite', installed('next')), '--target', 'next');
    const [diagnostic] = JSON.parse(result.stdout).diagnostics;
    expect(diagnostic.link).toMatch(/^https:\/\/github\.com\/frankieramirez\/ultima\/blob\/[0-9a-f]{40}\/docs\/spec\/ultima\.md#setup-items$/);
  });

  it('exits 2 on an unknown flag', () => {
    expect(ultima('doctor', '--bogus').status).toBe(2);
  });
});
