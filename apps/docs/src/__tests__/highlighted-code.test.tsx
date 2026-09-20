import * as stylex from '@stylexjs/stylex';
import { color } from '@ultima/tokens/tokens.stylex';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ComponentType } from 'react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { Demo } from '../demo';
import { fenceLanguage, HighlightedCode, nodeText } from '../highlighted-code';
import { Prose } from '../prose';

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

test('Demo highlights the printed source on the forced-light specimen paper', async () => {
  function Example() {
    return <span>live</span>;
  }

  const source = 'export default function Example() {\n  return null;\n}';
  const screen = await render(<Demo component={Example} source={source} />);
  await expect.element(screen.getByText('live')).toBeVisible();
  const figure = screen.getByRole('figure').element();
  expect(figure.querySelector('pre')?.textContent).toBe(source);
  expect(getComputedStyle(figure).backgroundColor).toBe('rgb(237, 237, 232)');
  expect(colorOf('function', figure)).not.toBe(colorOf('Example', figure));
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

  const screen = await render(<Prose Content={Content} breadcrumb="COMPONENTS / BUTTON" />);
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
