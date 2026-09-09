// PROTOTYPE (ULT-8). Installed by the Ultima setup-next registry item.
// Extracts the StyleX CSS into the file that carries the `@stylex;` marker.
const babelConfig = require('./babel.config.js');

module.exports = {
  plugins: {
    '@stylexjs/postcss-plugin': {
      include: [
        'app/**/*.{js,jsx,ts,tsx}',
        'components/**/*.{js,jsx,ts,tsx}',
        'lib/**/*.{js,jsx,ts,tsx}',
      ],
      useCSSLayers: true,
      babelConfig: {
        babelrc: false,
        parserOpts: { plugins: ['typescript', 'jsx'] },
        plugins: babelConfig.plugins,
      },
    },
  },
};
