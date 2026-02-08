#!/bin/bash
set -e

ROOT="."

# -------------------------------
# Create ONE-LEVEL directories
# -------------------------------
mkdir -p "$ROOT/core"
mkdir -p "$ROOT/ai"
mkdir -p "$ROOT/production"
mkdir -p "$ROOT/tools"
mkdir -p "$ROOT/assets"

# -------------------------------
# Core Snowflake Concepts
# -------------------------------
mv "$ROOT/Snowflake_Table_Types.html" "$ROOT/core/" 2>/dev/null || true

# -------------------------------
# Snowflake AI / Cortex
# -------------------------------
mv "$ROOT/Cortex_AI_Document_RAG_Embeddings.html" "$ROOT/ai/" 2>/dev/null || true
mv "$ROOT/snowflake_cortex_ai.png" "$ROOT/assets/" 2>/dev/null || true

# -------------------------------
# Production & Operations
# -------------------------------
mv "$ROOT/Snowflake_Production.html" "$ROOT/production/" 2>/dev/null || true

# -------------------------------
# Tools & Utilities
# -------------------------------
mv "$ROOT/make_strong.py" "$ROOT/tools/" 2>/dev/null || true

# -------------------------------
# Temporary / Misc
# -------------------------------
mv "$ROOT/temp.txt" "$ROOT/tools/" 2>/dev/null || true

echo "Snowflake one-level reorganization complete."

