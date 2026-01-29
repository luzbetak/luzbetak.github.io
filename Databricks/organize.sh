#!/bin/bash
set -e

ROOT="."

# -------------------------------
# Create ONE-LEVEL directories
# -------------------------------
mkdir -p "$ROOT/spark"
mkdir -p "$ROOT/delta"
mkdir -p "$ROOT/pipelines"
mkdir -p "$ROOT/performance"
mkdir -p "$ROOT/architecture"
mkdir -p "$ROOT/migration"
mkdir -p "$ROOT/tools"

# -------------------------------
# Apache Spark
# -------------------------------
mv "$ROOT/Apache-Spark.html" "$ROOT/spark/" 2>/dev/null || true
mv "$ROOT/Column-Shuffle-Repartition.html" "$ROOT/spark/" 2>/dev/null || true

# -------------------------------
# Delta Lake & Tables
# -------------------------------
mv "$ROOT/Databricks-Delta-Lake.html" "$ROOT/delta/" 2>/dev/null || true
mv "$ROOT/Delta-Live-Tables.html" "$ROOT/delta/" 2>/dev/null || true
mv "$ROOT/Howto-Use-Delta-Live-Tables.html" "$ROOT/delta/" 2>/dev/null || true
mv "$ROOT/Managed-External-Live-Tables.html" "$ROOT/delta/" 2>/dev/null || true
mv "$ROOT/Managed-External-Tables.html" "$ROOT/delta/" 2>/dev/null || true
mv "$ROOT/DLT-SCD-Type2.html" "$ROOT/delta/" 2>/dev/null || true

# -------------------------------
# Pipelines & CDC
# -------------------------------
mv "$ROOT/Change_Data_Capture_CDC.html" "$ROOT/pipelines/" 2>/dev/null || true

# -------------------------------
# Performance
# -------------------------------
mv "$ROOT/Performance_Optimization_Databricks.html" "$ROOT/performance/" 2>/dev/null || true

# -------------------------------
# Architecture
# -------------------------------
if [ -d "$ROOT/Medallion-Architecture" ]; then
  mv "$ROOT/Medallion-Architecture" "$ROOT/architecture/"
fi

# -------------------------------
# Migration
# -------------------------------
mv "$ROOT/Data_Migration_From_Snowflake.html" "$ROOT/migration/" 2>/dev/null || true
mv "$ROOT/Star-Schema-Data-Migration.html" "$ROOT/migration/" 2>/dev/null || true

# -------------------------------
# PySpark (existing directory preserved)
# -------------------------------
if [ -d "$ROOT/PySpark" ]; then
  mv "$ROOT/PySpark" "$ROOT/pyspark"
fi

# -------------------------------
# Tools & Utilities
# -------------------------------
mv "$ROOT/calculate-color-between-two-hex.py" "$ROOT/tools/" 2>/dev/null || true

if [ -d "$ROOT/Slideshow" ]; then
  mv "$ROOT/Slideshow" "$ROOT/tools/"
fi

echo "Databricks one-level reorganization complete."

