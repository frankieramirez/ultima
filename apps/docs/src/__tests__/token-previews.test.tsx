import { expect, onTestFinished, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import MotionTrack from '../demos/tokens/motion';
import RadiusSpecimen from '../demos/tokens/radius';
import ShadowSpecimen from '../demos/tokens/shadow';
import SpaceBar from '../demos/tokens/space';
import TypeSample from '../demos/tokens/text';
import { TokensPage } from '../routes/tokens';
import { tokenGroups, tokensByName } from '../token-data';
import { renderWithRouter } from './render-with-router';

function fromToken(property: string, token: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, `var(${token})`);
  document.body.append(probe);
  const value = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return value;
}

const itself = (element: Element) => element;
const dotInsideTrack = (track: Element) => track.firstElementChild ?? track;

const previews = [
  { name: 'space', Preview: SpaceBar, token: '--ult-space-9', property: 'width', specimen: itself },
  { name: 'text', Preview: TypeSample, token: '--ult-text-9', property: 'font-size', specimen: itself },
  {
    name: 'radius',
    Preview: RadiusSpecimen,
    token: '--ult-radius-full',
    property: 'border-top-left-radius',
    specimen: itself,
  },
  { name: 'shadow', Preview: ShadowSpecimen, token: '--ult-shadow-lg', property: 'box-shadow', specimen: itself },
  {
    name: 'motion',
    Preview: MotionTrack,
    token: '--ult-motion-slow',
    property: 'animation-duration',
    specimen: dotInsideTrack,
  },
];

for (const { name, Preview, token, property, specimen } of previews) {
  test(`the ${name} preview draws itself from the live token`, async () => {
    const { container } = await render(<Preview token={token} />);
    const element = specimen(container.firstElementChild as Element);

    expect(getComputedStyle(element).getPropertyValue(property)).toBe(fromToken(property, token));
  });
}

test('the motion group publishes --ult-motion-loop at 1s', () => {
  const motion = tokenGroups.find((group) => group.name === 'motion');
  expect(motion?.tokens.map((token) => token.name)).toContain('--ult-motion-loop');
  expect(tokensByName.get('--ult-motion-loop')?.dark.value).toBe('1s');
  expect(tokensByName.get('--ult-motion-loop')?.light.value).toBe('1s');
});

test('the moving preview drops its animation under reduced motion', async () => {
  const { container } = await render(<MotionTrack token="--ult-motion-slow" />);
  const dot = dotInsideTrack(container.firstElementChild as Element);

  const names = reducedMotionRules(dot).map((rule) => rule.style.getPropertyValue('animation-name'));
  expect(names).toContain('none');
});

test('the tokens page fits a narrow viewport', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const { container } = await renderWithRouter(<TokensPage />);
  const main = container.querySelector('main') as HTMLElement;

  expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth);
});

function reducedMotionRules(element: Element): CSSStyleRule[] {
  const found: CSSStyleRule[] = [];

  function walk(rules: CSSRuleList, reduced: boolean) {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        walk(rule.cssRules, reduced || rule.conditionText.includes('prefers-reduced-motion'));
      } else if (rule instanceof CSSGroupingRule) {
        walk(rule.cssRules, reduced);
      } else if (reduced && rule instanceof CSSStyleRule && element.matches(rule.selectorText)) {
        found.push(rule);
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules, false);
    } catch {
      continue;
    }
  }

  return found;
}
