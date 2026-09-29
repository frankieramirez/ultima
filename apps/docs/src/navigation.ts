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
] satisfies NavLink[];

export const componentPages: NavLink[] = [...components].sort((a, b) => a.name.localeCompare(b.name)).map(({ name, item }) => ({
  label: name, to: '/components/$name', params: { name: item },
}));

export const navigation = [
  { label: 'Foundations', links: pages.filter(({ to }) => to !== '/components').sort((a, b) => a.label.localeCompare(b.label)) },
  {
    label: 'Components',
    links: componentPages,
  },
] satisfies NavGroup[];
