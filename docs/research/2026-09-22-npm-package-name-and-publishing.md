# What npm name can the CLI take, and what does publishing it from this monorepo require?

## Findings

`@ultima-systems/cli` is the name to take. The `@ultima` scope is held, `ultima` is taken and npm will not hand it over, and `ultima-cli` is free but unscoped names have to stay unlike every neighbour. `@ultima-systems` mirrors the registry host `ultima.systems`, no one owns it, and one org can hold every later package. Nothing is published yet; ADR 0003 defers any npm package until a consumer needs one, and the spec repeats that for elements.

### Name availability, checked 2026-09-22

| Name | State |
| --- | --- |
| `ultima` | Taken. Two versions, both published 2018-03-23, `latest` 2.1.2, maintainer `mariuxi.caguana`. An Angular CLI scaffold with `@angular/*` dependencies, 25 MB unpacked, no README, no repository, license `COMMERCIAL`, not deprecated. 13 downloads in the last month, 291 in the last year. |
| `@ultima/cli` | 404, but the scope is held: `registry.npmjs.org/-/org/ultima/user` answers `{"ultima":"owner"}` where a free scope answers `{"error":"Scope not found"}`. No `@ultima/*` package appears in registry search. |
| `@ultima-systems/cli` | 404, scope free (`Scope not found`). |
| `@ultimaui/cli` | 404, scope free. Neighbour `ultima-ui` (styled-components React library, published 2026-01-14, user `ultima-ui`) would confuse authorship. |
| `ultima-cli` | 404, free. |

Other neighbours with `ultima` in the name: `@ultimaup/cli` (2020), `ultima-utils`, `ultima-editor`, `ultima-desktop`, `ultima-harness` (2026-04), `ultimaweb` (2026-07). npmjs.com org and user pages return 403 to non-browser clients, so the registry endpoint above is the ownership check.

### Can `ultima` be requested?

No. The disputes page says "npm does not resolve squatting claims on demand. We do not transfer package, organization, or username ownership simply because another user wants the name." A package counts as squatted only "if the package has no genuine function"; this one is a working scaffold. The only path npm acts on is a trademark claim through GitHub's Trademark Policy form, which needs a registration number and a good-faith declaration. Ultima holds no mark, and the GitHub policy treats a name match without confusion as legitimate. There is no waiting-period process any more.

### What the workspace needs

Current conventions: every package is `"private": true`, `"version": "0.0.0"`, `"license": "MIT"`, `"type": "module"`, and exports TypeScript source (`"./src/index.ts"`); `@ultima/ui` has no build. The root pins `pnpm@10.33.0` and `engines.node >=22`; workspaces are `packages/*` and `apps/*`; CI runs Node 22 with `pnpm/action-setup@v4` and `setup-node@v5`. Nothing publishes.

A publishable `packages/cli` needs:

- `private` removed and a real `version`; npm refuses to publish a private package.
- Compiled output. Consumers do not run `--experimental-strip-types`, so `build` emits `dist/` the way `packages/elements` does. Keep source exports for the workspace and use pnpm's `publishConfig` to override `bin`, `main`, `exports`, `types`, and `engines` at pack time.
- `bin` pointing at a file in the package that starts with `#!/usr/bin/env node`; `files` listing `dist/`. `package.json`, README, LICENSE, and `bin` files are always packed.
- `engines.node` set to the Node the code targets; advisory unless the installer sets `engine-strict`.
- `workspace:*` dependencies are rewritten to real versions by `pnpm publish`, so `@ultima/tokens` would have to publish first or be bundled.
- `--access public` on first publish; scoped packages default to restricted.
- A `repository` field matching the GitHub repo, required for provenance, and the package public.
- A release workflow with `permissions: id-token: write` on a GitHub-hosted runner. Trusted publishing needs npm CLI 11.5.1+ and Node 22.14+; Node 22 bundles npm 10.9.8, Node 24 bundles 11.19.0, so the job runs Node 24 or upgrades npm. pnpm 10 `publish` shells out to `npm publish` ("just update the npm CLI"), so OIDC works through it; pnpm 11 publishes natively, so check again on upgrade. Provenance is generated automatically under trusted publishing; otherwise `--provenance`.
- The trusted publisher is configured on npmjs.com after the package exists (org or user, repository, workflow filename, optional environment), so the first release uses a token and later ones use OIDC.
- The `@ultima-systems` org created on npmjs.com before publishing; a free org is enough for public packages.

## Sources

- `npm view ultima --json` and `https://registry.npmjs.org/ultima`: versions, dates, maintainer, dependencies, no repository or README, `COMMERCIAL` license.
- `https://api.npmjs.org/downloads/point/last-month/ultima` and `last-year`: 13 and 291 downloads.
- `npm view` on `ultima-cli`, `@ultima/cli`, `@ultima-systems/cli`, `@ultimaui/cli`, `ultima-systems`: E404.
- `https://registry.npmjs.org/-/org/{ultima,ultima-systems,ultimaui}/user`: `@ultima` held (`{"ultima":"owner"}`), the others `Scope not found`.
- `https://registry.npmjs.org/-/v1/search?text=ultima&size=50`: neighbouring names and publishers.
- https://docs.npmjs.com/policies/disputes/: no on-demand transfers, squatting definition, trademark path only.
- https://docs.github.com/en/site-policy/content-removal-policies/github-trademark-policy: report form fields, legitimate use.
- https://docs.npmjs.com/package-name-guidelines: unscoped names must not confuse authorship.
- https://docs.npmjs.com/cli/v11/configuring-npm/package-json: `bin` shebang, `files` defaults and always-included files, `engines` advisory, `private` blocks publish, scoped name rules.
- https://docs.npmjs.com/creating-and-publishing-scoped-public-packages: scopes belong to a user or org; `--access public`.
- https://docs.npmjs.com/trusted-publishers/: npm 11.5.1+, Node 22.14+, `id-token: write`, GitHub-hosted runners, configuration fields, package must exist first, automatic provenance.
- https://docs.npmjs.com/generating-provenance-statements: `--provenance`, public package, matching `repository`.
- https://pnpm.io/package_json (publishConfig overrides: `bin`, `main`, `exports`, `types`, `engines` since 10.22) and https://pnpm.io/workspaces (`workspace:*` rewritten on publish) and https://pnpm.io/cli/publish (`--access`, `--provenance`, native publish since v11).
- https://github.com/pnpm/pnpm/issues/9812: maintainer, 2025-07-30, pnpm 10 `publish` runs `npm publish` under the hood.
- https://nodejs.org/dist/index.json: v22.23.2 ships npm 10.9.8, v24.21.0 ships npm 11.19.0.
- `package.json`, `packages/{ui,tokens,elements}/package.json`, `pnpm-workspace.yaml`, `.github/workflows/ci.yml`: current conventions.
- `docs/adr/0003-registry-first-distribution.md` and `docs/spec/ultima.md` (Elements, out of scope): npm package deferred until a consumer asks.
