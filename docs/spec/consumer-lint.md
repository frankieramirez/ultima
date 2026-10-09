# StyleX linting in consumer projects

Decided on [Decide the StyleX linting contract for consumer projects](https://github.com/frankieramirez/ultima/issues/730), under [Make Ultima a plug-and-play StyleX design system](https://github.com/frankieramirez/ultima/issues/725). Status: the fragment, walkthrough, setup hand steps and installed proof are implemented ([#756](https://github.com/frankieramirez/ultima/issues/756)); doctor diagnostics are pending. Only the combination under [Compatibility and ownership](#compatibility-and-ownership) is published.

## Coverage and severities

Consumers run the official StyleX ESLint plugin alongside their existing lint rules. StyleX [recommends linting because its compiler can accept invalid styles](https://stylexjs.com/docs/learn/installation/#eslint). Ultima retains its current consumer policy and severity choices.

| Check owner | Default | Responsibility |
| --- | --- | --- |
| `@stylexjs/valid-styles` | Error, with `allowOuterPseudoAndMedia: true` | StyleX validity. The option accepts the namespace-level pseudo-class and `@media` blocks installed components use; without it 0.19.1 rejects them. Mirror the compiler's `styleResolution` when explicitly configured; otherwise retain the plugin default. |
| `@stylexjs/no-unused` | Warning | Unused StyleX declarations. |
| `@stylexjs/valid-shorthands` | Warning | Shorthand advice; fixes require a consumer-reviewed diff. |
| `@stylexjs/no-conflicting-props` | Warning | Conflicts with `stylex.props()` on an element. |
| `@stylexjs/sort-keys` | Off | Ordering remains a project preference. |
| Other upstream rules | Off in the supplied fragment | Existing projects may enable them. Upgrades do not adopt every new rule. |
| `ultima-design doctor` | Existing setup severities; lint gaps advise | Installation checks and bounded lint integration diagnostics. |
| `ultima-design check` | Existing block/advisory split; `--strict` stays optional | Ultima's paint, palette, complete-theme, contrast and control policies. |

The [upstream rule reference](https://stylexjs.com/docs/api/configuration/eslint-plugin) defines options. The supplied fragment adds no `propLimits` or raw-value restrictions. Use normal StyleX import names; wrapper imports require consistent `validImports` options and a coverage fixture. Upstream validity errors remain errors when a related shorthand advisory is a warning. A supported-recipe pass requires effective `valid-styles` severity 2; consumers remain free to choose their own policy.

`check` never invokes ESLint or duplicates its syntax diagnostics. Project hooks retain their existing Ultima commands. Lint success leaves compilation, theme application and browser behavior to their existing checks.

## Compatibility and ownership

The plugin declares no ESLint peer range, so package metadata alone cannot prove compatibility. The decision started from ESLint 9.39.5, `typescript-eslint` 8.71.1 and `@stylexjs/eslint-plugin` 0.19.0. Setup items install the latest StyleX runtime, which was 0.19.1 when the installed fixtures ran on October 9, 2026, so the plugin follows it to 0.19.1. The 0.19.1 plugin also needs `allowOuterPseudoAndMedia` for shipped sources ([#791](https://github.com/frankieramirez/ultima/issues/791)). ESLint's `latest` tag is now 10, so an unpinned install no longer gets ESLint 9.

The published combination is the one every installed fixture passed:

| Fixture | ESLint | typescript-eslint | `@stylexjs/eslint-plugin` / `@stylexjs/stylex` | TypeScript | Framework |
| --- | --- | --- | --- | --- | --- |
| Vite, create-vite 9.2.1, minimal config | 9.39.5 | 8.71.1 | 0.19.1 / 0.19.1 | 6.0.3 | Vite 8.3.4, oxlint 1.87.0 kept |
| Next root `app`, create-next-app 16.4.0 `--eslint` | 9.39.5 | 8.71.1 (through `eslint-config-next` 16.4.0) | 0.19.1 / 0.19.1 | 5.9.3 | Next 16.4.0 |
| Next `src/app`, create-next-app 16.4.0 `--eslint` | 9.39.5 | 8.71.1 (through `eslint-config-next` 16.4.0) | 0.19.1 / 0.19.1 | 5.9.3 | Next 16.4.0 |

Each report records the exact Node, npm and framework versions it ran with. The proof treats ESLint outside major 9, `@typescript-eslint/parser` outside major 8, or a plugin version that differs from the installed `@stylexjs/stylex` as an unverified combination, which leaves the result incomplete.

| Consumer | Delivery and owner | Required proof |
| --- | --- | --- |
| Vite React TypeScript | create-vite 9 ships oxlint and no ESLint, so Vite follows the no-ESLint row: setup links a lint hand step, and the consumer installs the pins and creates the minimal config | Keep the scaffold's oxlint `lint` script; lint installed and authored files. A Vite project that already has ESLint follows the existing-config row. |
| Next App Router with ESLint, root or `src/app` | Consumer appends the fragment after framework configuration | Preserve Next rules and parser; prove both layouts. |
| Supported layout without ESLint | Consumer explicitly installs dependencies and creates the minimal config below | Missing lint advises in doctor and leaves lint proof incomplete. |
| Existing ESLint 9 flat config | Reuse its parser and merge the StyleX fragment | Preserve unrelated rules and ignores; resolve duplicate plugin registrations manually. |
| ESLint 8 legacy config, ESLint 10 or custom integration | Preserve the project; doctor names the unverified combination and links the recipe | Migration or a compatibility extension requires separate fixtures. Never silently downgrade or rewrite configuration. |
| Token-CSS or plain custom-element host without StyleX source | Lint is not applicable; record why | Retain applicable Ultima and browser checks. |

Ship a hosted copyable recipe in the install walkthrough ([`/install#stylex-lint`](https://ultima.systems/install#stylex-lint)) and a downloadable `ultima.eslint.mjs` fragment (`apps/docs/public/ultima.eslint.mjs`, served at `https://ultima.systems/ultima.eslint.mjs`) containing plugin registration and explicit rules. The copied fragment is consumer-owned. Setup items link it; they do not install ESLint into every existing project or write `eslint.config.*`. A future bootstrap can include the same recipe after its decision settles the write set. CLI `install` retains its existing managed skill/hook write set. Updates offer a diff for consumer adoption.

Publish only combinations that pass installed fixtures. Start with the candidate pins above and align the StyleX plugin with the validated runtime/compiler release. Keep ESLint/parser compatibility separate from the StyleX same-version assertion. Dependency upgrades rerun fixtures before changing the table. An unsupported combination advises with installed and tested versions; it never implies a pass or changes dependencies automatically.

## Consumer configuration

This complete minimal example is for a project without ESLint configuration, saved beside the downloaded `ultima.eslint.mjs`. The Vite fixture lints with these exact bytes. Existing projects import only `ultimaStylex` from the downloaded file, keep their parser/global ignores, and append the fragment to their config array. If `@stylexjs` is already registered, reuse its plugin object and merge the rules instead of registering another object under that name. Place explicit consumer overrides afterward and inspect the effective result.

```js
// ultima.eslint.mjs, the downloaded fragment (its header comment is omitted here)
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
```

```js
// eslint.config.mjs, project without existing lint configuration
import tseslint from 'typescript-eslint';
import { ultimaStylex } from './ultima.eslint.mjs';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/out/**', '**/coverage/**'] },
  {
    files: ultimaStylex.files,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  ultimaStylex,
];
```

For create-next-app's config, import `ultimaStylex` and put it right after `...nextTs`, before `globalIgnores`. Registering `@stylexjs` again from the same `@stylexjs/eslint-plugin` import is the same object, which ESLint accepts.

[ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files) supplies file matching, global ignores and composition. [TypeScript ESLint](https://typescript-eslint.io/getting-started/) supplies the parser. This recipe needs syntax parsing only; it adds no typed-lint project service or general TypeScript rule preset. Include installed components, token `.stylex.ts` files, generated theme modules and authored code; exclude build output. In a monorepo, compose and run from the consuming package root.

For an absent lint installation, install the published pins. Existing projects add only missing compatible dependencies and preserve their lockfile choices; a create-next-app project with ESLint adds only `@stylexjs/eslint-plugin@0.19.1`. Install and pin the CLI separately through its existing documented path.

```sh
pnpm add -D --save-exact eslint@9.39.5 typescript-eslint@8.71.1 @stylexjs/eslint-plugin@0.19.1
pnpm exec eslint --print-config src/main.tsx
pnpm exec eslint .
pnpm exec ultima doctor
pnpm exec ultima check
```

For Next, probe `app/page.tsx` or `src/app/page.tsx`. Also probe installed token and theme paths. Verify the parser, severity and inclusion; an ignored required file is incomplete coverage. Add `"lint": "eslint ."` only if no lint script exists. Preserve an existing script and verify it covers these files; when it runs another linter, such as create-vite's oxlint, run ESLint after it (`"lint": "oxlint && eslint ."`). Local and CI run `pnpm run lint` once, followed by local `doctor` and `check`. Avoid running a second StyleX lint over the same files. npm users can run `npx --no-install eslint .` and `npx --no-install ultima-design doctor` / `check` after local installation.

ESLint exits 0 for a completed run without errors, 1 for lint errors, and 2 for configuration/execution failure. Warnings alone do not fail the supplied gate; do not add `--max-warnings 0`. Consumers can keep their stricter CI policy. Supplied CI commands never use `--fix`; review autofix diffs locally. After installation, all commands use local packages and the lockfile and must run with network access denied. Missing executables, parse failures and skipped required files cannot count as a pass.

## Doctor diagnostics

A later CLI ticket adds bounded lint diagnostics for dependency absence, version mismatch and config presence, with the exact repair step and recipe link. Doctor reads files and resolved versions only. It never imports or evaluates ESLint config, installs packages, edits scripts, or runs consumer code. A string mentioning the plugin cannot prove effective TSX rules. Mark effective configuration `unverified` and point to local print-config and lint commands.

An absent applicable integration advises: `StyleX lint is not configured; syntax validation remains unverified`. A custom integration names what doctor could not determine. Preserve existing setup and policy exit behavior. Reports distinguish setup from StyleX lint: static detection can report `detected`, never an executed lint pass. The proof runner requires a complete lint result independently and records commands, versions, selected files and upstream rule IDs. ESLint supplies file/location diagnostics; execution failures identify the missing dependency or configuration step.

## Verification and delivery

Extend the existing [installed consumer proof](consumer-proof.md) and smoke fixtures. Lint once per immutable Vite, Next root and Next src build before production compilation, reusing the result across modes and browsers. Preserve the accepted 54-cell support matrix and its browser assertions.

`scripts/consumer-lint.ts` implements this as the runner's `lint` exercise: `node --experimental-strip-types scripts/consumer-proof.ts --layout <vite|next-app|next-src> --delivery-path css --exercise lint`, registered as the `consumer-lint-<layout>` verifier checks and the `lint` job of the Installed consumer proof workflow. It is one exercise per layout and starts no browser, so the rendered cells never repeat it. Next scaffolds keep create-next-app's ESLint (`--eslint`) only for this exercise; every other run scaffolds with `--no-eslint`. On top of the CSS-delivery scene, it installs every `registry:ui` and `registry:block` item, downloads the fragment from the loopback host, and installs the pins. It writes the generated StyleX theme module and a semantic fixture. Then it runs fifteen cases: `config`, `catalogue`, `invalid-property`, `palette-constant`, `raw-paint`, `warning-only`, `composition`, `no-eslint`, `missing-plugin`, `incompatible-package`, `bad-config`, `ignored-tsx`, `severity-override`, `offline` and `compile`. Every lint and CLI command after installation runs with the network denied, in an `unshare -rn` network namespace where the host allows one, and always behind a Node preload that throws on any non-loopback socket. A control `fetch` must fail. Custom-element items carry no StyleX source and are not linted.

| Fixture | Required observation |
| --- | --- |
| Semantic-token styles, responsive conditions, dynamic styles and a full generated theme | Lint and Ultima checks pass; extraction and rendered proof still run. |
| Invalid StyleX property, such as `colro`, with otherwise policy-safe code | `valid-styles` error and lint exit 1; Ultima policy has no corresponding block. Retain the exact observed upstream diagnostic. |
| Valid StyleX reading an Ultima palette constant in application code | StyleX validity passes; Ultima palette policy blocks. |
| Valid raw paint in application code | StyleX validity passes; existing Ultima advisory and optional strict failure remain. |
| Unused declaration or shorthand advisory | Warning-only lint exits 0; a validity error in the same file still exits 1. |
| Existing React/Next rules, custom ignores and prior StyleX registration | Composition preserves effective config; unrelated lint errors still fail the project command. |
| No ESLint, missing plugin, incompatible package, bad config, ignored TSX or later severity override | Doctor advises; proof fails or records incomplete coverage. Cover both Next layouts and Vite without lint. For Next, "no ESLint" means no `eslint.config.*`; for Vite it means no ESLint package, before installation. |
| Offline installed project and repeated diagnostics | Commands run without network; tree snapshots prove doctor/check leave files unchanged. |

Assert each supplied rule and effective configuration for application, installed component and token/theme paths. Lint positive installed catalogue sources before recommending the recipe. If upstream rejects a shipped pattern, investigate and retain the failure. A justified exception names a narrow source pattern; blanket exclusion of installed Ultima code is forbidden. Reports record expected/executed cases, dependency locks and source/registry identity. Skipped fixtures or missing output leave the recommendation incomplete.

Later build tickets deliver the hosted/downloadable recipe and install examples; setup hand steps and regenerated metadata; doctor diagnostics and bundled compatibility data; hosted agent-guide and pointer-skill guidance; then positive/negative installed proof. `packages/analysis` keeps its accepted policies. Use catalogue/registry generators when descriptors change. The map's delivery-order decision assigns this work alongside bootstrap and first-screen proof. Theme Studio's draft/export formats need no change.
