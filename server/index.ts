import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configurazione CORS per consentire richieste dal frontend su Vercel
const allowedOrigins = [
  'http://localhost:5173',                      // Sviluppo locale frontend
  'http://localhost:3000',                      // Sviluppo locale frontend (alternativo)
  'https://workforce-manager.vercel.app',       // Produzione su Vercel (aggiorna con il tuo dominio)
  'https://davittorino-staff.vercel.app'        // Dominio alternativo
];

app.use(cors({
  origin: function(origin, callback) {
    // Consenti richieste senza origin (come app mobile o Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log(`Origin bloccato dal CORS: ${origin}`);
      callback(new Error('Non consentito dal CORS'));
    }
  },
  credentials: true, // Importante per le sessioni/cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Configura il server per ascoltare su tutte le interfacce
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0", // Ascolta su tutte le interfacce di rete
  }, () => {
    log(`Server in esecuzione sulla porta ${port} in modalità ${app.get('env')}`);
  });
})();
