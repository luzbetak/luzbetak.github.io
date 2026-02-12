#!/usr/bin/env bash
set -euo pipefail

# Change this if your remote is not named "origin"
REMOTE_NAME="origin"

# ---- Safety checks ----

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: this is not a Git repository." >&2
  exit 1
fi

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  echo "Error: remote '$REMOTE_NAME' not found."
  echo "Edit REMOTE_NAME in this script to match your GitHub remote."
  exit 1
fi

current_branch="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
if [[ -z "${current_branch}" ]]; then
  echo "Error: could not determine current branch." >&2
  exit 1
fi

echo "============================================================"
echo "   DANGER: This will ERASE ALL GIT HISTORY for this repo   "
echo "   locally AND on GitHub (remote: $REMOTE_NAME).           "
echo "============================================================"
echo
echo "Repository : $(pwd)"
echo "Remote URL : $(git remote get-url "$REMOTE_NAME")"
echo "Branch kept: $current_branch (all other branches pruned)"
echo
echo "GitHub will keep only ONE new initial commit after this."
echo "Protected branches on GitHub may block the force-push."
echo
read -p "Type (yes) to continue: " confirm

if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

# ---- Rewrite local history to a single commit ----

echo
echo "Creating orphan branch with a single fresh commit..."

# Create an orphan branch (no parents / no history)
git checkout --orphan temp_clean_history

# Stage everything in the working tree as new files
git add -A

# New initial commit
git commit -m "Git Compact Reset"

# Delete old branch and rename orphan branch to old name
git branch -D "$current_branch"
git branch -m "$current_branch"

# Remove all local tags (they can point to old commits)
echo "Deleting all local tags..."
if git tag -l | grep -q .; then
  git tag -l | xargs -r -n 1 git tag -d
fi

# ---- Clean up remote (GitHub) ----

echo
echo "Force-pushing new history to GitHub and pruning old branches..."

# Force push current branch and prune remote branches that no longer exist locally
git push "$REMOTE_NAME" --force --all --prune

echo "Deleting all remote tags..."
remote_tags="$(git ls-remote --tags "$REMOTE_NAME" | awk '{print $2}' | sed 's|refs/tags/||' | sed 's|\^{}||')"
if [[ -n "${remote_tags}" ]]; then
  for t in $remote_tags; do
    echo "  Deleting remote tag: $t"
    git push "$REMOTE_NAME" ":refs/tags/$t" || true
  done
else
  echo "  No remote tags found."
fi

echo
echo "============================================================"
echo "Done."
echo "- Local history now consists of ONE commit."
echo "- GitHub (remote '$REMOTE_NAME') has been force-updated."
echo "- Old branches and tags on that remote are removed/pruned."
echo
echo "On GitHub's web UI you should now see:"
echo "  • A single initial commit"
echo "  • No previous commit history, branches, or tags"
echo
echo "Note: Any existing forks or local clones elsewhere still"
echo "      have the old history; only this GitHub repo is wiped."
echo "============================================================"

