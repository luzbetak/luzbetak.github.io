#!/bin/bash
set -e

ROOT="."

# -------------------------------
# Create ONE-LEVEL directories
# -------------------------------
mkdir -p "$ROOT/relational"
mkdir -p "$ROOT/nosql"
mkdir -p "$ROOT/sql"
mkdir -p "$ROOT/modeling"
mkdir -p "$ROOT/ingestion-etl"
mkdir -p "$ROOT/formats-streaming"
mkdir -p "$ROOT/governance"

# -------------------------------
# Relational Databases
# -------------------------------
mv "$ROOT/Relational-Databases.html" "$ROOT/relational/" 2>/dev/null || true
mv "$ROOT/RDBMS-Schemas.html" "$ROOT/relational/" 2>/dev/null || true
mv "$ROOT/RDBMS-Star-Schema.html" "$ROOT/relational/" 2>/dev/null || true
mv "$ROOT/RDBMS-Snowflake-Schema.html" "$ROOT/relational/" 2>/dev/null || true
mv "$ROOT/MySQL_LAG_Function.html" "$ROOT/relational/" 2>/dev/null || true

# -------------------------------
# SQL
# -------------------------------
mv "$ROOT/SQL_Overview.html" "$ROOT/sql/" 2>/dev/null || true
mv "$ROOT/SQL_Statements.html" "$ROOT/sql/" 2>/dev/null || true
mv "$ROOT/sql-with-2-tables-join.html" "$ROOT/sql/" 2>/dev/null || true
mv "$ROOT/Optimizing-Join-Queries.html" "$ROOT/sql/" 2>/dev/null || true
mv "$ROOT/Query_Performance.html" "$ROOT/sql/" 2>/dev/null || true

# -------------------------------
# Data Modeling
# -------------------------------
mv "$ROOT/GraphQL.html" "$ROOT/modeling/" 2>/dev/null || true
mv "$ROOT/Graph-Databases-ArgoDB-Neo4j.html" "$ROOT/modeling/" 2>/dev/null || true

# Move Kimball directory as-is (one level)
if [ -d "$ROOT/kimball" ]; then
  mv "$ROOT/kimball" "$ROOT/modeling/"
fi

# -------------------------------
# NoSQL
# -------------------------------
mv "$ROOT/MongoDB_Document_Based_NoSQL.html" "$ROOT/nosql/" 2>/dev/null || true

# Move FoundationDB directory as-is (one level)
if [ -d "$ROOT/foundation_db" ]; then
  mv "$ROOT/foundation_db" "$ROOT/nosql/"
fi

# -------------------------------
# Ingestion & ETL
# -------------------------------
mv "$ROOT/etl-pipeline.html" "$ROOT/ingestion-etl/" 2>/dev/null || true
mv "$ROOT/Large-Scale-Data-Ingestion.html" "$ROOT/ingestion-etl/" 2>/dev/null || true

# -------------------------------
# Formats & Streaming
# -------------------------------
mv "$ROOT/Apache_Kafka.html" "$ROOT/formats-streaming/" 2>/dev/null || true
mv "$ROOT/Kafka-Producer-Consumer.html" "$ROOT/formats-streaming/" 2>/dev/null || true
mv "$ROOT/Apache_Parquet.html" "$ROOT/formats-streaming/" 2>/dev/null || true
mv "$ROOT/Apache_Iceberg.html" "$ROOT/formats-streaming/" 2>/dev/null || true

# -------------------------------
# Governance & Quality
# -------------------------------
mv "$ROOT/Collibra-Data-Quality.html" "$ROOT/governance/" 2>/dev/null || true

echo "Database one-level reorganization complete."

