#!/usr/bin/env python

import os
import json
from bs4 import BeautifulSoup
import re
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

# Download NLTK stopwords (if necessary)
import nltk
nltk.download('punkt')
nltk.download('stopwords')

# Get the list of stopwords
stop_words = set(stopwords.words('english'))

# Function to clean up text by replacing sequences of "-" and "#!/usr/bin/env" with a single space
def clean_text(text):
    # Replace one or more hyphens with a single space
    text = re.sub(r'-+', ' ', text)

    # Replace "#!/usr/bin/env" with a single space
    text = text.replace('#!/usr/bin/env', ' ')

    # Replace multiple newlines with a single space
    text = text.replace('\n', ' ').replace('  ', ' ')  # Ensure no double spaces

    return text.strip()

# Function to extract keywords from an HTML file
def extract_keywords_from_html(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        soup = BeautifulSoup(file, 'html.parser')

        # Extract the body text
        body_text = soup.get_text(separator=' ', strip=True)

        # Clean the body text
        clean_body_text = clean_text(body_text)

        # Tokenize the text
        words = word_tokenize(clean_body_text)

        # Remove stopwords and non-alphabetic tokens
        keywords = [word.lower() for word in words if word.isalpha() and word.lower() not in stop_words]

        # Remove duplicates by converting to a set and join as space-separated string
        unique_keywords = " ".join(sorted(set(keywords)))

        return unique_keywords

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
            keywords = extract_keywords_from_html(filepath)

            # Prepare the URL path (removing the leading dot)
            url_path = filepath.lstrip('./')

            # Append to the file index
            file_index.append({
                "id": current_id,
                "title": file,
                "content": keywords,
                "url": f"/{url_path}"
            })
            current_id += 1

# Write the index to search-index.json
with open('search/search-index.json', 'w', encoding='utf-8') as json_file:
    json.dump(file_index, json_file, indent=4)

print("search-index.json created successfully.")

