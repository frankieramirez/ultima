import type { LinkProps } from '@tanstack/react-router';

import { RELEASES, componentsInRelease } from './components';

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

/** Flat catalogue in release order: every set's rows in turn, derived from `release`. */
export const componentPages: NavLink[] = RELEASES.flatMap((release) =>
  componentsInRelease(release).map(({ name, item }) => ({
    label: name,
    to: '/components/$name',
    params: { name: item },
  })),
);

export const navigation = [
  { label: 'Foundations', links: pages.filter(({ to }) => to !== '/components') },
  {
    label: 'Components',
    links: componentPages,
  },
] satisfies NavGroup[];
