// The registry build's check on `meta.ultima.sources`, which `update` reads to find an installed
// base. docs/spec/ultima.md, Update, The installed base.

type Ultima = { files?: Record<string, string>; sources?: Record<string, string> };

/** Why an item's `meta.ultima.sources` cannot name the authored source of each served file, or undefined when it can. */
export function sourcesFault(ultima: Ultima | undefined, exists: (path: string) => boolean): string | undefined {
  const sources = ultima?.sources;
  if (!sources) return 'lost meta.ultima.sources';
  const files = Object.keys(ultima.files ?? {});
  const missing = files.filter((name) => !(name in sources));
  const extra = Object.keys(sources).filter((name) => !files.includes(name));
  if (missing.length > 0 || extra.length > 0) {
    const parts = [missing.length > 0 && `missing ${missing.join(', ')}`, extra.length > 0 && `extra ${extra.join(', ')}`].filter(Boolean);
    return `meta.ultima.sources does not match meta.ultima.files: ${parts.join(', ')}`;
  }
  const absent = Object.values(sources).filter((path) => !exists(path));
  if (absent.length > 0) return `meta.ultima.sources names ${absent.join(', ')}, which is not in the checkout`;
  return undefined;
}
