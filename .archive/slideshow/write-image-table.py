#!/usr/bin/env python 
import os

# Directory containing the images (set to the current directory)
directory = "."

# Create the HTML file
html_file = "images.html"

# Start writing the HTML content
html_content = """
<table>
"""

# List all PNG files in the directory and filter by .png extension
png_files = [f for f in sorted(os.listdir(directory)) if f.endswith(".png")]

# Add images to the table two per row
for i in range(0, len(png_files), 2):
    html_content += "  <tr>\n"
    # Add the first image
    html_content += f'    <td><a href="{png_files[i]}" target="_blank"><img src="{png_files[i]}" alt="{png_files[i]}" width="550px" /></a></td>\n'
    
    # Add the second image if it exists
    if i + 1 < len(png_files):
        html_content += f'    <td><a href="{png_files[i + 1]}" target="_blank"><img src="{png_files[i + 1]}" alt="{png_files[i + 1]}" width="550px" /></a></td>\n'
    
    html_content += "  </tr>\n"

# Close the table and HTML content
html_content += "</table>"

# Write the HTML content to a file
with open(html_file, "w") as f:
    f.write(html_content)

print(f"HTML file '{html_file}' has been created successfully.")

