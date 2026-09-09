/**
 * The helper types every Ultima component imports. Components depend on this
 * the way shadcn components depend on `lib/utils`; the registry build stages it
 * so it installs to `@/lib/component.ts`.
 */
import type * as stylex from '@stylexjs/stylex';

/** The only styling escape hatch: StyleX styles merged last, so they win per property. */
export type StyleProp = stylex.StyleXStyles;

/** A Base UI part's props with Ultima's style slot in place of className and style. */
export type PartProps<BaseProps> = Omit<BaseProps, 'className' | 'style'> & { style?: StyleProp };

/** A native element's props with the same treatment, for plain components. */
export type PlainProps<E extends keyof React.JSX.IntrinsicElements> = PartProps<React.ComponentProps<E>>;
