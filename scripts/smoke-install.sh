#!/usr/bin/env bash
#
# Exits zero only when every target installed from the registry and passed its
# checks.
# A non-zero exit names the target that failed.
#
#   scripts/smoke-install.sh                 # against a local registry build
#   scripts/smoke-install.sh --host <url>    # against the deployed site
#   scripts/smoke-install.sh --keep          # leave the temp directory behind
set -euo pipefail

usage() {
  echo "usage: scripts/smoke-install.sh [--host <url>] [--keep]"
}

HOST=""
KEEP=0
while [ $# -gt 0 ]; do
  case "$1" in
    --host)
      HOST="${2-}"
      if [ -z "$HOST" ]; then
        echo "smoke-install: --host needs a url" >&2
        exit 2
      fi
      shift 2
      ;;
    --keep) KEEP=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "smoke-install: unknown argument $1" >&2; usage >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ultima-smoke.XXXXXX")"
SERVER_PID=""
TARGET=""
TARBALL=""

finish() {
  local status=$?
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if [ "$status" -ne 0 ] && [ -n "$TARGET" ]; then
    echo "smoke-install: FAILED in the $TARGET target" >&2
  fi
  if [ "$KEEP" -eq 1 ]; then
    echo "smoke-install: kept $WORK"
  else
    rm -rf "$WORK"
  fi
}
trap finish EXIT

step() {
  echo
  echo "── $*"
}

# The components.json each setup item installs points at the production host, so
# without this the second `shadcn add` would resolve against the deployed site.
point_namespace_at_host() {
  COMPONENTS="$1" REGISTRY_HOST="$HOST" node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";

const file = process.env.COMPONENTS;
const json = JSON.parse(readFileSync(file, "utf8"));
json.registries["@ultima"] = `${process.env.REGISTRY_HOST}/r/{name}.json`;
writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
'
}

# Without a paths alias the shadcn CLI writes files into a literal ./@/
# directory and reports success. create-vite ships none.
# The comment stripping is for the JSONC the scaffold may ship.
add_paths_alias() {
  TSCONFIG="$1" node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";

const file = process.env.TSCONFIG;
const source = readFileSync(file, "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const json = JSON.parse(source);
json.compilerOptions = { ...json.compilerOptions, paths: { "@/*": ["./src/*"] } };
writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
'
}

# Every StyleX rule sits in a cascade layer, so an unlayered
# scaffold reset such as create-next-app's `* { padding: 0 }` beats component
# styles, a Button's own padding included.
layer_reset() {
  STYLESHEET="$1" node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";

const file = process.env.STYLESHEET;
const source = readFileSync(file, "utf8");
writeFileSync(file, `@layer reset {\n${source}\n}\n`);
'
}

catalogue() {
  curl -fsS "$HOST/r/registry.json" | node --input-type=module -e '
import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync(0, "utf8"));
const names = registry.items.filter((item) => item.type === "registry:ui").map((item) => item.name);
if (names.length === 0) throw new Error("the served registry lists no components");
process.stdout.write(`${names.join("\n")}\n`);
'
}

# `root` is the directory the consumer's `@/` alias points at: create-vite's src/, and the
# Next.js scaffold's own root, which is scaffolded with --no-src-dir.
add_catalogue() {
  local app="$1" root="$2" name
  local specifiers=()
  for name in $CATALOGUE; do
    specifiers+=("@ultima/$name")
  done
  (cd "$app" && npx -y shadcn@latest add "${specifiers[@]}" --yes)
  for name in $CATALOGUE; do
    if [ ! -f "$root/components/ui/$name.tsx" ]; then
      echo "smoke-install: $name did not arrive; the catalogue install is incomplete" >&2
      exit 1
    fi
  done
}

assert_stamped() {
  local root="$1"
  curl -fsS "$HOST/r/registry.json" -o "$WORK/registry.json"
  REGISTRY="$WORK/registry.json" ROOT_DIR="$root" STAMP="$ROOT/packages/cli/src/stamp.ts" \
    node --experimental-strip-types --input-type=module -e '
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const { readStamp } = await import(pathToFileURL(process.env.STAMP).href);
const registry = JSON.parse(readFileSync(process.env.REGISTRY, "utf8"));
const folder = { "registry:ui": "components/ui", "registry:lib": "lib" };
const failures = [];
let checked = 0;
for (const item of registry.items) {
  if (!folder[item.type]) continue;
  for (const file of item.files) {
    const name = basename(file.path);
    const text = readFileSync(join(process.env.ROOT_DIR, folder[item.type], name), "utf8");
    const stamp = readStamp(text);
    const stamps = text.split("\n").filter((line) => readStamp(line)).length;
    const hash = stamp && `${stamp.scheme}:${stamp.hash}`;
    if (!stamp || stamps !== 1 || stamp.item !== item.name || hash !== item.meta.ultima.files[name]) {
      failures.push(`${folder[item.type]}/${name}`);
    }
    checked += 1;
  }
}
if (failures.length > 0) {
  console.error(`smoke-install: these installed files lost their item stamp or moved it: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`smoke-install: ${checked} installed files carry their item stamp`);
'
}

# Imports every installed component and reads the array, so the consumer's bundler compiles all of
# them. Without the reference it drops the imports and the build proves only that the files parsed.
write_catalogue_module() {
  FILE="$1" COMPONENT="$2" NAMES="$CATALOGUE" node --input-type=module -e '
import { writeFileSync } from "node:fs";

const names = process.env.NAMES.split(/\s+/).filter(Boolean);
const identifier = (name) => name.replace(/(?:^|-)([a-z])/g, (_, letter) => letter.toUpperCase());
writeFileSync(
  process.env.FILE,
  [
    ...names.map((name) => `import * as ${identifier(name)} from "@/components/ui/${name}";`),
    "",
    `const catalogue = [${names.map(identifier).join(", ")}];`,
    "",
    `export default function ${process.env.COMPONENT}() {`,
    "  return <p>{catalogue.length} Ultima components</p>;",
    "}",
    "",
  ].join("\n"),
);
'
}

setup_add() {
  local app="$1" item="$2"
  (cd "$app" && npx -y shadcn@latest add "$HOST/r/$item.json" --yes) 2>&1 | tee "$WORK/$item.log"
}

assert_docs_printed() {
  local item="$1"
  shift
  local phrase
  for phrase in "$@"; do
    if ! grep -qF -- "$phrase" "$WORK/$item.log"; then
      echo "smoke-install: $item's docs no longer says \"$phrase\"; its hand steps here are out of date" >&2
      exit 1
    fi
  done
}

assert_doctor_passes() {
  node "$ROOT/packages/cli/dist/cli.js" doctor --cwd "$1"
}

# docs/spec/ultima.md, Check: the installed catalogue has no blocking finding, from the bundled
# catalogue alone.
assert_check_passes() {
  node "$ROOT/packages/cli/dist/cli.js" check --cwd "$1"
}

# docs/spec/ultima.md, Versioning and drift, Proof: a fresh install reports every item current.
assert_status_current() {
  node "$ROOT/packages/cli/dist/cli.js" status --json --cwd "$1" >"$WORK/status.json"
  STATUS="$WORK/status.json" NAMES="$CATALOGUE" node --input-type=module -e '
import { readFileSync } from "node:fs";

const { files } = JSON.parse(readFileSync(process.env.STATUS, "utf8"));
const missing = process.env.NAMES.split(/\s+/).filter((name) => name && !files.some((row) => row.item === name));
const drifted = files.filter((row) => row.state !== "current").map((row) => `${row.file} (${row.state})`);
if (missing.length > 0 || drifted.length > 0) {
  console.error(`smoke-install: status reports ${[...missing.map((name) => `${name} (not found)`), ...drifted].join(", ")}`);
  process.exit(1);
}
console.log(`smoke-install: status reports all ${files.length} installed files current`);
'
}

# docs/spec/ultima.md, Diff: an edit shows alone, with no hunks from alias rewrites or the RSC directive.
assert_diff_shows_only_the_edit() {
  local button="$1/components/ui/button.tsx"
  cp "$button" "$WORK/button.tsx"
  printf 'export const smokeEdit = 1;\n' | cat - "$WORK/button.tsx" >"$button"
  node "$ROOT/packages/cli/dist/cli.js" diff button --cwd "$2" >"$WORK/diff.txt"
  cp "$WORK/button.tsx" "$button"
  local changed
  changed="$(grep -E '^[-+]' "$WORK/diff.txt" | grep -vE '^(---|\+\+\+) ' || true)"
  if [ "$changed" != "-export const smokeEdit = 1;" ]; then
    echo "smoke-install: diff button shows more than the edit:" >&2
    cat "$WORK/diff.txt" >&2
    exit 1
  fi
  echo "smoke-install: diff button shows only the edit"
}

# docs/spec/ultima.md, Hooks: install the Claude Code hook, then pipe a recorded payload for a file
# with a palette read into the command it installed; the finding comes back in additionalContext.
assert_hook_returns_the_finding() {
  local app="$1"
  # The hook command runs `npx --no-install`, which resolves the tarball assert_tarball_doctor_passes installed.
  (cd "$app" && npx --no-install @ultima-systems/cli install --harness claude) >/dev/null
  cp "$ROOT/packages/analysis/fixtures/app/palette.tsx" "$app/src/SmokePalette.tsx"
  local command
  command="$(node -e 'const s = require(process.argv[1]); console.log(s.hooks.PostToolUse.find((e) => e.matcher === "Edit|Write").hooks[0].command)' "$app/.claude/settings.json")"
  PAYLOAD="$ROOT/packages/cli/src/__tests__/payloads/claude-edit.json" FILE="$app/src/SmokePalette.tsx" node -e '
const payload = JSON.parse(require("node:fs").readFileSync(process.env.PAYLOAD, "utf8"));
payload.tool_input.file_path = process.env.FILE;
process.stdout.write(JSON.stringify(payload));
' | (cd "$app" && CLAUDE_PROJECT_DIR="$app" sh -c "$command") >"$WORK/hook.json"
  rm "$app/src/SmokePalette.tsx"
  if ! grep -q 'ULT-APP-PALETTE-001 src/SmokePalette.tsx' "$WORK/hook.json"; then
    echo "smoke-install: the installed Claude Code hook did not return the palette finding:" >&2
    cat "$WORK/hook.json" >&2
    exit 1
  fi
  echo "smoke-install: the installed Claude Code hook returns the palette finding"
}

# docs/spec/ultima.md, Package and engine, Release: the tarball the release workflow publishes installs
# into a consumer project and runs from its own dependencies, not from the workspace.
pack_cli() {
  mkdir -p "$WORK/pack"
  (cd "$ROOT/packages/cli" && pnpm pack --pack-destination "$WORK/pack" >/dev/null)
  TARBALL="$(ls "$WORK"/pack/ultima-systems-cli-*.tgz)"
  echo "smoke-install: packed $(basename "$TARBALL")"
}

assert_tarball_doctor_passes() {
  (cd "$1" && npm install -D "$TARBALL" && npx --no-install @ultima-systems/cli doctor)
}

assert_installed() {
  local app="$1"
  shift
  local path
  for path in "$@"; do
    if [ ! -f "$app/src/$path" ]; then
      echo "smoke-install: $path did not arrive; the registry item's dependencies are wrong" >&2
      exit 1
    fi
  done
}

assert_not_installed() {
  local app="$1"
  shift
  local path
  for path in "$@"; do
    if [ -f "$app/src/$path" ]; then
      echo "smoke-install: $path arrived; the registry item declares a dependency it does not have" >&2
      exit 1
    fi
  done
}

replace_in_file() {
  FILE="$1" FIND="$2" REPLACE="$3" node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";

const file = process.env.FILE;
const source = readFileSync(file, "utf8");
if (!source.includes(process.env.FIND)) {
  throw new Error(`${file} no longer contains ${JSON.stringify(process.env.FIND)}`);
}
writeFileSync(file, source.replace(process.env.FIND, process.env.REPLACE));
'
}

serve_local_build() {
  step "building the registry"
  (
    cd "$ROOT"
    pnpm --filter @ultima/tokens build
    pnpm registry:build
    pnpm --filter @ultima/docs build
  )

  cat > "$WORK/serve.mjs" <<'SERVER'
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const dist = process.argv[2];

const TYPES = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
};

const NO_FALLBACK = [/^\/r\//, /^\/tokens\.(css|json)$/, /^\/llms\.txt$/];

function fileFor(path) {
  const candidate = join(dist, normalize(path));
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  if (NO_FALLBACK.some((pattern) => pattern.test(path))) return null;
  const index = join(dist, 'index.html');
  return existsSync(index) ? index : null;
}

const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const file = fileFor(path);
  if (!file) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
});

server.listen(0, '127.0.0.1', () => console.log(server.address().port));
SERVER

  step "serving apps/docs/dist"
  node "$WORK/serve.mjs" "$ROOT/apps/docs/dist" >"$WORK/port" 2>"$WORK/server.log" &
  SERVER_PID=$!

  local port=""
  local _
  for _ in $(seq 1 100); do
    port="$(cat "$WORK/port" 2>/dev/null || true)"
    if [ -n "$port" ]; then
      break
    fi
    sleep 0.1
  done
  if [ -z "$port" ]; then
    echo "smoke-install: the static server did not start" >&2
    cat "$WORK/server.log" >&2
    exit 1
  fi
  HOST="http://127.0.0.1:$port"
  echo "smoke-install: serving $HOST"
}

vite_target() {
  TARGET="vite"
  local app="$WORK/vite-app"

  step "vite: scaffolding"
  (cd "$WORK" && npm create vite@latest vite-app -- --template react-ts)
  (cd "$app" && npm install)

  step "vite: npx shadcn add $HOST/r/setup-vite.json"
  setup_add "$app" setup-vite
  assert_docs_printed setup-vite \
    '"paths": { "@/*": ["./src/*"] }' \
    "import { ultimaStylex } from './ultima.vite.ts'" \
    'before the React plugin' \
    'Wrap any global CSS reset in an @layer'
  point_namespace_at_host "$app/components.json"

  step "vite: the hand steps setup-vite prints"
  add_paths_alias "$app/tsconfig.json"
  add_paths_alias "$app/tsconfig.app.json"
  replace_in_file "$app/vite.config.ts" "plugins: [" \
    "plugins: [ultimaStylex(), "
  replace_in_file "$app/vite.config.ts" "import { defineConfig } from 'vite'" \
    "import { defineConfig } from 'vite'
import { ultimaStylex } from './ultima.vite.ts'"
  layer_reset "$app/src/index.css"

  step "vite: npx shadcn add the catalogue"
  add_catalogue "$app" "$app/src"
  assert_stamped "$app/src"
  write_catalogue_module "$app/src/App.tsx" App

  step "vite: npm run build"
  (cd "$app" && npm run build)

  step "vite: ultima doctor"
  assert_doctor_passes "$app"

  step "vite: ultima status"
  assert_status_current "$app"

  step "vite: ultima check"
  assert_check_passes "$app"

  step "vite: ultima diff"
  assert_diff_shows_only_the_edit "$app/src" "$app"

  step "vite: npx --no-install @ultima-systems/cli doctor, from the packed tarball"
  assert_tarball_doctor_passes "$app"

  step "vite: ultima hook"
  assert_hook_returns_the_finding "$app"
}

next_target() {
  TARGET="next"
  local app="$WORK/next-app"

  step "next: scaffolding"
  (cd "$WORK" && npx -y create-next-app@latest next-app \
    --ts --app --no-tailwind --no-src-dir --no-eslint --turbopack \
    --import-alias "@/*" --use-npm --yes)

  step "next: npx shadcn add $HOST/r/setup-next.json"
  setup_add "$app" setup-next
  assert_docs_printed setup-next \
    "Import './ultima.css' from app/layout.tsx." \
    'Wrap any global CSS reset in an @layer'
  point_namespace_at_host "$app/components.json"

  step "next: the hand steps setup-next prints"
  replace_in_file "$app/app/layout.tsx" 'import "./globals.css";' \
    'import "./globals.css";
import "./ultima.css";'
  layer_reset "$app/app/globals.css"

  step "next: npx shadcn add the catalogue"
  add_catalogue "$app" "$app"
  assert_stamped "$app"

  # The page is a server component and stays one: `rsc: true` does not insert a
  # "use client" directive, and each component's own boundary covers it.
  write_catalogue_module "$app/app/page.tsx" Page

  step "next: npm run build"
  (cd "$app" && npm run build)

  step "next: ultima doctor"
  assert_doctor_passes "$app"

  step "next: ultima status"
  assert_status_current "$app"

  step "next: ultima check"
  assert_check_passes "$app"

  step "next: ultima diff"
  assert_diff_shows_only_the_edit "$app" "$app"
}

sidebar_target() {
  TARGET="sidebar"
  local app="$WORK/sidebar-app"

  step "sidebar: scaffolding"
  (cd "$WORK" && npm create vite@latest sidebar-app -- --template react-ts)
  (cd "$app" && npm install)

  step "sidebar: npx shadcn add $HOST/r/setup-vite.json"
  setup_add "$app" setup-vite
  point_namespace_at_host "$app/components.json"
  add_paths_alias "$app/tsconfig.json"
  add_paths_alias "$app/tsconfig.app.json"
  replace_in_file "$app/vite.config.ts" "plugins: [" \
    "plugins: [ultimaStylex(), "
  replace_in_file "$app/vite.config.ts" "import { defineConfig } from 'vite'" \
    "import { defineConfig } from 'vite'
import { ultimaStylex } from './ultima.vite.ts'"
  layer_reset "$app/src/index.css"

  step "sidebar: npx shadcn add @ultima/sidebar"
  (cd "$app" && npx -y shadcn@latest add @ultima/sidebar --yes)

  step "sidebar: dialog, the tokens, and the shared lib arrive with it"
  assert_installed "$app" \
    components/ui/sidebar.tsx \
    components/ui/dialog.tsx \
    lib/tokens.stylex.ts \
    lib/component.ts
  assert_not_installed "$app" components/ui/button.tsx components/ui/collapsible.tsx

  cat > "$app/src/App.tsx" <<'APP'
import { Sidebar } from '@/components/ui/sidebar';

export default function App() {
  return (
    <Sidebar.Root>
      <Sidebar.Trigger>Toggle navigation</Sidebar.Trigger>
      <Sidebar.Panel aria-label="Main">
        <Sidebar.List>
          <Sidebar.Item>
            <Sidebar.Link href="/" active>
              Home
            </Sidebar.Link>
          </Sidebar.Item>
        </Sidebar.List>
      </Sidebar.Panel>
    </Sidebar.Root>
  );
}
APP

  step "sidebar: npm run build"
  (cd "$app" && npm run build)
}

# An element is a universal item for a host that can run the CLI but not React:
# a vanilla scaffold, no setup item, no components.json. tokens-css arrives only
# through the item's manifest-declared URL registryDependency.
element_target() {
  TARGET="element"
  local app="$WORK/element-app"

  step "element: scaffolding"
  (cd "$WORK" && npm create vite@latest element-app -- --template vanilla-ts)

  step "element: npx shadcn add $HOST/r/ult-button.json"
  (cd "$app" && npx -y shadcn@latest add "$HOST/r/ult-button.json" --yes)

  step "element: the vendored file and tokens-css arrive"
  local path
  for path in ult-button.js ultima-tokens.css; do
    if [ ! -f "$app/$path" ]; then
      echo "smoke-install: $path did not arrive; the element item's files or URL dependency are wrong" >&2
      exit 1
    fi
  done
  if [ -f "$app/components.json" ]; then
    echo "smoke-install: components.json arrived; the element item is not universal" >&2
    exit 1
  fi

  step "element: a reinstall overwrites the vendored file"
  echo "/* a local edit a reinstall must erase */" >>"$app/ult-button.js"
  (cd "$app" && npx -y shadcn@latest add "$HOST/r/ult-button.json" --yes --overwrite)
  if [ ! -f "$app/ult-button.js" ] || grep -qF "a local edit a reinstall must erase" "$app/ult-button.js"; then
    echo "smoke-install: the reinstall did not overwrite ult-button.js" >&2
    exit 1
  fi
}

if [ -z "$HOST" ]; then
  serve_local_build
fi
HOST="${HOST%/}"

curl -fsS "$HOST/r/registry.json" >/dev/null

step "building the CLI"
(cd "$ROOT" && pnpm --filter @ultima-systems/cli build)
pack_cli

CATALOGUE="$(catalogue)"
echo "smoke-install: the catalogue is $(echo "$CATALOGUE" | wc -w | tr -d ' ') components"

vite_target
next_target
sidebar_target
element_target
TARGET=""

echo
echo "smoke-install: every target passed against $HOST"
