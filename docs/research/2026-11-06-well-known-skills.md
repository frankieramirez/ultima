# What does `npx skills add <url>` read from a site's well-known skills path, and can ultima.systems serve it ahead of the SPA fallback?

Research for [#988](https://github.com/frankieramirez/ultima/issues/988), 2026-11-06. The `skills` CLI was read at the published `v1.7.6` tag (`7a5e920bead4b1039a6d6df5d7e1163b7b09423a`, the npm `latest`); `main` at `d3701c1` changes only error reporting in the well-known provider. The discovery RFC was read at `1bd1167983fa5ac9cd47987710c525308eda1a98` (v0.2.0) and `d9532a1fa4a744a6f7b938721c23f439af272b7c` (v0.1.0). Live endpoints were fetched on this date. Nothing was installed or run.

## Findings

**The CLI reads `index.json`, in one of two schemas, from two paths, and it prefers the newer path.** For `npx skills add https://host` it fetches `https://host/.well-known/agent-skills/index.json` first and `https://host/.well-known/skills/index.json` second. The file name is always `index.json`. When the URL has a path, such as `https://host/docs`, it tries `host/docs/.well-known/...` before the root for each well-known name. The first index that gives at least one installable skill wins. An index is skipped, not treated as an error, when the response is not 2xx, when the body does not parse as JSON, or when it has no `skills` array. That is why the docs site's 200 HTML answer today means "no index here" and not a failure. After all candidates fail, the CLI prints "No well-known skills found; trying direct download..." and tries the URL as a direct `SKILL.md` or archive download.

**Schema v0.2.0 (current, the one to publish).** The index looks like this:

```json
{
  "$schema": "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
  "skills": [
    {
      "name": "ultima-design",
      "type": "skill-md",
      "description": "…",
      "url": "ultima-design/SKILL.md",
      "digest": "sha256:<64 lowercase hex>"
    }
  ]
}
```

- `$schema` must equal that string exactly. The CLI compares it as an opaque string. Any other value makes the CLI drop the whole index, and an absent value means v0.1.0.
- `name`: 1 to 64 characters of `[a-z0-9-]`, with no leading, trailing or doubled hyphen. It becomes the install directory name.
- `type`: `skill-md` (one `SKILL.md`) or `archive` (`.tar.gz` or `.zip` with `SKILL.md` at the archive root, not inside a wrapper directory).
- `description`: non-empty, at most 1024 characters.
- `url`: resolved against the index URL under RFC 3986. A relative `ultima-design/SKILL.md` therefore means `/.well-known/agent-skills/ultima-design/SKILL.md`, and the URL may also be absolute.
- `digest`: `sha256:` plus the SHA-256 of the artifact's raw bytes. The CLI downloads the artifact and rejects it on a mismatch. In 1.7.6 a mismatching entry is dropped, and on `main` the install fails with `SKILLS_WELLKNOWN_DIGEST_MISMATCH`.
- Invalid entries are skipped one at a time, unknown fields are ignored, and the downloaded `SKILL.md` must have string `name` and `description` frontmatter.
- The archive format is detected from `Content-Type`, then from the URL suffix, then from the magic bytes, so a generic content type still works.
- Archive limits are 50 MiB unpacked and 1000 files. Symlinks, hard links, `..` and absolute paths are rejected.

**Schema v0.1.0 (legacy, what `/.well-known/skills/` publishers use).** The index has no `$schema` and holds `{"skills":[{"name","description","files":[…]}]}`.

- `files` is a non-empty list of paths relative to the skill directory, and it must include `SKILL.md`. Paths may not start with `/` or `\` or contain `..`.
- The CLI fetches `/.well-known/skills/<name>/SKILL.md` (that exact case), then each other listed path from `/.well-known/skills/<name>/<path>`. A failed fetch of a supporting file is silently dropped.
- Validation is all or nothing: one bad entry voids the whole index.
- Extra fields are tolerated. React Spectrum's entries carry a `kind` field.

**Versioning: neither schema has a version field.** Change is detected by digest.

- On install, the CLI writes `wellKnownDigest` to the lock: `skills-lock.json` in the project, or `~/.agents/.skill-lock.json` (or `$XDG_STATE_HOME/skills/.skill-lock.json`) for `-g`. The lock also records `sourceUrl`, or `sourceBaseUrl` for global installs.
- For a v0.2.0 entry the lock value is the index's `digest`.
- For a v0.1.0 entry the CLI computes the value itself: SHA-256 over each fetched file, sorted by path, as `path \0 content \0`.
- `npx skills update` re-fetches the index with the header `X-Skills-Update-Check: 1`. For v0.2.0 it compares the index `digest` with the locked one and downloads nothing when they match. For v0.1.0 it must re-download every file to recompute the hash.
- The update run also reports skills that left the index (and prompts to delete them) and new names it could add.
- Publishing a new version therefore means changing the artifact's bytes and its `digest`. The marketplace `version` plays no part on this route.
- A `metadata.internal: true` frontmatter key hides a skill unless internal installs are requested.

**The spec it follows.** This is Cloudflare's "Agent Skills Discovery via Well-Known URIs", which is a draft. Version 0.2.0 (2026-03-12) renamed `/.well-known/skills/` to `/.well-known/agent-skills/`, and it replaced `files` with `type`/`url`/`digest` and `$schema`. The draft is built on RFC 8615. On the server side it requires (MUST):

- `application/json` for the index
- `text/markdown` or `text/plain` for `SKILL.md`
- `application/gzip` or `application/zip` for archives
- support for GET and HEAD
- **404 for files that do not exist**

**The live examples.**
- React Spectrum serves both layouts from S3 and CloudFront.
  - `/.well-known/agent-skills/index.json` is v0.2.0 with three `archive` entries. Each points to a relative `<name>.tar.gz`, served as `application/x-tar`. The `spectrum-audit.tar.gz` bytes hashed to exactly its index digest, with `SKILL.md` at the archive root.
  - `/.well-known/skills/index.json` is v0.1.0 with per-skill `files` lists of 263, 9 and 9 paths. `/.well-known/skills/react-spectrum-s2/SKILL.md` is served as `text/markdown`.
  - A missing path returns a real 404.
- Nord's docs page tells readers to run `npx skills add https://nordhealth.design` and cites the RFC. Today, though, both `/.well-known/agent-skills/index.json` and `/.well-known/skills/index.json` return a JSON 404 from Nord's server, and so does `/.well-known/skills/nord/SKILL.md`. The Wayback Machine has no snapshot. Nord's manifest can't be observed, and its install command would currently find no skills.

**Ultima's host is Cloudflare Pages, not Workers static assets, and a file under `apps/docs/public/.well-known/` would be served as is, ahead of the SPA fallback.**
- No `wrangler.toml` or `wrangler.jsonc` exists in the repository, and no workflow deploys. The spec's Hosting section describes a Git-connected Pages project with output `apps/docs/dist`.
- `build-worker.ts` adds a Pages advanced-mode `_worker.js` and a `_routes.json` with `include: ["/r/theme.json"]`. Every other path never invokes the worker and goes straight to Pages static serving. Even if it did, the worker forwards to `env.ASSETS.fetch`.
- `vite build` copies `public/` with a recursive `readdirSync`/`copyFileSync` that has no dotfile filter (Vite 8.2.4 `copyDir`). The open-source Pages uploader (`wrangler pages deploy`) skips only `_worker.js`, `_redirects`, `_headers`, `_routes.json`, `functions`, `**/.DS_Store`, `**/node_modules`, `**/.git` and `.wrangler`, so `.well-known/` is uploaded.
- Pages serves a matching static asset first. Only "any incoming path that does not correspond to a static asset" gets the root document, and only when the output has no top-level `404.html`. Ultima deliberately has none.
- `_redirects` holds only `/elements.html`, so nothing shadows `/.well-known/*`.
- Today's 200 HTML for `/.well-known/skills/` and `/.well-known/skills/index.json` is that SPA fallback answering for files that don't exist. `/nope.json` gets the same answer.
- Pages derives `Content-Type` from the extension. Live, `.json` is served as `application/json` and `/guides/*.md` as `text/markdown; charset=utf-8`, which matches what the spec requires.
- Pages adds `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=0, must-revalidate` to every response by default. That is why even the fallback HTML carries them, though no `_headers` rule matches. A `/.well-known/*` rule in `_headers` is optional.

**One gap on Pages.** A path Ultima does not publish under `/.well-known/` returns 200 HTML, where the RFC requires a 404. The CLI tolerates this, because the body fails to parse as JSON and the CLI moves on. But if Ultima published only the legacy `/.well-known/skills/`, the CLI's first probe (`/.well-known/agent-skills/index.json`) would get the app shell. Publishing the v0.2.0 index at `/.well-known/agent-skills/` makes the first probe succeed. A 404 for other well-known paths would need a `404.html` under `.well-known/`, or the worker. Pages looks for the nearest `404.html` walking up the directory tree, so a `/.well-known/404.html` might scope 404s to that subtree. The docs only state the "top-level `404.html`" rule for SPA mode, so this would need checking on a preview deploy.

**The difference from the local server.** `apps/docs/scripts/static-server.ts`, which production verification uses, gives the app shell only to extensionless GETs that accept HTML, and gives other missing paths a 404. Live Pages gives HTML even to a missing `.json`. A local test of the well-known files therefore proves that they are present, but not how Pages handles a missing path.

**What a generated copy would be built from.**
- The source is `packages/cli/skill/ultima-design/SKILL.md`: 4150 bytes today, SHA-256 `af7f7be94965f18bec79737aa232c8ac994e33e31a16cb8aca117493bec59d8a`. Its frontmatter has `name: ultima-design` and a `description`, and it has no supporting files.
- `.claude-plugin/marketplace.json` lists one plugin, `ultima-design`. Its `version` is `0.2.0`, its `source` is `./packages/cli/skill` and its `skills` list is `["./ultima-design"]`. `packages/cli/src/__tests__/release.test.ts` pins the plugin name and version to `packages/cli/package.json` (`ultima-design@0.2.0`) and the resolved path to that `SKILL.md`.
- The spec (Skill, 2026-09-26 amendment) says external routes distribute the *unstamped* source. The CLI's `metadata` stamp is added only by `ultima-design install`.
- One `skill-md` entry is the right shape: the RFC says a skill that is only `SKILL.md` SHOULD use `skill-md`, and its digest is the SHA-256 of those exact bytes.
- Like the other generated `public/` outputs (`r/*.json`, `tokens.*`, `llms.txt`, `guides/`), a copy would belong in `.gitignore` and be written during `build`.

## Sources

- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L9: the exact v0.2.0 `$schema` string the CLI matches.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L135: the probe order, `.well-known/agent-skills` then `.well-known/skills`, and the `index.json` file name.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L150: github.com, gitlab.com and huggingface.co are excluded from well-known matching.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L207-L250: path-relative and then root candidates for each well-known name. A non-OK response or a JSON parse error makes the CLI skip that candidate, and update checks send `X-Skills-Update-Check: 1` (L235).
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L273-L320: the v0.2.0 branch, where `url` resolves against the index URL (L280). An unknown `$schema` is rejected (L299), and v0.1.0 validation is all or nothing.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L328-L386: the name rule and the v0.1.0 entry rules, where `files` must include `SKILL.md` and unsafe paths are rejected. The v0.2.0 rules cover the description length (1024), the `type` values and the `sha256:<64 hex>` digest.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L451-L500: the legacy fetch of `/<wellKnownPath>/<name>/SKILL.md` and then each listed file, where a failed file fetch is dropped.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L505-L566: the artifact download, the digest check (L511) and the requirement for `name`/`description` frontmatter.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L607-L640: the first candidate with skills wins, `metadata.internal` skills are filtered out, and a scoped URL won't widen to the root index.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L642-L760: the archive format detection (content type, then suffix, then magic bytes), the size and count limits, and the link and traversal rejection.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/providers/wellknown.ts#L808: `computeWellKnownSkillDigest`, which uses the index digest for v0.2.0 and a sorted `path\0content\0` hash for v0.1.0.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/update.ts#L436-L490: the update check, which compares the index digest for v0.2.0 and re-downloads to rehash for v0.1.0. It also reports removed and new skills.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/add.ts#L903: the fallback to direct download when no well-known skills are found.
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/add.ts#L1258-L1295: the lock entries written for well-known installs (`sourceType`, `sourceUrl`, `wellKnownDigest`).
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/add.ts#L1618-L1645: the lock entries written for well-known installs (`sourceBaseUrl` for global installs).
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/skill-lock.ts#L7: the global lock path, `~/.agents/.skill-lock.json` or `$XDG_STATE_HOME/skills/.skill-lock.json` (L66-L74).
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/local-lock.ts#L5: the project lock, `skills-lock.json`, and its `wellKnownDigest` field (L49).
- https://github.com/vercel-labs/skills/blob/v1.7.6/src/source-parser.ts#L556: any HTTP(S) URL that is not a git host parses as `well-known`.
- `npm view skills`: version 1.7.6 is the latest, with repository `vercel-labs/skills`.
- https://github.com/cloudflare/agent-skills-discovery-rfc/blob/1bd1167983fa5ac9cd47987710c525308eda1a98/README.md: RFC v0.2.0 (Draft, updated 2026-03-12). Its Changelog covers the path rename, Versioning covers the opaque `$schema` (absent means v0.1.0), and Index Format and URL Resolution cover the fields and resolution. Integrity and Verification defines the digest of the raw bytes, Archive Distribution covers the root `SKILL.md` and `.tar.gz`/`.zip`, and HTTP Considerations has the content types and the MUST 404.
- https://github.com/cloudflare/agent-skills-discovery-rfc/blob/d9532a1fa4a744a6f7b938721c23f439af272b7c/README.md: RFC v0.1.0 (the Discovery Index and Files Array sections). It defines the `/.well-known/skills/index.json` `files` model and the path rules, and maps `{name}` to `/.well-known/skills/{name}/SKILL.md`.
- https://react-spectrum.adobe.com/.well-known/agent-skills/index.json: a live v0.2.0 index with three `archive` entries, a relative `url` and a `sha256:` digest.
- https://react-spectrum.adobe.com/.well-known/agent-skills/spectrum-audit.tar.gz: the bytes hashed to the index digest `d566…342a`, it is served as `application/x-tar`, and `SKILL.md` sits at the archive root.
- https://react-spectrum.adobe.com/.well-known/skills/index.json: a live v0.1.0 index with `files` lists and an extra `kind` field. It is served as `application/json` with `max-age=300`, and a missing path returns 404.
- https://nordhealth.design/raw/docs/developer/working-with-ai/skills.md: Nord documents `npx skills add https://nordhealth.design` and cites the RFC.
- https://nordhealth.design/.well-known/skills/index.json and https://nordhealth.design/.well-known/agent-skills/index.json: both return a JSON 404 on 2026-11-06, and `archive.org/wayback/available` has no snapshot.
- https://ultima.systems/.well-known/skills/index.json and https://ultima.systems/nope.json: both return 200 `text/html` (the SPA fallback) with `access-control-allow-origin: *` and `must-revalidate`. `/r/registry.json` is served as `application/json` and `/guides/*.md` as `text/markdown; charset=utf-8`.
- https://developers.cloudflare.com/pages/configuration/serving-pages/ (last updated 2026-10-10): the SPA fallback applies only when there is no top-level `404.html` and only to a path that does not correspond to a static asset. It describes the nearest-`404.html` lookup and the default `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=0, must-revalidate`.
- https://developers.cloudflare.com/pages/functions/routing/: `_routes.json` `include` limits which paths invoke the function, and other paths are served as static assets.
- https://developers.cloudflare.com/pages/functions/advanced-mode/: `_worker.js` serves assets through `env.ASSETS.fetch`.
- https://developers.cloudflare.com/pages/configuration/redirects/: redirects apply whether or not an asset matches.
- https://github.com/cloudflare/workers-sdk/blob/56459a561b7b133a9152b993336e1e5470b1d290/packages/wrangler/src/pages/validate.ts#L60-L70: the Pages upload ignore list, which contains no general dotfile rule.
- https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/: the Workers-assets `not_found_handling: "single-page-application"` behaviour, for reference only, since Ultima is not on Workers assets.
- vite@8.2.4 `dist/node/chunks/node.js` L2440-L2449 and L33736 (the version locked in `pnpm-lock.yaml`): `copyDir(publicDir, outDir)` walks `readdirSync` with no dotfile filter.
- `apps/docs/scripts/build-worker.ts`: writes `_worker.js` and a `_routes.json` with `include: ["/r/theme.json"]`.
- `apps/docs/server/worker.ts`: handles `/r/theme.json` and passes everything else to `env.ASSETS.fetch`.
- `apps/docs/public/_redirects`: holds only the `/elements.html` redirect.
- `apps/docs/public/_headers`: has no `/.well-known` rule and no `Content-Type` rules.
- `apps/docs/package.json` `build`: runs `registry:build`, then `vite build`, then `check-markdown-guidance.ts dist`, then `build-worker.ts`.
- `docs/spec/ultima.md` § Hosting (L2649-L2659): a Git-connected Cloudflare Pages project with output `apps/docs/dist`. It deliberately has no top-level `404.html` and no `_redirects` splat.
- `apps/docs/scripts/static-server.ts` L1-L12 and L100-L157: the local server gives the app shell only to extensionless HTML navigations and gives other paths a 404.
- `.gitignore` L14-L19: the generated `public/` outputs that are not committed.
- `packages/cli/skill/ultima-design/SKILL.md`: the skill source, 4150 bytes, SHA-256 `af7f7be9…d8a`, with only `name` and `description` frontmatter.
- `.claude-plugin/marketplace.json`: the one plugin `ultima-design`, version `0.2.0`, with `source: ./packages/cli/skill` and `skills: ["./ultima-design"]`.
- `packages/cli/src/__tests__/release.test.ts` L18-L33: pins the marketplace version to the CLI version and the skill path, and checks the npm pack contents.
- `docs/spec/ultima.md` § Skill (L3286-L3296): defines the skill source, the marketplace's relation to it, and the rule that external routes ship the unstamped source.
