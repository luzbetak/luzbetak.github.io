#!/bin/bash
set -e

ROOT="."

# -------------------------------
# Create ONE-LEVEL directories
# -------------------------------
mkdir -p "$ROOT/orchestration"
mkdir -p "$ROOT/containers"
mkdir -p "$ROOT/devops"
mkdir -p "$ROOT/security"
mkdir -p "$ROOT/system"
mkdir -p "$ROOT/config"
mkdir -p "$ROOT/media"

# -------------------------------
# Orchestration & Workflow
# -------------------------------
mv "$ROOT/Orchestration_Tools.html" "$ROOT/orchestration/" 2>/dev/null || true
mv "$ROOT/debugging-kubernetes-performance.html" "$ROOT/orchestration/" 2>/dev/null || true

# Move apache directory (Airflow, NiFi, Hudi)
if [ -d "$ROOT/apache" ]; then
  mv "$ROOT/apache" "$ROOT/orchestration/"
fi

# -------------------------------
# Containers & Kubernetes
# -------------------------------
mv "$ROOT/docker.html" "$ROOT/containers/" 2>/dev/null || true
mv "$ROOT/Kubernetes.html" "$ROOT/containers/" 2>/dev/null || true

# -------------------------------
# DevOps & Delivery
# -------------------------------
mv "$ROOT/software-delivery.html" "$ROOT/devops/" 2>/dev/null || true

# -------------------------------
# Security & Networking
# -------------------------------
mv "$ROOT/block-all-non-us-traffic.html" "$ROOT/security/" 2>/dev/null || true

# -------------------------------
# System & OS
# -------------------------------
mv "$ROOT/systemd-services.html" "$ROOT/system/" 2>/dev/null || true

# -------------------------------
# Configuration / Dotfiles
# -------------------------------
mv "$ROOT/bashrc.txt" "$ROOT/config/" 2>/dev/null || true
mv "$ROOT/gitrc.txt" "$ROOT/config/" 2>/dev/null || true
mv "$ROOT/vimrc.txt" "$ROOT/config/" 2>/dev/null || true

# -------------------------------
# Media / External Content
# -------------------------------
if [ -d "$ROOT/youtube" ]; then
  mv "$ROOT/youtube" "$ROOT/media/"
fi

echo "Tools one-level reorganization complete."

