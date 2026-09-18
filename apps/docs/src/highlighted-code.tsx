import * as stylex from '@stylexjs/stylex';
import type { HighlightTokenClass } from '@tanstack/highlight/core';
import { color } from '@ultima/tokens/tokens.stylex';
import { Code, type CodeProps } from '@ultima/ui';
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

export function HighlightedCode({
  code,
  lang,
  style,
}: {
  code: string;
  lang?: string;
  style?: CodeProps['style'];
}) {
  const tokens = useMemo(
    () => highlighter.tokenize(code, { lang }).tokens,
    [code, lang],
  );

  return (
    <Code variant="block" style={style}>
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
}
