import type { LinkProps } from '@tanstack/react-router';

import { components } from './components';

export type NavLink = {
  label: string;
  to: NonNullable<LinkProps['to']>;
  params?: { name: string };
};

export type NavGroup = {
  label: string;
  links: NavLink[];
  nested?: { label: string; links: NavLink[] };
};

export const pages = [
  { label: 'Home', to: '/' },
  { label: 'Install', to: '/install' },
  { label: 'Tokens', to: '/tokens' },
  { label: 'Palette', to: '/palette' },
  { label: 'Rationale', to: '/rationale' },
  { label: 'Components', to: '/components' },
] satisfies NavLink[];

export const componentPages: NavLink[] = components.map(({ name, item }) => ({
  label: name,
  to: '/components/$name',
  params: { name: item },
}));

export const navigation = [
  { label: 'Ultima', links: pages.filter(({ to }) => to !== '/components') },
  {
    label: 'Catalogue',
    links: pages.filter(({ to }) => to === '/components'),
    nested: { label: 'The v0 set', links: componentPages },
  },
] satisfies NavGroup[];
