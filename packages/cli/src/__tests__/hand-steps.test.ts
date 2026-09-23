import { describe, expect, it } from 'vitest';

import { setupItems } from '../../../../registry/items.config.ts';
import { type HandStep, validateHandSteps } from '../hand-steps.ts';

const steps = Object.entries(setupItems).flatMap(([item, { handSteps, checks }]) =>
  [...handSteps, ...checks].map((step: HandStep, index, all) => ({ item, step, index, all })),
);

describe('the hand-step manifest the registry build validates', () => {
  it('passes as written', () => {
    for (const [item, { handSteps, checks }] of Object.entries(setupItems)) {
      expect(() => validateHandSteps(item, [...handSteps, ...checks])).not.toThrow();
    }
  });

  it.each(steps.map(({ item, step, index, all }) => [`${item} ${index + 1}`, item, step, index, all] as const))(
    'rejects %s without its assertion or reason, naming the step',
    (_, item, step, index, all) => {
      const { assertion: _assertion, unverifiable: _unverifiable, ...bare } = step;
      const broken = all.map((candidate, at) => (at === index ? bare : candidate)) as HandStep[];
      expect(() => validateHandSteps(item, broken)).toThrow(
        `${item} hand step ${index + 1} ("${step.prose}") has neither an assertion nor an unverifiable reason`,
      );
    },
  );

  it('rejects a kind outside the closed set', () => {
    const step = { prose: 'Run the thing.', assertion: { kind: 'shell-command' } } as unknown as HandStep;
    expect(() => validateHandSteps('setup-vite', [step])).toThrow('asserts shell-command, which is not one of');
  });
});
