import { RELEASES, components } from './generated/catalogue';

export { RELEASE_LABELS, RELEASES, components } from './generated/catalogue';

export type ComponentRelease = (typeof RELEASES)[number];

export type ComponentEntry = {
  name: string;
  item: string;
  description: string;
  /** Docs-only. The index sections by this field; the menu stays a flat catalogue in release order. */
  release: ComponentRelease;
};

export function componentsInRelease(release: ComponentRelease): ComponentEntry[] {
  return components.filter((entry) => entry.release === release);
}
