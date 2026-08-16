#!/bin/sh
# Safety snapshot — typecheck + git commit of the working tree.
# Lesson from the First Calamity: no backup means no undo.
set -eu
cd /workspace

if ! npx tsc --noEmit --pretty false; then
  echo "safety-snapshot: typecheck failed — not committing" >&2
  exit 1
fi

if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "safety-snapshot: clean — nothing to save"
  exit 0
fi

git add -A
msg=${1:-"Safety snapshot: $(date -u +%Y-%m-%dT%H:%MZ)"}
git commit -m "$msg"
echo "safety-snapshot: saved → $(git rev-parse --short HEAD)"
