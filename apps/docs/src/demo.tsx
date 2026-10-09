import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Card, Separator, Tabs } from '@ultima/ui';
import { useState, type ComponentType, type ReactNode } from 'react';

import { AnatomyPanel } from './anatomy-panel';
import { breakpoints } from './breakpoints.stylex';
import { CopyButton } from './copy-button';
import { HighlightedCode } from './highlighted-code';
import { ThemeBoundary } from './theme-boundary';
import type { CopyBundle } from './generated/recipes';

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
  fill: { inlineSize: '100%', minInlineSize: 0 },
  code: { padding: 0 },
  source: { backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0 },
  files: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    overflowX: 'auto',
    padding: space['--ult-space-4'],
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
  anatomy,
  fill = false,
}: {
  component: ComponentType;
  source: string | CopyBundle;
  lang?: string;
  title?: ReactNode;
  titleId?: string;
  number?: string;
  caption?: ReactNode;
  plate?: boolean;
  /** The item whose parts a third tab labels, and the module it renders: an overlay's open `anatomy.tsx`, or this demo. */
  anatomy?: { item: string; component: ComponentType };
  /** The preview takes the panel's full width, for a framed screen that scales to fit. */
  fill?: boolean;
}) {
  const [tab, setTab] = useState<string | number>('preview');
  const [fileIndex, setFileIndex] = useState(0);
  const bundle = typeof source === 'string' ? undefined : source;
  const file = bundle?.files[fileIndex] ?? bundle?.files[0];
  const code = typeof source === 'string' ? source : file?.content ?? '';
  const download = file ? `data:text/plain;charset=utf-8,${encodeURIComponent(code)}` : undefined;
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
              {anatomy && (
                <Tabs.Tab value="anatomy" style={styles.tab}>
                  Anatomy
                </Tabs.Tab>
              )}
              <Tabs.Indicator />
            </Tabs.List>
            <CopyButton text={code} ariaLabel="Copy example source" />
            {file && (
              <Button render={<a href={download} download={file.path.split('/').at(-1)} />} nativeButton={false} size="sm" variant="ghost">
                Download source
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <Tabs.Panel value="preview" keepMounted style={styles.preview}>
          <ThemeBoundary data-component-preview style={[styles.previewInner, fill && styles.fill]}>
            <Component />
          </ThemeBoundary>
        </Tabs.Panel>
        <Tabs.Panel value="code" style={styles.code}>
          {bundle && (
            <div {...stylex.props(styles.files)}>
              <p>Save each file at its shown path. Substitute the aliases from your components.json.</p>
              {bundle.files.length > 1 && (
                <Tabs.Root value={fileIndex} onValueChange={(value) => setFileIndex(Number(value))}>
                  <Tabs.List aria-label="Source file">
                    {bundle.files.map((entry, index) => <Tabs.Tab key={entry.path} value={index}>{entry.path}</Tabs.Tab>)}
                    <Tabs.Indicator />
                  </Tabs.List>
                </Tabs.Root>
              )}
              <code>{file?.path}</code>
            </div>
          )}
          <HighlightedCode code={code} lang={lang} lineNumbers style={styles.source} />
        </Tabs.Panel>
        {anatomy && (
          <Tabs.Panel value="anatomy">
            <AnatomyPanel item={anatomy.item} component={anatomy.component} />
          </Tabs.Panel>
        )}
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
