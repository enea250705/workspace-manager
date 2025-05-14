#!/usr/bin/env bash
# exit on error
set -o errexit

# Mostra versioni
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Installa le dipendenze con npm ci per un'installazione pulita
npm ci

# Assicurati che vite e esbuild siano disponibili
npm install -g vite esbuild

# Esegui la build del frontend
echo "Building frontend..."
vite build

# Esegui la build del backend
echo "Building backend..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build completata con successo!" 