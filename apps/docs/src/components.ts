import { GROUPS, RELEASES, components } from './generated/catalogue';

export { GROUPS, RELEASES, components } from './generated/catalogue';

export type ComponentGroup = (typeof GROUPS)[number]['id'];

export type ComponentRelease = (typeof RELEASES)[number];

export type ComponentEntry = {
  name: string;
  item: string;
  /** The catalogue number, three digits in id order. */
  number: string;
  group: ComponentGroup;
  description: string;
  release: ComponentRelease;
  /** The headless component the source builds on, or `null` for one on native elements alone. */
  primitive: { library: 'base-ui' | 'zag'; module: string } | null;
};

/** One group's entries, alphabetical. */
export function componentsInGroup(group: ComponentGroup): ComponentEntry[] {
  return components.filter((entry) => entry.group === group);
}
