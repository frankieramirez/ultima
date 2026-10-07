import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Every file under `directory` that carries a `data-anatomy` mark, which only the docs' own imports may hold. */
export function markedFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markedFiles(path);
    return readFileSync(path).includes('data-anatomy') ? [path] : [];
  });
}
