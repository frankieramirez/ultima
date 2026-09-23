import { describe, expect, it } from 'vitest';

import { type Diagnostic, exitCode } from '../diagnostic.ts';

function finding(severity: Diagnostic['severity']): Diagnostic {
  return {
    ruleId: 'ULT-SETUP-000',
    severity,
    file: 'components.json',
    message: 'm',
    repair: 'r',
    link: 'l',
  };
}

describe('the exit table', () => {
  it('exits 0 for a complete run with no findings', () => {
    expect(exitCode({ diagnostics: [] })).toBe(0);
  });

  it('exits 0 when only advisories accompany the run', () => {
    expect(exitCode({ diagnostics: [finding('advisory')] })).toBe(0);
  });

  it('exits 1 for a blocking finding', () => {
    expect(exitCode({ diagnostics: [finding('blocking')] })).toBe(1);
  });

  it('exits 3 for an incomplete run', () => {
    expect(exitCode({ diagnostics: [finding('incomplete')] })).toBe(3);
  });

  it('lets a blocking finding take precedence over an incomplete run', () => {
    expect(exitCode({ diagnostics: [finding('incomplete'), finding('blocking')] })).toBe(1);
  });

  it('exits 2 for an invalid invocation', () => {
    expect(exitCode({ usage: 'unknown flag --bogus' })).toBe(2);
  });
});
