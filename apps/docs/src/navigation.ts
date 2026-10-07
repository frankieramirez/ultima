import type { LinkProps } from '@tanstack/react-router';

import { GROUPS, componentsInGroup } from './components';
import { blocks } from './generated/blocks';

export type NavLink = {
  label: string;
  to: NonNullable<LinkProps['to']>;
  params?: Record<string, string>;
};

export type NavGroup = {
  label: string;
  links: NavLink[];
  groups?: NavGroup[];
};

export const pages = [
  { label: 'Home', to: '/' },
  { label: 'Install', to: '/install' },
  { label: 'CLI', to: '/cli' },
  { label: 'Elements', to: '/elements' },
  { label: 'Tokens', to: '/tokens' },
  { label: 'Palette', to: '/palette' },
  { label: 'Rationale', to: '/rationale' },
  { label: 'Studio', to: '/theme-studio' },
  { label: 'Components', to: '/components' },
  { label: 'Blocks', to: '/blocks' },
] satisfies NavLink[];

/** The catalogue groups in display order, each alphabetical. */
export const componentGroups: NavGroup[] = GROUPS.map(({ id, label }) => ({
  label,
  links: componentsInGroup(id).map(({ name, item }) => ({ label: name, to: '/components/$name', params: { name: item } })),
}));

export const componentPages: NavLink[] = componentGroups.flatMap(({ links }) => links);

export const blockPages: NavLink[] = blocks.map(({ id, title }) => ({ label: title, to: '/blocks/$id', params: { id } }));

const SECTIONS: string[] = ['/components', '/blocks'];

export const navigation = [
  { label: 'Foundations', links: pages.filter(({ to }) => !SECTIONS.includes(to)).sort((a, b) => a.label.localeCompare(b.label)) },
  { label: 'Components', links: [], groups: componentGroups },
  { label: 'Blocks', links: blockPages },
] satisfies NavGroup[];
