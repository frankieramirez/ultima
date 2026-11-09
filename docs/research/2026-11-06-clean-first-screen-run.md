# Which flags let a first-screen run load the project's own skill and hooks and nothing from the machine, and how does the run prove what loaded and fired?

Research for [#987](https://github.com/frankieramirez/ultima/issues/987), 2026-11-06. Claude Code docs at code.claude.com were read on this date, and the local CLI is Claude Code 2.1.319 (`claude --help`). Codex docs at learn.chatgpt.com (redirected from developers.openai.com/codex) were read on this date. The Codex source is `openai/codex` at `2889d8e1bf564af2ed3a72dc929b583551561363` (2026-11-06), and npm's latest `@openai/codex` is 0.167.0. Nothing was run against a model. The experiments listed at the end would settle what the docs leave open.

## Findings

### The answer

Drop `--safe-mode`. It turns off skills and hooks, so an installed arm cannot use it. `--bare` and `--restricted` don't work either. The documented way to load the project's skill and hooks and nothing else has four parts:

1. Start Claude Code **in the application root**, the directory where `ultima-design install --harness claude` wrote `.claude/`. Claude Code reads hooks from the `.claude/settings.json` of the primary working directory only, with no parent fallback and no subdirectory discovery.
2. Pass `--setting-sources project`, so user and local settings, user CLAUDE.md and rules, and user skills, commands and agents don't load.
3. Point `CLAUDE_CONFIG_DIR` at a new empty directory. `~/.claude.json`, auto memory, installed plugins, synced claude.ai skills and credentials all live under it, and `--setting-sources` doesn't cover `~/.claude.json` or auto memory.
4. Pass `--strict-mcp-config` with no `--mcp-config`, plus `disableBundledSkills: true` and `autoMemoryEnabled: false` in `--settings`.

Authenticate the new config directory with `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) or `ANTHROPIC_API_KEY`. Two things still load, and the run can't turn them off: managed policy, and the project's own CLAUDE.md or AGENTS.md together with any CLAUDE.md in the directories above the cwd.

For proof, add `--include-hook-events` and `--debug-file`:

- `system/init` lists the loaded skills, plugins and MCP servers.
- A `Skill` tool_use records the skill's invocation.
- `system/hook_started` and `system/hook_response` events record each PostToolUse run.
- The debug log names the exact hook command and its exit status.

Codex can load the project `.codex/` layer the same way: trust the project with a `-c` override, pass `--dangerously-bypass-hook-trust`, and use a clean `CODEX_HOME` and `HOME`. But `codex exec --json` drops hook events, so a Codex run needs another channel to prove its hook fired.

### Why the current executor cannot be the installed arm

`scripts/first-screen.ts` runs `claude -p <prompt> --safe-mode --strict-mcp-config --no-chrome --permission-mode auto --output-format stream-json --verbose --settings '{"permissions":{"deny":[...]}}'`. It starts in `<run>/work`, an empty directory, and strips every `CLAUDE*` variable from the environment (`scripts/first-screen.ts`, `exercise`). The docs rule out each flag the ticket names, for these reasons:

| Flag | What it does to an installed arm |
| --- | --- |
| `--safe-mode` | CLAUDE.md, skills, plugins, hooks, MCP servers, custom commands and agents, and auto memory don't load. Managed policy, including policy hooks, still applies. Sets `CLAUDE_CODE_SAFE_MODE=1`. So the project's skill and hook can't load. |
| `--bare` | Skips hooks, skills, plugins, MCP, auto memory and CLAUDE.md. "Hooks still don't run in bare mode when you pass them with `--settings`." Skills load only from an `--add-dir` folder, and the model "doesn't get the list of available skills". It needs `ANTHROPIC_API_KEY` or `apiKeyHelper`. So the hook can't load, and the skill isn't advertised. |
| `--restricted` | Removes Bash and the other code-running tools, and ignores user, project and local settings files. So the project's hook isn't read, and the agent can't run the CLI. |
| `--setting-sources project` | Loads project `settings.json` and hooks, project CLAUDE.md and rules, and project skills, commands and subagents. User and local sources stay out. This is the flag to use. |
| `--strict-mcp-config` | "Only use MCP servers from `--mcp-config`." With no `--mcp-config`, no servers load, which covers `.mcp.json`, `~/.claude.json` and claude.ai connectors. Keep it. |

The working directory matters as much as the flags:

- `ultima-design init` does not install agent files into a new project. `planAgents` skips agent setup with reason `nested` or `no-git` unless the Git root is the application root. It prints the step `npm exec --no -- ultima install --harness claude` instead (`packages/cli/src/agents.ts`).
- If an agent that started in `<run>/work` runs that step, install writes `<run>/work/larder/.claude/settings.json`.
- Claude Code never reads that file. "Hooks and other `.claude/settings.json` keys load from the current working directory's `.claude/` folder with no parent-directory fallback" (permissions, *Where output styles, hooks, and local settings load from*). "Claude Code reads the shared `.claude/settings.json` from the session's primary working directory" (settings, *Where Claude Code keeps the local file in a git repository*).
- The skill at `larder/.claude/skills/` is a nested skill. It loads only "the first time Claude reads or edits a file in that subdirectory". It isn't in `system/init` (skills, *Load skills in monorepos and subdirectories*).
- Only the user-typed `/cd` or `/add-dir` changes this, and neither is available to `-p`.

So an installed arm has to prepare the project before the agent starts:

1. Run `init`.
2. Run `git init` in the application root.
3. Run `install --harness claude`.
4. Launch `claude` with `cwd` set to the application root.

If the arm instead has the agent run `install` after starting in the application root, the docs say a project `.claude/settings.json` created mid-session loads, "even when you create the folder in the same session" (settings, *When edits take effect*). A project skills directory that didn't exist at startup needs `/reload-skills`, though, which `-p` can't send (skills, *Edit a skill during a session*). Preparing the project first avoids both problems.

### What each remaining source is, and what keeps it out

| Source | Where it comes from | Kept out by | Notes |
| --- | --- | --- | --- |
| User settings, hooks, permissions | `~/.claude/settings.json` | `--setting-sources project`; empty `CLAUDE_CONFIG_DIR` | |
| Local settings | `.claude/settings.local.json` (may sit at the repository root), `CLAUDE.local.md` | `--setting-sources project` (leaves out `local`) | install doesn't write either one |
| User CLAUDE.md and rules | `~/.claude/CLAUDE.md`, `~/.claude/rules/` | `--setting-sources project`; empty `CLAUDE_CONFIG_DIR` | |
| CLAUDE.md above the cwd | every parent directory up to `/` (project source) | **not** by `--setting-sources project` | A `~/CLAUDE.md` in the home directory itself loads while the run lives under `~/.cache`. Put the run outside `$HOME`, set `claudeMdExcludes` in `--settings`, or set `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`. That variable also drops the project's own CLAUDE.md. |
| Project CLAUDE.md or AGENTS.md | the app's own files | not kept out (it's the project's own) | Claude reads `AGENTS.md` only when no CLAUDE.md exists in or above the cwd. `InstructionsLoaded` doesn't fire for an AGENTS.md read directly. |
| Auto memory | `$CLAUDE_CONFIG_DIR/projects/<project>/memory/` | empty `CLAUDE_CONFIG_DIR`; `autoMemoryEnabled: false` or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` | `settingSources` doesn't control it |
| `~/.claude.json` (user MCP servers, trust, global config) | `$CLAUDE_CONFIG_DIR/.claude.json` | empty `CLAUDE_CONFIG_DIR` | "Always read" regardless of `settingSources` |
| User skills, commands, agents | `~/.claude/skills/`, `commands/`, `agents/` | `--setting-sources project`; empty `CLAUDE_CONFIG_DIR` | |
| Synced claude.ai skills and plugins | `~/.claude/skills/synced/`, plugin sync | `--setting-sources` without `user`; `CLAUDE_CODE_OAUTH_TOKEN` auth; empty `CLAUDE_CONFIG_DIR` | Skills synced earlier "stay on disk" and load later, so the clean directory is what removes them |
| Bundled skills (`/code-review`, `/loop`, `/doctor` and others) | Claude Code itself | `disableBundledSkills: true` in `--settings`, or `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1` | Also hides `/init` and the other built-in commands from the model |
| Installed and marketplace plugins | `$CLAUDE_CONFIG_DIR/plugins`, `enabledPlugins` | empty `CLAUDE_CONFIG_DIR`; `user` left out of `--setting-sources` | A project `.claude/settings.json` can enable plugins. install writes only `hooks`. |
| MCP servers (`.mcp.json`, user, claude.ai connectors) | project, `~/.claude.json`, account | `--strict-mcp-config` with no `--mcp-config` | Belt and braces: `ENABLE_CLAUDEAI_MCP_SERVERS=false` |
| Managed policy | `/etc/claude-code/` (Linux), `/Library/Application Support/ClaudeCode/` (macOS), MDM, server-managed for org credentials | cannot be turned off | Record it: check the run machine has no managed files, and use a non-org token. Server-managed settings are fetched for org OAuth logins and direct API keys. |
| Workspace trust | `-p` shows no trust dialog | n/a | Under `-p`, project hooks run untrusted. Project `permissions.allow` rules do not apply and print a stderr warning. install writes no allow rules. |

Sources: Agent SDK *What settingSources does not control* and the `settingSources` table; settings *Find or create your settings files*; env-vars; skills *Bundled skills* and *Skills synced from claude.ai*; plugins/loading *Sign-in requirements for terminal sync*; memory *How CLAUDE.md files load* and *AGENTS.md*; permissions *What runs before you trust a folder*; managed-settings.

### Recommended Claude Code invocation for the installed arm

This assumes the project was prepared before launch: `init`, then `git init` in the app root, then `install --harness claude`. That leaves `larder/.claude/skills/ultima-design/SKILL.md` and `larder/.claude/settings.json` with one `PostToolUse` entry. The entry has `matcher: "Edit|Write"` and runs `cd "$CLAUDE_PROJECT_DIR" && npx --no-install ultima-design hook claude 2>/dev/null || true` with a 30-second timeout (`packages/cli/src/install.ts`, `hookEntry`).

```bash
# after the runner strips CLAUDE* from env, set these again:
CLAUDE_CONFIG_DIR="$RUN/claude-config"      # new, empty directory
CLAUDE_CODE_OAUTH_TOKEN="<from claude setup-token>"   # or ANTHROPIC_API_KEY
CLAUDE_CODE_DISABLE_AUTO_MEMORY=1
ENABLE_CLAUDEAI_MCP_SERVERS=false

cd "$RUN/work/larder"     # the application root and its git root
claude -p "$PROMPT" \
  --setting-sources project \
  --strict-mcp-config \
  --no-chrome \
  --permission-mode auto \
  --output-format stream-json --verbose \
  --include-hook-events \
  --debug-file "$RUN/claude-debug.log" \
  --settings '{"permissions":{"deny":[...same as today...]},"disableBundledSkills":true,"autoMemoryEnabled":false}'
```

Keep session persistence on: don't pass `--no-session-persistence`. The session JSONL under `$CLAUDE_CONFIG_DIR/projects/` saves each hook's injected `additionalContext` (hooks, *Add context for Claude*), so it is a second record. Its format is not documented.

### How a Claude run proves what loaded and fired

1. **What loaded.** The `system/init` event carries these fields (SDK `SDKSystemMessage`; headless *Read session metadata*):
   - `claude_code_version`, `cwd`, `apiKeySource` and `permissionMode`.
   - `skills`, which lists the user-invocable skills, bundled ones included.
   - `slash_commands` and `plugins`, plus `plugin_errors` when a plugin fails.
   - `mcp_servers`, plus `mcp_server_errors` when an entry is skipped.

   For a clean run, assert that `cwd` is the app root, `skills` is exactly `["ultima-design"]`, `plugins` is `[]`, `mcp_servers` is `[]` and no `*_errors` key is present. The ultima-design skill has a `description` and doesn't set `user-invocable: false` (`packages/cli/skill/ultima-design/SKILL.md`), so it belongs in `skills` (agent-sdk/skills *Confirm skills loaded*).
2. **That the skill was used.** Look for an assistant `tool_use` block named `Skill` that names `ultima-design`, followed by its `tool_result`. The rendered SKILL.md enters the conversation as a single message (skills *Skill content lifecycle*). A `Read` or `Bash cat` of `.claude/skills/ultima-design/SKILL.md` also counts as reading it. The SDK reference doesn't give the Skill tool's input field name.
3. **That the hook fired.** `--include-hook-events` adds `system/hook_started`, `hook_progress` and `hook_response` events (cli-reference; SDK `SDKHookStartedMessage` and `SDKHookResponseMessage`). Each response carries `hook_id`, `hook_name`, `hook_event`, `stdout`, `stderr`, `exit_code` and `outcome`.
   - Match each `Edit` or `Write` tool_use to a `hook_event: "PostToolUse"` started/response pair with `exit_code: 0`.
   - When the hook found something, `stdout` is `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Fix before handing work back: …"}}` (`packages/cli/src/hook.ts`, `renderHookOutput`). Otherwise it is empty.
   - Install writes the only hook, so the run should contain no other `hook_event`.
4. **Which command ran.** `--debug-file` writes one line per command hook in v2.1.296 or later: `Hooks: PostToolUse:Write [<command>] finished with status 0 (<n>ms)` (hooks *Debug hooks*). The bracketed command ties each run to `npx --no-install ultima-design hook claude`. A line with another command is a leak.

Some cases these checks cannot separate:

- **A clean edit and a failed command look the same.** The managed command ends in `2>/dev/null || true`, and `hook` exits 0 and prints nothing when it finds nothing (`packages/cli/src/hook.ts`). So exit 0 with empty stdout also covers `npx --no-install` failing to find `ultima-design`. Three ways to separate them:
  - require at least one response whose stdout carries findings;
  - after the run, replay a recorded `Write` payload into `npx --no-install ultima-design hook claude` in the finished app;
  - add a product-side breadcrumb, such as an environment-variable log path the `hook` command appends to. That would be a CLI change for a later ticket.
- **Shell edits don't fire the hook.** Edits made through Bash (`shadcn add`, `sed`, heredocs) match no `Edit|Write` hook. Count only `Edit` and `Write` tool_uses when matching hook runs.
- **CLAUDE.md loads leave no stream event.** To prove which instruction files loaded, add an `InstructionsLoaded` observer hook in `--settings` that appends its stdin (`file_path`, `memory_type`, `load_reason`) to a run file. That observer is harness instrumentation, not a project hook, and the record has to say so. `InstructionsLoaded` misses an AGENTS.md read directly (hooks *InstructionsLoaded*).

### Codex

Codex can load the project layer in the same way, but the trust model differs and the proof channel is weaker.

- **Where install writes.** `install --harness codex` writes `.agents/skills/ultima-design/SKILL.md` and `.codex/hooks.json`. The hook is a `PostToolUse` entry with matcher `Edit|Write|apply_patch` and command `cd "$(git rev-parse --show-toplevel)" && npx --no-install ultima-design hook codex 2>/dev/null || true` (`packages/cli/src/install.ts`). That command needs the app to be a Git repository.
- **The project must be trusted.** Project `.codex/` layers, which hold project config, hooks and rules, load only when the project is trusted (config-basic *Configuration precedence*; hooks *Where Codex looks for hooks*).
  - In source, an untrusted project and a project with no trust entry are treated the same. Both get the reason "To load project-local config, hooks, and exec policies, add … as a trusted project" (`codex-rs/config/src/loader/mod.rs`, `disabled_reason_for_decision`).
  - Trust is read from the merged user layers **plus the `-c` overrides layer** before the project layers are chosen (`load_config_layers`, `project_trust_context`). So a CLI override can grant trust.
  - The override path is split on every `.` (`codex-rs/config/src/overrides.rs`, `apply_toml_override`). A path such as `~/.cache/...` therefore breaks `-c 'projects."<path>".trust_level=…'`. Pass the whole table instead: `-c 'projects={"/abs/larder"={trust_level="trusted"}}'`.
- **Each hook must be trusted.** Codex also requires per-hook trust keyed to the hook's hash. `--dangerously-bypass-hook-trust` runs enabled hooks without persisted trust for one invocation (hooks *Review and trust hooks*; cli reference, `codex exec`).
- **The machine layers have their own switches.**
  - `--ignore-user-config` skips `$CODEX_HOME/config.toml`, but authentication still uses `CODEX_HOME` (non-interactive mode; cli reference).
  - User skills come from `$CODEX_HOME/skills` and `$HOME/.agents/skills` (`codex-rs/exec-server/src/discoverV2/capability_locations.rs`; build-skills *Where Codex loads local skills*). So a clean run needs a new `CODEX_HOME` **and** a new `HOME`.
  - Bundled system skills turn off with `[skills.bundled] enabled = false`. The docs place that key in a trusted project `.codex/config.toml`. A `-c skills.bundled.enabled=false` override should land in the same merged config, but the docs don't say so.
  - System config `/etc/codex/config.toml`, admin skills `/etc/codex/skills`, `requirements.toml` and cloud-managed config still apply.

Recommended invocation, from the app root, with `CODEX_HOME="$RUN/codex-home"` and `HOME="$RUN/home"` both new, and `CODEX_API_KEY` set:

```bash
codex exec --json --sandbox workspace-write \
  --ignore-user-config --dangerously-bypass-hook-trust \
  -c 'projects={"'"$PWD"'"={trust_level="trusted"}}' \
  -c 'skills.bundled.enabled=false' \
  "$PROMPT"
```

Proving what fired in Codex:

- **The skill.** Codex has no skill-invocation item in `--json`. Its implicit-invocation detection watches commands that read a skill's SKILL.md (`codex-rs/core/src/skills.rs`, `maybe_emit_implicit_skill_invocation`). So the proof is a `command_execution` item that reads `.agents/skills/ultima-design/SKILL.md`. A `$ultima-design` mention in the prompt is an explicit invocation.
- **The hook.** `codex exec --json` drops `HookStarted` and `HookCompleted` (`codex-rs/exec/src/event_processor_with_jsonl_output.rs`), and the rollout file doesn't persist them (`codex-rs/rollout/src/policy.rs`). Three other channels show it:
  - Human-format `codex exec` prints `hook: PostToolUse <status>` to stderr (`event_processor_with_human_output.rs`).
  - `codex app-server` sends `HookStarted` and `HookCompleted` notifications whose `HookRunSummary` carries `event_name`, `source_path`, `scope`, `status` and `duration_ms` (`codex-rs/protocol/src/protocol.rs`).
  - The product-side breadcrumb described above.
- **The edits.** Edits made with `apply_patch` appear as `file_change` items, and the matcher covers them.

### Facts later tickets will need

- An installed arm can't start in the empty `work/` directory. Claude Code reads hooks only from `<cwd>/.claude/settings.json`, and `init` doesn't install agent files into a new project, so the run has to start in a prepared application root that is its own Git root.
- `--safe-mode`, `--bare` and `--restricted` all prevent the project hook from loading. The clean combination is `--setting-sources project`, an empty `CLAUDE_CONFIG_DIR`, `--strict-mcp-config`, and `disableBundledSkills` and `autoMemoryEnabled: false` in `--settings`.
- The runner deletes every `CLAUDE*` variable, so it has to set `CLAUDE_CONFIG_DIR` and `CLAUDE_CODE_OAUTH_TOKEN` afterwards. A clean config directory has no stored login.
- A `CLAUDE.md` in any directory above the cwd, including `$HOME` itself, still loads under `--setting-sources project`.
- The proof needs `--include-hook-events` and `--debug-file`. Exit 0 with empty stdout from the guarded hook doesn't show the check ran.
- In Codex, the hook-run proof is not in `--json` output. Use `codex app-server`, human-format stderr, or a CLI breadcrumb.

### What experiments would need to confirm

1. The exact `system/init.skills` and `slash_commands` lists under 2.1.319 with `disableBundledSkills: true` and `--setting-sources project`: whether `ultima-design` is the only entry.
2. That `-p` emits `hook_started` and `hook_response` for `PostToolUse` with `--include-hook-events`, the exact `hook_name` string (the debug log suggests `PostToolUse:Write`), and whether `additionalContext` also appears in the stream.
3. The Skill tool's `input` field name in the stream.
4. That `--permission-mode auto` works with a clean `CLAUDE_CONFIG_DIR` and `CLAUDE_CODE_OAUTH_TOKEN`, and that `apiKeySource` reports that token.
5. Codex: that `-c 'projects={…}'` with `--ignore-user-config` marks the project trusted, that `-c skills.bundled.enabled=false` takes effect outside a project file, and that `.codex/hooks.json` fires under `--dangerously-bypass-hook-trust` in `exec`.

## Sources

- `claude --help`, Claude Code 2.1.319 (local): exact text for `--safe-mode`, `--bare`, `--restricted`, `--setting-sources`, `--strict-mcp-config`, `--include-hook-events`, `--debug-file`, `--settings`, `--no-session-persistence`, `--disable-slash-commands`.
- https://code.claude.com/docs/en/cli-reference: flag table for `--bare`, `--safe-mode` (what still applies under managed policy), `--restricted`, `--setting-sources`, `--strict-mcp-config`, `--include-hook-events` (which events never emit `hook_started`).
- https://code.claude.com/docs/en/headless (*Start faster with bare mode*, *Read session metadata*, *Fail CI when a plugin or MCP server doesn't load*): bare mode skips hooks even from `--settings` and sends no skill list; `-p` runs project hooks untrusted; `system/init` fields; `plugins`, `plugin_errors`, `mcp_servers`, `mcp_server_errors`.
- https://code.claude.com/docs/en/agent-sdk/claude-code-features (*Control filesystem settings with settingSources*, *What settingSources does not control*): what `project`, `user` and `local` each load; managed policy, `~/.claude.json`, auto memory and claude.ai connectors load regardless; `CLAUDE_CONFIG_DIR` relocates `~/.claude.json`; project `settings.json` has no parent fallback.
- https://code.claude.com/docs/en/agent-sdk/typescript (`SDKSystemMessage`, `SDKHookStartedMessage`, `SDKHookProgressMessage`, `SDKHookResponseMessage`): init and hook event schemas.
- https://code.claude.com/docs/en/agent-sdk/skills (*Confirm skills loaded*): `init.skills` lists user-invocable skills, bundled ones included; skill names also appear in `slash_commands`.
- https://code.claude.com/docs/en/settings (*Find or create your settings files*, *When edits take effect*, *Where Claude Code keeps the local file in a git repository*, *Confirm what loaded*): `CLAUDE_CONFIG_DIR` holds settings, history and plugins; a settings file created mid-session loads; shared settings come from the primary working directory; `/status` is interactive only.
- https://code.claude.com/docs/en/settings-reference (`disableBundledSkills`): it removes bundled skills and workflows and hides built-in commands from the model; `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS`.
- https://code.claude.com/docs/en/permissions (*What runs before you trust a folder*, *Additional directories grant file access, not configuration*, *Where output styles, hooks, and local settings load from*, *Move the session to another directory*): hooks run under `-p` untrusted; allow rules don't apply; `--add-dir` loads no hooks; hooks load from the cwd's `.claude/` with no parent fallback; `/cd` applies a new directory's hooks.
- https://code.claude.com/docs/en/skills (*Bundled skills*, *Choose where skills load*, *Load skills in monorepos and subdirectories*, *Skills synced from claude.ai*, *Edit a skill during a session*, *Skill content lifecycle*): nested skills load lazily; synced skills persist on disk and aren't synced without the `user` source; a new top-level skills directory needs `/reload-skills`.
- https://code.claude.com/docs/en/hooks (*Hook locations*, *Disable or remove hooks*, *Add context for Claude*, *InstructionsLoaded*, *Debug hooks*, exit-code output): hook entries merge across levels; `additionalContext` is saved in the session transcript; plain PostToolUse stdout goes only to the debug log; the `Hooks: <event>:<tool> [<command>] finished with status N (ms)` debug line.
- https://code.claude.com/docs/en/memory (*How CLAUDE.md files load*, *AGENTS.md*, *Exclude specific CLAUDE.md files*, auto memory): parent-directory CLAUDE.md loading; when AGENTS.md is read; `claudeMdExcludes`; memory path under the config directory; `CLAUDE_CODE_DISABLE_AUTO_MEMORY`.
- https://code.claude.com/docs/en/env-vars: `CLAUDE_CONFIG_DIR`, `CLAUDE_CODE_SAFE_MODE`, `CLAUDE_CODE_SIMPLE`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, `CLAUDE_CODE_DISABLE_CLAUDE_MDS`, `ENABLE_CLAUDEAI_MCP_SERVERS`, `CLAUDE_CODE_SYNC_SKILLS`, `CLAUDE_CODE_OAUTH_TOKEN`.
- https://code.claude.com/docs/en/authentication (*Credential management*): credentials live under `CLAUDE_CONFIG_DIR`, and on macOS the Keychain entry is keyed to that directory.
- https://code.claude.com/docs/en/claude-directory: every `~/.claude` path and `.claude.json` moves under `CLAUDE_CONFIG_DIR`.
- https://code.claude.com/docs/en/plugins/loading (*Sign-in requirements for terminal sync*, *Find where a plugin is enabled*): synced plugins don't load without the `user` source or with token auth; `enabledPlugins` sources.
- https://code.claude.com/docs/en/managed-settings: managed file locations on macOS and Linux.
- https://code.claude.com/docs/en/tools-reference: the `Skill` tool executes skills in the main conversation.
- https://learn.chatgpt.com/docs/hooks (from developers.openai.com/codex/hooks): hook locations next to active config layers; project hooks need the trusted `.codex/` layer; hash-based trust; `--dangerously-bypass-hook-trust`; matcher support for `apply_patch`, `Edit` and `Write`; `[features] hooks = false`.
- https://learn.chatgpt.com/docs/config-file/config-basic (*Configuration precedence*): layer order; untrusted projects skip project config, hooks and rules.
- https://learn.chatgpt.com/docs/config-file/config-advanced (*Config and state locations*, *Project config files*, *Project root detection*): `CODEX_HOME`; project layers are read from root to cwd only when trusted; `.git` is the root marker.
- https://learn.chatgpt.com/docs/config-file/config-reference (`projects.<path>.trust_level`): the trust key and its values.
- https://learn.chatgpt.com/docs/non-interactive-mode: `codex exec`, `--ignore-user-config`, `--ephemeral`, `--json` event types.
- https://learn.chatgpt.com/docs/developer-commands?surface=cli (`codex exec` flags): `--dangerously-bypass-hook-trust`, `--ignore-user-config` (auth still uses `CODEX_HOME`), `-c`, `--json`, `--skip-git-repo-check`.
- https://learn.chatgpt.com/docs/build-skills (*Where Codex loads local skills*, *Enable or disable local Codex skills*): repo, `$HOME/.agents/skills`, `/etc/codex/skills` and system skill scopes; `[skills.bundled] enabled = false`.
- `openai/codex@2889d8e` `codex-rs/config/src/loader/mod.rs`: a project with no trust entry is untrusted; trust is resolved from the merged user and `-c` layers before project layers load.
- `openai/codex@2889d8e` `codex-rs/config/src/overrides.rs` and `codex-rs/utils/cli/src/config_override.rs`: `-c` keys are split on `.`, and values parse as TOML.
- `openai/codex@2889d8e` `codex-rs/exec-server/src/discoverV2/capability_locations.rs`: user skill roots are `$CODEX_HOME/skills` and `$HOME/.agents/skills`.
- `openai/codex@2889d8e` `codex-rs/exec/src/event_processor_with_jsonl_output.rs` and `event_processor_with_human_output.rs`: `--json` drops hook events, and human output prints them to stderr.
- `openai/codex@2889d8e` `codex-rs/rollout/src/policy.rs`: `HookStarted` and `HookCompleted` are not persisted.
- `openai/codex@2889d8e` `codex-rs/protocol/src/protocol.rs` (`HookRunSummary`): the app-server hook notification fields.
- `openai/codex@2889d8e` `codex-rs/core/src/skills.rs`: implicit skill invocation is detected from commands, and invocations go to telemetry rather than the exec stream.
- `scripts/first-screen.ts` (`exercise`, `transcriptFacts`): the current executor flags, the `work/` cwd, the `CLAUDE*` environment strip, and the transcript parsing that records `system/init`.
- `docs/evidence/first-screen/README.md`: how the exercise runs today.
- `packages/cli/src/install.ts` (`DESTINATIONS`, `HOOK_FILES`, `hookEntry`): what install writes for claude, codex, cursor and copilot.
- `packages/cli/src/hook.ts` (`hook`, `renderHookOutput`): the hook exits 0, prints nothing without findings, and puts `additionalContext` in `hookSpecificOutput`.
- `packages/cli/src/agents.ts` (`planAgents`): init skips agent setup unless the Git root is the application root, and prints the install step instead.
- `packages/cli/skill/ultima-design/SKILL.md`: the frontmatter has a `description` and no `user-invocable: false`.
- `docs/research/2026-09-22-harness-skill-and-hook-registration.md`: the earlier per-harness registration findings this note builds on.
