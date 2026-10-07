// A scope is everything a rule may know about a checkout: its classified files, how a specifier
// resolves, and the dependency policy. Rules never name a workspace path or alias; the workspace
// scope and a consumer scope supply them. docs/spec/ultima.md, Package and engine.
import type { Files } from '../../../scripts/catalogue/files.ts';
import type { PlannedItem, StagedSource } from '../../../scripts/catalogue/staging.ts';
import type { Diagnostic } from './diagnostic.ts';
import type { DependencyPolicy, StylePolicy } from './policy.ts';
import type { TypeProgram } from './program.ts';

export type SourceKind =
  // Production render targets and the token sources they read.
  | 'token-source'
  | 'react-component'
  | 'react-helper'
  | 'element'
  | 'block'
  // The docs application: chrome, demos and executable MDX pages.
  | 'docs'
  | 'demo'
  | 'content'
  // Structural scopes, separate from production.
  | 'test'
  | 'tooling'
  | 'metadata'
  | 'setup-template'
  | 'declarations'
  | 'generated'
  | 'fixture'
  // A consumer's own program, installed Ultima items included, and the CSS it imports statically.
  | 'app'
  | 'stylesheet';

export const PRODUCTION_KINDS: readonly SourceKind[] = ['token-source', 'react-component', 'react-helper', 'element', 'block'];
export const DOCS_KINDS: readonly SourceKind[] = ['docs', 'demo', 'content'];

export type Classified = { path: string; kind: SourceKind };

export type Resolution =
  | { kind: 'file'; path: string; via: 'relative' | 'package' }
  | { kind: 'external'; package: string }
  | { kind: 'unresolved'; via: 'relative' | 'package'; reason: string };

/** What the registry build would stage and describe, and what the catalogue found about its metadata. */
export type RegistryInputs = {
  /** Catalogue findings about item membership, references and shapes, located at a file and, when known, a line. */
  findings: { code: string; file: string; line?: number; message: string }[];
  sources: StagedSource[];
  collisions: { source: string; staged: string; with: string }[];
  plan: PlannedItem[];
  /** Installable descriptors by item ID. */
  descriptors: Map<string, { kind: string; path: string }>;
};

/** The resolved types a public API rule reads. */
export type TypeInputs = {
  program(roots: string[]): TypeProgram;
  /** The one styling slot every public part accepts: the module that declares it and its exported type name. */
  styleSlot: { path: string; name: string };
};

/** A staged module a production file may import through its package specifier, and the item that stages it. */
export type Staged = { item: string; kind: 'token-source' | 'react-helper' | 'react-component'; specifier: string };

/** An installed React item: the Base UI primitives it wraps and the native elements and roles it replaces. */
export type InstalledItem = {
  item: string;
  /** The specifier the project imports it by, such as `@/components/ui/select`. */
  specifier: string;
  primaryExport: string;
  primitives: readonly string[];
  /** Tags, or `input[type=<type>]`. */
  elements: readonly string[];
  roles: readonly string[];
};

export type Scope = {
  name: string;
  files: Files;
  /** Every authored source file, classified. Structural exclusions are never listed. */
  inventory: Classified[];
  /** Source files under an authored root that no classification claims. */
  unclassified: string[];
  /** Directories excluded structurally, with the reason. */
  excluded: { path: string; reason: string }[];
  kindOf(path: string): SourceKind | undefined;
  resolve(specifier: string, from: string): Resolution;
  staged(path: string): Staged | undefined;
  /** The registry item a production source belongs to, when it is a component or element file. */
  itemOf(path: string): string | undefined;
  policy: DependencyPolicy;
  /** Runtime variables, alternative styling engines and the other value policy the style rules read. */
  styles: StylePolicy;
  /** The token sources whose `defineVars` and `defineConsts` groups components read. */
  tokenSources: string[];
  /** Documented global stylesheets, and the entry modules that may import each one. */
  globalStyles: { stylesheet: string; importers: string[]; authority: string }[];
  /** Where each component package keeps its tests. */
  testPlacement: { package: string; tests: string }[];
  /** Component and element files no descriptor claims, from the catalogue. */
  unclaimed: { path: string; message: string }[];
  /** Headings of a repository document, for authority links; undefined when it does not exist. */
  anchors(document: string): Set<string> | undefined;
  /** Registry staging and metadata, when the scope builds a registry. Only the workspace scope does. */
  registry?: RegistryInputs;
  /** Resolved types for the public API rule, when the scope can build a program. */
  types?: TypeInputs;
  /** The typed exceptions file, when this scope reads one. Only the workspace scope does. */
  exceptions?: { path: string; text: string | undefined };
  /** The rule IDs this scope enables; a consumer scope names only `ULT-APP-*` and `ULT-ANALYSIS-001`. */
  rules?: readonly string[];
  /**
   * Sites in installed items that Ultima's own typed exceptions authorize, by item rather than path,
   * because the consumer chose where the item lives. Only the consumer scope sets them.
   */
  authorized?: readonly { item: string; ruleId: string; symbol: string; target: string; selector?: string; expression?: string }[];
  /**
   * The React items this project has installed, from the item metadata the consumer CLI bundles, and
   * the specifier each is imported by. Only the consumer scope sets it. It holds every installed item
   * whatever files a run reads, so `--files` sees the same kit as a full run.
   */
  kit?: { installed(): readonly InstalledItem[] };
  /**
   * Ultima's semantic color values in each mode, which a theme override's unset tokens resolve to.
   * Only the consumer scope sets them, from the shipped themes bundled at build.
   */
  colorDefaults?: Readonly<Record<'dark' | 'light', Readonly<Record<string, string>>>>;
  /** Failures that keep the scope itself from being complete. */
  problems: Diagnostic[];
};
