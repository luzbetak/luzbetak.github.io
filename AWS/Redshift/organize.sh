#!/bin/bash
set -e

ROOT="."

# -------------------------------
# Create ONE-LEVEL directories
# -------------------------------
mkdir -p "$ROOT/architecture"
mkdir -p "$ROOT/ingestion"
mkdir -p "$ROOT/sharing"
mkdir -p "$ROOT/concepts"
mkdir -p "$ROOT/assets"

# -------------------------------
# Architecture
# -------------------------------
mv "$ROOT/redshift-architecture-overview.png" "$ROOT/architecture/" 2>/dev/null || true
mv "$ROOT/redshift-end-to-end-architecture.png" "$ROOT/architecture/" 2>/dev/null || true
mv "$ROOT/redshift-data-warehouse.png" "$ROOT/architecture/" 2>/dev/null || true
mv "$ROOT/redshift-spectrum-architecture.png" "$ROOT/architecture/" 2>/dev/null || true
mv "$ROOT/BDB-4298-redshift-spectrum-architecture-diagram.png" "$ROOT/architecture/" 2>/dev/null || true
mv "$ROOT/figure2_getir.png" "$ROOT/architecture/" 2>/dev/null || true

# -------------------------------
# Ingestion & Pipelines
# -------------------------------
mv "$ROOT/redshift-ingestion-pipeline.png" "$ROOT/ingestion/" 2>/dev/null || true

# -------------------------------
# Data Sharing
# -------------------------------
mv "$ROOT/Redshift-Data-Sharing.png" "$ROOT/sharing/" 2>/dev/null || true
mv "$ROOT/product-page-diagram_Redshift-Data-Sharing.cfb492d92166375ec67d5e73fcfa397e75fe9ea0.png" "$ROOT/sharing/" 2>/dev/null || true

# -------------------------------
# Concepts & Architecture Patterns
# -------------------------------
mv "$ROOT/Data_Mesh_Architecture.html" "$ROOT/concepts/" 2>/dev/null || true
mv "$ROOT/Data_Fabric_vs_Data_Mesh.html" "$ROOT/concepts/" 2>/dev/null || true
mv "$ROOT/Reshift_Keypoints.html" "$ROOT/concepts/" 2>/dev/null || true

# -------------------------------
# Assets (fallback for any remaining images)
# -------------------------------
mv "$ROOT/"*.png "$ROOT/assets/" 2>/dev/null || true

echo "Redshift one-level reorganization complete."

