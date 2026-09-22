import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { Link, type LinkProps } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { color, font, space, text } from "@ultima/tokens/tokens.stylex";
import { Breadcrumb, Separator } from "@ultima/ui";

import { layoutStyles } from "./layout";
import { Kicker } from "./page";
import { shell } from "./shell.stylex";
import { TextLink } from "./text-link";

const DESKTOP = "@media (min-width: 80rem)";

const styles = stylex.create({
  main: {
    paddingBlockStart: space["--ult-space-7"],
    paddingBlockEnd: space["--ult-space-12"],
  },
  breadcrumb: {
    marginBlockEnd: space["--ult-space-8"],
  },
  grid: {
    display: "grid",
    gap: space["--ult-space-9"],
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [DESKTOP]: "minmax(0, 1fr) 11.5rem",
    },
  },
  article: {
    minInlineSize: 0,
    inlineSize: "100%",
    maxInlineSize: "64rem",
    marginInline: "auto",
    width: "100%",
  },
  wideArticle: { gridColumn: "1", maxInlineSize: "76rem" },
  fullWidth: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [DESKTOP]: "minmax(0, 1fr)",
    },
  },
  indexRail: {
    alignSelf: "start",
    display: { default: "none", [DESKTOP]: "block" },
    insetBlockStart: `calc(${shell.chromeBlock} + ${space["--ult-space-6"]})`,
    maxBlockSize: `calc(100dvh - ${shell.chromeBlock} - ${space["--ult-space-6"]})`,
    minInlineSize: 0,
    overflow: "auto",
    position: "sticky",
  },
  indexInner: {
    display: "flex",
    gap: space["--ult-space-7"],
  },
  divider: { alignSelf: "stretch", blockSize: "auto" },
  indexContents: {
    minInlineSize: 0,
    paddingBlockStart: space["--ult-space-4"],
  },
  indexLabel: { textTransform: "uppercase" },
  indexList: {
    display: "flex",
    flexDirection: "column",
    fontSize: text["--ult-text-3"],
    gap: space["--ult-space-6"],
    listStyle: "none",
    marginBlock: space["--ult-space-6"],
    marginInline: 0,
    padding: 0,
  },
});

type Heading = { id: string; label: string };

function slugify(value: string, used: Set<string>) {
  const base =
    value
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "section";
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

export type Crumb = {
  label: string;
  to?: NonNullable<LinkProps["to"]>;
};

export function DocumentLayout({
  children,
  breadcrumb,
  index = true,
}: {
  children: ReactNode;
  breadcrumb: Crumb[];
  index?: boolean;
}) {
  const article = useRef<HTMLElement>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  useLayoutEffect(() => {
    if (!article.current) return;
    const used = new Set(
      Array.from(article.current.querySelectorAll("[id]"), (node) => node.id),
    );
    const next: Heading[] = [];
    article.current.querySelectorAll<HTMLElement>("h2").forEach((heading) => {
      if (heading.closest("figure")) return;
      const label = heading.textContent?.trim() ?? "";
      if (!label) return;
      const id = heading.id || slugify(label, used);
      heading.id = id;
      used.add(id);
      next.push({ id, label });
    });
    setHeadings(next);
  }, [children]);

  return (
    <main {...stylex.props(layoutStyles.gutter, styles.main)}>
      <div {...stylex.props(styles.grid, !index && styles.fullWidth)}>
        <article
          ref={article}
          data-document-article
          {...stylex.props(styles.article, !index && styles.wideArticle)}
        >
          <Breadcrumb.Root style={styles.breadcrumb}>
            <Breadcrumb.List>
              {breadcrumb.map((crumb, crumbIndex) => (
                <Fragment key={crumb.label}>
                  {crumbIndex > 0 && <Breadcrumb.Separator />}
                  <Breadcrumb.Item>
                    <Breadcrumb.Link
                      active={crumbIndex === breadcrumb.length - 1}
                      render={
                        crumb.to ? (
                          <Link to={crumb.to} activeOptions={{ exact: true }} />
                        ) : undefined
                      }
                    >
                      {crumb.label}
                    </Breadcrumb.Link>
                  </Breadcrumb.Item>
                </Fragment>
              ))}
            </Breadcrumb.List>
          </Breadcrumb.Root>
          {children}
        </article>
        {index && headings.length > 0 && (
          <aside aria-label="On this page" {...stylex.props(styles.indexRail)}>
            <div {...stylex.props(styles.indexInner)}>
              <Separator orientation="vertical" style={styles.divider} />
              <div {...stylex.props(styles.indexContents)}>
                <Kicker style={styles.indexLabel}>On this page</Kicker>
                <ul {...stylex.props(styles.indexList)}>
                  {headings.map(({ id, label }) => (
                    <li key={id}>
                      <TextLink href={`#${id}`} variant="muted">
                        {label}
                      </TextLink>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

