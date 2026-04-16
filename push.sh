#!/usr/bin/env bash

set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: ./push.sh \"commit message\""
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: this script must be run inside a git repository."
  exit 1
fi

branch="$(git branch --show-current)"
message="$*"

if [[ -z "$branch" ]]; then
  echo "Error: could not determine the current branch."
  exit 1
fi

git add -A

if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

git commit -m "$message"
git push origin "$branch"

echo "Pushed to origin/$branch"
