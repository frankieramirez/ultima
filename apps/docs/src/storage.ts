/**
 * `localStorage` throws outright in a browser that blocks site data, so both preferences the site
 * remembers read and write it through here and fall back to their default rather than failing.
 */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}
