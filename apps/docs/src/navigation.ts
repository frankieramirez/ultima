import type { LinkProps } from '@tanstack/react-router';

import { components } from './components';
import { blocks } from './generated/blocks';

export type NavLink = {
  label: string;
  /** The catalogue number, for a component or a block page. */
  number?: string;
  to: NonNullable<LinkProps['to']>;
  params?: Record<string, string>;
};

export type NavGroup = {
  label: string;
  links: NavLink[];
};

export const pages = [
  { label: 'Home', to: '/' },
  { label: 'Install', to: '/install' },
  { label: 'Update the base theme', to: '/install/update' },
  { label: 'CLI', to: '/cli' },
  { label: 'Elements', to: '/elements' },
  { label: 'Tokens', to: '/tokens' },
  { label: 'Palette', to: '/palette' },
  { label: 'Rationale', to: '/rationale' },
  { label: 'Studio', to: '/theme-studio' },
  { label: 'Components', to: '/components' },
  { label: 'Blocks', to: '/blocks' },
  { label: 'Recipes', to: '/recipes' },
] satisfies NavLink[];

/** Every component in catalogue-number order, which is alphabetical. */
export const componentPages: NavLink[] = [...components]
  .sort((a, b) => a.number.localeCompare(b.number))
  .map(({ name, item, number }) => ({ label: name, number, to: '/components/$name', params: { name: item } }));

export const blockPages: NavLink[] = blocks.map(({ id, title, number }) => ({ label: title, number, to: '/blocks/$id', params: { id } }));

const SECTIONS: string[] = ['/components', '/blocks'];

export const navigation = [
  { label: 'Foundations', links: pages.filter(({ to }) => !SECTIONS.includes(to)).sort((a, b) => a.label.localeCompare(b.label)) },
  { label: 'Components', links: componentPages },
  { label: 'Blocks', links: blockPages },
] satisfies NavGroup[];
