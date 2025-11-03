#!/usr/bin/env python
#-------------------------------------------------------------------------------------#
# TF-IDF (Term Frequency-Inverse Document Frequency)
#-------------------------------------------------------------------------------------#
from sklearn.feature_extraction.text import TfidfVectorizer
from prettytable import PrettyTable

# Example documents
docs = [  "This is a sample document.",
          "This document is another sample document.",
          "Machine Learning Document"
        ]

# Initialize the vectorizer
vectorizer = TfidfVectorizer()

# Fit the model and transform the text data into a TF-IDF matrix
tfidf_matrix = vectorizer.fit_transform(docs)

# Get feature names (terms)
feature_names = vectorizer.get_feature_names_out()

# Convert to array to see the result
tfidf_array = tfidf_matrix.toarray()

# Initialize PrettyTable
table = PrettyTable()

# Add column names (terms)
table.field_names = ["Document"] + list(feature_names)

# Add rows (documents and their TF-IDF values rounded to 4 decimals)
for i, doc in enumerate(docs):
    row = [f"Document {i+1}"] + [round(value, 4) for value in tfidf_array[i]]
    table.add_row(row)

# Print the table
print(table)
#-------------------------------------------------------------------------------------#

