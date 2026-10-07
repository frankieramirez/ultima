import { ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { Link, useLocation } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Alert, Separator } from '@ultima/ui';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ComponentType, ReactNode } from 'react';

import { breakpoints } from './breakpoints.stylex';
import { DocumentLayout } from './document-layout';
import { pages } from './navigation';
import { proseComponents } from './prose';
import { TextLink } from './text-link';
import { headings } from './typography';

const LEDE = ':is(h1 + p)';

export const foundationStyles = stylex.create({
  root: { counterReset: 'section', minInlineSize: 0 },
  runningHead: {
    columnGap: space['--ult-space-8'],
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBlockEnd: space['--ult-space-5'],
    rowGap: space['--ult-space-2'],
  },
  label: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 'clamp(3.5rem, 12vw, 6rem)',
    letterSpacing: font['--ult-font-tracking-tightest'],
    lineHeight: 0.95,
    marginBlockStart: space['--ult-space-11'],
  },
  p: {
    color: color['--ult-color-text-muted'],
    fontSize: { default: text['--ult-text-5'], [LEDE]: text['--ult-text-6'] },
    lineHeight: { default: 1.65, [LEDE]: font['--ult-font-leading-normal'] },
    marginBlockStart: { default: space['--ult-space-5'], [LEDE]: space['--ult-space-6'] },
    marginBlockEnd: { default: space['--ult-space-5'], [LEDE]: space['--ult-space-9'] },
    maxInlineSize: { default: null, [LEDE]: '40rem' },
  },
  h2: {
    alignItems: 'baseline',
    columnGap: space['--ult-space-6'],
    counterIncrement: 'section',
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: { default: text['--ult-text-9'], [breakpoints.WIDE]: text['--ult-text-10'] },
    letterSpacing: font['--ult-font-tracking-tighter'],
    lineHeight: font['--ult-font-leading-none'],
    marginBlockStart: '4.5rem',
    marginBlockEnd: space['--ult-space-7'],
  },
  headingRow: {
    alignItems: 'baseline',
    columnGap: space['--ult-space-6'],
    display: 'flex',
    flexWrap: 'wrap',
  },
  count: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
  },
  sectionNumber: {
    '::before': {
      color: color['--ult-color-text-subtle'],
      content: '"§ " counter(section, decimal-leading-zero)',
      fontFamily: font['--ult-font-mono'],
      fontSize: text['--ult-text-2'],
      fontWeight: font['--ult-font-weight-regular'],
      letterSpacing: font['--ult-font-tracking-normal'],
    },
  },
  strong: { color: color['--ult-color-text'], fontWeight: font['--ult-font-weight-semibold'] },
  callout: { marginBlock: space['--ult-space-6'] },
  calloutTitle: { color: color['--ult-color-text'] },
  calloutBody: { color: color['--ult-color-text-muted'], display: 'flex', flexDirection: 'column', gap: space['--ult-space-2'] },
  calloutIcon: { color: color['--ult-color-text'], fontSize: text['--ult-text-6'] },
  columns: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.WIDE]: 'repeat(2, minmax(0, 1fr))' },
    marginBlock: space['--ult-space-6'],
  },
  pager: { marginBlockStart: space['--ult-space-12'] },
  pagerRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
  },
  pagerLink: {
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    paddingBlock: space['--ult-space-8'],
    textDecoration: 'none',
  },
  previous: { alignItems: 'flex-start', paddingInlineEnd: space['--ult-space-8'] },
  next: { alignItems: 'flex-end', gridColumnStart: '3', paddingInlineStart: space['--ult-space-8'] },
  pagerTitle: {
    alignItems: 'center',
    display: 'flex',
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: { default: text['--ult-text-8'], [breakpoints.WIDE]: '1.75rem' },
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-5'],
    letterSpacing: font['--ult-font-tracking-tighter'],
    lineHeight: font['--ult-font-leading-tight'],
  },
  pagerArrow: { color: color['--ult-color-text-muted'], flexShrink: 0, fontSize: text['--ult-text-7'] },
});

/** The router keeps a trailing slash, and the host serves `/install/` as readily as `/install`. */
function usePageIndex() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '') || '/';
  return pages.findIndex(({ to }) => to === path);
}

export function RunningHead({ labels }: { labels: string[] }) {
  const pageNumber = usePageIndex() + 1;
  return (
    <>
      <div {...stylex.props(foundationStyles.runningHead)}>
        <p {...stylex.props(foundationStyles.label)}>Foundations · {String(pageNumber).padStart(2, '0')}</p>
        {labels.map((label) => (
          <p key={label} {...stylex.props(foundationStyles.label)}>
            {label}
          </p>
        ))}
      </div>
      <Separator />
    </>
  );
}

export function FoundationPager() {
  const place = usePageIndex();
  const previous = pages[place - 1];
  const next = pages[place + 1];
  return (
    <nav aria-label="Previous and next page" {...stylex.props(foundationStyles.pager)}>
      <Separator />
      <div {...stylex.props(foundationStyles.pagerRow)}>
        {previous && (
          <TextLink render={<Link to={previous.to} />} style={[foundationStyles.pagerLink, foundationStyles.previous]}>
            <span {...stylex.props(foundationStyles.label)}>Previous</span>
            <span {...stylex.props(foundationStyles.pagerTitle)}>
              <ArrowLeftIcon aria-hidden {...stylex.props(foundationStyles.pagerArrow)} />
              {previous.label}
            </span>
          </TextLink>
        )}
        {previous && next && <Separator orientation="vertical" />}
        {next && (
          <TextLink render={<Link to={next.to} />} style={[foundationStyles.pagerLink, foundationStyles.next]}>
            <span {...stylex.props(foundationStyles.label)}>Next</span>
            <span {...stylex.props(foundationStyles.pagerTitle)}>
              {next.label}
              <ArrowRightIcon aria-hidden {...stylex.props(foundationStyles.pagerArrow)} />
            </span>
          </TextLink>
        )}
      </div>
      <Separator />
    </nav>
  );
}

const titleOutsideOutline = <p />;

export function Callout({
  title,
  icon,
  tone = 'neutral',
  children,
}: {
  title: ReactNode;
  icon: ReactNode;
  tone?: 'neutral' | 'warning';
  children: ReactNode;
}) {
  return (
    <Alert.Root tone={tone} style={foundationStyles.callout}>
      <Alert.Icon style={tone === 'neutral' && foundationStyles.calloutIcon}>{icon}</Alert.Icon>
      <Alert.Description style={foundationStyles.calloutBody}>
        <Alert.Title render={titleOutsideOutline} style={tone === 'neutral' && foundationStyles.calloutTitle}>
          {title}
        </Alert.Title>
        <span>{children}</span>
      </Alert.Description>
    </Alert.Root>
  );
}

export function Columns({ children }: { children: ReactNode }) {
  return <div {...stylex.props(foundationStyles.columns)}>{children}</div>;
}

function H1(props: ComponentProps<'h1'>) {
  return <h1 {...props} {...stylex.props(headings.h1, foundationStyles.title)} />;
}
/** The number is generated content on a hidden span, so it stays out of the heading's name. */
function H2({ children, ...props }: ComponentProps<'h2'>) {
  return (
    <h2 data-section {...props} {...stylex.props(headings.h2, foundationStyles.h2)}>
      <span aria-hidden {...stylex.props(foundationStyles.sectionNumber)} />
      {children}
    </h2>
  );
}

export function SectionHeading({ id, count, children }: { id?: string; count?: ReactNode; children: ReactNode }) {
  return (
    <div {...stylex.props(foundationStyles.headingRow)}>
      <H2 id={id}>{children}</H2>
      {count !== undefined && <span {...stylex.props(foundationStyles.count)}>{count}</span>}
    </div>
  );
}

export function P(props: ComponentProps<'p'>) {
  return <p {...props} {...stylex.props(foundationStyles.p)} />;
}
function Strong(props: ComponentProps<'strong'>) {
  return <strong {...props} {...stylex.props(foundationStyles.strong)} />;
}

const components = {
  ...proseComponents,
  h1: H1,
  h2: H2,
  p: P,
  strong: Strong,
} satisfies MDXComponents;

export function FoundationLayout({
  labels,
  index = true,
  children,
}: {
  labels: string[];
  index?: boolean;
  children: ReactNode;
}) {
  return (
    <DocumentLayout breadcrumb={[]} index={index}>
      <div {...stylex.props(foundationStyles.root)}>
        <RunningHead labels={labels} />
        {children}
        <FoundationPager />
      </div>
    </DocumentLayout>
  );
}

export function FoundationTitle({ title, lede }: { title: string; lede: ReactNode }) {
  return (
    <>
      <H1>{title}</H1>
      <P>{lede}</P>
    </>
  );
}

export function Foundation({
  Content,
  labels,
}: {
  Content: ComponentType<{ components?: MDXComponents }>;
  labels: string[];
}) {
  return (
    <FoundationLayout labels={labels}>
      <Content components={components} />
    </FoundationLayout>
  );
}
