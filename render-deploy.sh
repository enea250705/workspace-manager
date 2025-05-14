#!/bin/bash
set -e

echo "=== RENDER DEPLOYMENT SCRIPT ==="
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Sostituisci il package.json con la versione semplificata per Render
echo "Replacing package.json with Render-specific version..."
cp render-package.json package.json

# Installa solo le dipendenze necessarie
echo "Installing minimal dependencies..."
npm install --no-fund --no-audit

# Installa esplicitamente vite e esbuild
echo "Installing build tools..."
npm install --no-fund --no-audit vite esbuild

# Esegui il build
echo "Building client and server..."
npm run build

echo "=== BUILD COMPLETED SUCCESSFULLY ===" 