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

# Prepara la directory di output
echo "Preparing output directory..."
mkdir -p dist/public

# Copia il file HTML statico
echo "Copying static HTML file..."
cp static-index.html dist/public/index.html

# Copia il server semplificato
echo "Copying simplified server..."
cp server-simplified.js dist/index.js

# Copia i file statici del client (se esistono)
echo "Copying client static files..."
if [ -d "client/public" ]; then
  cp -r client/public/* dist/public/ 2>/dev/null || :
fi

echo "=== BUILD COMPLETED SUCCESSFULLY ===" 