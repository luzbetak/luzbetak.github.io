#!/usr/bin/env python

import os
import json
from bs4 import BeautifulSoup
from nltk.tokenize import sent_tokenize

# Function to extract title and summarized content from an HTML file
def extract_html_data(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        soup = BeautifulSoup(file, 'html.parser')
        
        # Extract the title
        title_tag = soup.find('title')
        title = title_tag.text if title_tag else os.path.basename(filepath)
        
        # Extract and summarize the content
        body_text = soup.get_text(separator=' ', strip=True)
        sentences = sent_tokenize(body_text)
        summary = " ".join(sentences[:2])  # Take first 2 sentences as summary
        
        return title, summary

# Initialize variables
file_index = []
current_id = 1

# Traverse current directory and subdirectories to find HTML files
for root, dirs, files in os.walk('.'):
    for file in files:
        if file.endswith('.html'):
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
with open('search-index.json', 'w', encoding='utf-8') as json_file:
    json.dump(file_index, json_file, indent=4)

print("search-index.json created successfully.")

