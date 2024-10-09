#!/bin/bash

# Loop through all PNG files in the current directory
for file in *.png; do
  # Use ImageMagick's convert command to resize the image
  convert "$file" -resize 400x "$file"
done

echo "All images have been resized to 400px width."

