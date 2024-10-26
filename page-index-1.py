#!/usr/bin/env python

import os
import json
import re
import spacy
from bs4 import BeautifulSoup
from nltk.corpus import stopwords

#-----------------------------------------------------------------------------------------------#
# Load the spaCy English model and NLTK stopwords
#-----------------------------------------------------------------------------------------------#
nlp = spacy.load("en_core_web_sm")
import nltk
nltk.download('stopwords')

#-----------------------------------------------------------------------------------------------#
# Define stopwords list
stop_words = set(stopwords.words('english'))

#-----------------------------------------------------------------------------------------------#
# Clean up text by replacing sequences of "-" and "#!/usr/bin/env" with a single space
#-----------------------------------------------------------------------------------------------#
def clean_text(text):
    # Replace one or more hyphens with a single space
    text = re.sub(r'-+', ' ', text)

    # Replace "#!/usr/bin/env" with a single space
    text = text.replace('#!/usr/bin/env', ' ')

    # Replace multiple newlines with a single space
    text = text.replace('\n', ' ').replace('  ', ' ')  # Ensure no double spaces

    return text.strip()

#-----------------------------------------------------------------------------------------------#
# Clean the title
#-----------------------------------------------------------------------------------------------#
def clean_title(title):
    # Replace '-', '_', and '.html' with spaces
    cleaned_title = re.sub(r'[-_]', ' ', title)
    cleaned_title = cleaned_title.replace('.html', '')
    return cleaned_title.strip()

#-----------------------------------------------------------------------------------------------#
# Extract technical terms using NLP (spaCy)
#-----------------------------------------------------------------------------------------------#
def extract_technical_terms(text):
    # Process the text with spaCy to get POS tags and entities
    doc = nlp(text)

    # Extract named entities (organizations, products, technologies) and noun chunks
    technical_terms = set()

    for ent in doc.ents:
        # Keep only entities of type ORG, PRODUCT, or other relevant ones
        if ent.label_ in {'ORG', 'PRODUCT', 'GPE', 'NORP', 'FAC'}:
            technical_terms.add(ent.text.lower())

    # Also collect noun chunks (for broader technical terms)
    for chunk in doc.noun_chunks:
        technical_terms.add(chunk.text.lower())

    return technical_terms

#-----------------------------------------------------------------------------------------------#
# Extract technical keywords from an HTML file
#-----------------------------------------------------------------------------------------------#
def extract_technical_keywords_from_html(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        soup = BeautifulSoup(file, 'html.parser')

        # Extract the body text
        body_text = soup.get_text(separator=' ', strip=True)

        # Clean the body text
        clean_body_text = clean_text(body_text)

        # Extract technical terms using NLP
        technical_keywords = extract_technical_terms(clean_body_text)

        # Join as space-separated string (allow repetition or deduplication)
        return " ".join(sorted(technical_keywords))

# Initialize variables
file_index = []
current_id = 1

#-----------------------------------------------------------------------------------------------#
# Traverse current directory and subdirectories to find HTML files
#-----------------------------------------------------------------------------------------------#
for root, dirs, files in os.walk('.'):
    # Skip the /search directory
    dirs[:] = [d for d in dirs if d != 'search']

    for file in files:
        # Exclude any "index.html" file
        if file.endswith('.html') and file != 'index.html':
            filepath = os.path.join(root, file)
            technical_keywords = extract_technical_keywords_from_html(filepath)

            # Prepare the URL path (removing the leading dot)
            url_path = filepath.lstrip('./')

            # Append to the file index
            file_index.append({
                "id": current_id,
                "title": file,
                "content": technical_keywords,
                "url": f"/{url_path}"
            })
            current_id += 1

# Write the index to search-index.json
with open('search/search-index.json', 'w', encoding='utf-8') as json_file:
    json.dump(file_index, json_file, indent=4)

print("search-index.json created successfully.")

#-----------------------------------------------------------------------------------------------#
# Second Pass: Make content unique and prepend cleaned title
#-----------------------------------------------------------------------------------------------#
def make_content_unique():
    # Read the search-index.json file
    json_file_path = 'search/search-index.json'

    with open(json_file_path, 'r', encoding='utf-8') as file:
        file_index = json.load(file)

    # Process each entry in the dictionary to clean title and remove duplicates
    for entry in file_index:
        # Clean the title and add it to the beginning of the content
        cleaned_title = clean_title(entry["title"])

        # Split the content into individual words
        keywords = entry["content"].split()

        # Remove stopwords and non-alphabetic tokens
        filtered_keywords = [word.lower() for word in keywords if word.isalpha() and word.lower() not in stop_words]

        # Remove duplicates by converting the list to a set, then back to a sorted list
        unique_keywords = sorted(set(filtered_keywords))

        # Prepend the cleaned title (in lowercase) to the keywords
        entry["content"] = f"{cleaned_title.lower()} " + " ".join(unique_keywords)


    # Write the updated dictionary back to the JSON file
    with open(json_file_path, 'w', encoding='utf-8') as file:
        json.dump(file_index, file, indent=4)

    print("search-index.json updated with unique keywords and cleaned titles.")

#-----------------------------------------------------------------------------------------------#
# Run the second pass to ensure uniqueness and clean titles
#-----------------------------------------------------------------------------------------------#
make_content_unique()

