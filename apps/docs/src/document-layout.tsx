import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Link, useLocation, type LinkProps } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Breadcrumb } from '@ultima/ui';

import { breakpoints } from './breakpoints.stylex';
import { layoutStyles } from './layout';
import { Kicker } from './page';
import { shell } from './shell.stylex';
import { TextLink } from './text-link';

const styles = stylex.create({
  main: {
    paddingBlockStart: space['--ult-space-12'],
    paddingBlockEnd: space['--ult-space-12'],
  },
  edgePinned: {
    paddingInlineEnd: { default: null, [breakpoints.INDEX]: shell.edge },
    paddingInlineStart: { default: null, [breakpoints.INDEX]: space['--ult-space-11'] },
  },
  breadcrumb: {
    fontFamily: font['--ult-font-mono'],
    letterSpacing: font['--ult-font-tracking-wide'],
    marginBlockEnd: space['--ult-space-8'],
    textTransform: 'uppercase',
  },
  breadcrumbList: { fontSize: text['--ult-text-1'] },
  crumb: {
    color: {
      default: color['--ult-color-text-subtle'],
      ':is([data-active], [aria-current="page"])': color['--ult-color-text'],
      ':hover': color['--ult-color-text'],
    },
  },
  grid: {
    display: 'grid',
    gap: { default: space['--ult-space-9'], [breakpoints.INDEX]: space['--ult-space-11'] },
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      [breakpoints.INDEX]: 'minmax(0, 1fr) 12.25rem',
    },
  },
  article: {
    minInlineSize: 0,
    inlineSize: '100%',
    maxInlineSize: '52.5rem',
    marginInline: 'auto',
  },
  wide: { maxInlineSize: '75rem' },
  fullWidth: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      [breakpoints.INDEX]: 'minmax(0, 1fr)',
    },
  },
  indexRail: {
    alignSelf: 'start',
    display: { default: 'none', [breakpoints.INDEX]: 'block' },
    insetBlockStart: `calc(${shell.chromeBlock} + ${space['--ult-space-6']})`,
    maxBlockSize: `calc(100dvh - ${shell.chromeBlock} - ${space['--ult-space-6']})`,
    minInlineSize: 0,
    overflow: 'auto',
    position: 'sticky',
  },
  indexContents: {
    minInlineSize: 0,
    paddingBlockStart: space['--ult-space-4'],
    paddingInlineStart: space['--ult-space-4'],
  },
  indexLabel: {
    fontFamily: 'Space Grotesk, Figtree, sans-serif',
    fontSize: text['--ult-text-4'],
    letterSpacing: font['--ult-font-tracking-normal'],
  },
  indexList: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-6'],
    listStyle: 'none',
    marginBlock: space['--ult-space-6'],
    marginInline: 0,
    padding: 0,
  },
  indexNumber: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    marginInlineEnd: space['--ult-space-4'],
  },
  current: {
    color: color['--ult-color-text'],
    fontWeight: font['--ult-font-weight-medium'],
  },
});

/** `number` is a heading's `data-index-number`, the section number a page shows beside it. */
type Heading = { id: string; label: string; number?: string };

function slugify(value: string, used: Set<string>) {
  const base =
    value
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'section';
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

export type Crumb = {
  label: string;
  to?: NonNullable<LinkProps['to']>;
};

export function DocumentLayout({
  children,
  breadcrumb,
  index = true,
  wide = false,
}: {
  children: ReactNode;
  breadcrumb: Crumb[];
  index?: boolean;
  wide?: boolean;
}) {
  const article = useRef<HTMLElement>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  useLayoutEffect(() => {
    if (!article.current) return;
    const used = new Set(
      Array.from(article.current.querySelectorAll('[id]'), (node) => node.id),
    );
    const next: Heading[] = [];
    article.current.querySelectorAll<HTMLElement>('h2').forEach((heading) => {
      if (heading.closest('figure')) return;
      const label =
        heading.querySelector('[aria-label]')?.getAttribute('aria-label') ??
        heading.textContent?.trim() ??
        '';
      if (!label) return;
      const id = heading.id || slugify(label, used);
      heading.id = id;
      used.add(id);
      next.push({ id, label, number: heading.dataset.indexNumber });
    });
    setHeadings(next);
  }, [children]);

  const rail = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const aside = rail.current;
    if (!aside || headings.length === 0) return;
    const targets = headings.flatMap(
      ({ id }) => document.getElementById(id) ?? [],
    );
    // The reading line sits where the rail sticks, just under the sticky chrome, which is also
    // where the document's scroll padding lands a heading reached by its anchor.
    const line = parseFloat(getComputedStyle(aside).top) || 0;
    const mark = () => {
      if (!aside.checkVisibility()) return;
      let passed: string | null = null;
      for (const target of targets) {
        if (target.getBoundingClientRect().top - line >= 1) break;
        passed = target.id;
      }
      setCurrent(passed);
    };
    const observer = new IntersectionObserver(mark, {
      rootMargin: `-${line}px 0px 0px 0px`,
    });
    targets.forEach((target) => observer.observe(target));
    // A jump that carries a heading from below the viewport to above the line in one frame never
    // intersects the band, so the settled scroll re-reads the positions too.
    window.addEventListener('scrollend', mark);
    return () => {
      observer.disconnect();
      window.removeEventListener('scrollend', mark);
    };
  }, [headings]);

  const { pathname } = useLocation();

  return (
    <main {...stylex.props(layoutStyles.gutter, styles.main, index && styles.edgePinned)}>
      <div {...stylex.props(styles.grid, !index && styles.fullWidth)}>
        <article
          ref={article}
          data-document-article
          {...stylex.props(styles.article, wide && styles.wide)}
        >
          {breadcrumb.length > 0 && (
            <Breadcrumb.Root style={styles.breadcrumb}>
              <Breadcrumb.List style={styles.breadcrumbList}>
                {breadcrumb.map((crumb, crumbIndex) => (
                  <Fragment key={crumb.label}>
                    {crumbIndex > 0 && (
                      <Breadcrumb.Separator>/</Breadcrumb.Separator>
                    )}
                    <Breadcrumb.Item>
                      <Breadcrumb.Link
                        active={crumbIndex === breadcrumb.length - 1}
                        style={styles.crumb}
                        render={
                          <Link
                            to={crumb.to ?? pathname}
                            activeOptions={{ exact: true }}
                          />
                        }
                      >
                        {crumb.label}
                      </Breadcrumb.Link>
                    </Breadcrumb.Item>
                  </Fragment>
                ))}
              </Breadcrumb.List>
            </Breadcrumb.Root>
          )}
          {children}
        </article>
        {index &&
          headings.length > 0 && (
            <aside
              ref={rail}
              aria-label="On this page"
              {...stylex.props(styles.indexRail)}
            >
              <div {...stylex.props(styles.indexContents)}>
                <Kicker style={styles.indexLabel}>On this page</Kicker>
                <ul {...stylex.props(styles.indexList)}>
                  {headings.map(({ id, label, number }) => (
                    <li key={id}>
                      <TextLink
                        href={`#${id}`}
                        variant="muted"
                        aria-current={id === current ? 'location' : undefined}
                        style={id === current ? styles.current : undefined}
                      >
                        {number && (
                          <span aria-hidden {...stylex.props(styles.indexNumber)}>
                            {number}
                          </span>
                        )}
                        {label}
                      </TextLink>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
      </div>
    </main>
  );
}
