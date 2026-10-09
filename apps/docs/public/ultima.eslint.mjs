// Ultima's StyleX lint fragment for an ESLint 9 flat config: https://ultima.systems/install#stylex-lint
// Save it beside eslint.config.mjs; you own it from then on. Append `ultimaStylex` to your config array
// after your framework's configuration, and put your own overrides after it.
// Tested with eslint 9.39.5, typescript-eslint 8.71.1 and @stylexjs/eslint-plugin 0.19.1.
import stylex from '@stylexjs/eslint-plugin';

export const ultimaStylex = {
  name: 'ultima/stylex',
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  plugins: { '@stylexjs': stylex },
  rules: {
    '@stylexjs/valid-styles': ['error', { allowOuterPseudoAndMedia: true }],
    '@stylexjs/no-unused': 'warn',
    '@stylexjs/valid-shorthands': 'warn',
    '@stylexjs/no-conflicting-props': 'warn',
    '@stylexjs/sort-keys': 'off',
  },
};
