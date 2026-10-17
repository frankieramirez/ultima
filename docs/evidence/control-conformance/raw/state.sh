#!/usr/bin/env bash
# Print a checkout's preservation fingerprint: HEAD, index tree, status, tracked and untracked content digests.
set -euo pipefail
r="$1"
echo "head $(git -C "$r" rev-parse HEAD)"
echo "index $(git -C "$r" ls-files -s | sha256sum | cut -d' ' -f1)"
echo "status $(git -C "$r" status --porcelain=v1 --untracked-files=all | sha256sum | cut -d' ' -f1) ($(git -C "$r" status --porcelain=v1 --untracked-files=all | wc -l) lines)"
echo "tracked $(cd "$r" && git ls-files -z | xargs -0 sha256sum 2>/dev/null | sha256sum | cut -d' ' -f1)"
echo "untracked $(cd "$r" && git ls-files -z -o --exclude-standard | xargs -0 -r sha256sum | sha256sum | cut -d' ' -f1) ($(cd "$r" && git ls-files -o --exclude-standard | wc -l) files)"
echo "worktrees $(git -C "$r" worktree list --porcelain | grep -c '^worktree')"
