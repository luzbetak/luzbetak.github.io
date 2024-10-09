#!/bin/bash

# Loop through all PNG files in the current directory
for file in *.png; do
  # Use ImageMagick's magick command to resize the image
  magick "$file" -resize 1024x "$file"
done

echo "All images have been resized to 1024px width."

