// Installed by the Ultima setup-next registry item.
// Extracts the StyleX CSS into the file that carries the `@stylex;` marker.
const babelConfig = require('./babel.config.js');

module.exports = {
  plugins: {
    '@stylexjs/postcss-plugin': {
      cwd: __dirname,
      include: ['**/*.{js,jsx,ts,tsx}'],
      exclude: ['**/node_modules/**', '**/.next/**', '**/.git/**'],
      useCSSLayers: true,
      babelConfig: {
        babelrc: false,
        parserOpts: { plugins: ['typescript', 'jsx'] },
        plugins: babelConfig.plugins,
      },
    },
  },
};
