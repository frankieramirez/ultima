import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import { color } from '@ultima/tokens/tokens.stylex';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ComponentType } from 'react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { remarkFenceTitle } from '../../scripts/remark-fence-title';
import { Demo } from '../demo';
import { fenceLanguage, HighlightedCode, nodeText } from '../highlighted-code';
import { Prose } from '../prose';
import { renderWithRouter } from './render-with-router';

const styles = stylex.create({
  accent: { color: color['--ult-color-accent-text'] },
  success: { color: color['--ult-color-success-text'] },
  muted: { color: color['--ult-color-text-muted'] },
});

const SOURCE = 'const label = "Button"; // demo';

function colorOf(text: string, root: Element) {
  const node = [...root.querySelectorAll('span')].find((span) => span.textContent === text);
  expect(node, `token "${text}"`).toBeTruthy();
  return getComputedStyle(node!).color;
}

test('fenceLanguage reads the MDX language class and ignores other classes', () => {
  expect(fenceLanguage('language-tsx')).toBe('tsx');
  expect(fenceLanguage('language-bash extra')).toBe('bash');
  expect(fenceLanguage('not-a-language')).toBeUndefined();
  expect(fenceLanguage(undefined)).toBeUndefined();
});

test('nodeText flattens MDX children', () => {
  expect(nodeText('plain')).toBe('plain');
  expect(nodeText(['a', ['b', 1]])).toBe('ab1');
});

test('tsx tokens use Ultima semantic text colors and keep the source copyable', async () => {
  function Sample() {
    return (
      <div data-testid="root">
        <span data-testid="accent" {...stylex.props(styles.accent)}>
          accent
        </span>
        <span data-testid="success" {...stylex.props(styles.success)}>
          success
        </span>
        <span data-testid="muted" {...stylex.props(styles.muted)}>
          muted
        </span>
        <HighlightedCode code={SOURCE} lang="tsx" />
      </div>
    );
  }

  const screen = await render(<Sample />);
  const root = screen.getByTestId('root').element();
  const pre = root.querySelector('pre');
  expect(pre?.textContent).toBe(SOURCE);
  expect(colorOf('const', root)).toBe(getComputedStyle(screen.getByTestId('accent').element()).color);
  expect(colorOf('"Button"', root)).toBe(getComputedStyle(screen.getByTestId('success').element()).color);
  expect(colorOf('// demo', root)).toBe(getComputedStyle(screen.getByTestId('muted').element()).color);
});

test('an unknown language still prints the source', async () => {
  const screen = await render(<HighlightedCode code="fn main() {}" lang="rust" />);
  await expect.element(screen.getByText('fn main() {}')).toBeVisible();
});

test('a bash fence colors the command', async () => {
  function Sample() {
    return (
      <div data-testid="root">
        <span data-testid="accent" {...stylex.props(styles.accent)}>
          accent
        </span>
        <HighlightedCode code="npx shadcn add @ultima/button" lang="bash" />
      </div>
    );
  }

  const screen = await render(<Sample />);
  const root = screen.getByTestId('root').element();
  expect(colorOf('npx', root)).toBe(getComputedStyle(screen.getByTestId('accent').element()).color);
});

test('Demo follows the ambient color mode and highlights the printed source', async () => {
  function Example() {
    return <span>live</span>;
  }

  const source = 'export default function Example() {\n  return null;\n}';
  const modes = [stylex.props(darkTheme, colorScheme.dark), stylex.props(lightTheme, colorScheme.light)];
  const keywords: string[] = [];
  for (const mode of modes) {
    const screen = await render(
      <div {...mode}>
        <Demo component={Example} source={source} />
      </div>,
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Code', exact: true }));
    const figure = screen.container.querySelector('figure')!;
    expect(figure.querySelector('pre')?.textContent).toBe(source);
    expect(getComputedStyle(figure).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(colorOf('function', figure)).not.toBe(colorOf('Example', figure));
    keywords.push(colorOf('function', figure));
    await screen.unmount();
  }
  expect(keywords[0]).not.toBe(keywords[1]);
});

test('an MDX fence highlights its source in a bordered block', async () => {
  function Content({ components }: { components?: MDXComponents }) {
    const Pre = components!.pre as ComponentType<ComponentProps<'pre'>>;
    const MdCode = components!.code as ComponentType<ComponentProps<'code'>>;
    return (
      <>
        <h1>Button</h1>
        <Pre>
          <MdCode className="language-tsx">{SOURCE}</MdCode>
        </Pre>
      </>
    );
  }

  const screen = await renderWithRouter(
    <Prose Content={Content} breadcrumb={[{ label: 'Components', to: '/components' }, { label: 'Button' }]} />,
  );
  const article = screen.getByRole('article').element();
  expect(article.querySelector('pre')?.textContent).toBe(SOURCE);
  expect(colorOf('const', article)).not.toBe(colorOf('"Button"', article));
});

test('copying a demo still copies the original source string', async () => {
  let copied = '';
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (value: string) => {
        copied = value;
        return Promise.resolve();
      },
    },
  });

  function Example() {
    return <span>live</span>;
  }

  const source = 'export default function Example() {\n  return null;\n}';
  const screen = await render(<Demo component={Example} source={source} />);
  await userEvent.click(screen.getByRole('button', { name: 'Copy example source' }));
  expect(copied).toBe(source);
});

const FILE = ':root {\n  --ult-color-accent: #7c5cff;\n}';

function stubClipboard() {
  const copied: string[] = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (value: string) => (copied.push(value), Promise.resolve()) },
  });
  return copied;
}

function LabelledFence({ components }: { components?: MDXComponents }) {
  const Pre = components!.pre as ComponentType<ComponentProps<'pre'>>;
  const MdCode = components!.code as ComponentType<ComponentProps<'code'>>;
  return (
    <Pre>
      <MdCode className="language-css" title="theme.css">
        {FILE}
      </MdCode>
    </Pre>
  );
}

test('a fence title becomes the code element title the docs Pre reads', () => {
  const fence = { type: 'code', lang: 'bash', meta: 'title="Terminal"' };
  const plain = { type: 'code', lang: 'bash', meta: null };
  const other = { type: 'code', lang: 'bash', meta: 'showLineNumbers' };
  remarkFenceTitle()({ type: 'root', children: [fence, plain, other] });
  expect(fence).toMatchObject({ data: { hProperties: { title: 'Terminal' } } });
  expect(plain).not.toHaveProperty('data');
  expect(other).not.toHaveProperty('data');
});

test('a labelled fence shows its label and numbers its lines outside the copied text', async () => {
  const copied = stubClipboard();
  const screen = await renderWithRouter(<Prose Content={LabelledFence} breadcrumb={[{ label: 'Tokens' }]} />);
  const article = screen.getByRole('article').element();
  await expect.element(screen.getByText('theme.css', { exact: true })).toBeVisible();

  const pre = article.querySelector('pre')!;
  expect(pre.textContent).toBe(FILE);
  const gutter = article.querySelector('[aria-hidden="true"]:has(> code)')!;
  expect(gutter.textContent).toBe('1\n2\n3');
  expect(gutter.contains(pre)).toBe(false);
  expect(getComputedStyle(gutter).userSelect).toBe('none');
  expect(gutter.getBoundingClientRect().height).toBe(pre.getBoundingClientRect().height);

  await userEvent.click(screen.getByRole('button', { name: 'Copy theme.css' }));
  expect(copied).toEqual([FILE]);
});

test('a numbered block scrolls a long line instead of wrapping it', async () => {
  const line = `npx shadcn add ${'https://ultima.systems/r/setup-vite.json '.repeat(6)}`;
  function Long({ components }: { components?: MDXComponents }) {
    const Pre = components!.pre as ComponentType<ComponentProps<'pre'>>;
    return (
      <Pre>
        <code className="language-bash" title="Terminal">
          {line}
        </code>
      </Pre>
    );
  }
  const screen = await renderWithRouter(<Prose Content={Long} breadcrumb={[{ label: 'Install' }]} />);
  const pre = screen.getByRole('article').element().querySelector('pre')!;
  expect(getComputedStyle(pre).whiteSpace).toBe('pre');
  const viewport = pre.parentElement!.parentElement!;
  expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
});

test('an unlabelled fence stays a plain block with no numbers', async () => {
  function Plain({ components }: { components?: MDXComponents }) {
    const Pre = components!.pre as ComponentType<ComponentProps<'pre'>>;
    return (
      <Pre>
        <code className="language-bash">npx shadcn add @ultima/button</code>
      </Pre>
    );
  }
  const screen = await renderWithRouter(<Prose Content={Plain} breadcrumb={[{ label: 'Button' }]} />);
  const article = screen.getByRole('article').element();
  expect(article.querySelector('[aria-hidden="true"]:has(> code)')).toBeNull();
  await expect.element(screen.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
});

test('a demo numbers its source lines without adding them to the source', async () => {
  function Example() {
    return <span>live</span>;
  }
  const source = 'export default function Example() {\n  return null;\n}\n';
  const screen = await render(<Demo component={Example} source={source} />);
  await userEvent.click(screen.getByRole('tab', { name: 'Code', exact: true }));
  const figure = screen.container.querySelector('figure')!;
  expect(figure.querySelector('pre')?.textContent).toBe(source);
  expect(figure.querySelector('[aria-hidden="true"]:has(> code)')?.textContent).toBe('1\n2\n3');
});
