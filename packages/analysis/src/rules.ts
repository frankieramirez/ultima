// The rule catalogue: docs/spec/agent-infrastructure.md, Rule catalogue. IDs are stable; a change in
// meaning needs a documented scope change and updated fixtures.
import type { RuleStatus } from './diagnostic.ts';

const INFRA = 'docs/spec/agent-infrastructure.md';

export const RULES = {
  'ULT-TOKEN-001': {
    status: 'blocking',
    scope: 'React and element component declarations',
    link: `${INFRA}#values-and-runtime-styles`,
  },
  'ULT-STYLE-001': {
    status: 'blocking',
    scope: 'Production components and docs styling',
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
    scope: 'Docs application layout and chrome',
    link: `${INFRA}#docs-controls-and-surfaces`,
  },
  'ULT-DOCS-002': {
    status: 'blocking',
    scope: 'Docs application layout and chrome, including executable page JSX',
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

export function ruleStatuses(): RuleStatus[] {
  return Object.entries(RULES).map(([id, rule]) => ({ id, ...rule }));
}

/** Rules a typed exception may name: an incomplete analysis or a bad exception is never excepted. */
export function exceptable(id: string): boolean {
  return id in RULES && id !== 'ULT-EXCEPTION-001' && id !== 'ULT-ANALYSIS-001';
}
