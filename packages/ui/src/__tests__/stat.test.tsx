import { createRef } from 'react';
import { page, userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Stat,
  type StatDeltaProps,
  type StatDeltaTone,
  type StatDeltaTrend,
  type StatLabelProps,
  type StatRootProps,
  type StatValueProps,
} from '@ultima/ui';
import { tokenValue } from './token-value';

function FullStat() {
  return (
    <Stat.Root data-testid="root">
      <Stat.Label>Findings</Stat.Label>
      <Stat.Value>42</Stat.Value>
    </Stat.Root>
  );
}

test('every part mounts', async () => {
  const screen = await render(<FullStat />);
  await expect.element(screen.getByText('Findings')).toBeVisible();
  await expect.element(screen.getByText('42')).toBeVisible();
});

test('label and value are spans inside a div root', async () => {
  const screen = await render(<FullStat />);
  const root = screen.getByTestId('root').element();
  expect(root.tagName).toBe('DIV');
  expect(screen.getByText('Findings').element().tagName).toBe('SPAN');
  expect(screen.getByText('42').element().tagName).toBe('SPAN');
});

test('tabbing through the stat focuses nothing inside it', async () => {
  const screen = await render(<FullStat />);
  const root = screen.getByTestId('root').element();
  await userEvent.tab();
  expect(root.contains(document.activeElement)).toBe(false);
  expect(getComputedStyle(root).outlineStyle).toBe('none');
});

test('render and ref reach the root element', async () => {
  const ref = createRef<HTMLDivElement>();
  const screen = await render(<Stat.Root ref={ref} render={<dl data-custom="yes" />}>Custom</Stat.Root>);
  const root = screen.getByText('Custom').element();
  expect(root.tagName).toBe('DL');
  expect(ref.current).toBe(root);
  expect(root).toHaveAttribute('data-custom', 'yes');
});

test('public prop types carry the style slot and no className', () => {
  expectTypeOf<StatRootProps>().not.toHaveProperty('className');
  expectTypeOf<StatLabelProps>().not.toHaveProperty('className');
  expectTypeOf<StatValueProps>().not.toHaveProperty('className');
  expectTypeOf<StatLabelProps>().not.toHaveProperty('render');
  expectTypeOf<StatRootProps>().toHaveProperty('render');
  expectTypeOf<StatValueProps>().toHaveProperty('style');
});

test('the value sets tabular figures and tight tracking, and the label its own line height', async () => {
  const screen = await render(<FullStat />);
  const value = getComputedStyle(screen.getByText('42').element());
  expect(value.fontVariantNumeric).toBe('tabular-nums');
  expect(value.letterSpacing).toBe(tokenValue('letter-spacing', 'calc(var(--ult-text-9) * -0.02)'));
  const label = getComputedStyle(screen.getByText('Findings').element());
  expect(label.lineHeight).toBe(tokenValue('line-height', 'calc(var(--ult-text-2) * var(--ult-font-leading-snug))'));
});

test('the value is a 30px semibold headline number from the desktop breakpoint, and 24px below it', async () => {
  const screen = await render(<FullStat />);
  const element = screen.getByText('42').element();
  expect(getComputedStyle(element).fontSize).toBe(tokenValue('font-size', 'var(--ult-text-9)'));
  expect(getComputedStyle(element).fontWeight).toBe(tokenValue('font-weight', 'var(--ult-font-weight-semibold)'));
  await page.viewport(375, 720);
  try {
    await expect.poll(() => getComputedStyle(element).fontSize).toBe(tokenValue('font-size', 'var(--ult-text-8)'));
  } finally {
    await page.viewport(1280, 720);
  }
});

const deltaTones = ['neutral', 'success', 'warning', 'danger'] as const satisfies readonly StatDeltaTone[];

test('the delta is a span after the value, in 12px medium tabular figures', async () => {
  const screen = await render(
    <Stat.Root data-testid="root">
      <Stat.Label>Revenue</Stat.Label>
      <Stat.Value>$48,210</Stat.Value>
      <Stat.Delta>+12%</Stat.Delta>
    </Stat.Root>,
  );
  const delta = screen.getByText('+12%').element();
  expect(delta.tagName).toBe('SPAN');
  expect(screen.getByTestId('root').element().lastElementChild).toBe(delta);
  const style = getComputedStyle(delta);
  expect(style.fontSize).toBe(tokenValue('font-size', 'var(--ult-text-2)'));
  expect(style.fontWeight).toBe(tokenValue('font-weight', 'var(--ult-font-weight-medium)'));
  expect(style.fontVariantNumeric).toBe('tabular-nums');
  expect(style.color).toBe(tokenValue('color', 'var(--ult-color-text-muted)'));
});

test('each delta tone reads its role text color, and the default is neutral', async () => {
  const screen = await render(
    <>
      {deltaTones.map((tone) => (
        <Stat.Delta key={tone} tone={tone}>
          {tone}
        </Stat.Delta>
      ))}
      <Stat.Delta>implicit</Stat.Delta>
    </>,
  );
  const ink = { neutral: 'text-muted', success: 'success-text', warning: 'warning-text', danger: 'danger-text' } as const;
  for (const tone of deltaTones) {
    const color = getComputedStyle(screen.getByText(tone).element()).color;
    expect(color, tone).toBe(tokenValue('color', `var(--ult-color-${ink[tone]})`));
  }
  expect(screen.getByText('implicit').element().className).toBe(screen.getByText('neutral').element().className);
});

test('trend draws a decorative 1em trend glyph before the text, and no trend draws none', async () => {
  const screen = await render(
    <>
      <Stat.Delta tone="success" trend="up" data-testid="up">+12%</Stat.Delta>
      <Stat.Delta tone="warning" trend="down" data-testid="down">−3%</Stat.Delta>
      <Stat.Delta data-testid="flat">0%</Stat.Delta>
    </>,
  );
  const up = screen.getByTestId('up').element();
  const down = screen.getByTestId('down').element();
  for (const delta of [up, down]) {
    const glyph = delta.firstElementChild as SVGSVGElement;
    expect(glyph.tagName).toBe('svg');
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    expect(glyph.getAttribute('stroke')).toBe('currentColor');
    expect(glyph.getAttribute('stroke-width')).toBe('1.5');
    expect(glyph.getBoundingClientRect().height).toBe(Number.parseFloat(getComputedStyle(delta).fontSize));
  }
  expect(up.querySelector('svg')?.innerHTML).not.toBe(down.querySelector('svg')?.innerHTML);
  expect(screen.getByTestId('flat').element().querySelector('svg')).toBeNull();
  expect(up.textContent).toBe('+12%');
});

test('the delta types carry the tone and trend values and no className', () => {
  expectTypeOf<StatDeltaTone>().toEqualTypeOf<'neutral' | 'success' | 'warning' | 'danger'>();
  expectTypeOf<StatDeltaTrend>().toEqualTypeOf<'up' | 'down'>();
  expectTypeOf<StatDeltaProps>().toHaveProperty('tone');
  expectTypeOf<StatDeltaProps>().toHaveProperty('trend');
  expectTypeOf<StatDeltaProps>().toHaveProperty('style');
  expectTypeOf<StatDeltaProps>().not.toHaveProperty('className');
});
