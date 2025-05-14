#!/bin/bash
set -e

echo "Starting build process..."
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Installa dipendenze
echo "Installing dependencies..."
npm install

# Assicurati che vite sia installato localmente
echo "Installing vite and esbuild locally..."
npm install vite esbuild

# Esegui build client
echo "Building client..."
cd client
../node_modules/.bin/vite build
cd ..

# Esegui build server
echo "Building server..."
./node_modules/.bin/esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build completed successfully!" 