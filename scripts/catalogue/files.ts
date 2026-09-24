import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Repository-relative reads, so the model runs against the checkout or an in-memory fixture alike. */
export type Files = {
  read(path: string): string | undefined;
  /** Entries sorted by name, or undefined when `path` is not a directory. */
  list(path: string): { name: string; directory: boolean }[] | undefined;
  /** The path with symbolic links resolved, still repository-relative; absent where there are none, as in memory. */
  realpath?(path: string): string;
};

export function diskFiles(root: string): Files {
  const real = realpathSync(root);
  return {
    realpath(path) {
      try {
        return relative(real, realpathSync(join(root, path))).split(sep).join('/');
      } catch {
        return path;
      }
    },
    read(path) {
      try {
        return readFileSync(join(root, path), 'utf8');
      } catch {
        return undefined;
      }
    },
    list(path) {
      try {
        return readdirSync(join(root, path), { withFileTypes: true })
          .map((entry) => ({ name: entry.name, directory: entry.isDirectory() || statSync(join(root, path, entry.name)).isDirectory() }))
          .sort((a, b) => a.name.localeCompare(b.name));
      } catch {
        return undefined;
      }
    },
  };
}

export function memoryFiles(files: Record<string, string>): Files {
  return {
    read: (path) => files[path],
    list(path) {
      const prefix = `${path}/`;
      const entries = new Map<string, boolean>();
      for (const file of Object.keys(files)) {
        if (!file.startsWith(prefix)) continue;
        const [name, ...rest] = file.slice(prefix.length).split('/');
        entries.set(name as string, rest.length > 0 || entries.get(name as string) === true);
      }
      if (entries.size === 0) return undefined;
      return [...entries].map(([name, directory]) => ({ name, directory })).sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}
