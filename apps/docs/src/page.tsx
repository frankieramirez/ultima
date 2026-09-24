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
    { label: "Install", to: "/install" },
    { label: title },
  ],
  index = true,
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
      {/* The id is the anchor `ultima check` links a finding to, such as /tokens#color. */}
      <h2 id={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")} {...stylex.props(headings.h2)}>
        {title}
      </h2>
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

export { TextLink } from "./text-link";
