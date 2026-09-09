// `dist/tokens.json` is build output, so the site must not need it on disk to
// typecheck: CI runs `pnpm typecheck` before it builds the tokens package. Vite
// resolves the real file at build time and fails the build if it is missing.
declare module '@ultima/tokens/tokens.json' {
  import type { TokensJson } from '@ultima/tokens';

  const tokens: TokensJson;
  export default tokens;
}
