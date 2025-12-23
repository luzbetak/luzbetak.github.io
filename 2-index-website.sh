#!/bin/bash
#-------------------------------------------------------------------------------#
 python page_index.py --output-dir search --debug

#-------------------------------------------------------------------------------#
# Validate JSON 
#-------------------------------------------------------------------------------#
FILE='search/search-index.json'
if [[ -f "$FILE" ]]; then
    # Validate the JSON file using Python's json.tool
    python -m json.tool < "$FILE" && echo "Valid JSON" || echo "Invalid JSON"
else
    # If the file doesn't exist, print an error message
    echo "File not found: $FILE"
fi
#-------------------------------------------------------------------------------#
