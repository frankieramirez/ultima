import type { HandStep } from '../../packages/cli/src/hand-steps.ts';

export type Release = { id: string; label: string };

type Common = {
  /** Kebab-case, unique across every kind, and the descriptor's file name. */
  id: string;
  title: string;
  description: string;
  /** A local specification path and heading anchor, `docs/spec/<file>.md#<anchor>`. */
  contract: string;
};

export type ReactDescriptor = Common & {
  kind: 'react';
  /** Printed by the shadcn CLI after an install. */
  installDocs: string;
  /** The visitor summary, when it differs on purpose from the registry `description`. */
  docsDescription?: string;
  /** The root function or namespace the source exports, checked against it. */
  primaryExport: string;
  release: string;
  /** Unique within `release`; gaps are allowed. */
  order: number;
  /**
   * The native controls and interactive roles the component stands in for, which `check` reads as
   * ULT-APP-CONTROL-001. An element is a tag, or `input[type=<type>]` for one input type; an input
   * with no `type` is `text`. The Base UI primitive it wraps is derived from its own imports.
   */
  replaces?: { elements?: string[]; roles?: string[] };
};

export type ElementAttribute = {
  names: string[];
  /** A tag of the same family. */
  on: string;
} & (
  | {
      /** A module-scope `as const` string array in the element source. */
      symbol: string;
      text?: never;
    }
  | { text: string; symbol?: never }
);

export type ElementDescriptor = Common & {
  kind: 'element';
  installDocs: string;
  reactItem: string;
  /** Unique among elements; the docs family order. */
  order: number;
  /** Registry item IDs; a vendored bundle has no imports to derive them from. */
  registryDependencies: string[];
  /** Every tag the source registers, the root first, in docs order. */
  tags: string[];
  attributes: ElementAttribute[];
  example: string;
};

export type SetupFile = {
  /** Relative to `registry/static/<id>/`. */
  path: string;
  type: 'registry:file';
  target: string;
};

export type SetupDescriptor = Common & {
  kind: 'setup';
  files: SetupFile[];
  /** The files are authored configuration, so their npm packages cannot be derived. */
  dependencies: string[];
  devDependencies: string[];
  registryDependencies?: string[];
  handSteps: HandStep[];
  /** What the item installs or the scaffold provides, which doctor confirms and the item never prints. */
  checks: HandStep[];
};

export type SourceBundleDescriptor = Common & {
  kind: 'source-bundle';
  installDocs: string;
  inventory: 'tokens' | 'lib';
};

export type ArtifactDescriptor = Common & {
  kind: 'artifact';
  installDocs: string;
  producer: 'tokens-build';
  output: string;
  fileType: 'registry:file';
  target: string;
};

/** No install guidance, registry item, barrel export or route: the owning page's MDX explains installation. */
export type RecipeDescriptor = Common & {
  kind: 'recipe';
  /** The React item whose page holds the recipe. */
  page: string;
  /** The heading anchor of the recipe's section on that page. */
  section: string;
  release: string;
  /** Demo modules the page imports for the recipe. */
  demos: string[];
};

export type Descriptor =
  | ReactDescriptor
  | ElementDescriptor
  | SetupDescriptor
  | SourceBundleDescriptor
  | ArtifactDescriptor
  | RecipeDescriptor;
