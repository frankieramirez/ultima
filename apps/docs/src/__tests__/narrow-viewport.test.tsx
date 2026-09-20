import * as stylex from '@stylexjs/stylex';
import type { ComponentType } from 'react';
import { expect, onTestFinished, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import LinkedPages from '../demos/pagination/links';
import PageWindow from '../demos/pagination/window';
import WindowSize from '../demos/pagination/window-size';
import BasicScrollArea from '../demos/scroll-area/basic';
import BothAxesScrollArea from '../demos/scroll-area/both-axes';
import FadeScrollArea from '../demos/scroll-area/fade';
import { PalettePage } from '../routes/palette';

const previewColumnInlineSize = '20rem';

const styles = stylex.create({
  figure: { inlineSize: previewColumnInlineSize },
});

test('the palette ramps fit their column at a narrow viewport', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const { container } = await render(<PalettePage />);
  const main = container.querySelector('main') as HTMLElement;
  const viewports = container.querySelectorAll<HTMLElement>('[role="presentation"][tabindex]');

  expect(viewports.length).toBe(6);
  for (const viewport of viewports) {
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
  }
  expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth);
});

const paginationDemos = [
  { name: 'window', Demo: PageWindow },
  { name: 'links', Demo: LinkedPages },
  { name: 'window-size', Demo: WindowSize },
];

for (const { name, Demo } of paginationDemos) {
  test(`the pagination/${name} demo fits its figure at a narrow viewport`, async () => {
    const { container } = await render(
      <div {...stylex.props(styles.figure)}>
        <Demo />
      </div>,
    );
    const figure = container.firstElementChild as HTMLElement;

    expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth);
  });
}

const scrollAreaDemos: { name: string; Demo: ComponentType; axis: 'x' | 'y' }[] = [
  { name: 'basic', Demo: BasicScrollArea, axis: 'y' },
  { name: 'both-axes', Demo: BothAxesScrollArea, axis: 'x' },
  { name: 'fade', Demo: FadeScrollArea, axis: 'y' },
];

for (const { name, Demo, axis } of scrollAreaDemos) {
  test(`the scroll-area/${name} demo bounds fit its figure at a narrow viewport`, async () => {
    const { container } = await render(
      <div {...stylex.props(styles.figure)}>
        <Demo />
      </div>,
    );
    const figure = container.firstElementChild as HTMLElement;
    const viewport = container.querySelector<HTMLElement>('[role="presentation"][tabindex]');

    expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth);
    if (axis === 'x') {
      expect(viewport!.scrollWidth).toBeGreaterThan(viewport!.clientWidth);
    } else {
      expect(viewport!.scrollHeight).toBeGreaterThan(viewport!.clientHeight);
    }
  });
}
