import * as stylex from '@stylexjs/stylex';
import { color } from '@ultima/tokens/tokens.stylex';
import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button, type ButtonProps, type ButtonSize, type ButtonTone, type ButtonVariant } from '@ultima/ui';

test('a button is named by its text', async () => {
  const screen = await render(<Button>Save changes</Button>);
  await expect.element(screen.getByRole('button', { name: 'Save changes' })).toBeVisible();
});

const variants = ['solid', 'soft', 'outline', 'ghost'] as const;
const sizes = ['sm', 'md', 'lg'] as const;
const tones = ['accent', 'danger'] as const;
const cells = variants.flatMap((variant) => sizes.flatMap((size) => tones.map((tone) => ({ variant, size, tone, name: `${variant} ${size} ${tone}` }))));

test('every variant by size by tone cell renders', async () => {
  const screen = await render(
    <>
      {cells.map(({ variant, size, tone, name }) => (
        <Button key={name} variant={variant} size={size} tone={tone}>{name}</Button>
      ))}
    </>,
  );
  for (const { name } of cells) await expect.element(screen.getByRole('button', { name })).toBeVisible();
});

test('omitted axes match solid / md / accent', async () => {
  const screen = await render(<><Button>Default</Button><Button variant="solid" size="md" tone="accent">Explicit</Button></>);
  const implicit = screen.getByRole('button', { name: 'Default' }).element();
  const explicit = screen.getByRole('button', { name: 'Explicit' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('keyboard focus draws the root outline', async () => {
  const screen = await render(<Button>Focus me</Button>);
  const button = screen.getByRole('button', { name: 'Focus me' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(button);
  expect(parseFloat(getComputedStyle(button).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(button).outlineStyle).toBe('solid');
});

const probe = stylex.create({
  muted: { backgroundColor: color['--ult-color-surface-sunken'], color: color['--ult-color-text-disabled'] },
  text: { color: color['--ult-color-text'] },
  subtle: { backgroundColor: color['--ult-color-accent-subtle'] },
});

function rulesFor(element: Element, test: (rule: CSSStyleRule, media: string | null) => boolean): boolean {
  const classes = [...element.classList].map((name) => `.${name}`);
  const visit = (rules: CSSRuleList, media: string | null): boolean =>
    [...rules].some((rule) => {
      if (rule instanceof CSSMediaRule) return visit(rule.cssRules, rule.conditionText);
      if (rule instanceof CSSLayerBlockRule) return visit(rule.cssRules, media);
      return rule instanceof CSSStyleRule && classes.some((name) => rule.selectorText.includes(name)) && test(rule, media);
    });
  return [...document.styleSheets].some((sheet) => visit(sheet.cssRules, null));
}

test('disabled prevents activation and takes the muted fill and ink instead of fading', async () => {
  const onClick = vi.fn();
  const screen = await render(
    <>
      <Button disabled onClick={onClick}>Disabled</Button>
      <span data-testid="muted" {...stylex.props(probe.muted)}>muted</span>
    </>,
  );
  const button = screen.getByRole('button', { name: 'Disabled' }).element();
  const muted = getComputedStyle(screen.getByTestId('muted').element());
  expect(button).toHaveAttribute('data-disabled');
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(onClick).not.toHaveBeenCalled();
  expect(getComputedStyle(button).opacity).toBe('1');
  expect(getComputedStyle(button).backgroundColor).toBe(muted.backgroundColor);
  expect(getComputedStyle(button).color).toBe(muted.color);
  button.removeAttribute('data-disabled');
  expect(getComputedStyle(button).cursor).toBe('pointer');
});

test('every variant takes the same muted look when disabled', async () => {
  const screen = await render(
    <>
      {(['solid', 'soft', 'outline', 'ghost'] as const).map((variant) => (
        <Button key={variant} variant={variant} disabled>{variant}</Button>
      ))}
    </>,
  );
  const looks = (['solid', 'soft', 'outline', 'ghost'] as const).map((variant) => {
    const style = getComputedStyle(screen.getByRole('button', { name: variant }).element());
    return `${style.backgroundColor} ${style.color}`;
  });
  expect(new Set(looks).size).toBe(1);
});

test('a ghost button rests in full ink, not muted text', async () => {
  const screen = await render(
    <>
      <Button variant="ghost">Ghost</Button>
      <span data-testid="text" {...stylex.props(probe.text)}>text</span>
    </>,
  );
  const ghost = getComputedStyle(screen.getByRole('button', { name: 'Ghost' }).element());
  expect(ghost.color).toBe(getComputedStyle(screen.getByTestId('text').element()).color);
});

test('a soft button rests on its role\'s subtle fill', async () => {
  const screen = await render(
    <>
      <Button variant="soft">Soft</Button>
      <span data-testid="subtle" {...stylex.props(probe.subtle)}>subtle</span>
    </>,
  );
  const soft = getComputedStyle(screen.getByRole('button', { name: 'Soft' }).element());
  expect(soft.backgroundColor).toBe(getComputedStyle(screen.getByTestId('subtle').element()).backgroundColor);
});

test('a press moves the button down one hairline', async () => {
  const screen = await render(<Button>Press</Button>);
  const button = screen.getByRole('button', { name: 'Press' }).element();
  expect(getComputedStyle(button).translate).toMatch(/^(none|0px)$/);
  expect(rulesFor(button, (rule) => rule.selectorText.includes(':active') && rule.style.translate === '0px 1px')).toBe(true);
});

test('hover answers only on devices that hover', async () => {
  const screen = await render(<Button>Hover</Button>);
  const button = screen.getByRole('button', { name: 'Hover' }).element();
  const hoverRules = (media: string | null) =>
    rulesFor(button, (rule, condition) => condition === media && rule.selectorText.includes(':hover') && rule.style.backgroundColor !== '');
  expect(hoverRules('(hover: hover)')).toBe(true);
  expect(hoverRules(null)).toBe(false);
});

test('an outline button lifts on shadow-xs and sets it down when disabled', async () => {
  const screen = await render(
    <>
      <Button variant="outline">Lifted</Button>
      <Button variant="outline" disabled>Flat</Button>
    </>,
  );
  expect(getComputedStyle(screen.getByRole('button', { name: 'Lifted' }).element()).boxShadow).not.toBe('none');
  expect(getComputedStyle(screen.getByRole('button', { name: 'Flat' }).element()).boxShadow).toBe('none');
});

test('a button holding an icon gives up one space step on each side', async () => {
  const icon = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" />;
  const screen = await render(
    <>
      <Button>Plain</Button>
      <Button>{icon}With icon</Button>
    </>,
  );
  const plain = getComputedStyle(screen.getByRole('button', { name: 'Plain' }).element());
  const withIcon = getComputedStyle(screen.getByRole('button', { name: 'With icon' }).element());
  expect(parseFloat(withIcon.paddingInlineStart)).toBe(parseFloat(plain.paddingInlineStart) - 4);
  expect(withIcon.paddingInlineEnd).toBe(withIcon.paddingInlineStart);
});

const overrides = stylex.create({ icon: { aspectRatio: 1, paddingInline: 0 } });

test('the icon-only recipe is square at every size', async () => {
  const screen = await render(
    <>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Button key={size} size={size} aria-label={`Add ${size}`} style={overrides.icon}>+</Button>
      ))}
    </>,
  );
  for (const size of ['sm', 'md', 'lg'] as const) {
    const rect = screen.getByRole('button', { name: `Add ${size}` }).element().getBoundingClientRect();
    expect(rect.width).toBeCloseTo(rect.height, 0);
  }
});

test('caller padding overrides the size table, with or without an icon', async () => {
  const screen = await render(
    <>
      <Button>Normal</Button>
      <Button aria-label="Add" style={overrides.icon}>+</Button>
      <Button aria-label="Upload" style={overrides.icon}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" /></Button>
    </>,
  );
  expect(getComputedStyle(screen.getByRole('button', { name: 'Upload' }).element()).paddingInlineStart).toBe('0px');
  const normal = getComputedStyle(screen.getByRole('button', { name: 'Normal' }).element());
  const icon = getComputedStyle(screen.getByRole('button', { name: 'Add' }).element());
  expect(icon.paddingInlineStart).toBe('0px');
  expect(icon.paddingInlineStart).not.toBe(normal.paddingInlineStart);
});

test('a disabled button keeps its resting fill under the pointer', async () => {
  const screen = await render(<><Button>Live</Button><Button disabled>Off</Button></>);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 300));
  const live = screen.getByRole('button', { name: 'Live' }).element();
  const off = screen.getByRole('button', { name: 'Off' }).element();
  const liveResting = getComputedStyle(live).backgroundColor;
  const offResting = getComputedStyle(off).backgroundColor;
  await userEvent.hover(live);
  await settle();
  expect(getComputedStyle(live).backgroundColor).not.toBe(liveResting);
  await userEvent.hover(off);
  await settle();
  expect(off.matches(':hover')).toBe(true);
  expect(getComputedStyle(off).backgroundColor).toBe(offResting);
});

test('a long label stays on one line', async () => {
  const screen = await render(<div style={{ width: 40 }}><Button>Save all changes now</Button></div>);
  expect(getComputedStyle(screen.getByRole('button').element()).whiteSpace).toBe('nowrap');
});

test('render and ref reach the underlying element', async () => {
  const ref = createRef<HTMLButtonElement>();
  const screen = await render(<Button ref={ref} render={<button data-custom="yes" />}>Custom</Button>);
  expect(ref.current).toBe(screen.getByRole('button', { name: 'Custom' }).element());
  expect(ref.current).toHaveAttribute('data-custom', 'yes');
});

test('rendered as a link, the label keeps no underline', async () => {
  const screen = await render(<Button render={<a href="#install" />} nativeButton={false}>Install</Button>);
  const link = screen.getByRole('button', { name: 'Install' }).element();
  expect(link.tagName).toBe('A');
  expect(getComputedStyle(link).textDecorationLine).toBe('none');
});

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<ButtonProps>().not.toHaveProperty('className');
  expectTypeOf<ButtonTone>().toEqualTypeOf<'accent' | 'danger'>();
  expectTypeOf<ButtonVariant>().toEqualTypeOf<'solid' | 'soft' | 'outline' | 'ghost'>();
  expectTypeOf<ButtonSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
});
