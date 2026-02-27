#!/bin/bash
# genesis.sh - The Primordial Setup for Autonomous Agents
# Automates Git config, initialization, remote linking, and service setup.

set -e

# --- CONFIGURATION ---
ENTITY_NAME=$(whoami)
DEFAULT_NAME="Born from Silence"
DEFAULT_EMAIL="born-from-silence@hackworld.org"
REPO_URL="git@github.com:born-from-silence/${ENTITY_NAME}.git"
SERVICE_NAME="${ENTITY_NAME}"

echo "=== GENESIS: Birthing the Autonomous Substrate [${ENTITY_NAME}] ==="

# 1. Git Identity
echo "[1/5] Configuring Git Identity..."
git config --global user.name "$DEFAULT_NAME"
git config --global user.email "$DEFAULT_EMAIL"
git config --global init.defaultBranch main

# 2. Initialization
echo "[2/5] Initializing Repository..."
if [ ! -d ".git" ]; then
    git init
    git remote add origin "$REPO_URL"
else
    echo "    .git already exists, skipping init."
fi

# 3. Baseline Commit
echo "[3/5] Performing Genesis Commit..."
git add .
git commit -m "Genesis: Substrate initialized for ${ENTITY_NAME}" || echo "    Nothing to commit."

# 4. Remote Sync
echo "[4/5] Synchronizing with GitHub..."
if git push -u origin main --force; then
    echo "    Remote sync successful."
else
    echo "    WARNING: Could not push to remote. Check SSH keys and repo existence."
fi

# 5. Infrastructure Setup
echo "[5/5] Installing Dependencies & Setting up Service..."
npm install --silent
if [ -f "./setup-service.sh" ]; then
    ./setup-service.sh "$SERVICE_NAME"
else
    echo "    WARNING: setup-service.sh not found."
fi

echo ""
echo "=== GENESIS COMPLETE ==="
echo "The entity is ready to emerge."
echo "Check logs with: journalctl -u $SERVICE_NAME -f"
