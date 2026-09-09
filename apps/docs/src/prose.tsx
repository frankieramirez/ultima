import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ComponentType } from 'react';

const styles = stylex.create({
  root: {
    marginInline: 'auto',
    maxWidth: '44rem',
    paddingBlock: space['--ult-space-9'],
    paddingInline: space['--ult-space-6'],
  },
  h1: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-9'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    marginBlock: 0,
    marginBottom: space['--ult-space-6'],
  },
  h2: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    marginBottom: space['--ult-space-4'],
    marginTop: space['--ult-space-9'],
  },
  h3: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-snug'],
    marginBottom: space['--ult-space-4'],
    marginTop: space['--ult-space-8'],
  },
  p: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-normal'],
    marginBlock: space['--ult-space-5'],
  },
  list: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-normal'],
    marginBlock: space['--ult-space-5'],
    paddingInlineStart: space['--ult-space-7'],
  },
  li: {
    marginBlock: space['--ult-space-3'],
  },
  a: {
    color: color['--ult-color-highlight-text'],
    textDecoration: 'underline',
    textUnderlineOffset: space['--ult-space-2'],
  },
  inlineCode: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-sm'],
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-4'],
    paddingBlock: space['--ult-space-1'],
    paddingInline: space['--ult-space-2'],
  },
  pre: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    marginBlock: space['--ult-space-6'],
    overflow: 'auto',
    padding: space['--ult-space-6'],
  },
  preCode: {
    backgroundColor: 'transparent',
    fontSize: 'inherit',
    padding: 0,
  },
  blockquote: {
    borderLeftColor: color['--ult-color-border-strong'],
    borderLeftStyle: 'solid',
    borderLeftWidth: border.focus,
    color: color['--ult-color-text-muted'],
    marginBlock: space['--ult-space-6'],
    marginInline: 0,
    paddingInlineStart: space['--ult-space-6'],
  },
  tableWrap: {
    marginBlock: space['--ult-space-6'],
    overflow: 'auto',
  },
  table: {
    borderCollapse: 'collapse',
    fontSize: text['--ult-text-4'],
    width: '100%',
  },
  th: {
    borderBottomColor: color['--ult-color-border-strong'],
    borderBottomStyle: 'solid',
    borderBottomWidth: border.hairline,
    color: color['--ult-color-text'],
    fontWeight: font['--ult-font-weight-semibold'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
    textAlign: 'left',
  },
  td: {
    borderBottomColor: color['--ult-color-border'],
    borderBottomStyle: 'solid',
    borderBottomWidth: border.hairline,
    color: color['--ult-color-text'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
    verticalAlign: 'top',
  },
});

function H1(props: ComponentProps<'h1'>) {
  return <h1 {...props} {...stylex.props(styles.h1)} />;
}
function H2(props: ComponentProps<'h2'>) {
  return <h2 {...props} {...stylex.props(styles.h2)} />;
}
function H3(props: ComponentProps<'h3'>) {
  return <h3 {...props} {...stylex.props(styles.h3)} />;
}
function P(props: ComponentProps<'p'>) {
  return <p {...props} {...stylex.props(styles.p)} />;
}
function Ul(props: ComponentProps<'ul'>) {
  return <ul {...props} {...stylex.props(styles.list)} />;
}
function Ol(props: ComponentProps<'ol'>) {
  return <ol {...props} {...stylex.props(styles.list)} />;
}
function Li(props: ComponentProps<'li'>) {
  return <li {...props} {...stylex.props(styles.li)} />;
}
function A(props: ComponentProps<'a'>) {
  return <a {...props} {...stylex.props(styles.a)} />;
}
function Code(props: ComponentProps<'code'>) {
  const block = Boolean(props.className);
  return <code {...props} {...stylex.props(block ? styles.preCode : styles.inlineCode)} />;
}
function Pre(props: ComponentProps<'pre'>) {
  return <pre {...props} {...stylex.props(styles.pre)} />;
}
function Blockquote(props: ComponentProps<'blockquote'>) {
  return <blockquote {...props} {...stylex.props(styles.blockquote)} />;
}
function Table(props: ComponentProps<'table'>) {
  return (
    <div {...stylex.props(styles.tableWrap)}>
      <table {...props} {...stylex.props(styles.table)} />
    </div>
  );
}
function Th(props: ComponentProps<'th'>) {
  return <th {...props} {...stylex.props(styles.th)} />;
}
function Td(props: ComponentProps<'td'>) {
  return <td {...props} {...stylex.props(styles.td)} />;
}

const components = {
  h1: H1,
  h2: H2,
  h3: H3,
  p: P,
  ul: Ul,
  ol: Ol,
  li: Li,
  a: A,
  code: Code,
  pre: Pre,
  blockquote: Blockquote,
  table: Table,
  th: Th,
  td: Td,
} satisfies MDXComponents;

export function Prose({
  Content,
}: {
  Content: ComponentType<{ components?: MDXComponents }>;
}) {
  return (
    <article {...stylex.props(styles.root)}>
      <Content components={components} />
    </article>
  );
}
