import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Meter,
  type MeterIndicatorProps,
  type MeterLabelProps,
  type MeterRootProps,
  type MeterTone,
  type MeterTrackProps,
  type MeterValueProps,
} from '@ultima/ui';

const tones = ['neutral', 'highlight', 'success', 'warning', 'danger'] as const;

type SampleProps = {
  name: string;
  indicator?: MeterTone;
  value?: MeterTone;
};

function Sample({ name, indicator, value }: SampleProps) {
  return (
    <Meter.Root value={40}>
      <Meter.Label>{name}</Meter.Label>
      <Meter.Track>
        <Meter.Indicator tone={indicator} />
      </Meter.Track>
      <Meter.Value tone={value} />
    </Meter.Root>
  );
}

const trackOf = (meter: Element) => meter.querySelector('div') as HTMLElement;
const fillOf = (meter: Element) => trackOf(meter).querySelector('div') as HTMLElement;
/** The rendered number, not the visually hidden span Base UI appends after it. */
const valueOf = (meter: Element) =>
  [...meter.querySelectorAll('span')].find((span) => span.textContent === '40%') as HTMLElement;

for (const tone of tones) {
  test(`indicator tone ${tone} renders`, async () => {
    const screen = await render(<Sample name={`indicator ${tone}`} indicator={tone} />);
    await expect.element(screen.getByRole('meter', { name: `indicator ${tone}` })).toBeVisible();
  });

  test(`value tone ${tone} renders`, async () => {
    const screen = await render(<Sample name={`value ${tone}`} value={tone} />);
    await expect.element(screen.getByRole('meter', { name: `value ${tone}` })).toBeVisible();
  });
}

test('omitted tones match neutral', async () => {
  const screen = await render(
    <>
      <Sample name="implicit" />
      <Sample name="explicit" indicator="neutral" value="neutral" />
    </>,
  );
  const implicit = screen.getByRole('meter', { name: 'implicit' }).element();
  const explicit = screen.getByRole('meter', { name: 'explicit' }).element();
  expect(fillOf(implicit).className).not.toBe('');
  expect(fillOf(implicit).className).toBe(fillOf(explicit).className);
  expect(valueOf(implicit).className).toBe(valueOf(explicit).className);
});

test('Meter.Label names the meter', async () => {
  const screen = await render(<Sample name="Disk used" />);
  await expect.element(screen.getByRole('meter', { name: 'Disk used' })).toBeVisible();
  expect(screen.getByRole('meter').element()).toHaveAttribute('aria-labelledby');
});

test('nothing in a meter takes focus', async () => {
  const screen = await render(
    <>
      <Sample name="Disk used" />
      <button type="button">After</button>
    </>,
  );
  await expect.element(screen.getByRole('meter')).toBeVisible();
  const meter = screen.getByRole('meter').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }).element());
  expect(meter.contains(document.activeElement)).toBe(false);
});

test('the value reaches aria and the indicator fills that share of the track', async () => {
  const screen = await render(<Sample name="Disk used" />);
  await expect.element(screen.getByRole('meter')).toBeVisible();
  const meter = screen.getByRole('meter').element();
  expect(meter).toHaveAttribute('aria-valuenow', '40');
  expect(fillOf(meter).getBoundingClientRect().width).toBeCloseTo(
    trackOf(meter).getBoundingClientRect().width * 0.4,
    1,
  );
});

test('tone repaints the indicator and the value separately', async () => {
  const screen = await render(
    <>
      <Sample name="plain" indicator="neutral" value="neutral" />
      <Sample name="alarming" indicator="danger" value="danger" />
    </>,
  );
  const plain = screen.getByRole('meter', { name: 'plain' }).element();
  const alarming = screen.getByRole('meter', { name: 'alarming' }).element();
  expect(getComputedStyle(fillOf(alarming)).backgroundColor).not.toBe(getComputedStyle(fillOf(plain)).backgroundColor);
  expect(getComputedStyle(valueOf(alarming)).color).not.toBe(getComputedStyle(valueOf(plain)).color);
});

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<MeterTone>().toEqualTypeOf<'neutral' | 'highlight' | 'success' | 'warning' | 'danger'>();
  expectTypeOf<MeterRootProps>().not.toHaveProperty('className');
  expectTypeOf<MeterLabelProps>().not.toHaveProperty('className');
  expectTypeOf<MeterTrackProps>().not.toHaveProperty('className');
  expectTypeOf<MeterIndicatorProps>().not.toHaveProperty('className');
  expectTypeOf<MeterValueProps>().not.toHaveProperty('className');
  expectTypeOf<MeterTrackProps>().not.toHaveProperty('tone');
  expectTypeOf<MeterIndicatorProps>().toHaveProperty('tone');
  expectTypeOf<MeterValueProps>().toHaveProperty('tone');
});
