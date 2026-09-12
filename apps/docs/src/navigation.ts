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
  { label: '--home', to: '/' },
  { label: '--install', to: '/install' },
  { label: '--tokens', to: '/tokens' },
  { label: '--palette', to: '/palette' },
  { label: '--rationale', to: '/rationale' },
  { label: '--components', to: '/components' },
] satisfies NavLink[];

/** Flat catalogue in release order: every v0 row, then every v0.1 row, derived from `release`. */
export const componentPages: NavLink[] = RELEASES.flatMap((release) =>
  componentsInRelease(release).map(({ item }) => ({
    label: `--${item}`,
    to: '/components/$name',
    params: { name: item },
  })),
);

export const navigation = [
  { label: '::root', links: pages.filter(({ to }) => to !== '/components') },
  {
    label: '@components',
    links: componentPages,
  },
] satisfies NavGroup[];
