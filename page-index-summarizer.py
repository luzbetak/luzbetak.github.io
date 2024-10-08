#!/usr/bin/env python

import os
import json
from bs4 import BeautifulSoup
from nltk.tokenize import sent_tokenize
import re

# Function to clean up text by replacing sequences of "-" and "#!/usr/bin/env" with a single space
def clean_text(text):
    # Replace one or more hyphens with a single space
    text = re.sub(r'-+', ' ', text)

    # Replace "#!/usr/bin/env" with a single space
    text = text.replace('#!/usr/bin/env', ' ')

    # Replace multiple newlines with a single space
    text = text.replace('\n', ' ').replace('  ', ' ')  # Ensure no double spaces

    return text.strip()

# Function to extract title and summarized content from an HTML file
def extract_html_data(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        soup = BeautifulSoup(file, 'html.parser')

        # Extract the title
        title_tag = soup.find('title')
        title = title_tag.text if title_tag else os.path.basename(filepath)

        # Extract the body text
        body_text = soup.get_text(separator=' ', strip=True)

        # Clean the body text
        clean_body_text = clean_text(body_text)

        # Summarize the content
        sentences = sent_tokenize(clean_body_text)
        summary = " ".join(sentences[:2])  # Take first 2 sentences as summary

        return title, summary

# Initialize variables
file_index = []
current_id = 1

# Traverse current directory and subdirectories to find HTML files
for root, dirs, files in os.walk('.'):
    # Skip the /search directory
    dirs[:] = [d for d in dirs if d != 'search']

    for file in files:
        # Exclude any "index.html" file
        if file.endswith('.html') and file != 'index.html':
            filepath = os.path.join(root, file)
            title, summary = extract_html_data(filepath)

            # Prepare the URL path (removing the leading dot)
            url_path = filepath.lstrip('./')

            # Append to the file index
            file_index.append({
                "id": current_id,
                "title": title,
                "content": summary,
                "url": f"/{url_path}"
            })
            current_id += 1

# Write the index to search-index.json
with open('search/search-index.json', 'w', encoding='utf-8') as json_file:

    json.dump(file_index, json_file, indent=4)

print("search-index.json created successfully.")

