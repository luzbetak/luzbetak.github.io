# Array of branch names to delete
branches=(
    "2024-09-18"
    "2024-09-22"
    "2024-09-28"
    "2024-10-01"
    "2024-10-06"
    "2024-10-09"
    "2024-10-13"
)

echo "Starting to delete remote branches..."

# Loop through each branch and delete it
for branch in "${branches[@]}"; do
    echo "Deleting branch: $branch"
    git push origin --delete "$branch"
done

echo "Branch deletion complete!"

# Optional: Prune any stale remote tracking branches
echo "Pruning remote tracking branches..."
git remote prune origin

echo "All operations completed successfully!"
