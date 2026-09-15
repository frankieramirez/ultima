import { Progress as BaseProgress } from '@base-ui/react/progress';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Progress,
  type ProgressIndicatorProps,
  type ProgressLabelProps,
  type ProgressRootProps,
  type ProgressTone,
  type ProgressTrackProps,
  type ProgressValueProps,
} from '@ultima/ui';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: five tones on Root, on Indicator, and on Value, and no props matches `neutral`.
 * 2. The name resolves: role progressbar, named by Progress.Label.
 * 3. The focus ring lands where the contract says: on nothing; every part renders none.
 * 4. The primitive is still wired: aria-valuemin, aria-valuemax, aria-valuenow, the indeterminate
 *    aria-valuetext, and the inline fill width Base UI computes from value.
 * 5. Documented state drives its style: tone on Root reaches Indicator and Value, a part's own tone
 *    wins, and exactly one of data-progressing, data-complete, data-indeterminate is present.
 * 6. Typecheck passes: className is rejected, and ProgressTone is exactly its five values.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's, which
 *    is item 4, or a style reacting to a data-* attribute, which is items 5 and 8.
 * 8. CSS the primitive reads: Track's explicit height and overflow, the determinate width
 *    transition-duration, and the indeterminate animation-name split.
 */

const tones = ['neutral', 'highlight', 'success', 'warning', 'danger'] as const;

type SampleProps = {
  name: string;
  value?: number | null;
  root?: ProgressTone;
  indicator?: ProgressTone;
  valueTone?: ProgressTone;
};

function Sample({ name, value = 40, root, indicator, valueTone }: SampleProps) {
  return (
    <Progress.Root value={value} tone={root}>
      <Progress.Label>{name}</Progress.Label>
      <Progress.Track>
        <Progress.Indicator tone={indicator} />
      </Progress.Track>
      <Progress.Value tone={valueTone} />
    </Progress.Root>
  );
}

const trackOf = (progress: Element) => progress.querySelector('div') as HTMLElement;
const fillOf = (progress: Element) => trackOf(progress).querySelector('div') as HTMLElement;
/** The number Base UI renders, not the visually hidden span it appends after the children. */
const valueOf = (progress: Element) =>
  [...progress.querySelectorAll('span')].find((span) => span.hasAttribute('aria-hidden')) as HTMLElement;

const fillColor = (progress: Element) => getComputedStyle(fillOf(progress)).backgroundColor;
const valueColor = (progress: Element) => getComputedStyle(valueOf(progress)).color;

for (const tone of tones) {
  test(`root tone ${tone} renders`, async () => {
    const screen = await render(<Sample name={`root ${tone}`} root={tone} />);
    await expect.element(screen.getByRole('progressbar', { name: `root ${tone}` })).toBeVisible();
  });

  test(`indicator tone ${tone} renders`, async () => {
    const screen = await render(<Sample name={`indicator ${tone}`} indicator={tone} />);
    await expect.element(screen.getByRole('progressbar', { name: `indicator ${tone}` })).toBeVisible();
  });

  test(`value tone ${tone} renders`, async () => {
    const screen = await render(<Sample name={`value ${tone}`} valueTone={tone} />);
    await expect.element(screen.getByRole('progressbar', { name: `value ${tone}` })).toBeVisible();
  });
}

test('omitted tones match neutral', async () => {
  const screen = await render(
    <>
      <Sample name="implicit" />
      <Sample name="explicit" root="neutral" />
      <Sample name="per part" indicator="neutral" valueTone="neutral" />
    </>,
  );
  const implicit = screen.getByRole('progressbar', { name: 'implicit' }).element();
  const explicit = screen.getByRole('progressbar', { name: 'explicit' }).element();
  const perPart = screen.getByRole('progressbar', { name: 'per part' }).element();
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
      <Sample name="failing" root="danger" />
      <Sample name="repeated" indicator="danger" valueTone="danger" />
    </>,
  );
  const plain = screen.getByRole('progressbar', { name: 'plain' }).element();
  const failing = screen.getByRole('progressbar', { name: 'failing' }).element();
  const repeated = screen.getByRole('progressbar', { name: 'repeated' }).element();
  expect(fillColor(failing)).not.toBe(fillColor(plain));
  expect(valueColor(failing)).not.toBe(valueColor(plain));
  expect(fillColor(failing)).toBe(fillColor(repeated));
  expect(valueColor(failing)).toBe(valueColor(repeated));
});

test("a part's own tone wins over the one Root provides", async () => {
  const screen = await render(
    <>
      <Sample name="inherited" root="danger" />
      <Sample name="overridden" root="danger" indicator="success" valueTone="neutral" />
      <Sample name="neutral" />
    </>,
  );
  const inherited = screen.getByRole('progressbar', { name: 'inherited' }).element();
  const overridden = screen.getByRole('progressbar', { name: 'overridden' }).element();
  const neutral = screen.getByRole('progressbar', { name: 'neutral' }).element();
  expect(fillColor(overridden)).not.toBe(fillColor(inherited));
  expect(valueColor(overridden)).not.toBe(valueColor(inherited));
  expect(valueColor(overridden)).toBe(valueColor(neutral));
});

/** Base UI's own root, so the primitive's context is present while Ultima's tone context is not. */
test('parts outside Progress.Root fall back to neutral', async () => {
  const screen = await render(
    <>
      <BaseProgress.Root value={40} aria-label="loose">
        <BaseProgress.Track>
          <Progress.Indicator />
        </BaseProgress.Track>
        <Progress.Value />
      </BaseProgress.Root>
      <Sample name="rooted" />
    </>,
  );
  const loose = screen.getByRole('progressbar', { name: 'loose' }).element();
  const rooted = screen.getByRole('progressbar', { name: 'rooted' }).element();
  expect(fillColor(loose)).toBe(fillColor(rooted));
  expect(valueColor(loose)).toBe(valueColor(rooted));
});

test('Progress.Label names the progress bar', async () => {
  const screen = await render(<Sample name="Uploading footage" />);
  await expect.element(screen.getByRole('progressbar', { name: 'Uploading footage' })).toBeVisible();
  expect(screen.getByRole('progressbar').element()).toHaveAttribute('aria-labelledby');
});

test('nothing in a progress bar takes focus, and no part renders a ring', async () => {
  const screen = await render(
    <>
      <Sample name="Uploading footage" />
      <button type="button">After</button>
    </>,
  );
  await expect.element(screen.getByRole('progressbar')).toBeVisible();
  const progress = screen.getByRole('progressbar').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }).element());
  expect(progress.contains(document.activeElement)).toBe(false);
  for (const part of [progress, trackOf(progress), fillOf(progress), valueOf(progress)]) {
    expect(getComputedStyle(part).outlineStyle).toBe('none');
  }
});

test('the value reaches aria and the indicator fills that share of the track', async () => {
  const screen = await render(<Sample name="Uploading footage" />);
  await expect.element(screen.getByRole('progressbar')).toBeVisible();
  const progress = screen.getByRole('progressbar').element();
  expect(progress).toHaveAttribute('aria-valuemin', '0');
  expect(progress).toHaveAttribute('aria-valuemax', '100');
  expect(progress).toHaveAttribute('aria-valuenow', '40');
  expect(fillOf(progress).getBoundingClientRect().width).toBeCloseTo(
    trackOf(progress).getBoundingClientRect().width * 0.4,
    1,
  );
});

test('an indeterminate bar keeps the role, drops the value, and says so', async () => {
  const screen = await render(
    <>
      <Sample name="restoring" value={null} />
      <Sample name="uploading" />
    </>,
  );
  const restoring = screen.getByRole('progressbar', { name: 'restoring' }).element();
  const uploading = screen.getByRole('progressbar', { name: 'uploading' }).element();
  expect(restoring).not.toHaveAttribute('aria-valuenow');
  expect(restoring).toHaveAttribute('aria-valuetext', 'indeterminate progress');
  expect(uploading).toHaveAttribute('aria-valuenow', '40');
  expect(valueOf(restoring).textContent).toBe('');
});

test('exactly one status attribute is present, and it reaches the indicator', async () => {
  const screen = await render(
    <>
      <Sample name="running" />
      <Sample name="done" value={100} />
      <Sample name="unknown" value={null} />
    </>,
  );
  const attributes = ['data-progressing', 'data-complete', 'data-indeterminate'];
  const expected = { running: 'data-progressing', done: 'data-complete', unknown: 'data-indeterminate' };

  for (const [name, present] of Object.entries(expected)) {
    const progress = screen.getByRole('progressbar', { name }).element();
    expect(progress).toHaveAttribute(present);
    expect(fillOf(progress)).toHaveAttribute(present);
    for (const attribute of attributes.filter((it) => it !== present)) {
      expect(progress).not.toHaveAttribute(attribute);
    }
  }
});

test('data-indeterminate drives the fill from a measured width to a looping quarter', async () => {
  const screen = await render(
    <>
      <Sample name="measured" />
      <Sample name="looping" value={null} />
    </>,
  );
  const measured = fillOf(screen.getByRole('progressbar', { name: 'measured' }).element());
  const looping = fillOf(screen.getByRole('progressbar', { name: 'looping' }).element());
  const track = trackOf(screen.getByRole('progressbar', { name: 'looping' }).element());
  expect(getComputedStyle(measured).animationName).toBe('none');
  expect(getComputedStyle(looping).animationName).not.toBe('none');
  expect(looping.getBoundingClientRect().width).toBeCloseTo(track.getBoundingClientRect().width * 0.25, 1);
});

test('the track has the height and clipping the fill needs to be visible', async () => {
  const screen = await render(<Sample name="Uploading footage" />);
  await expect.element(screen.getByRole('progressbar')).toBeVisible();
  const track = getComputedStyle(trackOf(screen.getByRole('progressbar').element()));
  expect(parseFloat(track.height)).toBeGreaterThan(0);
  expect(track.overflow).toBe('hidden');
});

test('the determinate width transition is not instant', async () => {
  const screen = await render(<Sample name="Uploading footage" />);
  await expect.element(screen.getByRole('progressbar')).toBeVisible();
  const fill = getComputedStyle(fillOf(screen.getByRole('progressbar').element()));
  expect(fill.transitionProperty).toContain('width');
  expect(parseFloat(fill.transitionDuration)).toBeGreaterThan(0);
});

test('reduced motion turns the loop off by name rather than by duration alone', async () => {
  const screen = await render(<Sample name="looping" value={null} />);
  await expect.element(screen.getByRole('progressbar')).toBeVisible();
  const fill = fillOf(screen.getByRole('progressbar').element());
  const stopped = reducedMotionRules('animation-name').filter((rule) => fill.matches(rule.selectorText));

  expect(getComputedStyle(fill).animationName).not.toBe('none');
  expect(stopped.length).toBeGreaterThan(0);
  for (const rule of stopped) expect(rule.style.getPropertyValue('animation-name')).toBe('none');
});

function reducedMotionRules(property: string) {
  const found: CSSStyleRule[] = [];

  function walk(rules: CSSRuleList, reduced: boolean) {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        walk(rule.cssRules, reduced || rule.conditionText.includes('prefers-reduced-motion'));
      } else if (rule instanceof CSSGroupingRule) {
        walk(rule.cssRules, reduced);
      } else if (reduced && rule instanceof CSSStyleRule && rule.style.getPropertyValue(property)) {
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

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<ProgressTone>().toEqualTypeOf<'neutral' | 'highlight' | 'success' | 'warning' | 'danger'>();
  expectTypeOf<ProgressRootProps>().not.toHaveProperty('className');
  expectTypeOf<ProgressLabelProps>().not.toHaveProperty('className');
  expectTypeOf<ProgressTrackProps>().not.toHaveProperty('className');
  expectTypeOf<ProgressIndicatorProps>().not.toHaveProperty('className');
  expectTypeOf<ProgressValueProps>().not.toHaveProperty('className');
  expectTypeOf<ProgressRootProps>().toHaveProperty('tone');
  expectTypeOf<ProgressLabelProps>().not.toHaveProperty('tone');
  expectTypeOf<ProgressTrackProps>().not.toHaveProperty('tone');
  expectTypeOf<ProgressIndicatorProps>().toHaveProperty('tone');
  expectTypeOf<ProgressValueProps>().toHaveProperty('tone');
});
