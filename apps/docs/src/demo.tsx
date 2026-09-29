import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Card, Tabs } from '@ultima/ui';
import { useState, type ComponentType } from 'react';

import { breakpoints } from './breakpoints.stylex';
import { CopyButton } from './copy-button';
import { docsStyles } from './docs-style';
import { HighlightedCode } from './highlighted-code';

const styles = stylex.create({
  figure: {
    borderRadius: 0,
    marginBlock: space['--ult-space-6'],
    marginInline: 0,
    minInlineSize: 0,
    overflow: 'hidden',
  },
  toolbar: { position: 'relative' },
  tabs: {
    paddingInlineStart: space['--ult-space-6'],
    paddingInlineEnd: space['--ult-space-11'],
  },
  tab: { paddingBlock: space['--ult-space-5'] },
  preview: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    minBlockSize: { default: '8rem', [breakpoints.WIDE]: '11rem' },
    overflowX: 'auto',
    padding: {
      default: space['--ult-space-6'],
      [breakpoints.WIDE]: space['--ult-space-9'],
    },
    ':is([hidden])': { display: 'none' },
  },
  previewInner: { minInlineSize: 'fit-content' },
  code: { padding: 0, position: 'relative' },
  source: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    padding: space['--ult-space-8'],
  },
  copy: {
    position: 'absolute',
    insetBlockStart: space['--ult-space-4'],
    insetInlineEnd: space['--ult-space-4'],
  },
});

export function Demo({
  component: Component,
  source,
  lang = 'tsx',
}: {
  component: ComponentType;
  source: string;
  lang?: string;
}) {
  const [tab, setTab] = useState<string | number>('preview');
  return (
    <Card.Root render={<figure />} style={styles.figure}>
      <Tabs.Root value={tab} onValueChange={setTab}>
        <div {...stylex.props(styles.toolbar)}>
          <Tabs.List aria-label="Example view" style={styles.tabs}>
            <Tabs.Tab value="preview" style={[docsStyles.square, styles.tab]}>
              Preview
            </Tabs.Tab>
            <Tabs.Tab value="code" style={[docsStyles.square, styles.tab]}>
              Code
            </Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
          <div {...stylex.props(styles.copy)}>
            <CopyButton text={source} ariaLabel="Copy example source" />
          </div>
        </div>
        <Tabs.Panel value="preview" keepMounted style={styles.preview}>
          <div data-component-preview {...stylex.props(styles.previewInner)}>
            <Component />
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="code" style={styles.code}>
          <HighlightedCode code={source} lang={lang} style={styles.source} />
        </Tabs.Panel>
      </Tabs.Root>
    </Card.Root>
  );
}
