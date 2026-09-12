import type { ComponentProps, ReactNode } from "react";

import * as stylex from "@stylexjs/stylex";
import { color, font, space, text } from "@ultima/tokens/tokens.stylex";
import { DocumentLayout } from "./document-layout";

const styles = stylex.create({
  page: {
    display: "flex",
    flexDirection: "column",
  },
  title: {
    color: color["--ult-color-text"],
    fontSize: {
      default: text["--ult-text-10"],
      "@media (min-width: 48rem)": "3.5rem",
    },
    fontWeight: font["--ult-font-weight-medium"],
    letterSpacing: font["--ult-font-tracking-tight"],
    lineHeight: font["--ult-font-leading-tight"],
    margin: 0,
  },
  lede: {
    color: color["--ult-color-text-muted"],
    fontSize: text["--ult-text-5"],
    lineHeight: font["--ult-font-leading-normal"],
    marginBlockStart: space["--ult-space-5"],
    marginBlockEnd: 0,
  },
  section: {
    marginBlockStart: space["--ult-space-11"],
  },
  sectionTitle: {
    color: color["--ult-color-text"],
    fontSize: "1.625rem",
    fontWeight: font["--ult-font-weight-medium"],
    letterSpacing: font["--ult-font-tracking-tight"],
    lineHeight: font["--ult-font-leading-tight"],
    marginBlock: 0,
  },
  note: {
    color: color["--ult-color-text-muted"],
    fontSize: text["--ult-text-4"],
    lineHeight: font["--ult-font-leading-normal"],
    marginBlock: space["--ult-space-4"],
    maxWidth: "44rem",
  },
  link: {
    color: color["--ult-color-highlight-text"],
    textDecoration: "underline",
    textUnderlineOffset: space["--ult-space-2"],
  },
});

export function Page({
  title,
  lede,
  children,
}: {
  title: string;
  lede: ReactNode;
  children: ReactNode;
}) {
  return (
    <DocumentLayout
      breadcrumb={`::root { --active: "${title.toLowerCase()}"; }`}
      index={title !== "Tokens" && title !== "Palette"}
    >
      <div {...stylex.props(styles.page)}>
        <h1 {...stylex.props(styles.title)}>{title}</h1>
        <p {...stylex.props(styles.lede)}>{lede}</p>
        {children}
      </div>
    </DocumentLayout>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section {...stylex.props(styles.section)}>
      <h2 {...stylex.props(styles.sectionTitle)}>{title}</h2>
      {children}
    </section>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.note)}>{children}</p>;
}

export function TextLink(props: ComponentProps<"a">) {
  return <a {...props} {...stylex.props(styles.link)} />;
}
