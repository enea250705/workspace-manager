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

# Esporta il percorso di node_modules/.bin per assicurarsi che i binari siano disponibili
export PATH="$PATH:$(pwd)/node_modules/.bin"

# Verifica che vite sia disponibile
which vite || echo "ERRORE: vite non trovato nel PATH"
ls -la node_modules/.bin/vite || echo "ERRORE: vite non trovato in node_modules/.bin"

# Prova ad installare vite localmente se non è disponibile
if ! which vite > /dev/null; then
  echo "Installazione locale di vite..."
  npm install --save-dev vite
fi

# Esegui la build del frontend con percorso completo
echo "Building frontend..."
node_modules/.bin/vite build || npx vite build || npm run build:client

# Esegui la build del backend
echo "Building backend..."
node_modules/.bin/esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist || npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build completata con successo!" 