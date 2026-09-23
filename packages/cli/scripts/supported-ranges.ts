// docs/spec/ultima.md, Consumer CLI, Doctor, Versions: the ranges doctor compares with,
// taken from the workspace at build. The floor is the lowest version a workspace package
// declares; the ceiling is the highest version the workspace resolves, which is the one tested.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { setupItems } from '../../../registry/items.config.ts';
import { compareVersions, resolveInstalledVersion, type SupportedRanges } from '../src/setup.ts';

export function supportedRanges(workspace: string): SupportedRanges {
  const packages = new Set(
    Object.values(setupItems).flatMap(({ handSteps, checks }) =>
      [...handSteps, ...checks].flatMap(({ assertion }) => (assertion?.kind === 'version-in-range' ? assertion.packages : [])),
    ),
  );
  const directories = ['apps', 'packages'].flatMap((group) =>
    readdirSync(join(workspace, group)).map((name) => join(workspace, group, name)),
  );
  const manifests = directories
    .filter((directory) => existsSync(join(directory, 'package.json')))
    .map((directory) => ({ directory, json: JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) }));

  const ranges: SupportedRanges = {};
  for (const name of packages) {
    const floors: string[] = [];
    const resolved: string[] = [];
    for (const { directory, json } of manifests) {
      const declared = json.dependencies?.[name] ?? json.devDependencies?.[name] ?? json.peerDependencies?.[name];
      if (declared === undefined) continue;
      const floor = /^[\^~]?(\d+\.\d+\.\d+)$/.exec(declared)?.[1];
      if (!floor) {
        throw new Error(`${directory}/package.json declares ${name} as "${declared}"; the CLI build reads only ^x.y.z, ~x.y.z, or x.y.z`);
      }
      const version = resolveInstalledVersion(directory, name);
      if (!version) throw new Error(`${name} does not resolve from ${directory}; run pnpm install`);
      floors.push(floor);
      resolved.push(version);
    }
    const [floor] = floors.sort(compareVersions);
    const ceiling = resolved.sort(compareVersions).at(-1);
    if (!floor || !ceiling) throw new Error(`no workspace package declares ${name}, so doctor has no supported range for it`);
    ranges[name] = { floor, ceiling };
  }
  return ranges;
}
