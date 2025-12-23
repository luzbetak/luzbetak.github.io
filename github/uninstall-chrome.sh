#!/bin/bash

echo "Starting Google Chrome uninstallation process with sudo permissions..."

# Quit Chrome if running
echo "Closing Google Chrome and related processes..."
osascript -e 'quit app "Google Chrome"'

# Remove Chrome application
echo "Removing Google Chrome from Applications..."
sudo rm -rf "/Applications/Google Chrome.app"

# Define an array of Chrome-related directories and files to delete
declare -a chrome_paths=(
    "$HOME/Library/Application Support/Google/Chrome"
    "$HOME/Library/Caches/Google/Chrome"
    "$HOME/Library/Preferences/com.google.Chrome.plist"
    "$HOME/Library/Google/Google Chrome Brand.plist"
    "$HOME/Library/Saved Application State/com.google.Chrome.savedState"
    "$HOME/Library/Google/GoogleSoftwareUpdate"
)

# Loop through each path and delete if it exists
for path in "${chrome_paths[@]}"; do
    if [ -e "$path" ]; then
        echo "Deleting $path"
        sudo rm -rf "$path"
    else
        echo "Path $path does not exist, skipping..."
    fi
done

# Empty the Trash
echo "Emptying Trash..."
sudo rm -rf ~/.Trash/*

echo "Google Chrome uninstallation complete. Please restart your iMac to ensure all changes take effect."

