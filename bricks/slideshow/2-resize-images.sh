#!/bin/bash -x

# Loop through all PNG files in the current directory
for file in *.png; do
  # Use ImageMagick's magick command to resize the image
  magick "$file" -resize 2048 "$file"
done

echo "All images have been resized to 2048px width."

