import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { tagMismatch } from '../../scripts/release-tag.ts';
import { REGISTRY_FORMAT } from '../stamp.ts';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '../..');
const repository = join(packageDir, '../..');
const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
const INSTALLED = ['dependencies', 'peerDependencies', 'optionalDependencies', 'bundleDependencies'];

describe('the published package', () => {
  it('distributes the bundled consumer skill through the marketplace at the CLI version', () => {
    const marketplace = JSON.parse(readFileSync(join(repository, '.claude-plugin/marketplace.json'), 'utf8'));
    expect(marketplace.plugins).toHaveLength(1);
    const [plugin] = marketplace.plugins;
    expect(plugin.name).toBe(manifest.name);
    expect(plugin.version).toBe(manifest.version);
    expect(plugin.skills).toHaveLength(1);
    const distributed = join(repository, plugin.source, plugin.skills[0], 'SKILL.md');
    expect(distributed).toBe(join(packageDir, 'skill/ultima-design/SKILL.md'));
    expect(readFileSync(distributed, 'utf8')).toContain('name: ultima-design');
  });

  it('packs only the bundle, the skill and the manifest', () => {
    const [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: packageDir, encoding: 'utf8' }));
    expect(pack.files.map(({ path }: { path: string }) => path).sort()).toEqual(['dist/cli.js', 'package.json', 'skill/ultima-design/SKILL.md']);
  });

  // The workflow publishes the tarball `pnpm pack` writes, which rewrites workspace: ranges.
  it('publishes a manifest that installs no @ultima/* package', () => {
    const destination = mkdtempSync(join(tmpdir(), 'ultima-pack-'));
    execFileSync('pnpm', ['pack', '--pack-destination', destination], { cwd: packageDir, encoding: 'utf8' });
    const [tarball] = readdirSync(destination).filter((file) => file.endsWith('.tgz'));
    execFileSync('tar', ['-xzf', join(destination, tarball as string), '-C', destination]);
    const packed = JSON.parse(readFileSync(join(destination, 'package/package.json'), 'utf8'));
    rmSync(destination, { recursive: true, force: true });
    expect(packed.private).toBeUndefined();
    expect(packed.bin).toEqual({ ultima: './dist/cli.js' });
    for (const field of INSTALLED) {
      expect(Object.keys(packed[field] ?? {}).filter((name) => name.startsWith('@ultima/')), field).toEqual([]);
    }
    expect(JSON.stringify(packed)).not.toContain('workspace:');
  });

  it('declares what npm needs to publish it with provenance', () => {
    expect(manifest.name).toBe('ultima-design');
    expect(manifest.version).toMatch(/^0\.\d+\.\d+$/);
    expect(manifest.engines.node).toBeDefined();
    expect(manifest.repository).toEqual({ type: 'git', url: 'git+https://github.com/frankieramirez/ultima.git', directory: 'packages/cli' });
    expect(manifest.publishConfig).toEqual({ access: 'public', provenance: true });
  });

  it('reads the registry format the registry build writes', () => {
    const { min, max } = manifest.ultima.registryFormats;
    expect(min).toBeLessThanOrEqual(REGISTRY_FORMAT);
    expect(max).toBe(REGISTRY_FORMAT);
  });

  it('is the only workspace package that is not private', () => {
    const manifests = ['packages', 'apps'].flatMap((folder) =>
      readdirSync(join(repository, folder)).map((name) => JSON.parse(readFileSync(join(repository, folder, name, 'package.json'), 'utf8'))),
    );
    expect(manifests.filter((json) => json.private !== true).map((json) => json.name)).toEqual(['ultima-design']);
  });

  it.each([
    ['doctor'],
    ['status'],
    ['diff', 'button'],
    ['check'],
    ['install', '--dry-run'],
    ['uninstall'],
  ])('routes %s in the built binary', (...args) => {
    const root = mkdtempSync(join(tmpdir(), 'ultima-routed-'));
    writeFileSync(join(root, 'package.json'), '{}\n');
    const result = spawnSync(process.execPath, [join(packageDir, 'dist/cli.js'), ...args, '--cwd', root], { encoding: 'utf8' });
    rmSync(root, { recursive: true, force: true });
    expect(result.stderr).not.toMatch(/not available/);
    expect(result.status).not.toBe(2);
  });
});

describe('the release tag', () => {
  it('passes a cli-v tag that names the package version', () => {
    expect(tagMismatch('cli-v0.1.0', '0.1.0')).toBeNull();
    expect(tagMismatch('cli-v1.0.0-rc.1', '1.0.0-rc.1')).toBeNull();
  });

  it.each([
    ['cli-v0.1.1', '0.1.0', /names 0\.1\.1, but packages\/cli\/package\.json is at 0\.1\.0/],
    ['v0.1.0', '0.1.0', /not a cli-v<version> tag/],
    ['cli-0.1.0', '0.1.0', /not a cli-v<version> tag/],
  ])('refuses %s against %s', (tag, version, reason) => {
    expect(tagMismatch(tag, version)).toMatch(reason);
  });

  it('fails the workflow step on a mismatch and passes it on a match', () => {
    const script = join(packageDir, 'scripts/release-tag.ts');
    const step = (tag: string) => spawnSync(process.execPath, ['--experimental-strip-types', script, tag], { encoding: 'utf8' });
    const wrong = step('cli-v99.0.0');
    expect(wrong.status).toBe(1);
    expect(wrong.stderr).toContain(`names 99.0.0, but packages/cli/package.json is at ${manifest.version}`);
    expect(step(`cli-v${manifest.version}`).status).toBe(0);
  });
});
