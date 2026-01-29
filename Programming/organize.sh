#!/bin/bash
set -e

ROOT="."

# -------------------------------
# Create ONE-LEVEL directories
# -------------------------------
mkdir -p "$ROOT/backend"
mkdir -p "$ROOT/design"
mkdir -p "$ROOT/algorithms"
mkdir -p "$ROOT/data-transformation"
mkdir -p "$ROOT/assets"

# -------------------------------
# Backend / APIs
# -------------------------------
mv "$ROOT/FastAPI.html" "$ROOT/backend/" 2>/dev/null || true
mv "$ROOT/Implementing-API.html" "$ROOT/backend/" 2>/dev/null || true

# -------------------------------
# Project Design & Architecture
# -------------------------------
mv "$ROOT/New-Project-Design.html" "$ROOT/design/" 2>/dev/null || true

# -------------------------------
# Algorithms & Problem Solving
# -------------------------------
mv "$ROOT/Sudoku-Board-Verification.html" "$ROOT/algorithms/" 2>/dev/null || true

# -------------------------------
# Python (existing directory preserved)
# -------------------------------
if [ -d "$ROOT/python" ]; then
  mv "$ROOT/python" "$ROOT/python"
fi

# -------------------------------
# Data Transformation (existing directory)
# -------------------------------
if [ -d "$ROOT/transformation" ]; then
  mv "$ROOT/transformation" "$ROOT/data-transformation"
fi

# -------------------------------
# Assets / Misc (fallback)
# -------------------------------
mv "$ROOT/"*.db "$ROOT/assets/" 2>/dev/null || true
mv "$ROOT/"*.csv "$ROOT/assets/" 2>/dev/null || true
mv "$ROOT/"*.json "$ROOT/assets/" 2>/dev/null || true

echo "Software one-level reorganization complete."

