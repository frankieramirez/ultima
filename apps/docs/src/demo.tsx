import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card, Separator, Tabs } from '@ultima/ui';
import { useState, type ComponentType, type ReactNode } from 'react';

import { breakpoints } from './breakpoints.stylex';
import { CopyButton } from './copy-button';
import { HighlightedCode } from './highlighted-code';
import { ThemeBoundary } from './theme-boundary';

const styles = stylex.create({
  figure: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    display: 'flex',
    flexDirection: 'column',
    marginBlock: space['--ult-space-6'],
    marginInline: 0,
    minInlineSize: 0,
    overflow: 'hidden',
  },
  plate: { blockSize: '100%', marginBlock: 0 },
  views: { display: 'flex', flexDirection: 'column', flexGrow: 1 },
  head: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
    justifyContent: 'space-between',
    paddingBlock: { default: space['--ult-space-4'], [breakpoints.WIDE]: space['--ult-space-5'] },
    paddingInlineStart: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-6'] },
    paddingInlineEnd: { default: space['--ult-space-4'], [breakpoints.WIDE]: space['--ult-space-5'] },
  },
  title: {
    alignItems: 'baseline',
    display: 'flex',
    gap: space['--ult-space-4'],
    minInlineSize: 0,
  },
  number: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
  },
  heading: {
    color: color['--ult-color-text'],
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  actions: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    gap: space['--ult-space-3'],
    marginInlineStart: 'auto',
  },
  tab: { fontSize: text['--ult-text-2'] },
  preview: {
    alignItems: 'center',
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'center',
    minBlockSize: { default: '7.5rem', [breakpoints.WIDE]: '11.25rem' },
    overflowX: 'auto',
    padding: {
      default: space['--ult-space-6'],
      [breakpoints.WIDE]: space['--ult-space-9'],
    },
    ':is([hidden])': { display: 'none' },
  },
  previewInner: { minInlineSize: 'fit-content' },
  code: { padding: 0 },
  source: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    padding: space['--ult-space-8'],
  },
  caption: {
    color: color['--ult-color-text-muted'],
    display: 'flex',
    flexDirection: 'column',
    fontSize: { default: text['--ult-text-3'], [breakpoints.WIDE]: text['--ult-text-4'] },
    gap: space['--ult-space-4'],
    lineHeight: font['--ult-font-leading-normal'],
    paddingBlock: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-5'] },
    paddingInline: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-6'] },
  },
});

export function Demo({
  component: Component,
  source,
  lang = 'tsx',
  title,
  titleId,
  number,
  caption,
  plate = false,
}: {
  component: ComponentType;
  source: string;
  lang?: string;
  title?: ReactNode;
  titleId?: string;
  number?: string;
  caption?: ReactNode;
  plate?: boolean;
}) {
  const [tab, setTab] = useState<string | number>('preview');
  return (
    <Card.Root render={<figure />} style={[styles.figure, plate && styles.plate]}>
      <Tabs.Root value={tab} onValueChange={setTab} variant="segmented" style={styles.views}>
        <div {...stylex.props(styles.head)}>
          {title != null && (
            <div {...stylex.props(styles.title)}>
              {number && (
                <span aria-hidden {...stylex.props(styles.number)}>
                  {number}
                </span>
              )}
              <h3 id={titleId} {...stylex.props(styles.heading)}>
                {title}
              </h3>
            </div>
          )}
          <div {...stylex.props(styles.actions)}>
            <Tabs.List aria-label="Example view">
              <Tabs.Tab value="preview" style={styles.tab}>
                Preview
              </Tabs.Tab>
              <Tabs.Tab value="code" style={styles.tab}>
                Code
              </Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>
            <CopyButton text={source} ariaLabel="Copy example source" />
          </div>
        </div>
        <Separator />
        <Tabs.Panel value="preview" keepMounted style={styles.preview}>
          <ThemeBoundary data-component-preview style={styles.previewInner}>
            <Component />
          </ThemeBoundary>
        </Tabs.Panel>
        <Tabs.Panel value="code" style={styles.code}>
          <HighlightedCode code={source} lang={lang} style={styles.source} />
        </Tabs.Panel>
      </Tabs.Root>
      {caption != null && (
        <>
          <Separator />
          <figcaption {...stylex.props(styles.caption)}>{caption}</figcaption>
        </>
      )}
    </Card.Root>
  );
}
