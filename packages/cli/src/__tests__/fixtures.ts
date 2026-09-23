import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const setupItems = join(dirname(fileURLToPath(import.meta.url)), '../../../../registry/static');
const LOCAL_REGISTRY = 'http://127.0.0.1:4321/r/{name}.json';

export function project(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'ultima-cli-'));
  for (const [path, content] of Object.entries({ 'package.json': '{}', ...files })) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

export function installed(target: 'vite' | 'next', root = project()): string {
  cpSync(join(setupItems, `setup-${target}`), root, { recursive: true });
  pointAtLocalRegistry(root);
  return root;
}

function pointAtLocalRegistry(root: string) {
  editComponents(root, (json) => {
    (json.registries as Record<string, unknown>)['@ultima'] = LOCAL_REGISTRY;
  });
}

export function editComponents(root: string, edit: (json: Record<string, unknown>) => void) {
  const file = join(root, 'components.json');
  const json = JSON.parse(readFileSync(file, 'utf8'));
  edit(json);
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}
