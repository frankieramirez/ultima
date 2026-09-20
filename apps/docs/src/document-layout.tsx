import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import * as stylex from "@stylexjs/stylex";
import { border, color, font, space, text } from "@ultima/tokens/tokens.stylex";
import { Separator } from "@ultima/ui";

const DESKTOP = "@media (min-width: 80rem)";
const WIDE = "@media (min-width: 48rem)";

const styles = stylex.create({
  main: {
    paddingBlockStart: space["--ult-space-7"],
    paddingBlockEnd: space["--ult-space-12"],
    marginInline: {
      default: space["--ult-space-6"],
      [WIDE]: space["--ult-space-9"],
    },
  },
  breadcrumb: {
    color: color["--ult-color-text-subtle"],
    fontFamily: font["--ult-font-mono"],
    fontSize: text["--ult-text-1"],
    letterSpacing: font["--ult-font-tracking-wide"],
    lineHeight: font["--ult-font-leading-none"],
    marginBlockEnd: space["--ult-space-8"],
  },
  grid: {
    display: "grid",
    gap: space["--ult-space-9"],
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  article: {
    minInlineSize: 0,
    inlineSize: "100%",
    maxInlineSize: "64rem",
    marginInline: "auto",
    width: "100%",
  },
  wideArticle: { gridColumn: "1", maxInlineSize: "64rem" },
  fullWidth: { gridTemplateColumns: "minmax(0, 1fr)" },
  index: {
    position: "fixed",
    insetBlockStart: "5.5rem",
    insetBlockEnd: space["--ult-space-9"],
    insetInlineEnd: space["--ult-space-9"],
    overflow: "auto",
    inlineSize: "11.5rem",
    justifySelf: "end",
    display: { default: "none", [DESKTOP]: "block" },
    minInlineSize: 0,
  },
  indexInner: {
    display: "flex",
    gap: space["--ult-space-7"],
    position: "sticky",
    insetBlockStart: space["--ult-space-6"],
  },
  divider: { alignSelf: "stretch", blockSize: "auto" },
  indexContents: {
    minInlineSize: 0,
    paddingBlockStart: space["--ult-space-4"],
  },
  indexLabel: {
    color: color["--ult-color-text-subtle"],
    fontFamily: font["--ult-font-mono"],
    fontSize: text["--ult-text-1"],
    letterSpacing: font["--ult-font-tracking-wide"],
    margin: 0,
    textTransform: "uppercase",
  },
  indexList: {
    display: "flex",
    flexDirection: "column",
    gap: space["--ult-space-3"],
    listStyle: "none",
    marginBlock: space["--ult-space-4"],
    marginInline: 0,
    padding: 0,
  },
  indexLink: {
    color: {
      default: color["--ult-color-text-muted"],
      ":hover": color["--ult-color-text"],
    },
    fontSize: text["--ult-text-3"],
    textDecoration: "none",
    ":focus-visible": {
      outline: `${border.focus} solid ${color["--ult-color-border-focus"]}`,
      outlineOffset: border.focusOffset,
    },
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

export function DocumentLayout({
  children,
  breadcrumb,
  index = true,
}: {
  children: ReactNode;
  breadcrumb: string;
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
    <main {...stylex.props(styles.main)}>
      <div {...stylex.props(styles.grid, !index && styles.fullWidth)}>
        <article
          ref={article}
          data-document-article
          {...stylex.props(styles.article, !index && styles.wideArticle)}
        >
          <div {...stylex.props(styles.breadcrumb)}>{breadcrumb}</div>
          {children}
        </article>
        {index && (
          <aside aria-label="On this page" {...stylex.props(styles.index)}>
            <div {...stylex.props(styles.indexInner)}>
              <Separator orientation="vertical" style={styles.divider} />
              <div {...stylex.props(styles.indexContents)}>
                <p {...stylex.props(styles.indexLabel)}>On this page</p>
                <ul {...stylex.props(styles.indexList)}>
                  {headings.map(({ id, label }) => (
                    <li key={id}>
                      <a href={`#${id}`} {...stylex.props(styles.indexLink)}>
                        {label}
                      </a>
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

