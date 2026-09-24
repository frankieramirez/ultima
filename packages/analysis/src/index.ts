export { check } from './check.ts';
export {
  type Diagnostic,
  type Report,
  type Severity,
  SCHEMA_VERSION,
  compareDiagnostics,
  exitCode,
  formatJson,
  formatText,
} from './diagnostic.ts';
export { type ArchitectureException, applyExceptions } from './exceptions.ts';
export { POLICY, type DependencyPolicy } from './policy.ts';
export { RULES, type RuleId, ruleStatuses } from './rules.ts';
export type { Classified, Resolution, Scope, SourceKind, Staged } from './scope.ts';
export { STYLE_POLICY } from './policy.ts';
export { EXCEPTIONS, classify, workspaceScope } from './workspace.ts';
export { CONSUMER_RULES, type ConsumerReport, checkConsumer } from './consumer.ts';
export { APP_RULES, type AppRuleId } from './rules.ts';
