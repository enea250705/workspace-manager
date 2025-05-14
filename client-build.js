// Script di build personalizzato per il client
import { build } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildClient() {
  console.log('Building client...');
  
  try {
    // Assicurati che la directory di output esista
    const outDir = path.resolve(__dirname, 'dist/public');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    
    // Esegui il build con Vite
    await build({
      root: path.resolve(__dirname, 'client'),
      build: {
        outDir,
        emptyOutDir: true,
        rollupOptions: {
          // Non esternalizzare le dipendenze
          external: [],
        }
      },
      logLevel: 'info'
    });
    
    console.log('Client build completed successfully!');
  } catch (error) {
    console.error('Client build failed:', error);
    process.exit(1);
  }
}

buildClient(); 