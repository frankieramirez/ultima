import * as stylex from '@stylexjs/stylex';
import type { HighlightTokenClass } from '@tanstack/highlight/core';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Code, ScrollArea, type CodeProps } from '@ultima/ui';
import { isValidElement, useMemo, type ReactNode } from 'react';

import { highlighter } from './highlight';

const roles = stylex.create({
  muted: { color: color['--ult-color-text-muted'] },
  accent: { color: color['--ult-color-accent-text'] },
  highlight: { color: color['--ult-color-highlight-text'] },
  success: { color: color['--ult-color-success-text'] },
  warning: { color: color['--ult-color-warning-text'] },
  danger: { color: color['--ult-color-danger-text'] },
});

const numbered = stylex.create({
  root: { display: 'flex', minInlineSize: 0 },
  gutter: {
    boxSizing: 'border-box',
    color: color['--ult-color-text-subtle'],
    flexShrink: 0,
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    minInlineSize: space['--ult-space-11'],
    paddingBlockEnd: space['--ult-space-6'],
    paddingBlockStart: space['--ult-space-5'],
    paddingInline: space['--ult-space-5'],
    textAlign: 'end',
    userSelect: 'none',
    whiteSpace: 'pre',
  },
  scroll: { flexGrow: 1, minInlineSize: 0 },
  code: {
    overflowWrap: 'normal',
    paddingBlockEnd: space['--ult-space-6'],
    paddingBlockStart: space['--ult-space-5'],
    paddingInlineEnd: space['--ult-space-6'],
    paddingInlineStart: 0,
    whiteSpace: 'pre',
  },
});

const TOKEN_STYLES: Record<HighlightTokenClass, typeof roles.muted> = {
  attr: roles.warning,
  'code-inline': roles.highlight,
  command: roles.accent,
  comment: roles.muted,
  deleted: roles.danger,
  function: roles.highlight,
  heading: roles.highlight,
  inserted: roles.success,
  keyword: roles.accent,
  link: roles.highlight,
  literal: roles.warning,
  meta: roles.muted,
  number: roles.warning,
  operator: roles.accent,
  property: roles.warning,
  selector: roles.accent,
  string: roles.success,
  tag: roles.accent,
  type: roles.highlight,
  variable: roles.warning,
};

export function fenceLanguage(className?: string): string | undefined {
  const token = className?.split(/\s+/).find((part) => part.startsWith('language-'));
  return token?.slice('language-'.length) || undefined;
}

export function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return '';
}

function linesShown(code: string) {
  return code.replace(/\n$/, '').split('\n').length;
}

export function HighlightedCode({
  code,
  lang,
  lineNumbers = false,
  style,
  tabIndex,
}: {
  code: string;
  lang?: string;
  /** Number the lines in an `aria-hidden` gutter outside the `pre`; long lines then scroll rather than wrap. */
  lineNumbers?: boolean;
  style?: CodeProps['style'];
  tabIndex?: CodeProps['tabIndex'];
}) {
  const tokens = useMemo(
    () => highlighter.tokenize(code, { lang }).tokens,
    [code, lang],
  );

  const numbers = lineNumbers && code !== '';
  const block = (
    <Code variant="block" style={[style, numbers && numbered.code]} tabIndex={tabIndex}>
      {tokens.map((token, index) =>
        token.className ? (
          <span key={index} {...stylex.props(TOKEN_STYLES[token.className])}>
            {token.value}
          </span>
        ) : (
          token.value
        ),
      )}
    </Code>
  );
  if (!numbers) return block;

  return (
    <div {...stylex.props(numbered.root)}>
      <div aria-hidden {...stylex.props(numbered.gutter)}>
        {/* The UA stylesheet sets `code` in generic monospace, which can grow a line box, so the gutter
            wraps its numbers in one too and keeps step with the block's own `code`. */}
        <code>{Array.from({ length: linesShown(code) }, (_, index) => index + 1).join('\n')}</code>
      </div>
      <ScrollArea.Root style={numbered.scroll}>
        <ScrollArea.Viewport>
          <ScrollArea.Content>{block}</ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="horizontal">
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
