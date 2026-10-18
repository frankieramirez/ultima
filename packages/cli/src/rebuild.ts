// The registry build's rules from an authored source to its staged text. `scripts/build-registry.ts` stages with them,
// and `update` rebuilds an installed base with them: docs/spec/ultima.md, Update, The installed base.
import { BASE_THEME_MARKER } from './base-theme.ts';
import { withStamp } from './stamp.ts';

/**
 * The `@/registry` specifier a workspace import becomes, which shadcn rewrites to the consumer's
 * aliases on install; undefined for a specifier the build cannot stage, such as a barrel.
 */
export function stagedSpecifier(specifier: string): string | undefined {
  if (specifier.startsWith('@ultima/tokens/')) return `@/registry/ultima/lib/${specifier.slice('@ultima/tokens/'.length)}`;
  if (specifier.startsWith('@ultima/ui/lib/')) return `@/registry/ultima/lib/${specifier.slice('@ultima/ui/lib/'.length)}`;
  if (specifier.startsWith('@ultima/ui/')) return `@/registry/ultima/ui/${specifier.slice('@ultima/ui/'.length)}`;
  return undefined;
}

/** Every `@ultima/*` specifier in the source as its staged one. Throws on one the build cannot stage. */
export function rewriteImports(source: string, file: string): string {
  return source.replace(/(['"])(@ultima\/[^'"]*)\1/g, (_match, quote: string, specifier: string) => {
    const rewritten = stagedSpecifier(specifier);
    if (rewritten === undefined) throw new Error(`${file} imports "${specifier}", a barrel that is never staged; import the module directly`);
    return `${quote}${rewritten}${quote}`;
  });
}

/** `tokens` and `tokens-css` close with the base-theme marker, ahead of the stamp. */
export function withBaseThemeMarker(item: string, text: string, syntax: 'ts' | 'css'): string {
  if (item !== 'tokens' && item !== 'tokens-css') return text;
  return withStamp(text, syntax === 'ts' ? `// ${BASE_THEME_MARKER}` : `/* ${BASE_THEME_MARKER} */`);
}
