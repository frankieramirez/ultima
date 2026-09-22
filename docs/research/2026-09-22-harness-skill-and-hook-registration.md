# How do Claude Code, Codex CLI, Cursor, and GitHub Copilot register a project-local skill and a post-edit hook, and what does impeccable write for each?

Research for [#472](https://github.com/frankieramirez/ultima/issues/472), 2026-09-22. Vendor docs were read on this date; impeccable was inspected at commit `83c2c735777c68e30ea536ab9cc97f7843456945` (2026-09-21). Nothing was installed or run.

## Findings

All four harnesses read the same skill shape: a directory holding `SKILL.md` with YAML frontmatter `name` and `description`, per the Agent Skills spec. Only the directory differs, and `.agents/skills/` is now read natively by Codex, Cursor, and Copilot, while Claude Code reads only `.claude/skills/`. Hooks do not converge: each harness has its own file, its own event names, and its own casing. impeccable ships one skill folder per harness plus a per-harness hook manifest, merges into existing hook files with a marker so re-runs replace only its own entries, and leaves the Codex and Copilot hooks project-local by necessity. `npx skills add` is a real CLI (vercel-labs/skills) that installs into these same directories, but it is a tool, not a harness standard; the standard is the SKILL.md format.

### Claude Code

| | Documented |
| --- | --- |
| Skill dir | Project `.claude/skills/<name>/SKILL.md`; personal `~/.claude/skills/`; nested `<subdir>/.claude/skills/` for monorepos; plugin `<plugin>/skills/`. Legacy `.claude/commands/<name>.md` still works. |
| Frontmatter | `name` (defaults to directory name), `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `paths`, `context: fork`, `model`, `metadata`; `license` and `compatibility` accepted for spec parity. |
| Hook file | `hooks` key in `~/.claude/settings.json` (user), `.claude/settings.json` (project, committed), `.claude/settings.local.json` (project, gitignored), plugin `hooks/hooks.json`, or skill/agent frontmatter. |
| Post-edit event | `PostToolUse` with `matcher: "Edit|Write"`; stdin JSON carries `tool_name` and `tool_input.file_path`. No dedicated pre-write event; `PreToolUse` with the same matcher serves. `Stop` fires at end of turn. |
| Refresh | Skill dirs and settings files are watched; `SKILL.md` and hook edits apply in the current session. Plugin changes need `/reload-plugins`. `/hooks` shows what is loaded. |

### Codex CLI

| | Documented |
| --- | --- |
| Skill dir | `.agents/skills/` in `$CWD` and every parent up to `$REPO_ROOT`; user `$HOME/.agents/skills`; admin `/etc/codex/skills`. Symlinked skill dirs are followed. |
| Frontmatter | `name`, `description`; optional `agents/openai.yaml` beside `SKILL.md` for `interface`, `policy.allow_implicit_invocation`, `dependencies.tools`. |
| Hook file | `<repo>/.codex/hooks.json` or `[hooks]` in `<repo>/.codex/config.toml`; user `~/.codex/hooks.json` or `~/.codex/config.toml`. Enabled by default; `[features] hooks = false` disables. |
| Post-edit event | `PostToolUse` with regex `matcher` (docs give `Edit|Write`, `^apply_patch$`); stdin carries `tool_name`, `tool_input`, `tool_response`. `PreToolUse` covers `apply_patch` for pre-write. `Stop` exists. |
| Refresh | Skill changes are detected automatically, else restart. A non-managed hook runs only after the user trusts its exact definition via `/hooks`; trust is keyed to the hook's hash, so any change to `hooks.json` re-prompts. Project hooks load only when the project `.codex/` layer is trusted. |

Codex also loads `AGENTS.md`, but the docs page for it was not reachable on this date (`learn.chatgpt.com/docs/agents-md` returned 404), so it is not characterised here.

### Cursor

| | Documented |
| --- | --- |
| Skill dir | `.cursor/skills/` and `.agents/skills/` (project); `~/.cursor/skills/` and `~/.agents/skills/` (user). Also reads `.claude/skills/` and `.codex/skills/` for compatibility. Walks the root recursively. |
| Frontmatter | `name` (lowercase, hyphens, must match folder), `description`; optional `paths`, `disable-model-invocation`, `icon`, `color`, `metadata`. |
| Hook file | `<project>/.cursor/hooks.json` with `"version": 1`; user `~/.cursor/hooks.json`; enterprise `/etc/cursor/hooks.json`. |
| Post-edit event | `afterFileEdit` (stdin `file_path`, `edits[]`); `preToolUse`/`postToolUse` generic with matcher; `beforeReadFile`, `stop`, `sessionStart`. Permission hooks block with `allow`/`deny`/`ask` or exit 2. |
| Refresh | Skills discovered at startup. Hook files are watched and reloaded; restart is the fallback. Hooks from every level all run; order Enterprise > Team > Project > User. |

Cursor rules (`.cursor/rules/*.mdc` with `description`, `globs`, `alwaysApply`; `AGENTS.md` as the plain alternative) are a separate instruction channel, not skills.

### GitHub Copilot

| | Documented |
| --- | --- |
| Skill dir | Project `.github/skills/`, `.claude/skills/`, `.agents/skills/`; personal `~/.copilot/skills/`, `~/.agents/skills/`. Works in the cloud coding agent, code review, CLI, VS Code and JetBrains agent mode. |
| Frontmatter | `name` (lowercase, hyphens), `description`; optional `license`, `allowed-tools`. |
| Hook file | `.github/hooks/*.json` in the repo (read from the default branch by the cloud agent); `~/.copilot/hooks/` for the CLI only; policy dirs. Every file's entries run when the same event appears in several. |
| Post-edit event | `postToolUse` with `type: "command"`, `bash`/`powershell`, `cwd`, `timeoutSec`, `env`; optional `matcher` regex compiled as `^(?:PATTERN)$` against `toolName` (`edit`, `create`, `apply_patch`, `bash`). `preToolUse` can return `permissionDecision`. Six events total; no `stop`. |
| Refresh | CLI: `/skills reload` in-session, or `copilot skill add`. `gh skill install|update` (gh 2.90+) manages skills from repos. Cloud agent re-reads the repo per session. |

### What impeccable writes

impeccable's installer is a Rust binary behind an `npx impeccable` shim (`cli/bin/cli.js`). `install` detects harness folders, asks project or global (`--scope=project|global`, `--providers=...`, `--no-hooks`, `--force`), copies one compiled skill folder per provider, then writes a hook manifest for Claude Code, Cursor, Codex, Copilot, and Grok only (`crates/skills/src/hook_manifest.rs`, `provider_hook_artifacts`).

| Harness | Skill written | Hook written | Events in shipped manifest |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills/impeccable/` | `.claude/settings.local.json` (or skipped if `.claude/settings.json` already carries the marker) | `PostToolUse` matcher `Edit|Write`, `Stop` |
| Codex | `.agents/skills/impeccable/` | `.codex/hooks.json` with `commandWindows` sibling | `PostToolUse` matcher `Edit|Write|apply_patch`, `Stop` |
| Cursor | `.cursor/skills/impeccable/` | `.cursor/hooks.json` | `preToolUse` running `hook-before-edit` (a pre-write check) |
| Copilot | `.github/skills/impeccable/` | `.github/hooks/impeccable.json` | `postToolUse` matcher `edit|create|apply_patch` |

Every command is the skill's own `scripts/impeccable` launcher, guarded by `[ ! -f ... ] ||` so a missing skill is a no-op. Claude keeps `${CLAUDE_PROJECT_DIR}`; Copilot uses `$(git rev-parse --show-toplevel)` and is never rewritten to a machine path because it is meant to be committed; Cursor, Claude, Codex, and Grok paths are rewritten to absolute for global installs. Re-running `update` reads the existing manifest, strips entries containing the impeccable marker, appends the fresh ones, and rewrites (`merge_hook_manifests`); invalid JSON aborts unless `--force`, which backs up to `.bak`. Hook consent is recorded in `.impeccable/config.local.json`, which the installer adds to git exclude. The README tells Codex users to reapprove in `/hooks` after every update because trust is per definition.

### The `skills` CLI

`npx skills add <owner/repo>` (vercel-labs/skills, skills.sh) installs a skill directory into each detected agent's directory, defaulting to `.agents/skills/` for Cursor, Codex, and Copilot and `.claude/skills/` for Claude Code, with `-g` for `~/<agent>/skills/`, `--copy` instead of the default symlink, and `npx skills update`. Its README does not describe `skills-lock.json`, though impeccable's repo carries an empty one. It writes no hooks. It is a convenience layered on the Agent Skills spec, which is the only thing the four vendors themselves commit to.

### Facts later tickets will need

- One `SKILL.md` folder at `.agents/skills/<name>/` reaches Codex, Cursor, and Copilot; Claude Code still needs `.claude/skills/<name>/` (or a symlink into it).
- A post-edit hook needs four distinct files and three event spellings: `PostToolUse` (Claude, Codex), `postToolUse` (Copilot), `afterFileEdit` or `preToolUse` (Cursor).
- Codex and Copilot hooks cannot be installed globally into a project: Codex loads project hooks from the trusted `.codex/` layer and rehashes trust; Copilot's cloud agent reads only `.github/hooks/` on the default branch.
- Claude Code's `settings.local.json` is the one gitignored project hook location; every other project hook file is meant to be committed.

## Sources

- https://code.claude.com/docs/en/skills: skill locations, frontmatter fields, live reload of `.claude/skills/`, legacy `.claude/commands/`.
- https://code.claude.com/docs/en/hooks: settings file scopes, JSON shape, event list, `Edit|Write` matcher, `tool_input.file_path`, file-watcher pickup, `/hooks`.
- https://learn.chatgpt.com/docs/build-skills (redirect from developers.openai.com/codex/skills): `.agents/skills` walk to repo root, `$HOME/.agents/skills`, `agents/openai.yaml`, automatic change detection, `$skill-installer`.
- https://learn.chatgpt.com/docs/hooks (redirect from developers.openai.com/codex/hooks): `.codex/hooks.json` and `config.toml` locations, event list, regex matcher, `commandWindows`, stdin fields, hash-based trust via `/hooks`, `[features] hooks = false`.
- https://learn.chatgpt.com/docs/agents-md: returned 404 on 2026-09-22.
- https://cursor.com/docs/context/skills: skill directories including `.claude/skills` and `.codex/skills` compatibility, frontmatter, startup discovery.
- https://cursor.com/docs/agent/hooks: `hooks.json` locations and `version: 1`, full event list, `afterFileEdit` stdin, matcher support, blocking, auto-reload, level precedence.
- https://cursor.com/docs/context/rules: `.cursor/rules/*.mdc` frontmatter and `AGENTS.md` alternative.
- https://docs.github.com/en/copilot/concepts/agents/about-agent-skills: project and personal skill directories, supported surfaces, pointer to the open spec.
- https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills: frontmatter fields, `gh skill` commands.
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills: `/skills reload`, `copilot skill add`.
- https://docs.github.com/en/copilot/reference/hooks-configuration: `.github/hooks/*.json`, `~/.copilot/hooks/` for CLI, six events, `matcher` compiled as `^(?:PATTERN)$`, `permissionDecision`, command fields.
- https://agentskills.io/specification: SKILL.md frontmatter constraints, `name` must match directory, optional `scripts/`, `references/`, `assets/`.
- https://github.com/pbakaus/impeccable README: install and update commands, per-harness paths, hook providers, Codex `/hooks` reapproval note, submodule `link` flow.
- impeccable `crates/skills/src/hook_manifest.rs` at `83c2c73`: `provider_hook_artifacts` (Claude to `settings.local.json`, Codex `.agents` skill with `.codex/hooks.json`, Copilot `hooks/impeccable.json`), `launcher_rel_path`, `merge_hook_manifests`, `copy_provider_hooks`, `set_hook_consent`.
- impeccable `crates/skills/src/providers.rs` at `83c2c73`: provider name to directory map (`codex` to `.agents`, `copilot` to `.github`), `DEFAULT_TARGETS`.
- impeccable `crates/skills/src/commands.rs` at `83c2c73`: `install`, `update`, `link` flags including `--scope`, `--no-hooks`, `--force`.
- impeccable `.claude/settings.json`, `.codex/hooks.json`, `.cursor/hooks.json`, `.github/hooks/impeccable.json` at `83c2c73`: the shipped manifests and their events.
- impeccable `cli/bin/cli.js` at `83c2c73`: the npm shim resolves and executes the platform binary.
- https://github.com/vercel-labs/skills README: `npx skills add`, per-agent directories, `-g`, `--copy` versus symlink, `skills update`; no lockfile documentation.
