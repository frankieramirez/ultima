#!/usr/bin/env bash
# Reproduce four gaps in mana's portable control checker (skills/leyline/scripts/conform.sh)
# against a synthetic control fixture. Nothing here runs Ultima code.
#
#   bash checker-repro.sh <path-to-conform.sh> <output-dir>
#
# Each case writes the checker's JSON to <output-dir>/<case>.json and prints one summary line.
set -uo pipefail
conform="$1"; out="$2"
mkdir -p "$out"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

fixture() {
  local repo="$work/$1"
  mkdir -p "$repo/verification/features" "$repo/verification/scenarios/f" "$repo/verification/breaks" "$repo/skills/ctl" "$repo/tests"
  cd "$repo" || exit 1
  git init -q && git config user.email fixture@example.invalid && git config user.name fixture
  printf '## Agent skills\n\nControl: skills/ctl/SKILL.md\n' > AGENTS.md
  printf '# ctl\n\nCommand: python3 cli.py\nBindings: tests\n' > skills/ctl/SKILL.md
  echo '{"id":"f","summary":"fixture","aliases":[],"sourceRoots":["mode.txt"],"knowledge":"proposed"}' > verification/features/f.json
  echo '{"id":"f.s","steps":[{"action":"run","expect":"ok"}]}' > verification/scenarios/f/s.json
  echo "scenario('f.s', async () => {})" > tests/f.test.ts
  echo ok > mode.txt
  cat > cli.py <<'PY'
import json, os, sys, uuid
args = [a for a in sys.argv[1:] if a != "--json"]
if args[:1] == ["list"]:
    print(json.dumps({"features": ["f"], "scenarios": ["f.s"]})); sys.exit(0)
if args[:1] == ["describe"]:
    print(json.dumps({"id": args[-1]})); sys.exit(0)
if args[:1] == ["feature"]:
    if args[1] != "f":
        print("unknown feature", file=sys.stderr); sys.exit(2)
    ok = open("mode.txt").read().strip() == "ok"
    run = uuid.uuid4().hex
    report = {"contract": "control/0", "runId": run, "status": "passed" if ok else "incomplete", "exit": 0 if ok else 3,
              "source": {"identity": {"head": "fixture", "manifest": {"digest": "fixture"}}, "sourceChanged": False},
              "prerequisites": [{"need": "browser", "status": "present" if ok else "missing", "detail": None if ok else "browser missing"}],
              "checks": [{"id": "e2e", "status": "passed" if ok else "unavailable", "reason": "fixture", "argv": ["fixture"],
                          "expected": ["f.s"], "executed": ["f.s"] if ok else []}]}
    os.makedirs(".scratch", exist_ok=True)
    json.dump(report, open(f".scratch/{run}.json", "w"))
    print(json.dumps(report)); sys.exit(report["exit"])
sys.exit(2)
PY
  printf '.scratch/\n' > .gitignore
  git add -A && git commit -qm base
  echo incomplete > mode.txt && git diff > verification/breaks/f.s.patch && git checkout -q mode.txt
  git add -A && git commit -qm "break patch makes the run incomplete"
  echo "$repo"
}

summary() {
  python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
print(sys.argv[2], "checker-exit=" + sys.argv[3], "|", "; ".join("%s=%s (%s)" % (p["probe"], p["status"], p["detail"]) for p in d["probes"]))' "$@"
}

# 1. A blocked Prepare keeps only stderr, so a tool that reports on stdout loses its reason.
repo="$(fixture prepare-stdout)"
printf 'print("ERR_STORE_MISSING the package store is empty")\nraise SystemExit(1)\n' > "$repo/prepare.py"
printf 'Prepare: python3 prepare.py\n' >> "$repo/skills/ctl/SKILL.md"
git -C "$repo" add prepare.py
git -C "$repo" commit -qam "prepare reports on stdout"
bash "$conform" dynamic "$repo" --trust --feature f --timeout 60 > "$out/prepare-stdout.json"; code=$?
summary "$out/prepare-stdout.json" prepare-stdout "$code"
grep -q ERR_STORE_MISSING "$out/prepare-stdout.json" && echo "  reason retained" || echo "  reason lost: ERR_STORE_MISSING is absent from the probe"

# 2. A break patch run that is incomplete (exit 3) after a passing baseline is called failed, not blocked.
repo="$(fixture break-incomplete)"
bash "$conform" dynamic "$repo" --trust --feature f --timeout 60 > "$out/break-incomplete.json"; code=$?
summary "$out/break-incomplete.json" break-incomplete "$code"

# 3. Dynamic mode keeps no run id or report from the runs it judged, then deletes the worktree that held them.
python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
text = json.dumps(d)
print("retention", "| worktree", d["worktree"], "| keys", sorted(d), "| runId recorded:", "runId" in text)' "$out/break-incomplete.json"
ls "$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["worktree"])' "$out/break-incomplete.json")" > /dev/null 2>&1 \
  && echo "  worktree still present" || echo "  worktree and its .scratch reports are gone"

# 4. A report with no source.identity.head key validates, though head is required (null only outside git).
python3 - "$work/no-head.json" <<'PY'
import json, sys
report = {"contract": "control/0", "runId": "r1", "status": "incomplete", "exit": 3,
          "source": {"identity": {"manifest": {"digest": "d"}}, "sourceChanged": False},
          "prerequisites": [{"need": "browser", "status": "missing", "detail": "absent"}],
          "checks": [{"id": "e2e", "status": "unavailable", "reason": "absent", "argv": [], "expected": ["f.s"], "executed": []}]}
json.dump(report, open(sys.argv[1], "w"))
PY
bash "$conform" report "$work/no-head.json" --exit 3 > "$out/report-no-head.json"; code=$?
echo "report-no-head checker-exit=$code valid=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["valid"])' "$out/report-no-head.json")"
