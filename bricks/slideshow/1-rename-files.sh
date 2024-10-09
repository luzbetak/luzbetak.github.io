#!/bin/bash -x

# Initialize the counter
counter=1

# Loop through all the files with spaces handled properly
ls -1t *.png | while IFS= read -r file; do
  # Format the counter to two digits
  formatted_counter=$(printf "%02d" $counter)
  
  # Rename the file
  mv "$file" "databricks-$formatted_counter.png"
  
  # Increment the counter
  counter=$((counter + 1))
done

echo "Files have been renamed successfully."

