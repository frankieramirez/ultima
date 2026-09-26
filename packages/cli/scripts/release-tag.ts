// The release gate on the tag: docs/spec/ultima.md, Consumer CLI, Package and engine, Release.
// A `cli-v<version>` tag publishes only when <version> is the hand-bumped version in package.json.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = /^cli-v(.+)$/;

/** The reason `tag` may not publish a package at `version`, or null when it may. */
export function tagMismatch(tag: string, version: string): string | null {
  const match = TAG.exec(tag);
  if (!match) return `${tag} is not a cli-v<version> tag`;
  if (match[1] !== version) return `${tag} names ${match[1]}, but packages/cli/package.json is at ${version}`;
  return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tag = process.argv[2] ?? '';
  const { version } = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf8'));
  const mismatch = tagMismatch(tag, version);
  if (mismatch) {
    console.error(`release-tag: ${mismatch}. Bump the version or retag.`);
    process.exit(1);
  }
  console.log(`release-tag: ${tag} matches ultima-design ${version}`);
}
