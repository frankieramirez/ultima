import type { ComponentProps, ReactNode } from "react";

import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { color, font, space, text } from "@ultima/tokens/tokens.stylex";
import { Separator } from "@ultima/ui";
import { DocumentLayout, type Crumb } from "./document-layout";
import { headings } from "./typography";

const styles = stylex.create({
  page: {
    display: "flex",
    flexDirection: "column",
  },
  lede: {
    color: color["--ult-color-text-muted"],
    fontSize: text["--ult-text-5"],
    lineHeight: font["--ult-font-leading-normal"],
    marginBlockStart: space["--ult-space-5"],
    marginBlockEnd: 0,
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
  kicker: {
    fontFamily: font["--ult-font-mono"],
    fontSize: text["--ult-text-1"],
    letterSpacing: font["--ult-font-tracking-wide"],
    margin: 0,
  },
});

const kickerTones = stylex.create({
  muted: { color: color["--ult-color-text-muted"] },
  subtle: { color: color["--ult-color-text-subtle"] },
});

export function Page({
  title,
  lede,
  breadcrumb = [
    { label: "Documentation", to: "/install" },
    { label: title },
  ],
  index = title !== "Tokens" && title !== "Palette",
  children,
}: {
  title: string;
  lede: ReactNode;
  breadcrumb?: Crumb[];
  index?: boolean;
  children?: ReactNode;
}) {
  return (
    <DocumentLayout breadcrumb={breadcrumb} index={index}>
      <div {...stylex.props(styles.page)}>
        <h1 {...stylex.props(headings.h1)}>{title}</h1>
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
    <section>
      <Separator style={headings.rule} />
      <h2 {...stylex.props(headings.h2)}>{title}</h2>
      {children}
    </section>
  );
}

export function Kicker({
  tone = "subtle",
  style,
  ...props
}: Omit<ComponentProps<"p">, "style"> & {
  style?: StyleXStyles;
  tone?: keyof typeof kickerTones;
}) {
  return <p {...props} {...stylex.props(styles.kicker, kickerTones[tone], style)} />;
}

export function Note({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.note)}>{children}</p>;
}

export function TextLink(props: ComponentProps<"a">) {
  return <a {...props} {...stylex.props(styles.link)} />;
}
