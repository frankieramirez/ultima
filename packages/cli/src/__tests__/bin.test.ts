import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { edit, editComponents, project, smoke, snapshot, write } from './fixtures.ts';
import { stockDraft } from '../../../tokens/src/theme/draft.ts';
import { serializeDraft } from '../../../tokens/src/theme/codec.ts';
import { toCss, toDesignMd } from '../../../tokens/src/theme/export.ts';

const cli = join(dirname(fileURLToPath(import.meta.url)), '../../dist/cli.js');

function ultima(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

describe('the built binary', () => {
  it('starts with a shebang', () => {
    expect(readFileSync(cli, 'utf8').split('\n')[0]).toBe('#!/usr/bin/env node');
  });

  it('exits 0 on a correct Vite install', () => {
    const result = ultima('doctor', '--cwd', smoke('vite'));
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('links the spec at the commit it was built from', () => {
    const root = smoke('vite');
    editComponents(root, (json) => {
      json.style = 'new-york';
    });
    const [diagnostic] = JSON.parse(ultima('doctor', '--json', '--cwd', root).stdout).diagnostics;
    expect(diagnostic.link).toMatch(/^https:\/\/github\.com\/frankieramirez\/ultima\/blob\/[0-9a-f]{40}\/docs\/spec\/ultima\.md#setup-items$/);
  });

  it("links a hand step's finding to its line under What the consumer still does by hand", () => {
    const root = smoke('vite');
    edit(root, 'vite.config.ts', (text) => text.replace('[ultimaStylex(), react()]', '[react(), ultimaStylex()]'));
    const [diagnostic] = JSON.parse(ultima('doctor', '--json', '--cwd', root).stdout).diagnostics;
    const match = /^https:\/\/github\.com\/frankieramirez\/ultima\/blob\/[0-9a-f]{40}\/docs\/spec\/ultima\.md\?plain=1#L(\d+)$/.exec(
      diagnostic.link,
    );
    expect(match).not.toBeNull();
    const line = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../docs/spec/ultima.md'), 'utf8')
      .split('\n')[Number(match?.[1]) - 1];
    expect(line).toMatch(/^- \*\*Vite\.\*\* Add `"paths"/);
  });

  it.each(['vite', 'next'] as const)('passes the smoke-install %s project without touching the network', (target) => {
    const offline = join(mkdtempSync(join(tmpdir(), 'ultima-offline-')), 'offline.mjs');
    writeFileSync(
      offline,
      [
        "import dns from 'node:dns';",
        "import net from 'node:net';",
        'const refuse = () => { process.stderr.write("network request\\n"); process.exit(99); };',
        'net.Socket.prototype.connect = refuse;',
        'dns.lookup = refuse;',
        'globalThis.fetch = refuse;',
      ].join('\n'),
    );
    const result = spawnSync(process.execPath, ['--import', offline, cli, 'doctor', '--cwd', smoke(target)], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('installs the skill it ships, stamped with its own version', () => {
    const root = project();
    expect(ultima('install', '--cwd', root, '--harness', 'claude').status).toBe(0);
    const { version } = JSON.parse(readFileSync(join(dirname(cli), '../package.json'), 'utf8'));
    expect(readFileSync(join(root, '.claude/skills/ultima-design/SKILL.md'), 'utf8')).toContain(`ultima-design: ${version} sha256:`);
  });

  it.each(['vite', 'next'] as const)('completes linked --theme comparison in %s with network denied and tree unchanged', (target) => {
    const offline = join(mkdtempSync(join(tmpdir(), 'ultima-theme-offline-')), 'offline.mjs');
    writeFileSync(offline, [
      "import dns from 'node:dns';", "import net from 'node:net';", "import http from 'node:http';", "import https from 'node:https';",
      'const refuse = () => { process.stderr.write("network request\\n"); process.exit(99); };',
      'net.Socket.prototype.connect = refuse; dns.lookup = refuse; http.request = refuse; https.request = refuse; globalThis.fetch = refuse;',
    ].join('\n'));
    const root = smoke(target);
    const draft = stockDraft();
    write(root, 'ultima-theme.css', toCss(draft));
    write(root, 'ultima-theme.json', serializeDraft(draft));
    write(root, 'DESIGN.md', toDesignMd(draft));
    edit(root, target === 'vite' ? 'src/main.tsx' : 'app/layout.tsx', (text) => `import '../ultima-theme.css';\n${text}`);
    const before = snapshot(root);
    const result = spawnSync(process.execPath, ['--import', offline, cli, 'doctor', '--theme', '--json', '--cwd', root], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).theme.rows.find((row: { artifact: string }) => row.artifact === 'css').state).toBe('match');
    expect(snapshot(root)).toEqual(before);
  });

  it('exits 2 on an unknown flag', () => {
    expect(ultima('doctor', '--bogus').status).toBe(2);
  });
});
