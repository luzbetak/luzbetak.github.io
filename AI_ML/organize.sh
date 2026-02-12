#!/bin/bash
set -e

# Root directory (current directory)
ROOT="."

# Create required directory structure (ONLY allowed nested directory)
mkdir -p "$ROOT/vector-databases/faiss"

# -------------------------------
# Move FAISS-related files
# -------------------------------
mv "$ROOT/FAISS-Vector-Database.html" "$ROOT/vector-databases/" 2>/dev/null || true
mv "$ROOT/LanceDB-Vector-Database.html" "$ROOT/vector-databases/" 2>/dev/null || true
mv "$ROOT/Recompile-FAISS-GPU-Installation.html" "$ROOT/vector-databases/" 2>/dev/null || true

# Move existing faiss directory contents
if [ -d "$ROOT/faiss" ]; then
  mv "$ROOT/faiss/"* "$ROOT/vector-databases/faiss/" 2>/dev/null || true
  mv "$ROOT/faiss" "$ROOT/faiss_delete"
fi

# -------------------------------
# Create remaining directories
# -------------------------------
mkdir -p "$ROOT/search-retrieval"
mkdir -p "$ROOT/machine-learning"
mkdir -p "$ROOT/applications-tools"

# -------------------------------
# search-retrieval
# -------------------------------
mv "$ROOT/BM25_Probabilistic_Model.html" "$ROOT/search-retrieval/" 2>/dev/null || true
mv "$ROOT/TF-IDF.html" "$ROOT/search-retrieval/" 2>/dev/null || true
mv "$ROOT/python-whoosh.html" "$ROOT/search-retrieval/" 2>/dev/null || true
mv "$ROOT/Unstructured-Data-Indexing.html" "$ROOT/search-retrieval/" 2>/dev/null || true
mv "$ROOT/Gunning-Fog-Index.html" "$ROOT/search-retrieval/" 2>/dev/null || true
mv "$ROOT/Retrieval-Augmented-Generation.html" "$ROOT/search-retrieval/" 2>/dev/null || true
mv "$ROOT/Retrieval-Augmented-Generation-Workflow.html" "$ROOT/search-retrieval/" 2>/dev/null || true

# -------------------------------
# machine-learning
# -------------------------------
mv "$ROOT/Scikit-learn.html" "$ROOT/machine-learning/" 2>/dev/null || true
mv "$ROOT/Random-Forest-Classifier-Model.html" "$ROOT/machine-learning/" 2>/dev/null || true
mv "$ROOT/PyTorch.html" "$ROOT/machine-learning/" 2>/dev/null || true
mv "$ROOT/PyTorch-Sentiment-Analysis-Model.html" "$ROOT/machine-learning/" 2>/dev/null || true
mv "$ROOT/Keras.html" "$ROOT/machine-learning/" 2>/dev/null || true
mv "$ROOT/Hugging-Face-Machine-Learning.html" "$ROOT/machine-learning/" 2>/dev/null || true
mv "$ROOT/Tensors-Machine-Learning.html" "$ROOT/machine-learning/" 2>/dev/null || true
mv "$ROOT/Time-Complexity-Big-O-Notation.html" "$ROOT/machine-learning/" 2>/dev/null || true
mv "$ROOT/machine-learning-models.jpg" "$ROOT/machine-learning/" 2>/dev/null || true

# Handle neural-network directory
if [ -d "$ROOT/neural-network" ]; then
  mv "$ROOT/neural-network" "$ROOT/machine-learning/"
fi

# -------------------------------
# applications-tools
# -------------------------------
mv "$ROOT/PDF-Convert-to-Text-File.html" "$ROOT/applications-tools/" 2>/dev/null || true
mv "$ROOT/PDF-Split-File.html" "$ROOT/applications-tools/" 2>/dev/null || true
mv "$ROOT/Ms-Word-Document-Processing.html" "$ROOT/applications-tools/" 2>/dev/null || true
mv "$ROOT/Python-Syntax-Highlighting.html" "$ROOT/applications-tools/" 2>/dev/null || true
mv "$ROOT/Streamlit-app.html" "$ROOT/applications-tools/" 2>/dev/null || true
mv "$ROOT/Stable-Diffusion-Web-UI.html" "$ROOT/applications-tools/" 2>/dev/null || true
mv "$ROOT/NVIDIA-GeForce-RTX-3060-Installation.html" "$ROOT/applications-tools/" 2>/dev/null || true

# -------------------------------
# Rename old top-level directories to *_delete
# -------------------------------
for dir in search-retrieval machine-learning applications-tools vector-databases; do
  :
done

echo "Reorganization complete."

