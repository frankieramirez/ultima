import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Code as UltimaCode, ScrollArea, Separator, Table } from '@ultima/ui';
import type { MDXComponents } from 'mdx/types';
import {
  createContext,
  isValidElement,
  useContext,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react';

import { DocumentLayout, type Crumb } from './document-layout';
import { fenceLanguage, HighlightedCode, nodeText } from './highlighted-code';
import { TextLink } from './text-link';
import { headings } from './typography';

const styles = stylex.create({
  root: {
    minInlineSize: 0,
  },
  h1: {
    marginBottom: space['--ult-space-6'],
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
  code: {
    marginBlock: space['--ult-space-6'],
    padding: space['--ult-space-7'],
  },
  inlineCode: {
    overflowWrap: 'anywhere',
  },
  inlineCodeInScrollableTable: {
    overflowWrap: 'normal',
    whiteSpace: 'nowrap',
  },
  blockquote: {
    color: color['--ult-color-text-muted'],
    marginBlock: space['--ult-space-6'],
    marginInline: 0,
    paddingInlineStart: space['--ult-space-6'],
  },
  uncaptionedTable: {
    marginBlock: space['--ult-space-6'],
  },
  cell: {
    verticalAlign: 'top',
  },
});

function H1(props: ComponentProps<'h1'>) {
  return <h1 {...props} {...stylex.props(headings.h1, styles.h1)} />;
}
function H2(props: ComponentProps<'h2'>) {
  return (
    <>
      <Separator style={headings.rule} />
      <h2 {...props} {...stylex.props(headings.h2)} />
    </>
  );
}
function H3(props: ComponentProps<'h3'>) {
  return <h3 {...props} {...stylex.props(headings.h3)} />;
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
const ScrollableTableContext = createContext(false);

function Code({ children }: ComponentProps<'code'>) {
  const inScrollableTable = useContext(ScrollableTableContext);
  return (
    <UltimaCode style={[styles.inlineCode, inScrollableTable && styles.inlineCodeInScrollableTable]}>
      {children}
    </UltimaCode>
  );
}
/** MDX nests the fence's text in a `code` element; Code writes that pair itself, so unwrap it. */
function Pre({ children }: ComponentProps<'pre'>) {
  const nested = isValidElement<{ children?: ReactNode; className?: string }>(children)
    ? children
    : undefined;
  return (
    <HighlightedCode
      code={nodeText(nested ? nested.props.children : children)}
      lang={fenceLanguage(nested?.props.className)}
      style={styles.code}
    />
  );
}
function Blockquote(props: ComponentProps<'blockquote'>) {
  return <blockquote {...props} {...stylex.props(styles.blockquote)} />;
}
/** MDX writes no `style` on these, and an Ultima part's slot takes StyleX styles rather than a DOM one. */
type MdxTableProps<E extends 'table' | 'th' | 'td'> = Omit<ComponentProps<E>, 'style'>;

/** A GFM table has no caption to name a `Table.Scroll` region from, so it takes a Scroll Area. */
function UncaptionedTable(props: MdxTableProps<'table'>) {
  return (
    <ScrollArea.Root style={styles.uncaptionedTable}>
      <ScrollArea.Viewport>
        <ScrollArea.Content>
          <ScrollableTableContext.Provider value={true}>
            <Table.Root {...props} />
          </ScrollableTableContext.Provider>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="horizontal">
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
function Th(props: MdxTableProps<'th'>) {
  return <Table.HeadCell {...props} />;
}
function Td(props: MdxTableProps<'td'>) {
  return <Table.Cell {...props} style={styles.cell} />;
}

const components = {
  h1: H1,
  h2: H2,
  h3: H3,
  p: P,
  ul: Ul,
  ol: Ol,
  li: Li,
  a: TextLink,
  code: Code,
  pre: Pre,
  blockquote: Blockquote,
  table: UncaptionedTable,
  th: Th,
  td: Td,
} satisfies MDXComponents;

export function Prose({
  Content,
  breadcrumb,
}: {
  Content: ComponentType<{ components?: MDXComponents }>;
  breadcrumb: Crumb[];
}) {
  return <DocumentLayout breadcrumb={breadcrumb}><div {...stylex.props(styles.root)}><Content components={components} /></div></DocumentLayout>;
}
