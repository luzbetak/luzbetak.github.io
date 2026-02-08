#!/bin/bash
set -e

ROOT="."

# -------------------------------
# Create ONE-LEVEL directories
# -------------------------------
mkdir -p "$ROOT/compute"
mkdir -p "$ROOT/storage"
mkdir -p "$ROOT/analytics"
mkdir -p "$ROOT/serverless"
mkdir -p "$ROOT/security"
mkdir -p "$ROOT/monitoring"

# -------------------------------
# Compute & Core Services
# -------------------------------
mv "$ROOT/AWS.html" "$ROOT/compute/" 2>/dev/null || true
mv "$ROOT/Amazon-RDS.html" "$ROOT/compute/" 2>/dev/null || true
mv "$ROOT/AWS-Redshift.html" "$ROOT/compute/" 2>/dev/null || true
mv "$ROOT/AWS-EMR.html" "$ROOT/compute/" 2>/dev/null || true
mv "$ROOT/Auto-Scaling-EC2-EMR.html" "$ROOT/compute/" 2>/dev/null || true

# -------------------------------
# Storage
# -------------------------------
mv "$ROOT/Amazon-S3.html" "$ROOT/storage/" 2>/dev/null || true
mv "$ROOT/S3-Transfer-Acceleration.html" "$ROOT/storage/" 2>/dev/null || true

# -------------------------------
# Analytics & ETL
# -------------------------------
mv "$ROOT/Amazon-QuickSight.html" "$ROOT/analytics/" 2>/dev/null || true
mv "$ROOT/ETL-Pipeline-AWS.html" "$ROOT/analytics/" 2>/dev/null || true
mv "$ROOT/AWS-Glue-as-an-ETL-Service.html" "$ROOT/analytics/" 2>/dev/null || true
mv "$ROOT/AWS-Glue-ETL-Service.html" "$ROOT/analytics/" 2>/dev/null || true
mv "$ROOT/AWS-Glue-Workflow.html" "$ROOT/analytics/" 2>/dev/null || true
mv "$ROOT/AWS-Glue-Data-Catalog.html" "$ROOT/analytics/" 2>/dev/null || true

# -------------------------------
# Streaming & Serverless
# -------------------------------
mv "$ROOT/Lambda-Serverless-Computing.html" "$ROOT/serverless/" 2>/dev/null || true
mv "$ROOT/AWS-Kinesis-Data-Streams.html" "$ROOT/serverless/" 2>/dev/null || true
mv "$ROOT/AWS-Step-Functions.html" "$ROOT/serverless/" 2>/dev/null || true

# -------------------------------
# Security & Governance
# -------------------------------
mv "$ROOT/IAM-Identity-Access-Management.html" "$ROOT/security/" 2>/dev/null || true
mv "$ROOT/KMS-Key-Management-Service.html" "$ROOT/security/" 2>/dev/null || true
mv "$ROOT/AWS-CloudTrail.html" "$ROOT/security/" 2>/dev/null || true
mv "$ROOT/AWS-Config-Inspector.html" "$ROOT/security/" 2>/dev/null || true
mv "$ROOT/AWS-Lake-Formation.html" "$ROOT/security/" 2>/dev/null || true
mv "$ROOT/AWS-Lake-Formation-vs-AWS-CloudFormation.html" "$ROOT/security/" 2>/dev/null || true

# -------------------------------
# Monitoring & Orchestration
# -------------------------------
mv "$ROOT/AWS-CloudWatch.html" "$ROOT/monitoring/" 2>/dev/null || true
mv "$ROOT/AWS-CloudWatch-Events.html" "$ROOT/monitoring/" 2>/dev/null || true
mv "$ROOT/AWS-Cloud-Formation.html" "$ROOT/monitoring/" 2>/dev/null || true

echo "AWS one-level reorganization complete."

