import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  CopyIcon,
  GithubLogoIcon,
  SidebarSimpleIcon,
} from '@phosphor-icons/react';
import { Link, useLocation } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Breadcrumb, Button, Card, DropdownMenu, Separator, Tabs } from '@ultima/ui';
import type { MDXComponents } from 'mdx/types';
import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';

import { breakpoints } from './breakpoints.stylex';
import { components, type ComponentEntry } from './components';
import { anatomyTabs } from './generated/anatomy-tabs';
import { CopyButton } from './copy-button';
import { Demo } from './demo';
import { DocumentLayout } from './document-layout';
import { elements } from './elements';
import { nodeText } from './highlighted-code';
import { proseComponents } from './prose';
import { TextLink } from './text-link';
import { WebComponent } from './web-component';

const HEADING_FONT = 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif';
const SOURCE_ROOT = 'https://github.com/frankieramirez/ultima/blob/main/packages/ui/src';
const LIBRARIES = {
  'base-ui': { name: 'Base UI', docs: (module: string) => `https://base-ui.com/react/components/${module}` },
  zag: { name: 'Zag', docs: (module: string) => `https://zagjs.com/components/react/${module}` },
} as const;
const PACKAGE_MANAGERS = [
  { value: 'npx', runner: 'npx' },
  { value: 'pnpm', runner: 'pnpm dlx' },
  { value: 'bun', runner: 'bunx' },
] as const;

const styles = stylex.create({
  root: { minInlineSize: 0 },
  bleedBar: {
    alignItems: 'center',
    display: { default: 'flex', [breakpoints.WIDE]: 'none' },
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
    marginBlockStart: `calc(-1 * ${space['--ult-space-12']})`,
    marginInline: `calc(-1 * ${space['--ult-space-6']})`,
    minBlockSize: space['--ult-space-11'],
    paddingInlineEnd: space['--ult-space-5'],
    paddingInlineStart: space['--ult-space-7'],
  },
  barRule: {
    display: { default: 'block', [breakpoints.WIDE]: 'none' },
    inlineSize: 'auto',
    marginBlockEnd: space['--ult-space-8'],
    marginInline: `calc(-1 * ${space['--ult-space-6']})`,
  },
  trail: { fontSize: text['--ult-text-3'], minInlineSize: 0 },
  trailMark: { color: color['--ult-color-text-muted'], display: 'inline-flex', fontSize: text['--ult-text-5'] },
  trailLink: { color: { default: color['--ult-color-text-muted'], ':hover': color['--ult-color-text'] } },
  contents: { flexShrink: 0, fontSize: text['--ult-text-3'], gap: space['--ult-space-2'] },
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
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: space['--ult-space-11'],
    rowGap: space['--ult-space-7'],
    marginBlockStart: { default: space['--ult-space-9'], [breakpoints.WIDE]: space['--ult-space-11'] },
  },
  titleCopy: {
    display: 'flex',
    flexBasis: 0,
    flexDirection: 'column',
    flexGrow: 1,
    gap: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-6'] },
  },
  title: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: { default: '3.75rem', [breakpoints.INDEX]: '6rem' },
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
    maxInlineSize: '32.5rem',
  },
  meta: {
    flexBasis: { default: '100%', [breakpoints.WIDE]: '18.75rem' },
    flexGrow: 0,
    flexShrink: 0,
  },
  metaRow: {
    alignItems: 'center',
    margin: 0,
    display: 'flex',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    minBlockSize: space['--ult-space-11'],
  },
  metaLabel: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: '0.65625rem',
    letterSpacing: font['--ult-font-tracking-wide'],
    textTransform: 'uppercase',
  },
  metaValue: {
    color: { default: color['--ult-color-text'], ':hover': color['--ult-color-text'] },
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-3'],
  },
  metaCell: { margin: 0 },
  mono: { fontFamily: font['--ult-font-mono'] },
  metaIcon: { color: color['--ult-color-text-subtle'] },
  install: {
    marginBlockStart: { default: space['--ult-space-7'], [breakpoints.WIDE]: space['--ult-space-9'] },
    overflow: 'hidden',
  },
  installRow: {
    alignItems: { default: 'stretch', [breakpoints.WIDE]: 'center' },
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.WIDE]: 'row' },
    gap: { default: 0, [breakpoints.WIDE]: space['--ult-space-5'] },
    paddingBlock: { default: 0, [breakpoints.WIDE]: space['--ult-space-5'] },
    paddingInline: { default: 0, [breakpoints.WIDE]: space['--ult-space-6'] },
  },
  installTabs: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    paddingBlock: { default: space['--ult-space-3'], [breakpoints.WIDE]: 0 },
    paddingInline: { default: space['--ult-space-4'], [breakpoints.WIDE]: 0 },
  },
  manager: { fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'] },
  installRule: { display: { default: 'block', [breakpoints.WIDE]: 'none' } },
  installDivider: { alignSelf: 'stretch', display: { default: 'none', [breakpoints.WIDE]: 'block' } },
  installPanel: {
    flexGrow: 1,
    minInlineSize: 0,
    paddingBlockEnd: { default: space['--ult-space-5'], [breakpoints.WIDE]: 0 },
    paddingBlockStart: { default: space['--ult-space-5'], [breakpoints.WIDE]: 0 },
    paddingInline: { default: space['--ult-space-6'], [breakpoints.WIDE]: 0 },
  },
  command: {
    color: color['--ult-color-text'],
    display: 'block',
    fontFamily: font['--ult-font-mono'],
    fontSize: { default: text['--ult-text-3'], [breakpoints.WIDE]: text['--ult-text-4'] },
    overflowWrap: 'anywhere',
  },
  copyWide: { display: { default: 'none', [breakpoints.WIDE]: 'inline-flex' } },
  copyNarrow: { display: { default: 'inline-flex', [breakpoints.WIDE]: 'none' } },
  copyLabel: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-regular'],
    gap: space['--ult-space-3'],
  },
  introduction: { marginBlockStart: { default: space['--ult-space-6'], [breakpoints.WIDE]: space['--ult-space-7'] } },
  installNote: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    marginBlock: space['--ult-space-5'],
  },
  sectionHead: {
    alignItems: 'flex-end',
    columnGap: space['--ult-space-9'],
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBlockStart: { default: space['--ult-space-12'], [breakpoints.WIDE]: `calc(${space['--ult-space-12']} + ${space['--ult-space-6']})` },
    paddingBlockEnd: { default: space['--ult-space-6'], [breakpoints.WIDE]: space['--ult-space-7'] },
    rowGap: space['--ult-space-4'],
  },
  sectionTitle: {
    alignItems: 'baseline',
    display: 'flex',
    gap: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-6'] },
  },
  sectionNumber: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    whiteSpace: 'nowrap',
  },
  h2: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: { default: text['--ult-text-9'], [breakpoints.WIDE]: text['--ult-text-10'] },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tighter'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  sectionNote: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    maxInlineSize: '21.25rem',
  },
  plates: {
    display: 'grid',
    gap: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-7'] },
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.INDEX]: 'repeat(2, minmax(0, 1fr))' },
    marginBlock: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-7'] },
  },
  fullRow: { gridColumn: '1 / -1' },
  folded: { display: { default: 'none', [breakpoints.WIDE]: 'block' } },
  more: {
    display: { default: 'inline-flex', [breakpoints.WIDE]: 'none' },
    inlineSize: '100%',
    marginBlockStart: space['--ult-space-5'],
  },
  example: { marginBlockStart: { default: space['--ult-space-9'], [breakpoints.WIDE]: space['--ult-space-11'] } },
  exampleHead: {
    alignItems: 'baseline',
    display: 'flex',
    gap: space['--ult-space-4'],
  },
  exampleNumber: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
  },
  h3: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  h4: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-snug'],
    marginBlockEnd: space['--ult-space-4'],
    marginBlockStart: space['--ult-space-8'],
  },
  notes: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.WIDE]: 'repeat(auto-fill, minmax(min(100%, 15rem), 1fr))' },
    columnGap: space['--ult-space-9'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  note: {
    display: 'flex',
    flexDirection: 'column',
    gap: { default: space['--ult-space-4'], [breakpoints.WIDE]: space['--ult-space-5'] },
    paddingBlock: space['--ult-space-6'],
    paddingBlockStart: { default: space['--ult-space-6'], [breakpoints.WIDE]: space['--ult-space-7'] },
  },
  noteTitle: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: { default: '1.0625rem', [breakpoints.WIDE]: text['--ult-text-6'] },
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  noteBody: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  propTable: { display: { default: 'none', [breakpoints.WIDE]: 'block' } },
  propList: {
    display: { default: 'flex', [breakpoints.WIDE]: 'none' },
    flexDirection: 'column',
    listStyle: 'none',
    marginBlock: space['--ult-space-6'],
    padding: 0,
  },
  propEntry: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    paddingBlockStart: space['--ult-space-6'],
  },
  propTop: {
    alignItems: 'baseline',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
  },
  propName: { color: color['--ult-color-text'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-4'] },
  propDefault: { alignItems: 'baseline', display: 'inline-flex', gap: space['--ult-space-3'] },
  propLabel: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: '0.65625rem',
  },
  webComponent: { marginBlockStart: { default: space['--ult-space-11'], [breakpoints.WIDE]: space['--ult-space-12'] } },
  pager: { marginBlockStart: { default: space['--ult-space-9'], [breakpoints.WIDE]: space['--ult-space-12'] } },
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
  pagerPrevious: { paddingInlineEnd: { default: 0, [breakpoints.WIDE]: space['--ult-space-8'] } },
  pagerNext: {
    justifyContent: { default: 'space-between', [breakpoints.WIDE]: 'flex-end' },
    paddingInlineStart: { default: 0, [breakpoints.WIDE]: space['--ult-space-8'] },
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
  pagerArrow: { color: color['--ult-color-text-muted'], flexShrink: 0, fontSize: { default: text['--ult-text-6'], [breakpoints.WIDE]: text['--ult-text-7'] } },
  pagerDivider: { display: { default: 'none', [breakpoints.WIDE]: 'block' } },
  pagerRule: { display: { default: 'block', [breakpoints.WIDE]: 'none' } },
});

type MdxContent = ComponentType<{ components?: MDXComponents }>;
type Block = ReactElement<{ children?: ReactNode }>;
type Section = { heading: Block; label: string; id: string; blocks: Block[] };

const { h1: H1, h2: H2, h3: H3, p: P, ul: Ul, li: Li, pre: Pre, table: Table } = proseComponents;

function slug(label: string) {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'section'
  );
}

/**
 * The page's top-level blocks in document order. MDX content compiles to a function returning one
 * fragment of them and calls no hooks, so reading it here is the same render the page would do.
 */
function blocksOf(Content: MdxContent): Block[] {
  const tree = (Content as (props: { components?: MDXComponents }) => Block)({ components: proseComponents });
  return Children.toArray(tree.props.children).filter((node): node is Block => isValidElement(node));
}

function sectionsOf(blocks: Block[]): { intro: Block[]; sections: Section[] } {
  const intro: Block[] = [];
  const sections: Section[] = [];
  const used = new Set<string>();
  for (const block of blocks) {
    if (block.type === H2) {
      const label = nodeText(block.props.children).trim();
      let id = slug(label);
      for (let suffix = 2; used.has(id); suffix++) id = `${slug(label)}-${suffix}`;
      used.add(id);
      sections.push({ heading: block, label, id, blocks: [] });
    } else (sections.at(-1)?.blocks ?? intro).push(block);
  }
  return { intro, sections };
}

const MAX_PLATE_CAPTION_PARAGRAPHS = 2;
const INSTALL = 'Install';
const PROPS = 'Props';
const PROP_LIST_COLUMNS = ['Prop', 'Type', 'Notes'];

const number = (value: number) => String(value).padStart(2, '0');

function primitiveName({ library, module }: NonNullable<ComponentEntry['primitive']>) {
  const name = module
    .split('-')
    .map((word) => (word === 'otp' ? 'OTP' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
  return { library: LIBRARIES[library].name, name, href: LIBRARIES[library].docs(module) };
}

type Entry = { id: string; label: string };

function DocsBar({ entry, sections }: { entry: ComponentEntry; sections: Entry[] }) {
  return (
    <>
      <div {...stylex.props(styles.bleedBar)}>
        <Breadcrumb.Root style={styles.trail}>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <span aria-hidden {...stylex.props(styles.trailMark)}>
                <SidebarSimpleIcon />
              </span>
              <Breadcrumb.Link style={styles.trailLink} render={<Link to="/components" />}>
                Components
              </Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator>/</Breadcrumb.Separator>
            <Breadcrumb.Item>
              <Breadcrumb.Link active render={<Link to="/components/$name" params={{ name: entry.item }} />}>
                {entry.name}
              </Breadcrumb.Link>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" style={styles.contents} />}>
            On this page
            <CaretDownIcon aria-hidden />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Positioner align="end" sideOffset={4}>
              <DropdownMenu.Popup>
                {sections.map((section) => (
                  <DropdownMenu.LinkItem key={section.id} href={`#${section.id}`}>
                    {section.label}
                  </DropdownMenu.LinkItem>
                ))}
              </DropdownMenu.Popup>
            </DropdownMenu.Positioner>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <Separator style={styles.barRule} />
    </>
  );
}

function TitleBlock({ entry, title, lede }: { entry: ComponentEntry; title: ReactNode; lede: ReactNode }) {
  const primitive = entry.primitive && primitiveName(entry.primitive);
  const element = elements.find((candidate) => candidate.item === entry.item);
  const rows = [
    {
      label: 'Source',
      value: (
        <TextLink variant="muted" href={`${SOURCE_ROOT}/${entry.item}.tsx`} style={[styles.metaValue, styles.mono]}>
          {entry.item}.tsx
          <GithubLogoIcon aria-hidden {...stylex.props(styles.metaIcon)} />
        </TextLink>
      ),
    },
    primitive && {
      label: 'Primitive',
      value: (
        <TextLink variant="muted" href={primitive.href} style={styles.metaValue}>
          {primitive.library} {primitive.name}
          <ArrowUpRightIcon aria-hidden {...stylex.props(styles.metaIcon)} />
        </TextLink>
      ),
    },
    element && {
      label: 'HTML element',
      value: (
        <TextLink variant="muted" href="#web-component" style={[styles.metaValue, styles.mono]}>
          {`<${element.tag}>`}
          <ArrowUpRightIcon aria-hidden {...stylex.props(styles.metaIcon)} />
        </TextLink>
      ),
    },
  ].filter((row) => !!row);
  return (
    <>
      <p {...stylex.props(styles.runningHead)}>
        <span>Plate {entry.number}</span>
        <span {...stylex.props(styles.packageName)}>@ultima/{entry.item}</span>
        {primitive && (
          <span>
            {primitive.library} · {primitive.name}
          </span>
        )}
      </p>
      <Separator />
      <div {...stylex.props(styles.titleBlock)}>
        <div {...stylex.props(styles.titleCopy)}>
          <h1 {...stylex.props(styles.title)}>{title}</h1>
          <p {...stylex.props(styles.lede)}>{lede}</p>
        </div>
        <div {...stylex.props(styles.meta)}>
          <Separator />
          {rows.map((row) => (
            <Fragment key={row.label}>
              <dl {...stylex.props(styles.metaRow)}>
                <dt {...stylex.props(styles.metaLabel)}>{row.label}</dt>
                <dd {...stylex.props(styles.metaCell)}>{row.value}</dd>
              </dl>
              <Separator />
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

function InstallCommand({ command }: { command: string }) {
  const [manager, setManager] = useState<string | number>(PACKAGE_MANAGERS[0].value);
  const commands = Object.fromEntries(
    PACKAGE_MANAGERS.map(({ value, runner }) => [value, command.replace(/^npx /gm, `${runner} `)]),
  );
  const current = commands[manager] ?? command;
  const copy = (wide: boolean) =>
    wide ? (
      <CopyButton text={current} ariaLabel="Copy install command" style={[styles.copyWide, styles.copyLabel]}>
        {(status) => (
          <>
            <CopyIcon aria-hidden />
            {status || 'Copy'}
          </>
        )}
      </CopyButton>
    ) : (
      <CopyButton text={current} ariaLabel="Copy install command" style={styles.copyNarrow} />
    );
  return (
    <Card.Root style={styles.install}>
      <Tabs.Root value={manager} onValueChange={setManager} variant="segmented" style={styles.installRow}>
        <div {...stylex.props(styles.installTabs)}>
          <Tabs.List aria-label="Package manager">
            {PACKAGE_MANAGERS.map(({ value }) => (
              <Tabs.Tab key={value} value={value} style={styles.manager}>
                {value}
              </Tabs.Tab>
            ))}
            <Tabs.Indicator />
          </Tabs.List>
          {copy(false)}
        </div>
        <Separator style={styles.installRule} />
        <Separator orientation="vertical" style={styles.installDivider} />
        {PACKAGE_MANAGERS.map(({ value }) => (
          <Tabs.Panel key={value} value={value} style={styles.installPanel}>
            <code {...stylex.props(styles.command)}>{commands[value]}</code>
          </Tabs.Panel>
        ))}
        {copy(true)}
      </Tabs.Root>
    </Card.Root>
  );
}

function SectionHead({ id, value, label, note }: { id: string; value: string; label: ReactNode; note?: ReactNode }) {
  return (
    <div {...stylex.props(styles.sectionHead)}>
      <div {...stylex.props(styles.sectionTitle)}>
        <span aria-hidden {...stylex.props(styles.sectionNumber)}>
          § {value}
        </span>
        <h2 id={id} data-index-number={value} {...stylex.props(styles.h2)}>
          {label}
        </h2>
      </div>
      {note && <p {...stylex.props(styles.sectionNote)}>{note}</p>}
    </div>
  );
}

function plateOf(section: Section): { demo: Block; caption: Block[] } | undefined {
  const demo = section.blocks.at(-1);
  const caption = section.blocks.slice(0, -1);
  if (!demo || demo.type !== Demo || caption.length > MAX_PLATE_CAPTION_PARAGRAPHS || caption.some((block) => block.type !== P)) return undefined;
  return { demo, caption };
}

function demoted(block: Block): Block {
  if (block.type !== H3) return block;
  return <h4 key={block.key} {...block.props} {...stylex.props(styles.h4)} />;
}

/** An Anatomy figure's labels need the whole row. */
const takesFullRow = (plate: ReactElement | undefined) => Boolean((plate?.props as ComponentProps<typeof Demo> | undefined)?.anatomy);

/** Consecutive plates that both fit half the row pair up (`h`); any other plate takes the row (`f`). */
function pairSpans(fits: boolean[]): string {
  let spans = '';
  for (let index = 0; index < fits.length; index++) {
    if (fits[index] && fits[index + 1]) {
      spans += 'hh';
      index++;
    } else spans += 'f';
  }
  return spans;
}

function Plates({ children, folded }: { children: ReactElement[]; folded: (key: string) => boolean }) {
  const grid = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ width: number; spans: string } | null>(null);
  useLayoutEffect(() => {
    const node = grid.current;
    if (!node || layout) return;
    const width = node.clientWidth;
    const gap = parseFloat(getComputedStyle(node).columnGap) || 0;
    const fits = Array.from(node.children, (plate, index) => {
      if (takesFullRow(children[index])) return false;
      const inner = plate.querySelector<HTMLElement>('[data-component-preview]');
      const stage = inner?.parentElement;
      if (!inner || !stage) return false;
      const padding = parseFloat(getComputedStyle(stage).paddingInlineStart) * 2;
      return inner.getBoundingClientRect().width + padding <= (width - gap) / 2;
    });
    const spans = pairSpans(fits);
    setLayout({ width, spans });
  }, [layout]);
  useEffect(() => {
    const node = grid.current;
    if (!node) return;
    const observer = new ResizeObserver(() =>
      setLayout((current) => (current && current.width !== node.clientWidth ? null : current)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={grid} {...stylex.props(styles.plates)}>
      {children.map((plate, index) => (
        <div
          key={plate.key}
          {...stylex.props(styles.root, layout?.spans[index] !== 'h' && styles.fullRow, folded(String(plate.key)) && styles.folded)}
        >
          {plate}
        </div>
      ))}
    </div>
  );
}

const EXAMPLES_SHOWN_BEFORE_FOLD = 3;

function Examples({ sections, value }: { sections: Section[]; value: string }) {
  const [open, setOpen] = useState(false);
  const group = useRef<HTMLElement>(null);
  const folded = (id: string) => !open && sections.findIndex((section) => section.id === id) >= EXAMPLES_SHOWN_BEFORE_FOLD;

  const hash = useLocation({ select: (location) => location.hash });
  useEffect(() => {
    const reveal = (id: string) => {
      const target = id ? document.getElementById(decodeURIComponent(id)) : null;
      if (!target || !group.current?.contains(target) || target.checkVisibility()) return;
      setOpen(true);
      requestAnimationFrame(() => target.scrollIntoView());
    };
    reveal(hash);
    const onHash = () => reveal(window.location.hash.slice(1));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [hash]);

  const runs: ReactNode[] = [];
  let plates: ReactElement[] = [];
  const flush = () => {
    if (plates.length > 0)
      runs.push(
        <Plates key={`plates-${runs.length}`} folded={folded}>
          {plates}
        </Plates>,
      );
    plates = [];
  };
  sections.forEach((section, index) => {
    const plate = plateOf(section);
    if (plate) {
      plates.push(
        cloneElement(plate.demo as ReactElement<ComponentProps<typeof Demo>>, {
          key: section.id,
          plate: true,
          number: number(index + 1),
          title: section.heading.props.children,
          titleId: section.id,
          caption: plate.caption.map((block) => <span key={block.key}>{block.props.children}</span>),
        }),
      );
      return;
    }
    flush();
    runs.push(
      <section key={section.id} aria-labelledby={section.id} {...stylex.props(styles.example, folded(section.id) && styles.folded)}>
        <div {...stylex.props(styles.exampleHead)}>
          <span aria-hidden {...stylex.props(styles.exampleNumber)}>
            {number(index + 1)}
          </span>
          <h3 id={section.id} {...stylex.props(styles.h3)}>
            {section.heading.props.children}
          </h3>
        </div>
        {section.blocks.map(demoted)}
      </section>,
    );
  });
  flush();
  const more = sections.length - EXAMPLES_SHOWN_BEFORE_FOLD;
  return (
    <section ref={group} aria-labelledby="examples">
      <SectionHead id="examples" value={value} label="Examples" note="Each example is a file you can copy whole. Shown in Neutral, the default theme." />
      {runs}
      {more > 0 && (
        <Button variant="outline" aria-expanded={open} onClick={() => setOpen(!open)} style={styles.more}>
          {open ? 'Fewer examples' : `${more} more ${more === 1 ? 'example' : 'examples'}`}
          {open ? <CaretUpIcon aria-hidden /> : <CaretDownIcon aria-hidden />}
        </Button>
      )}
    </section>
  );
}

const elementsOf = (node: ReactNode) =>
  Children.toArray(node).filter((child): child is Block => isValidElement(child));

function propRowsOf(table: Block): Record<string, ReactNode>[] | undefined {
  const [head, body] = elementsOf(table.props.children);
  const headers = elementsOf(elementsOf(head?.props.children)[0]?.props.children).map((cell) => nodeText(cell.props.children));
  if (!PROP_LIST_COLUMNS.every((column) => headers.includes(column))) return undefined;
  return elementsOf(body?.props.children).map((row) =>
    Object.fromEntries(elementsOf(row.props.children).map((cell, at) => [headers[at], cell.props.children])),
  );
}

function PropList({ rows }: { rows: Record<string, ReactNode>[] }) {
  return (
    <ul {...stylex.props(styles.propList)}>
      {rows.map((row, index) => (
        <li key={index} {...stylex.props(styles.propEntry)}>
          <div {...stylex.props(styles.propTop)}>
            <span {...stylex.props(styles.propName)}>
              {row.Part ? (
                <>
                  {row.Part} <span aria-hidden>·</span>{' '}
                </>
              ) : null}
              {row.Prop}
            </span>
            {row.Default != null && (
              <span {...stylex.props(styles.propDefault)}>
                <span {...stylex.props(styles.propLabel)}>default</span> {row.Default}
              </span>
            )}
          </div>
          <div>{row.Type}</div>
          <p {...stylex.props(styles.noteBody)}>{row.Notes}</p>
          <Separator />
        </li>
      ))}
    </ul>
  );
}

function Notes({ list }: { list: Block }) {
  const items = Children.toArray(list.props.children).filter((node): node is Block => isValidElement(node) && node.type === Li);
  return (
    <ul {...stylex.props(styles.notes)}>
      {items.map((item, index) => {
        const parts = Children.toArray(item.props.children);
        const [lead, ...rest] = parts;
        const titled = isValidElement<{ children?: ReactNode }>(lead) && lead.type === 'strong';
        const title = titled ? nodeText(lead.props.children).replace(/\.$/, '') : undefined;
        const body = titled ? rest.map((part, at) => (at === 0 && typeof part === 'string' ? part.trimStart() : part)) : parts;
        return (
          <li key={index} {...stylex.props(styles.note)}>
            <Separator />
            {title && <h3 {...stylex.props(styles.noteTitle)}>{title}</h3>}
            <p {...stylex.props(styles.noteBody)}>{body}</p>
          </li>
        );
      })}
    </ul>
  );
}

function canTitleNotes(list: Block) {
  return Children.toArray(list.props.children)
    .filter((node): node is Block => isValidElement(node))
    .every((item) => {
      const [lead] = Children.toArray(item.props.children);
      return isValidElement(lead) && lead.type === 'strong';
    });
}

function Pager({ entry }: { entry: ComponentEntry }) {
  const order = [...components].sort((a, b) => a.number.localeCompare(b.number));
  const at = order.findIndex((candidate) => candidate.item === entry.item);
  const previous = order[at - 1];
  const next = order[at + 1];
  return (
    <nav aria-label="Previous and next components" {...stylex.props(styles.pager)}>
      <Separator />
      <div {...stylex.props(styles.pagerRow)}>
        {previous && (
          <TextLink
            variant="muted"
            render={<Link to="/components/$name" params={{ name: previous.item }} />}
            style={[styles.pagerLink, styles.pagerPrevious]}
          >
            <ArrowLeftIcon aria-hidden {...stylex.props(styles.pagerArrow)} />
            <span {...stylex.props(styles.pagerCopy)}>
              <span {...stylex.props(styles.pagerLabel)}>Previous · {previous.number}</span>
              <span {...stylex.props(styles.pagerName)}>{previous.name}</span>
            </span>
          </TextLink>
        )}
        {previous && next && (
          <>
            <Separator orientation="vertical" style={styles.pagerDivider} />
            <Separator style={styles.pagerRule} />
          </>
        )}
        {next && (
          <TextLink
            variant="muted"
            render={<Link to="/components/$name" params={{ name: next.item }} />}
            style={[styles.pagerLink, styles.pagerNext]}
          >
            <span {...stylex.props(styles.pagerCopy)}>
              <span {...stylex.props(styles.pagerLabel)}>Next · {next.number}</span>
              <span {...stylex.props(styles.pagerName)}>{next.name}</span>
            </span>
            <ArrowRightIcon aria-hidden {...stylex.props(styles.pagerArrow)} />
          </TextLink>
        )}
      </div>
      <Separator />
    </nav>
  );
}

const hasDemo = (section: Section) => section.blocks.some((block) => block.type === Demo);

/** An overlay's first demo is closed, so its page has the tab only once an `anatomy.tsx` renders it open. */
export function hasAnatomyTab(entry: ComponentEntry): boolean {
  const tab = anatomyTabs[entry.item];
  return tab !== undefined && tab.parts.length >= 2 && (entry.group !== 'overlays' || tab.demo !== undefined);
}

function withAnatomy(sections: Section[], entry: ComponentEntry): Section[] {
  const tab = anatomyTabs[entry.item];
  if (!tab || !hasAnatomyTab(entry)) return sections;
  const first = sections.flatMap((section) => section.blocks).find((block) => block.type === Demo);
  if (!first) return sections;
  const { component } = first.props as ComponentProps<typeof Demo>;
  const anatomy = { item: entry.item, component: tab.demo ?? component };
  return sections.map((section) => ({
    ...section,
    blocks: section.blocks.map((block) =>
      block === first ? (cloneElement(block as ReactElement<ComponentProps<typeof Demo>>, { anatomy }) as Block) : block,
    ),
  }));
}

type Part = { kind: 'examples'; sections: Section[] } | { kind: 'section'; section: Section };

/**
 * The sections in page order. Sections with a demo between Install and Props gather under
 * Examples, where the first one stood; a prose section before them leads, and the rest follow.
 */
function partsOf(sections: Section[]): Part[] {
  const install = sections.findIndex((section) => section.label === INSTALL);
  const props = sections.findIndex((section) => section.label === PROPS);
  const body = sections.slice(install + 1, props === -1 ? undefined : props);
  const examples = body.filter(hasDemo);
  const leading = examples.length > 0 ? body.slice(0, body.indexOf(examples[0]!)) : body;
  const trailing = body.filter((section) => !hasDemo(section) && !leading.includes(section));
  return [
    ...leading.map((section) => ({ kind: 'section' as const, section })),
    ...(examples.length > 0 ? [{ kind: 'examples' as const, sections: examples }] : []),
    ...[...trailing, ...(props === -1 ? [] : sections.slice(props))].map((section) => ({ kind: 'section' as const, section })),
  ];
}

export function ComponentPage({ entry, Content }: { entry: ComponentEntry; Content: MdxContent }) {
  const page = sectionsOf(blocksOf(Content));
  const { intro } = page;
  const sections = withAnatomy(page.sections, entry);
  const titleBlock = intro.find((block) => block.type === H1);
  const lede = intro.find((block) => block.type === P);
  const introduction = intro.filter((block) => block !== titleBlock && block !== lede);
  const install = sections.find((section) => section.label === INSTALL);

  const webComponent = sections.flatMap((section) => section.blocks).find((block) => block.type === WebComponent);
  const parts = partsOf(sections).map((part) =>
    part.kind === 'section'
      ? { ...part, section: { ...part.section, blocks: part.section.blocks.filter((block) => block !== webComponent) } }
      : part,
  );
  const index = [
    ...parts.map((part) => (part.kind === 'examples' ? { id: 'examples', label: 'Examples' } : part.section)),
    ...(webComponent ? [{ id: 'web-component', label: 'Web component' }] : []),
  ].map(({ id, label }) => ({ id, label })) satisfies Entry[];

  return (
    <DocumentLayout breadcrumb={[]}>
      <div {...stylex.props(styles.root)}>
        <DocsBar entry={entry} sections={index} />
        <TitleBlock entry={entry} title={titleBlock?.props.children ?? entry.name} lede={lede?.props.children} />
        {introduction.length > 0 && <div {...stylex.props(styles.introduction)}>{introduction}</div>}
        {install?.blocks.map((block) =>
          block.type === Pre ? (
            <InstallCommand key={block.key} command={nodeText(block.props.children).trim()} />
          ) : block.type === P ? (
            <p key={block.key} {...stylex.props(styles.installNote)}>
              {block.props.children}
            </p>
          ) : (
            block
          ),
        )}
        {parts.map((part, at) => {
          if (part.kind === 'examples') return <Examples key="examples" sections={part.sections} value={number(at + 1)} />;
          const { section } = part;
          return (
            <section key={section.id} aria-labelledby={section.id}>
              <SectionHead id={section.id} value={number(at + 1)} label={section.heading.props.children} />
              {section.blocks.map((block) => {
                if (section.label === 'Accessibility' && block.type === Ul && canTitleNotes(block))
                  return <Notes key={block.key} list={block} />;
                const rows = block.type === Table ? propRowsOf(block) : undefined;
                if (!rows) return block;
                return (
                  <Fragment key={block.key}>
                    <div {...stylex.props(styles.propTable)}>{block}</div>
                    <PropList rows={rows} />
                  </Fragment>
                );
              })}
            </section>
          );
        })}
        {webComponent && <section {...stylex.props(styles.webComponent)}>{webComponent}</section>}
        <Pager entry={entry} />
      </div>
    </DocumentLayout>
  );
}
