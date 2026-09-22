'use client';

import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Code, ScrollArea, Separator, Table } from '@ultima/ui';

const styles = stylex.create({
  h1: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-8'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    marginBlock: 0,
    marginBottom: space['--ult-space-5'],
  },
  h2: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    marginBottom: space['--ult-space-4'],
    marginTop: space['--ult-space-7'],
  },
  h3: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-snug'],
    marginBottom: space['--ult-space-3'],
    marginTop: space['--ult-space-6'],
  },
  p: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    marginBlock: space['--ult-space-4'],
  },
  list: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    marginBlock: space['--ult-space-4'],
    paddingInlineStart: space['--ult-space-6'],
  },
  li: {
    marginBlock: space['--ult-space-2'],
  },
  a: {
    color: color['--ult-color-highlight-text'],
    textDecoration: 'underline',
    textUnderlineOffset: space['--ult-space-2'],
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  blockquote: {
    borderInlineStartColor: color['--ult-color-border'],
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: space['--ult-space-1'],
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    marginBlock: space['--ult-space-5'],
    marginInline: 0,
    paddingInlineStart: space['--ult-space-5'],
  },
  rule: {
    marginBlock: space['--ult-space-6'],
  },
  scroll: {
    marginBlock: space['--ult-space-5'],
  },
});

export default function TypographyRecipe() {
  return (
    <article>
      <h1 {...stylex.props(styles.h1)}>The prose mapping</h1>
      <p {...stylex.props(styles.p)}>
        Long-form text maps each element to a token style or an Ultima component. Inline code like{' '}
        <Code>pnpm test</Code> and links like <a href="#typography" {...stylex.props(styles.a)}>the
        component catalogue</a> keep the surrounding rhythm.
      </p>
      <h2 {...stylex.props(styles.h2)}>Headings and lists</h2>
      <p {...stylex.props(styles.p)}>Headings step down the type scale; lists share the body size.</p>
      <ul {...stylex.props(styles.list)}>
        <li {...stylex.props(styles.li)}>Tokens for every raw value</li>
        <li {...stylex.props(styles.li)}>One styling engine</li>
      </ul>
      <ol {...stylex.props(styles.list)}>
        <li {...stylex.props(styles.li)}>Install the dependencies</li>
        <li {...stylex.props(styles.li)}>Copy the mapping</li>
      </ol>
      <h3 {...stylex.props(styles.h3)}>Quoted text</h3>
      <blockquote {...stylex.props(styles.blockquote)}>
        A literal in component code is a bug, not a shortcut.
      </blockquote>
      <h3 {...stylex.props(styles.h3)}>Code blocks</h3>
      <Code variant="block">
        {'npx shadcn add @ultima/code @ultima/separator @ultima/table @ultima/scroll-area'}
      </Code>
      <Separator style={styles.rule} />
      <h3 {...stylex.props(styles.h3)}>Tables</h3>
      <ScrollArea.Root style={styles.scroll}>
        <ScrollArea.Viewport>
          <ScrollArea.Content>
            <Table.Root>
              <Table.Head>
                <Table.Row>
                  <Table.HeadCell>Element</Table.HeadCell>
                  <Table.HeadCell>Maps to</Table.HeadCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>code, pre</Table.Cell>
                  <Table.Cell>Code, inline and block</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>hr</Table.Cell>
                  <Table.Cell>Separator</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>table, th, td</Table.Cell>
                  <Table.Cell>Table inside ScrollArea</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="horizontal">
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </article>
  );
}
