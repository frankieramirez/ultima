// The rule catalogue: docs/spec/agent-infrastructure.md, Rule catalogue. IDs are stable; a change in
// meaning needs a documented scope change and updated fixtures.
import type { RuleStatus } from './diagnostic.ts';

const INFRA = 'docs/spec/agent-infrastructure.md';

export const RULES = {
  'ULT-TOKEN-001': {
    status: 'blocking',
    scope: 'React and element component declarations, and block files',
    link: `${INFRA}#values-and-runtime-styles`,
  },
  'ULT-STYLE-001': {
    status: 'blocking',
    scope: 'Production components, block files and docs styling',
    link: `${INFRA}#rule-catalogue`,
  },
  'ULT-PRIMITIVE-001': {
    status: 'blocking',
    scope: 'Production React and element components',
    link: `${INFRA}#target-and-api-distinctions`,
  },
  'ULT-API-001': {
    status: 'blocking',
    scope: 'Public React wrappers and styled parts',
    link: `${INFRA}#target-and-api-distinctions`,
  },
  'ULT-API-002': {
    status: 'blocking',
    scope: "Code consuming the caller's StyleX slot",
    link: `${INFRA}#target-and-api-distinctions`,
  },
  'ULT-DOCS-001': {
    status: 'blocking',
    scope: 'Docs application layout and chrome, and block files',
    link: `${INFRA}#docs-controls-and-surfaces`,
  },
  'ULT-DOCS-002': {
    status: 'blocking',
    scope: 'Docs application layout and chrome, including executable page JSX, and block files',
    link: `${INFRA}#docs-controls-and-surfaces`,
  },
  'ULT-DOCS-REVIEW-001': {
    status: 'advisory',
    scope: 'Ambiguous handler-driven widgets in docs chrome (advisory)',
    link: `${INFRA}#docs-controls-and-surfaces`,
  },
  'ULT-IMPORT-001': {
    status: 'blocking',
    scope: 'Production workspace imports and re-exports',
    link: `${INFRA}#import-and-registry-boundaries`,
  },
  'ULT-REGISTRY-001': {
    status: 'blocking',
    scope: 'Authored source and registry metadata',
    link: `${INFRA}#import-and-registry-boundaries`,
  },
  'ULT-SOURCE-001': {
    status: 'blocking',
    scope: 'Component source layout',
    link: `${INFRA}#authority-and-source-scopes`,
  },
  'ULT-EXCEPTION-001': {
    status: 'blocking',
    scope: 'Checker configuration',
    link: `${INFRA}#exceptions`,
  },
  'ULT-ANALYSIS-001': {
    status: 'blocking',
    scope: 'Expressions relevant to a blocking rule',
    link: `${INFRA}#rule-catalogue`,
  },
} as const satisfies Record<string, Omit<RuleStatus, 'id'>>;

export type RuleId = keyof typeof RULES;

const SITE = 'https://ultima.systems';
/** The consumer contract's owning section. Consumer output links outside the repository, so it is absolute. */
export const CHECK_SPEC = 'https://github.com/frankieramirez/ultima/blob/main/docs/spec/ultima.md#check';

// The consumer rule family: docs/spec/ultima.md, Consumer CLI, Check. `check` enables these and
// `ULT-ANALYSIS-001`, never a contributor family, and links each to the docs-site page stating its contract.
export const APP_RULES = {
  'ULT-APP-CONTRAST-001': {
    status: 'blocking',
    scope: 'Semantic color overrides in consumer stylex.createTheme calls and CSS, in each mode they apply to',
    link: `${SITE}/tokens#pairings`,
  },
  'ULT-APP-THEME-001': {
    status: 'blocking',
    scope: 'Role base color overrides in consumer stylex.createTheme calls and CSS',
    link: `${SITE}/tokens#overriding`,
  },
  'ULT-APP-PALETTE-001': {
    status: 'blocking',
    scope: 'Consumer code reading a palette scale',
    link: `${SITE}/tokens#color`,
  },
  'ULT-APP-PAINT-001': {
    status: 'advisory',
    scope: 'Paint in consumer stylex.create and stylex.keyframes tables and literal JSX style objects',
    link: `${SITE}/tokens`,
  },
  'ULT-APP-PRIMITIVE-001': {
    status: 'advisory',
    scope: 'Consumer imports of a Base UI primitive an installed item wraps',
    link: `${SITE}/components`,
  },
  'ULT-APP-CONTROL-001': {
    status: 'advisory',
    scope: 'Native controls and interactive roles in consumer JSX where an installed item provides the control',
    link: `${SITE}/components`,
  },
  'ULT-APP-SUPPRESSION-001': {
    status: 'advisory',
    scope: 'ultima-check-ignore comments in consumer code',
    link: CHECK_SPEC,
  },
} as const satisfies Record<string, Omit<RuleStatus, 'id'>>;

export type AppRuleId = keyof typeof APP_RULES;

/** An installed item's component page, which states the contract its primitive and control findings point at. */
export function componentPage(item: string): string {
  return `${SITE}/components/${item}`;
}

export function ruleStatuses(): RuleStatus[] {
  return Object.entries(RULES).map(([id, rule]) => ({ id, ...rule }));
}

/** Rules a typed exception may name: an incomplete analysis or a bad exception is never excepted. */
export function exceptable(id: string): boolean {
  return id in RULES && id !== 'ULT-EXCEPTION-001' && id !== 'ULT-ANALYSIS-001';
}
