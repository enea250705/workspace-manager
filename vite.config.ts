import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Import condizionale per il plugin di errore runtime
const plugins = [react()];

// Aggiungi i plugin Replit solo in ambiente di sviluppo
if (process.env.NODE_ENV !== "production") {
  try {
    const runtimeErrorOverlay = await import("@replit/vite-plugin-runtime-error-modal").then(m => m.default);
    plugins.push(runtimeErrorOverlay());
    
    if (process.env.REPL_ID !== undefined) {
      const cartographer = await import("@replit/vite-plugin-cartographer").then(m => m.cartographer);
      plugins.push(cartographer());
    }
  } catch (error) {
    console.warn("Replit plugins not available, skipping...");
  }
}

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
