import * as stylex from '@stylexjs/stylex';
import { expect, onTestFinished, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

const OUTLINE_WIDTH = '3px';
const LAYERED_BORDER = '5px';
const UNLAYERED_BORDER = '1px';

const styles = stylex.create({
  probe: {
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: { default: '0px', ':focus-visible': OUTLINE_WIDTH },
    borderTopStyle: 'solid',
    borderTopWidth: LAYERED_BORDER,
  },
});

function Probe() {
  return (
    <button type="button" {...stylex.props(styles.probe)}>
      probe
    </button>
  );
}

test('keyboard focus renders the focus-visible outline', async () => {
  const screen = await render(<Probe />);
  const probe = screen.getByRole('button', { name: 'probe' }).element();

  await userEvent.tab();

  expect(document.activeElement).toBe(probe);
  expect(getComputedStyle(probe).outlineWidth).toBe(OUTLINE_WIDTH);
});

test('an unlayered rule beats the StyleX rule for the same property', async () => {
  const screen = await render(<Probe />);
  const probe = screen.getByRole('button', { name: 'probe' }).element();
  expect(getComputedStyle(probe).borderTopWidth).toBe(LAYERED_BORDER);

  // A type selector loses to StyleX's class on specificity and comes from a
  // stylesheet appended after it. Winning is only possible if the StyleX rule
  // sits in a cascade layer, which is what a consumer's unlayered reset relies on.
  const unlayered = document.createElement('style');
  unlayered.textContent = `button { border-top-width: ${UNLAYERED_BORDER}; }`;
  document.head.append(unlayered);
  onTestFinished(() => unlayered.remove());

  expect(getComputedStyle(probe).borderTopWidth).toBe(UNLAYERED_BORDER);
});
