#!/bin/bash
set -e

# Mostra la versione di Node e npm
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Installa le dipendenze
echo "Installing dependencies..."
npm ci

# Esegui la build
echo "Building client..."
npx vite build

echo "Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build completed successfully!" 