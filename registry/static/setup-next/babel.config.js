// Installed by the Ultima setup-next registry item.
// Next.js 16 Turbopack runs Babel automatically when this file exists.
const path = require('node:path');
const ts = require('typescript');

const config = ts.getParsedCommandLineOfConfigFile(path.join(__dirname, 'tsconfig.json'), {}, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic(diagnostic) {
    throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  },
});
const options = config.options;
const aliasRoot = options.baseUrl || options.pathsBasePath || __dirname;
const aliases = Object.fromEntries(
  Object.entries(options.paths || {}).map(([name, targets]) => [
    name,
    targets.map((target) => path.resolve(aliasRoot, target)),
  ]),
);

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
        aliases,
        unstable_moduleResolution: { type: 'commonJS', rootDir: __dirname },
      },
    ],
  ],
};
