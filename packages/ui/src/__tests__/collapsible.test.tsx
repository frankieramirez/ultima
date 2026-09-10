import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import * as stylex from '@stylexjs/stylex';
import { Button, Collapsible, type CollapsiblePanelProps } from '@ultima/ui';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

const styles = stylex.create({
  grid: { display: 'grid' },
});

const themes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

function Sample({ name = 'Details', children }: { name?: string; children?: ReactNode }) {
  return (
    <Collapsible.Root>
      <Collapsible.Trigger render={<Button variant="ghost" />}>{name}</Collapsible.Trigger>
      <Collapsible.Panel data-testid="panel">{children ?? <p>Panel body</p>}</Collapsible.Panel>
    </Collapsible.Root>
  );
}

test('a collapsible with no props renders closed', async () => {
  const screen = await render(<Sample />);
  await expect.element(screen.getByRole('button', { name: 'Details' })).toBeVisible();
  expect(screen.container.querySelector('[data-testid="panel"]')).toBeNull();
});

test('the trigger names the disclosure and reports its expanded state', async () => {
  const screen = await render(<Sample name="Release notes" />);
  const trigger = screen.getByRole('button', { name: 'Release notes' }).element();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const panel = screen.getByTestId('panel').element();
  expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
});

test('an uncontrolled collapsible opens and closes from the trigger', async () => {
  const screen = await render(<Sample />);
  const trigger = screen.getByRole('button', { name: 'Details' }).element();
  await userEvent.click(trigger);
  await expect.element(screen.getByTestId('panel')).toBeVisible();
  await userEvent.click(trigger);
  await expect.element(screen.getByTestId('panel')).not.toBeInTheDocument();
});

test('a controlled collapsible follows open and reports every change', async () => {
  const changes: boolean[] = [];

  function Controlled() {
    const [open, setOpen] = useState(false);
    return (
      <Collapsible.Root
        open={open}
        onOpenChange={(next) => {
          changes.push(next);
          setOpen(next);
        }}
      >
        <Collapsible.Trigger render={<Button variant="ghost" />}>Details</Collapsible.Trigger>
        <Collapsible.Panel data-testid="panel">Controlled body</Collapsible.Panel>
      </Collapsible.Root>
    );
  }

  const screen = await render(<Controlled />);
  const trigger = screen.getByRole('button', { name: 'Details' }).element();
  await userEvent.click(trigger);
  await expect.element(screen.getByTestId('panel')).toBeVisible();
  await userEvent.click(trigger);
  await expect.element(screen.getByTestId('panel')).not.toBeInTheDocument();
  expect(changes).toEqual([true, false]);
});

for (const key of ['{ }', '{Enter}'] as const) {
  test(`${key} on the trigger toggles the panel`, async () => {
    const screen = await render(<Sample />);
    const trigger = screen.getByRole('button', { name: 'Details' }).element();
    await userEvent.tab();
    expect(document.activeElement).toBe(trigger);
    await userEvent.keyboard(key);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
}

for (const mode of themes) {
  test(`the rendered trigger draws the focus ring in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Sample />
      </div>,
    );
    const trigger = screen.getByRole('button', { name: 'Details' }).element();
    await userEvent.tab();
    expect(document.activeElement).toBe(trigger);
    expect(getComputedStyle(trigger).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(trigger).outlineWidth)).toBeGreaterThan(0);
  });

  test(`the open panel carries the height transition in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Sample />
      </div>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Details' }).element());
    const panel = getComputedStyle(screen.getByTestId('panel').element());
    expect(panel.transitionProperty).toBe('height');
    expect(panel.transitionDuration).not.toBe('0s');
    expect(panel.animationName).toBe('none');
    expect(panel.overflow).toBe('hidden');
  });
}

test('a bare trigger ships no ring of its own', async () => {
  const screen = await render(
    <Collapsible.Root>
      <Collapsible.Trigger>Details</Collapsible.Trigger>
      <Collapsible.Panel>Panel body</Collapsible.Panel>
    </Collapsible.Root>,
  );
  const trigger = screen.getByRole('button', { name: 'Details' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(trigger);
  expect(getComputedStyle(trigger).outlineStyle).not.toBe('solid');
});

test('the panel collapses to zero height at both ends of the transition', async () => {
  await render(<Sample />);
  const states = ['data-starting-style', 'data-ending-style'];

  for (const state of states) {
    const heights = panelRules(state).map((rule) => rule.style.getPropertyValue('height'));
    expect(heights.length).toBeGreaterThan(0);
    for (const height of heights) expect(parseFloat(height)).toBe(0);
  }
});

test('the panel height is driven by the variable the primitive seeds', async () => {
  const screen = await render(<Sample />);
  await userEvent.click(screen.getByRole('button', { name: 'Details' }).element());
  const panel = screen.getByTestId('panel').element();
  expect(panel.style.getPropertyValue('--collapsible-panel-height')).not.toBe('');
  await expect.poll(() => parseFloat(getComputedStyle(panel).height)).toBeGreaterThan(0);
});

test('data-panel-open reaches the trigger and data-open the panel', async () => {
  const screen = await render(<Sample />);
  const trigger = screen.getByRole('button', { name: 'Details' }).element();
  expect(trigger).not.toHaveAttribute('data-panel-open');
  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('data-panel-open');
  expect(screen.getByTestId('panel').element()).toHaveAttribute('data-open');
});

test('a kept-mounted closed panel stays display none through a consumer display override', async () => {
  const screen = await render(
    <Collapsible.Root>
      <Collapsible.Trigger render={<Button variant="ghost" />}>Details</Collapsible.Trigger>
      <Collapsible.Panel data-testid="panel" keepMounted style={styles.grid}>
        Panel body
      </Collapsible.Panel>
    </Collapsible.Root>,
  );
  const panel = screen.getByTestId('panel').element();
  expect(panel).toHaveAttribute('hidden');
  expect(getComputedStyle(panel).display).toBe('none');
});

test('hidden until found keeps the consumer display so find-in-page can reveal it', async () => {
  const screen = await render(
    <Collapsible.Root>
      <Collapsible.Trigger render={<Button variant="ghost" />}>Details</Collapsible.Trigger>
      <Collapsible.Panel data-testid="panel" hiddenUntilFound style={styles.grid}>
        Panel body
      </Collapsible.Panel>
    </Collapsible.Root>,
  );
  const panel = screen.getByTestId('panel').element();
  expect(panel.getAttribute('hidden')).toBe('until-found');
  expect(getComputedStyle(panel).display).toBe('grid');
});

test('the motion token stays non-zero under reduced motion so the transition still completes', async () => {
  await render(<Sample />);
  const declarations: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    collect(rules, false, declarations);
  }

  expect(declarations.length).toBeGreaterThan(0);
  for (const value of declarations) {
    expect(parseFloat(value)).toBeGreaterThan(0);
  }
});

function panelRules(state: string) {
  const found: CSSStyleRule[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    walk(rules);
  }

  function walk(rules: CSSRuleList) {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSGroupingRule) walk(rule.cssRules);
      else if (rule instanceof CSSStyleRule && rule.selectorText.includes(state) && rule.style.height) {
        found.push(rule);
      }
    }
  }

  return found;
}

function collect(rules: CSSRuleList, reduced: boolean, out: string[]) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSMediaRule) {
      collect(rule.cssRules, reduced || rule.conditionText.includes('prefers-reduced-motion'), out);
      continue;
    }
    if (rule instanceof CSSGroupingRule) {
      collect(rule.cssRules, reduced, out);
      continue;
    }
    if (reduced && rule instanceof CSSStyleRule) {
      const value = rule.style.getPropertyValue('--ult-motion-base');
      if (value) out.push(value);
    }
  }
}

test('the panel type exposes the style slot and no className', () => {
  expectTypeOf<CollapsiblePanelProps>().not.toHaveProperty('className');
  expectTypeOf<CollapsiblePanelProps>().toHaveProperty('style');
});
