// PROTOTYPE (ULT-8). Installed by the Ultima setup-next registry item.
// Next.js 16 Turbopack runs Babel automatically when this file exists.
const path = require('node:path');

module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      '@stylexjs/babel-plugin',
      {
        dev: process.env.NODE_ENV !== 'production',
        runtimeInjection: false,
        enableInlinedConditionalMerge: true,
        treeshakeCompensation: true,
        aliases: { '@/*': [path.join(__dirname, '*')] },
        unstable_moduleResolution: { type: 'commonJS', rootDir: __dirname },
      },
    ],
  ],
};
