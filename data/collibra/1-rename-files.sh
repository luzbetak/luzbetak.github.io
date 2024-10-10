#!/bin/bash

# Initialize the counter
counter=1

# Loop through all the files with spaces handled properly
ls -1tr *.png | while IFS= read -r file; do
  # Format the counter to two digits
  formatted_counter=$(printf "%02d" $counter)
 
  # Echo the command before executing it
  echo mv "$file" "databricks-$formatted_counter.png"

  # Rename the file
  mv "$file" "databricks-$formatted_counter.png"
  
  # Increment the counter
  counter=$((counter + 1))
done

echo "Files have been renamed successfully."

