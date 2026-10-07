import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  DesktopIcon,
  DeviceMobileIcon,
  FileIcon,
  FolderSimpleIcon,
  GithubLogoIcon,
} from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card, Separator, Tabs, ToggleGroup } from '@ultima/ui';
import { useEffect, useState, type ReactNode } from 'react';

import { BlockAnatomy } from './block-anatomy';
import { BlockFrame, PREVIEW_SIZES, type PreviewSize } from './block-frame';
import { breakpoints } from './breakpoints.stylex';
import { CopyButton } from './copy-button';
import { DocumentLayout } from './document-layout';
import { blocks, type BlockEntry } from './generated/blocks';
import { HighlightedCode } from './highlighted-code';
import { LandingCommand } from './landing-command';
import { componentCount } from './routes/blocks';
import { TextLink } from './text-link';

const HEADING_FONT = 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif';
const SOURCE_ROOT = 'https://github.com/frankieramirez/ultima/tree/main/packages/blocks/src';
const BLOCK_SOURCES = '../../../packages/blocks/src';

const sources = import.meta.glob<string>(['../../../packages/blocks/src/*/*.tsx', '!../../../packages/blocks/src/__tests__/**'], {
  query: '?raw',
  import: 'default',
});

const styles = stylex.create({
  runningHead: {
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    fontFamily: font['--ult-font-mono'],
    fontSize: { default: '0.625rem', [breakpoints.WIDE]: text['--ult-text-1'] },
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
    paddingBlockEnd: { default: space['--ult-space-4'], [breakpoints.WIDE]: space['--ult-space-5'] },
    textTransform: 'uppercase',
  },
  packageName: { display: { default: 'none', [breakpoints.WIDE]: 'inline' } },
  titleBlock: {
    alignItems: 'flex-end',
    columnGap: space['--ult-space-11'],
    display: 'flex',
    flexWrap: 'wrap',
    marginBlockStart: { default: space['--ult-space-9'], [breakpoints.WIDE]: space['--ult-space-11'] },
    rowGap: space['--ult-space-7'],
  },
  titleCopy: {
    display: 'flex',
    flexBasis: '20rem',
    flexDirection: 'column',
    flexGrow: 1,
    gap: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-6'] },
  },
  title: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: { default: '3.75rem', [breakpoints.INDEX]: '5rem' },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tightest'],
    lineHeight: 0.95,
    margin: 0,
  },
  lede: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  install: {
    display: 'flex',
    flexBasis: { default: '100%', [breakpoints.WIDE]: '22rem' },
    flexDirection: 'column',
    flexGrow: { default: 1, [breakpoints.WIDE]: 0 },
    gap: space['--ult-space-5'],
    minInlineSize: 0,
  },
  links: { display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-7'] },
  link: { fontSize: text['--ult-text-3'], gap: space['--ult-space-3'] },
  figure: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginBlock: { default: space['--ult-space-9'], [breakpoints.WIDE]: space['--ult-space-10'] },
    marginInline: 0,
    minInlineSize: 0,
    overflow: 'hidden',
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-5'],
  },
  tab: { fontSize: text['--ult-text-2'] },
  size: { color: color['--ult-color-text-subtle'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'] },
  theme: {
    color: color['--ult-color-text-muted'],
    display: { default: 'none', [breakpoints.WIDE]: 'inline' },
    fontSize: text['--ult-text-2'],
    marginInlineStart: 'auto',
  },
  code: { minInlineSize: 0 },
  files: {
    flexWrap: 'nowrap',
    overflowX: 'auto',
    paddingInline: space['--ult-space-5'],
  },
  fileTab: { flexShrink: 0, fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'] },
  source: { position: 'relative' },
  sourceCode: { backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0 },
  loading: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-3'], margin: 0, padding: space['--ult-space-7'] },
  details: {
    display: 'grid',
    gap: { default: space['--ult-space-9'], [breakpoints.WIDE]: space['--ult-space-8'] },
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.WIDE]: 'repeat(3, minmax(0, 1fr))' },
    marginBlockStart: { default: space['--ult-space-9'], [breakpoints.WIDE]: space['--ult-space-11'] },
  },
  detail: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-6'], minInlineSize: 0 },
  sectionHead: { alignItems: 'baseline', display: 'flex', gap: space['--ult-space-4'] },
  sectionNumber: { color: color['--ult-color-text-subtle'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'] },
  h2: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  list: { display: 'flex', flexDirection: 'column', listStyle: 'none', margin: 0, padding: 0 },
  steps: { gap: space['--ult-space-6'] },
  step: { display: 'flex', gap: space['--ult-space-5'] },
  stepNumber: { color: color['--ult-color-text-subtle'], flexShrink: 0, fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'] },
  stepCopy: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-2'], minInlineSize: 0 },
  stepTitle: { color: color['--ult-color-text'], fontSize: text['--ult-text-4'], fontWeight: font['--ult-font-weight-semibold'] },
  stepNote: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    overflowWrap: 'anywhere',
  },
  tree: { fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'], gap: space['--ult-space-4'] },
  treeRow: { alignItems: 'center', display: 'flex', gap: space['--ult-space-4'], minInlineSize: 0 },
  folder: { color: color['--ult-color-text-subtle'] },
  file: { color: color['--ult-color-text'], overflowWrap: 'anywhere' },
  treeIcon: { color: color['--ult-color-text-muted'], flexShrink: 0 },
  nested: { gap: space['--ult-space-4'], marginBlockStart: space['--ult-space-4'], paddingInlineStart: space['--ult-space-6'] },
  ingredient: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
    minBlockSize: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
  },
  ingredientNumber: { color: color['--ult-color-text-subtle'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'] },
  ingredientName: { color: color['--ult-color-text'], fontSize: text['--ult-text-3'], gap: space['--ult-space-3'] },
  ingredientKind: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-2'], marginInlineStart: 'auto' },
  pager: { marginBlockStart: { default: space['--ult-space-11'], [breakpoints.WIDE]: space['--ult-space-12'] } },
  pagerRow: { display: 'flex', flexDirection: { default: 'column', [breakpoints.WIDE]: 'row' } },
  pagerLink: {
    alignItems: 'center',
    color: { default: color['--ult-color-text'], ':hover': color['--ult-color-text'] },
    display: 'flex',
    flexBasis: 0,
    flexGrow: 1,
    gap: space['--ult-space-5'],
    minInlineSize: 0,
    paddingBlock: { default: space['--ult-space-6'], [breakpoints.WIDE]: space['--ult-space-8'] },
    textDecoration: 'none',
  },
  pagerNext: {
    justifyContent: { default: 'space-between', [breakpoints.WIDE]: 'flex-end' },
    textAlign: { default: 'start', [breakpoints.WIDE]: 'end' },
  },
  pagerCopy: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-3'], minInlineSize: 0 },
  pagerLabel: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: { default: '0.65625rem', [breakpoints.WIDE]: text['--ult-text-1'] },
    letterSpacing: font['--ult-font-tracking-wide'],
    textTransform: 'uppercase',
  },
  pagerName: {
    fontFamily: HEADING_FONT,
    fontSize: { default: '1.375rem', [breakpoints.WIDE]: '1.75rem' },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
  },
  pagerArrow: { color: color['--ult-color-text-muted'], flexShrink: 0, fontSize: text['--ult-text-7'] },
  pagerDivider: { display: { default: 'none', [breakpoints.WIDE]: 'block' } },
  pagerRule: { display: { default: 'block', [breakpoints.WIDE]: 'none' } },
});

const plural = (count: number, word: string) => `${count} ${count === 1 ? word : `${word}s`}`;

/** The block's files as `?raw` text, `'failed'` when one cannot load, or `null` while they load. */
function useSources(block: BlockEntry): Record<string, string> | 'failed' | null {
  const [loaded, setLoaded] = useState<Record<string, string> | 'failed' | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all(
      block.files.map(async (file) => {
        const load = sources[`${BLOCK_SOURCES}/${block.id}/${file}`];
        if (!load) throw new Error(`packages/blocks/src/${block.id}/${file} is not a block source`);
        return [file, await load()] as const;
      }),
    ).then(
      (entries) => {
        if (live) setLoaded(Object.fromEntries(entries));
      },
      () => {
        if (live) setLoaded('failed');
      },
    );
    return () => {
      live = false;
    };
  }, [block]);
  return loaded;
}

function SectionHead({ id, value, children }: { id: string; value: string; children: ReactNode }) {
  return (
    <div {...stylex.props(styles.sectionHead)}>
      <span aria-hidden {...stylex.props(styles.sectionNumber)}>
        {value}
      </span>
      <h2 id={id} {...stylex.props(styles.h2)}>
        {children}
      </h2>
    </div>
  );
}

function Code({ block }: { block: BlockEntry }) {
  const loaded = useSources(block);
  const [file, setFile] = useState<string | number>(block.files[0] ?? '');
  if (!loaded) return <p {...stylex.props(styles.loading)}>Loading the source…</p>;
  if (loaded === 'failed') return <p {...stylex.props(styles.loading)}>The source could not be loaded.</p>;
  return (
    <Tabs.Root value={file} onValueChange={setFile}>
      <Tabs.List aria-label="Files" style={styles.files}>
        {block.files.map((name) => (
          <Tabs.Tab key={name} value={name} style={styles.fileTab}>
            {name}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator />
      </Tabs.List>
      {block.files.map((name) => (
        <Tabs.Panel key={name} value={name} style={styles.source}>
          <CopyButton text={loaded[name] ?? ''} ariaLabel={`Copy ${name}`} floating />
          <HighlightedCode code={loaded[name] ?? ''} lang="tsx" lineNumbers style={styles.sourceCode} />
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

function Preview({ block }: { block: BlockEntry }) {
  const [view, setView] = useState<string | number>('preview');
  const [size, setSize] = useState<PreviewSize>('desktop');
  const { width, height } = PREVIEW_SIZES[size];
  return (
    <Card.Root render={<figure aria-label={`${block.title} preview`} />} style={styles.figure}>
      <Tabs.Root value={view} onValueChange={setView} variant="segmented">
        <div {...stylex.props(styles.toolbar)}>
          <Tabs.List aria-label="Block view">
            <Tabs.Tab value="preview" style={styles.tab}>
              Preview
            </Tabs.Tab>
            <Tabs.Tab value="anatomy" style={styles.tab}>
              Anatomy
            </Tabs.Tab>
            <Tabs.Tab value="code" style={styles.tab}>
              Code
            </Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
          <ToggleGroup.Root
            aria-label="Preview width"
            value={[size]}
            onValueChange={(next: PreviewSize[]) => {
              if (next[0]) setSize(next[0]);
            }}
          >
            <ToggleGroup.Item value="desktop" aria-label="Desktop">
              <DesktopIcon aria-hidden />
            </ToggleGroup.Item>
            <ToggleGroup.Item value="narrow" aria-label="Narrow">
              <DeviceMobileIcon aria-hidden />
            </ToggleGroup.Item>
          </ToggleGroup.Root>
          <span {...stylex.props(styles.size)}>
            {width} × {height}
          </span>
          <span {...stylex.props(styles.theme)}>Neutral</span>
        </div>
        <Separator />
        <Tabs.Panel value="preview" keepMounted>
          <BlockFrame block={block} size={size} />
        </Tabs.Panel>
        <Tabs.Panel value="anatomy">
          <BlockAnatomy block={block} size={size} />
        </Tabs.Panel>
        <Tabs.Panel value="code" style={styles.code}>
          <Code block={block} />
        </Tabs.Panel>
      </Tabs.Root>
    </Card.Root>
  );
}

function Details({ block }: { block: BlockEntry }) {
  const components = componentCount(block);
  return (
    <div {...stylex.props(styles.details)}>
      <section aria-labelledby="install" {...stylex.props(styles.detail)}>
        <SectionHead id="install" value="01">
          Install it
        </SectionHead>
        <ol {...stylex.props(styles.list, styles.steps)}>
          <li {...stylex.props(styles.step)}>
            <span aria-hidden {...stylex.props(styles.stepNumber)}>
              1
            </span>
            <div {...stylex.props(styles.stepCopy)}>
              <span {...stylex.props(styles.stepTitle)}>Add the block</span>
              <p {...stylex.props(styles.stepNote)}>
                {block.install} writes {plural(block.files.length, 'file')} under components/{block.id}/ and adds the{' '}
                {plural(components, 'component')} it is built from.
              </p>
            </div>
          </li>
          <li {...stylex.props(styles.step)}>
            <span aria-hidden {...stylex.props(styles.stepNumber)}>
              2
            </span>
            <div {...stylex.props(styles.stepCopy)}>
              <span {...stylex.props(styles.stepTitle)}>Render it</span>
              <p {...stylex.props(styles.stepNote)}>{block.installDocs}</p>
            </div>
          </li>
        </ol>
      </section>
      <section aria-labelledby="files" {...stylex.props(styles.detail)}>
        <SectionHead id="files" value="02">
          Files
        </SectionHead>
        <ul {...stylex.props(styles.list, styles.tree)}>
          <li>
            <span {...stylex.props(styles.treeRow, styles.folder)}>
              <FolderSimpleIcon aria-hidden {...stylex.props(styles.treeIcon)} />
              components/{block.id}/
            </span>
            <ul {...stylex.props(styles.list, styles.nested)}>
              {block.files.map((file) => (
                <li key={file} {...stylex.props(styles.treeRow, styles.file)}>
                  <FileIcon aria-hidden {...stylex.props(styles.treeIcon)} />
                  {file}
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </section>
      <section aria-labelledby="built-from" {...stylex.props(styles.detail)}>
        <SectionHead id="built-from" value="03">
          Built from
        </SectionHead>
        <ul {...stylex.props(styles.list)}>
          {block.builtFrom.map((entry) => (
            <li key={`${entry.kind}-${entry.id}`}>
              <div {...stylex.props(styles.ingredient)}>
                <span {...stylex.props(styles.ingredientNumber)}>{entry.number}</span>
                {entry.kind === 'component' ? (
                  <TextLink
                    variant="muted"
                    render={<Link to="/components/$name" params={{ name: entry.id }} />}
                    style={styles.ingredientName}
                  >
                    {entry.title}
                    <ArrowUpRightIcon aria-hidden />
                  </TextLink>
                ) : (
                  <>
                    <span {...stylex.props(styles.ingredientName)}>{entry.title}</span>
                    <span {...stylex.props(styles.ingredientKind)}>Recipe</span>
                  </>
                )}
              </div>
              <Separator />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Pager({ block }: { block: BlockEntry }) {
  const next = blocks[blocks.indexOf(block) + 1];
  return (
    <nav aria-label="All blocks" {...stylex.props(styles.pager)}>
      <Separator />
      <div {...stylex.props(styles.pagerRow)}>
        <TextLink variant="muted" render={<Link to="/blocks" />} style={styles.pagerLink}>
          <ArrowLeftIcon aria-hidden {...stylex.props(styles.pagerArrow)} />
          <span {...stylex.props(styles.pagerCopy)}>
            <span {...stylex.props(styles.pagerLabel)}>All blocks</span>
            <span {...stylex.props(styles.pagerName)}>Back to Blocks</span>
          </span>
        </TextLink>
        {next && (
          <>
            <Separator orientation="vertical" style={styles.pagerDivider} />
            <Separator style={styles.pagerRule} />
            <TextLink variant="muted" render={<Link to="/blocks/$id" params={{ id: next.id }} />} style={[styles.pagerLink, styles.pagerNext]}>
              <span {...stylex.props(styles.pagerCopy)}>
                <span {...stylex.props(styles.pagerLabel)}>Next · {next.number}</span>
                <span {...stylex.props(styles.pagerName)}>{next.title}</span>
              </span>
              <ArrowRightIcon aria-hidden {...stylex.props(styles.pagerArrow)} />
            </TextLink>
          </>
        )}
      </div>
      <Separator />
    </nav>
  );
}

export function BlockPage({ block }: { block: BlockEntry }) {
  return (
    <DocumentLayout breadcrumb={[{ label: 'Blocks', to: '/blocks' }, { label: block.title }]} index={false}>
      <p {...stylex.props(styles.runningHead)}>
        <span>Block {block.number}</span>
        <span {...stylex.props(styles.packageName)}>@ultima/{block.id}</span>
        <span>
          {plural(componentCount(block), 'component')} · {plural(block.files.length, 'file')}
        </span>
      </p>
      <Separator />
      <div {...stylex.props(styles.titleBlock)}>
        <div {...stylex.props(styles.titleCopy)}>
          <h1 {...stylex.props(styles.title)}>{block.title}</h1>
          <p {...stylex.props(styles.lede)}>{block.description}</p>
        </div>
        <div {...stylex.props(styles.install)}>
          <LandingCommand commands={[block.install]} label="Copy install command" />
          <div {...stylex.props(styles.links)}>
            <TextLink variant="muted" href={`${SOURCE_ROOT}/${block.id}`} style={styles.link}>
              <GithubLogoIcon aria-hidden />
              View source
            </TextLink>
            <TextLink variant="muted" href={`/blocks/${block.id}/preview`} target="_blank" style={styles.link}>
              <ArrowUpRightIcon aria-hidden />
              Open in a new tab
            </TextLink>
          </div>
        </div>
      </div>
      <Preview block={block} />
      <Details block={block} />
      <Pager block={block} />
    </DocumentLayout>
  );
}
