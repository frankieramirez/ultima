import type { LinkProps } from "@tanstack/react-router";
import { components } from "./components";

export type NavLink = {
  label: string;
  to: NonNullable<LinkProps["to"]>;
  params?: { name: string };
};

export type NavGroup = {
  label: string;
  links: NavLink[];
};

export const pages = [
  { label: "--home", to: "/" },
  { label: "--install", to: "/install" },
  { label: "--tokens", to: "/tokens" },
  { label: "--palette", to: "/palette" },
  { label: "--rationale", to: "/rationale" },
  { label: "--components", to: "/components" },
] satisfies NavLink[];

export const componentPages: NavLink[] = components.map(({ item }) => ({
  label: `--${item}`,
  to: "/components/$name",
  params: { name: item },
}));

export const navigation = [
  { label: "::root", links: pages.filter(({ to }) => to !== "/components") },
  {
    label: "@components",
    links: componentPages,
  },
] satisfies NavGroup[];
