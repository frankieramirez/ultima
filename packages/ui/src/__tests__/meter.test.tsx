import { Meter as BaseMeter } from '@base-ui/react/meter';
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
  root?: MeterTone;
  indicator?: MeterTone;
  value?: MeterTone;
};

function Sample({ name, root, indicator, value }: SampleProps) {
  return (
    <Meter.Root value={40} tone={root}>
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

const fillColor = (meter: Element) => getComputedStyle(fillOf(meter)).backgroundColor;
const valueColor = (meter: Element) => getComputedStyle(valueOf(meter)).color;

for (const tone of tones) {
  test(`root tone ${tone} renders`, async () => {
    const screen = await render(<Sample name={`root ${tone}`} root={tone} />);
    await expect.element(screen.getByRole('meter', { name: `root ${tone}` })).toBeVisible();
  });

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
      <Sample name="explicit" root="neutral" />
      <Sample name="per part" indicator="neutral" value="neutral" />
    </>,
  );
  const implicit = screen.getByRole('meter', { name: 'implicit' }).element();
  const explicit = screen.getByRole('meter', { name: 'explicit' }).element();
  const perPart = screen.getByRole('meter', { name: 'per part' }).element();
  expect(fillOf(implicit).className).not.toBe('');
  expect(fillOf(implicit).className).toBe(fillOf(explicit).className);
  expect(valueOf(implicit).className).toBe(valueOf(explicit).className);
  expect(fillOf(perPart).className).toBe(fillOf(implicit).className);
  expect(valueOf(perPart).className).toBe(valueOf(implicit).className);
});

test('Root tone reaches the indicator and the value', async () => {
  const screen = await render(
    <>
      <Sample name="plain" />
      <Sample name="alarming" root="danger" />
      <Sample name="repeated" indicator="danger" value="danger" />
    </>,
  );
  const plain = screen.getByRole('meter', { name: 'plain' }).element();
  const alarming = screen.getByRole('meter', { name: 'alarming' }).element();
  const repeated = screen.getByRole('meter', { name: 'repeated' }).element();
  expect(fillColor(alarming)).not.toBe(fillColor(plain));
  expect(valueColor(alarming)).not.toBe(valueColor(plain));
  expect(fillColor(alarming)).toBe(fillColor(repeated));
  expect(valueColor(alarming)).toBe(valueColor(repeated));
});

test("a part's own tone wins over the one Root provides", async () => {
  const screen = await render(
    <>
      <Sample name="inherited" root="danger" />
      <Sample name="overridden" root="danger" indicator="success" value="neutral" />
      <Sample name="neutral" />
    </>,
  );
  const inherited = screen.getByRole('meter', { name: 'inherited' }).element();
  const overridden = screen.getByRole('meter', { name: 'overridden' }).element();
  const neutral = screen.getByRole('meter', { name: 'neutral' }).element();
  expect(fillColor(overridden)).not.toBe(fillColor(inherited));
  expect(valueColor(overridden)).not.toBe(valueColor(inherited));
  expect(valueColor(overridden)).toBe(valueColor(neutral));
});

/** Base UI's own root, so the primitive's context is present while Ultima's tone context is not. */
test('parts outside Meter.Root fall back to neutral', async () => {
  const screen = await render(
    <>
      <BaseMeter.Root value={40} aria-label="loose">
        <BaseMeter.Track>
          <Meter.Indicator />
        </BaseMeter.Track>
        <Meter.Value />
      </BaseMeter.Root>
      <Sample name="rooted" />
    </>,
  );
  const loose = screen.getByRole('meter', { name: 'loose' }).element();
  const rooted = screen.getByRole('meter', { name: 'rooted' }).element();
  expect(fillColor(loose)).toBe(fillColor(rooted));
  expect(valueColor(loose)).toBe(valueColor(rooted));
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

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<MeterTone>().toEqualTypeOf<'neutral' | 'highlight' | 'success' | 'warning' | 'danger'>();
  expectTypeOf<MeterRootProps>().not.toHaveProperty('className');
  expectTypeOf<MeterLabelProps>().not.toHaveProperty('className');
  expectTypeOf<MeterTrackProps>().not.toHaveProperty('className');
  expectTypeOf<MeterIndicatorProps>().not.toHaveProperty('className');
  expectTypeOf<MeterValueProps>().not.toHaveProperty('className');
  expectTypeOf<MeterRootProps>().toHaveProperty('tone');
  expectTypeOf<MeterLabelProps>().not.toHaveProperty('tone');
  expectTypeOf<MeterTrackProps>().not.toHaveProperty('tone');
  expectTypeOf<MeterIndicatorProps>().toHaveProperty('tone');
  expectTypeOf<MeterValueProps>().toHaveProperty('tone');
});
