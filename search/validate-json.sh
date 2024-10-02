#!/bin/bash

# Check if the file exists
if [[ -f "$1" ]]; then
    # Validate the JSON file using Python's json.tool
    python -m json.tool < "$1" && echo "Valid JSON" || echo "Invalid JSON"
else
    # If the file doesn't exist, print an error message
    echo "File not found: $1"
fi

